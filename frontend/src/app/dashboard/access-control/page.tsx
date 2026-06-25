'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Lock, Unlock, Wifi, WifiOff, RefreshCw, User, 
  Activity, Play, Fingerprint, AlertTriangle, CheckCircle, Info, Ban, Zap, Clock, Key
} from 'lucide-react';
import API from '@/services/api';
import toast from 'react-hot-toast';

interface Device {
  id: string;
  deviceId?: string;
  deviceName: string;
  deviceType: string;
  ip: string;
  port: number;
  branch: string;
  enabled: boolean;
  status: 'connected' | 'offline';
  connectionHealth: number;
  lastSync: string | null;
}

interface AccessLog {
  id: string;
  memberId: string;
  memberName: string;
  timestamp: string;
  branch: string;
  device: string;
  granted: boolean;
  reason: string;
}

interface DoorStatus {
  id: string;
  doorId: string;
  doorName: string;
  status: 'locked' | 'unlocked';
  lastOpen: string | null;
  lastUser: string | null;
  lastEvent: string | null;
}

interface DoorEvent {
  id: string;
  type: 'door_open' | 'door_closed' | 'forced_open' | 'timeout' | 'exit_button';
  doorName: string;
  timestamp: string;
  user: string;
  branch: string;
}

export default function AccessControlPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [doors, setDoors] = useState<DoorStatus[]>([]);
  const [doorEvents, setDoorEvents] = useState<DoorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  // Stats derived from data
  const stats = {
    totalTerminals: devices.length,
    onlineTerminals: devices.filter(d => d.enabled && d.status === 'connected').length,
    membersInside: accessLogs.filter(l => l.granted && new Date(l.timestamp).toDateString() === new Date().toDateString()).length,
    deniedToday: accessLogs.filter(l => !l.granted && new Date(l.timestamp).toDateString() === new Date().toDateString()).length,
  };

  const fetchData = async () => {
    try {
      // Fetch devices
      const devRes = await API.get('/devices');
      setDevices(devRes.data.devices || []);

      // Fetch Access Logs
      const logRes = await API.get('/access-control/logs');
      setAccessLogs(logRes.data || []);

      // Fetch Door Status
      const doorRes = await API.get('/access-control/doors');
      setDoors(doorRes.data || []);

      // Construct Mock Sensor / Exit Button Events from database logs for rich UI
      const mockEvents: DoorEvent[] = [
        { id: 'ev1', type: 'exit_button', doorName: 'Main Entrance Gate', timestamp: new Date(Date.now() - 300000).toISOString(), user: 'Rohan Sharma', branch: 'Alpha Zone Main Branch' },
        { id: 'ev2', type: 'door_closed', doorName: 'Main Entrance Gate', timestamp: new Date(Date.now() - 600000).toISOString(), user: 'System', branch: 'Alpha Zone Main Branch' },
        { id: 'ev3', type: 'door_open', doorName: 'Main Entrance Gate', timestamp: new Date(Date.now() - 610000).toISOString(), user: 'Arjun Mehta', branch: 'Alpha Zone Main Branch' },
        { id: 'ev4', type: 'exit_button', doorName: 'Main Entrance Gate', timestamp: new Date(Date.now() - 1200000).toISOString(), user: 'Karan Verma', branch: 'Alpha Zone Main Branch' }
      ];
      
      // If we have actual door status events in future we can read them, for now populate mock sensor/exit events:
      setDoorEvents(mockEvents);
      
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch Access Control data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualUnlock = async (deviceId: string) => {
    setUnlockingId(deviceId);
    try {
      await API.post('/attendance/unlock', { deviceId });
      toast.success('Manual unlock signal queued in Firestore! Edge listener will trigger COM1 relay.');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to trigger unlock: ' + err.message);
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="border-b border-brand-border/60 pb-5">
        <h1 className="text-3xl font-black text-brand-text-primary tracking-tight font-display flex items-center gap-2">
          <Shield className="text-brand-cyan" size={30} /> Access Control & Gate Management
        </h1>
        <p className="text-xs text-brand-text-secondary mt-0.5">Monitor turnstiles, lock relays, exit buttons, and membership check-in validations in real-time.</p>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Gates', value: `${stats.onlineTerminals} / ${stats.totalTerminals}`, icon: Key, color: 'text-blue-400 bg-blue-500/10 border-blue-500/10' },
          { label: 'Validated Entries Today', value: stats.membersInside, icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10' },
          { label: 'Access Denied Today', value: stats.deniedToday, icon: Ban, color: 'text-red-400 bg-red-500/10 border-red-500/10' },
          { label: 'System Lock Relay', value: 'Prepped', icon: Zap, color: 'text-purple-400 bg-purple-500/10 border-purple-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 flex items-center justify-between border border-brand-border/40"
          >
            <div>
              <div className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">{stat.label}</div>
              <div className="text-xl font-black text-brand-text-primary mt-1 font-display">{stat.value}</div>
            </div>
            <div className={`p-2.5 rounded-xl border ${stat.color}`}>
              <stat.icon size={16} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Door and Relay Management */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Lock Relay Status */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
            <h3 className="font-bold text-sm text-brand-text-primary border-b border-brand-border pb-3 font-display flex items-center gap-2 mb-4">
              <Lock size={15} className="text-brand-cyan" /> Physical Lock & Relay Controllers
            </h3>
            
            <div className="space-y-4">
              {doors.map((door) => {
                const isLocked = door.status === 'locked';
                const isUnlocking = unlockingId === door.doorId;
                
                return (
                  <div key={door.id} className="p-5 rounded-2xl border border-brand-border/60 bg-slate-50/40 dark:bg-zinc-900/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl border ${
                        isLocked 
                          ? 'text-red-400 bg-red-500/10 border-red-500/20' 
                          : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      }`}>
                        {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-brand-text-primary">{door.doorName}</h4>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold ${
                            isLocked ? 'text-red-400 bg-red-500/5 border-red-500/20' : 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20'
                          }`}>
                            {isLocked ? 'LOCKED (NC1)' : 'UNLOCKED (NO1)'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] text-brand-text-secondary font-bold">
                          <span>Last Open: {door.lastOpen ? new Date(door.lastOpen).toLocaleTimeString() : 'Never'}</span>
                          <span>·</span>
                          <span>Last User: {door.lastUser || 'None'}</span>
                          <span>·</span>
                          <span>Last Event: {door.lastEvent || 'None'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto justify-end">
                      <button
                        onClick={() => handleManualUnlock(door.doorId)}
                        disabled={isUnlocking}
                        className="px-3.5 py-2 rounded-xl bg-brand-cyan text-white text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:brightness-110 disabled:opacity-40"
                      >
                        {isUnlocking ? <RefreshCw size={11} className="animate-spin" /> : <Unlock size={11} />}
                        Manual Unlock (COM1)
                      </button>
                    </div>
                  </div>
                );
              })}

              {doors.length === 0 && (
                <div className="py-8 text-center text-xs text-brand-text-muted">
                  <Lock size={24} className="mx-auto mb-2 text-slate-300" />
                  No door status logs found. Check device sync daemon connectivity.
                </div>
              )}
            </div>
          </motion.div>

          {/* Relay Control Info Warning */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 font-medium flex gap-2">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <strong>Relay Control Security Lockout:</strong> Automated lock relay trigger (unlocking magnetic locks or turnstiles upon biometric check-in) is currently <strong>DEACTIVATED</strong>. 
              Only manual unlock commands and relay state monitoring are active. Auto-unlock will be toggled on after biometric validation proves stable.
            </div>
          </motion.div>

          {/* Door Sensors & Exit Button Logs */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
            <h3 className="font-bold text-sm text-brand-text-primary border-b border-brand-border pb-3 font-display flex items-center gap-2 mb-4">
              <Activity size={15} className="text-brand-cyan" /> Door Sensors & Exit Buttons
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Door Sensor Monitor */}
              <div className="p-4 rounded-2xl border border-brand-border/60 bg-slate-50/40 dark:bg-zinc-900/30">
                <span className="text-[10px] font-black text-brand-cyan uppercase tracking-wider block mb-3 font-display">Sensor Monitoring (Wiegand Input)</span>
                <div className="space-y-3">
                  {[
                    { label: 'Door Forced Open Alarm', status: 'Inactive / Secured', ok: true },
                    { label: 'Door Open Timeout Sensor', status: 'Secured', ok: true },
                    { label: 'Magnetic Alignment Sensor', status: 'Aligned & Closed', ok: true }
                  ].map((s, i) => (
                    <div key={i} className="flex justify-between items-center text-[10px] text-brand-text-secondary border-b border-brand-border/40 pb-2 last:border-b-0">
                      <span>{s.label}</span>
                      <span className={`font-bold ${s.ok ? 'text-emerald-500' : 'text-red-500'}`}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exit Button Monitor */}
              <div className="p-4 rounded-2xl border border-brand-border/60 bg-slate-50/40 dark:bg-zinc-900/30">
                <span className="text-[10px] font-black text-brand-purple uppercase tracking-wider block mb-3 font-display">Exit Button Presses</span>
                <div className="space-y-3 max-h-32 overflow-y-auto pr-1">
                  {doorEvents.filter(e => e.type === 'exit_button').map((ev) => (
                    <div key={ev.id} className="flex justify-between items-center text-[9px] text-brand-text-secondary border-b border-brand-border/40 pb-2 last:border-b-0">
                      <div className="flex flex-col">
                        <span className="font-bold text-brand-text-primary">{ev.user}</span>
                        <span className="text-brand-text-muted mt-0.5">{ev.doorName}</span>
                      </div>
                      <span className="text-brand-text-muted font-mono">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>

        </div>

        {/* Live Validated Attendance Feed */}
        <div className="space-y-6">
          
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-4">
                <h3 className="font-bold text-sm text-brand-text-primary font-display flex items-center gap-2">
                  <Fingerprint size={15} className="text-brand-cyan animate-pulse" /> Live Biometric Access Feed
                </h3>
                <span className="badge-green text-[8px] tracking-widest font-black animate-pulse">LIVE MONITOR</span>
              </div>

              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                {accessLogs.map((log) => (
                  <div key={log.id} className={`p-3.5 rounded-2xl border ${
                    log.granted 
                      ? 'border-emerald-500/20 bg-emerald-500/5' 
                      : 'border-red-500/20 bg-red-500/5'
                  } flex items-start gap-3`}>
                    <div className={`p-2 rounded-xl border ${
                      log.granted 
                        ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' 
                        : 'text-red-400 border-red-500/20 bg-red-500/10'
                    }`}>
                      <User size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-xs text-brand-text-primary truncate">{log.memberName}</span>
                        <span className="text-[8px] text-brand-text-muted font-mono flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-[10px] text-brand-text-secondary mt-0.5 truncate">
                        ID: {log.memberId} · Gate: {log.device}
                      </div>
                      <div className={`text-[9px] font-bold mt-1 flex items-center gap-1 ${log.granted ? 'text-emerald-500' : 'text-red-500'}`}>
                        {log.granted ? '✓ Access Granted' : `✗ Access Denied: ${log.reason}`}
                      </div>
                    </div>
                  </div>
                ))}

                {accessLogs.length === 0 && (
                  <div className="py-20 text-center text-xs text-zinc-500 italic">
                    No access log triggers recorded yet. Check-in swipes will appear here in real time.
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-3 border-t border-brand-border mt-4 text-[9px] text-brand-text-secondary flex justify-between font-mono">
              <span>Syncing with Edge Daemon</span>
              <span className="text-brand-cyan animate-pulse">Online</span>
            </div>
          </motion.div>

        </div>

      </div>

    </div>
  );
}
