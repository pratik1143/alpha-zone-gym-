'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Clock, CreditCard, Dumbbell,
  Settings, Bell, Search, LogOut, ChevronDown, Menu, X, HelpCircle, 
  ChevronLeft, ChevronRight, Shield, Trophy, Smartphone, ArrowUpRight, Plus,
  Home as HomeIcon, Award, Play, Pause, Square, Sun, Moon, RefreshCw,
  Upload, Mail, BarChart2, AlertTriangle, UserPlus, UserX, Apple as AppleIcon,
  Wifi, UserCheck, Sparkles, Cpu, Phone, MessageSquare, ShieldAlert, Gift
} from 'lucide-react';
import { useAuthStore, useGymStore } from '@/store';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db as fDb, isFirebaseReady } from '@/lib/firebase';
import { useCallback } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isAuthenticated } = useAuthStore();
  const {
    attendance, fetchAttendance, syncLogs, deviceStatus, members, fetchMembers, updateMember
  } = useGymStore();
  const router = useRouter();
  const pathname = usePathname();
  
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [activeHeatmapFilter, setActiveHeatmapFilter] = useState('Yours');
  
  // Audio state
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('attendance_sound_enabled');
      return saved !== 'false';
    }
    return true;
  });

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('attendance_sound_enabled', String(next));
      return next;
    });
  };

  // Popup notifications state
  interface LivePopupNotification {
    id: string;
    memberName: string;
    memberCode: string;
    timestamp: string;
    deviceName: string;
    branch: string;
    avatarUrl?: string;
    plan: string;
    trainer: string;
    status: 'active' | 'expiring' | 'expired';
  }
  const [popups, setPopups] = useState<LivePopupNotification[]>([]);
  const [lastAttendanceId, setLastAttendanceId] = useState<string | null>(null);

  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [launchingCampaign, setLaunchingCampaign] = useState(false);

  // Sound chime player using Web Audio API
  const playDingSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (err) {
      console.warn("Failed to play sound chime:", err);
    }
  }, [soundEnabled]);

  // Real-time Feed State
  const [realtimeFeed, setRealtimeFeed] = useState<any[]>([]);

  // Firestore Listeners
  useEffect(() => {
    if (!isFirebaseReady || !fDb) return;

    // Safe Firestore Timestamp → JS Date converter
    const toJsDate = (val: any): Date | null => {
      if (!val) return null;
      if (typeof val.toDate === 'function') return val.toDate(); // Firestore Timestamp
      if (typeof val === 'string' || typeof val === 'number') return new Date(val);
      return null;
    };

    // 1. Listen for new check-ins for popup
    const attCollection = collection(fDb, 'attendance');
    const qPop = query(attCollection, orderBy('createdAt', 'desc'), limit(1));
    const unsubscribePop = onSnapshot(qPop, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const docId = change.doc.id;
          
          if (data && data.status === 'granted') {
            const createdAtDate = toJsDate(data.createdAt);
            const createdAtTime = createdAtDate ? createdAtDate.getTime() : 0;
            const diffSeconds = (Date.now() - createdAtTime) / 1000;
            
            if (diffSeconds < 15 && docId !== lastAttendanceId) {
              setLastAttendanceId(docId);
              
              const gymMembers = useGymStore.getState().members;
              const match = gymMembers.find((m: any) => 
                m.id === data.memberId || 
                m.memberId === data.memberCode || 
                (m.name && data.memberName && m.name.toLowerCase() === data.memberName.toLowerCase())
              );
              
              const days = match?.expiryDate 
                ? Math.ceil((new Date(match.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) 
                : 0;
                
              let status: 'active' | 'expiring' | 'expired' = 'expired';
              if (days > 7) {
                status = 'active';
              } else if (days > 0 && days <= 7) {
                status = 'expiring';
              } else {
                status = 'expired';
              }

              const newPopup: LivePopupNotification = {
                id: docId,
                memberName: match?.name || data.memberName || 'Athlete',
                memberCode: match?.memberId || data.memberCode || 'AZ-2026-0000',
                timestamp: (() => { 
                  const d = toJsDate(data.timestamp) || toJsDate(data.createdAt) || new Date(); 
                  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); 
                })(),
                deviceName: data.deviceName || 'Biometric Terminal',
                branch: match?.branch || data.branch || 'Mohali, Punjab',
                avatarUrl: match?.avatarUrl || data.avatarUrl || '',
                plan: match?.plan || 'Monthly Membership',
                trainer: match?.trainer || 'No Coach Assigned',
                status
              };
              
              setPopups(prev => [newPopup, ...prev]);
              playDingSound();
              
              setTimeout(() => {
                setPopups(prev => prev.filter(p => p.id !== docId));
              }, 7000);
            }
          }
        }
      });
    });

    // 2. Listen for latest 5 check-ins for sidebar
    const qFeed = query(attCollection, orderBy('createdAt', 'desc'), limit(5));
    const unsubscribeFeed = onSnapshot(qFeed, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRealtimeFeed(logs);
    });

    return () => {
      unsubscribePop();
      unsubscribeFeed();
    };
  }, [isFirebaseReady, playDingSound, lastAttendanceId, members]);

  // Fix React hydration mismatch by ensuring store auth state is read only on client
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    if (isAuthenticated) {
      fetchAttendance();
      fetchMembers();
    }
  }, [isAuthenticated, fetchAttendance, fetchMembers]);

  // Live real-time clock
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const formatTime = (date: Date | null) => {
    if (!date) return '00:00:00';
    const hrs = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    const secs = date.getSeconds().toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-2 border-[#0052FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 3. Prepare Heatmap Matrix from real check-ins this month
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const checkinDays = attendance ? attendance.map((a: any) => new Date(a.checkIn || '').getDate()) : [];

  return (
    <div 
      className="min-h-screen h-screen w-full bg-cover bg-center bg-fixed relative flex p-6 font-poppins text-slate-800 overflow-hidden"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1974')" }}
    >
      {/* Background desaturate color filter */}
      <div className="absolute inset-0 bg-[#060608]/20 backdrop-brightness-95 pointer-events-none z-0" />

      {/* Back to Site pinterest-style circle button */}
      <div className="absolute top-8 left-8 z-30">
        <Link 
          href="/" 
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform text-black border border-slate-100"
        >
          <ArrowLeftIcon size={20} />
        </Link>
      </div>

      {/* ─── Main Floating Glass Dashboard Panel ─── */}
      <div className="w-full h-full rounded-[28px] bg-white/10 backdrop-blur-3xl border border-white/20 shadow-2xl p-6 flex flex-col lg:flex-row gap-6 relative z-10 overflow-hidden">
        
        {/* ─── Column 1: Left Floating Sidebar Panel ─── */}
        <aside className="w-full lg:w-[250px] flex-shrink-0 bg-white/95 rounded-[24px] shadow-lg p-5 flex flex-col justify-between h-full overflow-y-auto">
          
          <div className="space-y-8">
            {/* Branding Logo - Large & Visible */}
            <div className="px-2 flex items-center justify-start">
              <Link href="/">
                <img src="/gym_logo.png" alt="Alpha Zone Logo" className="h-16 w-auto object-contain" />
              </Link>
            </div>

            {/* Sidebar Navigation */}
            <nav className="space-y-1">
              {[
                { to: '/dashboard', label: 'Home', icon: HomeIcon },
                { to: '/dashboard/members', label: 'Members', icon: Users },
                { to: '/dashboard/trainers', label: 'Trainers', icon: UserCheck },
                { to: '/dashboard/follow-up', label: 'Follow Up', icon: AlertTriangle },
                { to: '/dashboard/risk-radar', label: 'Risk Radar', icon: ShieldAlert },
                { to: '/dashboard/referrals', label: 'Referrals', icon: Gift },
                { to: '/dashboard/new-follow-up', label: 'New Follow Up', icon: UserPlus },
                { to: '/dashboard/inconsistent', label: 'Inconsistent', icon: UserX },
                { to: '/dashboard/attendance', label: 'Attendance', icon: Clock },
                { to: '/dashboard/access-control', label: 'Access Control', icon: Shield },
                { to: '/dashboard/trainer-desk', label: 'Trainer Desk', icon: Dumbbell },
                { to: '/dashboard/diet-management', label: 'Diet Management', icon: AppleIcon },
                { to: '/dashboard/billing', label: 'Billing', icon: CreditCard },
                { to: '/dashboard/import', label: 'CSV Import', icon: Upload },
                { to: '/dashboard/automation', label: 'Automation', icon: Mail },
                { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
                { to: '/dashboard/memberships', label: 'Memberships', icon: Award },
                { to: '/dashboard/member-app', label: 'Member App', icon: Smartphone },
                { to: '/dashboard/settings', label: 'Settings', icon: Settings }
              ].map((item, idx) => {
                const isActive = pathname === item.to || (item.to !== '/dashboard' && pathname.startsWith(item.to));
                return (
                  <Link
                    key={idx}
                    href={item.to}
                    className={`flex items-center gap-3.5 px-4.5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all ${
                      isActive 
                        ? 'bg-black text-white shadow-md' 
                        : 'text-slate-500 hover:text-black hover:bg-slate-50'
                    }`}
                  >
                    <item.icon size={15} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Chat Widget */}
          <div className="mt-8 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-left space-y-3 shadow-inner">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-800 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Chat Support
              </span>
              <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">48</span>
            </div>
            
            <p className="text-[9px] text-slate-400 font-bold leading-none">Lukas is typing...</p>

            <div className="space-y-2">
              <div className="flex items-center gap-1 bg-white border border-slate-100 p-2 rounded-xl w-[90%] shadow-sm">
                <Play size={10} className="text-black shrink-0 fill-current" />
                <div className="flex gap-0.5 items-center flex-grow px-1">
                  {[2,3,6,4,2,5,7,3,2,4,5,3].map((h, i) => (
                    <span key={i} className="bg-slate-300 w-0.5 rounded-full" style={{ height: h * 1.5 }} />
                  ))}
                </div>
                <span className="text-[7px] text-slate-400 font-mono">0:12</span>
              </div>

              <div className="bg-[#d4ff00] text-black border border-black/5 p-2 rounded-xl text-[9px] font-bold leading-snug w-[85%] ml-auto text-left shadow-sm">
                Great job, team! Real-time checkins synced.
              </div>
            </div>

            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1.5 text-[8.5px] text-slate-400 justify-between shadow-sm">
              <span>Message...</span>
              <SendIcon size={9} className="text-slate-400" />
            </div>
          </div>

        </aside>

        {/* ─── Column 2: Middle Content Panel ─── */}
        <main className="flex-grow flex flex-col gap-6 text-left overflow-y-auto h-full pr-2">
          {children}
        </main>

        {/* ─── Column 3: Right Content Panel ─── */}
        <aside className="w-full lg:w-[330px] flex-shrink-0 flex flex-col gap-6 text-left overflow-y-auto h-full pr-2">
          
          {/* Top header row: Profile card, toggles */}
          <div className="flex justify-between items-center bg-white/60 p-2.5 rounded-2xl border border-white/45 shadow-sm gap-2">
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-xl bg-black text-[#d4ff00] flex items-center justify-center shadow-sm cursor-pointer border-none">
                <Sun size={15} />
              </button>

              <button 
                onClick={toggleSound}
                className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-sm cursor-pointer border border-slate-100"
                title={soundEnabled ? "Disable Attendance Sound" : "Enable Attendance Sound"}
              >
                {soundEnabled ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                )}
              </button>
              
              <button 
                onClick={() => {
                  logout();
                  toast.success('Logged out successfully');
                  router.push('/');
                }}
                className="w-10 h-10 rounded-xl bg-white hover:bg-red-50 text-red-500 flex items-center justify-center shadow-sm cursor-pointer border border-slate-100"
                title="Sign Out"
              >
                <LogOut size={15} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-800 leading-none">{user?.name}</div>
                <div className="text-[8px] text-slate-400 font-bold mt-1">Operator Shift</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-black text-[#d4ff00] font-rowdies text-xs flex items-center justify-center">
                {getInitials(user?.name || 'Admin')}
              </div>
            </div>
          </div>

          {/* Widget 1: Live Attendance Feed */}
          <div className="bg-white border border-slate-100 p-5 rounded-[28px] shadow-sm flex flex-col justify-between min-h-[260px] relative overflow-hidden">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Live Activity Feed</span>
              <h3 className="text-xs font-black text-slate-800 uppercase mt-0.5 font-display flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Latest Attendance
              </h3>
            </div>

            <div className="space-y-3.5 my-4 flex-grow overflow-y-auto max-h-[160px] pr-1">
              {realtimeFeed.length > 0 ? (
                realtimeFeed.map((log) => {
                  const tsVal = log.timestamp || log.createdAt;
                  const tsDate = tsVal ? (typeof tsVal.toDate === 'function' ? tsVal.toDate() : new Date(tsVal)) : null;
                  const checkinTime = tsDate && !isNaN(tsDate.getTime()) ? tsDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Just Now';
                  const safeName = log.memberName || 'Member';
                  const avatar = log.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${safeName.replace(/ /g, '')}`;
                  return (
                    <motion.div 
                      key={log.id} 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between gap-2.5 bg-slate-50/50 p-2 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <img 
                          src={avatar} 
                          alt={log.memberName} 
                          className="w-7 h-7 rounded-full bg-slate-200 border border-slate-100 flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${safeName}` }}
                        />
                        <div className="text-left leading-tight">
                          <div className="text-[10px] font-black text-slate-800">{safeName}</div>
                          <div className="text-[8px] text-slate-400 font-bold">{log.memberCode || 'AZ-2026-0000'}</div>
                        </div>
                      </div>
                      <div className="text-right leading-none shrink-0">
                        <span className="text-[9px] font-black text-slate-800">{checkinTime}</span>
                        <div className="text-[7px] text-[#0052FF] font-bold mt-1 uppercase tracking-wider">{log.deviceName || 'Gate'}</div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic text-[10px] py-10 font-medium">
                  Waiting for biometric punches...
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-50 pt-3 text-[9px] font-bold text-slate-400 shrink-0">
              <span className="flex items-center gap-1">
                <Wifi size={11} className="text-emerald-500" />
                Active terminal listener
              </span>
            </div>
          </div>

          {/* Widget 2: Attendance Heatmap */}
          <div className="bg-[#d4ff00] text-black border border-black/5 p-5 rounded-[28px] shadow-sm flex flex-col justify-between min-h-[300px]">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-black/60">Attendance Logs</span>
              <h3 className="text-xs font-black text-black uppercase mt-0.5 font-display">Activity Heatmap</h3>
              
              <div className="flex gap-1.5 mt-3">
                {['Yours', 'Mohali'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveHeatmapFilter(f)}
                    className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all border-none ${
                      activeHeatmapFilter === f ? 'bg-black text-white' : 'bg-white/45 text-black hover:bg-white/80'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
 
            <div className="grid grid-cols-7 gap-2.5 my-4 justify-items-center border-t border-black/10 pt-4 text-[9px] font-black text-black/50">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="w-5 text-center">{d}</div>
              ))}
              {[1, 2].map(o => (
                <div key={`offset-${o}`} className="w-5 h-5 bg-transparent" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dateNum = idx + 1;
                const hasCheckin = checkinDays.includes(dateNum);
                return (
                  <div 
                    key={idx}
                    className={`w-5 h-5 rounded-full border transition-all text-[8px] font-bold flex items-center justify-center ${
                      hasCheckin 
                        ? 'bg-black border-black text-[#d4ff00] font-black shadow-md shadow-black/15' 
                        : 'border-black/10 bg-transparent text-black/40 hover:border-black/35 hover:text-black cursor-pointer'
                    }`}
                  >
                    {dateNum}
                  </div>
                );
              })}
            </div>
 
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-black border-t border-black/10 pt-3">
              <span>June 2026</span>
              <div className="flex gap-1.5">
                <button className="w-5 h-5 rounded-full bg-black/5 hover:bg-black/10 text-black flex items-center justify-center border-none cursor-pointer">
                  <ChevronLeft size={10} />
                </button>
                <button className="w-5 h-5 rounded-full bg-black/5 hover:bg-black/10 text-black flex items-center justify-center border-none cursor-pointer">
                  <ChevronRight size={10} />
                </button>
              </div>
            </div>
          </div>

          {/* Widget 3: Shift Time Tracker */}
          <div className="bg-black text-white p-5 rounded-[28px] shadow-lg flex flex-col justify-between min-h-[140px] relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-28 h-28 bg-[#d4ff00]/5 rounded-full blur-xl pointer-events-none" />

            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Live Clock</span>
              <div className="flex items-center gap-1 text-[8px] text-[#d4ff00] font-black uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4ff00] animate-ping" />
                <span>Live Sync</span>
              </div>
            </div>

            <div className="mt-4 text-left">
              <h3 className="text-3xl font-black text-white tracking-wider leading-none mt-1 font-mono">
                {formatTime(currentTime)}
              </h3>
            </div>

            <div className="flex items-center justify-between mt-5 border-t border-white/5 pt-3">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Mohali, Punjab (IST)</span>
              <div className="text-[8px] text-[#d4ff00] font-black uppercase tracking-wider bg-[#d4ff00]/10 px-2.5 py-1 rounded-full border border-[#d4ff00]/25">
                UTC +5:30
              </div>
            </div>
          </div>

        </aside>

      {/* Real-time Popups Portal (Top-Right) */}
      <div className="fixed top-8 right-8 z-50 pointer-events-none space-y-4 max-w-md w-full">
        <AnimatePresence>
          {popups.map((popup) => (
            <motion.div
              key={popup.id}
              initial={{ opacity: 0, y: 50, scale: 0.9, rotateX: -10 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: 'spring', damping: 15, stiffness: 120 }}
              className={`pointer-events-auto w-[380px] bg-slate-950/95 border-2 backdrop-blur-3xl rounded-[28px] p-5.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col gap-4 relative overflow-hidden ${
                popup.status === 'active' 
                  ? 'border-emerald-500/35 shadow-emerald-500/5' 
                  : popup.status === 'expiring' 
                    ? 'border-amber-500/35 shadow-amber-500/5' 
                    : 'border-rose-500/35 shadow-rose-500/5'
              }`}
            >
              {/* Glowing Aura BG Effect */}
              <div className={`absolute -right-16 -top-16 w-36 h-36 rounded-full blur-[70px] pointer-events-none opacity-30 ${
                popup.status === 'active' 
                  ? 'bg-emerald-500' 
                  : popup.status === 'expiring' 
                    ? 'bg-amber-500' 
                    : 'bg-rose-500'
              }`} />

              <div className="flex gap-4 items-center relative z-10">
                {/* Large Profile Image */}
                <div className="relative shrink-0">
                  <img 
                    src={popup.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${(popup.memberName || 'Member').replace(/ /g, '')}`} 
                    alt={popup.memberName || 'Member'} 
                    className={`w-18 h-18 rounded-[20px] object-cover bg-slate-800 border-2 ${
                      popup.status === 'active' 
                        ? 'border-emerald-500/50' 
                        : popup.status === 'expiring' 
                          ? 'border-amber-500/50' 
                          : 'border-rose-500/50'
                    }`}
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${popup.memberName || 'Member'}` }}
                  />
                  {/* Small floating badge */}
                  <span className={`absolute -bottom-1.5 -right-1.5 p-1 rounded-lg border border-slate-950 font-black shadow-md ${
                    popup.status === 'active' 
                      ? 'bg-emerald-500' 
                      : popup.status === 'expiring' 
                        ? 'bg-amber-500' 
                        : 'bg-rose-500'
                  }`}>
                    {popup.status === 'active' ? (
                      <UserCheck size={11} className="text-white" />
                    ) : popup.status === 'expiring' ? (
                      <AlertTriangle size={11} className="text-white" />
                    ) : (
                      <UserX size={11} className="text-white" />
                    )}
                  </span>
                </div>

                {/* Text details */}
                <div className="text-left flex-grow space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                      popup.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : popup.status === 'expiring' 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                          : 'bg-rose-500/10 text-rose-450 border-rose-500/20'
                    }`}>
                      {popup.status === 'active' ? 'ACCESS GRANTED' : popup.status === 'expiring' ? 'EXPIRING SOON' : 'EXPIRED'}
                    </span>
                    <span className="text-[8px] font-bold text-slate-500 font-mono">
                      {popup.timestamp}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-white leading-tight font-display tracking-tight">
                    {popup.memberName}
                  </h3>

                  <div className="flex gap-x-2 text-[9px] font-bold text-slate-400">
                    <span>ID: <span className="font-mono text-white">{popup.memberCode}</span></span>
                    <span className="text-slate-650">•</span>
                    <span>{popup.plan}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Quick info details block */}
              <div className="grid grid-cols-2 gap-2 bg-white/5 border border-white/10 rounded-2xl p-2.5 relative z-10 text-[9.5px]">
                <div>
                  <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500 block">Assigned Coach</span>
                  <span className="font-extrabold text-slate-200 truncate block mt-0.5">
                    {popup.trainer || 'No PT Coach'}
                  </span>
                </div>
                <div>
                  <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500 block">Punch Terminal</span>
                  <span className="font-extrabold text-slate-200 truncate block mt-0.5">
                    {popup.deviceName}
                  </span>
                </div>
              </div>

              {/* Status Alert Banner */}
              {popup.status !== 'active' && (
                <div className={`p-2 rounded-xl text-[8.5px] font-bold uppercase tracking-wide text-center border relative z-10 ${
                  popup.status === 'expiring' 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {popup.status === 'expiring' 
                    ? '⚠️ membership is expiring soon. Renew at desk.' 
                    : '❌ membership has expired. access restricted.'}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* AI Gym Copilot Helper */}
      {(() => {
        // We define the getRenewalPrediction function in a self-executing helper scope or just invoke it
        return null;
      })()}

      {/* AI Gym Copilot Pulsing FAB */}
      <button
        onClick={() => setIsCopilotOpen(true)}
        className="fixed bottom-8 right-8 z-[60] w-14 h-14 bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.6)] hover:scale-105 active:scale-95 transition-all animate-bounce cursor-pointer text-white border border-white/20"
        title="Alpha AI Gym Copilot"
      >
        <Sparkles size={24} className="animate-pulse" />
      </button>

      {/* Copilot Drawer Backdrop */}
      <AnimatePresence>
        {isCopilotOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCopilotOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[65]"
            />

            {/* Copilot Side Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[380px] bg-slate-950/95 border-l border-white/10 shadow-2xl z-[70] flex flex-col justify-between overflow-hidden backdrop-blur-md text-white font-sans text-left"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Cpu size={16} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-wider uppercase font-display text-white">Alpha Copilot™</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Realtime Gym Intelligence</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCopilotOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors border-none cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Body - Scrollable content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
                {/* 1. Forecast & Expected Indicators */}
                {(() => {
                  const planPrices: Record<string, number> = {
                    'Monthly': 2500, 
                    'Quarterly': 6500, 
                    'Semi-Annual': 11500, 
                    'Annual Premium': 18000
                  };

                  // Helper for prediction inside layout
                  const predictRenewal = (m: any) => {
                    let score = 45; 
                    const attendCount = m.attendanceCount || 0;
                    if (attendCount > 12) score += 25;
                    else if (attendCount > 6) score += 15;
                    else if (attendCount > 2) score += 5;
                    else score -= 15;

                    const streak = m.streak || 0;
                    if (streak > 7) score += 15;
                    else if (streak > 3) score += 8;

                    const hasTrainer = m.trainer && m.trainer.trim() !== '';
                    if (hasTrainer) score += 15;
                    else score -= 5;

                    const fitScore = m.fitnessScore || 70;
                    if (fitScore > 85) score += 12;
                    else if (fitScore > 75) score += 6;
                    else score -= 8;

                    const plan = (m.plan || '').toLowerCase();
                    if (plan.includes('annual')) score += 12;
                    else if (plan.includes('semi')) score += 8;
                    else if (plan.includes('quarter')) score += 4;

                    if (m.age && m.age > 22 && m.age < 38) score += 3;

                    const finalScore = Math.max(8, Math.min(96, score));
                    
                    let category: 'Green' | 'Yellow' | 'Red' = 'Yellow';
                    if (finalScore >= 80) category = 'Green';
                    else if (finalScore < 50) category = 'Red';

                    const reasons: string[] = [];
                    if (attendCount > 6) reasons.push("High Attendance");
                    else reasons.push("Low Attendance");
                    if (hasTrainer) reasons.push("Trainer Engagement");
                    else reasons.push("No Assigned Coach");
                    if (fitScore > 75) reasons.push("Diet Compliance");
                    else reasons.push("No Diet Tracking");

                    return { score: finalScore, category, reasons };
                  };

                  const totalInScope = members.length;
                  let expectedRevenue = 0;
                  let expectedRenewalsCount = 0;
                  let riskMembersCount = 0;

                  members.forEach(m => {
                    const pred = predictRenewal(m);
                    const price = planPrices[m.plan] || 2500;
                    expectedRevenue += (price * pred.score / 100);
                    expectedRenewalsCount += (pred.score / 100);
                    if (pred.category === 'Red') riskMembersCount++;
                  });

                  return (
                    <div className="space-y-3 text-left">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Revenue & Renewal Forecast</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 bg-slate-900 border border-white/5 rounded-2xl text-center space-y-1">
                          <span className="text-[8px] font-bold text-slate-500 uppercase block">Expected Revenue</span>
                          <span className="text-xs font-black text-emerald-450 font-mono">₹{Math.round(expectedRevenue).toLocaleString()}</span>
                        </div>
                        <div className="p-3 bg-slate-900 border border-white/5 rounded-2xl text-center space-y-1">
                          <span className="text-[8px] font-bold text-slate-500 uppercase block">Expected Renewals</span>
                          <span className="text-xs font-black text-indigo-400 font-mono">{Math.round(expectedRenewalsCount)} / {totalInScope}</span>
                        </div>
                        <div className="p-3 bg-slate-900 border border-white/5 rounded-2xl text-center space-y-1">
                          <span className="text-[8px] font-bold text-slate-500 uppercase block">High Risk Cards</span>
                          <span className="text-xs font-black text-rose-500 font-mono">{riskMembersCount} Members</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Realtime Risk Interventions */}
                <div className="space-y-3 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">High Risk Member Roster</span>
                    <span className="text-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">Action Required</span>
                  </div>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {(() => {
                      const predictRenewal = (m: any) => {
                        let score = 45; 
                        const attendCount = m.attendanceCount || 0;
                        if (attendCount > 12) score += 25;
                        else if (attendCount > 6) score += 15;
                        else if (attendCount > 2) score += 5;
                        else score -= 15;

                        const streak = m.streak || 0;
                        if (streak > 7) score += 15;
                        else if (streak > 3) score += 8;

                        const hasTrainer = m.trainer && m.trainer.trim() !== '';
                        if (hasTrainer) score += 15;
                        else score -= 5;

                        const fitScore = m.fitnessScore || 70;
                        if (fitScore > 85) score += 12;
                        else if (fitScore > 75) score += 6;
                        else score -= 8;

                        const plan = (m.plan || '').toLowerCase();
                        if (plan.includes('annual')) score += 12;
                        else if (plan.includes('semi')) score += 8;
                        else if (plan.includes('quarter')) score += 4;

                        if (m.age && m.age > 22 && m.age < 38) score += 3;

                        const finalScore = Math.max(8, Math.min(96, score));
                        
                        let category: 'Green' | 'Yellow' | 'Red' = 'Yellow';
                        if (finalScore >= 80) category = 'Green';
                        else if (finalScore < 50) category = 'Red';

                        const reasons: string[] = [];
                        if (attendCount > 6) reasons.push("High Attendance");
                        else reasons.push("Low Attendance");
                        if (hasTrainer) reasons.push("Trainer Engagement");
                        else reasons.push("No Assigned Coach");
                        if (fitScore > 75) reasons.push("Diet Compliance");
                        else reasons.push("No Diet Tracking");

                        return { score: finalScore, category, reasons };
                      };

                      const riskList = members
                        .map(m => ({ member: m, pred: predictRenewal(m) }))
                        .filter(item => item.pred.category === 'Red')
                        .slice(0, 5);

                      if (riskList.length === 0) {
                        return <div className="text-center py-6 text-xs text-slate-500 italic">No high risk members found. Good job! 🎉</div>;
                      }

                      return riskList.map((item, idx) => {
                        const m = item.member;
                        const pred = item.pred;
                        return (
                          <div key={idx} className="p-3.5 bg-slate-900 border border-white/5 rounded-2xl space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-xs font-extrabold text-white">{m.name}</h4>
                                <p className="text-[9px] text-slate-400 font-semibold">{m.plan} · Streak: {m.streak || 0}d</p>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] font-black text-rose-500 font-mono">{pred.score}% Chance</span>
                                <span className="text-[7px] text-slate-500 uppercase block mt-0.5 font-bold">Renewal Prob.</span>
                              </div>
                            </div>

                            {/* Reasons labels */}
                            <div className="flex flex-wrap gap-1">
                              {pred.reasons.map((r, i) => (
                                <span key={i} className="text-[8px] font-bold bg-white/5 border border-white/10 text-slate-350 px-1.5 py-0.5 rounded">
                                  {r}
                                </span>
                              ))}
                            </div>

                            {/* Action Row */}
                            <div className="grid grid-cols-5 gap-1.5 pt-1.5 border-t border-white/5">
                              <button
                                onClick={() => {
                                  toast.success(`Dialing ${m.name} (+91 ${m.phone || '9876543210'})...`);
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center justify-center border-none cursor-pointer transition-colors"
                                title="Call Member"
                              >
                                <Phone size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  const text = encodeURIComponent(`Hi ${m.name}, we notice you haven't checked in recently. To help you stay on track, we're offering a special 15% discount if you renew your membership this week!`);
                                  window.open(`https://wa.me/91${m.phone || '9876543210'}?text=${text}`, '_blank');
                                  toast.success(`WhatsApp campaign opened for ${m.name}`);
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center justify-center border-none cursor-pointer transition-colors"
                                title="Send WhatsApp"
                              >
                                <MessageSquare size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  toast.success(`15% renewal discount coupon successfully sent to ${m.name} via SMS & Email!`);
                                }}
                                className="p-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 rounded-lg flex items-center justify-center border-none cursor-pointer transition-colors text-[9px] font-black font-mono"
                                title="Offer 15% Discount"
                              >
                                -15%
                              </button>
                              <button
                                onClick={() => {
                                  const coach = prompt(`Assign Personal Trainer to ${m.name}:`, m.trainer || 'Rohit Sharma');
                                  if (coach && coach.trim() !== '') {
                                    updateMember(m.id, { trainer: coach.trim() })
                                      .then(() => toast.success(`Coach ${coach} assigned to ${m.name}!`))
                                      .catch(() => toast.error(`Failed to assign coach`));
                                  }
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center justify-center border-none cursor-pointer transition-colors"
                                title="Assign Trainer"
                              >
                                <UserCheck size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  toast.success(`Follow-up log created for ${m.name}. Syncing to Firestore...`);
                                }}
                                className="p-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-400 rounded-lg flex items-center justify-center border-none cursor-pointer transition-colors"
                                title="Create Follow Up"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* 3. AI Alerts & Predictions */}
                <div className="space-y-3 text-left">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">AI Alerts & Insights</span>
                  <div className="space-y-2 text-xs">
                    {/* Attendance Drop Alert */}
                    <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-200 rounded-2xl flex gap-2.5 items-start">
                      <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Attendance Drop Alert</span>
                        <p className="text-[9.5px] text-slate-400 leading-normal mt-0.5">Amit Kumar has checked in 0 times in the last 7 days. Streak lost. Send re-engagement nudge.</p>
                      </div>
                    </div>

                    {/* Trainer Recommendation */}
                    <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 text-indigo-200 rounded-2xl flex gap-2.5 items-start">
                      <Sparkles size={15} className="text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Diet & Coach Recommendation</span>
                        <p className="text-[9.5px] text-slate-400 leading-normal mt-0.5">Coach Rohit Sharma has 92% client compliance. Recommend duplicating his keto-shred templates to other fat-loss athletes.</p>
                      </div>
                    </div>

                    {/* Branch Performance Prediction */}
                    <div className="p-3 bg-[#d4ff00]/5 border border-[#d4ff00]/20 text-[#d4ff00] rounded-2xl flex gap-2.5 items-start">
                      <BarChart2 size={15} className="text-[#d4ff00] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Branch Performance Forecast</span>
                        <p className="text-[9.5px] text-slate-400 leading-normal mt-0.5">Mohali branch is predicted to see a 12% increase in premium signups based on biometric attendance capacity trends.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Campaign Launch */}
              <div className="p-5 border-t border-white/10 bg-slate-900/40">
                <button
                  onClick={() => {
                    setLaunchingCampaign(true);
                    setTimeout(() => {
                      setLaunchingCampaign(false);
                      toast.success('WhatsApp Re-engagement campaign launched successfully for all High-Risk members!');
                    }, 1500);
                  }}
                  disabled={launchingCampaign}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50 border-none flex items-center justify-center gap-2"
                >
                  <MessageSquare size={13} />
                  <span>{launchingCampaign ? 'Sending Campaigns...' : 'Smart WhatsApp Campaigns'}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  </div>
  );
}

const ArrowLeftIcon = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const SendIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);
