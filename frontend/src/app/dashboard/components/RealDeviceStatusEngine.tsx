'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi, Cpu, Database, Activity, Shield, Unlock, Lock,
  AlertTriangle, RefreshCw, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { useDeviceStore } from '@/store';

/**
 * Top Header 6-Pill Health Status Component
 */
export function RealDeviceHeaderBadges() {
  const {
    internetStatus,
    pythonStatus,
    firebaseStatus,
    esslStatus,
    attendanceListenerStatus,
    gateStatus,
    isDeviceFullyOnline,
    checkRealDeviceHealth
  } = useDeviceStore();

  useEffect(() => {
    checkRealDeviceHealth();
    const interval = setInterval(() => {
      checkRealDeviceHealth();
    }, 5000);
    return () => clearInterval(interval);
  }, [checkRealDeviceHealth]);

  const items = [
    { label: 'Internet', status: internetStatus, icon: Wifi },
    { label: 'Python', status: pythonStatus, icon: Cpu },
    { label: 'Firebase', status: firebaseStatus, icon: Database },
    { label: 'ESSL Hardware', status: esslStatus, icon: Activity },
    { label: 'Listener', status: attendanceListenerStatus, icon: Clock },
    { label: 'Gate Control', status: gateStatus, icon: gateStatus === 'enabled' ? Unlock : Lock }
  ];

  const getStatusColor = (status: string) => {
    if (status === 'online' || status === 'connected' || status === 'listening' || status === 'enabled') {
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-300';
    }
    if (status === 'connecting' || status === 'syncing') {
      return 'bg-amber-500/10 text-amber-700 border-amber-300 animate-pulse';
    }
    return 'bg-red-500/10 text-red-700 border-red-300';
  };

  const getDotColor = (status: string) => {
    if (status === 'online' || status === 'connected' || status === 'listening' || status === 'enabled') {
      return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
    }
    if (status === 'connecting' || status === 'syncing') {
      return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]';
    }
    return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-wider ${getStatusColor(
            item.status
          )}`}
        >
          <span className={`w-2 h-2 rounded-full ${getDotColor(item.status)}`} />
          <item.icon size={11} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Sticky Red Disconnect Banner (shows when offline or disconnected)
 */
export function RealDeviceDisconnectBanner() {
  const { isDeviceFullyOnline, checkRealDeviceHealth } = useDeviceStore();

  if (isDeviceFullyOnline) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="w-full bg-red-600 text-white px-4 py-2.5 rounded-2xl shadow-lg border border-red-700 flex items-center justify-between gap-3 text-xs font-bold font-poppins"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 animate-spin">
            <RefreshCw size={14} className="text-white" />
          </div>
          <div>
            <span className="font-extrabold uppercase tracking-wide">Biometric Device Disconnected</span>
            <span className="opacity-90 ml-2 text-[11px] font-normal">
              Attendance listener paused & gate control disabled. Retrying health probe every 5s...
            </span>
          </div>
        </div>

        <button
          onClick={() => checkRealDeviceHealth()}
          className="px-3 py-1 bg-white text-red-700 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-50 transition-all cursor-pointer border-none shadow-sm"
        >
          Retry Probe
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Reusable ESSL Device Status Card Widget
 */
export default function RealDeviceStatusCard() {
  const {
    esslStatus,
    pythonStatus,
    isDeviceFullyOnline,
    lastHeartbeat,
    latencyMs,
    eventsTodayCount,
    checkRealDeviceHealth
  } = useDeviceStore();

  const getHeartbeatAge = () => {
    if (!lastHeartbeat) return 'N/A';
    const hb = new Date(lastHeartbeat).getTime();
    if (isNaN(hb)) return 'N/A';
    const seconds = Math.max(0, Math.round((Date.now() - hb) / 1000));
    return `${seconds}s ago`;
  };

  return (
    <div className="bg-white p-5 rounded-[26px] border border-slate-200 shadow-sm space-y-4 font-poppins">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isDeviceFullyOnline
                ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                : esslStatus === 'connecting'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
            }`}
          />
          <h4 className="text-sm font-black text-slate-900 font-display uppercase tracking-wide">
            ESSL K90 Pro Device
          </h4>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
            isDeviceFullyOnline
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : esslStatus === 'connecting'
              ? 'bg-amber-100 text-amber-800 border-amber-200'
              : 'bg-red-100 text-red-800 border-red-200'
          }`}
        >
          {isDeviceFullyOnline ? '🟢 Connected' : esslStatus === 'connecting' ? '🟡 Connecting' : '🔴 Offline'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">IP Address</span>
          <span className="font-mono font-bold text-slate-800">192.168.18.11</span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Latency</span>
          <span className="font-mono font-bold text-slate-800">{isDeviceFullyOnline ? `${latencyMs}ms` : 'Offline'}</span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Last Heartbeat</span>
          <span className="font-mono font-bold text-slate-800">{getHeartbeatAge()}</span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Events Today</span>
          <span className="font-mono font-bold text-emerald-600">{eventsTodayCount} Check-ins</span>
        </div>
      </div>
    </div>
  );
}
