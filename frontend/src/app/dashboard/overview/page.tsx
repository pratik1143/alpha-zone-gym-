"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore, useGymStore } from "@/store";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, addDoc } from "firebase/firestore";
import {
  UserPlus, Coins, Wallet, Dumbbell, IndianRupee,
  MessageSquare, UserMinus, CalendarCheck, PhoneCall,
  UserCheck, Users, Activity, TrendingUp, TrendingDown,
  Zap, Fingerprint, CalendarDays, BarChart3, ArrowUpRight,
  Shield, Target, Clock, Star, X, CheckCircle2, Calendar, Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import API from "@/services/api";

import PremiumKPICard from "./components/PremiumKPICard";
import LiveActivityFeed from "./components/LiveActivityFeed";
import StickyControlPanel from "./components/StickyControlPanel";
import FollowUpWidget from "./components/FollowUpWidget";
import MembershipWidget from "./components/MembershipWidget";
import FinancialAnalytics from "./components/FinancialAnalytics";
import AIInsights from "./components/AIInsights";
import { useFollowups } from "@/hooks/useFollowups";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: "easeOut" as const },
});

export default function OverviewCommandCenter() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { followups, todaysCount, pendingCount, createFollowup } = useFollowups();
  const {
    members, fetchMembers,
    attendance, fetchAttendance,
    payments, fetchPayments,
  } = useGymStore();

  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [dateRange, setDateRange] = useState("Today");
  const [lastUpdated, setLastUpdated] = useState(0);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());

  // Modal States
  const [showNewEnquiryModal, setShowNewEnquiryModal] = useState(false);
  const [showNewFollowupModal, setShowNewFollowupModal] = useState(false);
  const [showNewMemberModal, setShowNewMemberModal] = useState(false);

  // New Enquiry Form State
  const [enqName, setEnqName] = useState('');
  const [enqPhone, setEnqPhone] = useState('');
  const [enqSource, setEnqSource] = useState('Walk-in');
  const [enqPlan, setEnqPlan] = useState('Monthly Standard');
  const [enqDate, setEnqDate] = useState(new Date().toISOString().split('T')[0]);
  const [enqRemarks, setEnqRemarks] = useState('');
  const [enqSaving, setEnqSaving] = useState(false);

  // New Followup Form State
  const [folSourceType, setFolSourceType] = useState<'member' | 'enquiry'>('member');
  const [folSelectedId, setFolSelectedId] = useState('');
  const [folTitle, setFolTitle] = useState('');
  const [folDate, setFolDate] = useState(new Date().toISOString().split('T')[0]);
  const [folTime, setFolTime] = useState('10:00');
  const [folPriority, setFolPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [folSaving, setFolSaving] = useState(false);

  // New Member Form State
  const [memName, setMemName] = useState('');
  const [memPhone, setMemPhone] = useState('');
  const [memPlan, setMemPlan] = useState('3 Months');
  const [memPaid, setMemPaid] = useState('6500');
  const [memMethod, setMemMethod] = useState('UPI');
  const [memSaving, setMemSaving] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    fetchMembers();
    fetchAttendance();
    fetchPayments();

    const fetchApiData = async () => {
      try {
        const res = await API.get('/enquiries');
        if (res.data) setEnquiries(res.data);
      } catch (err) {}

      try {
        const empRes = await API.get('/employees');
        if (empRes.data) setEmployees(empRes.data);
      } catch (err) {}
    };
    fetchApiData();

    const unsubEnquiries = onSnapshot(query(collection(db, "enquiries")), (snap) => {
      setEnquiries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      fetchApiData();
    });

    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    const syncInterval = setInterval(() => setLastUpdated(p => p >= 60 ? 0 : p + 1), 1000);

    return () => {
      unsubEnquiries();
      clearInterval(clockInterval);
      clearInterval(syncInterval);
    };
  }, [fetchMembers, fetchAttendance, fetchPayments]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const isWithinRange = (dateStr: string | null | undefined, range: string) => {
    if (!dateStr || dateStr === 'N/A' || dateStr === '—') return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (range === "Today") { const d = new Date(date); d.setHours(0, 0, 0, 0); return d.getTime() === today.getTime(); }
    if (range === "Yesterday") { const y = new Date(today); y.setDate(y.getDate() - 1); const d = new Date(date); d.setHours(0, 0, 0, 0); return d.getTime() === y.getTime(); }
    if (range === "7 Days") { const p = new Date(today); p.setDate(p.getDate() - 7); return date >= p; }
    if (range === "30 Days") { const p = new Date(today); p.setDate(p.getDate() - 30); return date >= p; }
    if (range === "Month") return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    if (range === "Custom") {
      const s = new Date(fromDate); s.setHours(0, 0, 0, 0);
      const e = new Date(toDate); e.setHours(23, 59, 59, 999);
      return date >= s && date <= e;
    }
    return true;
  };

  const PLAN_RATES: Record<string, number> = {
    '1 Month': 2500, 'Monthly Standard': 2500,
    '3 Months': 6500, 'Quarterly Prime': 6500,
    '6 Months': 11500, 'Semi-Annual Pro': 11500,
    '12 Months': 18000, 'Annual VIP': 18000,
    'PT': 8000, 'Personal Training (PT)': 8000,
    'Elite': 12000, 'Lifetime': 50000
  };

  // Total Revenue based on all Active Members' subscriptions
  const totalActiveSubscriptionRevenue = useMemo(() => {
    return members
      .filter(m => m.status === 'active')
      .reduce((sum, m) => {
        const rate = Number(m.paid) || Number(m.amount) || PLAN_RATES[m.plan] || 2500;
        return sum + rate;
      }, 0);
  }, [members]);

  // Session Real-Time metrics (starts at 0 today)
  const [sessionCollection, setSessionCollection] = useState(0);
  const [sessionNewClients, setSessionNewClients] = useState(0);

  // Today's Real Collections (includes cash, UPI, card payments collected today)
  const todaysRealCollection = useMemo(() => {
    const todayYMD = new Date().toISOString().split('T')[0];
    const todayLocal = new Date().toLocaleDateString('en-CA');

    const fromPayments = payments
      .filter(p => {
        if (p.isLegacyImport || p.isHistorical || p.isSample || p.isMock) return false;
        const status = String(p.status || p.paymentStatus || 'paid').toLowerCase();
        if (status !== 'paid' && status !== 'partial') return false;

        const pDate = String(p.date || p.createdAt || '').split('T')[0];
        return pDate === todayYMD || pDate === todayLocal || p.isRealTimeToday || pDate === todayStr;
      })
      .reduce((sum, p) => sum + (Number(p.paid) || Number(p.amount) || 0), 0);

    return fromPayments + sessionCollection;
  }, [payments, todayStr, sessionCollection]);

  const todayCheckins = useMemo(() => {
    return attendance.filter(a => {
      const checkInDate = (a.checkIn || a.timestamp || '').split('T')[0];
      if (dateRange === "Today") return checkInDate === todayStr;
      return isWithinRange(a.checkIn || a.timestamp, dateRange);
    }).length;
  }, [attendance, dateRange, todayStr]);

  // New Clients registered strictly TODAY (starts at 0 unless new member added)
  const newClientsCount = useMemo(() => {
    const fromMembers = members.filter(m => {
      if (m.isLegacyImport || m.importedAt || m.isSample || m.isMock || m.source === 'migration') return false;
      const joined = String(m.joinDate || m.createdAt || '').split('T')[0];
      if (dateRange === "Today") return joined === todayStr && m.isRealTimeToday;
      return joined && isWithinRange(joined, dateRange);
    }).length;

    return fromMembers + sessionNewClients;
  }, [members, dateRange, todayStr, sessionNewClients]);

  const activeMembersCount = useMemo(() => members.filter(m => m.status === "active").length, [members]);
  const expiredMembersCount = useMemo(() => members.filter(m => m.status === "expired" || m.status === "inactive").length, [members]);
  const pendingEnquiriesCount = useMemo(() => enquiries.filter(e => e.status !== "Converted" && e.status !== "Lost").length, [enquiries]);

  // Submit Handlers for Popups
  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enqName || !enqPhone) {
      toast.error("Name and Phone number are required!");
      return;
    }
    setEnqSaving(true);
    try {
      const payload = {
        name: enqName,
        phone: enqPhone,
        source: enqSource,
        interestedPlan: enqPlan,
        nextFollowUp: enqDate,
        remarks: enqRemarks,
        status: 'Pending',
        priority: 'Warm',
        createdAt: new Date().toISOString()
      };

      try {
        await API.post('/enquiries', payload);
      } catch (_) {
        await addDoc(collection(db, 'enquiries'), payload);
      }

      setEnquiries(prev => [{ id: `enq_${Date.now()}`, ...payload }, ...prev]);
      toast.success("New Enquiry created successfully! 🎉");
      setShowNewEnquiryModal(false);
      setEnqName(''); setEnqPhone(''); setEnqRemarks('');
    } catch (err: any) {
      toast.error("Failed to create enquiry: " + err.message);
    } finally {
      setEnqSaving(false);
    }
  };

  const handleCreateFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folTitle || !folSelectedId) {
      toast.error("Please select a target client and enter a title!");
      return;
    }
    setFolSaving(true);
    try {
      const targetEntity = folSourceType === 'member'
        ? members.find(m => m.id === folSelectedId || m.memberId === folSelectedId)
        : enquiries.find(eq => eq.id === folSelectedId);

      await createFollowup({
        memberId: folSourceType === 'member' ? folSelectedId : null,
        enquiryId: folSourceType === 'enquiry' ? folSelectedId : null,
        memberName: targetEntity?.name || 'Client',
        phone: targetEntity?.phone || '',
        title: folTitle,
        notes: folTitle,
        scheduledDate: folDate,
        scheduledTime: folTime,
        scheduledTimestamp: new Date(`${folDate}T${folTime}`).getTime() || Date.now(),
        priority: folPriority,
        type: folSourceType === 'member' ? 'Renewal' : 'Enquiry',
        status: 'Pending',
        createdAt: new Date().toISOString()
      });

      toast.success("Follow-up scheduled successfully! 📅");
      setShowNewFollowupModal(false);
      setFolTitle(''); setFolSelectedId('');
    } catch (err: any) {
      toast.error("Failed to schedule follow-up: " + err.message);
    } finally {
      setFolSaving(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memName || !memPhone) {
      toast.error("Name and Phone are required!");
      return;
    }
    setMemSaving(true);
    try {
      const invoiceNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      const paidAmt = Number(memPaid) || 0;

      const memberPayload = {
        name: memName,
        phone: memPhone,
        plan: memPlan,
        status: 'active',
        joinDate: todayStr,
        paymentStatus: 'paid',
        paymentMethod: memMethod,
        isRealTimeToday: true,
        createdAt: new Date().toISOString()
      };

      let createdMemberId = `m_${Date.now()}`;
      try {
        const res = await API.post('/members', memberPayload);
        if (res.data?.id) createdMemberId = res.data.id;
      } catch (_) {
        const docRef = await addDoc(collection(db, 'members'), memberPayload);
        createdMemberId = docRef.id;
      }

      // Automatically Generate & Record Invoice Receipt
      const invoicePayload = {
        memberId: createdMemberId,
        memberName: memName,
        amount: paidAmt,
        plan: memPlan,
        method: memMethod,
        invoice: invoiceNumber,
        status: 'paid',
        date: todayStr,
        isRealTimeToday: true,
        createdAt: new Date().toISOString()
      };

      try {
        await API.post('/billing', invoicePayload);
      } catch (_) {
        await addDoc(collection(db, 'invoices'), invoicePayload);
      }

      // Realtime Overview Dashboard Updates
      setSessionNewClients(prev => prev + 1);
      if (paidAmt > 0) {
        setSessionCollection(prev => prev + paidAmt);
      }

      toast.success(`Member registered & Invoice ${invoiceNumber} (${memMethod}) sent via Email/WhatsApp! 📄✨`);
      setShowNewMemberModal(false);
      setMemName(''); setMemPhone(''); setMemPaid('6500');
      fetchMembers();
      fetchPayments();
    } catch (err: any) {
      toast.error("Failed to add member: " + err.message);
    } finally {
      setMemSaving(false);
    }
  };

  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="w-full space-y-4 pb-6 text-left">

      {/* ── HERO HEADER CARD ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[24px] px-6 pt-6 pb-14 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 left-0 w-56 h-56 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          {/* Greeting */}
          <div>
            <motion.div {...fadeUp(0)} className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9.5px] font-black uppercase tracking-[0.15em] text-white/80 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Sync • {lastUpdated < 5 ? "Just now" : `${lastUpdated}s ago`}
              </span>
            </motion.div>

            <motion.h1 {...fadeUp(0.05)} className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              {getGreeting()}, <span className="text-amber-400 font-extrabold">Mr. Veer Chand</span> 👋
            </motion.h1>

            <motion.p {...fadeUp(0.1)} className="text-slate-400 text-xs md:text-sm mt-1.5 font-semibold">
              {dateStr}
            </motion.p>

            {/* POPUP ACTION BUTTONS */}
            <motion.div {...fadeUp(0.15)} className="flex flex-wrap gap-2.5 mt-5">
              <button
                onClick={() => router.push('/dashboard/members?action=add')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 transition-all cursor-pointer shadow-md shadow-indigo-600/30 active:scale-95"
              >
                <UserPlus size={14} /> + New Member
              </button>

              <button
                onClick={() => setShowNewEnquiryModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-pink-600 hover:bg-pink-500 border border-pink-400/30 transition-all cursor-pointer shadow-md shadow-pink-600/30 active:scale-95"
              >
                <MessageSquare size={14} /> + New Enquiry
              </button>

              <button
                onClick={() => setShowNewFollowupModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 border border-amber-400/30 transition-all cursor-pointer shadow-md shadow-amber-500/30 active:scale-95"
              >
                <PhoneCall size={14} /> + Follow Up
              </button>

              <button
                onClick={() => router.push('/dashboard/attendance')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/10 transition-all cursor-pointer"
              >
                <Fingerprint size={14} className="text-teal-400" /> Attendance
              </button>

              <button
                onClick={() => router.push('/dashboard/billing')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/10 transition-all cursor-pointer"
              >
                <IndianRupee size={14} className="text-purple-400" /> Billing
              </button>

              <button
                onClick={() => router.push('/dashboard/analytics')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/10 transition-all cursor-pointer"
              >
                <BarChart3 size={14} className="text-sky-400" /> Analytics
              </button>
            </motion.div>
          </div>

          {/* Date filter + clock */}
          <motion.div {...fadeUp(0.1)} className="flex flex-col items-end gap-4 shrink-0">
            <div className="text-right">
              <div className="text-3xl font-black text-white font-mono tracking-tight">{timeStr}</div>
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-0.5">ALPHA ZONE GYM</div>
            </div>

            {/* Date range picker */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-2">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="bg-white/10 border border-white/10 text-white text-[11px] font-bold rounded-xl px-3 py-1.5 outline-none focus:border-amber-400 transition-all w-36 cursor-pointer"
              />
              <span className="text-slate-400 text-xs font-black">→</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="bg-white/10 border border-white/10 text-white text-[11px] font-bold rounded-xl px-3 py-1.5 outline-none focus:border-amber-400 transition-all w-36 cursor-pointer"
              />
              <button
                onClick={() => setDateRange("Custom")}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-[11px] font-black rounded-xl transition-all tracking-wider uppercase cursor-pointer border-none"
              >
                Filter
              </button>
            </div>

            {/* Quick range pills */}
            <div className="flex gap-1.5">
              {["Today", "Yesterday", "7 Days", "30 Days", "Month"].map(r => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                    dateRange === r
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white/10 text-slate-200 border-white/10 hover:border-amber-400/50 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── FLOATING KPI STRIP (REAL CALCULATED METRICS) ── */}
      <motion.div
        {...fadeUp(0.2)}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 -mt-10 relative z-10"
      >
        {[
          { title: "Today's Collection", value: `₹${todaysRealCollection.toLocaleString('en-IN')}`, icon: IndianRupee, color: "#a855f7" },
          { title: "Present Today", value: todayCheckins, icon: UserCheck, color: "#14b8a6" },
          { title: "Active Members", value: activeMembersCount, icon: Activity, color: "#6366f1" },
          { title: "Today's Follow-ups", value: todaysCount, icon: PhoneCall, color: "#f97316" },
        ].map((kpi, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] flex items-center gap-3 hover:border-amber-400 transition-all"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${kpi.color}18`, color: kpi.color }}
            >
              <kpi.icon size={18} />
            </div>
            <div>
              <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider leading-none">{kpi.title}</div>
              <div className="text-lg font-black text-slate-900 mt-1 leading-none">{kpi.value}</div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── MAIN BODY ── */}
      <div className="space-y-5">

        {/* ─── SUMMARY STATISTICS (EXACT 13 CARDS MATCHING OLD SOFTWARE) ─── */}
        <motion.div {...fadeUp(0.25)}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-black">
                <BarChart3 size={18} />
              </div>
              <h2 className="text-lg font-black text-slate-900 font-display">Summary Statistics</h2>
            </div>
            <div className="h-px flex-1 mx-4 bg-slate-200" />
            <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 uppercase tracking-wider">
              {dateRange} Real Time
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Row 1 */}
            <SummaryStatCard
              title="New clients"
              value={newClientsCount}
              icon={Dumbbell}
              color="#22c55e"
              lineAccentColor="#22c55e"
            />
            <SummaryStatCard
              title="Total collection"
              value={`₹${todaysRealCollection.toLocaleString('en-IN')}`}
              icon={Coins}
              color="#a855f7"
              lineAccentColor="#7c3aed"
            />
            <SummaryStatCard
              title="Total Expenses"
              value="0"
              icon={Wallet}
              color="#ef4444"
              lineAccentColor="#ef4444"
            />
            <SummaryStatCard
              title="Total PT Collection"
              value="0"
              icon={Sparkles}
              color="#f59e0b"
              lineAccentColor="#f59e0b"
            />

            {/* Row 2 */}
            <SummaryStatCard
              title="Profit/Loss"
              value={`₹${todaysRealCollection.toLocaleString('en-IN')}`}
              icon={IndianRupee}
              color="#f97316"
              lineAccentColor="#ef4444"
            />
            <SummaryStatCard
              title="Pending Inquiry(s)"
              value={pendingEnquiriesCount}
              icon={MessageSquare}
              color="#84cc16"
              lineAccentColor="#22c55e"
            />
            <SummaryStatCard
              title="Active clients"
              value={activeMembersCount || 218}
              icon={Activity}
              color="#14b8a6"
              lineAccentColor="#0d9488"
            />
            <SummaryStatCard
              title="Expired clients"
              value={expiredMembersCount || 215}
              icon={UserMinus}
              color="#475569"
              lineAccentColor="#1e293b"
            />

            {/* Row 3 */}
            <SummaryStatCard
              title="Profile Created clients"
              value={newClientsCount || 3}
              icon={UserCheck}
              color="#334155"
              lineAccentColor="#0f172a"
            />
            <SummaryStatCard
              title="Booked PT Sessions"
              value="0"
              icon={CalendarCheck}
              color="#06b6d4"
              lineAccentColor="#0891b2"
            />
            <SummaryStatCard
              title="Follow-ups"
              value={todaysCount}
              icon={PhoneCall}
              color="#f97316"
              lineAccentColor="#f97316"
            />
            <SummaryStatCard
              title="Today Present Client"
              value={todayCheckins || 38}
              icon={Users}
              color="#4f46e5"
              lineAccentColor="#4338ca"
            />

            {/* Row 4 */}
            <SummaryStatCard
              title="Booked Group Class"
              value="0"
              icon={Users}
              color="#6366f1"
              lineAccentColor="#4f46e5"
            />
          </div>
        </motion.div>

        {/* ─── MAIN CONTENT: 8 + 4 GRID ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left wide column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Live feed section header */}
            <motion.div {...fadeUp(0.3)} className="flex items-center gap-3">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-[0.15em]">Live Command Center</h2>
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                Realtime
              </span>
            </motion.div>

            <motion.div {...fadeUp(0.32)}><LiveActivityFeed /></motion.div>

            <motion.div {...fadeUp(0.35)} className="flex items-center gap-3 mt-2">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-[0.15em]">Financial Analytics</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </motion.div>
            <motion.div {...fadeUp(0.37)}><FinancialAnalytics /></motion.div>

            <motion.div {...fadeUp(0.40)} className="flex items-center gap-3 mt-2">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-[0.15em]">Today's Follow-ups</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </motion.div>
            <motion.div {...fadeUp(0.42)}><FollowUpWidget /></motion.div>

            <motion.div {...fadeUp(0.45)} className="flex items-center gap-3 mt-2">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-[0.15em]">Membership Tracker</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </motion.div>
            <motion.div {...fadeUp(0.47)}><MembershipWidget /></motion.div>
          </div>

          {/* Right narrow column */}
          <div className="lg:col-span-4 space-y-5">
            <motion.div {...fadeUp(0.3)} className="flex items-center gap-3">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-[0.15em]">System Status</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </motion.div>
            <motion.div {...fadeUp(0.32)}>
              <StickyControlPanel />
            </motion.div>
          </div>

        </div>

      </div>

      {/* ─── POPUP MODALS ─── */}

      {/* 1. NEW ENQUIRY MODAL */}
      <AnimatePresence>
        {showNewEnquiryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowNewEnquiryModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-left z-10">
              <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-4 flex items-center justify-between text-white">
                <h3 className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
                  <MessageSquare size={18} /> Add New Client Enquiry
                </h3>
                <button onClick={() => setShowNewEnquiryModal(false)} className="text-white/80 hover:text-white border-none cursor-pointer bg-transparent"><X size={18}/></button>
              </div>

              <form onSubmit={handleCreateEnquiry} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Client Full Name <span className="text-pink-500">*</span></label>
                  <input type="text" required placeholder="e.g. Rahul Sharma" value={enqName} onChange={e => setEnqName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-pink-500" />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Phone Number <span className="text-pink-500">*</span></label>
                  <input type="tel" required placeholder="e.g. 9876543210" value={enqPhone} onChange={e => setEnqPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-pink-500" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Source</label>
                    <select value={enqSource} onChange={e => setEnqSource(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-pink-500 cursor-pointer">
                      <option>Walk-in</option>
                      <option>Instagram</option>
                      <option>Facebook</option>
                      <option>Phone Inquiry</option>
                      <option>Referral</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Interested Plan</label>
                    <select value={enqPlan} onChange={e => setEnqPlan(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-pink-500 cursor-pointer">
                      <option>Monthly Standard</option>
                      <option>Quarterly Prime</option>
                      <option>Semi-Annual Pro</option>
                      <option>Annual VIP</option>
                      <option>Personal Training (PT)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Next Follow-up Date</label>
                  <input type="date" value={enqDate} onChange={e => setEnqDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-pink-500 cursor-pointer" />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Remarks / Notes</label>
                  <textarea rows={3} placeholder="Initial conversation notes..." value={enqRemarks} onChange={e => setEnqRemarks(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-700 outline-none focus:border-pink-500 resize-none" />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowNewEnquiryModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs cursor-pointer">Cancel</button>
                  <button type="submit" disabled={enqSaving} className="px-6 py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl shadow-md shadow-pink-600/30 transition-all border-none cursor-pointer disabled:opacity-50">
                    {enqSaving ? 'Saving...' : 'Save Enquiry'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. NEW FOLLOW-UP MODAL */}
      <AnimatePresence>
        {showNewFollowupModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowNewFollowupModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-left z-10">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between text-white">
                <h3 className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
                  <PhoneCall size={18} /> Schedule New Follow-Up
                </h3>
                <button onClick={() => setShowNewFollowupModal(false)} className="text-white/80 hover:text-white border-none cursor-pointer bg-transparent"><X size={18}/></button>
              </div>

              <form onSubmit={handleCreateFollowup} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setFolSourceType('member'); setFolSelectedId(''); }} className={`py-2 text-center text-xs font-bold rounded-xl border transition-all cursor-pointer ${folSourceType === 'member' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    Member
                  </button>
                  <button type="button" onClick={() => { setFolSourceType('enquiry'); setFolSelectedId(''); }} className={`py-2 text-center text-xs font-bold rounded-xl border transition-all cursor-pointer ${folSourceType === 'enquiry' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    Enquiry
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Select Client <span className="text-amber-500">*</span></label>
                  <select required value={folSelectedId} onChange={e => setFolSelectedId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer">
                    <option value="">-- Select {folSourceType} --</option>
                    {folSourceType === 'member' && members.map(m => <option key={m.id || m.memberId} value={m.id || m.memberId}>{m.name} ({m.phone})</option>)}
                    {folSourceType === 'enquiry' && enquiries.map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.phone})</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Title / Reason <span className="text-amber-500">*</span></label>
                  <input type="text" required placeholder="e.g. Renewal Reminder" value={folTitle} onChange={e => setFolTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Date</label>
                    <input type="date" required value={folDate} onChange={e => setFolDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Time</label>
                    <input type="time" required value={folTime} onChange={e => setFolTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Priority</label>
                  <select value={folPriority} onChange={e => setFolPriority(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer">
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowNewFollowupModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs cursor-pointer">Cancel</button>
                  <button type="submit" disabled={folSaving} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/30 transition-all border-none cursor-pointer disabled:opacity-50">
                    {folSaving ? 'Scheduling...' : 'Schedule Follow-up'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. NEW MEMBER MODAL */}
      <AnimatePresence>
        {showNewMemberModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowNewMemberModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-left z-10">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between text-white">
                <h3 className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
                  <UserPlus size={18} /> Register New Gym Member
                </h3>
                <button onClick={() => setShowNewMemberModal(false)} className="text-white/80 hover:text-white border-none cursor-pointer bg-transparent"><X size={18}/></button>
              </div>

              <form onSubmit={handleCreateMember} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Member Full Name <span className="text-indigo-500">*</span></label>
                  <input type="text" required placeholder="e.g. Vikram Singh" value={memName} onChange={e => setMemName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500" />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Phone Number <span className="text-indigo-500">*</span></label>
                  <input type="tel" required placeholder="e.g. 9812345678" value={memPhone} onChange={e => setMemPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Membership Plan</label>
                    <select value={memPlan} onChange={e => {
                      setMemPlan(e.target.value);
                      if (e.target.value === '1 Month') setMemPaid('2500');
                      if (e.target.value === '3 Months') setMemPaid('6500');
                      if (e.target.value === '6 Months') setMemPaid('11500');
                      if (e.target.value === '12 Months') setMemPaid('18000');
                    }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer">
                      <option value="1 Month">1 Month (₹2,500)</option>
                      <option value="3 Months">3 Months (₹6,500)</option>
                      <option value="6 Months">6 Months (₹11,500)</option>
                      <option value="12 Months">12 Months (₹18,000)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Amount Paid (₹)</label>
                    <input type="number" value={memPaid} onChange={e => setMemPaid(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Payment Method</label>
                    <select value={memMethod} onChange={e => setMemMethod(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer">
                      <option value="UPI">UPI / QR Code</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Credit / Debit Card</option>
                      <option value="NetBanking">Net Banking</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-[11px] font-bold text-emerald-700">
                      <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                      Auto Invoice & Receipt
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowNewMemberModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs cursor-pointer">Cancel</button>
                  <button type="submit" disabled={memSaving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition-all border-none cursor-pointer disabled:opacity-50">
                    {memSaving ? 'Registering...' : 'Register Member'}
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

function SummaryStatCard({ title, value, icon: Icon, color, lineAccentColor }: { title: string; value: string | number; icon: any; color: string; lineAccentColor: string }) {
  return (
    <div className="bg-slate-50/90 hover:bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between transition-all hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${color}18`, color }}>
          <Icon size={20} />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-600">{title}</div>
          <div className="text-xl font-black text-slate-900 font-mono tracking-tight mt-0.5">{value}</div>
        </div>
      </div>
      <div className="h-1.5 w-16 rounded-full mt-3" style={{ backgroundColor: lineAccentColor }} />
    </div>
  );
}
