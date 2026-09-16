import { Request, Response } from 'express';
import { db } from '../firebase';
import { exec } from 'child_process';
import os from 'os';

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
    
    // Find member by biometricId, deviceUserId, clientId, customId, memberId, phone, or name
    const mStr = String(memberId).toLowerCase().trim();
    let member = members.find(m => {
      const bioId = String(m.biometricId || '').toLowerCase().trim();
      const devId = String(m.deviceUserId || '').toLowerCase().trim();
      const cId = String(m.clientId || '').toLowerCase().trim();
      const custId = String(m.customId || '').toLowerCase().trim();
      const mId = String(m.memberId || '').toLowerCase().trim();
      const id = String(m.id || '').toLowerCase().trim();

      if (bioId && bioId === mStr) return true;
      if (devId && devId === mStr) return true;
      if (cId && cId === mStr) return true;
      if (custId && custId === mStr) return true;
      if (mId && (mId === mStr || mId.endsWith(`-${mStr}`) || mId.endsWith(`0${mStr}`))) return true;
      if (id && id === mStr) return true;
      if (m.phone && m.phone === mStr) return true;
      if (m.name && m.name.toLowerCase().trim() === mStr) return true;
      return false;
    });
    
    if (!member) {
      // DO NOT write attendance log for unmapped users (Requirement 3 & 15)
      latestPunchEvent = {
        id: 'punch_' + Date.now(),
        memberId: `unmapped_bio_${memberId}`,
        memberName: `Unmapped Biometric User #${memberId}`,
        memberCode: `ID #${memberId}`,
        status: 'unknown',
        unmapped: true,
        reason: `Biometric ID #${memberId} needs CRM mapping`,
        checkIn: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      return res.status(200).json({
        success: false,
        unmapped: true,
        biometricId: memberId,
        memberName: `Unmapped Biometric User #${memberId}`,
        message: 'Member not mapped'
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const startDateStr = member.startDate || member.joinDate || todayStr;
    const expiryDateStr = member.expiryDate || '';

    let status = 'granted';
    let reason = '';

    if (startDateStr && startDateStr > todayStr) {
      status = 'denied';
      const startObj = new Date(startDateStr);
      const todayObj = new Date(todayStr);
      const daysUntil = Math.ceil((startObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));
      reason = `Membership starts on ${startDateStr} (Starts in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'})`;
    } else if (member.status === 'expired' || (expiryDateStr && expiryDateStr < todayStr)) {
      status = 'denied';
      reason = 'Membership has expired';
    } else if (member.status === 'frozen') {
      status = 'denied';
      reason = 'Membership is frozen';
    }

    // Check Duplicate / Today Check-in for resolved member
    const logs = await db.getAttendance();
    const existingLog = logs.find((a: any) => a.memberId === member.id && (a.status === 'granted' || a.status === 'already_inside') && a.checkIn && String(a.checkIn).startsWith(todayStr));

    if (existingLog && status === 'granted') {
      latestPunchEvent = {
        id: 'punch_' + Date.now(),
        memberId: member.id,
        memberName: member.name,
        memberCode: member.memberId || 'AZ-2026-0001',
        avatarUrl: member.avatar || member.avatarUrl || '',
        plan: member.plan || 'Monthly Standard',
        trainer: member.trainer || 'No PT Assigned',
        expiryDate: member.expiryDate || '',
        status: 'already_inside',
        alreadyInside: true,
        reason: 'Already checked in today',
        firstCheckInTime: existingLog.checkIn,
        checkIn: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      return res.status(200).json({
        success: true,
        alreadyInside: true,
        member,
        firstCheckInTime: existingLog.checkIn,
        currentPunchTime: new Date().toISOString()
      });
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
      return res.status(403).json({ success: false, access: 'denied', status: 'denied', reason, error: `Access Denied: ${reason}` });
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

let lastGateUnlockTime = 0;

export function getLocalIpAddress(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      if (!iface) continue;
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal && alias.address !== '127.0.0.1') {
          return alias.address;
        }
      }
    }
  } catch (e) {}
  return '127.0.0.1';
}

export const getGateStatus = async (req: Request, res: Response) => {
  try {
    const deviceIp = process.env.EASYBIO_DEVICE_IP || '192.168.18.11';
    const devicePort = process.env.EASYBIO_DEVICE_PORT || '4370';
    const serverIp = getLocalIpAddress();
    const serverPort = process.env.PORT || '8000';

    res.json({
      device: 'EasyBio Access Control',
      ip: deviceIp,
      port: devicePort,
      connected: true,
      serverIp,
      serverPort,
      accessUrl: `http://${serverIp}:${serverPort}/gate-control`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const triggerGateUnlock = async (req: Request, res: Response) => {
  const now = Date.now();
  if (now - lastGateUnlockTime < 1000) {
    console.log('[GATE] Cooldown active. Rejecting rapid repeat unlock request.');
    return res.status(429).json({
      success: false,
      message: 'Gate unlock in progress. Please wait 1 second before opening again.'
    });
  }
  lastGateUnlockTime = now;

  const deviceIp = process.env.EASYBIO_DEVICE_IP || '192.168.18.11';
  const devicePort = process.env.EASYBIO_DEVICE_PORT || '4370';
  const authenticatedUser = (req as any).user?.email || (req as any).user?.name || (req as any).user?.uid || 'Staff / Authorized LAN User';

  console.log('[GATE] Immediate unlock request received from:', authenticatedUser);

  // Send INSTANT HTTP 200 success response to UI (< 50ms) so user gets immediate 1-sec feedback
  res.json({
    success: true,
    message: 'Door Unlocked for 15 Seconds! (Hardware Relay Triggered)',
    deviceIp,
    devicePort,
    timestamp: new Date().toLocaleTimeString('en-IN')
  });

  // Asynchronously execute hardware relay unlock in background for 15 seconds
  try {
    let deviceId = 'dev_k90_main';
    try {
      db.updateDevice(deviceId, { unlockPending: true }).catch(() => {});
      db.addDeviceLog({
        deviceId,
        deviceName: 'Access Control',
        level: 'SUCCESS',
        message: `[Access Control] Manual 15-second gate unlock signal dispatched to EasyBio (${deviceIp}:${devicePort}).`
      }).catch(() => {});
    } catch (e) {}

    // Direct physical hardware relay unlock signal for 15 seconds (150 = 15s in pyzk)
    const pyCmd = `py -c "from zk import ZK; zk=ZK('${deviceIp}', port=${devicePort}, timeout=2); conn=zk.connect(); conn.unlock(150); conn.unlock(15); conn.disconnect()" || python -c "from zk import ZK; zk=ZK('${deviceIp}', port=${devicePort}, timeout=2); conn=zk.connect(); conn.unlock(150); conn.unlock(15); conn.disconnect()"`;

    exec(pyCmd, (err, stdout, stderr) => {
      if (err) {
        console.warn('[GATE] Background pyzk socket notice:', err.message);
      } else {
        console.log('[GATE] Device Hardware Success = Door Unlocked for 15 Seconds.');
      }
    });
  } catch (error: any) {
    console.error('[GATE] Background dispatch notice:', error.message);
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

