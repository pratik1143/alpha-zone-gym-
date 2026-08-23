'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Edit3, Shield, Activity, Droplets, Calendar,
  Clock, DollarSign, MessageSquare, Phone, Mail, Printer, Download,
  Trash2, Snowflake, Repeat, Sparkles, AlertCircle, Bell, ChevronRight, Camera, User, Dumbbell,
  CheckCircle2, CreditCard, HeartPulse, MapPin, Briefcase, Award, Fingerprint, RefreshCw, X
} from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { membershipEngine } from '@/lib/engines/membershipEngine';
import { paymentEngine } from '@/lib/engines/paymentEngine';
import { calculateRealAttendance, formatDate } from '@/lib/utils';
import { resolveAvatarUrl, MALE_DEFAULT_AVATAR, FEMALE_DEFAULT_AVATAR } from '@/lib/avatar';
import API from '@/services/api';
import { useGymStore } from '@/store';
import MemberAvatar from '../../components/MemberAvatar';
import SmartPhotoCapture from '../../components/SmartPhotoCapture';
import RenewalWizardModal from '../components/RenewalWizardModal';
import TrainerSelectorDropdown from '../components/TrainerSelectorDropdown';
import PtBillingModal from '../components/PtBillingModal';

// Tabs
import BillingTab from './components/BillingTab';
import CommunicationTab from './components/CommunicationTab';
import AttendanceTab from './components/AttendanceTab';
import ActivityTimelineTab from './components/ActivityTimelineTab';

const TABS = [
  'Overview Profile', 'Billing & Invoices', 'Communication', 'Attendance Logs', 'Activity Timeline'
];

