import { Request, Response } from 'express';
import { db, admin, isFirebaseInitialized } from '../firebase';
import { simulateManualTap } from '../services/deviceSync.service';

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
    const attendanceToday = attendanceLogs.filter(a => a.checkIn && a.checkIn.startsWith(todayStr)).length;

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
    const { memberId, memberName, biometricId, fingerIndex } = req.body;
    if (!memberId || !memberName) {
      return res.status(400).json({ error: 'memberId and memberName are required' });
    }

    if (!isFirebaseInitialized || !admin) {
      return res.status(500).json({ error: 'Firebase not initialized' });
    }

    const firestore = admin.firestore();
    const docId = `enroll_${memberId}_${Date.now()}`;

    await firestore.collection('biometric_enrollment').doc(docId).set({
      docId,
      command: 'enroll_fingerprint',
      status: 'pending',
      memberId,
      memberName,
      biometricId: Number(biometricId) || 1,
      fingerIndex: Number(fingerIndex) || 0,
      scan: 0,
      totalScans: 3,
      message: 'Enrollment queued. Waiting for device...',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, enrollmentDocId: docId, message: 'Fingerprint enrollment queued' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
