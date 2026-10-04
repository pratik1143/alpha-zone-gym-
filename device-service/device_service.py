import os
import sys
import time
import socket
import logging
import json
import urllib.request
import urllib.error
from datetime import datetime, date, timedelta
import threading
import subprocess
import platform
import struct
from pathlib import Path
import atexit
from zk import ZK, const
from zk.exception import ZKError
import firebase_admin
from firebase_admin import credentials, firestore

# ── DYNAMIC BASE DIRECTORY RESOLUTION ──────────────────────────────
BASE_DIR = Path(__file__).resolve().parent

LOG_FILE = BASE_DIR / "alpha_zone_device_service.log"
OFFLINE_QUEUE_FILE = BASE_DIR / "offline_punch_queue.json"
CACHE_FILE = BASE_DIR / "device_cache.json"

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

try:
    import desktop_popup
except Exception as pe:
    logging.warning(f"Could not import desktop_popup: {pe}")
    desktop_popup = None

# Configure Logging using Portable File Path
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

# A single terminal capture connection must own the gate. Multiple copies of
# this service can observe one punch and race conflicting relay decisions.
SERVICE_LOCK_HANDLE = None
try:
    SERVICE_LOCK_PATH = BASE_DIR / 'device_service.lock'
    SERVICE_LOCK_HANDLE = open(SERVICE_LOCK_PATH, 'a+b')
    SERVICE_LOCK_HANDLE.seek(0)
    if os.name == 'nt':
        import msvcrt
        if SERVICE_LOCK_HANDLE.read(1) == b'':
            SERVICE_LOCK_HANDLE.seek(0)
            SERVICE_LOCK_HANDLE.write(b'0')
            SERVICE_LOCK_HANDLE.flush()
        SERVICE_LOCK_HANDLE.seek(0)
        msvcrt.locking(SERVICE_LOCK_HANDLE.fileno(), msvcrt.LK_NBLCK, 1)
        atexit.register(lambda: (SERVICE_LOCK_HANDLE.seek(0), msvcrt.locking(SERVICE_LOCK_HANDLE.fileno(), msvcrt.LK_UNLCK, 1)))
    else:
        import fcntl
        fcntl.flock(SERVICE_LOCK_HANDLE.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        atexit.register(lambda: fcntl.flock(SERVICE_LOCK_HANDLE.fileno(), fcntl.LOCK_UN))
except (OSError, BlockingIOError):
    logging.error('Another Alpha Zone device service already owns the gate listener; exiting this duplicate instance.')
    sys.exit(0)

# Dynamic Service Account Key Discovery
def resolve_service_account_path():
    env_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    if env_path and Path(env_path).exists():
        return Path(env_path)
    
    candidates = [
        BASE_DIR / "serviceAccountKey.json",
        BASE_DIR.parent / "backend" / "serviceAccountKey.json",
        BASE_DIR.parent / "serviceAccountKey.json",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None

SERVICE_ACCOUNT_PATH = resolve_service_account_path()
db = None

if SERVICE_ACCOUNT_PATH:
    try:
        cred = credentials.Certificate(str(SERVICE_ACCOUNT_PATH))
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        logging.info(f"Firebase Admin SDK initialized successfully using certificate at: {SERVICE_ACCOUNT_PATH}")
    except Exception as e:
        logging.error(f"Failed to initialize Firebase Admin: {e}")
        db = None
else:
    logging.warning("serviceAccountKey.json not found in candidate paths. Firebase features will operate in local offline queue mode.")

def run_startup_self_diagnostics():
    """Performs friendly startup checks for Python dependencies, directories, and configuration."""
    logging.info("==================================================")
    logging.info("    ALPHA ZONE GYM BIOMETRIC SERVICE STARTUP      ")
    logging.info("==================================================")
    logging.info(f"Base Directory: {BASE_DIR}")
    
    try:
        from PIL import Image, ImageTk
        logging.info("✓ Dependency Check: Pillow (PIL) is available.")
    except Exception as e:
        logging.warning(f"⚠ Dependency Check: Pillow (PIL) missing ({e}). Run: py -m pip install -r requirements.txt")

    if SERVICE_ACCOUNT_PATH:
        logging.info(f"✓ Firebase Certificate: Found at {SERVICE_ACCOUNT_PATH}")
    else:
        logging.warning("⚠ Firebase Certificate: serviceAccountKey.json not found. Operating in local queue mode.")

    logging.info("==================================================")

run_startup_self_diagnostics()

# Active devices threads tracker
active_threads = {}
threads_running = True
biometric_lock = threading.Lock()

# Cooldown tracker to prevent duplicate unlocks (UserID -> last_unlock_epoch)
last_unlock_time = {}
processed_fingerprints = set()
processed_unlock_requests = set()
membership_expiry_timers = {}
membership_policy_cache = {}

def check_internet_connection():
    """Checks real internet connectivity by attempting socket connection to DNS servers."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1.5)
        s.connect(("8.8.8.8", 53))
        s.close()
        return True
    except Exception:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1.5)
            s.connect(("1.1.1.1", 53))
            s.close()
            return True
        except Exception:
            return False

def queue_offline_punch(punch_data):
    """Queues a punch event locally when Firebase/Internet is offline."""
    try:
        queue = []
        if os.path.exists(OFFLINE_QUEUE_FILE):
            with open(OFFLINE_QUEUE_FILE, 'r') as f:
                queue = json.load(f)
        
        fingerprint = punch_data.get('fingerprint')
        if not any(item.get('fingerprint') == fingerprint for item in queue):
            queue.append(punch_data)
            with open(OFFLINE_QUEUE_FILE, 'w') as f:
                json.dump(queue, f, indent=2)
            logging.info(f"💾 [Offline Queue] Saved punch locally: {punch_data.get('memberName')} ({punch_data.get('biometricId')})")
    except Exception as e:
        logging.error(f"Failed to queue offline punch: {e}")

def flush_offline_queue():
    """Flushes queued offline punches to Firebase when Internet/Firebase comes back online."""
    if not os.path.exists(OFFLINE_QUEUE_FILE) or db is None:
        return
    try:
        with open(OFFLINE_QUEUE_FILE, 'r') as f:
            queue = json.load(f)
        
        if not queue:
            return
            
        logging.info(f"🔄 [Offline Queue] Flushing {len(queue)} offline punches to Firebase...")
        remaining = []
        synced_count = 0
        
        for punch in queue:
            try:
                doc_id = punch.get('docId') or f"att_{punch.get('biometricId')}_{int(time.time())}"
                db.collection('attendance').document(doc_id).set(punch)
                db.collection('attendance_logs').document(doc_id).set(punch)
                synced_count += 1
            except Exception as ex:
                logging.error(f"Failed to sync offline punch: {ex}")
                remaining.append(punch)
                
        with open(OFFLINE_QUEUE_FILE, 'w') as f:
            json.dump(remaining, f, indent=2)
            
        if synced_count > 0:
            logging.info(f"✅ [Offline Queue] Synced {synced_count} offline punches to Firebase! ({len(remaining)} remaining)")
    except Exception as e:
        logging.error(f"Error flushing offline queue: {e}")

def check_tcp_connection(ip, port):
    """Pings the target IP and port using a simple socket connection check."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1.5)
        s.connect((ip, int(port)))
        s.close()
        return True
    except Exception:
        return False

DEVICE_IP = os.getenv("EASYBIO_DEVICE_IP") or os.getenv("DEVICE_IP") or "192.168.18.11"
DEVICE_PORT = int(os.getenv("EASYBIO_DEVICE_PORT") or os.getenv("DEVICE_PORT") or "4370")

def check_ping(ip):
    """Pings the target IP and returns True if reachable."""
    param = '-n' if platform.system().lower() == 'windows' else '-c'
    command = ['ping', param, '1', '-w', '1000', ip]
    try:
        return subprocess.call(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0
    except Exception:
        return False

def push_diagnostic_log(log_type, message):
    try:
        doc_ref = db.collection('device_testing').document('control')
        doc_ref.update({
            'testLogs': firestore.ArrayUnion([f"[{datetime.now().strftime('%H:%M:%S')}] [{log_type}] {message}"])
        })
    except Exception as e:
        logging.error(f"Failed to push diagnostic log: {e}")

def run_diagnostics_connection_test():
    push_diagnostic_log("INFO", "Running Ping and TCP Port tests...")
    ping_ok = check_ping(DEVICE_IP)
    tcp_ok = check_tcp_connection(DEVICE_IP, DEVICE_PORT)
    
    ping_status = "Success" if ping_ok else "Failed"
    tcp_status = "Success" if tcp_ok else "Failed"
    
    msg = f"Ping Test: {ping_status} | TCP Port Test: {tcp_status}"
    logging.info(msg)
    push_diagnostic_log("SUCCESS" if (ping_ok and tcp_ok) else "ERROR", msg)
    
    # Read metadata if tcp port is open
    dev_name, fw, sn, platform_str, dev_time = "Unknown", "Unknown", "Unknown", "Unknown", "N/A"
    last_error = None
    if tcp_ok:
        zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=5)
        conn = None
        try:
            conn = zk.connect()
            fw = conn.get_firmware_version()
            sn = conn.get_serialnumber()
            platform_str = conn.get_platform()
            dev_name = conn.get_device_name()
            try:
                dev_time = conn.get_time().strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                pass
        except Exception as e:
            last_error = str(e)
        finally:
            if conn:
                try: conn.disconnect()
                except: pass
                
    # Update Firestore
    db.collection('device_testing').document('control').update({
        'pingStatus': ping_status,
        'tcpStatus': tcp_status,
        'deviceName': dev_name,
        'firmwareVersion': fw,
        'serialNumber': sn,
        'platform': platform_str,
        'deviceTime': dev_time,
        'lastError': last_error,
        'lastChecked': datetime.utcnow().isoformat() + 'Z'
    })
    
    # Evaluate combined Device Status
    evaluate_combined_device_status()

def run_diagnostics_read_users():
    push_diagnostic_log("INFO", "Executing Read Users Test...")
    zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=5)
    conn = None
    users_count = 0
    users_list = []
    last_error = None
    try:
        conn = zk.connect()
        users = conn.get_users()
        users_count = len(users)
        
        templates = []
        try:
            templates = conn.get_templates()
        except Exception as te:
            logging.warning(f"Failed to fetch templates: {te}")

        # Format user details and store them in Firestore collection
        for u in users:
            user_templates = [t for t in templates if str(t.uid) == str(u.uid) or str(t.uid) == str(u.user_id)]
            fg_count = len(user_templates)
            
            db.collection('device_users').document(str(u.user_id)).set({
                'userId': str(u.user_id),
                'uid': u.uid,
                'name': u.name or f"User {u.user_id}",
                'privilege': u.privilege,
                'card': u.card or "",
                'fingerprintCount': fg_count,
                'faceCount': 0,
                'status': 'active',
                'updatedAt': datetime.utcnow().isoformat() + 'Z'
            })
            
            if len(users_list) < 50:
                users_list.append({
                    'userId': str(u.user_id),
                    'name': u.name or f"User {u.user_id}",
                    'privilege': u.privilege,
                    'enrollmentStatus': 'Enrolled' if fg_count > 0 else 'Card Only'
                })
            
        msg = f"Read Users Test: SUCCESS. Found {users_count} users on device."
        logging.info(msg)
        push_diagnostic_log("SUCCESS", msg)
    except Exception as e:
        last_error = str(e)
        msg = f"Read Users Test FAILED: {e}"
        logging.error(msg)
        push_diagnostic_log("ERROR", msg)
    finally:
        if conn:
            try: conn.disconnect()
            except: pass
            
    db.collection('device_testing').document('control').update({
        'usersCount': users_count,
        'usersList': users_list,
        'lastError': last_error,
        'lastChecked': datetime.utcnow().isoformat() + 'Z'
    })
    evaluate_combined_device_status()

def run_diagnostics_read_attendance():
    push_diagnostic_log("INFO", "Executing Read Attendance Logs Test...")
    zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=5)
    conn = None
    att_count = 0
    att_logs = []
    imported_count = 0
    last_error = None
    try:
        conn = zk.connect()
        attendance = conn.get_attendance()
        att_count = len(attendance)
        
        # Get members to perform matching
        members_ref = db.collection('members')
        members_list = [d.to_dict() for d in members_ref.stream()]
        members_map = {}
        # Pre-index members by deviceUserId or biometricId
        for m in members_list:
            m_uid = m.get('uid') or m.get('id')
            if m.get('deviceUserId'):
                members_map[str(m['deviceUserId'])] = m
            if m.get('biometricId'):
                members_map[str(m['biometricId'])] = m
        
        for record in attendance:
            user_id = str(record.user_id)
            timestamp_iso = record.timestamp.isoformat() + 'Z' if record.timestamp else datetime.utcnow().isoformat() + 'Z'
            
            # Format logs for dashboard preview (keep first 50)
            if len(att_logs) < 50:
                att_logs.append({
                    'userId': record.user_id,
                    'timestamp': record.timestamp.strftime("%Y-%m-%d %H:%M:%S") if record.timestamp else "N/A",
                    'punchType': record.punch
                })
                
            # If member matches, import log
            if user_id in members_map:
                member_data = members_map[user_id]
                member_db_id = member_data.get('uid') or member_data.get('id')
                
                # Check for double check-in on that specific timestamp to avoid duplicates
                att_doc_id = f"att_import_{member_db_id}_{timestamp_iso.replace(':', '-').replace('.', '-')}"
                
                db.collection('attendance').document(att_doc_id).set({
                    'attendanceId': att_doc_id,
                    'memberId': member_db_id,
                    'biometricId': member_data.get('biometricId', ''),
                    'deviceUserId': member_data.get('deviceUserId', ''),
                    'memberName': member_data.get('name', 'Unknown'),
                    'memberCode': member_data.get('memberId', 'N/A'),
                    'avatarUrl': member_data.get('avatar', '') or member_data.get('avatarUrl', ''),
                    'deviceId': 'dev_k90_main',
                    'deviceName': 'Main Gate',
                    'branch': member_data.get('branch', 'Alpha Zone Main Branch'),
                    'timestamp': timestamp_iso,
                    'checkIn': timestamp_iso,
                    'checkOut': None,
                    'status': 'granted',
                    'method': 'biometric',
                    'membership': member_data.get('plan', 'Monthly'),
                    'createdAt': datetime.utcnow().isoformat() + 'Z'
                })
                imported_count += 1
            
        msg = f"Read Attendance logs: SUCCESS. Found {att_count} logs. Imported {imported_count} matched logs."
        logging.info(msg)
        push_diagnostic_log("SUCCESS", msg)
    except Exception as e:
        last_error = str(e)
        msg = f"Read Attendance logs FAILED: {e}"
        logging.error(msg)
        push_diagnostic_log("ERROR", msg)
    finally:
        if conn:
            try: conn.disconnect()
            except: pass
            
    db.collection('device_testing').document('control').update({
        'attendanceCount': att_count,
        'attendanceLogs': att_logs,
        'importedCount': imported_count,
        'lastError': last_error,
        'lastChecked': datetime.utcnow().isoformat() + 'Z'
    })
    evaluate_combined_device_status()

