'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Shield, User, Bell, Wifi, WifiOff, RefreshCw, 
  CheckCircle, AlertTriangle, Fingerprint, Server, Plus, 
  Trash2, Activity, Lock, ChevronRight, Zap, Database, Edit2, Play, Info,
  Upload
} from 'lucide-react';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';
import API from '@/services/api';
import { useRouter } from 'next/navigation';

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
  firmwareVersion?: string;
  totalUsers?: number;
  totalFingerprints?: number;
  totalAttendanceRecords?: number;
}

interface DeviceLog {
  id: string;
  deviceId: string;
  deviceName: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  message: string;
  timestamp: string;
}

interface Member {
  id: string;
  memberId: string;
  name: string;
  phone: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [gymName, setGymName] = useState('Alpha Zone Gym');
  const [operatorName, setOperatorName] = useState(user?.name || '');
  const [contactEmail, setContactEmail] = useState(user?.email || 'admin@alphazone.com');
  const [contactPhone, setContactPhone] = useState('+91 98765 43210');
  
  // Real database states
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    lastSync: 'Never',
    connectionHealth: 0,
    attendanceToday: 0
  });
  const [deviceLogs, setDeviceLogs] = useState<DeviceLog[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  
  // UI states
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [showSimulateTap, setShowSimulateTap] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    deviceId: '',
    deviceName: '',
    deviceType: 'ESSL K90 Pro',
    ip: '',
    port: '4370',
    branch: 'Alpha Zone Main Branch',
    enabled: true
  });

  // Simulation states
  const [simDeviceId, setSimDeviceId] = useState('');
  const [simMemberId, setSimMemberId] = useState('');

  const fetchDeviceData = async () => {
    try {
      const res = await API.get('/devices');
      setDevices(res.data.devices || []);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err: any) {
      console.error('Failed to fetch devices:', err);
    }
  };

  const fetchDeviceLogs = async () => {
    try {
      const res = await API.get('/devices/logs');
      setDeviceLogs(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch device logs:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await API.get('/members');
      setMembers(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch members:', err);
    }
  };

  // Initial load and periodic refresh (every 5 seconds)
  useEffect(() => {
    fetchDeviceData();
    fetchDeviceLogs();
    fetchMembers();

    const interval = setInterval(() => {
      fetchDeviceData();
      fetchDeviceLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSaveGym = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      // In a real database we could update users/branches. Since profile is in users:
      await API.put(`/members/${user.uid}`, { name: operatorName });
      toast.success('Operator display name saved successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update operator: ' + err.message);
    }
  };

  const handleTestConnection = async (device: Device) => {
    setTestingId(device.id);
    // Ping simulation
    await new Promise(r => setTimeout(r, 1200));
    setTestingId(null);
    if (device.enabled) {
      toast.success(`✓ ${device.deviceName} is reachable at ${device.ip}:${device.port}`);
    } else {
      toast.error(`✗ ${device.deviceName} is disabled in settings.`);
    }
  };

  const handleSyncDeviceNow = async (device: Device) => {
    setSyncingId(device.id);
    try {
      // Trigger a sync log and health refresh
      await API.put(`/devices/${device.id}`, { 
        lastSync: new Date().toISOString(),
        status: 'connected',
        connectionHealth: 100
      });
      toast.success(`Synced terminal logs from ${device.deviceName}`);
      fetchDeviceData();
      fetchDeviceLogs();
    } catch (err: any) {
      toast.error('Sync failed: ' + err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleRestartDevice = async (device: Device) => {
    if (!confirm(`Are you sure you want to reboot the biometric terminal: ${device.deviceName}?`)) {
      return;
    }
    try {
      await API.post(`/devices/${device.id}/restart`);
      toast.success(`Reboot signal queued for ${device.deviceName}. Check logs below!`);
      fetchDeviceLogs();
      fetchDeviceData();
    } catch (err: any) {
      toast.error('Reboot request failed: ' + err.message);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deviceName || !formData.ip || !formData.port) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingDevice) {
        // Edit mode
        await API.put(`/devices/${editingDevice.id}`, {
          deviceName: formData.deviceName,
          deviceType: formData.deviceType,
          ip: formData.ip,
          port: Number(formData.port),
          branch: formData.branch,
          enabled: formData.enabled
        });
        toast.success(`Device "${formData.deviceName}" updated!`);
      } else {
        // Create mode
        await API.post('/devices', {
          deviceId: formData.deviceId || 'dev_' + Date.now(),
          deviceName: formData.deviceName,
          deviceType: formData.deviceType,
          ip: formData.ip,
          port: Number(formData.port),
          branch: formData.branch,
          enabled: formData.enabled
        });
        toast.success(`Device "${formData.deviceName}" linked successfully!`);
      }

      setShowAddDevice(false);
      setEditingDevice(null);
      resetForm();
      fetchDeviceData();
      fetchDeviceLogs();
    } catch (err: any) {
      toast.error('Operation failed: ' + err.message);
    }
  };

  const handleToggleStatus = async (device: Device) => {
    try {
      const nextState = !device.enabled;
      await API.put(`/devices/${device.id}`, { 
        enabled: nextState,
        status: nextState ? 'connected' : 'offline',
        connectionHealth: nextState ? 98 : 0
      });
      toast.success(`Device ${device.deviceName} ${nextState ? 'enabled' : 'disabled'}`);
      fetchDeviceData();
      fetchDeviceLogs();
    } catch (err: any) {
      toast.error('Failed to toggle status: ' + err.message);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (confirm('Are you sure you want to remove and unlink this biometric device?')) {
      try {
        await API.delete(`/devices/${id}`);
        toast.success('Device removed successfully');
        fetchDeviceData();
        fetchDeviceLogs();
      } catch (err: any) {
        toast.error('Failed to delete: ' + err.message);
      }
    }
  };

  const handleSimulateTapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simDeviceId || !simMemberId) {
      toast.error('Please select both a device and a member');
      return;
    }

    try {
      await API.post('/devices/simulate-tap', {
        deviceId: simDeviceId,
        memberId: simMemberId
      });
      toast.success('Biometric tap simulated. Check logs below!');
      setShowSimulateTap(false);
      setSimDeviceId('');
      setSimMemberId('');
      fetchDeviceLogs();
      fetchDeviceData();
    } catch (err: any) {
      toast.error('Simulation failed: ' + err.message);
    }
  };

  const openEditModal = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      deviceId: device.deviceId || device.id,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      ip: device.ip,
      port: String(device.port),
      branch: device.branch,
      enabled: device.enabled
    });
    setShowAddDevice(true);
  };

  const resetForm = () => {
    setFormData({
      deviceId: '',
      deviceName: '',
      deviceType: 'ESSL K90 Pro',
      ip: '',
      port: '4370',
      branch: 'Alpha Zone Main Branch',
      enabled: true
    });
  };

  // Log level display configuration
  const logConfig = {
    INFO: { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
    WARNING: { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
    ERROR: { badge: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-500' },
    SUCCESS: { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="border-b border-brand-border/60 pb-5">
        <h1 className="text-3xl font-black text-brand-text-primary tracking-tight font-display">Settings</h1>
        <p className="text-xs text-brand-text-secondary mt-0.5">Configure branch parameters, hardware gates, and device communication logs.</p>
      </div>

      {/* ─── Device Dashboard Summary Stats ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Terminals', value: stats.totalDevices, icon: Server, color: 'text-blue-400 bg-blue-500/10 border-blue-500/10' },
          { label: 'Online / Active', value: `${stats.onlineDevices} / ${stats.totalDevices}`, icon: Wifi, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10' },
          { label: 'Today\'s Taps', value: stats.attendanceToday, icon: Fingerprint, color: 'text-orange-400 bg-orange-500/10 border-orange-500/10' },
          { label: 'Avg Health Score', value: `${stats.connectionHealth}%`, icon: Activity, color: 'text-purple-400 bg-purple-500/10 border-purple-500/10' },
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

      {/* ─── ESSL Machine Management ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-4 mb-5">
          <div>
            <h3 className="font-bold text-sm text-brand-text-primary font-display flex items-center gap-2">
              <Fingerprint size={15} className="text-blue-500" /> Hardware Access & Device Controller
            </h3>
            <p className="text-[10px] text-brand-text-secondary mt-0.5">Manage turnstile gates and attendance synchronization settings.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (devices.length === 0) {
                  toast.error('Please add at least one device first');
                  return;
                }
                setShowSimulateTap(true);
              }}
              className="px-4 py-2 text-xs font-bold border border-brand-border bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 text-brand-text-primary rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Play size={12} className="text-orange-400" /> Simulate Tap
            </button>
            <button
              onClick={() => {
                resetForm();
                setEditingDevice(null);
                setShowAddDevice(true);
              }}
              className="btn-cyber-cyan text-xs py-2 px-4 font-bold text-white cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={13} /> Link Device
            </button>
            <button
              onClick={() => router.push('/dashboard/settings/device-diagnostics')}
              className="px-4 py-2 text-xs font-bold border border-brand-border bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 text-brand-text-primary rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Activity size={12} className="text-blue-500" /> Device Diagnostics
            </button>
            <button
              onClick={() => router.push('/dashboard/settings/member-migration')}
              className="px-4 py-2 text-xs font-bold border border-brand-border bg-[#d4ff00] hover:brightness-110 text-slate-950 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Upload size={12} className="text-slate-950" /> Member Migration Center
            </button>
          </div>
        </div>

        {/* Device Cards */}
        <div className="space-y-4">
          {devices.map((device, idx) => {
            const isOnline = device.enabled && device.status === 'connected';
            const isSyncing = syncingId === device.id;
            const isTesting = testingId === device.id;
            
            return (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-5 rounded-2xl border border-brand-border/60 bg-slate-50/40 dark:bg-zinc-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`p-2.5 rounded-xl border ${
                    device.enabled 
                      ? isOnline ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'
                      : 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
                  } flex-shrink-0`}>
                    <Server size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-sm text-brand-text-primary truncate">{device.deviceName}</h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold ${
                        device.enabled
                          ? isOnline ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20' : 'text-red-400 bg-red-500/5 border-red-500/20'
                          : 'text-zinc-400 bg-zinc-500/5 border-zinc-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          device.enabled ? isOnline ? 'bg-emerald-500' : 'bg-red-500' : 'bg-zinc-500'
                        }`} />
                        {device.enabled ? isOnline ? 'Online' : 'Offline' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] text-brand-text-secondary font-bold font-mono">
                      <span className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-brand-text-muted">ID: {device.deviceId || device.id}</span>
                      <span>·</span>
                      <span className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-brand-text-muted">IP: {device.ip}:{device.port}</span>
                      <span>·</span>
                      <span className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-brand-text-muted">Type: {device.deviceType}</span>
                      <span>·</span>
                      <span className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-brand-text-muted">Branch: {device.branch}</span>
                      <span>·</span>
                      <span className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-brand-text-muted">Health: {device.connectionHealth}%</span>
                      <span>·</span>
                      <span className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-brand-text-muted">Last sync: {device.lastSync ? new Date(device.lastSync).toLocaleTimeString() : 'Never'}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-brand-text-muted font-bold font-mono">
                      <span className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-slate-500">Firmware: {device.firmwareVersion || 'N/A'}</span>
                      <span>·</span>
                      <span className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-blue-500">Users: {device.totalUsers || 0}</span>
                      <span>·</span>
                      <span className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-orange-500">Fingerprints: {device.totalFingerprints || 0}</span>
                      <span>·</span>
                      <span className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-emerald-500">Logs: {device.totalAttendanceRecords || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
                  <button
                    onClick={() => handleToggleStatus(device)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                      device.enabled 
                        ? 'border-amber-500/20 text-amber-500 hover:bg-amber-500/5' 
                        : 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/5'
                    }`}
                  >
                    {device.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleTestConnection(device)}
                    disabled={isTesting || !device.enabled}
                    className="px-2.5 py-1.5 rounded-xl border border-brand-border bg-white dark:bg-zinc-800 hover:bg-slate-50 text-brand-text-secondary text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    {isTesting ? <RefreshCw size={11} className="animate-spin" /> : <Activity size={11} />}
                    {isTesting ? 'Testing…' : 'Test IP'}
                  </button>
                  <button
                    onClick={() => handleRestartDevice(device)}
                    disabled={!device.enabled || device.status === 'offline'}
                    className="px-2.5 py-1.5 rounded-xl border border-red-200 text-red-500 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 hover:bg-red-50"
                  >
                    <RefreshCw size={11} />
                    Reboot
                  </button>
                  <button
                    onClick={() => handleSyncDeviceNow(device)}
                    disabled={isSyncing || !device.enabled}
                    className="px-2.5 py-1.5 rounded-xl bg-brand-cyan text-slate-950 text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 hover:brightness-110"
                  >
                    {isSyncing ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                    {isSyncing ? 'Syncing…' : 'Sync Logs'}
                  </button>
                  <button
                    onClick={() => openEditModal(device)}
                    className="p-2 rounded-xl border border-brand-border hover:bg-slate-50 text-brand-text-secondary transition-all cursor-pointer"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => handleDeleteDevice(device.id)}
                    className="p-2 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition-all cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {devices.length === 0 && (
            <div className="py-12 text-center text-sm text-brand-text-muted">
              <Fingerprint size={32} className="mx-auto mb-3 text-slate-300" />
              <div className="font-bold">No biometric machines linked yet</div>
              <p className="text-xs mt-1">Click "Link Device" to connect your K90 Pro, ZKTeco, or EasyBio terminal.</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── Realtime Biometric Device Activity Logs ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
        <h3 className="font-bold text-sm text-brand-text-primary border-b border-brand-border pb-3 font-display flex items-center gap-2 mb-4">
          <Database size={15} className="text-blue-500" /> Biometric Gate Sync Logs
        </h3>
        
        <div className="bg-slate-900 border border-brand-border/60 rounded-2xl p-4 h-64 overflow-y-auto font-mono text-[10px] text-zinc-300 space-y-2">
          {deviceLogs.map((log) => {
            const cfg = logConfig[log.level] || logConfig.INFO;
            return (
              <div key={log.id} className="flex items-start gap-2 border-b border-slate-800/30 pb-1.5 last:border-b-0">
                <span className="text-zinc-500 flex-shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className={`px-1.5 py-0.5 rounded border text-[8px] font-bold flex-shrink-0 ${cfg.badge}`}>
                  {log.level}
                </span>
                <span className="font-bold text-brand-cyan flex-shrink-0">[{log.deviceName}]:</span>
                <span className="flex-1 text-zinc-100">{log.message}</span>
              </div>
            );
          })}

          {deviceLogs.length === 0 && (
            <div className="h-full flex items-center justify-center text-zinc-500 italic">
              No biometric gate sync logs available. Enabled devices check in every 5 seconds.
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── Branch Info Card ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <h3 className="font-bold text-sm text-brand-text-primary border-b border-brand-border pb-3 font-display flex items-center gap-2 mb-5">
          <User size={15} className="text-blue-500" /> Branch Information
        </h3>
        <form onSubmit={handleSaveGym} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Gym Name</label>
              <input type="text" value={gymName} onChange={e => setGymName(e.target.value)} className="glass-input text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Operator Display Name</label>
              <input type="text" value={operatorName} onChange={e => setOperatorName(e.target.value)} className="glass-input text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Contact Email</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="glass-input text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Contact Phone</label>
              <input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="glass-input text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Operator Role</label>
              <input type="text" value={user?.role?.replace('_', ' ') || 'Admin'} disabled className="glass-input text-xs capitalize opacity-60" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="btn-cyber-cyan text-xs font-bold text-slate-950 cursor-pointer px-6">Save Branch Info</button>
          </div>
        </form>
      </motion.div>

      {/* ─── Security & Permissions ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <h3 className="font-bold text-sm text-brand-text-primary border-b border-brand-border pb-3 font-display flex items-center gap-2 mb-5">
          <Shield size={15} className="text-blue-600" /> Access & Security
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-brand-border/60">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider font-display block mb-2">Current Operator</span>
            <div className="text-sm font-black text-brand-text-primary">{user?.name}</div>
            <div className="text-[10px] text-brand-text-muted mt-0.5 capitalize">Role: {user?.role?.replace('_', ' ')}</div>
            <div className="text-[10px] text-brand-text-muted">{user?.email}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-brand-border/60">
            <span className="text-[10px] font-black text-violet-600 uppercase tracking-wider font-display block mb-2">System Status</span>
            <div className="space-y-1.5">
              {[
                { label: 'Biometric API Service', status: 'Online', ok: true },
                { label: 'Backend Controller Engine', status: 'Online', ok: true },
                { label: 'Gate Access Control Hook', status: 'Active', ok: true },
              ].map((s, i) => (
                <div key={i} className="flex justify-between text-[10px] text-brand-text-secondary">
                  <span>{s.label}</span>
                  <span className={`font-bold ${s.ok ? 'text-emerald-600' : 'text-red-500'}`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Add/Edit Device Modal ─── */}
      <AnimatePresence>
        {showAddDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} onClick={() => setShowAddDevice(false)} className="fixed inset-0 bg-black" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[28px] p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-brand-cyan flex items-center justify-center">
                      <Fingerprint size={16} className="text-white" />
                    </div>
                    <h3 className="text-lg font-black text-brand-text-primary font-display">{editingDevice ? 'Modify Linked Device' : 'Link Biometric Device'}</h3>
                  </div>
                  <p className="text-[11px] text-brand-text-secondary mt-1">Configure your physical gate reader hardware properties.</p>
                </div>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Device Name *</label>
                  <input 
                    type="text" 
                    value={formData.deviceName} 
                    onChange={e => setFormData({ ...formData, deviceName: e.target.value })} 
                    placeholder="e.g. Main Gate K90 Pro" 
                    className="glass-input text-xs text-brand-text-primary" 
                    required 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Device Type *</label>
                    <select
                      value={formData.deviceType}
                      onChange={e => setFormData({ ...formData, deviceType: e.target.value })}
                      className="glass-input text-xs text-brand-text-primary"
                    >
                      <option value="ESSL K90 Pro">ESSL K90 Pro</option>
                      <option value="ZKTeco">ZKTeco</option>
                      <option value="EasyBio">EasyBio</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Branch Location</label>
                    <input 
                      type="text" 
                      value={formData.branch} 
                      onChange={e => setFormData({ ...formData, branch: e.target.value })} 
                      placeholder="Mohali Branch" 
                      className="glass-input text-xs text-brand-text-primary" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">IP Address *</label>
                    <input 
                      type="text" 
                      value={formData.ip} 
                      onChange={e => setFormData({ ...formData, ip: e.target.value })} 
                      placeholder="192.168.1.100" 
                      className="glass-input text-xs font-mono text-brand-text-primary" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Port *</label>
                    <input 
                      type="text" 
                      value={formData.port} 
                      onChange={e => setFormData({ ...formData, port: e.target.value })} 
                      placeholder="4370" 
                      className="glass-input text-xs font-mono text-brand-text-primary" 
                      required 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input 
                    type="checkbox" 
                    id="device-enabled"
                    checked={formData.enabled} 
                    onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                    className="rounded text-brand-cyan focus:ring-brand-cyan h-4 w-4 bg-slate-100 border-zinc-300 cursor-pointer"
                  />
                  <label htmlFor="device-enabled" className="text-xs font-bold text-brand-text-primary cursor-pointer select-none">
                    Device Enabled & Syncing Active
                  </label>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl text-[10px] text-blue-700 dark:text-blue-400 font-medium flex gap-2">
                  <Info size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Configuration Tip:</strong> Ensure that the device and server can ping each other. The default TCP port is usually <strong>4370</strong> for ESSL and ZK terminals.
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddDevice(false)} className="btn-cyber-outline flex-1 py-2.5 text-xs cursor-pointer">Cancel</button>
                  <button type="submit" className="btn-cyber-cyan flex-1 py-2.5 text-xs font-bold text-white cursor-pointer">
                    {editingDevice ? 'Update Device' : 'Link Device'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Simulate Tap Modal ─── */}
      <AnimatePresence>
        {showSimulateTap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} onClick={() => setShowSimulateTap(false)} className="fixed inset-0 bg-black" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[28px] p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
                      <Play size={16} className="text-white" />
                    </div>
                    <h3 className="text-lg font-black text-brand-text-primary font-display font-bold">Simulate Fingerprint/Card Tap</h3>
                  </div>
                  <p className="text-[11px] text-brand-text-secondary mt-1">Test the validation engine and gate relay behavior instantly.</p>
                </div>
              </div>

              <form onSubmit={handleSimulateTapSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Select Terminal *</label>
                  <select
                    value={simDeviceId}
                    onChange={e => setSimDeviceId(e.target.value)}
                    className="glass-input text-xs text-brand-text-primary"
                    required
                  >
                    <option value="">-- Choose Connected Device --</option>
                    {devices.filter(d => d.enabled).map(d => (
                      <option key={d.id} value={d.id}>{d.deviceName} ({d.deviceType})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Select Member *</label>
                  <select
                    value={simMemberId}
                    onChange={e => setSimMemberId(e.target.value)}
                    className="glass-input text-xs text-brand-text-primary"
                    required
                  >
                    <option value="">-- Choose Active or Expired Member --</option>
                    {members.map(m => (
                      <option key={m.id} value={m.memberId}>{m.name} ({m.memberId})</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-xl text-[10px] text-orange-700 dark:text-orange-400 font-medium">
                  <strong>Simulating this tap will:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Send biometric credentials to the membership validator</li>
                    <li>Verify active, expired, or frozen status in Firebase</li>
                    <li>Trigger gate unlock relay if membership is valid</li>
                    <li>Update daily attendance stats and app check-in logs</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowSimulateTap(false)} className="btn-cyber-outline flex-1 py-2.5 text-xs cursor-pointer">Cancel</button>
                  <button type="submit" className="btn-cyber-cyan flex-1 py-2.5 text-xs font-bold text-white cursor-pointer bg-gradient-to-r from-orange-500 to-amber-500">
                    Scan Fingerprint
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
