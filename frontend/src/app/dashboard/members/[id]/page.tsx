'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Edit3, Shield, Activity, Droplets, Calendar,
  Clock, DollarSign, MessageSquare, Phone, Mail, Printer, Download,
  Trash2, Snowflake, Repeat, Sparkles, AlertCircle, Bell, ChevronRight, Camera, User
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { membershipEngine } from '@/lib/engines/membershipEngine';
import { paymentEngine } from '@/lib/engines/paymentEngine';
import { calculateRealAttendance } from '@/lib/utils';
import API from '@/services/api';
import { useGymStore } from '@/store';

// Tabs
import ProfileTab from './components/ProfileTab';
import BillingTab from './components/BillingTab';
import CommunicationTab from './components/CommunicationTab';
import AttendanceTab from './components/AttendanceTab';
import BodyMeasurementsTab from './components/BodyMeasurementsTab';
import WorkoutTab from './components/WorkoutTab';
import NutritionTab from './components/NutritionTab';
import DocumentsTab from './components/DocumentsTab';
import BookingsTab from './components/BookingsTab';

import ActivityTimelineTab from './components/ActivityTimelineTab';

const TABS = [
  'Profile', 'Billing', 'Communication', 'Attendance', 
  'Body Measurements', 'Workout', 'Nutrition', 'Documents', 
  'Bookings', 'Activity Timeline'
];