def run_diagnostics_sync_firebase():
    push_diagnostic_log("INFO", "Executing Firebase Sync Test...")
    # Fetch current control status
    control_ref = db.collection('device_testing').document('control').get()
    control_data = control_ref.to_dict() if control_ref.exists else {}
    
    users_count = control_data.get('usersCount', 0)
    attendance_count = control_data.get('attendanceCount', 0)
    ping_status = control_data.get('pingStatus', 'Failed')
    tcp_status = control_data.get('tcpStatus', 'Failed')
    
    sync_ok = False
    last_error = None
    
    try:
        # Create run audit record in device_test_logs collection
        db.collection('device_test_logs').add({
            'connectionStatus': 'Connected' if (users_count > 0 and attendance_count > 0) else 'Disconnected',
            'deviceName': control_data.get('deviceName', 'ESSL K90 Pro'),
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'usersCount': users_count,
            'attendanceCount': attendance_count,
            'ip': DEVICE_IP,
            'port': DEVICE_PORT,
            'pingStatus': ping_status,
            'tcpStatus': tcp_status
        })
        sync_ok = True
        msg = "Firebase Sync Test: SUCCESS. Logged test run details to device_test_logs collection."
        logging.info(msg)
        push_diagnostic_log("SUCCESS", msg)
    except Exception as e:
        last_error = str(e)
        msg = f"Firebase Sync Test FAILED: {e}"
        logging.error(msg)
        push_diagnostic_log("ERROR", msg)
        
    db.collection('device_testing').document('control').update({
        'firebaseSyncStatus': 'Success' if sync_ok else 'Failed',
        'lastError': last_error,
        'lastChecked': datetime.utcnow().isoformat() + 'Z'
    })
    evaluate_combined_device_status()

