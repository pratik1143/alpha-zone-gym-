"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuthStore, useGymStore } from "@/store";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import {
  UserPlus, Coins, Wallet, Dumbbell, IndianRupee,
  MessageSquare, UserMinus, CalendarCheck, PhoneCall,
  UserCheck, Users, Activity, TrendingUp, TrendingDown,
  Zap, Fingerprint, CalendarDays, BarChart3, ArrowUpRight,
  Shield, Target, Clock, Star
} from "lucide-react";
import { useRouter } from "next/navigation";

import PremiumKPICard from "./components/PremiumKPICard";
import LiveActivityFeed from "./components/LiveActivityFeed";
import StickyControlPanel from "./components/StickyControlPanel";
import FollowUpWidget from "./components/FollowUpWidget";
import MembershipWidget from "./components/MembershipWidget";
import FinancialAnalytics from "./components/FinancialAnalytics";
import AIInsights from "./components/AIInsights";
import CommandPalette from "./components/CommandPalette";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: "easeOut" as const },
});

export default function OverviewCommandCenter() {
  const { user } = useAuthStore();
  const router = useRouter();
  const {
    members, fetchMembers,
    attendance, fetchAttendance,
    payments, fetchPayments,
  } = useGymStore();

  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [dateRange, setDateRange] = useState("Today");
  const [lastUpdated, setLastUpdated] = useState(0);
  const [followups, setFollowups] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetchMembers();
    fetchAttendance();
    fetchPayments();

    const unsubFollowups = onSnapshot(query(collection(db, "followups")), (snap) => {
      setFollowups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.warn("followups listener:", err));

    const unsubEnquiries = onSnapshot(query(collection(db, "enquiries")), (snap) => {
      setEnquiries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.warn("enquiries listener:", err));

    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    const syncInterval = setInterval(() => setLastUpdated(p => p >= 60 ? 0 : p + 1), 1000);

    return () => {
      unsubFollowups();
      unsubEnquiries();
      clearInterval(clockInterval);
      clearInterval(syncInterval);
    };
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const isWithinRange = (dateStr: string, range: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
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

  const revenue = payments
    .filter(p => isWithinRange(p.date || p.createdAt, dateRange))
    .reduce((a, c) => a + (Number(c.amount) || 0), 0);

  const todayCheckins = attendance.filter(a => {
    if (dateRange === "Today") {
      const d = new Date(a.checkIn || a.timestamp);
      const t = new Date();
      return d.getDate() === t.getDate() && d.getMonth() === t.getMonth();
    }
    return isWithinRange(a.checkIn || a.timestamp, dateRange);
  }).length;

  const newMembers = members.filter(m => isWithinRange(m.joinDate || m.createdAt, dateRange)).length;
  const activeMembers = members.filter(m => m.status === "active").length;
  const expiredMembers = members.filter(m => m.status === "expired" || m.status === "inactive").length;
  const pendingEnquiries = enquiries.filter(e => isWithinRange(e.date || e.createdAt, dateRange) && e.status !== "Converted").length;
  const pendingFollowups = followups.filter(f => isWithinRange(f.scheduledDate, dateRange) && f.status === "Pending").length;

  const quickLinks = [
    { label: "New Member", icon: UserPlus, color: "#6366f1", href: "/dashboard/members" },
    { label: "New Enquiry", icon: MessageSquare, color: "#ec4899", href: "/dashboard/enquiries" },
    { label: "Attendance", icon: Fingerprint, color: "#14b8a6", href: "/dashboard/attendance" },
    { label: "Follow Up", icon: PhoneCall, color: "#f97316", href: "/dashboard/follow-up" },
    { label: "Billing", icon: IndianRupee, color: "#a855f7", href: "/dashboard/billing" },
    { label: "Analytics", icon: BarChart3, color: "#0ea5e9", href: "/dashboard/analytics" },
  ];

  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="w-full space-y-4 pb-6">

      {/* ── HERO HEADER CARD ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[22px] px-6 pt-6 pb-14">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 left-0 w-56 h-56 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          {/* Greeting */}
          <div>
            <motion.div {...fadeUp(0)} className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-[0.15em] text-white/60 flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Live Sync • {lastUpdated < 5 ? "Just now" : `${lastUpdated}s ago`}
              </span>
            </motion.div>

            <motion.h1 {...fadeUp(0.05)} className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              {getGreeting()}, <span className="text-indigo-300">{user?.name?.split(" ")[0] || "Admin"}</span> 👋
            </motion.h1>

            <motion.p {...fadeUp(0.1)} className="text-slate-400 text-sm mt-1.5 font-medium">
              {dateStr}
            </motion.p>

            {/* Quick action links */}
            <motion.div {...fadeUp(0.15)} className="flex flex-wrap gap-2 mt-5">
              {quickLinks.map((q, i) => (
                <button
                  key={i}
                  onClick={() => router.push(q.href)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white/80 bg-white/8 border border-white/10 hover:bg-white/15 hover:text-white transition-all cursor-pointer"
                >
                  <q.icon size={12} style={{ color: q.color }} />
                  {q.label}
                </button>
              ))}
            </motion.div>
          </div>

          {/* Date filter + clock */}
          <motion.div {...fadeUp(0.1)} className="flex flex-col items-end gap-4 shrink-0">
            {/* Clock */}
            <div className="text-right">
              <div className="text-3xl font-black text-white font-mono tracking-tight">{timeStr}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Alpha Zone Gym</div>
            </div>

            {/* Date range picker */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-2">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="bg-white/10 border border-white/10 text-white text-[11px] font-bold rounded-xl px-3 py-1.5 outline-none focus:border-indigo-400 transition-all w-36"
              />
              <span className="text-slate-500 text-xs font-black">→</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="bg-white/10 border border-white/10 text-white text-[11px] font-bold rounded-xl px-3 py-1.5 outline-none focus:border-indigo-400 transition-all w-36"
              />
              <button
                onClick={() => setDateRange("Custom")}
                className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white text-[11px] font-black rounded-xl transition-all tracking-wider uppercase cursor-pointer"
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
                      ? "bg-indigo-500 text-white border-indigo-500"
                      : "bg-white/10 text-slate-200 border-white/10 hover:border-indigo-500/50 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── FLOATING KPI STRIP (overlaps hero) ── */}
      <motion.div
        {...fadeUp(0.2)}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 -mt-10 relative z-10"
      >
          {[
            { title: "Today's Revenue", value: `₹${revenue.toLocaleString()}`, icon: IndianRupee, color: "#a855f7", suffix: "" },
            { title: "Present Today", value: todayCheckins, icon: UserCheck, color: "#14b8a6" },
            { title: "Active Members", value: activeMembers, icon: Activity, color: "#6366f1" },
            { title: "Pending Follow-ups", value: pendingFollowups, icon: PhoneCall, color: "#f97316" },
          ].map((kpi, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${kpi.color}18`, color: kpi.color }}
              >
                <kpi.icon size={18} />
              </div>
              <div>
                <div className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider leading-none">{kpi.title}</div>
                <div className="text-lg font-black text-slate-900 mt-0.5 leading-none">{kpi.value}</div>
              </div>
            </div>
          ))}
      </motion.div>

      {/* ── MAIN BODY ── */}
      <div className="space-y-5">

        {/* ─── FULL KPI GRID ─── */}
        <motion.div {...fadeUp(0.25)}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black text-slate-700 uppercase tracking-[0.15em]">Performance Metrics</h2>
            <div className="h-px flex-1 mx-4 bg-slate-200" />
            <span className="text-[10px] font-bold text-indigo-700">{dateRange}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            <PremiumKPICard title="New Clients"         value={newMembers}         icon={UserPlus}      colorHex="#22c55e"  delay={0.05} />
            <PremiumKPICard title="Total Collection"    value={`₹${revenue.toLocaleString()}`} icon={Coins}         colorHex="#a855f7"  delay={0.08} />
            <PremiumKPICard title="Total Expenses"      value={0}                  icon={Wallet}        colorHex="#ec4899"  delay={0.11} />
            <PremiumKPICard title="PT Collection"       value={0}                  icon={Dumbbell}      colorHex="#eab308"  delay={0.14} />
            <PremiumKPICard title="Profit / Loss"       value="₹0"                 icon={TrendingUp}    colorHex="#f97316"  delay={0.17} />
            <PremiumKPICard title="Pending Enquiries"   value={pendingEnquiries}   icon={MessageSquare} colorHex="#8b5cf6"  delay={0.20} />
            <PremiumKPICard title="Active Clients"      value={activeMembers}      icon={Activity}      colorHex="#14b8a6"  delay={0.23} />
            <PremiumKPICard title="Expired Clients"     value={expiredMembers}     icon={UserMinus}     colorHex="#64748b"  delay={0.26} />
            <PremiumKPICard title="All Profiles"        value={members.length}     icon={Users}         colorHex="#4f46e5"  delay={0.29} />
            <PremiumKPICard title="PT Sessions"         value={0}                  icon={CalendarCheck} colorHex="#06b6d4"  delay={0.32} />
            <PremiumKPICard title="Follow-ups"          value={pendingFollowups}   icon={PhoneCall}     colorHex="#f97316"  delay={0.35} />
            <PremiumKPICard title="Present Today"       value={todayCheckins}      icon={UserCheck}     colorHex="#6366f1"  delay={0.38} />
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

            {/* Quick Stats Summary */}
            <motion.div
              {...fadeUp(0.35)}
              className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 text-white"
            >
              <div className="flex items-center gap-2 mb-4">
                <Target size={14} className="text-indigo-200" />
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-200">Monthly Goals</h3>
              </div>

              {[
                { label: "Revenue Target", current: revenue, target: 100000, color: "#a78bfa" },
                { label: "New Members", current: newMembers, target: 30, color: "#34d399" },
                { label: "Attendance Rate", current: todayCheckins, target: 50, color: "#60a5fa" },
              ].map((g, i) => {
                const pct = Math.min(100, Math.round((g.current / g.target) * 100));
                return (
                  <div key={i} className="mb-3 last:mb-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-indigo-200">{g.label}</span>
                      <span className="text-[10px] font-black text-white">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: g.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </motion.div>

            {/* Upcoming follow-ups mini card */}
            <motion.div
              {...fadeUp(0.4)}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock size={13} className="text-orange-500" />
                <h3 className="text-xs font-black text-slate-800">Upcoming Today</h3>
                <span className="ml-auto text-[9px] font-black text-orange-500 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
                  {pendingFollowups} Pending
                </span>
              </div>
              {followups
                .filter(f => f.status === "Pending")
                .slice(0, 4)
                .map((f, i) => (
                  <div key={f.id || i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                      <PhoneCall size={11} className="text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-black text-slate-800 truncate">{f.title || f.type || "Follow-up"}</div>
                      <div className="text-[9.5px] text-slate-650 font-semibold">{f.scheduledDate || "Today"}</div>
                    </div>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                      f.priority === "High" ? "bg-red-50 text-red-500 border border-red-100" : "bg-amber-50 text-amber-500 border border-amber-100"
                    }`}>{f.priority || "Med"}</span>
                  </div>
                ))}
              {pendingFollowups === 0 && (
                <div className="text-center py-4 text-[10px] text-slate-600 font-semibold">
                  ✅ No pending follow-ups
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* ─── AI INSIGHTS ─── */}
        <motion.div {...fadeUp(0.5)} className="flex items-center gap-3 mt-2">
          <h2 className="text-xs font-black text-slate-700 uppercase tracking-[0.15em]">AI Insights</h2>
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[9px] font-black uppercase tracking-widest text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
            Powered by AI
          </span>
        </motion.div>
        <motion.div {...fadeUp(0.52)}><AIInsights /></motion.div>

      </div>

      {/* Floating Command Palette */}
      <CommandPalette />
    </div>
  );
}
