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
import toast from 'react-hot-toast';
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
import ActivityTimelineTab from './components/ActivityTimelineTab';

const TABS = [
  'Profile', 'Billing', 'Communication', 'Attendance', 'Activity Timeline'
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
          <ArrowLeft size={16} /> Return to Members Directory
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 font-sans pb-32">
      {/* 1. TOP HEADER SECTION */}
      <div className="bg-white rounded-[32px] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-slate-100 p-8 mb-6 flex items-start justify-between relative">
        <div className="absolute inset-0 rounded-[32px] overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3" />
        </div>
        
        <div className="relative z-10 flex gap-8 w-full">
          <div className="flex flex-col items-center gap-4">
            <button onClick={() => router.push('/dashboard/members')} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-50 py-2 rounded-xl border border-slate-200 transition-all hover:bg-slate-100">
              <ArrowLeft size={14} /> Back
            </button>
            <div 
              onClick={() => setShowPhotoModal(true)}
              className="w-32 h-32 rounded-3xl bg-slate-100 border-[4px] border-white shadow-xl overflow-hidden relative group cursor-pointer flex-shrink-0"
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
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[10px] font-extrabold transition-all border border-blue-200 cursor-pointer flex items-center gap-1"
            >
              <Camera size={12} />
              <span>Upload Photo</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{member.name || 'Member'}</h1>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-100">
                Active
              </span>
            </div>
            
            <p className="text-sm font-semibold text-slate-500 flex items-center gap-2 mb-6 flex-wrap">
              <span className="text-slate-400">Bio ID:</span> 
              <span className="font-mono font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                #{member.biometricId || member.deviceUserId || member.clientId || member.customId || member.memberId || member.id}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-400">Ref Code:</span> <span className="font-mono font-bold text-slate-800">{member.memberId || member.id}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-400">Plan:</span> <span className="font-bold text-slate-800">{member.plan || 'Standard'}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-400">Branch:</span> <span className="font-bold text-slate-800">{member.branch || 'Mohali, Punjab'}</span>
            </p>

            <div className="flex flex-wrap items-center gap-8">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Health Score</span>
                <div className={`flex items-center gap-1.5 text-lg font-black ${healthScore < 40 ? 'text-emerald-500' : healthScore < 70 ? 'text-amber-500' : 'text-red-500'}`}>
                  <Activity size={18} /> {Math.max(0, 100 - healthScore)}%
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Attendance</span>
                <div className="flex items-center gap-1.5 text-lg font-black text-blue-500">
                  <Calendar size={18} /> {attendancePct}%
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Days Left</span>
                <div className={`flex items-center gap-1.5 text-lg font-black ${daysLeft <= 0 ? 'text-red-500' : daysLeft <= 7 ? 'text-orange-500' : 'text-amber-500'}`}>
                  <Clock size={18} /> {daysLeft > 0 ? `${daysLeft} Days` : 'Expired'}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Payment</span>
                <div className={`flex items-center gap-1.5 text-sm font-black ${payStatus === 'PAID' ? 'text-emerald-600' : 'text-orange-500'}`}>
                  <DollarSign size={16} />
                  {payStatus === 'PAID' ? 'Fully Paid ✅' : `₹${outstanding.toLocaleString('en-IN')} Due`}
                </div>
              </div>
              <div>
                <TrainerSelectorDropdown
                  member={member}
                  onTrainerUpdated={({ trainerId, trainerName }) => {
                    setMember((prev: any) => ({ ...prev, trainerId, trainerName, trainer: trainerName }));
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start flex-wrap">
            <button
              onClick={() => setShowPtModal(true)}
              className="py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl flex justify-center items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
              title="Add Personal Training Bill"
            >
              <Dumbbell size={16} className="text-amber-600" /> + Add PT Bill
            </button>

            <button
              onClick={() => {
                const rawPhone = (member.phone || '').replace(/\D/g, '');
                const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
                if (cleanPhone) window.open(`https://wa.me/${cleanPhone}`, '_blank');
                else toast.error('No valid phone number for WhatsApp');
              }}
              className="py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl flex justify-center items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
              title="Send WhatsApp Message"
            >
              <MessageSquare size={16} /> WhatsApp
            </button>
            <button
              onClick={() => {
                if (member.phone) window.location.href = `tel:${member.phone}`;
                else toast.error('No phone number recorded');
              }}
              className="py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl flex justify-center items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
              title="Call Member"
            >
              <Phone size={16} /> Call
            </button>
          </div>
        </div>
      </div>

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
            {activeTab === 'Activity Timeline' && <ActivityTimelineTab member={member} />}
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
        onSaved={() => {
          useGymStore.getState().fetchMembers();
          useGymStore.getState().fetchPayments();
        }}
      />
    </div>
  );
}