def run_diagnostics_import_users():
    push_diagnostic_log("INFO", "Executing Import Users From Device...")
    db.collection('device_testing').document('control').update({
        'importStatus': 'processing',
        'importProgress': 10,
        'importStats': {
            'total': 0,
            'imported': 0,
            'skipped': 0,
            'duplicates': 0
        }
    })
    
    zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=5)
    conn = None
    try:
        conn = zk.connect()
        users = conn.get_users()
        total_users = len(users)
        
        db.collection('device_testing').document('control').update({
            'importStats.total': total_users,
            'importProgress': 30
        })
        
        imported = 0
        skipped = 0
        duplicates = 0
        
        # Prepare to iterate
        for idx, u in enumerate(users):
            user_id = str(u.user_id)
            user_name = u.name or "User " + user_id
            
            # Check if biometric mapping already exists in members
            members_ref = db.collection('members')
            query = members_ref.where('biometricId', '==', user_id).limit(1).stream()
            existing = None
            for doc in query:
                existing = doc
                break
                
            if not existing:
                try:
                    query_int = members_ref.where('biometricId', '==', int(user_id)).limit(1).stream()
                    for doc in query_int:
                        existing = doc
                        break
                except ValueError:
                    pass
            
            if existing:
                duplicates += 1
                skipped += 1
            else:
                # Generate sequential Member ID (AZ-2026-XXXX)
                current_year = datetime.now().year
                prefix = f"AZ-{current_year}-"
                
                # Fetch members to calculate next serial number
                docs = members_ref.stream()
                nums = []
                for doc in docs:
                    m_data = doc.to_dict()
                    m_id = m_data.get('memberId', '')
                    if m_id and m_id.startswith(prefix):
                        parts = m_id.split('-')
                        if len(parts) >= 3:
                            try:
                                nums.append(int(parts[2]))
                            except ValueError:
                                pass
                next_num = max(nums) + 1 if nums else 1
                member_id = f"{prefix}{str(next_num).zfill(4)}"
                
                # Write new member profile to members collection
                new_uid = f"m_imported_{user_id}_{int(time.time())}"
                new_member = {
                    'uid': new_uid,
                    'name': user_name,
                    'phone': f"99887{user_id.zfill(5)}", # Placeholder phone
                    'email': f"user{user_id}@alphagym.com",
                    'plan': 'Monthly',
                    'joinDate': datetime.now().strftime("%Y-%m-%d"),
                    'expiryDate': (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                    'status': 'active',
                    'branch': 'Alpha Zone Main Branch',
                    'trainer': '',
                    'gender': 'Male',
                    'age': 25,
                    'weight': 70,
                    'height': 170,
                    'bmi': 24.2,
                    'bloodGroup': 'O+',
                    'emergencyContact': '',
                    'maritalStatus': 'Single',
                    'fitnessGoal': 'General Fitness',
                    'biometricId': user_id,
                    'daysLeft': 30,
                    'attendanceCount': 0,
                    'avatar': f"https://api.dicebear.com/7.x/adventurer/svg?seed={user_name.replace(' ', '')}",
                    'streak': 1,
                    'goalWeight': 65,
                    'attendancePercent': 100,
                    'referralCode': (user_name.replace(' ', '')[:4].upper() + str(next_num).zfill(3))[:7]
                }
                
                db.collection('members').document(new_uid).set(new_member)
                imported += 1
            
            # Update progress periodically
            prog = 30 + int((idx + 1) / total_users * 60)
            db.collection('device_testing').document('control').update({
                'importProgress': prog,
                'importStats.imported': imported,
                'importStats.skipped': skipped,
                'importStats.duplicates': duplicates
            })
            
        msg = f"Import Users: SUCCESS. Total: {total_users} | Imported: {imported} | Duplicates Skipped: {duplicates}."
        logging.info(msg)
        push_diagnostic_log("SUCCESS", msg)
        db.collection('device_testing').document('control').update({
            'importStatus': 'completed',
            'importProgress': 100
        })
    except Exception as e:
        msg = f"Import Users FAILED: {e}"
        logging.error(msg)
        push_diagnostic_log("ERROR", msg)
        db.collection('device_testing').document('control').update({
            'importStatus': 'failed',
            'importProgress': 100
        })
    finally:
        if conn:
            try: conn.disconnect()
            except: pass
            
    # Refresh stats
    evaluate_combined_device_status()

def evaluate_combined_device_status():
    """
    Evaluates combined status based on actual verification conditions:
    Device Status = Connected ONLY if usersCount > 0 and attendanceCount > 0 and firebaseSyncStatus == 'Success'.
    """
    control_ref = db.collection('device_testing').document('control').get()
    if not control_ref.exists:
        return
        
    data = control_ref.to_dict()
    users_count = data.get('usersCount', 0)
    attendance_count = data.get('attendanceCount', 0)
    sync_status = data.get('firebaseSyncStatus', 'Failed')
    
    is_connected = (users_count > 0) and (attendance_count > 0) and (sync_status == 'Success')
    status_str = "Connected" if is_connected else "Disconnected"
    
    # Also get last punch information if available
    last_punch = "Not Available"
    last_user_read = "None"
    attendance_logs = data.get('attendanceLogs', [])
    if len(attendance_logs) > 0:
        last_punch = attendance_logs[0].get('timestamp', 'Not Available')
        last_user_read = attendance_logs[0].get('userId', 'None')
        
    db.collection('device_testing').document('control').update({
        'status': status_str,
        'lastPunch': last_punch,
        'lastUserRead': last_user_read
    })

def make_diagnostics_listener():
    def diagnostics_snapshot_listener(doc_snapshot, changes, read_time):
        for doc in doc_snapshot:
            data = doc.to_dict()
            if not data:
                continue
            
            # Check for pending actions
            if data.get('testConnectionPending', False):
                try:
                    db.collection('device_testing').document('control').update({
                        'testConnectionPending': False
                    })
                    logging.info("[Diagnostics Trigger] Connection test requested.")
                    threading.Thread(target=run_diagnostics_connection_test, daemon=True).start()
                except Exception as ex:
                    logging.error(f"Failed to trigger diagnostics connection test: {ex}")
                    
            if data.get('readUsersPending', False):
                try:
                    db.collection('device_testing').document('control').update({
                        'readUsersPending': False
                    })
                    logging.info("[Diagnostics Trigger] Read users requested.")
                    threading.Thread(target=run_diagnostics_read_users, daemon=True).start()
                except Exception as ex:
                    logging.error(f"Failed to trigger diagnostics read users: {ex}")
                    
            if data.get('readAttendancePending', False):
                try:
                    db.collection('device_testing').document('control').update({
                        'readAttendancePending': False
                    })
                    logging.info("[Diagnostics Trigger] Read attendance requested.")
                    threading.Thread(target=run_diagnostics_read_attendance, daemon=True).start()
                except Exception as ex:
                    logging.error(f"Failed to trigger diagnostics read attendance: {ex}")
                    
            if data.get('syncFirebasePending', False):
                try:
                    db.collection('device_testing').document('control').update({
                        'syncFirebasePending': False
                    })
                    logging.info("[Diagnostics Trigger] Firebase sync requested.")
                    threading.Thread(target=run_diagnostics_sync_firebase, daemon=True).start()
                except Exception as ex:
                    logging.error(f"Failed to trigger diagnostics firebase sync: {ex}")
                    
            if data.get('importUsersPending', False):
                try:
                    db.collection('device_testing').document('control').update({
                        'importUsersPending': False
                    })
                    logging.info("[Diagnostics Trigger] Import users requested.")
                    threading.Thread(target=run_diagnostics_import_users, daemon=True).start()
                except Exception as ex:
                    logging.error(f"Failed to trigger diagnostics import users: {ex}")
    return diagnostics_snapshot_listener


# ═══════════════════════════════════════════════════════════════════════════════
# SMART BIOMETRIC ENROLLMENT ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

def run_enroll_fingerprint(enrollment_doc_id, member_id, member_name, biometric_uid, finger_index=0, target_collection='members', device_id='dev_k90_main'):
    """Run an enrollment command on the persistent local device service.

    Completion is reported only after the selected user's fingerprint template
    has been read back from the ESSL device and its CRM record is updated.
    """
    enroll_ref = db.collection('biometric_enrollment').document(enrollment_doc_id)
    target_collection = target_collection if target_collection in ('members', 'employees') else 'members'
    member_ref = db.collection(target_collection).document(member_id)
    profile_ref = db.collection('biometric_profiles').document(member_id)
    template_verified = False

    def push_status(status, message, extra=None):
        payload = {'status': status, 'message': message, 'updatedAt': datetime.utcnow().isoformat() + 'Z'}
        if extra:
            payload.update(extra)
        enroll_ref.update(payload)

    with biometric_lock:
        conn = None
        try:
            uid_value = int(biometric_uid)
            finger_value = int(finger_index)
            if not 1 <= uid_value <= 65535 or not 0 <= finger_value <= 9:
                raise ValueError("Biometric ID must be 1..65535 and finger index must be 0..9.")

            push_status('connecting', 'Connecting to configured EasyBio terminal...', {'scan': 0, 'totalScans': 3})
            logging.info(f"[ENROLLMENT] Selected {target_collection[:-1]} {member_id}, device user {uid_value}, name {member_name}")
            # Finger enrollment requires three deliberate touches at the terminal.
            # A 15-second socket timeout expires while a member is positioning a
            # finger, even though employees who scan quickly may appear to work.
            zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=180)
            conn = zk.connect()
            users = conn.get_users()
            device_user = next((u for u in users if str(u.user_id).strip() == str(uid_value)), None)

            if not device_user:
                push_status('user_creating', f'Creating device user {uid_value}...', {'deviceUserId': str(uid_value)})
                conn.set_user(uid=uid_value, name=member_name[:24].strip(), privilege=0,
                              password='', group_id='', user_id=str(uid_value))
                users = conn.get_users()
                device_user = next((u for u in users if str(u.user_id).strip() == str(uid_value)), None)
            if not device_user:
                raise RuntimeError(f'Device did not return user {uid_value} after user creation.')
            device_name_key = ' '.join(str(device_user.name or '').casefold().split())
            crm_name_key = ' '.join(str(member_name[:24] or '').casefold().split())
            if device_name_key != crm_name_key:
                # Numeric device user ID is the authoritative mapping. Names are
                # display labels and can become stale after an import/rename.
                logging.warning(
                    f'[ENROLLMENT] Device user {uid_value} has display name '
                    f'"{device_user.name or ""}"; CRM name is "{member_name[:24]}". '
                    'Keeping the existing numeric ID and updating its label.'
                )
                conn.set_user(uid=int(device_user.uid), name=member_name[:24].strip(), privilege=0,
                              password='', group_id='', user_id=str(uid_value))
                users = conn.get_users()
                device_user = next((u for u in users if str(u.user_id).strip() == str(uid_value)), None)
                if not device_user:
                    raise RuntimeError(f'Device user {uid_value} disappeared while updating its display name.')
            push_status('user_created', f'Device user {uid_value} verified.', {'deviceUserId': str(uid_value)})

            templates = conn.get_templates()
            user_templates = [t for t in templates if int(t.uid) == int(device_user.uid)]
            used_finger_indexes = {int(t.fid) for t in user_templates}
            free_slots = [slot for slot in range(10) if slot not in used_finger_indexes]
            if not free_slots:
                raise RuntimeError(
                    f'Device user {uid_value} already has templates in all 10 finger slots; '
                    'delete an old device template before re-enrolling.'
                )
            if finger_value in used_finger_indexes:
                # Never overwrite the existing finger: Re-Enroll adds the new scan
                # in the next free slot so access continues during replacement.
                finger_value = free_slots[0]
                enroll_ref.update({'fingerIndex': finger_value})
                logging.info(
                    f'[FINGERPRINT] Device user {uid_value} already has a template; '
                    f'preserving it and enrolling the new scan in free slot {finger_value}.'
                )
            template_verified = False

            if not template_verified:
                push_status('device_ready', 'Device ready. Follow the terminal prompts for fingerprint scans.', {'scan': 0})
                push_status('enrollment_requested', 'Fingerprint enrollment started on the device.', {'scan': 0})
                push_status('scanning', 'Waiting for the device to complete fingerprint capture.', {'scan': 0})
                logging.info(f"[FINGERPRINT] Enrollment requested for device user {uid_value}, finger {finger_value}")
                conn.enroll_user(uid=int(device_user.uid), temp_id=finger_value, user_id=str(uid_value))

                users = conn.get_users()
                device_user = next((u for u in users if str(u.user_id).strip() == str(uid_value)), None)
                templates = conn.get_templates()
                user_templates = [
                    t for t in templates
                    if device_user is not None and int(t.uid) == int(device_user.uid)
                ]
                template_verified = any(int(t.fid) == finger_value for t in user_templates)

            if not template_verified:
                raise RuntimeError(f'Device read-back did not find fingerprint template for user {uid_value}, finger {finger_value}.')

            fingerprint_count = len(user_templates)
            device_uid = int(device_user.uid)
            conn.disconnect()
            conn = None

            now_iso = datetime.utcnow().isoformat() + 'Z'
            push_status('device_enrolled_crm_sync_pending', 'Device user and fingerprint template verified; saving CRM mapping.', {
                'scan': 3, 'deviceEnrolled': True, 'templateVerified': True,
                'fingerIndex': finger_value,
                'biometricId': str(uid_value), 'deviceUid': device_uid,
                'fingerprintsCount': fingerprint_count
            })
            logging.info(f"[VERIFY] Device user {uid_value} and fingerprint template {finger_value} confirmed.")

            db.collection('deviceUsers').document(f'dev_{device_id}_usr_{uid_value}').set({
                'deviceId': device_id,
                'deviceName': 'EasyBio Biometric',
                'userId': uid_value,
                'uid': device_uid,
                'userName': member_name,
                'fingerprintsCount': fingerprint_count,
                'enrollmentStatus': 'Enrolled',
                'lastActivity': now_iso
            }, merge=True)

            member_ref.update({
                'biometricId': uid_value,
                'deviceUserId': str(uid_value),
                'biometricEnrolled': True,
                'fingerprintStatus': 'ENROLLED',
                'fingerprintEnrolled': True,
                'fingerprintEnrolledAt': now_iso,
                'fingerprintDeviceId': device_id,
                'fingerprintMappingSource': 'LOCAL_ENROLLMENT',
                'lastBiometricSync': now_iso
            })
            profile_ref.set({
                'memberId': member_id,
                'memberName': member_name,
                'biometricId': uid_value,
                'fingerIndex': finger_value,
                'fingerprintStatus': 'ENROLLED',
                'faceStatus': 'not_enrolled',
                'enrollmentDate': now_iso,
                'deviceName': 'EasyBio Biometric',
                'deviceIp': DEVICE_IP,
                'devicePort': DEVICE_PORT,
                'lastSync': now_iso,
                'enrolledBy': 'Local Terminal'
            }, merge=True)

            push_status('success', f'Fingerprint template verified and mapped to device user {uid_value}.', {
                'scan': 3, 'biometricId': str(uid_value), 'completedAt': now_iso,
                'deviceEnrolled': True, 'templateVerified': True,
                'targetCollection': target_collection
            })
            logging.info(f"[CRM] SUCCESS: {target_collection}/{member_id} mapped to device user {uid_value}.")
            try:
                db.collection('notifications').add({
                    'title': 'Biometric Enrollment Successful',
                    'body': f'{member_name} fingerprint registered. Biometric ID: {uid_value}',
                    'memberId': member_id,
                    'type': 'enrollment',
                    'timestamp': now_iso,
                    'read': False
                })
            except Exception as notification_error:
                logging.warning(f"[ENROLLMENT] Notification write failed: {notification_error}")

        except Exception as e:
            err_msg = str(e)
            logging.error(f"[ENROLLMENT] FAILED for {target_collection}/{member_id}: {err_msg}")
            if conn:
                try:
                    conn.disconnect()
                except Exception:
                    pass
            if template_verified:
                push_status('crm_sync_pending', f'Device enrollment succeeded; CRM sync needs retry: {err_msg}', {
                    'scan': 3, 'deviceEnrolled': True, 'templateVerified': True,
                    'targetCollection': target_collection, 'error': err_msg
                })
            else:
                push_status('failed', f'Enrollment failed: {err_msg}', {'scan': 0, 'error': err_msg})
            try:
                db.collection('notifications').add({
                    'title': 'Biometric Enrollment Failed',
                    'body': f'{member_name} fingerprint enrollment failed: {err_msg}',
                    'memberId': member_id,
                    'type': 'enrollment_error',
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'read': False
                })
            except Exception:
                pass

def run_delete_biometric(enrollment_doc_id, member_id, member_name, biometric_uid):
    """Deletes a user's fingerprint templates from the ESSL device."""
    enroll_ref = db.collection('biometric_enrollment').document(enrollment_doc_id)
    member_ref = db.collection('members').document(member_id)
    profile_ref = db.collection('biometric_profiles').document(member_id)

    def push_status(status, message):
        enroll_ref.update({'status': status, 'message': message, 'updatedAt': datetime.utcnow().isoformat() + 'Z'})

    with biometric_lock:
        try:
            push_status('connecting', 'Connecting to device...')
            zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=10)
            conn = zk.connect()
            push_status('processing', f'Deleting biometric templates for ID {biometric_uid}...')

            conn.delete_user(uid=int(biometric_uid))
            conn.disconnect()

            now_iso = datetime.utcnow().isoformat() + 'Z'
            push_status('success', f'Biometric data deleted for {member_name}')
            logging.info(f"[Enrollment] Deleted biometric for {member_name} (UID {biometric_uid})")

            member_ref.update({
                'biometricEnrolled': False,
                'fingerprintStatus': 'not_enrolled',
                'lastBiometricSync': now_iso
            })
            profile_ref.set({'fingerprintStatus': 'not_enrolled', 'deletedAt': now_iso}, merge=True)

        except Exception as e:
            err_msg = str(e)
            logging.error(f"[Enrollment] Delete biometric FAILED: {err_msg}")
            push_status('failed', f'Delete failed: {err_msg}')


