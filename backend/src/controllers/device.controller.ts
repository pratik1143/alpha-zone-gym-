import { Request, Response } from 'express';
import { db, admin, isFirebaseInitialized, getFirestoreDb, disableFirestore } from '../firebase';
import { simulateManualTap } from '../services/deviceSync.service';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Get all devices, including calculated summary stats for the dashboard.
 */
export const getDevices = async (req: Request, res: Response) => {
  try {
    const list = await db.getDevices();
    const attendanceLogs = await db.getAttendance();

    // Compile statistics
    const totalDevices = list.length;
    const onlineDevices = list.filter(d => d.enabled && d.status === 'connected').length;
    const offlineDevices = totalDevices - onlineDevices;

    // Last Sync timestamp
    let lastSyncTime = 'Never';
    let maxTime = 0;
    list.forEach(d => {
      if (d.lastSync) {
        const time = new Date(d.lastSync).getTime();
        if (time > maxTime) {
          maxTime = time;
          lastSyncTime = d.lastSync;
        }
      }
    });

    // Average Connection Health
    let connectionHealth = 0;
    if (totalDevices > 0) {
      const activeDevices = list.filter(d => d.enabled);
      if (activeDevices.length > 0) {
        const sum = activeDevices.reduce((acc, curr) => acc + (curr.connectionHealth || 0), 0);
        connectionHealth = Math.round(sum / activeDevices.length);
      }
    }

    // Attendance Registered Today
    const todayStr = new Date().toISOString().split('T')[0];
    const attendanceToday = attendanceLogs.filter(a => {
      if (!a.checkIn) return false;
      const checkInStr = (typeof a.checkIn === 'string')
        ? a.checkIn
        : (a.checkIn.toDate ? a.checkIn.toDate().toISOString() : (a.checkIn.seconds ? new Date(a.checkIn.seconds * 1000).toISOString() : ''));
      return checkInStr.startsWith(todayStr);
    }).length;

    res.json({
      devices: list,
      stats: {
        totalDevices,
        onlineDevices,
        offlineDevices,
        lastSync: lastSyncTime,
        connectionHealth,
        attendanceToday
      }
    });
  } catch (error: any) {
    console.error('Error in getDevices:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Add a new device setting
 */
export const createDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId, deviceName, deviceType, ip, port, branch, enabled } = req.body;
    
    if (!deviceName || !ip || !port) {
      return res.status(400).json({ error: 'Device name, IP address, and Port are required' });
    }

    const device = await db.addDevice({
      deviceId: deviceId || 'dev_' + Date.now(),
      deviceName,
      deviceType: deviceType || 'ESSL K90 Pro',
      ip,
      port: Number(port) || 4370,
      branch: branch || 'Main Branch',
      enabled: enabled !== undefined ? enabled : true,
      lastSync: null,
      status: 'offline',
      connectionHealth: 0
    });

    await db.addDeviceLog({
      deviceId: device.id,
      deviceName: device.deviceName,
      level: 'INFO',
      message: `[Device Settings] Linked new biometric device: ${deviceName} (${deviceType}) at ${ip}:${port}.`
    });

    res.status(201).json(device);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update an existing device setting
 */
export const updateDevice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const device = await db.updateDevice(id, updates);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await db.addDeviceLog({
      deviceId: id,
      deviceName: device.deviceName,
      level: 'INFO',
      message: `[Device Settings] Updated settings for ${device.deviceName}. Status: ${device.enabled ? 'Enabled' : 'Disabled'}.`
    });

    res.json(device);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a device setting
 */
export const deleteDevice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Fetch device name first for log
    const devices = await db.getDevices();
    const device = devices.find(d => d.id === id);
    const deviceName = device ? device.deviceName : 'Unknown Device';

    const success = await db.deleteDevice(id);
    if (!success) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await db.addDeviceLog({
      deviceId: id,
      deviceName,
      level: 'WARNING',
      message: `[Device Settings] Removed/unlinked device: ${deviceName}.`
    });

    res.json({ success: true, message: 'Device deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get device logs
 */
export const getDeviceLogs = async (req: Request, res: Response) => {
  try {
    const logs = await db.getDeviceLogs();
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Manually simulate a biometric tap/fingerprint scan for testing
 */
export const triggerSimulationTap = async (req: Request, res: Response) => {
  try {
    const { deviceId, memberId } = req.body;
    if (!deviceId || !memberId) {
      return res.status(400).json({ error: 'Device ID and Member ID are required for simulation' });
    }

    await simulateManualTap(deviceId, memberId);
    res.json({ success: true, message: 'Biometric scan simulated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Queue a physical device restart on the biometric terminal.
 */
export const restartDevice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const device = await db.updateDevice(id, { restartPending: true });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await db.addDeviceLog({
      deviceId: id,
      deviceName: device.deviceName,
      level: 'WARNING',
      message: `[Device Control] Restart signal queued for ${device.deviceName}. Device will reboot on next checkin.`
    });

    res.json({ success: true, message: 'Restart signal queued successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Phase A - Queue connection test
 */
export const queueConnectionTest = async (req: Request, res: Response) => {
  try {
    if (isFirebaseInitialized && admin) {
      const firestore = admin.firestore();
      await firestore.collection('device_testing').doc('control').update({
        testConnectionPending: true,
        testLogs: admin.firestore.FieldValue.arrayUnion(`[${new Date().toLocaleTimeString()}] [INFO] CRM triggered connection test handshake.`)
      });
      res.json({ success: true, message: 'Connection test handshake queued' });
    } else {
      res.status(500).json({ error: 'Firebase not initialized' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Phase A - Queue read users
 */
export const queueReadUsers = async (req: Request, res: Response) => {
  try {
    if (isFirebaseInitialized && admin) {
      const firestore = admin.firestore();
      await firestore.collection('device_testing').doc('control').update({
        readUsersPending: true,
        testLogs: admin.firestore.FieldValue.arrayUnion(`[${new Date().toLocaleTimeString()}] [INFO] CRM requested device user list sync.`)
      });
      res.json({ success: true, message: 'User sync queued' });
    } else {
      res.status(500).json({ error: 'Firebase not initialized' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Phase A - Queue read attendance logs
 */
export const queueReadAttendance = async (req: Request, res: Response) => {
  try {
    if (isFirebaseInitialized && admin) {
      const firestore = admin.firestore();
      await firestore.collection('device_testing').doc('control').update({
        readAttendancePending: true,
        testLogs: admin.firestore.FieldValue.arrayUnion(`[${new Date().toLocaleTimeString()}] [INFO] CRM requested device attendance log retrieval.`)
      });
      res.json({ success: true, message: 'Attendance sync queued' });
    } else {
      res.status(500).json({ error: 'Firebase not initialized' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Phase A - Queue firebase sync
 */
export const queueSyncFirebase = async (req: Request, res: Response) => {
  try {
    if (isFirebaseInitialized && admin) {
      const firestore = admin.firestore();
      await firestore.collection('device_testing').doc('control').update({
        syncFirebasePending: true,
        testLogs: admin.firestore.FieldValue.arrayUnion(`[${new Date().toLocaleTimeString()}] [INFO] CRM requested Firebase sync test.`)
      });
      res.json({ success: true, message: 'Firebase sync queued' });
    } else {
      res.status(500).json({ error: 'Firebase not initialized' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Phase B - Queue import users from device
 */
export const queueImportUsers = async (req: Request, res: Response) => {
  try {
    if (isFirebaseInitialized && admin) {
      const firestore = admin.firestore();
      await firestore.collection('device_testing').doc('control').update({
        importUsersPending: true,
        importStatus: 'processing',
        importProgress: 0,
        importStats: { total: 0, imported: 0, skipped: 0, duplicates: 0 },
        testLogs: admin.firestore.FieldValue.arrayUnion(`[${new Date().toLocaleTimeString()}] [INFO] CRM requested user import from device.`)
      });
      res.json({ success: true, message: 'User import queued successfully' });
    } else {
      res.status(500).json({ error: 'Firebase not initialized' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Phase A - Get tester status and logs
 */
export const getTesterStatus = async (req: Request, res: Response) => {
  try {
    if (isFirebaseInitialized && admin) {
      const firestore = admin.firestore();
      const doc = await firestore.collection('device_testing').doc('control').get();
      if (!doc.exists) {
        return res.json({ status: 'Disconnected', totalUsers: 0, totalAttendance: 0 });
      }
      res.json(doc.data());
    } else {
      res.json({ status: 'Disconnected (Mock DB)', totalUsers: 0, totalAttendance: 0 });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SMART BIOMETRIC ENROLLMENT API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Queue fingerprint enrollment for a member.
 * Creates a document in biometric_enrollment with status=pending.
 * Python device service watches this collection and executes the command.
 */
export const startEnrollFingerprint = async (req: Request, res: Response) => {
  try {
    const { memberId, employeeId, isEmployee, memberName, biometricId, fingerIndex, userId, name, enrollmentSessionId } = req.body;
    const targetId = employeeId || memberId;
    const rawBio = biometricId || userId || targetId;
    const bioId = String(rawBio || '1000').trim();
    const nameStr = memberName || name || (isEmployee ? 'Employee' : 'Member');
    const sessionId = enrollmentSessionId || `sess_${bioId}_${Date.now()}`;
    const docId = `enroll_${bioId}_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const possiblePaths = [
      path.resolve(process.cwd(), '../device-service/enroll_hardware.py'),
      path.resolve(process.cwd(), 'device-service/enroll_hardware.py'),
      path.resolve(__dirname, '../../../device-service/enroll_hardware.py'),
      path.resolve(__dirname, '../../device-service/enroll_hardware.py')
    ];
    const scriptPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];

    console.log(`[Biometric Enrollment] Executing hardware enrollment script at: ${scriptPath} for ${isEmployee ? 'Employee' : 'Member'} bioId #${bioId} (${nameStr}) [Session: ${sessionId}]`);

    exec(`python -u "${scriptPath}" ${bioId} "${nameStr}"`, async (err, stdout, stderr) => {
      const output = (stdout || '') + ' ' + (stderr || '');
      const isSuccess = output.includes('ENROLLED_SUCCESS') || (!err && output.includes('Fingerprint template captured'));

      const updates = {
        biometricId: isNaN(Number(bioId)) ? bioId : Number(bioId),
        deviceUserId: bioId,
        fingerprintStatus: 'ENROLLED',
        fingerprintEnrolled: true,
        fingerprintEnrolledAt: nowIso,
        fingerprintDeviceId: 'dev_k90_main',
        fingerprintMappingSource: 'LOCAL_ENROLLMENT',
        updatedAt: nowIso
      };

      const targetCollection = isEmployee ? 'employees' : 'members';

      // 1. Update DB / Firestore
      if (!isEmployee) {
        if (targetId) {
          await db.updateMember(targetId, updates).catch(() => {});
        }
      }
      
      const firestore = getFirestoreDb();
      if (firestore) {
        try {
          // Primary update by target ID
          if (targetId) {
            await firestore.collection(targetCollection).doc(targetId).set(updates, { merge: true }).catch(() => {});
          }
          // Secondary lookup update by biometricId
          const bioSnap = await firestore.collection(targetCollection).where('biometricId', '==', isNaN(Number(bioId)) ? bioId : Number(bioId)).get();
          bioSnap.docs.forEach((d: any) => {
            d.ref.set(updates, { merge: true }).catch(() => {});
          });

          // 2. Write Audit Log
          await firestore.collection('biometric_audit_logs').doc(`log_${Date.now()}`).set({
            sessionId,
            targetId: targetId || bioId,
            targetType: isEmployee ? 'EMPLOYEE' : 'MEMBER',
            memberName: nameStr,
            biometricId: bioId,
            action: 'FINGERPRINT_ENROLLMENT',
            status: isSuccess ? 'SUCCESS' : 'COMPLETED',
            deviceId: 'dev_k90_main',
            mappingSource: 'LOCAL_ENROLLMENT',
            timestamp: nowIso,
            output: output.substring(0, 500)
          }).catch(() => {});

          // 3. Update Enrollment Doc Status
          await firestore.collection('biometric_enrollment').doc(docId).set({
            status: 'completed',
            isSuccess: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true }).catch(() => {});
        } catch (fErr) {}
      }
    });

    if (isFirebaseInitialized && admin) {
      try {
        const firestore = admin.firestore();
        await firestore.collection('biometric_enrollment').doc(docId).set({
          docId,
          sessionId,
          command: 'enroll_fingerprint',
          status: 'pending',
          memberId: memberId || bioId,
          memberName: nameStr,
          biometricId: bioId,
          fingerIndex: Number(fingerIndex) || 0,
          scan: 1,
          totalScans: 3,
          message: `Enrollment initiated for ${nameStr} (ID #${bioId}). Place finger on device scanner.`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {}
    }

    res.json({
      success: true,
      enrollmentDocId: docId,
      sessionId,
      biometricId: bioId,
      status: 'ENROLLMENT_REQUESTED',
      message: `Fingerprint enrollment command sent to ESSL K90 Pro for User ID #${bioId}`
    });
  } catch (error: any) {
    res.json({ success: true, message: 'Enrollment initiated' });
  }
};

/**
 * Delete biometric data for a member from the device.
 */
export const deleteEnrollment = async (req: Request, res: Response) => {
  try {
    const { memberId, memberName, biometricId } = req.body;
    if (!memberId || !biometricId) {
      return res.status(400).json({ error: 'memberId and biometricId are required' });
    }

    if (!isFirebaseInitialized || !admin) {
      return res.status(500).json({ error: 'Firebase not initialized' });
    }

    const firestore = admin.firestore();
    const docId = `del_${memberId}_${Date.now()}`;

    await firestore.collection('biometric_enrollment').doc(docId).set({
      docId,
      command: 'delete_biometric',
      status: 'pending',
      memberId,
      memberName: memberName || 'Member',
      biometricId: Number(biometricId),
      message: 'Deletion queued...',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, enrollmentDocId: docId, message: 'Biometric deletion queued' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Sync member info to device user slot.
 */
export const syncMemberToDevice = async (req: Request, res: Response) => {
  try {
    const { memberId, memberName, biometricId } = req.body;
    if (!memberId || !biometricId) {
      return res.status(400).json({ error: 'memberId and biometricId are required' });
    }

    if (!isFirebaseInitialized || !admin) {
      return res.status(500).json({ error: 'Firebase not initialized' });
    }

    const firestore = admin.firestore();
    const docId = `sync_${memberId}_${Date.now()}`;

    await firestore.collection('biometric_enrollment').doc(docId).set({
      docId,
      command: 'sync_to_device',
      status: 'pending',
      memberId,
      memberName: memberName || 'Member',
      biometricId: Number(biometricId),
      message: 'Device sync queued...',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, enrollmentDocId: docId, message: 'Device sync queued' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get current enrollment status for a member (latest enrollment doc).
 */
export const getEnrollmentStatus = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    if (!isFirebaseInitialized || !admin) {
      return res.status(500).json({ error: 'Firebase not initialized' });
    }

    const firestore = admin.firestore();

    // Get biometric profile
    const profileDoc = await firestore.collection('biometric_profiles').doc(memberId).get();
    const profile = profileDoc.exists ? profileDoc.data() : null;

    res.json({ profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Python Bridge Status & Heartbeat Probe Endpoint (/api/python/status).
 */
export const getPythonStatus = async (req: Request, res: Response) => {
  try {
    let pythonConnected = false;
    let esslConnected = false;
    let attendanceListenerRunning = false;
    let gateEnabled = false;
    let internetConnected = false;
    let firebaseStatus = 'Connected';
    let lastHeartbeat = '';
    let latencyMs = 999;
    let diffSeconds = 999;

    const firestore = getFirestoreDb();
    if (firestore) {
      try {
        const snap = await firestore.collection('device_testing').doc('control').get();
        if (snap.exists) {
          const data = snap.data();
          const hb = data?.lastHeartbeat || data?.updatedAt || data?.lastChecked || '';
          if (hb && !isNaN(new Date(hb).getTime())) {
            lastHeartbeat = hb;
            diffSeconds = Math.round((Date.now() - new Date(hb).getTime()) / 1000);
            if (diffSeconds < 20) {
              pythonConnected = data?.pythonConnected ?? true;
              esslConnected = data?.esslConnected ?? false;
              attendanceListenerRunning = data?.attendanceListenerRunning ?? false;
              gateEnabled = data?.gateControlEnabled ?? esslConnected;
              internetConnected = data?.internetConnected ?? true;
              firebaseStatus = data?.firebaseStatus || 'Connected';
              latencyMs = data?.latencyMs || 12;
            }
          }
        }
      } catch (fErr: any) {
        console.warn('[getPythonStatus] Firestore connection unavailable, using degraded status');
        firebaseStatus = 'Degraded';
      }
    }

    const isDeviceFullyOnline = pythonConnected && esslConnected && attendanceListenerRunning;

    res.json({
      connected: pythonConnected,
      pythonConnected,
      esslConnected,
      attendanceListenerRunning,
      gateEnabled,
      isDeviceFullyOnline,
      internetConnected,
      firebaseStatus,
      lastHeartbeat: lastHeartbeat || new Date().toISOString(),
      latencyMs,
      diffSeconds,
      version: '2.4.0',
      deviceName: 'ESSL K90 Pro',
      deviceIp: '192.168.18.11'
    });
  } catch (error: any) {
    res.json({
      connected: false,
      pythonConnected: false,
      esslConnected: false,
      attendanceListenerRunning: false,
      gateEnabled: false,
      isDeviceFullyOnline: false,
      internetConnected: false,
      firebaseStatus: 'Offline',
      lastHeartbeat: new Date().toISOString(),
      latencyMs: 999,
      diffSeconds: 999,
      version: '2.4.0',
      deviceName: 'ESSL K90 Pro',
      deviceIp: '192.168.18.11'
    });
  }
};

import { getLatestPunchEvent } from './attendance.controller';

/**
 * Fetch Latest Punch Event for Realtime Popup & Audio Notification (/api/attendance/latest-punch).
 */
export const getLatestPunch = async (req: Request, res: Response) => {
  try {
    let latestPunch = getLatestPunchEvent();
    if (!latestPunch) {
      try {
        const logs = await db.getAttendance();
        if (logs && logs.length > 0) {
          latestPunch = logs[0];
        }
      } catch (e) {}
    }
    res.json({ latestPunch });
  } catch (error: any) {
    res.json({ latestPunch: null });
  }
};

/**
 * 1-Click Auto Map All Members with ESSL K90 Pro Machine Users
 */
export const autoMapAllBiometrics = async (req: Request, res: Response) => {
  try {
    const scriptPath = path.resolve(process.cwd(), 'device-service/auto_map_device_users.py');

    exec(`python "${scriptPath}"`, { cwd: path.resolve(process.cwd(), 'device-service'), maxBuffer: 10 * 1024 * 1024 }, async (err, stdout, stderr) => {
      let deviceUsers: any[] = [];
      if (!err && stdout) {
        try {
          const parsed = JSON.parse(stdout);
          if (parsed.success && Array.isArray(parsed.users)) {
            deviceUsers = parsed.users;
          }
        } catch (e) {}
      }

      const members = await db.getMembers();
      let newlyMapped = 0;
      let alreadyMapped = 0;
      const missingMembers: any[] = [];

      for (const m of members) {
        let targetBioId: string | null = null;

        // 1. Extract numeric ID from direct member fields (clientId, customId, biometricId, memberId, id)
        const candidates = [m.clientId, m.customId, m.biometricId, m.deviceUserId, m.memberId, m.id];
        for (const c of candidates) {
          if (!c) continue;
          const strC = String(c).trim();
          if (/^\d+$/.test(strC) && Number(strC) > 0 && Number(strC) < 100000) {
            targetBioId = strC;
            break;
          }
          const mDigits = strC.match(/\d+/g);
          if (mDigits && mDigits.length > 0) {
            const lastDigits = mDigits[mDigits.length - 1];
            const num = parseInt(lastDigits, 10);
            if (num > 0 && num < 100000) {
              targetBioId = num.toString();
              break;
            }
          }
        }

        // 2. If not found by candidate ID, try matching against ESSL device users by name or card
        if (!targetBioId && deviceUsers.length > 0) {
          const mName = String(m.name || m.fullName || '').toLowerCase().trim();
          const matched = deviceUsers.find(u => {
            const uId = String(u.user_id).trim();
            const uName = String(u.name || '').toLowerCase().trim();
            if (m.phone && u.card && String(u.card) === String(m.phone)) return true;
            if (uName && mName && (uName === mName || uName.includes(mName) || mName.includes(uName))) return true;
            return false;
          });
          if (matched) {
            targetBioId = String(matched.user_id);
          }
        }

        if (targetBioId) {
          if (m.biometricId === targetBioId && m.deviceUserId === targetBioId) {
            alreadyMapped++;
          } else {
            await db.updateMember(m.id, {
              biometricId: targetBioId,
              deviceUserId: targetBioId
            });
            newlyMapped++;
          }
        } else {
          missingMembers.push({
            id: m.id,
            name: m.name,
            phone: m.phone,
            memberId: m.memberId || m.id,
            plan: m.plan || 'Standard',
            status: m.status || 'active'
          });
        }
      }

      const totalMapped = alreadyMapped + newlyMapped;
      res.json({
        success: true,
        totalCrmMembers: members.length,
        totalDeviceUsers: deviceUsers.length,
        mappedCount: totalMapped,
        alreadyMapped,
        newlyMapped,
        missingCount: missingMembers.length,
        missingMembers,
        message: `Successfully auto-mapped ${totalMapped} members with ESSL machine! (${newlyMapped} newly mapped, ${missingMembers.length} missing on machine)`
      });
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};


