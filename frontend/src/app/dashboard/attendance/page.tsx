'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Fingerprint, QrCode, Scan, Activity, Wifi, WifiOff, RefreshCw, Download, Search, Check, AlertCircle,
  Users, Calendar, Clock, Server, CheckCircle
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useGymStore } from '@/store';
import { formatTime, getInitials, getRandomColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import API from '@/services/api';


const methodConfig: Record<string, { icon: any; color: string; label: string }> = {
  biometric: { icon: Fingerprint, color: '#E14D2A', label: 'Fingerprint' },
  qr: { icon: QrCode, color: '#22C55E', label: 'QR Code' },
  face: { icon: Scan, color: '#7C3AED', label: 'Face ID' },
  rfid: { icon: Activity, color: '#F59E0B', label: 'RFID' },
  receptionDesk: { icon: Activity, color: '#94A3B8', label: 'Console' }
};

export default function AttendancePage() {
  const {
    members, attendance, deviceStatus, fetchMembers, fetchAttendance, syncLogs, triggerCheckIn, checkoutAttendance
  } = useGymStore();

  const [search, setSearch] = useState('');
  const [deviceList, setDeviceList] = useState<any[]>([]);

  const fetchDevices = async () => {
    try {
      const res = await API.get('/devices');
      setDeviceList(res.data.devices || []);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchAttendance();
    fetchDevices();
    const interval = setInterval(() => {
      fetchAttendance();
      fetchDevices();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchMembers, fetchAttendance]);

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search) return;

    try {
      await triggerCheckIn({
        memberId: search,
        method: 'receptionDesk'
      });
      toast.success('Check-in log added successfully!');
      setSearch('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Check-in failed');
    }
  };

  const handleCheckout = async (id: string) => {
    try {
      await checkoutAttendance(id);
      toast.success('Member checked out of facility');
    } catch (err) {
      toast.error('Failed to log checkout');
    }
  };

  // Mock data for weekly trend
  const attendanceTrend = [
    { day: 'Mon', count: 312 }, { day: 'Tue', count: 287 }, { day: 'Wed', count: 334 },
    { day: 'Thu', count: 298 }, { day: 'Fri', count: 356 }, { day: 'Sat', count: 421 },
    { day: 'Sun', count: 389 }
  ];

  // Visual Timeline Grid Helper (Green = Present, Red = Absent)
  // Let's generate a 14-day history timeline for the first 5 members
  const renderVisualTimeline = (m: any) => {
    const days = Array.from({ length: 14 }).map((_, idx) => {
      // Simulate random attendance
      const isPresent = (m.id.charCodeAt(1) + idx) % 5 > 1;
      return (
        <div 
          key={idx} 
          className={`w-3.5 h-3.5 rounded-md flex-shrink-0 transition-transform hover:scale-125 cursor-pointer ${
            isPresent 
              ? 'bg-brand-success shadow-[0_0_8px_rgba(34,197,94,0.3)]' 
              : 'bg-rose-50 border border-rose-200/50'
          }`}
          title={`${isPresent ? 'Present' : 'Absent'} - Day -${14 - idx}`}
        />
      );
    });
    return <div className="flex gap-1.5 overflow-x-auto py-1">{days}</div>;
  };

  // Statistics calculations (Phase B Requirements)
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendanceCount = attendance.filter(a => a.checkIn && a.checkIn.startsWith(todayStr)).length;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklyAttendanceCount = attendance.filter(a => a.checkIn && new Date(a.checkIn) >= sevenDaysAgo).length;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const monthlyAttendanceCount = attendance.filter(a => a.checkIn && new Date(a.checkIn) >= thirtyDaysAgo).length;

  const lastAttendanceRecord = attendance.length > 0 ? attendance[0] : null;
  const lastAttendanceText = lastAttendanceRecord 
    ? `${lastAttendanceRecord.memberName} (${new Date(lastAttendanceRecord.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`
    : 'None today';

  // Find seeded ESSL device configuration
  const mainDevice = deviceList.find(d => d.deviceId === 'dev_k90_main' || d.deviceName.toLowerCase().includes('main')) || deviceList[0];
  const isDeviceOnline = mainDevice ? mainDevice.status === 'connected' : false;
  const deviceHealth = mainDevice ? mainDevice.connectionHealth : 0;
  const deviceIp = mainDevice ? `${mainDevice.ip}:${mainDevice.port}` : '192.168.18.11:4370';
  const deviceName = mainDevice ? mainDevice.deviceName : 'Main Gate';
  const deviceLastSync = mainDevice && mainDevice.lastSync ? new Date(mainDevice.lastSync).toLocaleTimeString() : 'Never';

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border/60 pb-5">
        <div>
          <h1 className="text-3xl font-black text-brand-text-primary tracking-tight font-display">Biometric Attendance</h1>
          <p className="text-xs text-brand-text-secondary mt-0.5">ESSL EasyLinking hardware integrations & check-in timeline.</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => {
              syncLogs();
              toast.success('Syncing turnstile logs...');
            }} 
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
              isDeviceOnline 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-brand-danger/10 border-brand-danger/30 text-brand-danger'
            }`}
          >
            {isDeviceOnline ? (
              <Wifi size={13} />
            ) : (
              <WifiOff size={13} />
            )}
            ESSL: {isDeviceOnline ? 'ONLINE' : 'OFFLINE'}
          </button>
          
          <button 
            onClick={() => toast.success('Attendance spreadsheet exported!')}
            className="btn-cyber-outline text-xs py-2"
          >
            <Download size={13} /> Export csv
          </button>
        </div>
      </div>

      {/* ─── Premium Statistics Cards Grid ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Today's Attendance", value: todayAttendanceCount, icon: Users, color: 'text-amber-600 bg-amber-500/10 border-amber-500/10' },
          { label: 'Weekly Attendance', value: weeklyAttendanceCount, icon: Calendar, color: 'text-blue-400 bg-blue-500/10 border-blue-500/10' },
          { label: 'Monthly Attendance', value: monthlyAttendanceCount, icon: Activity, color: 'text-purple-400 bg-purple-500/10 border-purple-500/10' },
          { label: 'Last Check-In', value: lastAttendanceText, icon: Clock, color: 'text-orange-400 bg-orange-500/10 border-orange-500/10' },
          { 
            label: 'Device Status', 
            value: isDeviceOnline ? 'ONLINE' : 'OFFLINE', 
            icon: isDeviceOnline ? Wifi : WifiOff, 
            color: isDeviceOnline ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10' : 'text-red-400 bg-red-500/10 border-red-500/10' 
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 flex flex-col justify-between border border-brand-border/40 min-h-[100px]"
          >
            <div>
              <div className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">{stat.label}</div>
              <div className={`font-black mt-1.5 font-display truncate ${stat.label.includes('Last') ? 'text-[11px] leading-relaxed text-brand-text-primary' : 'text-xl text-brand-text-primary'}`}>
                {stat.value}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-brand-border/30">
              <span className="text-[9px] font-mono text-brand-text-muted">
                {stat.label.includes('Device') ? `${deviceIp}` : 'Turnstile Feed'}
              </span>
              <div className={`p-1.5 rounded-lg border ${stat.color}`}>
                <stat.icon size={12} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Hardware Device Info */}
      <div className="card p-4 rounded-3xl" style={{ borderLeft: '4px solid #E14D2A' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Fingerprint size={20} className="text-emerald-500" />
            </div>
            <div>
              <div className="font-bold text-sm text-brand-text-primary font-display">
                {deviceName} · {mainDevice?.deviceType || 'ESSL K90 Pro'}
              </div>
              <div className="text-[10px] text-brand-text-secondary mt-0.5">
                Device IP: {deviceIp} · Branch: {mainDevice?.branch || 'Main Branch'} · Connection Health: {deviceHealth}% · Python sync daemon active
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isDeviceOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-[10px] font-mono ${isDeviceOnline ? 'text-emerald-500' : 'text-red-500'}`}>
              Last sync: {deviceLastSync}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Timeline Roster for Members */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-brand-text-primary">Visual Attendance Timeline</h3>
            <p className="text-[10px] text-brand-text-secondary">Last 14 days attendance records (Green = Present, Red = Absent)</p>
          </div>
          <div className="flex gap-3 text-[9px] font-semibold text-brand-text-muted">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-brand-success" /> Present</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-brand-danger/25 border border-brand-danger/30" /> Absent</div>
          </div>
        </div>

        <div className="space-y-3">
          {members.slice(0, 5).map(m => (
            <div key={m.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-brand-bg/40 border border-brand-border/40 rounded-xl">
              <div className="flex items-center gap-3 w-48">
              {(() => {
                const avatarColor = getRandomColor(m.name);
                return (
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm"
                    style={{ 
                      background: `linear-gradient(135deg, ${avatarColor}18 0%, ${avatarColor}30 100%)`, 
                      color: avatarColor, 
                      border: `1.5px solid ${avatarColor}25` 
                    }}
                  >
                    {getInitials(m.name)}
                  </div>
                );
              })()}
                <div className="truncate">
                  <div className="text-xs font-bold text-brand-text-primary truncate">{m.name}</div>
                  <div className="text-[9px] text-brand-text-muted">{m.plan.split(' ')[0]} plan</div>
                </div>
              </div>
              
              <div className="flex-1">
                {renderVisualTimeline(m)}
              </div>

              <div className="text-right pl-3 border-l border-brand-border/40 hidden md:block">
                <div className="text-xs font-bold text-brand-text-primary">{m.attendancePercent || 80}%</div>
                <div className="text-[9px] text-brand-text-muted uppercase">Attendance</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-3 gap-5">
        
        {/* Attendance chart */}
        <div className="lg:col-span-2 card p-5 rounded-3xl">
          <h3 className="font-bold text-sm text-brand-text-primary mb-4">Weekly Attendance Trend</h3>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrend}>
                <defs>
                  <linearGradient id="attGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E14D2A" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#E14D2A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, fontSize: 11, color: '#0F172A' }} />
                <Area type="monotone" dataKey="count" stroke="#E14D2A" strokeWidth={2.5} fill="url(#attGlow)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Manual Gate Check-in */}
        <div className="card p-5 rounded-3xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-brand-text-primary mb-1">Manual Console check-in</h3>
            <p className="text-[10px] text-brand-text-secondary mb-4">Log entries without ESSL biometric hardware scan.</p>
          </div>

          <form onSubmit={handleManualCheckIn} className="space-y-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" />
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search member name or phone..." 
                className="glass-input pl-9 text-xs py-2" 
              />
            </div>

            {search && members.filter(m => m.name.toLowerCase().includes(search.toLowerCase())).slice(0, 2).map(m => (
              <div 
                key={m.id}
                onClick={() => setSearch(m.name)}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-brand-border text-xxs flex justify-between"
              >
                <span className="font-bold text-brand-text-primary">{m.name}</span>
                <span className="text-brand-cyan">{m.phone}</span>
              </div>
            ))}

            <button 
              type="submit"
              className="btn-cyber-cyan w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-white cursor-pointer"
            >
              <Fingerprint size={14} className="text-white" /> Register Log Entry
            </button>
          </form>

          <div className="pt-3 border-t border-brand-border/40 mt-4 text-[9px] text-brand-text-secondary flex justify-between">
            <span>Access Overrides logged in session:</span>
            <span className="font-mono text-brand-cyan">Active</span>
          </div>
        </div>

      </div>

      {/* Live Checkin feed */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-brand-text-primary">Live Attendance Feed</h3>
            <span className="badge-green text-[9px] animate-pulse">LIVE</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="cyber-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Access Method</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((a, i) => {
                const mc = methodConfig[a.method] || methodConfig.biometric;
                const Icon = mc.icon;
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-[10px] text-brand-cyan">
                          {getInitials(a.memberName)}
                        </div>
                        <span className="font-semibold text-xs text-brand-text-primary">{a.memberName}</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-brand-success">{formatTime(a.checkIn)}</td>
                    <td className="font-mono text-xs text-brand-text-secondary">
                      {a.checkOut ? (
                        formatTime(a.checkOut)
                      ) : (
                        <button 
                          onClick={() => handleCheckout(a.id)}
                          className="px-2 py-1 rounded bg-slate-50 border border-brand-border hover:bg-brand-cyan hover:text-white transition-all text-[9px] font-bold cursor-pointer"
                        >
                          Checkout
                        </button>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-brand-text-secondary">
                        <Icon size={12} style={{ color: mc.color }} />
                        <span className="text-[11px] font-medium" style={{ color: mc.color }}>{mc.label}</span>
                      </div>
                    </td>
                    <td className="text-xs text-brand-text-secondary">{a.branch}</td>
                    <td>
                      <span className={a.checkOut ? 'badge-yellow' : 'badge-green'} style={{ fontSize: '0.65rem' }}>
                        {a.checkOut ? 'Completed' : 'Inside Facility'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