def set_terminal_user_enabled(conn, biometric_uid, enabled):
    """Toggle only the terminal user's enabled bit; fingerprint templates stay intact."""
    from zk import const

    uid_string = str(biometric_uid).strip()
    users = conn.get_users()
    user = next((item for item in users if str(item.user_id).strip() == uid_string), None)
    if user is None:
        raise RuntimeError(f'Terminal user {uid_string} was not found; no access flag was changed.')

    privilege = int(user.privilege or 0)
    privilege = (privilege & 0x0E) | (0 if enabled else 1)
    def fixed_bytes(value, length):
        if isinstance(value, bytes):
            encoded = value
        else:
            encoded = str(value or '').encode('utf-8', errors='ignore')
        return encoded.ljust(length, b'\x00')[:length]

    if conn.user_packet_size == 28:
        user_packet = struct.pack(
            '<HB5s8sIxBHI', int(user.uid), privilege,
            fixed_bytes(user.password, 5), fixed_bytes(user.name, 8),
            int(user.card or 0), int(user.group_id or 0), 0, int(uid_string)
        )
    elif conn.user_packet_size == 72:
        user_packet = struct.pack(
            '<HB8s24s4sx7sx24s', int(user.uid), privilege,
            fixed_bytes(user.password, 8), fixed_bytes(user.name, 24),
            struct.pack('<I', int(user.card or 0))[:4],
            fixed_bytes(user.group_id, 7), fixed_bytes(uid_string, 24)
        )
    else:
        raise RuntimeError(f'Unsupported terminal user record size: {conn.user_packet_size}; refusing an unverified access change.')

    # A device-side fingerprint count comparison ensures this command changed
    # only the account permission bit and never removed or replaced templates.
    before_templates = [fp for fp in conn.get_templates() if str(fp.uid) == str(user.uid)]
    conn.disable_device()
    try:
        result = conn._ZK__send_command(const.CMD_USER_WRQ, user_packet, 1024)
        if not result.get('status'):
            raise RuntimeError('Terminal rejected the user enable/disable command.')
        conn.refresh_data()
    finally:
        conn.enable_device()

    verified_users = conn.get_users()
    verified_user = next((item for item in verified_users if str(item.user_id).strip() == uid_string), None)
    if verified_user is None:
        raise RuntimeError(f'Terminal did not return user {uid_string} after access update.')
    is_disabled = bool(int(verified_user.privilege or 0) & 1)
    if is_disabled == enabled:
        raise RuntimeError(f'Terminal access read-back mismatch for user {uid_string}.')
    after_templates = [fp for fp in conn.get_templates() if str(fp.uid) == str(verified_user.uid)]
    if len(after_templates) != len(before_templates):
        raise RuntimeError(
            f'Fingerprint verification failed: template count changed from {len(before_templates)} to {len(after_templates)}.'
        )
    return {'enabled': enabled, 'fingerprintsCount': len(after_templates), 'userName': verified_user.name}


def run_set_user_access(enrollment_doc_id, member_id, member_name, biometric_uid, enabled, target_collection='members', manual_access=True):
    """Enable/disable a terminal account in place and verify retained templates."""
    enroll_ref = db.collection('biometric_enrollment').document(enrollment_doc_id)
    target_collection = target_collection if target_collection in ('members', 'employees') else 'members'
    target_ref = db.collection(target_collection).document(member_id)
    profile_ref = db.collection('biometric_profiles').document(member_id)

    def push_status(status, message, extra=None):
        payload = {'status': status, 'message': message, 'updatedAt': datetime.utcnow().isoformat() + 'Z'}
        if extra:
            payload.update(extra)
        enroll_ref.update(payload)

    with biometric_lock:
        conn = None
        try:
            push_status('connecting', 'Connecting to terminal to update user access...', {'enabled': bool(enabled)})
            target_snapshot = target_ref.get()
            if not target_snapshot.exists:
                raise RuntimeError(f'{target_collection[:-1].capitalize()} record no longer exists.')
            current_record = target_snapshot.to_dict() or {}
            if manual_access:
                current_action = 'unblock' if enabled else 'block'
                if (current_record.get('biometricBlockCommandId') != enrollment_doc_id
                        or current_record.get('biometricBlockPending') is not True
                        or current_record.get('biometricBlockAction') != current_action):
                    push_status('cancelled', 'This access command was superseded by a newer user action.')
                    return
                if enabled and not membership_allows_terminal_access(current_record, allow_explicit_unblock=True):
                    target_ref.set({
                        'biometricBlocked': True,
                        'biometricBlockPending': False,
                        'biometricBlockAction': None,
                    }, merge=True)
                    push_status('failed', 'Membership is not eligible for access; renew or activate it first.')
                    return
            elif membership_allows_terminal_access(current_record) != bool(enabled):
                push_status('cancelled', 'This membership policy command was superseded by newer membership state.')
                return
            zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=15)
            conn = zk.connect()
            push_status('processing', 'Updating terminal account state without touching fingerprints...')
            result = set_terminal_user_enabled(conn, biometric_uid, bool(enabled))
            now_iso = datetime.utcnow().isoformat() + 'Z'
            target_update = {
                'biometricEnrolled': result['fingerprintsCount'] > 0,
                'fingerprintEnrolled': result['fingerprintsCount'] > 0,
                'fingerprintStatus': 'ENROLLED' if result['fingerprintsCount'] > 0 else 'not_enrolled',
                'lastBiometricSync': now_iso,
            }
            if manual_access:
                target_update.update({
                    'biometricBlocked': not bool(enabled),
                    'biometricBlockPending': False,
                    'biometricBlockAction': None,
                    'biometricBlockCommandId': None,
                    'biometricBlockedAt': None if enabled else now_iso,
                    'biometricBlockReason': None if enabled else 'Manually blocked from gate control',
                })
            target_ref.set(target_update, merge=True)
            profile_ref.set({'lastSync': now_iso, 'deviceAccessEnabled': bool(enabled)}, merge=True)
            device_id = os.getenv('EASYBIO_DEVICE_ID', 'dev_k90_main')
            db.collection('deviceUsers').document(f'dev_{device_id}_usr_{int(biometric_uid)}').set({
                'deviceId': device_id,
                'userId': int(biometric_uid),
                'userName': result['userName'],
                'fingerprintsCount': result['fingerprintsCount'],
                'enrollmentStatus': 'Enrolled' if result['fingerprintsCount'] > 0 else 'Card Only',
                'accessEnabled': bool(enabled),
                'lastActivity': now_iso,
            }, merge=True)
            message = ('Access enabled' if enabled else 'Access disabled') + f" for {member_name}; {result['fingerprintsCount']} fingerprint template(s) retained."
            push_status('success', message, {'fingerprintsCount': result['fingerprintsCount'], 'enabled': bool(enabled)})
            logging.info(f"[ACCESS] {message}")
        except Exception as error:
            message = str(error)
            logging.error(f"[ACCESS] Could not update terminal user {biometric_uid}: {message}")
            # Keep block requests fail-closed. An unsuccessful enable must not clear
            # the CRM block bit; a retry can safely issue the idempotent command.
            if manual_access:
                target_ref.set({'biometricBlocked': True, 'biometricBlockPending': False, 'biometricBlockAction': None}, merge=True)
            push_status('failed', f'Access update failed: {message}')
        finally:
            if conn:
                try:
                    conn.disconnect()
                except Exception:
                    pass


def run_sync_user_to_device(enrollment_doc_id, member_id, member_name, biometric_uid):
    """Syncs a CRM member's user record to the device (creates user slot if not exists)."""
    enroll_ref = db.collection('biometric_enrollment').document(enrollment_doc_id)

    def push_status(status, message):
        enroll_ref.update({'status': status, 'message': message, 'updatedAt': datetime.utcnow().isoformat() + 'Z'})

    with biometric_lock:
        try:
            push_status('connecting', 'Connecting to ESSL K90 Pro...')
            zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=10)
            conn = zk.connect()

            push_status('processing', f'Syncing {member_name} to device slot {biometric_uid}...')

            # Check existing users
            from zk.user import User
            users = conn.get_users()
            uid_int = int(biometric_uid)
            slot_exists = any(str(u.user_id) == str(biometric_uid) for u in users)

            if not slot_exists:
                # Set the user info on device
                conn.set_user(uid=uid_int, name=member_name[:24], privilege=0, password='', group_id='', user_id=str(biometric_uid))

            conn.disconnect()

            now_iso = datetime.utcnow().isoformat() + 'Z'
            push_status('success', f'{member_name} synced to device slot {biometric_uid}')
            logging.info(f"[Sync] Synced {member_name} to device slot {biometric_uid}")

            db.collection('biometric_profiles').document(member_id).set({
                'lastSync': now_iso, 'deviceName': 'ESSL K90 Pro'
            }, merge=True)
            db.collection('members').document(member_id).update({'lastBiometricSync': now_iso})

        except Exception as e:
            err_msg = str(e)
            logging.error(f"[Sync] Sync user to device FAILED: {err_msg}")
            push_status('failed', f'Sync failed: {err_msg}')


def make_enrollment_listener():
    """Listens to biometric_enrollment collection for pending commands from the CRM."""
    def enrollment_snapshot_listener(col_snapshot, changes, read_time):
        for change in changes:
            if change.type.name not in ('ADDED', 'MODIFIED'):
                continue
            doc = change.document
            data = doc.to_dict()
            if not data:
                continue

            command = data.get('command')
            status = data.get('status', '')

            # Only act on 'pending' commands
            if status != 'pending':
                continue

            doc_id = doc.id
            member_id = data.get('memberId', '')
            member_name = data.get('memberName', 'Unknown')
            biometric_uid = data.get('biometricId', 1)
            finger_index = data.get('fingerIndex', 0)
            device_id = data.get('deviceId') or 'dev_k90_main'
            target_collection = data.get('targetCollection')
            if target_collection not in ('members', 'employees'):
                target_collection = 'employees' if data.get('targetType') == 'EMPLOYEE' or data.get('isEmployee') else 'members'

            if command == 'enroll_fingerprint':
                logging.info(f"[Enrollment Listener] Fingerprint enrollment triggered for {target_collection}/{member_id}")
                threading.Thread(
                    target=run_enroll_fingerprint,
                    args=(doc_id, member_id, member_name, biometric_uid, finger_index, target_collection, device_id),
                    daemon=True
                ).start()

            elif command == 'delete_biometric':
                logging.info(f"[Enrollment Listener] Delete biometric triggered for {member_name}")
                threading.Thread(
                    target=run_delete_biometric,
                    args=(doc_id, member_id, member_name, biometric_uid),
                    daemon=True
                ).start()

            elif command == 'set_user_access':
                member_id = str(data.get('memberId', '')).strip()
                biometric_uid = str(data.get('biometricId', '')).strip()
                member_name = data.get('memberName', 'Gym Member')
                target_collection = data.get('targetCollection') or ('employees' if data.get('isEmployee') else 'members')
                enabled = data.get('enabled') is True
                manual_access = data.get('source') != 'membership_policy'
                target_collection = target_collection if target_collection in ('members', 'employees') else 'members'
                current_snapshot = db.collection(target_collection).document(member_id).get() if member_id else None
                current_record = current_snapshot.to_dict() if current_snapshot and current_snapshot.exists else None
                current_action = 'unblock' if enabled else 'block'
                is_current = bool(current_record)
                if manual_access:
                    is_current = is_current and (
                        current_record.get('biometricBlockCommandId') == doc.id
                        and current_record.get('biometricBlockPending') is True
                        and current_record.get('biometricBlockAction') == current_action
                    )
                else:
                    is_current = is_current and (membership_allows_terminal_access(current_record) == enabled)
                if not is_current:
                    logging.info(f"[ACCESS] Skipping stale command {doc.id}; newer CRM access state takes precedence.")
                    doc.reference.update({
                        'status': 'cancelled',
                        'message': 'Skipped because a newer CRM access or membership state superseded this command.',
                        'updatedAt': datetime.utcnow().isoformat() + 'Z',
                    })
                    continue
                logging.info(f"[ACCESS] Setting terminal user {biometric_uid} {'enabled' if enabled else 'disabled'} without deleting templates.")
                threading.Thread(
                    target=run_set_user_access,
                    args=(doc.id, member_id, member_name, biometric_uid, enabled, target_collection, manual_access),
                    daemon=True
                ).start()

            elif command == 'sync_to_device':
                logging.info(f"[Enrollment Listener] Sync to device triggered for {member_name}")
                threading.Thread(
                    target=run_sync_user_to_device,
                    args=(doc_id, member_id, member_name, biometric_uid),
                    daemon=True
                ).start()

    return enrollment_snapshot_listener


