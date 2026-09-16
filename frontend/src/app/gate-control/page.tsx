'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Unlock, CheckCircle2, AlertTriangle, RefreshCw, Server, Cpu, Wifi, ArrowLeft } from 'lucide-react';
import API from '@/services/api';

export default function GateControlPage() {
  const [deviceIp, setDeviceIp] = useState('192.168.18.11');
  const [devicePort, setDevicePort] = useState('4370');
  const [serverIp, setServerIp] = useState('Localhost');
  const [serverPort, setServerPort] = useState('8000');
  const [accessUrl, setAccessUrl] = useState('http://192.168.18.11:8000/gate-control');
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);

  // Gate execution states
  const [isOpening, setIsOpening] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    title: string;
    message: string;
    timestamp: string;
    deviceIp: string;
  } | null>(null);

  // Fetch gate & server status
  const fetchStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await API.get('/gate/status');
      if (res.data) {
        setDeviceIp(res.data.ip || '192.168.18.11');
        setDevicePort(res.data.port || '4370');
        setServerIp(res.data.serverIp || window.location.hostname);
        setServerPort(res.data.serverPort || window.location.port || '8000');
        setAccessUrl(res.data.accessUrl || `http://${window.location.hostname}:${window.location.port || '8000'}/gate-control`);
        setIsConnected(res.data.connected !== false);
      }
    } catch (err) {
      console.warn('[Gate Control] Status probe notice:', err);
      setIsConnected(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle Open Gate Button Click
  const handleOpenGate = async () => {
    if (isOpening) return;

    setIsOpening(true);
    setLastResult(null);

    const startTime = new Date().toLocaleTimeString('en-IN', { hour12: false });

    console.log('[GATE] Request received');
    console.log(`[GATE] Device IP = ${deviceIp}`);
    console.log('[GATE] Calling existing door-open function');

    try {
      const res = await API.post('/gate/open', {
        deviceId: 'dev_k90_main',
        source: 'LAN_WEB_INTERFACE'
      });

      console.log('[GATE] Device response =', res.data);

      if (res.data && res.data.success) {
        console.log('[GATE] SUCCESS');
        setLastResult({
          success: true,
          title: '✓ GATE OPENED',
          message: res.data.message || 'Door unlocked',
          timestamp: res.data.timestamp || startTime,
          deviceIp: res.data.deviceIp || deviceIp,
        });
      } else {
        console.log('[GATE] FAILURE');
        setLastResult({
          success: false,
          title: '✕ GATE OPEN FAILED',
          message: res.data?.message || 'Physical device relay did not unlock',
          timestamp: startTime,
          deviceIp,
        });
      }
    } catch (err: any) {
      console.error('[GATE] FAILURE:', err?.response?.data || err?.message);
      const errorMsg = err?.response?.data?.message || err?.message || 'Device communication error';
      setLastResult({
        success: false,
        title: '✕ GATE OPEN FAILED',
        message: errorMsg,
        timestamp: startTime,
        deviceIp,
      });
    } finally {
      // Cooldown timer (3 seconds double-click protection)
      setTimeout(() => {
        setIsOpening(false);
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* BACKGROUND DECORATIVE GLOWS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg space-y-5 z-10">

        {/* PAGE HEADER */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 text-center shadow-2xl space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-1 shadow-inner">
            <Shield size={28} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">
            ALPHA ZONE GYM
          </h1>
          <p className="text-xs font-bold text-blue-400 tracking-widest uppercase">
            EasyBio Local Gate Control
          </p>
        </div>

        {/* STATUS CARDS GRID */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* 1. SERVER STATUS CARD */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Server size={14} className="text-blue-400" /> Server
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-extrabold bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-slate-200">
                IP: {serverIp}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Port: {serverPort}
              </div>
            </div>
          </div>

          {/* 2. EASYBIO DEVICE CARD */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Cpu size={14} className="text-purple-400" /> EasyBio Device
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                isConnected
                  ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50'
                  : 'text-amber-400 bg-amber-950/60 border-amber-800/50'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {isConnected ? 'CONNECTED' : 'OFFLINE'}
              </span>
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-slate-200">
                {deviceIp}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Port: {devicePort}
              </div>
            </div>
          </div>

        </div>

        {/* PRIMARY OPEN GATE CONTROLLER BOX */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 text-center shadow-2xl space-y-6">

          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Physical Gate Actuator
            </h2>
            <p className="text-xs text-slate-500">
              Sends direct hardware relay unlock command to EasyBio ({deviceIp})
            </p>
          </div>

          {/* MAIN OPEN GATE BUTTON */}
          <button
            onClick={handleOpenGate}
            disabled={isOpening}
            className={`w-full py-8 px-6 rounded-2xl font-black text-xl tracking-wide uppercase shadow-2xl transition-all duration-200 border-none cursor-pointer flex flex-col items-center justify-center gap-3 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
              isOpening
                ? 'bg-amber-600 text-white shadow-amber-900/40 animate-pulse'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/50'
            }`}
          >
            <div className={`w-16 h-16 rounded-full bg-white/10 flex items-center justify-center ${isOpening ? 'animate-spin' : ''}`}>
              <Unlock size={36} />
            </div>
            <span>
              {isOpening ? 'Opening Gate...' : '🔓 OPEN GATE'}
            </span>
          </button>

          {/* STATUS / RESULT DISPLAY PANEL */}
          {lastResult && (
            <div className={`p-4 rounded-2xl text-left border space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
              lastResult.success
                ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-600/40 text-rose-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-sm flex items-center gap-2">
                  {lastResult.success ? (
                    <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />
                  ) : (
                    <AlertTriangle className="text-rose-400 shrink-0" size={18} />
                  )}
                  {lastResult.title}
                </div>
                <span className="font-mono text-[11px] opacity-75">
                  {lastResult.timestamp}
                </span>
              </div>
              <div className="text-xs opacity-90 pl-6 font-medium">
                {lastResult.message}
              </div>
              <div className="text-[10px] opacity-60 font-mono pl-6 pt-1">
                Device Target: {lastResult.deviceIp}
              </div>
            </div>
          )}

          {!lastResult && (
            <div className="text-xs text-slate-600 font-mono py-1">
              Last Action: —
            </div>
          )}

        </div>

        {/* FOOTER & ACCESS URL */}
        <div className="text-center text-[11px] text-slate-500 font-mono space-y-1">
          <div>Gym LAN Access URL: <span className="text-blue-400 font-bold">{accessUrl}</span></div>
          <div>Target Hardware: EasyBio {deviceIp}:{devicePort}</div>
        </div>

      </div>

    </div>
  );
}
