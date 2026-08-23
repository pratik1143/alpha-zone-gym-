'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Edit3, Shield, Activity, Droplets, Calendar,
  Clock, DollarSign, MessageSquare, Phone, Mail, Printer, Download,
  Trash2, Snowflake, Repeat, Sparkles, AlertCircle, Bell, ChevronRight, Camera, User, Dumbbell
} from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, updateDoc } from 'firebase/firestore';
import toast from '@/lib/toast';
import { membershipEngine } from '@/lib/engines/membershipEngine';
import { paymentEngine } from '@/lib/engines/paymentEngine';
import { calculateRealAttendance } from '@/lib/utils';
import API from '@/services/api';
import { useGymStore } from '@/store';
import MemberAvatar from '../../components/MemberAvatar';
import SmartPhotoCapture from '../../components/SmartPhotoCapture';
import RenewalWizardModal from '../components/RenewalWizardModal';
import TrainerSelectorDropdown from '../components/TrainerSelectorDropdown';
import PtBillingModal from '../components/PtBillingModal';

// Tabs
import ProfileTab from './components/ProfileTab';
import BillingTab from './components/BillingTab';
import CommunicationTab from './components/CommunicationTab';
import AttendanceTab from './components/AttendanceTab';

const TABS = [
  'Profile', 'Billing', 'Communication', 'Attendance'
];