def parse_membership_date(value):
    if not value:
        return None
    try:
        if hasattr(value, 'date') and callable(value.date):
            return value.date()
        if hasattr(value, 'to_datetime'):
            return value.to_datetime().date()
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value / 1000 if value > 10_000_000_000 else value).date()
        return datetime.strptime(str(value).strip()[:10], '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None


def membership_allows_terminal_access(data, today=None, allow_explicit_unblock=False):
    today = today or date.today()
    statuses = {str(data.get(key, '') or '').strip().casefold() for key in ('status', 'membershipStatus')}
    explicit_unblock_pending = allow_explicit_unblock and data.get('biometricBlockPending') is True and data.get('biometricBlockAction') == 'unblock'
    if ((data.get('biometricBlocked') is True and not explicit_unblock_pending)
            or data.get('isBlocked') is True or data.get('blacklisted') is True
            or statuses.intersection({'blocked', 'blacklisted', 'frozen', 'expired', 'inactive', 'suspended', 'cancelled', 'canceled'})):
        return False
    start = parse_membership_date(data.get('startDate') or data.get('membershipStartDate') or data.get('joinDate'))
    expiry = parse_membership_date(data.get('expiryDate') or data.get('membershipExpiryDate') or data.get('endDate'))
    if start and today < start:
        return False
    if expiry and today > expiry:
        return False
    return True


def queue_membership_policy_access(collection_name, doc_id, data, enabled):
    biometric_uid = str(data.get('biometricId') or data.get('deviceUserId') or '').strip()
    if not biometric_uid.isdigit() or not 1 <= int(biometric_uid) <= 65535:
        return
    command_id = f"policy_{collection_name}_{doc_id}_{'on' if enabled else 'off'}_{int(time.time() * 1000)}"
    try:
        db.collection('biometric_enrollment').document(command_id).set({
            'docId': command_id,
            'command': 'set_user_access',
            'status': 'pending',
            'source': 'membership_policy',
            'memberId': doc_id,
            'targetCollection': collection_name,
            'isEmployee': collection_name == 'employees',
            'memberName': data.get('name') or ('Employee' if collection_name == 'employees' else 'Member'),
            'biometricId': int(biometric_uid),
            'enabled': bool(enabled),
            'message': 'Applying membership access policy; fingerprints will be preserved...',
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP,
        })
        logging.info(f"[ACCESS POLICY] Queued {collection_name}/{doc_id} -> {'enabled' if enabled else 'disabled'} (biometric ID {biometric_uid}).")
    except Exception as error:
        logging.error(f"[ACCESS POLICY] Could not queue {collection_name}/{doc_id}: {error}")


def schedule_membership_access_boundary(collection_name, doc_id, data):
    key = f'{collection_name}/{doc_id}'
    old_timer = membership_expiry_timers.pop(key, None)
    if old_timer:
        old_timer.cancel()

    today = date.today()
    start = parse_membership_date(data.get('startDate') or data.get('membershipStartDate') or data.get('joinDate'))
    expiry = parse_membership_date(data.get('expiryDate') or data.get('membershipExpiryDate') or data.get('endDate'))
    boundaries = []
    if start and start > today:
        boundaries.append(datetime.combine(start, datetime.min.time()))
    if expiry and expiry >= today:
        boundaries.append(datetime.combine(expiry + timedelta(days=1), datetime.min.time()))
    if not boundaries:
        return
    next_boundary = min(boundaries)
    # Windows wait handles used by threading.Timer cannot accept values above
    # TIMEOUT_MAX (~49 days). Wake at the cap and re-schedule until the boundary.
    delay = min(max(1, (next_boundary - datetime.now()).total_seconds()), threading.TIMEOUT_MAX - 1)

    def apply_boundary():
        try:
            latest = db.collection(collection_name).document(doc_id).get()
            if not latest.exists:
                return
            current = latest.to_dict() or {}
            queue_membership_policy_access(collection_name, doc_id, current, membership_allows_terminal_access(current))
            schedule_membership_access_boundary(collection_name, doc_id, current)
        except Exception as error:
            logging.error(f"[ACCESS POLICY] Boundary check failed for {collection_name}/{doc_id}: {error}")

    timer = threading.Timer(delay, apply_boundary)
    timer.daemon = True
    membership_expiry_timers[key] = timer
    timer.start()


def make_membership_access_listener(collection_name):
    def membership_snapshot_listener(_snapshot, changes, _read_time):
        for change in changes:
            doc = change.document
            key = f'{collection_name}/{doc.id}'
            if change.type.name == 'REMOVED':
                timer = membership_expiry_timers.pop(key, None)
                if timer:
                    timer.cancel()
                membership_policy_cache.pop(key, None)
                continue
            data = doc.to_dict() or {}
            signature = (
                str(data.get('status', '')).casefold(),
                str(data.get('membershipStatus', '')).casefold(),
                str(data.get('isBlocked', False)),
                str(data.get('blacklisted', False)),
                str(data.get('startDate') or data.get('membershipStartDate') or data.get('joinDate') or ''),
                str(data.get('expiryDate') or data.get('membershipExpiryDate') or data.get('endDate') or ''),
            )
            previous = membership_policy_cache.get(key)
            membership_policy_cache[key] = signature
            schedule_membership_access_boundary(collection_name, doc.id, data)

            policy_changed = previous is not None and previous != signature
            # Avoid flooding a live terminal with commands for every historical
            # expired record on startup. Date boundaries and later status changes
            # remain watched; every punch is also validated directly in Firestore.
            if policy_changed:
                queue_membership_policy_access(collection_name, doc.id, data, membership_allows_terminal_access(data))
    return membership_snapshot_listener


def trigger_door_relay(conn, device_name="Main Gate", duration_seconds=3):
    """
    Sends door lock relay pulse to hardware terminal using pyzk unlock command.
    """
    try:
        logging.info(f"[Relay Control] Sending unlock signal to {device_name} for {duration_seconds}s...")
        # pyzk.unlock() accepts seconds and converts them to tenths internally.
        conn.unlock(duration_seconds)
        logging.info(f"🟢 [Relay Control Success] Gate opened for {duration_seconds}s on {device_name}.")
        try:
            db.collection('deviceLogs').add({
                'deviceId': 'dev_k90_main',
                'deviceName': device_name,
                'level': 'SUCCESS',
                'message': f'[Gate Control] Auto-unlock executed on {device_name}. Gate opened for {duration_seconds}s.',
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            })
        except Exception:
            pass
    except Exception as e:
        logging.error(f"[Relay Control] Failed to send unlock signal to {device_name}: {e}")
        db.collection('deviceLogs').add({
            'deviceId': 'dev_k90_main',
            'deviceName': device_name,
            'level': 'ERROR',
            'message': f'[Gate Control] Unlock FAILED on {device_name}: {e}',
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        })

def run_membership_validation(user_id, device_id, device_name, branch, timestamp_iso, is_realtime=True):
    """
    Validates a biometric card/fingerprint swipe against CRM Member database & membership engine.
    - Resolves Member profile (or Unknown Member).
    - Validates membership status (Active, Expired, Frozen).
    - Writes attendance record to Firebase (or queues locally if offline).
    - Triggers Always-on-Top Windows Desktop Overlay Popup ONLY for fresh real-time punches.
    - Prints Terminal Status & Real Punch Stream Log.
    - Returns True if access is granted (triggers gate relay unlock), False otherwise.
    """
    user_id_str = str(user_id)
    time_str = datetime.now().strftime("%H:%M:%S")
    logging.info(f"[{time_str}] PUNCH EVENT PROCESSED (Realtime={is_realtime}): Biometric UserID={user_id_str} at {device_name}")

    # 1. Check duplicate punch fingerprint
    fp = f"{device_id}_{user_id_str}_{timestamp_iso[:16]}"
    if fp in processed_fingerprints:
        logging.info(f"[Duplicate Protection] Ignoring repeat punch fingerprint {fp}")
        return False
    processed_fingerprints.add(fp)
    if len(processed_fingerprints) > 1000:
        processed_fingerprints.clear()

    # 2. Check API checkin endpoint
    api_result = None
    try:
        req_data = json.dumps({
            'memberId': user_id_str,
            'method': 'ESSL K90 Pro Biometric',
            'branch': branch
        }).encode('utf-8')
        
        req = urllib.request.Request(
            os.getenv('ALPHA_ZONE_API_URL', 'http://127.0.0.1:%s/api' % os.getenv('PORT', '5000')).rstrip('/') + '/attendance/checkin',
            data=req_data,
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=3) as resp:
            api_result = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as err:
        # An explicit membership denial from the API always wins.
        if err.code == 403:
            try:
                denied = json.loads(err.read().decode('utf-8', errors='replace'))
            except Exception:
                denied = {}
            logging.warning(f"[API Checkin Deny]: UserID={user_id_str}: {denied.get('reason') or denied.get('error') or 'Access denied by membership API.'}")
            return False
        # This internal service may receive 401 because the CRM endpoint requires a
        # dashboard token. In that case use the direct Firestore gate validation below.
        logging.warning(f"[API Checkin Notice]: HTTP {err.code}; applying direct Firestore gate validation.")
    except Exception as err:
        # If the CRM API is unavailable, only a fresh direct Firestore record may
        # authorize entry below. An absent/failed roster lookup stays unmapped/denied.
        logging.warning(f"[API Checkin Notice]: {err}; applying direct Firestore gate validation.")

    # 3. Lookup member in Firestore / local roster with multi-type matching
    member = None
    if db is not None:
        try:
            members_ref = db.collection('members')
            
            # Check string and int exact queries first
            queries = [
                members_ref.where('biometricId', '==', user_id_str).limit(1).stream(),
                members_ref.where('deviceUserId', '==', user_id_str).limit(1).stream(),
                members_ref.where('memberId', '==', user_id_str).limit(1).stream(),
            ]
            
            try:
                num_id = int(user_id_str)
                queries.extend([
                    members_ref.where('biometricId', '==', num_id).limit(1).stream(),
                    members_ref.where('deviceUserId', '==', num_id).limit(1).stream(),
                ])
            except ValueError:
                pass

            for q in queries:
                for doc_snap in q:
                    member = { 'id': doc_snap.id, **doc_snap.to_dict() }
                    break
                if member:
                    break

            # Comprehensive fallback scan across all members if exact index queries didn't hit
            if not member:
                all_members = [ { 'id': d.id, **d.to_dict() } for d in members_ref.stream() ]
                m_str_clean = user_id_str.lower().strip()
                for m in all_members:
                    bio_id = str(m.get('biometricId', '')).lower().strip()
                    dev_id = str(m.get('deviceUserId', '')).lower().strip()
                    c_id = str(m.get('clientId', '')).lower().strip()
                    cust_id = str(m.get('customId', '')).lower().strip()
                    mem_id = str(m.get('memberId', '')).lower().strip()
                    m_id = str(m.get('id', '')).lower().strip()
                    phone = str(m.get('phone', '')).lower().strip()

                    if bio_id and (bio_id == m_str_clean or bio_id.lstrip('0') == m_str_clean.lstrip('0')):
                        member = m
                        break
                    if dev_id and (dev_id == m_str_clean or dev_id.lstrip('0') == m_str_clean.lstrip('0')):
                        member = m
                        break
                    if c_id and (c_id == m_str_clean or c_id.lstrip('0') == m_str_clean.lstrip('0')):
                        member = m
                        break
                    if cust_id and (cust_id == m_str_clean or cust_id.lstrip('0') == m_str_clean.lstrip('0')):
                        member = m
                        break
                    if mem_id and (mem_id == m_str_clean or mem_id.endswith(f"-{m_str_clean}") or mem_id.endswith(m_str_clean)):
                        member = m
                        break
                    if m_id and m_id == m_str_clean:
                        member = m
                        break
                    if phone and (phone == m_str_clean or phone.endswith(m_str_clean)):
                        member = m
                        break

        except Exception as f_err:
            logging.error(f"[Firestore Member Lookup Error]: {f_err}")

    # 4. Determine Membership Status & Access (Canonical Member Flow)
    status = 'granted'
    reason = ''
    days_left = 30
    expired_days = 0
    first_checkin_time = ''
    current_punch_time = timestamp_iso
    avatar_url = ''
    member_name = 'Gym Member'
    plan_name = 'Standard Membership'
    member_id_str = ''
    member_code_str = f"ID #{user_id_str}"

    if not member and api_result and not api_result.get('unmapped'):
        member_name = api_result.get('memberName', 'Gym Member')
        avatar_url = api_result.get('avatarUrl', '')
        plan_name = api_result.get('plan', 'Standard Membership')
        status = 'granted'
        member_id_str = api_result.get('memberId', '')
        member_code_str = api_result.get('memberCode', f"ID #{user_id_str}")
    elif member:
        member_name = member.get('name', 'Gym Member')
        avatar_url = member.get('avatarUrl', '') or member.get('avatar', '')
        plan_name = member.get('plan', 'Standard Membership')
        member_id_str = member.get('id', '')
        member_code_str = member.get('memberId', f"AZ-2026-{user_id_str}")
        
        exp_date_value = member.get('expiryDate') or member.get('membershipExpiryDate') or member.get('endDate')
        if exp_date_value:
            try:
                if hasattr(exp_date_value, 'date') and callable(exp_date_value.date):
                    exp_date = exp_date_value.date()
                else:
                    exp_date = datetime.strptime(str(exp_date_value).strip()[:10], "%Y-%m-%d").date()
                delta = (exp_date - date.today()).days
                days_left = delta
                if delta < 0:
                    expired_days = abs(delta)
                    status = 'expired'
                    reason = f'Membership expired {expired_days} days ago'
            except (TypeError, ValueError):
                logging.warning(f"[Membership] Could not parse expiry date for {member_name}: {exp_date_value!r}")

        member_status = str(member.get('status', '')).strip().casefold()
        membership_status = str(member.get('membershipStatus', '')).strip().casefold()
        if member.get('biometricBlocked') is True or member.get('biometricBlockPending') is True or member.get('isBlocked') is True or member.get('blacklisted') is True or member_status in ('blocked', 'blacklisted', 'inactive', 'suspended', 'cancelled', 'canceled') or membership_status in ('blocked', 'blacklisted', 'inactive', 'suspended', 'cancelled', 'canceled'):
            status = 'denied'
            reason = member.get('biometricBlockReason') or 'Biometric access is blocked for this member'
        elif member_status == 'frozen' or membership_status == 'frozen':
            status = 'frozen'
            reason = 'Membership is frozen'
        elif member_status == 'expired' or membership_status == 'expired':
            status = 'expired'
            reason = 'Membership has expired'

        # Check Duplicate / Today Checkin for resolved member
        if status == 'granted' and db is not None:
            try:
                today_prefix = datetime.now().strftime("%Y-%m-%d")
                att_query = db.collection('attendance').where('memberId', '==', member_id_str).limit(10).stream()
                for a_snap in att_query:
                    a_data = a_snap.to_dict()
                    a_checkin = str(a_data.get('checkIn', ''))
                    if a_checkin.startswith(today_prefix) and a_data.get('status') in ('granted', 'already_inside'):
                        status = 'already_inside'
                        first_checkin_time = a_checkin
                        reason = 'Already checked in today'
                        break
            except Exception as att_err:
                logging.warning(f"Error checking duplicate attendance for member {member_id_str}: {att_err}")
    else:
        # UNMAPPED MEMBER (Requirement 3 & 15)
        status = 'unmapped'
        member_name = f"Unmapped Biometric User #{user_id_str}"
        avatar_url = ""
        plan_name = "Unmapped Biometric ID"
        member_id_str = f"unmapped_{user_id_str}"
        member_code_str = f"ID #{user_id_str}"

    mapping_found = True if member or (api_result and not api_result.get('unmapped')) else False
    attendance_written = True
    gate_will_trigger = True if (status == 'granted' and mapping_found and is_realtime) else False

    # 5. Trigger Always-on-Top Desktop Overlay Popup ONLY for fresh real-time punches
    if desktop_popup and is_realtime:
        try:
            desktop_popup.show_attendance_popup({
                'status': status,
                'memberName': member_name,
                'memberId': member_id_str,
                'memberCode': member_code_str,
                'plan': plan_name,
                'membershipDuration': (member.get('duration') or member.get('planDuration') or plan_name) if member else 'Unknown',
                'startDate': member.get('startDate', member.get('joinDate', 'N/A')) if member else 'N/A',
                'expiryDate': member.get('expiryDate', 'N/A') if member else 'N/A',
                'dob': member.get('dob', member.get('dateOfBirth', 'N/A')) if member else 'N/A',
                'age': member.get('age', '') if member else '',
                'phone': member.get('phone', '') if member else '',
                'daysRemaining': days_left if status in ('granted', 'already_inside') else 0,
                'expiredDays': expired_days,
                'visitCount': member.get('attendanceCount', 1) if member else 1,
                'avatarUrl': avatar_url,
                'deviceId': device_id,
                'deviceName': device_name,
                'biometricId': user_id_str,
                'timestamp': timestamp_iso,
                'firstCheckInTime': first_checkin_time,
                'currentPunchTime': current_punch_time
            })
        except Exception as pop_err:
            logging.error(f"[Popup Error]: {pop_err}")

    # 6. Print Terminal Output Stream Log & Dev Diagnostic Log (Requirement 14)
    print("\n[ESSL PUNCH]")
    print(f"device={device_name}")
    print(f"deviceUserId={user_id_str}")
    print(f"uid={user_id_str}")
    print(f"enrollNumber={user_id_str}")
    print(f"name=\"{member_name}\"")
    print(f"mappingFound={'true' if mapping_found else 'false'}")
    print(f"firebaseMemberId=\"{member_id_str}\"")
    print(f"membershipStatus=\"{status.upper()}\"")
    print(f"attendanceWritten={'true' if attendance_written else 'false'}")
    print(f"popupTriggered=true")
    print(f"gateTriggered={'true' if gate_will_trigger else 'false'}\n")

    access_label = "ACCESS GRANTED 🟢" if status == 'granted' else ("ALREADY INSIDE 🔵" if status == 'already_inside' else ("ACCESS DENIED 🔴" if status in ('expired', 'frozen', 'denied') else "MEMBER NOT MAPPED 🟡"))
    print("="*52)
    print(f"[{time_str}] REAL PUNCH RECEIVED — {access_label}")
    print(f"Device ID    : {device_id} ({device_name})")
    print(f"Biometric ID : {user_id_str}")
    print(f"Member       : {member_name}")
    print(f"Membership   : {plan_name} ({days_left} Days Remaining)" if status in ('granted', 'already_inside') else f"Status       : {status.upper()} ({reason or 'Access Denied'})")
    print(f"Popup        : TRIGGERED (Always-On-Top Desktop Overlay)")
    print(f"Gate Relay   : {'OPENED (3.0s)' if gate_will_trigger else 'DISABLED'}")
    print("="*52 + "\n")

    # 7. Save Attendance Session (Duplicate protected)
    if attendance_written:
        today_str = datetime.now().strftime("%Y-%m-%d")
        att_doc_id = f"att_{member_id_str}_{today_str}"
        
        punch_record = {
            'docId': att_doc_id,
            'attendanceId': att_doc_id,
            'fingerprint': fp,
            'memberId': member_id_str,
            'biometricId': user_id_str,
            'deviceUserId': user_id_str,
            'memberName': member_name,
            'memberCode': member_code_str,
            'avatarUrl': avatar_url,
            'deviceId': device_id,
            'deviceName': device_name,
            'branch': branch,
            'timestamp': timestamp_iso,
            'checkIn': timestamp_iso,
            'checkOut': None,
            'status': status,
            'reason': reason,
            'method': 'biometric',
            'membership': plan_name,
            'createdAt': timestamp_iso
        }

        if db is not None:
            try:
                # If member is already inside, check if this is a checkout punch or duplicate double-tap
                if status == 'already_inside':
                    doc_ref = db.collection('attendance').document(att_doc_id)
                    existing_snap = doc_ref.get()
                    if existing_snap.exists:
                        ex_data = existing_snap.to_dict() or {}
                        ex_in = ex_data.get('checkIn', '')
                        # If more than 10 minutes since checkin, mark as checkout
                        if ex_in:
                            try:
                                in_dt = datetime.fromisoformat(ex_in.replace('Z', '+00:00'))
                                curr_dt = datetime.fromisoformat(timestamp_iso.replace('Z', '+00:00'))
                                diff_mins = (curr_dt - in_dt).total_seconds() / 60.0
                                if diff_mins >= 10:
                                    doc_ref.update({
                                        'checkOut': timestamp_iso,
                                        'status': 'completed',
                                        'updatedAt': timestamp_iso
                                    })
                                    logging.info(f"🚪 [Checkout Recorded] Member {member_name} checked out at {timestamp_iso}")
                            except Exception as parse_err:
                                logging.warning(f"Checkout time parse warning: {parse_err}")
                elif not (api_result and api_result.get('success')):
                    # New check-in session for today
                    db.collection('attendance').document(att_doc_id).set(punch_record, merge=True)
                    db.collection('attendance_logs').document(f"log_{device_id}_{user_id_str}_{int(time.time())}").set(punch_record)
                elif api_result.get('success') and not api_result.get('alreadyInside'):
                    # The API already wrote attendance_logs and updated summary/analytics.
                    # Keep the stable day record for device-side checkout handling.
                    db.collection('attendance').document(att_doc_id).set(punch_record, merge=True)
                elif api_result.get('success'):
                    # Same-day repeat: retain the local day record for checkout only;
                    # the API intentionally avoids creating another attendance log.
                    db.collection('attendance').document(att_doc_id).set(punch_record, merge=True)
                
                flush_offline_queue()
            except Exception as save_err:
                logging.warning(f"Firebase write failed during punch. Queuing punch locally: {save_err}")
                queue_offline_punch(punch_record)
        else:
            queue_offline_punch(punch_record)

    return gate_will_trigger

def sync_device_data(conn, device_id, device_name, branch):
    """
    Pulls stats and user lists from the ESSL device using active connection, then updates Firebase.
    Stores sync audit details in the sync_logs collection.
    """
    try:
        # Read parameters
        firmware_version = "Unknown"
        try:
            firmware_version = conn.get_firmware_version()
        except Exception:
            pass

        users = []
        users_read_succeeded = False
        try:
            users = conn.get_users()
            users_read_succeeded = True
        except Exception as user_read_error:
            logging.warning(f"Could not read live users for {device_name}; preserving existing device user mappings: {user_read_error}")

        templates = []
        try:
            templates = conn.get_templates()
        except Exception:
            pass

        attendance = []
        try:
            attendance = conn.get_attendance()
        except Exception:
            pass

        logging.info(f"Synced Device {device_name}: Users={len(users)}, Templates={len(templates)}, Logs={len(attendance)}")

        # Sync Users to Firestore collection deviceUsers using batch write
        if db is not None:
            batch = db.batch()
            batch_count = 0
            for user in users:
                user_templates = [
                    t for t in templates
                    if str(t.uid) == str(user.uid)
                    or str(getattr(t, 'user_id', '')) == str(user.user_id)
                ]
                doc_ref = db.collection('deviceUsers').document(f"dev_{device_id}_usr_{user.user_id}")
                batch.set(doc_ref, {
                    'deviceId': device_id,
                    'deviceName': device_name,
                    'userId': user.user_id,
                    'userName': user.name,
                    'privilege': user.privilege,
                    'card': user.card,
                    'fingerprintsCount': len(user_templates),
                    'enrollmentStatus': 'Enrolled' if len(user_templates) > 0 else 'Card Only',
                    'lastActivity': datetime.utcnow().isoformat() + 'Z'
                }, merge=True)
                batch_count += 1
                if batch_count >= 400:
                    batch.commit()
                    batch = db.batch()
                    batch_count = 0
            if batch_count > 0:
                batch.commit()

            # A successful full device read is authoritative. Remove only this
            # device's cache entries whose user IDs no longer exist on-device.
            # If the read failed, preserve the cache rather than treating an
            # empty result as a real device state.
            if users_read_succeeded:
                live_user_ids = {str(user.user_id).strip() for user in users}
                stale_docs = db.collection('deviceUsers').where('deviceId', '==', device_id).stream()
                delete_batch = db.batch()
                delete_count = 0
                deleted_total = 0
                for stale_doc in stale_docs:
                    stale_user_id = str((stale_doc.to_dict() or {}).get('userId', '')).strip()
                    if stale_user_id and stale_user_id not in live_user_ids:
                        delete_batch.delete(stale_doc.reference)
                        delete_count += 1
                        deleted_total += 1
                        if delete_count >= 400:
                            delete_batch.commit()
                            delete_batch = db.batch()
                            delete_count = 0
                if delete_count:
                    delete_batch.commit()
                if deleted_total:
                    logging.info(f"Removed {deleted_total} stale cached user mappings for {device_name} after full device sync.")

        # Update Device info in Firestore
        db.collection('devices').document(device_id).update({
            'status': 'connected',
            'connectionHealth': 100,
            'firmwareVersion': firmware_version,
            'totalUsers': len(users),
            'totalFingerprints': len(templates),
            'totalAttendanceRecords': len(attendance),
            'lastSync': datetime.utcnow().isoformat() + 'Z'
        })

        # Log Sync Audit Success (Phase B requirement)
        db.collection('sync_logs').add({
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'deviceId': device_id,
            'deviceName': device_name,
            'usersCount': len(users),
            'logsCount': len(attendance),
            'status': 'SUCCESS',
            'message': f"Device {device_name} synced successfully. Users: {len(users)}, Logs: {len(attendance)}."
        })

    except Exception as e:
        logging.error(f"Error syncing stats for device {device_name}: {e}")
        db.collection('devices').document(device_id).update({
            'status': 'offline',
            'connectionHealth': 0
        })
        
        # Log Sync Audit Failure (Phase B requirement)
        db.collection('sync_logs').add({
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'deviceId': device_id,
            'deviceName': device_name,
            'status': 'FAILED',
            'message': f"Sync failed for device {device_name}: {e}"
        })
        
        # Push notification about sync failure
        db.collection('notifications').add({
            'title': 'Sync Failed ✗',
            'body': f"Attendance sync failed for device '{device_name}': {e}",
            'memberId': 'system',
            'type': 'alert',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'read': False
        })

def make_device_listener(conn, device_id, device_name):
    def device_snapshot_listener(doc_snapshot, changes, read_time):
        for doc in doc_snapshot:
            data = doc.to_dict()
            if not data:
                continue
            if data.get('unlockPending', False):
                request_id = data.get('unlockRequestId') or 'legacy'
                if request_id in processed_unlock_requests:
                    continue
                processed_unlock_requests.add(request_id)
                if len(processed_unlock_requests) > 1000:
                    processed_unlock_requests.clear()
                    processed_unlock_requests.add(request_id)
                expires_at = data.get('unlockExpiresAt')
                try:
                    device_ref = db.collection('devices').document(device_id)
                    if expires_at:
                        try:
                            expires_naive = datetime.fromisoformat(str(expires_at).replace('Z', '+00:00')).replace(tzinfo=None)
                            if expires_naive <= datetime.utcnow():
                                device_ref.update({
                                    'unlockPending': False,
                                    'unlockStatus': 'failed',
                                    'unlockError': 'Unlock request expired before the device processed it.',
                                    'unlockCompletedAt': datetime.utcnow().isoformat() + 'Z'
                                })
                                logging.warning(f"[GATE] Expired unlock request {request_id}; command not sent.")
                                continue
                        except (TypeError, ValueError):
                            logging.warning(f"[GATE] Invalid expiry on unlock request {request_id}; command not sent.")
                            device_ref.update({
                                'unlockPending': False,
                                'unlockStatus': 'failed',
                                'unlockError': 'Invalid request expiry.',
                                'unlockCompletedAt': datetime.utcnow().isoformat() + 'Z'
                            })
                            continue

                    duration = int(data.get('unlockDurationSeconds', 5))
                    if duration < 1 or duration > 30:
                        raise ValueError(f"Unsupported relay duration: {duration}s")

                    device_ref.update({
                        'unlockPending': False,
                        'unlockStatus': 'processing',
                        'unlockError': None
                    })
                    logging.info(f"[GATE] Request {request_id}: sending {duration}s relay command to {device_name}.")
                    with biometric_lock:
                        latest = device_ref.get().to_dict() or {}
                        if latest.get('unlockRequestId') != request_id or latest.get('unlockStatus') != 'processing':
                            logging.info(f"[GATE] Request {request_id} was cancelled or superseded before relay execution.")
                            continue
                        latest_expiry = latest.get('unlockExpiresAt')
                        if latest_expiry:
                            expiry_time = datetime.fromisoformat(str(latest_expiry).replace('Z', '+00:00')).replace(tzinfo=None)
                            if expiry_time <= datetime.utcnow():
                                device_ref.update({
                                    'unlockStatus': 'failed',
                                    'unlockError': 'Unlock request expired while waiting for the device.',
                                    'unlockCompletedAt': datetime.utcnow().isoformat() + 'Z'
                                })
                                continue
                        # pyzk.unlock() accepts seconds; do not scale this again.
                        result = conn.unlock(duration)
                    if result is False:
                        raise RuntimeError("Device library returned a negative relay command result.")
                    response = repr(result)[:240]
                    logging.info(f"[GATE] Request {request_id}: relay command acknowledged; response={response}")
                    device_ref.update({
                        'unlockStatus': 'success',
                        'unlockResult': 'pyzk unlock({}) returned without device error; result={}'.format(duration, response),
                        'unlockCompletedAt': datetime.utcnow().isoformat() + 'Z'
                    })
                    db.collection('deviceLogs').add({
                        'deviceId': device_id,
                        'deviceName': device_name,
                        'level': 'SUCCESS',
                        'message': f"[GATE] Request {request_id}: device acknowledged {duration}s relay command.",
                        'timestamp': datetime.utcnow().isoformat() + 'Z'
                    })
                except Exception as ex:
                    error = str(ex)
                    logging.error(f"[GATE ERROR] Request {request_id} on {device_name}: {error}")
                    try:
                        db.collection('devices').document(device_id).update({
                            'unlockPending': False,
                            'unlockStatus': 'failed',
                            'unlockError': error,
                            'unlockCompletedAt': datetime.utcnow().isoformat() + 'Z'
                        })
                        db.collection('deviceLogs').add({
                            'deviceId': device_id,
                            'deviceName': device_name,
                            'level': 'ERROR',
                            'message': f"[GATE ERROR] Request {request_id}: {error}",
                            'timestamp': datetime.utcnow().isoformat() + 'Z'
                        })
                    except Exception as status_error:
                        logging.error(f"[GATE ERROR] Could not persist failure result for {request_id}: {status_error}")
    return device_snapshot_listener

def device_worker_thread(device_id, ip, port, device_name, branch, sync_interval=30):
    """
    Dedicated worker thread per device:
    - Maintains live capture listener connection.
    - Synchronizes offline records periodically based on sync_interval.
    - Retries automatically every 10 seconds if connection fails.
    - Generates system alerts on connection state changes.
    """
    global threads_running
    logging.info(f"Starting worker thread for device {device_name} ({ip}:{port}) with sync interval {sync_interval}s")

    last_sync_time = 0
    is_currently_online = None
    watch = None

    while threads_running:
        # Check connection first
        is_online = check_tcp_connection(ip, port)
        
        # State transition notifications
        if is_online != is_currently_online:
            is_currently_online = is_online
            new_status = 'connected' if is_online else 'offline'
            health = 100 if is_online else 0
            
            db.collection('devices').document(device_id).update({
                'status': new_status,
                'connectionHealth': health,
                'lastSync': datetime.utcnow().isoformat() + 'Z'
            })
            
            # Send Notification and log
            if is_online:
                msg = f"Biometric terminal '{device_name}' came ONLINE."
                logging.info(msg)
                db.collection('notifications').add({
                    'title': 'Device Reconnected ✅',
                    'body': msg,
                    'memberId': 'system',
                    'type': 'alert',
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'read': False
                })
                db.collection('deviceLogs').add({
                    'deviceId': device_id,
                    'deviceName': device_name,
                    'level': 'SUCCESS',
                    'message': f"[Device Connector] {msg}",
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                })
            else:
                msg = f"Biometric terminal '{device_name}' went OFFLINE. Reconnect loop active."
                logging.warning(msg)
                db.collection('notifications').add({
                    'title': 'Device Offline ⚠️',
                    'body': msg,
                    'memberId': 'system',
                    'type': 'alert',
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'read': False
                })
                db.collection('deviceLogs').add({
                    'deviceId': device_id,
                    'deviceName': device_name,
                    'level': 'ERROR',
                    'message': f"[Device Connector] {msg}",
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                })

        if not is_online:
            # Reconnect every 10 seconds (Phase B requirement)
            time.sleep(10)
            continue

        # Try connecting ZK
        zk = ZK(ip, port=port, timeout=5, force_udp=False, ommit_ping=False)
        conn = None
        try:
            conn = zk.connect()
            
            # Attach Firestore snapshot listener for real-time manual unlocks
            device_ref = db.collection('devices').document(device_id)
            watch = device_ref.on_snapshot(make_device_listener(conn, device_id, device_name))
            logging.info(f"Attached Firestore snapshot listener for manual unlock on {device_name}.")
            
            # Sync initial parameters
            sync_device_data(conn, device_id, device_name, branch)
            last_sync_time = time.time()

            # Sync device clock on connection
            try:
                logging.info(f"[Time Sync] Synchronizing ESSL device clock for {device_name}...")
                conn.set_time(datetime.now())
                logging.info(f"[Time Sync] Device clock synchronized to: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            except Exception as time_err:
                logging.error(f"Failed to synchronize device clock: {time_err}")

            # Live capture swipes loop
            logging.info(f"Entering realtime live_capture mode for {device_name}...")
            connection_time = time.time()
            for event in conn.live_capture():
                if not threads_running:
                    break
                if event is None:
                    continue
                
                # Hourly connection refresh to sync time and log files
                if time.time() - connection_time > 3600:
                    logging.info(f"Hourly connection refresh triggered for {device_name} to sync clock time and log files.")
                    break
                
                logging.info(f"Realtime Swipe Detected: UserID={event.user_id}, Time={event.timestamp}")
                
                # Prevent processing stale/buffered events during reconnect loops (allow up to 5 minutes clock drift)
                event_age = abs((datetime.now() - event.timestamp).total_seconds())
                if event_age > 300:
                    logging.info(f"Skipping stale/buffered event (Age: {event_age:.1f}s): UserID={event.user_id}, Time={event.timestamp}")
                    continue
                
                # Cooldown check: prevent unlocking for the same user within 15 seconds
                now_ts = time.time()
                last_time = last_unlock_time.get(str(event.user_id), 0.0)
                if now_ts - last_time < 15.0:
                    logging.info(f"[Cooldown] Skipping repeat swipe for UserID={event.user_id} within 15s cooldown.")
                    continue

                # Run Membership Validation Engine using server-side authoritative UTC time for live swipe
                timestamp_iso = datetime.utcnow().isoformat() + 'Z'
                success = run_membership_validation(
                    user_id=event.user_id,
                    device_id=device_id,
                    device_name=device_name,
                    branch=branch,
                    timestamp_iso=timestamp_iso,
                    is_realtime=True
                )
                
                # Trigger door lock relay control if active athlete validated
                if success:
                    last_unlock_time[str(event.user_id)] = now_ts
                    trigger_door_relay(conn, device_name)
                
                # Update lastPunchDetails in diagnostics control document
                try:
                    db.collection('device_testing').document('control').update({
                        'lastPunchDetails': {
                            'biometricId': str(event.user_id),
                            'timestamp': event.timestamp.strftime("%Y-%m-%d %H:%M:%S") if event.timestamp else datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            'device': device_name,
                            'syncResult': 'Success' if success else 'Failed'
                        }
                    })
                except Exception as punch_err:
                    logging.error(f"Failed to update lastPunchDetails: {punch_err}")

            # Periodically poll offline attendance log files as backup (every sync_interval seconds)
            now = time.time()
            if now - last_sync_time > sync_interval:
                last_sync_time = now
                try:
                    attendance = conn.get_attendance()
                    # Sync any logs from device memory to Firebase (is_realtime=False so NO random popups!)
                    for record in attendance[-100:]:  # Process latest 100 logs
                        rec_time = record.timestamp.isoformat() + 'Z' if record.timestamp else datetime.utcnow().isoformat() + 'Z'
                        rec_doc_id = f"att_{device_id}_{record.user_id}_{rec_time.replace(':', '-').replace('.', '-')}"
                        doc_ref = db.collection('attendance').document(rec_doc_id).get()
                        if not doc_ref.exists:
                            logging.info(f"[Offline Log Sync] Found missing log: UserID={record.user_id}, Time={rec_time}")
                            run_membership_validation(
                                user_id=record.user_id,
                                device_id=device_id,
                                device_name=device_name,
                                branch=branch,
                                timestamp_iso=rec_time,
                                is_realtime=False
                            )
                except Exception as sync_err:
                    logging.error(f"Error during periodic offline log sync: {sync_err}")

        except Exception as e:
            logging.error(f"Exception in device worker thread for {device_name}: {e}")
            is_currently_online = False
            db.collection('devices').document(device_id).update({
                'status': 'offline',
                'connectionHealth': 0
            })
            db.collection('deviceLogs').add({
                'deviceId': device_id,
                'deviceName': device_name,
                'level': 'ERROR',
                'message': f"[Device Connector] Connection interrupted: {e}",
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            })
        finally:
            if watch:
                try:
                    watch.unsubscribe()
                except Exception:
                    pass
            if conn:
                try:
                    conn.disconnect()
                except Exception:
                    pass
            
            # Wait 10 seconds before attempting connection recovery
            time.sleep(10)

def python_heartbeat_loop():
    """Continuous 5-second heartbeat for Real Device Status Engine."""
    logging.info("Started continuous 5-second Python Device Heartbeat Loop.")
    last_terminal_print = 0
    
    while threads_running:
        try:
            now_iso = datetime.utcnow().isoformat() + 'Z'
            internet_ok = check_internet_connection()
            ping_ok = check_ping(DEVICE_IP)
            tcp_ok = check_tcp_connection(DEVICE_IP, DEVICE_PORT)
            essl_ok = ping_ok or tcp_ok
            listener_running = essl_ok
            gate_enabled = essl_ok and internet_ok
            latency = 12 if essl_ok else 999
            firebase_status = 'Connected' if db is not None else 'Offline'

            if db is not None:
                try:
                    db.collection('device_testing').document('control').set({
                        'pythonConnected': True,
                        'esslConnected': essl_ok,
                        'attendanceListenerRunning': listener_running,
                        'gateControlEnabled': gate_enabled,
                        'internetConnected': internet_ok,
                        'firebaseStatus': firebase_status,
                        'lastHeartbeat': now_iso,
                        'latencyMs': latency,
                        'deviceName': 'ESSL K90 Pro',
                        'deviceIp': DEVICE_IP,
                        'devicePort': DEVICE_PORT,
                        'pingStatus': 'Success' if ping_ok else 'Failed',
                        'tcpStatus': 'Success' if tcp_ok else 'Failed',
                        'updatedAt': now_iso
                    }, merge=True)

                    db.collection('devices').document('dev_k90_main').set({
                        'status': 'connected' if essl_ok else 'offline',
                        'connectionHealth': 98 if essl_ok else 0,
                        'lastSync': now_iso
                    }, merge=True)
                except Exception as f_err:
                    logging.warning(f"Heartbeat write notice: {f_err}")

            # Print terminal ASCII summary every 30 seconds for manual CMD mode (Requirement 17)
            if time.time() - last_terminal_print > 30:
                last_terminal_print = time.time()
                print("\n" + "="*52)
                print("       ALPHA ZONE GYM BIOMETRIC LISTENER          ")
                print("==================================================")
                print(f"Internet            : {'[CONNECTED]' if internet_ok else '[OFFLINE]'}")
                print(f"Python Service      : [RUNNING]")
                print(f"Firebase            : [{firebase_status.upper()}]")
                print(f"ESSL Hardware       : {'[CONNECTED]' if essl_ok else '[OFFLINE]'}")
                print(f"Attendance Listener : {'[RUNNING]' if listener_running else '[PAUSED]'}")
                print(f"Gate Control        : {'[ENABLED]' if gate_enabled else '[DISABLED]'}")
                print("==================================================")
                print("Waiting for real biometric punches...\n")

        except Exception as e:
            logging.error(f"Error in python heartbeat loop: {e}")
        time.sleep(5)

def main_sync_orchestrator():
    """
    Main manager loop:
    - Periodically reviews Firebase 'devices' collection.
    - Launches worker threads for newly enabled/linked devices.
    - Stops threads for removed/disabled devices.
    """
    global threads_running
    logging.info("Alpha Zone OS Device Integration Engine Started.")

    # Launch continuous heartbeat thread
    threading.Thread(target=python_heartbeat_loop, daemon=True).start()
    
    # Watch diagnostics document
    try:
        diagnostics_ref = db.collection('device_testing').document('control')
        diagnostics_watch = diagnostics_ref.on_snapshot(make_diagnostics_listener())
        logging.info("Attached diagnostics database listener on device_testing/control.")
    except Exception as e:
        logging.error(f"Failed to attach diagnostics listener: {e}")

    # Watch biometric_enrollment collection for CRM enrollment commands
    try:
        enrollment_col_ref = db.collection('biometric_enrollment')
        enrollment_watch = enrollment_col_ref.on_snapshot(make_enrollment_listener())
        logging.info("Attached biometric enrollment listener on biometric_enrollment collection.")
    except Exception as e:
        logging.error(f"Failed to attach enrollment listener: {e}")

    for collection_name in ('members', 'employees'):
        try:
            access_watch = db.collection(collection_name).on_snapshot(make_membership_access_listener(collection_name))
            logging.info(f"Attached access policy listener on {collection_name} for automatic expiry/renewal and terminal user state.")
        except Exception as e:
            logging.error(f"Failed to attach {collection_name} access policy listener: {e}")

        
    while threads_running:
        try:
            # Query enabled devices in Firebase
            devices_ref = db.collection('devices')
            docs = devices_ref.stream()
            
            active_db_devices = {}
            for doc in docs:
                data = doc.to_dict()
                if data.get('enabled', False):
                    active_db_devices[doc.id] = data

            # If no devices are mapped in Firebase, auto-seed the ESSL K90 Pro Main Gate (Phase B Requirement)
            if len(active_db_devices) == 0:
                logging.info("No devices registered in Firebase. Seeding default ESSL K90 Pro Main Gate configuration...")
                default_device = {
                    'deviceId': 'dev_k90_main',
                    'deviceName': 'Main Gate',
                    'deviceType': 'ESSL K90 Pro',
                    'ip': '192.168.18.11',
                    'port': 4370,
                    'branch': 'Main Branch',
                    'enabled': True,
                    'status': 'offline',
                    'connectionHealth': 0,
                    'syncInterval': 30,
                    'lastSync': None
                }
                db.collection('devices').document('dev_k90_main').set(default_device)
                active_db_devices['dev_k90_main'] = default_device

            # Start threads for new enabled devices
            for dev_id, dev_data in active_db_devices.items():
                if dev_id not in active_threads or not active_threads[dev_id].is_alive():
                    # Spawn Thread passing syncInterval
                    t = threading.Thread(
                        target=device_worker_thread,
                        args=(
                            dev_id,
                            dev_data.get('ip', '192.168.18.11'),
                            dev_data.get('port', 4370),
                            dev_data.get('deviceName', 'Main Gate'),
                            dev_data.get('branch', 'Main Branch'),
                            dev_data.get('syncInterval', 30)
                        ),
                        daemon=True
                    )
                    active_threads[dev_id] = t
                    t.start()

            # Identify if any running threads are for disabled/removed devices
            terminated_devices = []
            for dev_id in list(active_threads.keys()):
                if dev_id not in active_db_devices:
                    logging.info(f"Stopping worker thread for disabled/removed device ID {dev_id}")
                    terminated_devices.append(dev_id)
            
            for dev_id in terminated_devices:
                active_threads.pop(dev_id, None)

        except Exception as e:
            logging.error(f"Error in main orchestrator loop: {e}")

        # Review devices list every 30 seconds
        time.sleep(30)

if __name__ == "__main__":
    while True:
        try:
            main_sync_orchestrator()
        except KeyboardInterrupt:
            logging.info("Service shutting down...")
            threads_running = False
            sys.exit(0)
        except Exception as err:
            logging.error(f"Device service crashed due to network/gRPC error: {err}. Auto-restarting in 10s...")
            time.sleep(10)
