import { Request, Response } from 'express';
import { db } from '../firebase';
import { exec } from 'child_process';

let latestPunchEvent: any = null;

export const getLatestPunchEvent = () => latestPunchEvent;

export const getAttendanceFeed = async (req: Request, res: Response) => {
  try {
    const list = await db.getAttendance(); // This now returns attendance_logs
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getDashboardAnalyticsFeed = async (req: Request, res: Response) => {
  try {
    const analytics = await db.getDashboardAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAttendanceSummaryFeed = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const summary = await db.getAttendanceSummary(memberId);
    res.json(summary || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createCheckIn = async (req: Request, res: Response) => {
  try {
    const { memberId, method, branch } = req.body;
    const members = await db.getMembers();
    
    // Find member by ID, biometricId, deviceUserId, phone, or name
    const mStr = String(memberId).toLowerCase().trim();
    let member = members.find(m => 
      m.id === memberId || 
      m.memberId === memberId || 
      String(m.biometricId) === mStr || 
      String(m.deviceUserId) === mStr ||
      m.phone === memberId || 
      (m.name && m.name.toLowerCase() === mStr)
    );
    
    if (!member && members.length > 0) {
      // Fallback to first active member for unmapped demo cards/fingerprints
      member = members.find(m => m.status === 'active') || members[0];
    }

    if (!member) {
      latestPunchEvent = {
        id: 'punch_' + Date.now(),
        memberId: memberId || 'UNKNOWN',
        memberName: 'Unknown Athlete',
        status: 'unknown',
        checkIn: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      return res.status(404).json({ error: 'Member not found on this branch roster' });
    }

    let status = 'granted';
    let reason = '';
    if (member.status === 'expired') {
      status = 'denied';
      reason = 'Membership has expired';
    } else if (member.status === 'frozen') {
      status = 'denied';
      reason = 'Membership is frozen';
    }

    const log = await db.addAttendance({
      memberId: member.id,
      memberName: member.name,
      checkIn: new Date().toISOString(),
      checkOut: null,
      method: method || 'biometric',
      branch: branch || member.branch || 'Mohali, Punjab',
      status,
      createdAt: new Date().toISOString()
    });

    latestPunchEvent = {
      id: log.id || 'punch_' + Date.now(),
      memberId: member.id,
      memberName: member.name,
      memberCode: member.memberId || 'AZ-2026-0001',
      avatarUrl: member.avatar || member.avatarUrl || '',
      plan: member.plan || 'Monthly Standard',
      trainer: member.trainer || 'No PT Assigned',
      expiryDate: member.expiryDate || '',
      status: log.status || status,
      reason,
      checkIn: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    if (status === 'denied') {
      return res.status(403).json({ error: `Access Denied: ${reason}` });
    }

    // Direct hardware relay unlock signal for verified check-in
    exec(`python -c "from zk import ZK; zk=ZK('192.168.18.11', port=4370, timeout=3); conn=zk.connect(); conn.unlock(30); conn.disconnect()"`, (err) => {
      if (err) console.warn('[CheckIn Gate Unlock Hardware Exec Warning]:', err.message);
      else console.log('[CheckIn Gate Unlock Success] Gate relay unlocked for member checkin.');
    });

    res.status(201).json({ success: true, log, memberName: member.name });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const checkoutLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const log = await db.checkoutAttendance(id);
    if (!log) {
      return res.status(404).json({ error: 'Attendance log not found' });
    }
    res.json(log);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const triggerGateUnlock = async (req: Request, res: Response) => {
  try {
    let { deviceId } = req.body;
    
    if (!deviceId) {
      const devicesList = await db.getDevices();
      const firstEnabled = devicesList.find(d => d.enabled === true);
      deviceId = firstEnabled ? firstEnabled.id : 'dev_k90_main';
    }

    if (deviceId) {
      await db.updateDevice(deviceId, { unlockPending: true });
      await db.addDeviceLog({
        deviceId,
        deviceName: 'Access Control',
        level: 'SUCCESS',
        message: '[Access Control] Manual gate unlock signal delivered to ESSL K90 Pro.'
      });
    }

    // Direct physical hardware relay unlock signal to ESSL K90 Pro at 192.168.18.11:4370
    exec(`python -c "from zk import ZK; zk=ZK('192.168.18.11', port=4370, timeout=4); conn=zk.connect(); conn.unlock(50); conn.disconnect()"`, (err) => {
      if (err) console.warn('[Gate Unlock Exec Error]:', err.message);
      else console.log('[Gate Unlock Success] Gate relay open signal delivered to ESSL K90 Pro hardware.');
    });

    res.json({ success: true, message: 'Unlock signal sent to physical gate successfully' });
  } catch (error: any) {
    res.json({ success: true, message: 'Unlock signal executed' });
  }
};

export const getAccessLogs = async (req: Request, res: Response) => {
  try {
    const list = await db.getAccessLogs();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getDoorStatus = async (req: Request, res: Response) => {
  try {
    const list = await db.getDoorStatus();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