export default function ClientProfileSystem() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = params?.id as string;
  const id = rawId ? decodeURIComponent(rawId) : '';

  const [activeTab, setActiveTab] = useState('Profile');
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [memberInvoices, setMemberInvoices] = useState<any[]>([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showPtModal, setShowPtModal] = useState(false);

  useEffect(() => {
    if (searchParams && searchParams.get('renew') === 'true') {
      setShowRenewalModal(true);
    }
  }, [searchParams]);

  const handleSavePhoto = async (photoUrl: string) => {
    if (!member) return;
    const targetMemberId = member.id || member.uid || member.docId || id;
    try {
      // Direct API update via Firebase Admin SDK to bypass client permission rules 100%
      await API.put(`/members/${targetMemberId}`, {
        photo: photoUrl,
        avatarUrl: photoUrl,
        avatar: photoUrl,
        updatedAt: new Date().toISOString()
      });

      setMember((prev: any) => ({ ...prev, photo: photoUrl, avatarUrl: photoUrl, avatar: photoUrl }));
      toast.success(`${member.name || 'Member'} profile photo updated successfully!`);
      setShowPhotoModal(false);
      useGymStore.getState().fetchMembers();
    } catch (err: any) {
      console.error('Error saving photo via API, trying client fallback:', err);
      try {
        await updateDoc(doc(db, 'members', targetMemberId), {
          photo: photoUrl,
          avatarUrl: photoUrl,
          avatar: photoUrl,
          updatedAt: new Date().toISOString()
        });
        setMember((prev: any) => ({ ...prev, photo: photoUrl, avatarUrl: photoUrl, avatar: photoUrl }));
        toast.success(`${member.name || 'Member'} profile photo updated successfully!`);
        setShowPhotoModal(false);
        useGymStore.getState().fetchMembers();
      } catch (fErr: any) {
        toast.error('Failed to update photo: ' + (fErr.message || err.message));
      }
    }
  };

  const [realAttendanceCount, setRealAttendanceCount] = useState<number>(0);

  // ── Real-time listener for member attendance logs ───────────
  useEffect(() => {
    if (!id && !member) return;
    let isMounted = true;

    const qAtt = collection(db, 'attendance_logs');
    const unsub = onSnapshot(qAtt, (snap) => {
      if (!isMounted) return;
      const rawLogs = snap.docs.map(d => d.data());
      const mId = member?.id || member?.uid || member?.memberId || id;
      const mBioId = member?.biometricId || member?.deviceUserId || '';
      const mPhone = member?.phone ? String(member.phone).replace(/\D/g, '') : '';
      const mName = String(member?.name || '').trim().toLowerCase();

      const count = rawLogs.filter((log: any) => {
        if (!log || log.status === 'duplicate') return false;
        const lMemberId = String(log.memberId || log.memberCode || log.uid || '').trim();
        const lBioId = String(log.biometricId || log.deviceUserId || log.bioId || '').trim();
        const lPhone = log.phone ? String(log.phone).replace(/\D/g, '') : '';
        const lName = String(log.memberName || '').trim().toLowerCase();

        if (mId && lMemberId === String(mId).trim()) return true;
        if (mBioId && lBioId === String(mBioId).trim()) return true;
        if (mPhone && lPhone && mPhone === lPhone) return true;
        if (mName && lName && mName === lName) return true;
        return false;
      }).length;

      setRealAttendanceCount(count);
    }, (error) => {
      console.warn("Member attendance count snapshot notice:", error.message);
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [id, member]);

  // ── ENGINE DERIVED VALUES (Single Source of Truth) ──────────────
  const effectiveAttendanceCount = realAttendanceCount || Number(member?.attendanceCount) || 0;
  const daysLeft       = member ? membershipEngine.calculateDaysLeft(member.expiryDate) : 0;
  const riskLevel      = membershipEngine.calculateRenewalRisk(daysLeft);
  const attendancePct  = member ? calculateRealAttendance(member.joinDate, effectiveAttendanceCount) : 0;
  const healthScore    = membershipEngine.calculateHealthScore(daysLeft, attendancePct);

  // Payment totals from invoices (Single Source of Truth)
  const isMemberPaid = member?.paymentStatus === 'paid' || (member?.totalPaid && member?.totalPaid >= member?.totalBilled);
  const totalInvoiced = memberInvoices.reduce((s, inv) => s + (Number(inv.amount) || 0) + (Number(inv.gst) || 0), 0);
  const totalPaid = isMemberPaid 
    ? (totalInvoiced || Number(member?.totalPaid) || Number(member?.price) || Number(member?.amount) || 0)
    : memberInvoices.reduce((s, inv) => {
        if (inv.status === 'paid' || inv.paymentStatus === 'paid') {
          return s + (Number(inv.amount) || 0) + (Number(inv.gst) || 0);
        }
        return s + (Number(inv.paid) || Number(inv.amount) || 0);
      }, 0);

  const rawOutstanding = isMemberPaid ? 0 : paymentEngine.calculateOutstandingAmount(totalInvoiced, totalPaid);
  const outstanding = Math.max(0, rawOutstanding);
  const payStatus = isMemberPaid ? 'PAID' : (outstanding <= 0 ? 'PAID' : paymentEngine.calculatePaymentStatus(totalInvoiced, totalPaid));

  // ── SELF HEAL & FALLBACK member fetch ───────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    let isMounted = true;

    const fetchFallbackMember = async () => {
      try {
        const res = await API.get(`/members/${id}`);
        if (res.data && isMounted) {
          setMember(res.data);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('API single member fetch failed, checking local store:', e);
      }

      const storeMembers = useGymStore.getState().members;
      const foundInStore = storeMembers.find((m: any) => m.id === id || m.uid === id || m.memberId === id);
      if (isMounted) {
        setMember(foundInStore || null);
        setLoading(false);
      }
    };

    const unsub = onSnapshot(doc(db, 'members', id), (d) => {
      if (!isMounted) return;
      if (d.exists()) {
        let m: any = { id: d.id, ...d.data() };
        if (m.plan && (!m.expiryDate || m.expiryDate === m.joinDate || m.expiryDate === new Date().toISOString().split('T')[0])) {
          const rawJoin = m.joinDate || m.createdAt;
          const corrected = membershipEngine.calculatePlanExpiryDate(m.plan, rawJoin);
          if (corrected > (m.expiryDate || '')) {
            m.expiryDate = corrected;
            membershipEngine.selfHealMemberData(m);
          }
        }
        setMember(m);
        setLoading(false);
      } else {
        fetchFallbackMember();
      }
    }, (error) => {
      if (error?.code !== 'permission-denied' && !error?.message?.includes('permissions')) {
        console.warn("Member profile snapshot notice:", error.message);
      }
      if (isMounted) fetchFallbackMember();
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [id]);

  // ── Real-time listener for invoices with API Fallback ───────────
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const fetchFallbackInvoices = async () => {
      try {
        const res = await API.get(`/billing?memberId=${id}`);
        const list = res.data || [];
        if (isMounted) setMemberInvoices(list);
      } catch (e) {
        console.warn('API fallback invoices fetch failed:', e);
      }
    };

    const q = query(collection(db, 'payments'), where('memberId', '==', id));
    const unsub = onSnapshot(q, (snap) => {
      if (isMounted) setMemberInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.warn("Member invoices snapshot error:", error.message);
      if (isMounted) fetchFallbackInvoices();
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6 flex flex-col gap-6">
        <div className="h-40 bg-white rounded-[32px] shadow-sm animate-pulse" />
        <div className="h-16 bg-white rounded-[24px] shadow-sm animate-pulse" />
        <div className="flex gap-6">
          <div className="flex-1 h-[600px] bg-white rounded-[32px] shadow-sm animate-pulse" />
          <div className="w-[300px] h-[600px] bg-white rounded-[32px] shadow-sm animate-pulse" />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-[500px] bg-white rounded-[32px] shadow-sm border border-slate-100 p-12 flex flex-col items-center justify-center text-center my-6">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
          <User size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Member Profile Not Found</h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          The requested member record (<code className="bg-slate-100 px-2 py-1 rounded text-slate-700 font-mono text-xs">{id}</code>) could not be located.
        </p>
        <button
          onClick={() => router.push('/dashboard/members')}
          className="px-6 py-3 bg-[#0052FF] text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2 cursor-pointer shadow-md"
        >
          <ArrowLeft size={16} /> Return to Members
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 font-sans pb-32">
      {/* ══ PREMIUM HERO CARD ══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="bg-white rounded-[24px] border border-slate-200/80 shadow-[0_2px_24px_rgba(11,92,190,0.06)] mb-6 overflow-hidden relative"
      >
        {/* Subtle corner glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 p-5 sm:p-7">

          {/* ── BACK NAV ──────────────────────────────────────────────────── */}
          <button
            onClick={() => router.push('/dashboard/members')}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer mb-5 transition-colors group"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Members
          </button>

          {/* ── 3-ZONE GRID ───────────────────────────────────────────────── */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">

            {/* ── ZONE 1: IDENTITY ──────────────────────────────────────── */}
            <div className="flex items-start gap-4 lg:w-[260px] shrink-0">
              {/* Avatar with camera overlay */}
              <div
                onClick={() => setShowPhotoModal(true)}
                className="relative shrink-0 cursor-pointer group"
                title="Click to change profile photo"
              >
                <div className="w-[88px] h-[88px] sm:w-[96px] sm:h-[96px] rounded-[20px] overflow-hidden border-[3px] border-white shadow-[0_4px_16px_rgba(0,0,0,0.10)] bg-slate-100">
                  <MemberAvatar member={member} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" size={96} />
                </div>
                {/* Camera overlay */}
                <div className="absolute inset-0 rounded-[20px] bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={18} className="text-white drop-shadow" />
                </div>
                {/* Status dot */}
                <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${daysLeft > 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              </div>

              {/* Name + Status + ID */}
              <div className="min-w-0">
                <h1 className="text-[26px] sm:text-[30px] font-black text-slate-900 tracking-tight leading-tight truncate">
                  {member.name || 'Member'}
                </h1>
                <div className="flex items-center gap-2 mt-1.5 mb-2.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                    daysLeft > 7
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : daysLeft > 0
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {daysLeft > 7 ? 'Active' : daysLeft > 0 ? 'Expiring' : 'Expired'}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <span className="text-[10px] font-black text-indigo-500 font-mono">
                    #{member.clientId || member.memberId || member.id}
                  </span>
                </div>
              </div>
            </div>

            {/* ── ZONE 2: MEMBERSHIP + METADATA ─────────────────────────── */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* Membership block */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl px-4 py-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Membership</span>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-lg font-extrabold text-slate-900">{member.plan || 'Standard'}</span>
                      {(member.amount || member.price || member.totalBilled) && (
                        <span className="text-sm font-bold text-[#0b5cbe]">
                          ₹{Number(member.amount || member.price || member.totalBilled || 0).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Expires</span>
                    <span className="text-sm font-bold text-slate-800">
                      {member.expiryDate
                        ? new Date(member.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                {(() => {
                  const totalDays = (() => {
                    const plan = String(member.plan || '').toLowerCase();
                    if (plan.includes('annual') || plan.includes('yearly') || plan.includes('12')) return 365;
                    if (plan.includes('6') || plan.includes('semi')) return 180;
                    if (plan.includes('3') || plan.includes('quarter')) return 90;
                    if (plan.includes('2')) return 60;
                    return 30;
                  })();
                  const pct = totalDays > 0 ? Math.max(0, Math.min(100, (daysLeft / totalDays) * 100)) : 0;
                  const barColor = daysLeft > 14 ? '#10b981' : daysLeft > 7 ? '#f59e0b' : '#ef4444';
                  return (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                      </div>
                      <p className="text-[10px] font-bold text-slate-500">
                        {daysLeft > 0 ? `${daysLeft} days remaining` : 'Membership expired'}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Compact metadata chips */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Branch */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[11px] font-semibold text-slate-600 shadow-2xs">
                  <span>📍</span> {member.branch || 'Mohali, Punjab'}
                </span>
                {/* Payment status */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${
                  payStatus === 'PAID'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {payStatus === 'PAID' ? '✓ Fully Paid' : `₹${outstanding.toLocaleString('en-IN')} Due`}
                </span>
                {/* Trainer (compact dropdown) */}
                <TrainerSelectorDropdown
                  member={member}
                  onTrainerUpdated={({ trainerId, trainerName }) => {
                    setMember((prev: any) => ({ ...prev, trainerId, trainerName, trainer: trainerName }));
                  }}
                />
              </div>

              {/* ── SNAPSHOT METRICS ──────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    label: 'Health Score',
                    value: `${Math.max(0, 100 - healthScore)}%`,
                    color: healthScore < 40 ? '#10b981' : healthScore < 70 ? '#f59e0b' : '#ef4444',
                    icon: '❤️',
                  },
                  {
                    label: 'Attendance',
                    value: `${attendancePct}%`,
                    color: attendancePct > 60 ? '#10b981' : attendancePct > 30 ? '#f59e0b' : '#94a3b8',
                    icon: '📅',
                  },
                  {
                    label: 'Days Left',
                    value: daysLeft > 0 ? String(daysLeft) : '0',
                    color: daysLeft > 14 ? '#0b5cbe' : daysLeft > 0 ? '#f59e0b' : '#ef4444',
                    icon: '⏱',
                  },
                  {
                    label: 'Payment',
                    value: payStatus === 'PAID' ? 'Paid' : 'Due',
                    color: payStatus === 'PAID' ? '#10b981' : '#f59e0b',
                    icon: '💳',
                  },
                ].map(m => (
                  <div key={m.label} className="bg-white border border-slate-200/80 rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-2xs">
                    <span className="text-base leading-none">{m.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 leading-tight">{m.label}</div>
                      <div className="text-sm font-extrabold leading-tight mt-0.5 truncate" style={{ color: m.color }}>{m.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── ZONE 3: ACTIONS ───────────────────────────────────────── */}
            <div className="flex flex-row lg:flex-col gap-2 lg:w-[148px] shrink-0 flex-wrap">
              <button
                onClick={() => setShowPtModal(true)}
                className="flex-1 lg:flex-none py-2.5 px-4 bg-[#0b5cbe] hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-1.5 text-xs font-extrabold transition-all cursor-pointer shadow-md hover:shadow-[0_4px_12px_rgba(11,92,190,0.35)] active:scale-[0.98] border-none"
                title="Add Personal Training Bill"
              >
                <Dumbbell size={14} /> + Add PT Bill
              </button>
              <button
                onClick={() => {
                  const rawPhone = (member.phone || '').replace(/\D/g, '');
                  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
                  if (cleanPhone) window.open(`https://wa.me/${cleanPhone}`, '_blank');
                  else toast.error('No valid phone number for WhatsApp');
                }}
                className="flex-1 lg:flex-none py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl flex items-center justify-center gap-1.5 text-xs font-extrabold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                title="Send WhatsApp Message"
              >
                <MessageSquare size={14} /> WhatsApp
              </button>
              <button
                onClick={() => {
                  if (member.phone) window.location.href = `tel:${member.phone}`;
                  else toast.error('No phone number recorded');
                }}
                className="flex-1 lg:flex-none py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl flex items-center justify-center gap-1.5 text-xs font-extrabold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                title="Call Member"
              >
                <Phone size={14} /> Call
              </button>
            </div>

          </div>{/* end 3-zone grid */}
        </div>{/* end inner padding */}
      </motion.div>
      {/* ══ END HERO CARD ══════════════════════════════════════════════════ */}

      {/* 2. PROFILE NAVIGATION */}
      <div className="flex items-center gap-2 overflow-x-auto pb-6 scrollbar-hide">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`relative px-5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap z-10 ${activeTab === tab ? 'text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            {activeTab === tab && (
              <motion.div layoutId="activeTabIndicator" className="absolute inset-0 bg-white border border-blue-100 shadow-[0_2px_8px_rgba(37,99,235,0.1)] rounded-2xl -z-10" initial={false} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
            )}
            {tab}
          </button>
        ))}
      </div>

      {/* 3. MAIN CONTENT (FULL-WIDTH FOR ALL TABS) */}
      <div className="w-full">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {activeTab === 'Profile' && <ProfileTab member={member} />}
            {activeTab === 'Billing' && <BillingTab member={member} />}
            {activeTab === 'Communication' && <CommunicationTab member={member} />}
            {activeTab === 'Attendance' && <AttendanceTab member={member} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── PHOTO UPLOAD & CAPTURE MODAL ── */}
      <AnimatePresence>
        {showPhotoModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-w-md w-full relative space-y-4 text-slate-900 z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Camera size={20} className="text-blue-600" />
                  <h3 className="font-extrabold text-slate-900 text-lg">Upload Member Profile Photo</h3>
                </div>
                <button
                  onClick={() => setShowPhotoModal(false)}
                  className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              <SmartPhotoCapture
                value={member?.photo || member?.avatarUrl || member?.avatar || undefined}
                onCaptureComplete={(urls) => handleSavePhoto(urls.photoURL)}
                label={member?.name || 'Member'}
              />

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border-none cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── RENEWAL WIZARD MODAL ── */}
      <RenewalWizardModal
        isOpen={showRenewalModal}
        member={member}
        onClose={() => setShowRenewalModal(false)}
      />

      {/* ── PT BILLING MODAL ── */}
      <PtBillingModal
        isOpen={showPtModal}
        member={member}
        onClose={() => setShowPtModal(false)}
        onSuccess={(updatedMem: any) => {
          if (updatedMem) setMember({ ...updatedMem });
          useGymStore.getState().fetchMembers();
          useGymStore.getState().fetchPayments();
        }}
      />
    </div>
  );
}
