'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Clock, Plus, ArrowUpRight, Activity, Unlock, Phone, MessageSquare, CheckCircle2, TrendingUp, DollarSign, ShieldAlert, Sparkles, ClipboardList, AlertTriangle
} from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, ResponsiveContainer } from 'recharts';
import { useGymStore } from '@/store';
import { getInitials, daysUntilExpiry } from '@/lib/utils';
import toast from 'react-hot-toast';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db as fDb, isFirebaseReady } from '@/lib/firebase';
import API from '@/services/api';

import { useFollowups } from '@/hooks/useFollowups';

export default function DashboardPage() {
  const router = useRouter();
  const { pendingCount: followupsCount, todaysCount } = useFollowups();
  const {
    members, attendance, gymPresence, payments, fetchMembers, fetchAttendance, fetchPayments,
    triggerGateUnlock, dashboardAnalytics, fetchDashboardAnalytics, deviceStatus
  } = useGymStore();

  const [isMounted, setIsMounted] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const [gateUnlocked, setGateUnlocked] = useState(false);
  const [viewMode, setViewMode] = useState<'owner' | 'reception'>('owner');
  const [employees, setEmployees] = useState<any[]>([]);
  const [empAttendance, setEmpAttendance] = useState<any[]>([]);
  const [memberAttendance, setMemberAttendance] = useState<any[]>([]);
  const [realtimeMembers, setRealtimeMembers] = useState<any[]>([]);
  const [enquiriesCount, setEnquiriesCount] = useState<number>(0);

  // Sync store members to local state
  useEffect(() => {
    if (members && members.length > 0) {
      setRealtimeMembers(members);
    }
  }, [members]);

  // Setup real-time listeners — ONLY for data that genuinely needs realtime
  useEffect(() => {
    if (!isFirebaseReady || !fDb) return;
    
    // Employees — small collection, OK to snapshot
    const unsubEmployees = onSnapshot(collection(fDb, 'employees'), (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn("Firestore employees listener error:", err);
    });

    const unsubEmpAtt = onSnapshot(collection(fDb, 'employeeAttendance'), (snap) => {
      setEmpAttendance(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn("Firestore employeeAttendance listener error:", err);
    });

    // Enquiries — single lightweight listener (replaces both onSnapshot + 5s polling)
    const unsubEnq = onSnapshot(collection(fDb, 'enquiries'), (snap) => {
      setEnquiriesCount(snap.size);
    }, (err) => {
      console.warn("Enquiries listener notice:", err);
      // Fallback single fetch if listener fails
      API.get('/enquiries').then(res => {
        if (Array.isArray(res.data)) setEnquiriesCount(res.data.length);
      }).catch(() => {});
    });

    return () => {
      unsubEmployees();
      unsubEmpAtt();
      unsubEnq();
    };
  }, []);

  // Load real data from backend API
  useEffect(() => {
    setIsMounted(true);
    fetchMembers();
    fetchAttendance();
    fetchPayments();
    fetchDashboardAnalytics();
  }, [fetchMembers, fetchAttendance, fetchPayments, fetchDashboardAnalytics]);

  // Derive live occupancy count from real memberAttendance logs + gymPresence
  useEffect(() => {
    const logs = (memberAttendance && memberAttendance.length > 0) ? memberAttendance : (attendance || []);
    const now = new Date().getTime();

    const presenceInside = (gymPresence || []).filter((p: any) => {
      if (!p.inside) return false;
      const checkInTime = new Date(p.checkIn || p.timestamp || new Date()).getTime();
      return (now - checkInTime) <= 4 * 3600 * 1000;
    }).length;

    const todayStr = new Date().toISOString().split('T')[0];
    const insideMap = new Map();

    logs.forEach((a: any) => {
      const rawDate = a.checkIn || a.timestamp || a.createdAt || '';
      if (!rawDate) return;
      const checkInDate = new Date(rawDate);
      if (checkInDate.toISOString().split('T')[0] !== todayStr && checkInDate.toDateString() !== new Date().toDateString()) return;

      const memberKey = a.memberId || a.memberName;
      if (!memberKey || a.status === 'denied' || a.status === 'unknown') return;

      const isCheckedOut = !!a.checkOut || a.autoCheckedOut === true || a.status === 'auto_checkout';
      const checkInTime = checkInDate.getTime();

      if (!isCheckedOut && (now - checkInTime) <= 4 * 3600 * 1000) {
        insideMap.set(memberKey, true);
      }
    });

    const activeCount = Math.max(presenceInside, insideMap.size);
    setLiveCount(activeCount);
  }, [gymPresence, memberAttendance, attendance]);

  const handleManualUnlock = async () => {
    setGateUnlocked(true);
    toast.success('Turnstile Gate Unlocked Momentarily! (ESSL Device ET100)');
    await triggerGateUnlock();
    setTimeout(() => {
      setGateUnlocked(false);
    }, 3000);
  };

  const handleReceptionAction = async (member: any, actionType: string) => {
    let detailMsg = '';
    let successToast = '';

    if (actionType === 'Call Member') {
      detailMsg = `Called member at ${member.phone}. Checked in on renewal and gym attendance status.`;
      successToast = `Call logged for ${member.name}!`;
    } else if (actionType === 'Send WhatsApp') {
      detailMsg = `Dispatched membership renewal alert template to WhatsApp at ${member.phone}.`;
      successToast = `WhatsApp alert sent to ${member.name}!`;
    } else if (actionType === 'Offer Discount') {
      detailMsg = `SMS sent with 20% renewal discount coupon: RENEW20`;
      successToast = `Discount coupon sent to ${member.name}!`;
    } else if (actionType === 'Assign Trainer') {
      detailMsg = `Assigned trainer ${member.trainer || 'Karan Verma'} to monitor athlete and support compliance.`;
      successToast = `Trainer assignment alert sent to ${member.name}!`;
    }

    try {
      if (isFirebaseReady && fDb) {
        await addDoc(collection(fDb, 'retention_actions'), {
          memberId: member.id,
          memberName: member.name,
          action: actionType,
          details: detailMsg,
          operator: 'Receptionist Desk',
          timestamp: new Date().toISOString()
        });

        await addDoc(collection(fDb, 'followups'), {
          memberId: member.id,
          memberName: member.name,
          memberPhone: member.phone,
          riskScore: member.ai.score,
          assignedTo: member.trainer || 'Receptionist Desk',
          status: 'completed',
          dueDate: new Date().toISOString().split('T')[0],
          notes: `Reception Action: ${actionType} completed. Details: ${detailMsg}`,
          createdAt: new Date().toISOString()
        });
      }
      toast.success(successToast, { icon: '🤖' });
    } catch (e) {
      toast.error('Failed to log action');
    }
  };

  // 1. Prepare Chart Data from real attendance logs only
  const weekdays = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const chartData = weekdays.map((month, idx) => {
    const checkinCount = attendance ? attendance.filter((a: any) => {
      const date = new Date(a.checkIn || a.createdAt || '');
      return date.getMonth() === idx;
    }).length : 0;

    return {
      name: month,
      checkins: checkinCount || 0,
      intensity: checkinCount ? checkinCount * 1.3 : 0
    };
  });

  const hasChartData = chartData.some(d => d.checkins > 0);

  // 2. Prepare Biometric Timeline Tracks from real checked-in members today
  const todayActivities = attendance ? attendance.filter((a: any) => {
    const checkinDate = new Date(a.checkIn || '');
    const today = new Date();
    return checkinDate.toDateString() === today.toDateString();
  }).slice(0, 3) : []; // Max 3 rows

  // 3. Calculations
  const today = new Date();
  const totalCheckinsThisWeek = attendance ? attendance.filter((a: any) => {
    const checkinDate = new Date(a.checkIn || '');
    const diff = (today.getTime() - checkinDate.getTime()) / (1000 * 3600 * 24);
    return diff <= 7;
  }).length : 0;

  const planPrices: Record<string, number> = {
    'Monthly': 2500, 'Quarterly': 6500, 'Semi-Annual': 11500, 'Annual Premium': 18000
  };

  const getMemberRisk = (m: any) => {
    const daysLeft = daysUntilExpiry(m.expiryDate);
    const count = m.attendanceCount || 0;
    let score = 20;
    if (daysLeft < 0) score += 35;
    else if (daysLeft <= 7) score += 40;
    else if (daysLeft <= 15) score += 20;
    if (count <= 2) score += 35;
    else if (count <= 5) score += 15;
    const finalScore = Math.max(5, Math.min(95, score));
    const cancellationChance = Math.round(finalScore * 0.9 + 5);
    const renewalChance = 100 - cancellationChance;
    
    let category: 'Green' | 'Yellow' | 'Orange' | 'Red' = 'Green';
    if (finalScore >= 80) category = 'Red';
    else if (finalScore >= 60) category = 'Orange';
    else if (finalScore >= 30) category = 'Yellow';

    return { score: finalScore, category, cancellationChance, renewalChance, daysLeft };
  };

  // Evaluate members risk
  const evaluatedMembers = realtimeMembers.map(m => ({ ...m, ai: getMemberRisk(m) }));
  
  // Owner metrics
  const totalAtRiskCount = evaluatedMembers.filter(m => m.ai.category === 'Red' || m.ai.category === 'Orange').length;
  const retentionRate = realtimeMembers.length > 0 ? Math.round(((realtimeMembers.length - totalAtRiskCount) / realtimeMembers.length) * 100) : 92;
  const churnRate = 100 - retentionRate;
  const expectedRevenueLoss = evaluatedMembers.reduce((sum, m) => {
    const price = planPrices[m.plan] || 2500;
    return sum + (price * (m.ai.cancellationChance / 100));
  }, 0);
  const expectedRenewalsCount = evaluatedMembers.reduce((sum, m) => sum + (m.ai.renewalChance / 100), 0);

  // Receptionist view lists
  const membersToCall = evaluatedMembers.filter(m => m.ai.category === 'Red' || m.ai.daysLeft <= 0).slice(0, 5);
  const membersAtRisk = evaluatedMembers.filter(m => m.ai.category === 'Orange' || m.ai.category === 'Red').slice(0, 5);
  const membersExpiringSoon = evaluatedMembers.filter(m => m.ai.daysLeft > 0 && m.ai.daysLeft <= 15).slice(0, 5);
  const renewalOpportunities = evaluatedMembers.filter(m => m.ai.renewalChance > 70).slice(0, 5);
  const getAbsenceStats = () => {
    const SYSTEM_LIVE_DATE = new Date('2026-07-01');
    const todayStr = new Date().toDateString();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const activeMembers = realtimeMembers ? realtimeMembers.filter((m: any) => m.status === 'active') : [];

    const getEntityStatus = (entity: any, isEmployee: boolean) => {
      const logs = (isEmployee ? empAttendance : memberAttendance).filter(a => {
        const checkInDate = new Date(a.checkIn || a.timestamp);
        return (a.memberId === entity.id || a.employeeId === entity.id || String(a.biometricId) === String(entity.biometricId)) && 
               checkInDate >= SYSTEM_LIVE_DATE;
      });

      if (logs.length === 0) {
        return { punchedToday: false, daysAbsent: 0, hasPunched: false };
      }

      const punchedToday = logs.some(l => new Date(l.checkIn || l.timestamp).toDateString() === todayStr);

      const timestamps = logs.map(l => new Date(l.checkIn || l.timestamp).getTime());
      const latestTimestamp = Math.max(...timestamps);
      const lastActiveDate = new Date(latestTimestamp);
      lastActiveDate.setHours(0, 0, 0, 0);

      const diffTime = todayStart.getTime() - lastActiveDate.getTime();
      const daysAbsent = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return { punchedToday, daysAbsent, hasPunched: true };
    };

    const membersMissing = activeMembers.filter(m => !getEntityStatus(m, false).punchedToday).length;
    const employeesMissing = employees.filter(e => !getEntityStatus(e, true).punchedToday).length;

    const candidateAbsents = [
      ...activeMembers.map(m => ({ ...m, isEmployee: false })),
      ...employees.map(e => ({ ...e, isEmployee: true }))
    ].map(item => {
      const status = getEntityStatus(item, item.isEmployee);
      return { ...item, ...status };
    }).filter(item => item.hasPunched && !item.punchedToday && item.daysAbsent >= 1 && !item.onLeave);

    const needsFollowUp = candidateAbsents.filter(item => item.daysAbsent === 2 || item.daysAbsent === 3).length;
    const critical = candidateAbsents.filter(item => item.daysAbsent >= 10).length;

    return {
      membersMissing,
      employeesMissing,
      needsFollowUp,
      critical
    };
  };

  const { membersMissing, employeesMissing, needsFollowUp, critical } = getAbsenceStats();

  const todaysCollection = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDateStr = new Date().toDateString();

    let total = 0;

    if (Array.isArray(payments) && payments.length > 0) {
      payments.forEach((p: any) => {
        if (p.isLegacyImport || p.isHistorical || p.isSample || p.isMock) return;
        if (!p.isRealTimeToday) return;
        const pDate = String(p.date || p.createdAt || p.paymentDate || '');
        if (pDate.startsWith(todayStr) || (pDate && new Date(pDate).toDateString() === todayDateStr)) {
          const val = Number(p.paid) || Number(p.amount) || 0;
          total += val;
        }
      });
    }

    return total;
  }, [payments]);

  const expiringSoonCount = realtimeMembers.filter((m: any) => {
    const left = daysUntilExpiry(m.expiryDate);
    return left >= 0 && left <= 30;
  }).length;

  return (
    <div className="flex flex-col gap-3.5 w-full text-slate-800 text-left">
      
      {/* Header Title Area & Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div>
          <h2 className="font-rowdies text-2xl font-bold text-slate-900 uppercase tracking-tight leading-none">
            {viewMode === 'owner' ? 'Owner Dashboard' : 'Receptionist Console'}
          </h2>
          <p className="text-slate-500 text-[11px] mt-1 font-medium">
            {viewMode === 'owner' 
              ? 'Manage gym operations, expected revenue loss, and member retention rates.' 
              : 'Track daily member follow-ups, at-risk members, and turnstile check-ins.'}
          </p>
        </div>

        {/* Device Status & View mode toggle pill */}
        <div className="flex flex-col md:flex-row items-end md:items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg shadow-sm text-[9.5px] font-black uppercase tracking-wider text-slate-600">
            <span className={`w-1.5 h-1.5 rounded-full ${deviceStatus === 'connected' ? 'bg-green-500' : deviceStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
            {deviceStatus === 'connected' ? 'Device Online' : deviceStatus === 'syncing' ? 'Syncing...' : 'Device Offline'}
          </div>
          <div className="px-2.5 py-1 bg-slate-900 text-[#d4ff00] text-[9.5px] font-black uppercase tracking-widest rounded-full shadow-sm">
            Owner Command Center
          </div>
        </div>
      </div>

      {viewMode === 'owner' ? (
        <>
          {/* Owner Analytics Metrics Row - 4 Clickable Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 animate-fade-in">
            {/* Card 1: Today's Followups */}
            <div 
              onClick={() => router.push('/dashboard/follow-up')}
              className="bg-white border border-slate-100 p-3.5 rounded-2xl shadow-sm flex items-center gap-3 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <AlertTriangle size={18} />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Today's Followups</span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">{todaysCount} Follow-ups</h3>
                <p className="text-[8px] text-amber-600 font-semibold mt-0.5">Click to view follow-up list →</p>
              </div>
            </div>

            {/* Card 2: Total Enquiry */}
            <div 
              onClick={() => router.push('/dashboard/enquiries')}
              className="bg-white border border-slate-100 p-3.5 rounded-2xl shadow-sm flex items-center gap-3 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ClipboardList size={18} />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Total Enquiry</span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">{enquiriesCount} Enquiries</h3>
                <p className="text-[8px] text-blue-600 font-semibold mt-0.5">Click to view enquiry leads →</p>
              </div>
            </div>

            {/* Card 3: Expiring Soon Clients */}
            <div 
              onClick={() => router.push('/dashboard/expired')}
              className="bg-white border border-slate-100 p-3.5 rounded-2xl shadow-sm flex items-center gap-3 hover:border-orange-400 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Clock size={18} />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Expiring Soon Clients</span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">{expiringSoonCount} Clients</h3>
                <p className="text-[8px] text-orange-600 font-semibold mt-0.5">Click to view expiring list →</p>
              </div>
            </div>

            {/* Card 4: Today's Collection */}
            <div 
              onClick={() => router.push('/dashboard/billing')}
              className="bg-white border border-slate-100 p-3.5 rounded-2xl shadow-sm flex items-center gap-3 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <DollarSign size={18} />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Today's Collection</span>
                <h3 className="text-base font-black text-emerald-600 mt-0.5">
                  ₹{todaysCollection.toLocaleString('en-IN')}
                </h3>
                <p className="text-[8px] text-emerald-600 font-semibold mt-0.5">Click to view billing ledger →</p>
              </div>
            </div>
          </div>

          {/* Top Row Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            
            {/* Card 1: Today Inside (Tasks Card) */}
            <div className="bg-white border border-slate-100 p-3.5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[110px] relative overflow-hidden group hover:border-black/10 transition-colors">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[9px] font-black uppercase tracking-wider">Members Inside</span>
                <div className="w-5 h-5 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-black">
                  <ArrowUpRight size={10} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-900 leading-none">
                  {liveCount}
                </h3>
                <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden flex">
                  <div className="h-full bg-black" style={{ width: `${Math.min(100, (liveCount / 50) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-[8px] text-slate-400 font-bold mt-1">
                  <span>Inside Now</span>
                  <span>Cap 50</span>
                </div>
              </div>
            </div>

            {/* Card 2: Core Team / Active Members Card */}
            <div className="bg-[#d4ff00] border border-black/5 p-3.5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[110px] relative overflow-hidden">
              <div className="flex justify-between items-center text-black">
                <span className="text-[9px] font-black uppercase tracking-wider">Active Pass</span>
                <span className="text-[8px] bg-black text-white px-2 py-0.5 rounded-full font-bold uppercase">Gold</span>
              </div>
              <div className="mt-2 text-left">
                <h3 className="text-base font-black text-black leading-none">
                  {realtimeMembers ? realtimeMembers.filter(m => m.status === 'active').length : 0} Members
                </h3>
                
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex -space-x-2 overflow-hidden">
                    {realtimeMembers ? realtimeMembers.slice(0, 3).map((m, idx) => {
                       const colors = ['bg-amber-400', 'bg-violet-400', 'bg-rose-400'];
                       return (
                         <div 
                           key={idx} 
                           className={`w-5 h-5 rounded-full border border-[#d4ff00] ${colors[idx % 3]} text-black text-[7.5px] font-black flex items-center justify-center`}
                         >
                           {getInitials(m.name)}
                         </div>
                       );
                    }) : null}
                  </div>
                  {realtimeMembers && realtimeMembers.length > 3 && (
                    <span className="text-[8px] bg-black text-white px-1.5 py-0.5 rounded-full font-black">
                      +{realtimeMembers.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: Staff Live Widget */}
            <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm flex flex-col justify-between min-h-[110px] text-xs font-semibold">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                  👨‍💼 Staff Live
                </span>
                <span className="text-[7.5px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest border border-emerald-100 animate-pulse">
                  Live
                </span>
              </div>
              
              <div className="mt-1 space-y-0.5 text-[9px]">
                {[
                  { label: 'Trainers', inside: employees.filter(e => e.role === 'Trainer' && e.currentStatus === 'Inside').length, total: employees.filter(e => e.role === 'Trainer').length, iconColor: 'bg-emerald-500' },
                  { label: 'Reception', inside: employees.filter(e => e.role === 'Reception' && e.currentStatus === 'Inside').length, total: employees.filter(e => e.role === 'Reception').length, iconColor: 'bg-blue-500' },
                  { label: 'Manager', inside: employees.filter(e => e.role === 'Manager' && e.currentStatus === 'Inside').length, total: employees.filter(e => e.role === 'Manager').length, iconColor: 'bg-purple-500' },
                  { label: 'Cleaner', inside: employees.filter(e => e.role === 'Cleaner' && e.currentStatus === 'Inside').length, total: employees.filter(e => e.role === 'Cleaner').length, iconColor: 'bg-orange-500' }
                ].map((item, idx) => {
                  const isAvailable = item.inside > 0;
                  return (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="flex items-center gap-1 text-slate-500 font-bold">
                        <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? item.iconColor : 'bg-slate-300'}`} />
                        {item.label}
                      </span>
                      <span className="text-slate-800 font-black font-mono">
                        {item.inside}/{item.total}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-1 pt-1 border-t border-slate-100 flex justify-between items-center text-[8.5px]">
                <span className="text-slate-400 font-bold">Total Staff Inside</span>
                <span className="font-black text-slate-900 font-mono">
                  {employees.filter(e => e.currentStatus === 'Inside').length}
                </span>
              </div>
            </div>

            {/* Card 4: Unlock Turnstile (Add New Board Card) */}
            <button 
              onClick={handleManualUnlock}
              disabled={gateUnlocked}
              className="bg-transparent border-2 border-dashed border-black/15 hover:border-black/35 rounded-2xl p-3.5 flex flex-col items-center justify-center min-h-[110px] transition-all cursor-pointer group text-center"
            >
              <div className={`w-8 h-8 rounded-full border-2 border-dashed ${gateUnlocked ? 'bg-black border-black text-[#d4ff00]' : 'border-black/25 text-black group-hover:bg-black group-hover:text-white'} flex items-center justify-center transition-all`}>
                {gateUnlocked ? <Unlock size={14} /> : <Plus size={14} />}
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-black mt-2 block">
                {gateUnlocked ? 'Gate Unlocked' : 'Unlock Turnstile'}
              </span>
              <span className="text-[7.5px] text-slate-500 font-bold mt-0.5">ESSL Gate Trigger Bridge</span>
            </button>

          </div>

          {/* Inconsistency Alerts Row Widget */}
          <div className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm space-y-2.5 text-left">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-display">
                ⚠️ Attendance Inconsistency Alerts
              </span>
              <span className="text-[7.5px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-rose-100 animate-pulse">
                Action Required
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Members Missing Today', value: membersMissing, sub: 'Needs punch today', color: 'bg-slate-50 text-slate-750 border-slate-100' },
                { label: 'Employees Missing Today', value: employeesMissing, sub: 'Staff attendance status', color: 'bg-slate-50 text-slate-750 border-slate-100' },
                { label: 'Needs Follow-up', value: needsFollowUp, sub: '2-3 Days Absent', color: 'bg-amber-50 text-amber-750 border-amber-100' },
                { label: 'Critical (10+ Days)', value: critical, sub: 'Inconsistent attendance', color: 'bg-rose-50 text-rose-755 border-rose-100' }
              ].map((item, idx) => (
                <div key={idx} className={`p-2.5 rounded-xl border flex flex-col justify-between min-h-[72px] ${item.color}`}>
                  <span className="text-[8px] font-black uppercase tracking-wider opacity-60 leading-none">{item.label}</span>
                  <div className="text-lg font-black mt-1 leading-none font-mono">{item.value}</div>
                  <span className="text-[8px] font-bold mt-0.5 opacity-70 leading-none">{item.sub}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Middle Row: Composed Chart & Live Activity Hub */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            
            {/* Chart Card */}
            <div className="lg:col-span-2 bg-black text-white p-3.5 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4 justify-between min-h-[200px] relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none" />

              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Attendance Intensity</span>
                  <h4 className="text-xs font-extrabold text-white mt-0.5 leading-none">Weekly Check-in Distribution</h4>
                </div>

                <div className="h-[110px] w-full mt-2">
                  {isMounted && hasChartData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 5, right: 0, bottom: 0, left: -40 }}>
                        <XAxis dataKey="name" stroke="transparent" tick={{ fill: '#64748B', fontSize: 8, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <Bar dataKey="checkins" fill="#FFFFFF" radius={[3, 3, 0, 0]} barSize={12} />
                        <Line type="monotone" dataKey="intensity" stroke="#d4ff00" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-center gap-1.5">
                      <Activity size={16} className="text-slate-700" />
                      <span className="text-[9.5px] text-slate-500 font-bold">No biometric data recorded this year</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full md:w-[150px] border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4 flex flex-col justify-between text-left shrink-0">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Weekly Syncs</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="text-lg font-black text-white">{totalCheckinsThisWeek}</div>
                    <span className="text-[8px] bg-red-900/50 text-red-400 px-1 py-0.5 rounded font-black">-7%</span>
                  </div>
                  <p className="text-[7px] text-slate-500 font-bold mt-0.5">Checkins since last week</p>
                </div>

                <div className="mt-2 border-t border-white/5 pt-2">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Monthly Syncs</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="text-lg font-black text-white">{attendance ? attendance.length : 0}</div>
                    <span className="text-[8px] bg-emerald-950 text-[#d4ff00] px-1 py-0.5 rounded font-black">+13%</span>
                  </div>
                  <p className="text-[7px] text-slate-500 font-bold mt-0.5">Checkins this month</p>
                </div>

                <div className="mt-2 flex items-center gap-2 text-[7px] text-slate-500 font-black uppercase">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#d4ff00]" /> This Year</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Last Year</span>
                </div>
              </div>
            </div>

            {/* Live Activity Hub Column */}
            <div className="bg-white border border-slate-100 p-3.5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[200px] text-left">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    Live Activity Hub
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">Real-time biometric attendance feed</p>
                </div>
                <span className="text-[8px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-emerald-100 animate-pulse">
                  Live
                </span>
              </div>
              
              <div className="mt-3 space-y-2.5 flex-1 overflow-y-auto max-h-[180px] pr-1 custom-scrollbar">
                {(() => {
                  const recentAttendance = [...memberAttendance]
                    .sort((a, b) => {
                      const tA = new Date(a.checkIn || a.createdAt || 0).getTime();
                      const tB = new Date(b.checkIn || b.createdAt || 0).getTime();
                      return tB - tA;
                    })
                    .slice(0, 4);

                  if (recentAttendance.length === 0) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-8">
                        <Activity size={16} className="text-slate-350 animate-pulse" />
                        <span className="text-[10px] text-slate-400 font-bold">Waiting for live sync...</span>
                      </div>
                    );
                  }

                  return recentAttendance.map((item, idx) => {
                    const checkInTime = new Date(item.checkIn || item.createdAt || new Date());
                    const timeStr = checkInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    const isCheckOut = !!item.checkOut;
                    const avatar = item.avatarUrl || item.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${(item.memberName || item.name || 'User').replace(/ /g, '')}`;
                    
                    return (
                      <div key={item.id || idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-2xl hover:bg-slate-100/50 transition-all">
                        <div className="flex items-center gap-2 min-w-0">
                          <img 
                            src={avatar}
                            className="w-8 h-8 rounded-full bg-white border border-slate-100 shadow-sm shrink-0 object-cover"
                            alt=""
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${idx}` }}
                          />
                          <div className="truncate">
                            <div className="text-[11px] font-black text-slate-800 truncate">{item.memberName || item.name || 'Unknown Athlete'}</div>
                            <div className="text-[8.5px] text-slate-400 font-bold flex items-center gap-1 font-mono">
                              <span>{timeStr}</span>
                              <span>•</span>
                              <span className="text-[8px] font-sans font-semibold uppercase">{item.method || 'Biometric'}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider shrink-0 ${
                          isCheckOut 
                            ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {isCheckOut ? 'Exit' : 'In'}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

          </div>
        </>
      ) : (
        /* Receptionist Console View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* Card 1: Members to Call Today */}
          <div className="bg-white border border-slate-100 p-5 rounded-[28px] shadow-sm flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                  <Phone size={14} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Members To Call Today</h3>
                  <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">Critical Risk / Lapsed Members</p>
                </div>
              </div>
              <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black">
                {membersToCall.length} Pending
              </span>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto space-y-3 max-h-[220px] pr-1">
              {membersToCall.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-black text-[9px] font-black flex items-center justify-center shrink-0">
                      {getInitials(m.name)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-black text-slate-800 truncate">{m.name}</div>
                      <div className="text-[8.5px] text-slate-400 font-semibold">{m.phone} · Risk: {m.ai.score}%</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleReceptionAction(m, 'Call Member')}
                    className="px-3 py-1.5 rounded-xl bg-black text-white hover:bg-black/90 transition-all text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer border-none shrink-0"
                  >
                    <Phone size={10} /> Call
                  </button>
                </div>
              ))}
              {membersToCall.length === 0 && (
                <div className="text-center py-10 text-[10px] text-slate-400 italic">No members need calls today</div>
              )}
            </div>
          </div>

          {/* Card 2: Members Expiring Soon */}
          <div className="bg-white border border-slate-100 p-5 rounded-[28px] shadow-sm flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                  <Clock size={14} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Members Expiring Soon</h3>
                  <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">Expiry within 15 Days</p>
                </div>
              </div>
              <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-black">
                {membersExpiringSoon.length} Expiring
              </span>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto space-y-3 max-h-[220px] pr-1">
              {membersExpiringSoon.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-black text-[9px] font-black flex items-center justify-center shrink-0">
                      {getInitials(m.name)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-black text-slate-800 truncate">{m.name}</div>
                      <div className="text-[8.5px] text-slate-400 font-semibold">{m.ai.daysLeft} days left · {m.plan}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleReceptionAction(m, 'Send WhatsApp')}
                    className="px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white transition-all text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer border-none shrink-0"
                  >
                    <MessageSquare size={10} /> WhatsApp
                  </button>
                </div>
              ))}
              {membersExpiringSoon.length === 0 && (
                <div className="text-center py-10 text-[10px] text-slate-400 italic">No memberships expiring soon</div>
              )}
            </div>
          </div>

          {/* Card 3: Members At Risk */}
          <div className="bg-white border border-slate-100 p-5 rounded-[28px] shadow-sm flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <ShieldAlert size={14} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Members At Risk</h3>
                  <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">Moderate / High Risk (Score &gt; 30)</p>
                </div>
              </div>
              <span className="text-[9px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-black">
                {membersAtRisk.length} Flagged
              </span>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto space-y-3 max-h-[220px] pr-1">
              {membersAtRisk.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-black text-[9px] font-black flex items-center justify-center shrink-0">
                      {getInitials(m.name)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-black text-slate-800 truncate">{m.name}</div>
                      <div className="text-[8.5px] text-slate-400 font-semibold">Risk: {m.ai.score}% · Trainer: {m.trainer || 'None'}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleReceptionAction(m, 'Assign Trainer')}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer border-none shrink-0"
                  >
                    <Plus size={10} /> Assign
                  </button>
                </div>
              ))}
              {membersAtRisk.length === 0 && (
                <div className="text-center py-10 text-[10px] text-slate-400 italic">No members currently flagged at risk</div>
              )}
            </div>
          </div>

          {/* Card 4: Renewal Opportunities */}
          <div className="bg-white border border-slate-100 p-5 rounded-[28px] shadow-sm flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                  <Sparkles size={14} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Renewal Opportunities</h3>
                  <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">Chance of Renewal &gt; 70%</p>
                </div>
              </div>
              <span className="text-[9px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-black">
                {renewalOpportunities.length} Opportunity
              </span>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto space-y-3 max-h-[220px] pr-1">
              {renewalOpportunities.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-black text-[9px] font-black flex items-center justify-center shrink-0">
                      {getInitials(m.name)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-black text-slate-800 truncate">{m.name}</div>
                      <div className="text-[8.5px] text-slate-400 font-semibold">Renewal Chance: {m.ai.renewalChance}% · Expiry: {m.ai.daysLeft}d</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleReceptionAction(m, 'Offer Discount')}
                    className="px-3 py-1.5 rounded-xl bg-[#d4ff00] text-black hover:bg-[#c2eb00] transition-all text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer border-none shrink-0"
                  >
                    <Plus size={10} /> Offer 20%
                  </button>
                </div>
              ))}
              {renewalOpportunities.length === 0 && (
                <div className="text-center py-10 text-[10px] text-slate-400 italic">No renewal opportunities found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Row: Today's Biometric Flow Timeline */}
      <div className="bg-white border border-slate-100 p-5 rounded-[28px] shadow-sm flex flex-col justify-between min-h-[240px]">
        <div className="flex justify-between items-center border-b border-slate-50 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Today&apos;s Biometric Session Flow</h3>
            <p className="text-[9px] text-slate-400 font-bold mt-0.5">Live workout duration tracks from ESSL gate logs</p>
          </div>
          <span className="text-[8.5px] bg-[#d4ff00] text-black px-2 py-1 rounded font-black uppercase tracking-wider">
            June 2026
          </span>
        </div>

        <div className="mt-4 space-y-4 flex-1">
          {todayActivities.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-6">
              <Clock size={16} className="text-slate-300" />
              <span className="text-[10px] text-slate-400 font-bold">No active sessions tracked today</span>
            </div>
          ) : (
            todayActivities.map((act: any, idx) => {
              const checkinTime = new Date(act.checkIn);
              const startHour = checkinTime.getHours();
              const startOffset = Math.max(0, startHour - 6);
              return (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-3 flex items-center gap-2 text-left">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-black text-[8px] font-black flex items-center justify-center">
                      {getInitials(act.memberName)}
                    </div>
                    <div className="truncate">
                      <div className="text-[10px] font-black text-slate-800 truncate">{act.memberName}</div>
                      <div className="text-[7.5px] text-slate-400 leading-none">Checked in</div>
                    </div>
                  </div>

                  <div className="col-span-9 relative h-6 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden flex items-center">
                    <div 
                      className="absolute h-4 bg-[#d4ff00] border border-black/5 rounded-full flex items-center px-2 text-[8px] font-black text-black shadow-sm"
                      style={{ left: `${(startOffset / 14) * 100}%`, width: '25%' }}
                    >
                      Workout Session
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="grid grid-cols-12 gap-3 text-center border-t border-slate-50 pt-2.5 mt-4 text-[7px] text-slate-400 font-black uppercase tracking-wider">
          <div className="col-span-3 text-left">Timeframe</div>
          {['6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'].map((h, i) => (
            <div key={i} className="col-span-1">{h}</div>
          ))}
        </div>

      </div>

    </div>
  );
}