export default function ClientProfileSystem() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id as string;
  const id = rawId ? decodeURIComponent(rawId) : '';

  const [activeTab, setActiveTab] = useState('Profile');
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [memberInvoices, setMemberInvoices] = useState<any[]>([]);

  // ── ENGINE DERIVED VALUES (Single Source of Truth) ──────────────
  const daysLeft       = member ? membershipEngine.calculateDaysLeft(member.expiryDate) : 0;
  const riskLevel      = membershipEngine.calculateRenewalRisk(daysLeft);
  const attendancePct  = member ? calculateRealAttendance(member.joinDate, member.attendanceCount || 0) : 0;
  const healthScore    = membershipEngine.calculateHealthScore(daysLeft, attendancePct);

  // Payment totals from invoices
  const totalInvoiced  = memberInvoices.reduce((s, inv) => s + (Number(inv.amount)||0) + (Number(inv.gst)||0), 0);
  const totalPaid      = memberInvoices.reduce((s, inv) => s + (Number(inv.paid)||Number(inv.amount)||0), 0);
  const outstanding    = paymentEngine.calculateOutstandingAmount(totalInvoiced, totalPaid);
  const payStatus      = paymentEngine.calculatePaymentStatus(totalInvoiced, totalPaid);

  // Activity Alerts — now driven by real engine data
  const rightPanelAlerts = [
    { type: 'Membership', title: daysLeft > 0 ? `Expires in ${daysLeft} Days` : 'Membership Expired', time: riskLevel === 'Critical' ? 'Critical' : riskLevel === 'High' ? 'Urgent' : 'Info', icon: <AlertCircle size={14} className={riskLevel === 'Critical' || riskLevel === 'High' ? 'text-red-500' : 'text-amber-500'} /> },
    { type: 'Attendance', title: `${attendancePct}% Attendance Rate`, time: `${member?.attendanceCount || 0} total visits`, icon: <Clock size={14} className="text-emerald-500" /> },
    ...(outstanding > 0 ? [{ type: 'Payment', title: 'Outstanding Balance', time: `₹${outstanding.toLocaleString('en-IN')} due`, icon: <DollarSign size={14} className="text-orange-500" /> }] : [{ type: 'Payment', title: 'All Payments Cleared', time: 'Fully Paid ✅', icon: <DollarSign size={14} className="text-emerald-500" /> }]),
  ];

  // ── SELF HEAL & FALLBACK member fetch ───────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    let isMounted = true;

    const fetchFallbackMember = async () => {
      try {
        const res = await API.get('/members');
        const list = res.data || [];
        const found = list.find((m: any) => m.id === id || m.uid === id || m.memberId === id);
        if (found && isMounted) {
          setMember(found);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('API fallback fetch failed:', e);
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
        const m = { id: d.id, ...d.data() };
        setMember(m);
        setLoading(false);
        try { membershipEngine.selfHealMemberData(m); } catch (_) {}
      } else {
        fetchFallbackMember();
      }
    }, (error) => {
      console.warn("Member profile snapshot error:", error.message);
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
        const res = await API.get('/billing');
        const list = res.data || [];
        const invs = list.filter((inv: any) => inv.memberId === id || inv.memberUid === id);
        if (isMounted) setMemberInvoices(invs);
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
      <div className="bg-white rounded-[32px] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-slate-100 p-8 mb-6 flex items-start justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none -translate-y-1/2 translate-x-1/3" />
        
        <div className="relative z-10 flex gap-8 w-full">
          <div className="flex flex-col items-center gap-4">
            <button onClick={() => router.push('/dashboard/members')} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-50 py-2 rounded-xl border border-slate-200 transition-all hover:bg-slate-100">
              <ArrowLeft size={14} /> Back
            </button>
            <div className="w-32 h-32 rounded-3xl bg-slate-100 border-[4px] border-white shadow-xl overflow-hidden relative group cursor-pointer flex-shrink-0">
              {member.avatarUrl || member.avatar ? (
                <img src={member.avatarUrl || member.avatar} alt="Profile" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-300">
                  {(member.name || 'Member').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="text-white" size={24} />
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{member.name || 'Member'}</h1>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-100">
                Active
              </span>
            </div>
            
            <p className="text-sm font-semibold text-slate-500 flex items-center gap-2 mb-6">
              <span className="text-slate-400">ID:</span> {member.memberId || member.id}
              <span className="text-slate-300">|</span>
              <span className="text-slate-400">Plan:</span> {member.plan || 'Standard'}
              <span className="text-slate-300">|</span>
              <span className="text-slate-400">Branch:</span> {member.branch || 'Main Branch'}
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assigned Trainer</span>
                <div className="flex items-center gap-1.5 text-sm font-black text-slate-700"><User size={16} className="text-slate-400" /> {member.trainer || 'Unassigned'}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-48">
            <button
              onClick={() => {
                const PLAN_DURATION_MAP: Record<string, number> = {
                  '1 month': 30, 'monthly': 30, '1month': 30,
                  '2 month': 60, '2 months': 60,
                  '3 month': 90, '3 months': 90, 'quarterly': 90,
                  '6 month': 180, '6 months': 180, 'semi': 180, 'half year': 180,
                  '12 month': 365, '12 months': 365, 'annual': 365, 'yearly': 365, '1 year': 365,
                  'lifetime': 3650,
                };
                const planLower = (member.plan || '').toLowerCase();
                let days = 30;
                for (const [key, d] of Object.entries(PLAN_DURATION_MAP)) {
                  if (planLower.includes(key)) { days = d; break; }
                }
                // Since this is a manual fix for a paid renewal, start from TODAY
                const start = new Date();
                const newExpiry = new Date(start.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                updateDoc(doc(db, 'members', member.id), { expiryDate: newExpiry, status: 'active' })
                  .then(() => toast.success(`\u2705 Auto-synced! Expiry is now ${newExpiry}`))
                  .catch((e: any) => toast.error('Failed to sync: ' + e.message));
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md flex justify-center items-center gap-2 cursor-pointer"
            >
              \u26a1 Auto-Sync Expiry
            </button>
            <button className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black transition-all flex justify-center items-center gap-2 cursor-pointer">
              <DollarSign size={14} /> Renew Membership
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button className="py-2.5 bg-slate-50 hover:bg-green-50 text-slate-600 hover:text-green-600 border border-slate-200 rounded-xl flex justify-center items-center transition-all cursor-pointer" title="WhatsApp"><MessageSquare size={16} /></button>
              <button className="py-2.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 rounded-xl flex justify-center items-center transition-all cursor-pointer" title="Call"><Phone size={16} /></button>
            </div>
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

      {/* 3. MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {activeTab === 'Profile' && <ProfileTab member={member} />}
              {activeTab === 'Billing' && <BillingTab member={member} />}
              {activeTab === 'Communication' && <CommunicationTab member={member} />}
              {activeTab === 'Attendance' && <AttendanceTab member={member} />}
              {activeTab === 'Body Measurements' && <BodyMeasurementsTab member={member} />}
              {activeTab === 'Workout' && <WorkoutTab member={member} />}
              {activeTab === 'Nutrition' && <NutritionTab member={member} />}
              {activeTab === 'Documents' && <DocumentsTab member={member} />}
              {activeTab === 'Bookings' && <BookingsTab member={member} />}

              {activeTab === 'Activity Timeline' && <ActivityTimelineTab member={member} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="xl:col-span-1">
          <div className="bg-white rounded-[32px] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-slate-100 p-6 sticky top-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-50 text-slate-600 rounded-xl border border-slate-100"><Bell size={18} /></div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Activity Alerts</h3>
            </div>
            <div className="space-y-4">
              {rightPanelAlerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="mt-0.5">{alert.icon}</div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{alert.type}</span>
                    <h4 className="text-sm font-bold text-slate-800">{alert.title}</h4>
                    <span className="text-xs font-semibold text-slate-500 mt-1 block">{alert.time}</span>
                  </div>
                </div>
              ))}
              <button className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-1 mt-6">
                View All Activity <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
