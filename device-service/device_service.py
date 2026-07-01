import os
import sys
import time
import socket
import logging
from datetime import datetime, date, timedelta
import threading
import subprocess
import platform
from zk import ZK, const
from zk.exception import ZKError
import firebase_admin
from firebase_admin import credentials, firestore

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(r"C:\Users\defaultuser\Desktop\alpha gym zone\device-service\alpha_zone_device_service.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

# Firebase Init
SERVICE_ACCOUNT_PATH = r"C:\Users\defaultuser\Desktop\alpha gym zone\backend\serviceAccountKey.json"
try:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    logging.info("Firebase Admin SDK initialized successfully in Python Device Service.")
except Exception as e:
    logging.error(f"Failed to initialize Firebase Admin: {e}")
    sys.exit(1)

# Active devices threads tracker
active_threads = {}
threads_running = True
biometric_lock = threading.Lock()

# Cooldown tracker to prevent duplicate unlocks (UserID -> last_unlock_epoch)
last_unlock_time = {}


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

DEVICE_IP = "192.168.18.11"
DEVICE_PORT = 4370

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

def run_enroll_fingerprint(enrollment_doc_id, member_id, member_name, biometric_uid, finger_index=0):
    """
    Enrolls a fingerprint on the ESSL K90 Pro device.
    - biometric_uid: integer user slot on the device (1-65535)
    - finger_index: finger template index (0=Right Thumb, 1=Right Index, ..., 9=Left Little)
    - Updates Firestore enrollment doc in real-time with scan progress.
    """
    enroll_ref = db.collection('biometric_enrollment').document(enrollment_doc_id)
    member_ref = db.collection('members').document(member_id)
    profile_ref = db.collection('biometric_profiles').document(member_id)

    def push_status(status, message, extra=None):
        payload = {
            'status': status,
            'message': message,
            'updatedAt': datetime.utcnow().isoformat() + 'Z'
        }
        if extra:
            payload.update(extra)
        enroll_ref.update(payload)

    with biometric_lock:
        try:
            push_status('connecting', 'Connecting to ESSL K90 Pro...', {'scan': 0, 'totalScans': 3})
            logging.info(f"[Enrollment] Starting fingerprint enrollment for {member_name} (biometric UID: {biometric_uid})")

            zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=15)
            conn = zk.connect()

            # Ensure user slot exists on device before starting enrollment (pyzk enroll_user requires this)
            try:
                users = conn.get_users()
                slot_exists = any(str(u.user_id) == str(biometric_uid) for u in users)
            except Exception as e:
                logging.error(f"[Enrollment] Error fetching users from device: {e}")
                slot_exists = False

            if not slot_exists:
                logging.info(f"[Enrollment] Creating user slot {biometric_uid} on device for {member_name}")
                conn.set_user(
                    uid=int(biometric_uid),
                    name=member_name[:24].strip(),
                    privilege=0,
                    password='',
                    group_id='',
                    user_id=str(biometric_uid)
                )

            push_status('ready', 'Device ready. Place finger on sensor...', {'scan': 0})

            # Cancel any existing enrollment first
            try:
                conn.cancel_capture()
            except Exception:
                pass

            # Start enrollment — device will wait for 3 scans
            # pyzk enroll_user: uid is the device user slot, temp_id is finger index
            push_status('scanning', 'Scan 1/3 — Place finger on sensor', {'scan': 1})
            logging.info(f"[Enrollment] Calling enroll_user(uid={biometric_uid}, temp_id={finger_index}, user_id={biometric_uid})")

            try:
                # Pass user_id explicitly so pyzk doesn't try to look up non-existing user or fail
                result = conn.enroll_user(uid=int(biometric_uid), temp_id=int(finger_index), user_id=str(biometric_uid))
                if result:
                    push_status('scanning', 'Scan 2/3 — Lift and place again', {'scan': 2})
                    time.sleep(0.5)
                    push_status('scanning', 'Scan 3/3 — Final scan...', {'scan': 3})
                    time.sleep(0.5)
                else:
                    logging.warning(f"[Enrollment] enroll_user returned False")
            except Exception as enroll_ex:
                # Some firmware versions raise exception on enrollment — check if user was saved
                logging.warning(f"[Enrollment] enroll_ex: {enroll_ex} — checking templates list...")
                result = None

            # Verify the fingerprint was enrolled by reading templates
            has_template = False
            try:
                templates = conn.get_templates()
                for t in templates:
                    if int(t.uid) == int(biometric_uid) and int(t.fid) == int(finger_index):
                        has_template = True
                        break
            except Exception as e:
                logging.error(f"[Enrollment] Error fetching templates to verify: {e}")
                has_template = False

            conn.disconnect()

            # Treat as success if result was explicitly True OR the template exists on the device
            if result is True or has_template:
                # SUCCESS — update Firebase
                now_iso = datetime.utcnow().isoformat() + 'Z'
                push_status('success', f'Fingerprint enrolled! Biometric ID: {biometric_uid}', {
                    'scan': 3, 'biometricId': str(biometric_uid), 'completedAt': now_iso
                })
                logging.info(f"[Enrollment] SUCCESS for {member_name} — biometric UID {biometric_uid}")

                # Update member document
                member_ref.update({
                    'biometricId': str(biometric_uid),
                    'biometricEnrolled': True,
                    'fingerprintStatus': 'enrolled',
                    'lastBiometricSync': now_iso
                })

                # Write / update biometric_profiles
                profile_data = {
                    'memberId': member_id,
                    'memberName': member_name,
                    'biometricId': str(biometric_uid),
                    'fingerIndex': int(finger_index),
                    'fingerprintStatus': 'enrolled',
                    'faceStatus': 'not_enrolled',
                    'enrollmentDate': now_iso,
                    'deviceName': 'ESSL K90 Pro',
                    'deviceIp': DEVICE_IP,
                    'devicePort': DEVICE_PORT,
                    'lastSync': now_iso,
                    'enrolledBy': 'CRM Admin'
                }
                profile_ref.set(profile_data, merge=True)

                # Notification
                db.collection('notifications').add({
                    'title': '✅ Biometric Enrollment Successful',
                    'body': f'{member_name} fingerprint registered. Biometric ID: {biometric_uid}',
                    'memberId': member_id,
                    'type': 'enrollment',
                    'timestamp': now_iso,
                    'read': False
                })
            else:
                raise Exception("Fingerprint template not found on device after enrollment attempt. Try again.")

        except Exception as e:
            err_msg = str(e)
            logging.error(f"[Enrollment] FAILED for {member_name}: {err_msg}")
            push_status('failed', f'Enrollment failed: {err_msg}', {'scan': 0})
            db.collection('notifications').add({
                'title': '❌ Enrollment Failed',
                'body': f'{member_name} fingerprint enrollment failed: {err_msg}',
                'memberId': member_id,
                'type': 'enrollment_error',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'read': False
            })


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

            if command == 'enroll_fingerprint':
                logging.info(f"[Enrollment Listener] Fingerprint enrollment triggered for {member_name}")
                threading.Thread(
                    target=run_enroll_fingerprint,
                    args=(doc_id, member_id, member_name, biometric_uid, finger_index),
                    daemon=True
                ).start()

            elif command == 'delete_biometric':
                logging.info(f"[Enrollment Listener] Delete biometric triggered for {member_name}")
                threading.Thread(
                    target=run_delete_biometric,
                    args=(doc_id, member_id, member_name, biometric_uid),
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


def trigger_door_relay(conn, device_name, duration_seconds=5):
    """
    Relay control - unlocks the turnstile gate relay for the given duration.
    Triggered automatically when a valid active member punches biometric.
    """
    logging.info(f"[Relay Control] Sending unlock command to {device_name}. Duration: {duration_seconds}s.")
    try:
        conn.unlock(duration_seconds * 10)  # ZK Protocol: duration in 100ms units (50 = 5s)
        logging.info(f"[Relay Control] Gate unlocked successfully on {device_name} for {duration_seconds} seconds.")
        
        # Log successful unlock to Firestore
        db.collection('deviceLogs').add({
            'deviceId': 'dev_k90_main',
            'deviceName': device_name,
            'level': 'SUCCESS',
            'message': f'[Gate Control] Auto-unlock executed on {device_name}. Gate opened for {duration_seconds}s.',
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        })
    except Exception as e:
        logging.error(f"[Relay Control] Failed to send unlock signal to {device_name}: {e}")
        db.collection('deviceLogs').add({
            'deviceId': 'dev_k90_main',
            'deviceName': device_name,
            'level': 'ERROR',
            'message': f'[Gate Control] Unlock FAILED on {device_name}: {e}',
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        })

def run_membership_validation(user_id, device_id, device_name, branch, timestamp_iso):
    """
    Validates a biometric card/fingerprint swipe and writes results directly to Firestore.
    Verifies that the member is active and hasn't expired.
    """
    try:
        # 1. Look up the member matching the biometric ID or Device User ID
        members_ref = db.collection('members')
        member_doc = None
        
        # Check deviceUserId (string)
        query = members_ref.where('deviceUserId', '==', str(user_id)).limit(1).stream()
        for doc in query:
            member_doc = doc
            break
            
        if not member_doc:
            # Check biometricId (string)
            query = members_ref.where('biometricId', '==', str(user_id)).limit(1).stream()
            for doc in query:
                member_doc = doc
                break
                
        if not member_doc:
            # Try parsing as integer fallback for deviceUserId
            try:
                query_int = members_ref.where('deviceUserId', '==', int(user_id)).limit(1).stream()
                for doc in query_int:
                    member_doc = doc
                    break
            except ValueError:
                pass

        if not member_doc:
            # Try parsing as integer fallback for biometricId
            try:
                query_int = members_ref.where('biometricId', '==', int(user_id)).limit(1).stream()
                for doc in query_int:
                    member_doc = doc
                    break
            except ValueError:
                pass

        if not member_doc:
            # Unknown user on device - Access Denied!
            msg = f"[Membership Validation] Rejected access for unknown biometric ID: {user_id} at {device_name}."
            logging.warning(msg)
            
            db.collection('deviceLogs').add({
                'deviceId': device_id,
                'deviceName': device_name,
                'level': 'WARNING',
                'message': msg,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            })
            
            db.collection('accessLogs').add({
                'memberId': f"unknown_biometric_{user_id}",
                'memberName': "Unknown User",
                'timestamp': timestamp_iso,
                'branch': branch,
                'device': device_name,
                'granted': False,
                'reason': "Unknown Biometric ID mapping",
                'createdAt': datetime.utcnow().isoformat() + 'Z'
            })

            # Also write to attendance collection so it displays on the CRM dashboard in real-time
            att_doc_id = f"att_{device_id}_{user_id}_{timestamp_iso.replace(':', '-').replace('.', '-')}"
            db.collection('attendance').document(att_doc_id).set({
                'attendanceId': att_doc_id,
                'memberId': f"unknown_biometric_{user_id}",
                'biometricId': str(user_id),
                'deviceUserId': str(user_id),
                'memberName': f"Unknown User",
                'memberCode': f"ID {user_id}",
                'avatarUrl': f"https://api.dicebear.com/7.x/adventurer/svg?seed={user_id}",
                'deviceId': device_id,
                'deviceName': device_name,
                'branch': branch,
                'timestamp': timestamp_iso,
                'checkIn': timestamp_iso,
                'checkOut': None,
                'status': 'denied',
                'granted': False,
                'reason': "Unknown Biometric ID mapping",
                'membership': "No Plan",
                'trainer': "No Coach",
                'createdAt': datetime.utcnow().isoformat() + 'Z'
            })

            # Also write unknown punch to attendance_logs for Live Feed popup
            db.collection('attendance_logs').document(att_doc_id).set({
                'memberId': f"unknown_biometric_{user_id}",
                'memberName': f"Unknown User",
                'branch': branch,
                'checkIn': timestamp_iso,
                'method': 'biometric',
                'status': 'unknown',
                'reason': "Unknown Biometric ID",
                'createdAt': datetime.utcnow().isoformat() + 'Z'
            })

            return False

        member = member_doc.to_dict()
        member_db_id = member_doc.id
        member_name = member.get('name', 'Unknown')
        member_code = member.get('memberId', 'N/A')
        membership_plan = member.get('plan', 'Monthly')
        avatar_url = member.get('avatar', '') or member.get('avatarUrl', '')
        if not avatar_url:
            avatar_url = f"https://api.dicebear.com/7.x/adventurer/svg?seed={member_name.replace(' ', '')}"
            
        # Parse timestamp_iso to datetime object for Firestore Timestamp checkIn
        try:
            dt_str = timestamp_iso.rstrip('Z')
            checkin_dt = datetime.fromisoformat(dt_str)
        except Exception:
            checkin_dt = datetime.utcnow()

        # Check membership validation parameters
        status = member.get('status', 'active')
        expiry_date_str = member.get('expiryDate', '')
        
        is_expired = False
        today_str = date.today().isoformat()
        
        if expiry_date_str and expiry_date_str < today_str:
            is_expired = True

        if status == 'expired' or is_expired:
            granted = False
            reason = "Membership Expired"
        elif status == 'frozen':
            granted = False
            reason = "Membership Frozen"
        elif status == 'inactive':
            granted = False
            reason = "Membership Inactive"
        else:
            granted = True
            reason = "Attendance Synced"

        # 5. Process Validation Output
        if granted:
            success_msg = f"[Membership Validation] Access Granted: Athlete {member_name} ({member_code}) authenticated. Active Plan."
            logging.info(success_msg)

            # Write Success Log
            db.collection('deviceLogs').add({
                'deviceId': device_id,
                'deviceName': device_name,
                'level': 'SUCCESS',
                'message': success_msg,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            })

            # Check for double check-in today to avoid duplicate streaks
            now_date = date.today()
            today_str = now_date.isoformat()
            attendance_ref = db.collection('attendance')
            duplicates = attendance_ref.where('memberId', '==', member_db_id).where('status', '==', 'granted').stream()
            already_checked_in = False
            for doc in duplicates:
                chk_in = doc.to_dict().get('checkIn', '')
                if chk_in.startswith(today_str):
                    already_checked_in = True
                    break

            # Deterministic document ID to prevent duplicate logs
            att_doc_id = f"att_{device_id}_{user_id}_{timestamp_iso.replace(':', '-').replace('.', '-')}"

            if not already_checked_in:
                # Add attendance checkin record (Store required Phase B fields)
                db.collection('attendance').document(att_doc_id).set({
                    'attendanceId': att_doc_id,
                    'memberId': member_db_id,
                    'biometricId': member.get('biometricId', ''),
                    'deviceUserId': member.get('deviceUserId', ''),
                    'memberName': member_name,
                    'memberCode': member_code,
                    'avatarUrl': avatar_url,
                    'deviceId': device_id,
                    'deviceName': device_name,
                    'branch': branch,
                    'timestamp': timestamp_iso,
                    'checkIn': timestamp_iso,
                    'checkOut': None,
                    'status': 'granted',
                    'method': 'biometric',
                    'membership': membership_plan,
                    'createdAt': datetime.utcnow().isoformat() + 'Z'
                })

                # Also write to attendance_logs for the Frontend Live Feed Popup
                db.collection('attendance_logs').document(att_doc_id).set({
                    'memberId': member_db_id,
                    'memberName': member_name,
                    'branch': branch,
                    'checkIn': timestamp_iso,
                    'method': 'biometric',
                    'status': 'granted',
                    'createdAt': datetime.utcnow().isoformat() + 'Z'
                })

                # Update gym_presence for 'Members Inside'
                expected_exit = (datetime.utcnow() + timedelta(hours=2)).isoformat() + 'Z'
                db.collection('gym_presence').document(member_db_id).set({
                    'memberId': member_db_id,
                    'memberName': member_name,
                    'branch': branch,
                    'avatarUrl': avatar_url,
                    'inside': True,
                    'entryTime': timestamp_iso,
                    'expectedExit': expected_exit,
                    'lastPunch': timestamp_iso
                }, merge=True)


                # Increment attendance streak/counts on member document (matching CRM and Flutter App formats)
                member_doc_ref = db.collection('members').document(member_db_id)
                member_doc_ref.update({
                    'attendanceCount': firestore.Increment(1),
                    'streak': firestore.Increment(1),
                    'attendanceStreak': firestore.Increment(1),
                    'lastActive': timestamp_iso
                })
                
                # Push checkin notification trigger
                db.collection('notifications').add({
                    'title': 'Check-In Recorded ⚡',
                    'body': f'Welcome back to Alpha Zone, {member_name}! Streak incremented.',
                    'memberId': member_db_id,
                    'type': 'checkin',
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'read': False
                })
            else:
                # Only write an entry tap without incrementing stats
                db.collection('attendance').document(att_doc_id).set({
                    'attendanceId': att_doc_id,
                    'memberId': member_db_id,
                    'biometricId': member.get('biometricId', ''),
                    'deviceUserId': member.get('deviceUserId', ''),
                    'memberName': member_name,
                    'memberCode': member_code,
                    'avatarUrl': avatar_url,
                    'deviceId': device_id,
                    'deviceName': device_name,
                    'branch': branch,
                    'timestamp': timestamp_iso,
                    'checkIn': timestamp_iso,
                    'checkOut': None,
                    'status': 'granted',
                    'method': 'biometric',
                    'membership': membership_plan,
                    'createdAt': datetime.utcnow().isoformat() + 'Z'
                })

                # Also write duplicate tap to attendance_logs
                db.collection('attendance_logs').document(att_doc_id).set({
                    'memberId': member_db_id,
                    'memberName': member_name,
                    'branch': branch,
                    'checkIn': timestamp_iso,
                    'method': 'biometric',
                    'status': 'duplicate',
                    'createdAt': datetime.utcnow().isoformat() + 'Z'
                })

                # Update gym_presence lastPunch
                db.collection('gym_presence').document(member_db_id).set({
                    'lastPunch': timestamp_iso,
                    'inside': True
                }, merge=True)

                logging.info(f"[Sync Service] Member {member_name} already checked in today. Registered access tap only.")

            # Record in Access Logs
            db.collection('accessLogs').add({
                'memberId': member_db_id,
                'memberName': member_name,
                'timestamp': timestamp_iso,
                'branch': branch,
                'device': device_name,
                'granted': True,
                'reason': reason,
                'createdAt': datetime.utcnow().isoformat() + 'Z'
            })

            # Update Door status last activity
            db.collection('doorStatus').document(device_id).set({
                'doorId': device_id,
                'doorName': f"{device_name} Lock",
                'status': 'locked',
                'lastOpen': timestamp_iso,
                'lastUser': member_name,
                'lastEvent': 'Access Granted'
            }, merge=True)

            return True
        else:
            denied_msg = f"[Membership Validation] Access Denied: Athlete {member_name} ({member_code}) rejected. Reason: {reason}."
            logging.warning(denied_msg)
            
            # Write Denied Log
            db.collection('deviceLogs').add({
                'deviceId': device_id,
                'deviceName': device_name,
                'level': 'ERROR',
                'message': denied_msg,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            })
            
            # Write denied check-in log
            att_doc_id = f"att_{device_id}_{user_id}_{timestamp_iso.replace(':', '-').replace('.', '-')}"
            db.collection('attendance').document(att_doc_id).set({
                'attendanceId': att_doc_id,
                'memberId': member_db_id,
                'biometricId': member.get('biometricId', ''),
                'deviceUserId': member.get('deviceUserId', ''),
                'memberName': member_name,
                'memberCode': member_code,
                'avatarUrl': avatar_url,
                'deviceId': device_id,
                'deviceName': device_name,
                'branch': branch,
                'timestamp': timestamp_iso,
                'checkIn': timestamp_iso,
                'checkOut': None,
                'status': 'denied',
                'granted': False,
                'reason': reason,
                'membership': membership_plan,
                'trainer': member.get('trainer', 'No PT Assigned'),
                'createdAt': datetime.utcnow().isoformat() + 'Z'
            })
            
            # Also write denied punch to attendance_logs for Live Feed popup
            db.collection('attendance_logs').document(att_doc_id).set({
                'memberId': member_db_id,
                'memberName': member_name,
                'branch': branch,
                'checkIn': timestamp_iso,
                'method': 'biometric',
                'status': 'denied',
                'reason': reason,
                'createdAt': datetime.utcnow().isoformat() + 'Z'
            })

            
            # Record in Access Logs
            db.collection('accessLogs').add({
                'memberId': member_db_id,
                'memberName': member_name,
                'timestamp': timestamp_iso,
                'branch': branch,
                'device': device_name,
                'granted': False,
                'reason': reason,
                'createdAt': datetime.utcnow().isoformat() + 'Z'
            })
            
            return False

    except Exception as err:
        logging.error(f"Error in Membership Validation: {err}")
        return False

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
        try:
            users = conn.get_users()
        except Exception:
            pass

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

        # Sync Users to Firestore collection deviceUsers
        for user in users:
            # Find matching templates for this user to count fingerprints
            user_templates = [t for t in templates if str(t.uid) == str(user.user_id)]
            
            db.collection('deviceUsers').document(f"dev_{device_id}_usr_{user.user_id}").set({
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
                # Reset the flag in Firestore first
                try:
                    db.collection('devices').document(device_id).update({
                        'unlockPending': False
                    })
                    logging.info(f"[Firestore Trigger] Manual unlock requested for {device_name}. Sending unlock signal...")
                    conn.unlock(50)  # 50 = 5 seconds
                    logging.info(f"[Firestore Trigger] Unlock signal sent successfully to {device_name}.")
                    
                    # Add device control success log
                    db.collection('deviceLogs').add({
                        'deviceId': device_id,
                        'deviceName': device_name,
                        'level': 'SUCCESS',
                        'message': f"[Device Control] Manual gate unlock executed successfully on {device_name}.",
                        'timestamp': datetime.utcnow().isoformat() + 'Z'
                    })
                except Exception as ex:
                    logging.error(f"Failed to execute manual unlock on {device_name}: {ex}")
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
                
                # Prevent processing stale/buffered events during reconnect loops
                event_age = abs((datetime.now() - event.timestamp).total_seconds())
                if event_age > 15:
                    logging.info(f"Skipping stale/buffered event (Age: {event_age:.1f}s): UserID={event.user_id}, Time={event.timestamp}")
                    continue
                
                # Cooldown check: prevent unlocking for the same user within 15 seconds
                now_ts = time.time()
                last_time = last_unlock_time.get(str(event.user_id), 0.0)
                if now_ts - last_time < 15.0:
                    logging.info(f"[Cooldown] Skipping repeat swipe for UserID={event.user_id} within 15s cooldown.")
                    continue

                # Run Membership Validation Engine using server-side authoritative UTC time
                timestamp_iso = datetime.utcnow().isoformat() + 'Z'
                success = run_membership_validation(
                    user_id=event.user_id,
                    device_id=device_id,
                    device_name=device_name,
                    branch=branch,
                    timestamp_iso=timestamp_iso
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
                    # Sync any logs from device memory to Firebase
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
                                timestamp_iso=rec_time
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

def main_sync_orchestrator():
    """
    Main manager loop:
    - Periodically reviews Firebase 'devices' collection.
    - Launches worker threads for newly enabled/linked devices.
    - Stops threads for removed/disabled devices.
    """
    global threads_running
    logging.info("Alpha Zone OS Device Integration Engine Started.")
    
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
    try:
        main_sync_orchestrator()
    except KeyboardInterrupt:
        logging.info("Service shutting down...")
        threads_running = False
        sys.exit(0)
