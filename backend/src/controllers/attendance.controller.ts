import { Request, Response } from 'express';
import { db } from '../firebase';

export const getAttendanceFeed = async (req: Request, res: Response) => {
  try {
    const list = await db.getAttendance();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createCheckIn = async (req: Request, res: Response) => {
  try {
    const { memberId, method, branch } = req.body;
    const members = await db.getMembers();
    
    // Find member by ID or by name/phone lookup
    let member = members.find(m => m.id === memberId || m.phone === memberId || m.name.toLowerCase() === String(memberId).toLowerCase());
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found on this branch roster' });
    }

    if (member.status === 'expired') {
      return res.status(403).json({ error: 'Access Denied: Membership has expired!' });
    }
    if (member.status === 'frozen') {
      return res.status(403).json({ error: 'Access Denied: Membership is currently frozen!' });
    }

    const log = await db.addAttendance({
      memberId: member.id,
      memberName: member.name,
      checkIn: new Date().toISOString(),
      checkOut: null,
      method: method || 'biometric',
      branch: branch || member.branch || 'Mohali, Punjab'
    });

    // Increment attendance count
    await db.updateMember(member.id, { attendanceCount: (member.attendanceCount || 0) + 1 });

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
    
    // If no deviceId is provided, fallback to the first active/enabled device
    if (!deviceId) {
      const devicesList = await db.getDevices();
      const firstEnabled = devicesList.find(d => d.enabled === true);
      if (firstEnabled) {
        deviceId = firstEnabled.id;
      } else {
        // Fallback default ID
        deviceId = 'dev_k90_main';
      }
    }

    if (deviceId) {
      // Set unlockPending flag in Firestore so local service handles it
      await db.updateDevice(deviceId, { unlockPending: true });
      await db.addDeviceLog({
        deviceId,
        deviceName: 'Access Control',
        level: 'WARNING',
        message: '[Access Control] Manual unlock signal queued for gate relay.'
      });
    }
    res.json({ success: true, message: 'Unlock signal queued successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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