export default function ClientProfileSystem() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = params?.id as string;
  const id = rawId ? decodeURIComponent(rawId) : '';

  const { plans } = useGymStore();

  const [activeTab, setActiveTab] = useState('Overview Profile');
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [memberInvoices, setMemberInvoices] = useState<any[]>([]);
  const [memberAttendanceLogs, setMemberAttendanceLogs] = useState<any[]>([]);
  const [memberFollowUps, setMemberFollowUps] = useState<any[]>([]);
  
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showPtModal, setShowPtModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);

  useEffect(() => {
    if (searchParams && searchParams.get('renew') === 'true') {
      setShowRenewalModal(true);
    }
  }, [searchParams]);

  // ── 1. REAL-TIME MEMBER SNAPSHOT LISTENER ─────────────────────────
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
        console.warn('Member profile snapshot notice:', error.message);
      }
      if (isMounted) fetchFallbackMember();
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [id]);

  // ── 2. REAL-TIME ATTENDANCE LOGS LISTENER ─────────────────────────
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const unsub = onSnapshot(collection(db, 'attendance_logs'), (snap) => {
      if (!isMounted) return;
      const allLogs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const mId = String(member?.id || id).trim();
      const mBioId = String(member?.biometricId || '').trim();
      const mPhone = member?.phone ? String(member.phone).replace(/\D/g, '') : '';
      const mName = String(member?.name || '').trim().toLowerCase();

      const filtered = allLogs.filter((log: any) => {
        if (!log || log.status === 'duplicate') return false;
        const lMemberId = String(log.memberId || log.memberCode || log.uid || '').trim();
        const lBioId = String(log.biometricId || log.deviceUserId || log.bioId || '').trim();
        const lPhone = log.phone ? String(log.phone).replace(/\D/g, '') : '';
        const lName = String(log.memberName || '').trim().toLowerCase();

        return (mId && lMemberId === mId) ||
               (mBioId && lBioId === mBioId) ||
               (mPhone && lPhone && mPhone === lPhone) ||
               (mName && lName && mName === lName);
      }).sort((a: any, b: any) => {
        const timeA = new Date(a.timestamp || a.date || a.createdAt || 0).getTime();
        const timeB = new Date(b.timestamp || b.date || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      setMemberAttendanceLogs(filtered);
    }, (err) => {
      console.warn('Attendance logs listener notice:', err.message);
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [id, member]);

  // ── 3. REAL-TIME INVOICES LISTENER ────────────────────────────────
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
      console.warn('Member invoices snapshot error:', error.message);
      if (isMounted) fetchFallbackInvoices();
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [id]);

  // ── 4. REAL-TIME FOLLOW-UPS LISTENER ──────────────────────────────
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const unsub = onSnapshot(collection(db, 'follow_ups'), (snap) => {
      if (!isMounted) return;
      const allFollowUps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const mId = String(member?.id || id).trim();
      const mPhone = member?.phone ? String(member.phone).replace(/\D/g, '') : '';
      const filtered = allFollowUps.filter((f: any) => {
        const fMemberId = String(f.memberId || '').trim();
        const fPhone = f.phone ? String(f.phone).replace(/\D/g, '') : '';
        return (mId && fMemberId === mId) || (mPhone && fPhone && mPhone === fPhone);
      });
      setMemberFollowUps(filtered);
    }, (err) => {
      console.warn('Follow-ups listener notice:', err.message);
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [id, member]);

  // ── DERIVED METRICS ───────────────────────────────────────────────
  const effectiveAttendanceCount = memberAttendanceLogs.length || Number(member?.attendanceCount) || 0;
  const daysLeft = member ? membershipEngine.calculateDaysLeft(member.expiryDate) : 0;
  const attendancePct = member ? calculateRealAttendance(member.joinDate, effectiveAttendanceCount) : 0;
  
  // Payment totals
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

  const lastPunch = memberAttendanceLogs[0];
  const lastPunchTime = lastPunch ? (lastPunch.timestamp || lastPunch.date || lastPunch.createdAt) : null;

  // Streak Calculation
  const streakCount = useMemo(() => {
    if (memberAttendanceLogs.length === 0) return 0;
    const dates = Array.from(new Set(memberAttendanceLogs.map(l => {
      const d = l.timestamp || l.date || l.createdAt;
      return d ? new Date(d).toISOString().split('T')[0] : null;
    }).filter(Boolean))).sort().reverse();

    if (dates.length === 0) return 0;
    let streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      const curr = new Date(dates[i] as string);
      const prev = new Date(dates[i+1] as string);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (Math.round(diff) === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [memberAttendanceLogs]);

  // BMI Calculation
  const bmiValue = useMemo(() => {
    if (!member?.weight || !member?.height) return null;
    const w = Number(member.weight);
    const h = Number(member.height) / 100;
    if (w <= 0 || h <= 0) return null;
    return (w / (h * h)).toFixed(1);
  }, [member?.weight, member?.height]);

  // Photo update handler
  const handleSavePhoto = async (photoUrl: string) => {
    if (!member) return;
    const targetMemberId = member.id || id;
    try {
      await API.put(`/members/${targetMemberId}`, {
        photo: photoUrl,
        avatarUrl: photoUrl,
        avatar: photoUrl,
        updatedAt: new Date().toISOString()
      });
      try {
        await updateDoc(doc(db, 'members', targetMemberId), {
          photo: photoUrl,
          avatarUrl: photoUrl,
          avatar: photoUrl,
          updatedAt: new Date().toISOString()
        });
      } catch (fsErr) {}

      setMember((prev: any) => ({ ...prev, photo: photoUrl, avatarUrl: photoUrl, avatar: photoUrl }));
      toast.success(`${member.name || 'Member'} profile photo updated!`);
      setShowPhotoModal(false);
      useGymStore.getState().fetchMembers();
    } catch (err: any) {
      toast.error('Failed to update photo: ' + err.message);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = () => {
    if (!member) return;
    setEditFormData({
      ...member,
      name: member.name || '',
      phone: member.phone || '',
      email: member.email || '',
      gender: member.gender || 'Male',
      age: member.age || 25,
      dob: member.dob || '',
      weight: member.weight || '',
      height: member.height || '',
      bloodGroup: member.bloodGroup || 'O+',
      medicalNotes: member.medicalNotes || member.medicalConditions || '',
      plan: member.plan || member.packageName || 'Monthly',
      branch: member.branch || 'Mohali, Punjab',
      trainer: member.trainer || member.trainerName || '',
      expiryDate: member.expiryDate || '',
      joinDate: member.joinDate || member.startDate || '',
      address: member.address || '',
      emergencyContact: member.emergencyContact || '',
      biometricId: member.biometricId || '',
      avatar: member.photo || member.avatarUrl || member.avatar || ''
    });
    setShowEditModal(true);
  };

  // Save Edit Handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !member) return;
    try {
      const updates = {
        name: editFormData.name,
        phone: editFormData.phone,
        email: editFormData.email || '',
        gender: editFormData.gender || 'Male',
        age: editFormData.age ? Number(editFormData.age) : undefined,
        dob: editFormData.dob || undefined,
        weight: editFormData.weight ? Number(editFormData.weight) : undefined,
        height: editFormData.height ? Number(editFormData.height) : undefined,
        bloodGroup: editFormData.bloodGroup || undefined,
        medicalNotes: editFormData.medicalNotes || undefined,
        plan: editFormData.plan,
        branch: editFormData.branch,
        trainer: editFormData.trainer || 'Unassigned',
        trainerName: editFormData.trainer || 'Unassigned',
        expiryDate: editFormData.expiryDate,
        joinDate: editFormData.joinDate,
        address: editFormData.address || '',
        emergencyContact: editFormData.emergencyContact || '',
        biometricId: editFormData.biometricId ? Number(editFormData.biometricId) : undefined,
        photo: editFormData.avatar || undefined,
        avatarUrl: editFormData.avatar || undefined,
        avatar: editFormData.avatar || undefined,
        updatedAt: new Date().toISOString()
      };

      try {
        await updateDoc(doc(db, 'members', member.id), updates);
      } catch (fsErr) {
        console.warn('Direct firestore update notice:', fsErr);
      }

      try {
        await API.put(`/members/${member.id}`, updates);
      } catch (apiErr) {
        console.warn('API update member notice:', apiErr);
      }

      setMember((prev: any) => ({ ...prev, ...updates }));
      toast.success('Member profile updated successfully!');
      setShowEditModal(false);
      useGymStore.getState().fetchMembers();
    } catch (err: any) {
      toast.error('Failed to update member: ' + (err.message || 'Unknown error'));
    }
  };

  // Toggle Freeze Handler
  const handleToggleFreeze = async () => {
    if (!member) return;
    try {
      const isCurrentlyFrozen = member.status === 'frozen';
      const newStatus = isCurrentlyFrozen ? 'active' : 'frozen';
      await updateDoc(doc(db, 'members', member.id), {
        status: newStatus,
        frozenStartDate: newStatus === 'frozen' ? new Date().toISOString().split('T')[0] : null,
        updatedAt: new Date().toISOString()
      });
      setMember((prev: any) => ({ ...prev, status: newStatus }));
      toast.success(newStatus === 'frozen' ? `${member.name} membership frozen` : `${member.name} membership un-frozen`);
      useGymStore.getState().fetchMembers();
    } catch (err: any) {
      toast.error('Failed to update freeze status: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 flex flex-col gap-6 font-sans">
        <div className="h-44 bg-white rounded-3xl shadow-xs animate-pulse border border-slate-100" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[400px] bg-white rounded-3xl shadow-xs animate-pulse border border-slate-100" />
          <div className="h-[400px] bg-white rounded-3xl shadow-xs animate-pulse border border-slate-100" />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-[500px] bg-white rounded-3xl shadow-xs border border-slate-100 p-8 sm:p-12 flex flex-col items-center justify-center text-center my-6">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
          <User size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Member Profile Not Found</h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          The requested member record (<code className="bg-slate-100 px-2 py-1 rounded text-slate-700 font-mono text-xs">{id}</code>) could not be located.
        </p>
        <button
          onClick={() => router.push('/dashboard/members')}
          className="px-6 py-3 bg-[#0b5cbe] text-white rounded-2xl text-xs font-black hover:bg-blue-700 transition-all flex items-center gap-2 cursor-pointer shadow-md border-none active:scale-95"
        >
          <ArrowLeft size={16} /> Return to Members Directory
        </button>
      </div>
    );
  }

  const hasTrainer = Boolean(
    member?.trainerId &&
    member?.trainerId !== 'null' &&
    member?.trainer !== 'Unassigned' &&
    member?.trainerName !== 'Unassigned'
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-3 sm:p-6 font-sans pb-32 text-left">
      
      {/* ── TOP ACTION BAR (Back to Members & Edit Action) ─────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button 
          onClick={() => router.push('/dashboard/members')} 
          className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
        >
          <ArrowLeft size={15} className="text-[#0b5cbe]" /> Back to Members
        </button>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Call */}
          <button
            onClick={() => {
              if (member.phone) window.location.href = `tel:${member.phone}`;
              else toast.error('No phone number recorded');
            }}
            className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#0b5cbe] border border-blue-200/80 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
            title="Call Member"
          >
            <Phone size={14} /> Call
          </button>

          {/* Quick WhatsApp */}
          <button
            onClick={() => {
              const rawPhone = (member.phone || '').replace(/\D/g, '');
              const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
              if (cleanPhone) window.open(`https://wa.me/${cleanPhone}`, '_blank');
              else toast.error('No valid phone number for WhatsApp');
            }}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
            title="WhatsApp Member"
          >
            <MessageSquare size={14} /> WhatsApp
          </button>

          {/* Renew Plan */}
          <button
            onClick={() => setShowRenewalModal(true)}
            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
            title="Renew Membership"
          >
            <RefreshCw size={14} /> Renew Plan
          </button>

          {/* Freeze / Unfreeze */}
          <button
            onClick={handleToggleFreeze}
            className={`px-3.5 py-2.5 border rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all ${
              member.status === 'frozen'
                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Snowflake size={14} /> {member.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
          </button>

          {/* Edit Member */}
          <button
            onClick={handleOpenEdit}
            className="px-4 py-2.5 bg-gradient-to-r from-[#0b5cbe] to-[#2876d0] hover:from-[#084a99] hover:to-[#0b5cbe] text-white rounded-2xl text-xs font-black uppercase tracking-wider border-none flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Edit3 size={14} /> Edit Member
          </button>
        </div>
      </div>

      {/* ── MEMBER HEADER HERO CARD ─────────────────────────────────── */}
      <div className="bg-white rounded-3xl shadow-[0_4px_25px_rgba(11,92,190,0.03)] border border-slate-100 p-6 sm:p-8 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          
          {/* Avatar with Smart Upload Action */}
          <div className="flex flex-col items-center gap-2.5 shrink-0">
            <div 
              onClick={() => setShowPhotoModal(true)}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-100 border-4 border-white shadow-xl overflow-hidden relative group cursor-pointer shrink-0"
              title="Click to Upload / Change Profile Photo"
            >
              <MemberAvatar member={member} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" size={128} />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1">
                <Camera className="text-white" size={24} />
                <span className="text-[9px] font-black uppercase tracking-wider">Change Photo</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-[#0b5cbe] rounded-xl text-[10px] font-black transition-all border border-blue-200 cursor-pointer flex items-center gap-1"
            >
              <Camera size={11} />
              <span>Change Photo</span>
            </button>
          </div>

          {/* Member Main Information */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                {member.name || 'Member Profile'}
              </h1>
              
              {/* Account Status Badge */}
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                member.status === 'frozen'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : daysLeft <= 0
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {member.status === 'frozen' ? 'Frozen' : daysLeft <= 0 ? 'Expired' : 'Active'}
              </span>

              {/* PT Badge */}
              {member.isPt && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded-md uppercase border border-amber-300">
                  PT Member
                </span>
              )}
            </div>

            {/* Badges / Metadata Row */}
            <div className="text-xs font-semibold text-slate-500 flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-4">
              <span className="font-mono font-black text-[#0b5cbe] bg-[#eaf3ff] border border-[#b9d6f5] px-2.5 py-0.5 rounded-lg">
                Bio ID: #{member.biometricId || member.deviceUserId || member.clientId || member.customId || '—'}
              </span>
              <span className="text-slate-300">·</span>
              <span className="font-mono font-bold text-slate-700">Client ID: #{member.clientId ? `AZ-${member.clientId}` : (member.memberId || member.id)}</span>
              <span className="text-slate-300">·</span>
              <span className="font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                👑 {member.packageName || member.plan || 'Standard Plan'}
              </span>
              <span className="text-slate-300">·</span>
              <span className="font-bold text-slate-600">📞 {member.phone || 'No phone'}</span>
            </div>

            {/* 4 Key Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Attendance</span>
                <div className="flex items-center gap-1.5 text-base font-black text-[#0b5cbe] font-mono">
                  <Calendar size={15} /> {attendancePct}%
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Days Remaining</span>
                <div className={`flex items-center gap-1.5 text-base font-black font-mono ${daysLeft <= 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  <Clock size={15} /> {daysLeft > 0 ? `${daysLeft} Days` : 'Expired'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Payment Status</span>
                <div className={`flex items-center gap-1.5 text-sm font-black font-mono ${payStatus === 'PAID' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <DollarSign size={15} /> {payStatus === 'PAID' ? 'PAID ✅' : `₹${outstanding.toLocaleString('en-IN')} Due`}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Branch</span>
                <div className="text-xs font-black text-slate-800 truncate">
                  {member.branch || 'Mohali, Punjab'}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── SECTION / DRILLDOWN TABS ─────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {TABS.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`relative px-4 py-2 rounded-2xl text-xs font-black transition-all whitespace-nowrap z-10 cursor-pointer border-none ${
              activeTab === tab ? 'bg-[#0b5cbe] text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ─────────────────────────────────────────────── */}
      {activeTab === 'Overview Profile' && (
        <div className="space-y-6">
          
          {/* 2-COLUMN RESPONSIVE GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* ════════════ LEFT COLUMN ════════════ */}
            <div className="space-y-6">
              
              {/* 1. CONTRACT DETAILS */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <CreditCard size={15} className="text-[#0b5cbe]" /> 1. Contract Details
                  </h3>
                  <button 
                    onClick={() => setShowRenewalModal(true)}
                    className="text-[10px] font-bold text-[#0b5cbe] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer"
                  >
                    Renew
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Plan</span>
                    <span className="font-black text-slate-900">{member.packageName || member.plan || 'Standard'}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Start Date</span>
                    <span className="font-bold text-slate-700">{formatDate(member.startDate || member.joinDate) || 'Not available'}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Expiry Date</span>
                    <span className="font-bold text-slate-700">{formatDate(member.expiryDate) || 'Not available'}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Days Left</span>
                    <span className={`font-black font-mono ${daysLeft <= 0 ? 'text-rose-600' : 'text-[#0b5cbe]'}`}>
                      {daysLeft > 0 ? `${daysLeft} Days` : daysLeft === 0 ? 'Expires Today' : `Expired ${Math.abs(daysLeft)}d ago`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Joining Date</span>
                    <span className="font-bold text-slate-700">{formatDate(member.joinDate || member.startDate || member.createdAt) || 'Not available'}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Branch</span>
                    <span className="font-bold text-slate-700">{member.branch || 'Mohali, Punjab'}</span>
                  </div>
                </div>
              </div>

              {/* 2. PHYSICAL PARAMETERS */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={15} className="text-rose-600" /> 2. Physical Parameters
                  </h3>
                  <button 
                    onClick={handleOpenEdit}
                    className="text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer"
                  >
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Weight</span>
                    <span className="text-xl font-black text-slate-900 font-mono">
                      {member.weight ? `${member.weight} kg` : 'Not available'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Height</span>
                    <span className="text-xl font-black text-slate-900 font-mono">
                      {member.height ? `${member.height} cm` : 'Not available'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">BMI Score</span>
                    <span className="text-xl font-black text-emerald-600 font-mono">
                      {bmiValue || member.bmi || 'Not available'}
                    </span>
                  </div>
                </div>

                {member.medicalNotes && (
                  <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs">
                    <span className="text-[9px] font-black text-amber-900 uppercase tracking-wider block mb-0.5">Medical Notes</span>
                    <span className="text-slate-700 font-medium">{member.medicalNotes}</span>
                  </div>
                )}
              </div>

              {/* 3. ASSIGNED TRAINER */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Dumbbell size={15} className="text-[#0b5cbe]" /> 3. Assigned Trainer
                  </h3>
                  <button 
                    onClick={() => setShowPtModal(true)}
                    className="text-[10px] font-bold text-[#0b5cbe] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer"
                  >
                    + Add PT
                  </button>
                </div>

                {hasTrainer ? (
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-slate-200 shrink-0">
                        <img 
                          src={member.trainerAvatar || resolveAvatarUrl({ name: member.trainerName || member.trainer, role: 'Trainer' })} 
                          onError={(e) => { e.currentTarget.src = MALE_DEFAULT_AVATAR; }}
                          alt="Trainer" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-sm">{member.trainerName || member.trainer}</div>
                        <div className="text-[10.5px] text-slate-500 font-medium">{member.trainerRole || 'Personal Trainer & Strength'}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black text-[9px] uppercase tracking-wider rounded-full">
                        Assigned Coach
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                    <p className="text-xs font-bold text-slate-600 mb-2">No Personal Trainer Assigned</p>
                    <div className="max-w-xs mx-auto">
                      <TrainerSelectorDropdown
                        member={member}
                        onTrainerUpdated={({ trainerId, trainerName }) => {
                          setMember((prev: any) => ({ ...prev, trainerId, trainerName, trainer: trainerName }));
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. ACTIVITY METRICS */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={15} className="text-indigo-600" /> 4. Activity Metrics
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Punches</span>
                    <span className="text-xl font-black text-slate-900 font-mono">{effectiveAttendanceCount}</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Active Streak</span>
                    <span className="text-xl font-black text-amber-600 font-mono">{streakCount} Days</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Last Check-In</span>
                    <span className="text-xs font-bold text-slate-800 block mt-1">
                      {lastPunchTime ? new Date(lastPunchTime).toLocaleDateString('en-IN') : 'Never'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Attendance %</span>
                    <span className="text-xl font-black text-[#0b5cbe] font-mono">{attendancePct}%</span>
                  </div>
                </div>
              </div>

              {/* 5. BIOMETRIC SETUP */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Fingerprint size={15} className="text-[#0b5cbe]" /> 5. Biometric Setup
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Cloud Access</span>
                    <span className={`inline-flex items-center gap-1 font-bold ${member.biometricId ? 'text-emerald-700' : 'text-slate-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${member.biometricId ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      {member.biometricId ? 'Active & Synced' : 'Not Enrolled'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Fingerprint</span>
                    <span className="font-bold text-slate-800">
                      {member.biometricId ? `Enrolled (ID #${member.biometricId})` : 'Not Enrolled'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Biometric ID</span>
                    <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      #{member.biometricId || '—'}
                    </span>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                  Gateway: <b className="text-slate-700">Alpha Zone Hardware Sync</b> · Real-time attendance logging active.
                </div>
              </div>

            </div>

            {/* ════════════ RIGHT COLUMN ════════════ */}
            <div className="space-y-6">
              
              {/* 6. PAYMENT & MEMBERSHIP */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <DollarSign size={15} className="text-emerald-600" /> 6. Payment &amp; Membership
                  </h3>
                  <button 
                    onClick={() => setActiveTab('Billing & Invoices')}
                    className="text-[10px] font-bold text-[#0b5cbe] hover:underline bg-transparent border-none cursor-pointer"
                  >
                    View All Bills →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Package</span>
                    <span className="font-black text-slate-900">{member.packageName || member.plan || 'Standard'}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total Amount</span>
                    <span className="font-mono font-black text-slate-900">
                      ₹{(totalInvoiced || (totalPaid + outstanding) || Number(member.price || member.amount || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Amount Paid</span>
                    <span className="font-mono font-black text-emerald-600">₹{totalPaid.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Balance Due</span>
                    <span className={`font-mono font-black ${outstanding > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      ₹{outstanding.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Payment Status</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-black text-[9.5px] uppercase border ${
                      payStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {payStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Last Payment</span>
                    <span className="font-bold text-slate-700">
                      {memberInvoices[0]?.date ? formatDate(memberInvoices[0].date) : (formatDate(member.startDate) || 'Not available')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 7. ATTENDANCE HISTORY (Real records) */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={15} className="text-[#0b5cbe]" /> 7. Attendance History ({memberAttendanceLogs.length})
                  </h3>
                  <button 
                    onClick={() => setActiveTab('Attendance Logs')}
                    className="text-[10px] font-bold text-[#0b5cbe] hover:underline bg-transparent border-none cursor-pointer"
                  >
                    View All →
                  </button>
                </div>

                {memberAttendanceLogs.length > 0 ? (
                  <div className="overflow-x-auto max-h-60 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[9px] border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5">Date</th>
                          <th className="px-3 py-2.5">Check-In</th>
                          <th className="px-3 py-2.5">Check-Out</th>
                          <th className="px-3 py-2.5">Method</th>
                          <th className="px-3 py-2.5">Branch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {memberAttendanceLogs.slice(0, 5).map((log: any, idx: number) => {
                          const dateStr = log.timestamp || log.date || log.createdAt;
                          const inTime = log.inTime || (dateStr ? new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—');
                          const outTime = log.outTime || '—';
                          const method = log.method || log.deviceType || 'Biometric';

                          return (
                            <tr key={log.id || idx} className="hover:bg-slate-50/80">
                              <td className="px-3 py-2 font-bold text-slate-800">{formatDate(dateStr) || '—'}</td>
                              <td className="px-3 py-2 font-mono font-bold text-emerald-600">{inTime}</td>
                              <td className="px-3 py-2 font-mono text-slate-500">{outTime}</td>
                              <td className="px-3 py-2">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[9.5px] font-bold">
                                  {method}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-600 font-semibold">{log.branch || member.branch || 'Mohali'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl">
                    No attendance punch records found yet for this member.
                  </div>
                )}
              </div>

              {/* 8. FOLLOW-UPS */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Bell size={15} className="text-amber-600" /> 8. Follow-Ups ({memberFollowUps.length})
                  </h3>
                </div>

                {memberFollowUps.length > 0 ? (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar">
                    {memberFollowUps.map((f: any, idx: number) => (
                      <div key={f.id || idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex justify-between items-start">
                        <div>
                          <div className="font-black text-slate-900">{f.reason || 'Membership Follow-up'}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Staff: {f.staffName || f.assignedTo || 'Front Desk'}</div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[9px] uppercase">
                            {f.status || 'Pending'}
                          </span>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{formatDate(f.date || f.dueDate) || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl">
                    No follow-up records scheduled.
                  </div>
                )}
              </div>

              {/* 9. MEMBER INFORMATION */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <User size={15} className="text-[#0b5cbe]" /> 9. Member Information
                  </h3>
                  <button 
                    onClick={handleOpenEdit}
                    className="text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer"
                  >
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Phone Number</span>
                    <span className="font-bold text-slate-800 font-mono">{member.phone || 'Not available'}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Email Address</span>
                    <span className="font-bold text-slate-800 truncate block">{member.email || 'Not available'}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Gender</span>
                    <span className="font-bold text-slate-800">{member.gender || 'Not available'}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Emergency Contact</span>
                    <span className="font-bold text-slate-800 font-mono">{member.emergencyContact || 'Not available'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Residential Address</span>
                    <span className="font-bold text-slate-800">{member.address || 'Not available'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Registration Date</span>
                    <span className="font-bold text-slate-700">{formatDate(member.createdAt || member.joinDate) || 'Not available'}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ── BILLING & INVOICES TAB ─────────────────────────────────── */}
      {activeTab === 'Billing & Invoices' && (
        <BillingTab member={member} />
      )}

      {/* ── COMMUNICATION TAB ───────────────────────────────────────── */}
      {activeTab === 'Communication' && (
        <CommunicationTab member={member} />
      )}

      {/* ── ATTENDANCE LOGS TAB ─────────────────────────────────────── */}
      {activeTab === 'Attendance Logs' && (
        <AttendanceTab member={member} />
      )}

      {/* ── ACTIVITY TIMELINE TAB ──────────────────────────────────── */}
      {activeTab === 'Activity Timeline' && (
        <ActivityTimelineTab member={member} />
      )}

      {/* ── PHOTO UPLOAD & CAPTURE MODAL ────────────────────────────── */}
      <AnimatePresence>
        {showPhotoModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-w-md w-full relative space-y-4 text-slate-900 z-10 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Camera size={20} className="text-[#0b5cbe]" />
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

      {/* ── EDIT MEMBER MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {showEditModal && editFormData && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900 z-10 text-left"
            >
              {/* Sticky Header */}
              <div className="sticky top-0 bg-white z-20 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-black text-base text-slate-900 leading-tight">Edit Member Profile</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Update member details, contact, physical &amp; membership info
                  </p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-semibold custom-scrollbar">
                <div className="w-full">
                  <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Member Photo</label>
                  <SmartPhotoCapture 
                    value={editFormData.avatar || undefined}
                    onCaptureComplete={(urls) => {
                      setEditFormData({ ...editFormData, avatar: urls.photoURL });
                    }}
                    label="Member"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Full Name *</label>
                    <input 
                      type="text" 
                      value={editFormData.name} 
                      onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} 
                      required 
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-bold" 
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Gender *</label>
                    <select 
                      value={editFormData.gender} 
                      onChange={e => setEditFormData({ ...editFormData, gender: e.target.value })} 
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none text-slate-800 font-bold cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Phone Number *</label>
                    <input 
                      type="tel" 
                      value={editFormData.phone} 
                      onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })} 
                      required 
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-mono font-bold" 
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={editFormData.email} 
                      onChange={e => setEditFormData({ ...editFormData, email: e.target.value })} 
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Membership Plan</label>
                    <select 
                      value={editFormData.plan} 
                      onChange={e => setEditFormData({ ...editFormData, plan: e.target.value })} 
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none text-slate-800 font-bold cursor-pointer"
                    >
                      {(plans && plans.length > 0 ? plans : [
                        { id: 'p1', name: '1 Month' },
                        { id: 'p3', name: '3 Months' },
                        { id: 'p6', name: '6 Months' },
                        { id: 'p12', name: '1 Year' }
                      ]).map((p: any) => (
                        <option key={p.id || p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Branch</label>
                    <input 
                      type="text" 
                      value={editFormData.branch} 
                      onChange={e => setEditFormData({ ...editFormData, branch: e.target.value })} 
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800" 
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Expiry Date</label>
                    <input 
                      type="date" 
                      value={editFormData.expiryDate} 
                      onChange={e => setEditFormData({ ...editFormData, expiryDate: e.target.value })} 
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-bold" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Weight (kg)</label>
                    <input 
                      type="number" 
                      value={editFormData.weight} 
                      onChange={e => setEditFormData({ ...editFormData, weight: e.target.value })} 
                      placeholder="e.g. 70"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-bold" 
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Height (cm)</label>
                    <input 
                      type="number" 
                      value={editFormData.height} 
                      onChange={e => setEditFormData({ ...editFormData, height: e.target.value })} 
                      placeholder="e.g. 175"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-bold" 
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Biometric ID</label>
                    <input 
                      type="number" 
                      value={editFormData.biometricId} 
                      onChange={e => setEditFormData({ ...editFormData, biometricId: e.target.value })} 
                      placeholder="Bio #"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-mono font-bold" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Emergency Contact</label>
                  <input 
                    type="tel" 
                    value={editFormData.emergencyContact} 
                    onChange={e => setEditFormData({ ...editFormData, emergencyContact: e.target.value })} 
                    placeholder="e.g. +91 98765 43210"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-mono" 
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Residential Address</label>
                  <input 
                    type="text" 
                    value={editFormData.address} 
                    onChange={e => setEditFormData({ ...editFormData, address: e.target.value })} 
                    placeholder="Full residential address"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800" 
                  />
                </div>

                {/* Sticky Footer */}
                <div className="pt-4 border-t border-slate-100 flex justify-end items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2.5 text-slate-500 hover:text-slate-700 text-xs font-black uppercase tracking-wider bg-transparent border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#0b5cbe] hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider border-none cursor-pointer shadow-md active:scale-95 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── RENEWAL WIZARD MODAL ────────────────────────────────────── */}
      <RenewalWizardModal
        isOpen={showRenewalModal}
        member={member}
        onClose={() => setShowRenewalModal(false)}
      />

      {/* ── PT BILLING MODAL ────────────────────────────────────────── */}
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
