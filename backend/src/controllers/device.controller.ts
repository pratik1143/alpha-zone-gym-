import { Request, Response } from 'express';
import { db, admin, isFirebaseInitialized, getFirestoreDb, disableFirestore } from '../firebase';
import { simulateManualTap } from '../services/deviceSync.service';
import { execFile } from 'child_process';
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

import net from 'net';

function checkDeviceSocket(ip: string, port: number, timeoutMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let connected = false;
    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      connected = true;
      socket.destroy();
    });

    socket.on('timeout', () => {
      socket.destroy();
    });

    socket.on('error', () => {
      socket.destroy();
    });

    socket.on('close', () => {
      resolve(connected);
    });

    socket.connect(port, ip);
  });
}

/**
 * Queue fingerprint enrollment for a member or employee.
 * Checks socket connectivity to hardware scanner before attempting enrollment.
 */
export const startEnrollFingerprint = async (req: Request, res: Response) => {
  try {
    const { memberId, employeeId, isEmployee, biometricId, fingerIndex, enrollmentSessionId, retryCrmSync } = req.body;
    const targetId = String((isEmployee ? employeeId : memberId) || '');
    if (!targetId) return res.status(400).json({ success: false, error: 'A CRM member or employee record must be selected.' });
    const firestore = getFirestoreDb();
    if (!firestore) return res.status(503).json({ success: false, error: 'Firebase is unavailable; no enrollment was started.' });

    const targetCollection = isEmployee ? 'employees' : 'members';
    const targetRef = firestore.collection(targetCollection).doc(targetId);
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) return res.status(404).json({ success: false, error: `Selected ${isEmployee ? 'employee' : 'member'} was not found in CRM.` });
    const target = targetSnap.data() || {};
    const storedBioId = String(target.biometricId ?? target.deviceUserId ?? '').trim();
    if (!/^\d{1,5}$/.test(storedBioId) || Number(storedBioId) < 1 || Number(storedBioId) > 65535) {
      return res.status(409).json({ success: false, error: 'This CRM record has no valid permanent numeric biometric ID (device range 1–65535). Assign its ID in CRM before enrolling.' });
    }
    if (biometricId && String(biometricId).trim() !== storedBioId) {
      return res.status(409).json({ success: false, error: 'The selected biometric ID does not match the permanent CRM ID. Refresh the roster and try again.' });
    }

    const bioId = storedBioId;
    const nameStr = String(target.name || '').trim();
    if (!nameStr) return res.status(409).json({ success: false, error: 'The selected CRM record has no name.' });
    const deviceIp = process.env.EASYBIO_DEVICE_IP || '192.168.18.11';
    const devicePort = Number(process.env.EASYBIO_DEVICE_PORT || 4370);
    const isOnline = await checkDeviceSocket(deviceIp, devicePort, 2500);
    if (!isOnline) return res.status(503).json({ success: false, status: 'DEVICE_OFFLINE', error: `Biometric device is unreachable at ${deviceIp}:${devicePort}.` });

    const deviceId = process.env.EASYBIO_DEVICE_ID || 'dev_k90_main';
    const otherCollection = isEmployee ? 'members' : 'employees';
    const [byNumber, byString] = await Promise.all([
      firestore.collection(otherCollection).where('biometricId', '==', Number(bioId)).get(),
      firestore.collection(otherCollection).where('biometricId', '==', bioId).get()
    ]);
    if (!byNumber.empty || !byString.empty) {
      return res.status(409).json({
        success: false, status: 'ID_COLLISION',
        error: 'This biometric ID is already assigned to a record in the other CRM collection. Resolve the member/employee ID collision before enrolling.'
      });
    }

    const heartbeatSnap = await firestore.collection('device_testing').doc('control').get();
    const heartbeat = heartbeatSnap.exists ? (heartbeatSnap.data() || {}) : {};
    const heartbeatAt = Date.parse(heartbeat.lastHeartbeat || '');
    const deviceSnap = await firestore.collection('devices').doc(deviceId).get();
    const device = deviceSnap.exists ? (deviceSnap.data() || {}) : {};
    const serviceOnline = heartbeat.pythonConnected === true
      && heartbeat.esslConnected === true
      && Number.isFinite(heartbeatAt)
      && Date.now() - heartbeatAt < 120000
      && String(heartbeat.deviceIp || '') === deviceIp
      && Number(heartbeat.devicePort) === devicePort
      && device.status === 'connected';
    if (!serviceOnline) {
      return res.status(503).json({
        success: false, status: 'DEVICE_SERVICE_OFFLINE',
        error: 'The local EasyBio device service is not reporting a fresh connection to the configured terminal.'
      });
    }

    const enrollmentRef = firestore.collection('biometric_enrollment').doc();
    const docId = enrollmentRef.id;
    const sessionId = String(enrollmentSessionId || ('sess_' + bioId + '_' + Date.now()));
    const index = Number.isInteger(Number(fingerIndex)) ? Number(fingerIndex) : 0;
    const nowIso = new Date().toISOString();
    console.log('[ENROLLMENT] Selected ' + (isEmployee ? 'employee' : 'member') + ' ' + targetId + ', device ID ' + bioId);
    await enrollmentRef.set({
      command: 'enroll_fingerprint',
      status: 'pending',
      memberId: targetId,
      memberName: nameStr,
      biometricId: Number(bioId),
      fingerIndex: index,
      targetCollection,
      targetType: isEmployee ? 'EMPLOYEE' : 'MEMBER',
      isEmployee: Boolean(isEmployee),
      deviceId,
      sessionId,
      retryCrmSync: Boolean(retryCrmSync),
      createdAt: nowIso,
      updatedAt: nowIso
    });

    const completion = await new Promise<{ status: string; message?: string; data?: any }>((resolve) => {
      let settled = false;
      let unsubscribe: (() => void) | undefined;
      const finish = (value: { status: string; message?: string; data?: any }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (unsubscribe) unsubscribe();
        resolve(value);
      };
      const timer = setTimeout(() => finish({
        status: 'timeout',
        message: 'No completed enrollment result arrived from the local EasyBio service.'
      }), 300000);
      res.setTimeout(0);
      unsubscribe = enrollmentRef.onSnapshot((snapshot) => {
        const data = snapshot.data();
        if (!data) return;
        if (['success', 'failed', 'crm_sync_pending'].includes(String(data.status))) {
          finish({ status: String(data.status), message: data.message || data.error, data });
        }
      }, (error) => finish({ status: 'failed', message: 'Enrollment result could not be read: ' + error.message }));
    });

    console.log('[DEVICE] Enrollment operation ' + docId + ' completed with status ' + completion.status);
    if (completion.status === 'crm_sync_pending') {
      return res.status(503).json({
        success: false, deviceEnrolled: true, retryable: true,
        status: 'CRM_SYNC_PENDING', targetId, isEmployee: Boolean(isEmployee),
        biometricId: bioId,
        error: completion.message || 'Device enrollment succeeded, but CRM mapping needs a retry.'
      });
    }
    if (completion.status === 'timeout') {
      return res.status(504).json({
        success: false, status: 'ENROLLMENT_RESULT_TIMEOUT', enrollmentDocId: docId,
        error: completion.message
      });
    }
    if (completion.status !== 'success' || completion.data?.templateVerified !== true) {
      return res.status(422).json({
        success: false, status: completion.data?.status || 'ENROLLMENT_FAILED',
        enrollmentDocId: docId,
        error: completion.message || 'Device did not confirm the requested fingerprint template.'
      });
    }

    const [mappedTarget, mappedDeviceUser] = await Promise.all([
      targetRef.get(),
      firestore.collection('deviceUsers').doc('dev_' + deviceId + '_usr_' + bioId).get()
    ]);
    const crmMapping = mappedTarget.data() || {};
    const deviceMapping = mappedDeviceUser.data() || {};
    const mappingVerified = mappedTarget.exists
      && String(crmMapping.biometricId) === bioId
      && String(crmMapping.deviceUserId) === bioId
      && String(crmMapping.fingerprintStatus || '').toUpperCase() === 'ENROLLED'
      && crmMapping.fingerprintEnrolled === true
      && String(deviceMapping.userId) === bioId
      && Number(deviceMapping.fingerprintsCount || 0) > 0;
    if (!mappingVerified) {
      return res.status(503).json({
        success: false, deviceEnrolled: true, retryable: true,
        status: 'CRM_SYNC_PENDING', targetId, isEmployee: Boolean(isEmployee),
        biometricId: bioId,
        error: 'The device template was confirmed, but the CRM and device-user mapping read-back did not match.'
      });
    }

    const completedAt = new Date().toISOString();
    await firestore.collection('biometric_audit_logs').doc('log_' + Date.now()).set({
      sessionId, targetId, targetType: isEmployee ? 'EMPLOYEE' : 'MEMBER',
      memberName: nameStr, biometricId: bioId, action: 'FINGERPRINT_ENROLLMENT',
      status: 'SUCCESS', deviceId, timestamp: completedAt
    }).catch((auditError: any) => console.warn('[ENROLLMENT] Audit write failed: ' + auditError.message));

    console.log('[CRM] SUCCESS: mapped ' + targetCollection + '/' + targetId + ' to device user ' + bioId);
    return res.json({
      success: true, enrollmentDocId: docId, sessionId, biometricId: bioId,
      status: 'ENROLLED', verified: true,
      message: 'Device fingerprint template verified and CRM mapping read back for ID #' + bioId + ' (' + nameStr + ').'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Fingerprint enrollment error' });
  }
};

/**
 * Delete biometric data for a member from the device.
 */
export const deleteEnrollment = async (req: Request, res: Response) => {
  try {
    const { memberId, memberName, biometricId, isEmployee } = req.body;
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
      isEmployee: isEmployee === true,
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

export const getEnrollmentCommandStatus = async (req: Request, res: Response) => {
  try {
    if (!isFirebaseInitialized || !admin) return res.status(503).json({ error: 'Firebase not initialized' });
    const commandId = String(req.params.commandId || '').trim();
    if (!commandId || commandId.length > 200 || commandId.includes('/')) {
      return res.status(400).json({ error: 'Invalid biometric command ID' });
    }
    const snapshot = await admin.firestore().collection('biometric_enrollment').doc(commandId).get();
    if (!snapshot.exists) return res.status(404).json({ error: 'Biometric command not found' });
    const command = snapshot.data() || {};
    res.json({ success: true, commandId, status: command.status || 'unknown', message: command.message || '' });
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
    if (!isFirebaseInitialized || !admin) {
      return res.status(503).json({ success: false, error: 'Firebase is unavailable. No member mappings were changed.' });
    }

    const deviceServiceDir = path.resolve(__dirname, '../../../device-service');
    const scriptPath = path.join(deviceServiceDir, 'auto_map_device_users.py');
    const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      execFile('python', [scriptPath], {
        cwd: deviceServiceDir,
        timeout: 15000,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf8'
      }, (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr || error.message));
        resolve({ stdout, stderr });
      });
    });
    const scan = JSON.parse(stdout);
    if (!scan.success || scan.source !== 'device' || !Array.isArray(scan.users)) {
      return res.status(503).json({
        success: false,
        error: scan.error || 'Fingerprint device is offline. No member mappings were changed.'
      });
    }

    const deviceUsers = scan.users.filter((user: any) =>
      /^\d{1,5}$/.test(String(user.user_id || '').trim())
      && Number(user.user_id) > 0
      && Number(user.fingerprint_count) > 0
    );
    const members = await db.getMembers();
    const employeeSnapshot = await admin.firestore().collection('employees').get();
    const employeeBioIds = new Set<string>();
    const employeeNames = new Set<string>();
    for (const employeeDoc of employeeSnapshot.docs) {
      const employee = employeeDoc.data();
      for (const id of [employee.biometricId, employee.deviceUserId].map(value => String(value || '').trim()).filter(Boolean)) {
        employeeBioIds.add(id);
      }
      const name = String(employee.name || employee.fullName || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
      if (name) employeeNames.add(name);
    }
    const normalizeName = (value: unknown) => String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
    const membersByBioId = new Map<string, any[]>();
    const membersByName = new Map<string, any[]>();
    for (const member of members) {
      const name = normalizeName(member.name || member.fullName);
      if (name) membersByName.set(name, [...(membersByName.get(name) || []), member]);
      for (const id of [member.biometricId, member.deviceUserId].map(value => String(value || '').trim()).filter(Boolean)) {
        membersByBioId.set(id, [...(membersByBioId.get(id) || []), member]);
      }
    }

    const deviceUsersByName = new Map<string, any[]>();
    for (const user of deviceUsers) {
      const name = normalizeName(user.name);
      if (name) deviceUsersByName.set(name, [...(deviceUsersByName.get(name) || []), user]);
    }

    const claimedDeviceIds = new Set<string>();
    const missingMembers: any[] = [];
    let newlyMapped = 0;
    let alreadyMapped = 0;
    let ambiguousCount = 0;
    let conflictingCount = 0;

    for (const member of members) {
      const memberId = String(member.id || member.uid || '').trim();
      const existingIds = [...new Set([member.biometricId, member.deviceUserId]
        .map(value => String(value || '').trim())
        .filter(value => /^\d{1,5}$/.test(value) && Number(value) > 0))];
      let candidateUsers = existingIds.flatMap(id => deviceUsers.filter((user: any) => String(user.user_id).trim() === id));
      candidateUsers = [...new Map(candidateUsers.map((user: any) => [String(user.user_id).trim(), user])).values()];

      if (candidateUsers.length === 0 && existingIds.length === 0) {
        const memberName = normalizeName(member.name || member.fullName);
        const nameUsers = deviceUsersByName.get(memberName) || [];
        const nameMembers = membersByName.get(memberName) || [];
        if (memberName && !employeeNames.has(memberName) && nameUsers.length === 1 && nameMembers.length === 1) candidateUsers = nameUsers;
        else if (nameUsers.length > 0 || nameMembers.length > 1) ambiguousCount++;
      }

      if (candidateUsers.length !== 1) {
        missingMembers.push({
          id: memberId,
          name: member.name || member.fullName || 'Unnamed member',
          phone: member.phone || '',
          memberId: member.memberId || memberId,
          plan: member.plan || 'Standard',
          status: member.status || 'active'
        });
        continue;
      }

      const matchedDeviceUser = candidateUsers[0];
      const targetBioId = String(matchedDeviceUser.user_id).trim();
      if (employeeBioIds.has(targetBioId)) {
        conflictingCount++;
        missingMembers.push({
          id: memberId, name: member.name || member.fullName || 'Unnamed member',
          phone: member.phone || '', memberId: member.memberId || memberId,
          plan: member.plan || 'Standard', status: member.status || 'active'
        });
        continue;
      }
      const currentBioId = String(member.biometricId || '').trim();
      const currentDeviceId = String(member.deviceUserId || '').trim();
      const otherClaims = members.filter(other => String(other.id || other.uid || '') !== memberId
        && [other.biometricId, other.deviceUserId].some(value => String(value || '').trim() === targetBioId));
      if (claimedDeviceIds.has(targetBioId) || otherClaims.length > 0) {
        conflictingCount++;
        missingMembers.push({
          id: memberId, name: member.name || member.fullName || 'Unnamed member',
          phone: member.phone || '', memberId: member.memberId || memberId,
          plan: member.plan || 'Standard', status: member.status || 'active'
        });
        continue;
      }

      const nameIdMatches = (membersByBioId.get(targetBioId) || []).length === 0
        || (membersByBioId.get(targetBioId) || []).every(other => String(other.id || other.uid || '') === memberId);
      if (!nameIdMatches) {
        conflictingCount++;
        missingMembers.push({
          id: memberId, name: member.name || member.fullName || 'Unnamed member',
          phone: member.phone || '', memberId: member.memberId || memberId,
          plan: member.plan || 'Standard', status: member.status || 'active'
        });
        continue;
      }

      const sameMapping = currentBioId === targetBioId && currentDeviceId === targetBioId
        && String(member.fingerprintStatus || '').toUpperCase() === 'ENROLLED'
        && member.fingerprintEnrolled === true;
      if (sameMapping) {
        alreadyMapped++;
      } else {
        await db.updateMember(memberId, {
          biometricId: targetBioId,
          deviceUserId: targetBioId,
          fingerprintStatus: 'ENROLLED',
          fingerprintEnrolled: true,
          fingerprintCount: Number(matchedDeviceUser.fingerprint_count),
          biometricEnrolled: true,
          biometricStatus: 'Linked',
          lastBiometricSync: new Date().toISOString()
        });
        newlyMapped++;
      }
      claimedDeviceIds.add(targetBioId);
    }

    const totalMapped = alreadyMapped + newlyMapped;
    res.json({
      success: true,
      totalCrmMembers: members.length,
      totalDeviceUsers: scan.users.length,
      fingerprintedDeviceUsers: deviceUsers.length,
      skippedStaffFingerprints: deviceUsers.filter((user: any) => employeeBioIds.has(String(user.user_id).trim())).length,
      unmappedFingerprintCount: deviceUsers.filter((user: any) => !claimedDeviceIds.has(String(user.user_id).trim())).length,
      mappedCount: totalMapped,
      alreadyMapped,
      newlyMapped,
      missingCount: missingMembers.length,
      ambiguousCount,
      conflictingCount,
      missingMembers,
      message: `Mapped ${totalMapped} members to verified device fingerprints: ${newlyMapped} new, ${alreadyMapped} already linked, ${missingMembers.length} need review.`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
