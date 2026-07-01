'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Phone, Mail, RefreshCw, X, Check,
  AlertTriangle, Calendar, User, Info, Smartphone, Plus,
  MessageSquare, Sparkles, Clock, Trash2, ArrowUpRight, Share2,
  DollarSign, CheckCircle2, ChevronRight, Play, Edit3, Clipboard, HelpCircle
} from 'lucide-react';
import { useGymStore } from '@/store';
import { formatDate, daysUntilExpiry, getInitials, formatCurrency, getMembershipName } from '@/lib/utils';
import toast from 'react-hot-toast';
import { db as fDb } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, collection, addDoc, getDoc } from 'firebase/firestore';

export default function FollowUpPage() {
  const { members, fetchMembers } = useGymStore();

  const [search, setSearch] = useState('');
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [showRenewModal, setShowRenewModal] = useState<any | null>(null);
  const [showTimelineModal, setShowTimelineModal] = useState<any | null>(null);
  
  // Local state for today's renewals to populate the "Renewed" column
  const [localRenewedIds, setLocalRenewedIds] = useState<string[]>([]);
  
  // Timeline log note state
  const [timelineNote, setTimelineNote] = useState('');
  const [timelineAction, setTimelineAction] = useState('Called');

  // Renewal Form State
  const [renewPlan, setRenewPlan] = useState('3 Months (Quarterly)');
  const [renewMethod, setRenewMethod] = useState('UPI');
  const [renewDiscount, setRenewDiscount] = useState(0);
  const [renewGst, setRenewGst] = useState(18); // 18% default

  // Fetch data on mount
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Helper calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysRemaining = (expiryDateStr: string) => {
    if (!expiryDateStr) return 999;
    const exp = new Date(expiryDateStr);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Filter members into follow-up pipeline candidates
  // Expiry <= 30 days and not expired (< 0 days should go to Expired page)
  const followUpCandidates = members.filter((m: any) => {
    const days = getDaysRemaining(m.expiryDate);
    // Include if days remaining is between 0 and 30, OR if member is manually flagged as follow-up, or was renewed today
    const inRange = days >= 0 && days <= 30;
    const isRenewedToday = localRenewedIds.includes(m.id);
    return inRange || isRenewedToday;
  });

  // Apply search and filter criteria
  const filteredCandidates = followUpCandidates.filter((m: any) => {
    const matchesSearch = 
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.memberId?.toLowerCase().includes(search.toLowerCase()) ||
      m.phone?.includes(search);
    
    const matchesTrainer = trainerFilter === 'all' || m.trainer === trainerFilter;
    const matchesBranch = branchFilter === 'all' || m.branch === branchFilter;
    const matchesPlan = planFilter === 'all' || (m.plan && getMembershipName(m.plan) === planFilter);
    
    // AI Churn / Risk mapping
    const days = getDaysRemaining(m.expiryDate);
    let risk = 'Low';
    if (days <= 3) risk = 'High';
    else if (days <= 7) risk = 'Medium';
    const matchesRisk = riskFilter === 'all' || risk === riskFilter;

    return matchesSearch && matchesTrainer && matchesBranch && matchesPlan && matchesRisk;
  });

  // Categorize members into CRM pipeline columns
  const pipeline = {
    urgent: filteredCandidates.filter(m => !localRenewedIds.includes(m.id) && getDaysRemaining(m.expiryDate) <= 1),
    high: filteredCandidates.filter(m => !localRenewedIds.includes(m.id) && getDaysRemaining(m.expiryDate) > 1 && getDaysRemaining(m.expiryDate) <= 3),
    week: filteredCandidates.filter(m => !localRenewedIds.includes(m.id) && getDaysRemaining(m.expiryDate) > 3 && getDaysRemaining(m.expiryDate) <= 7),
    month: filteredCandidates.filter(m => !localRenewedIds.includes(m.id) && getDaysRemaining(m.expiryDate) > 7 && getDaysRemaining(m.expiryDate) <= 30),
    renewed: filteredCandidates.filter(m => localRenewedIds.includes(m.id))
  };

  // KPI Calculations
  const expiringTomorrow = followUpCandidates.filter(m => getDaysRemaining(m.expiryDate) <= 1).length;
  const expiring3Days = followUpCandidates.filter(m => getDaysRemaining(m.expiryDate) > 1 && getDaysRemaining(m.expiryDate) <= 3).length;
  const expiringWeek = followUpCandidates.filter(m => getDaysRemaining(m.expiryDate) > 3 && getDaysRemaining(m.expiryDate) <= 7).length;
  const expiringMonth = followUpCandidates.filter(m => getDaysRemaining(m.expiryDate) > 7 && getDaysRemaining(m.expiryDate) <= 30).length;
  
  // Total pending calls (sum of calls not answered or not made yet)
  const pendingCalls = filteredCandidates.filter(m => !localRenewedIds.includes(m.id) && (m.callAttempts || 0) < 3).length;
  const renewedTodayCount = localRenewedIds.length;

  // Expected revenue calculations
  const planRates: Record<string, number> = {
    'Trial': 0,
    '1 Month': 2500,
    '3 Months (Quarterly)': 6500,
    '6 Months (Semi-Annual)': 11000,
    '12 Months (Annual)': 18000,
    'Lifetime Membership': 50000,
    'Personal Training': 8000,
    'Premium Membership': 12000,
    'Custom Plan': 10000
  };

  const expectedRevenue = filteredCandidates
    .filter(m => !localRenewedIds.includes(m.id))
    .reduce((sum, m) => sum + (planRates[getMembershipName(m.plan)] || 5000), 0);

  // Quick list of trainers, branches, plans for filters
  const uniqueTrainers = Array.from(new Set(members.map((m: any) => m.trainer).filter(Boolean)));
  const uniqueBranches = Array.from(new Set(members.map((m: any) => m.branch).filter(Boolean)));
  const uniquePlans = Array.from(new Set(members.map((m: any) => getMembershipName(m.plan)).filter(Boolean)));

  // Log Follow-up Action Handler
  const handleLogFollowUp = async (member: any, action: string, noteText: string) => {
    try {
      const memberRef = doc(fDb, 'members', member.id);
      const newTimelineEvent = {
        action,
        notes: noteText || `${action} follow-up record created.`,
        timestamp: new Date().toISOString()
      };
      
      const currentAttempts = member.callAttempts || 0;
      const updatedAttempts = action.toLowerCase().includes('call') ? currentAttempts + 1 : currentAttempts;

      await updateDoc(memberRef, {
        followUpHistory: arrayUnion(newTimelineEvent),
        callAttempts: updatedAttempts,
        lastFollowUpDate: new Date().toLocaleDateString('en-GB')
      });

      toast.success(`Logged ${action} for ${member.name}`);
      setTimelineNote('');
      fetchMembers(); // refresh
    } catch (e: any) {
      toast.error('Failed to log timeline event: ' + e.message);
    }
  };

  // Member Renewal handler
  const handleRenewMember = async () => {
    if (!showRenewModal) return;
    const member = showRenewModal;

    // Calculate dates
    let monthsToAdd = 1;
    const planName = renewPlan;
    if (planName.includes('3 Months')) monthsToAdd = 3;
    else if (planName.includes('6 Months')) monthsToAdd = 6;
    else if (planName.includes('12 Months')) monthsToAdd = 12;
    else if (planName.includes('Lifetime')) monthsToAdd = 120; // 10 years

    const newExpiry = new Date();
    newExpiry.setMonth(newExpiry.getMonth() + monthsToAdd);
    const expiryStr = newExpiry.toISOString().split('T')[0];

    const basePrice = planRates[renewPlan] || 5000;
    const subtotal = Math.max(0, basePrice - Number(renewDiscount));
    const gstAmount = Math.round(subtotal * (Number(renewGst) / 100));
    const totalAmount = subtotal + gstAmount;

    try {
      // 1. Update Member document
      const memberRef = doc(fDb, 'members', member.id);
      await updateDoc(memberRef, {
        expiryDate: expiryStr,
        status: 'active',
        plan: renewPlan,
        followUpHistory: arrayUnion({
          action: 'Renewed',
          notes: `Membership renewed for ${renewPlan} via ${renewMethod}. Amount Paid: ${formatCurrency(totalAmount)}.`,
          timestamp: new Date().toISOString()
        })
      });

      // 2. Create Payment Invoice
      const paymentRef = collection(fDb, 'payments');
      await addDoc(paymentRef, {
        invoice: `INV-${Date.now().toString().slice(-6)}`,
        memberId: member.id,
        memberName: member.name,
        plan: renewPlan,
        amount: totalAmount,
        gst: gstAmount,
        method: renewMethod,
        date: new Date().toISOString(),
        status: 'paid',
        createdAt: new Date().toISOString()
      });

      // 3. Update local renewed items list
      setLocalRenewedIds([...localRenewedIds, member.id]);
      setShowRenewModal(null);
      toast.success(`Successfully renewed ${member.name}!`);
      fetchMembers();
    } catch (err: any) {
      toast.error('Failed to renew membership: ' + err.message);
    }
  };

  // Fast skip handler
  const handleSkip = async (member: any) => {
    try {
      const memberRef = doc(fDb, 'members', member.id);
      await updateDoc(memberRef, {
        followUpHistory: arrayUnion({
          action: 'Skipped',
          notes: 'Follow-up task skipped by staff desk.',
          timestamp: new Date().toISOString()
        })
      });
      toast.success(`Skipped follow-up for ${member.name}`);
      fetchMembers();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Block membership handler
  const handleBlock = async (member: any) => {
    try {
      const memberRef = doc(fDb, 'members', member.id);
      await updateDoc(memberRef, {
        status: 'frozen',
        followUpHistory: arrayUnion({
          action: 'Blocked',
          notes: 'Membership frozen due to non-renewal.',
          timestamp: new Date().toISOString()
        })
      });
      toast.error(`Blocked/Frozen membership for ${member.name}`);
      fetchMembers();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  function MemberPipelineCard({ member, days, color, isRenewed }: any) {
    const avatar = member.avatar || member.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${member.name.replace(/ /g, '')}`;
    
    let churnRisk = 'Low Churn Risk';
    let renewalProb = '92% Likely to Renew';
    let badgeColor = 'bg-emerald-50 text-emerald-600 border-emerald-100';
    
    if (days <= 1) {
      churnRisk = 'High Churn Risk';
      renewalProb = '35% Churn Probability';
      badgeColor = 'bg-rose-50 text-rose-600 border-rose-100';
    } else if (days <= 7) {
      churnRisk = 'Medium Risk';
      renewalProb = '65% Likely to Renew';
      badgeColor = 'bg-amber-50 text-amber-600 border-amber-100';
    }

    return (
      <motion.div 
        layout
        className={`bg-white border rounded-2xl p-4 space-y-3 transition-all hover:scale-[1.01] hover:shadow-md relative overflow-hidden ${color || 'border-slate-100'}`}
      >
        {/* Header: name & avatar */}
        <div className="flex gap-3 items-start">
          <img src={avatar} className="w-9 h-9 rounded-full bg-slate-100 shrink-0 border border-slate-100" alt={member.name} />
          <div className="min-w-0">
            <h4 className="text-xs font-black text-slate-800 truncate leading-snug">{member.name}</h4>
            <div className="text-[8.5px] text-slate-400 font-mono mt-0.5 leading-none">ID: {member.memberId || 'N/A'}</div>
          </div>
        </div>

        {/* Body Details */}
        <div className="space-y-1.5 border-t border-b border-slate-50 py-2.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Membership:</span>
            <span className="font-extrabold text-slate-700">{getMembershipName(member.plan)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Expires On:</span>
            <span className="font-bold text-slate-700 font-mono">{member.expiryDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Remaining:</span>
            <span className={`font-black font-mono ${days <= 1 ? 'text-red-500' : days <= 7 ? 'text-orange-500' : 'text-slate-700'}`}>
              {isRenewed ? 'Renewed ✓' : days === 0 ? 'Today' : days === 1 ? '1 Day Left' : `${days} Days Left`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Coach:</span>
            <span className="font-bold text-slate-700">{member.trainer || 'Strength Coach'}</span>
          </div>
        </div>

        {/* Smart AI Indicator */}
        <div className={`px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-wider flex justify-between items-center ${badgeColor}`}>
          <span>{churnRisk}</span>
          <span>{renewalProb}</span>
        </div>

        {/* Call Attempts & Follow-up stats */}
        <div className="flex justify-between items-center text-[9px] text-slate-400 font-medium">
          <span>Calls: <b className="text-slate-700">{member.callAttempts || 0}/3</b></span>
          <span>Last Call: <b className="text-slate-700">{member.lastFollowUpDate || 'Never'}</b></span>
        </div>

        {/* Hover quick action buttons */}
        <div className="flex justify-between items-center gap-1.5 pt-1.5 border-t border-slate-50">
          <div className="flex gap-1">
            <button 
              onClick={() => {
                handleLogFollowUp(member, 'Called', 'Initiated phone call. No answer.');
              }}
              className="w-7 h-7 bg-slate-55 hover:bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center border border-slate-200 cursor-pointer"
              title="Log Call Attempt"
            >
              <Phone size={11} />
            </button>
            <button 
              onClick={() => {
                handleLogFollowUp(member, 'WhatsApp Sent', 'Sent standard renewal message template.');
                window.open(`https://wa.me/91${member.phone}?text=Hi%20${encodeURIComponent(member.name)},%20your%20membership%20at%2520Alpha%2520Zone%2520Gym%20is%20expiring%20on%20${member.expiryDate}.%20Please%20renew%20soon!`, '_blank');
              }}
              className="w-7 h-7 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-200 cursor-pointer"
              title="Send WhatsApp Link"
            >
              <MessageSquare size={11} />
            </button>
            <button 
              onClick={() => {
                setSelectedMember(member);
                setShowTimelineModal(true);
              }}
              className="w-7 h-7 bg-slate-55 hover:bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center border border-slate-200 cursor-pointer"
              title="Timeline / Add Notes"
            >
              <Clock size={11} />
            </button>
          </div>

          {!isRenewed ? (
            <button 
              onClick={() => {
                setShowRenewModal(member);
              }}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider border-none flex items-center gap-1 cursor-pointer"
            >
              Renew
            </button>
          ) : (
            <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-2 py-1 rounded-lg border border-purple-100">
              Done
            </span>
          )}
        </div>

        {/* Secondary operations row */}
        <div className="flex gap-1.5 justify-end">
          <button 
            onClick={() => handleSkip(member)}
            className="text-[8px] font-extrabold uppercase text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
          >
            Skip
          </button>
          <button 
            onClick={() => handleBlock(member)}
            className="text-[8px] font-extrabold uppercase text-red-400 hover:text-red-650 bg-transparent border-none cursor-pointer"
          >
            Freeze
          </button>
        </div>

      </motion.div>
    );
  }

  return (
    <div className="space-y-6 pb-12 w-full text-slate-800 text-left">
      
      {/* Top Title & Command Actions Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-display">CRM - Follow Ups</h1>
          <p className="text-xs text-slate-500 font-medium">Renewal Command Center. Auto-tracks expiring memberships within 30 days.</p>
        </div>
        <button 
          onClick={() => fetchMembers()}
          className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-sm cursor-pointer border border-slate-100 transition-all active:scale-95"
          title="Refresh Data"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
        {[
          { label: 'Urgent (1 Day)', value: expiringTomorrow, sub: 'Needs call', color: 'border-red-200 text-red-600 bg-red-50/50' },
          { label: '3 Days Remaining', value: expiring3Days, sub: 'High risk', color: 'border-orange-200 text-orange-600 bg-orange-50/50' },
          { label: 'Expiring 7 Days', value: expiringWeek, sub: 'This Week', color: 'border-amber-200 text-amber-600 bg-amber-50/50' },
          { label: 'Expiring Month', value: expiringMonth, sub: 'This Month', color: 'border-blue-200 text-blue-600 bg-blue-50/50' },
          { label: 'Calls Pending', value: pendingCalls, sub: 'Under 3 attempts', color: 'border-slate-200 text-slate-600 bg-white' },
          { label: 'Renewed Today', value: renewedTodayCount, sub: 'Goal achieved', color: 'border-purple-200 text-purple-600 bg-purple-50/50' },
          { label: 'Expected Revenue', value: formatCurrency(expectedRevenue), sub: 'Pipeline Value', color: 'border-emerald-200 text-emerald-600 bg-emerald-50/50', wide: true }
        ].map((kpi, idx) => (
          <div 
            key={idx} 
            className={`border rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-sm ${kpi.color} ${kpi.wide ? 'lg:col-span-1 min-w-[130px]' : ''}`}
          >
            <span className="text-[8px] font-black uppercase tracking-wider opacity-60 leading-none">{kpi.label}</span>
            <div className="text-xl font-black mt-2 leading-none font-mono">{kpi.value}</div>
            <span className="text-[8px] font-semibold mt-1 opacity-70 leading-none">{kpi.sub}</span>
          </div>
        ))}
      </div>

      {/* Filter Options Controls bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID or phone..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2.5">
          <select 
            value={trainerFilter}
            onChange={e => setTrainerFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-600 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="all">All Trainers</option>
            {uniqueTrainers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select 
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-600 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="all">All Branches</option>
            {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select 
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-600 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="all">All Memberships</option>
            {uniquePlans.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select 
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-600 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="all">All Risk Levels</option>
            <option value="High">{"High Churn Risk (<=3 days)"}</option>
            <option value="Medium">{"Medium Risk (<=7 days)"}</option>
            <option value="Low">{"Low Risk (>7 days)"}</option>
          </select>
        </div>
      </div>

      {/* CRM Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
        
        {/* Urgent (1 Day) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-red-50 text-red-700 px-3 py-2.5 rounded-xl border border-red-100">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              🔥 Urgent (1 Day)
            </span>
            <span className="text-[9px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full">{pipeline.urgent.length}</span>
          </div>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {pipeline.urgent.map(m => <MemberPipelineCard key={m.id} member={m} days={getDaysRemaining(m.expiryDate)} color="border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.08)] bg-red-50/10" />)}
            {pipeline.urgent.length === 0 && <EmptyPipelineColumn />}
          </div>
        </div>

        {/* High Priority (3 Days) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-orange-50 text-orange-700 px-3 py-2.5 rounded-xl border border-orange-100">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              ⚠ High (3 Days)
            </span>
            <span className="text-[9px] bg-orange-600 text-white font-black px-2 py-0.5 rounded-full">{pipeline.high.length}</span>
          </div>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {pipeline.high.map(m => <MemberPipelineCard key={m.id} member={m} days={getDaysRemaining(m.expiryDate)} color="border-orange-300" />)}
            {pipeline.high.length === 0 && <EmptyPipelineColumn />}
          </div>
        </div>

        {/* This Week (7 Days) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-amber-50 text-amber-700 px-3 py-2.5 rounded-xl border border-amber-100">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              🟡 This Week (7 Days)
            </span>
            <span className="text-[9px] bg-amber-500 text-white font-black px-2 py-0.5 rounded-full">{pipeline.week.length}</span>
          </div>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {pipeline.week.map(m => <MemberPipelineCard key={m.id} member={m} days={getDaysRemaining(m.expiryDate)} color="border-amber-300" />)}
            {pipeline.week.length === 0 && <EmptyPipelineColumn />}
          </div>
        </div>

        {/* This Month (30 Days) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-blue-50 text-blue-700 px-3 py-2.5 rounded-xl border border-blue-100">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              🟢 This Month (30 Days)
            </span>
            <span className="text-[9px] bg-blue-600 text-white font-black px-2 py-0.5 rounded-full">{pipeline.month.length}</span>
          </div>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {pipeline.month.map(m => <MemberPipelineCard key={m.id} member={m} days={getDaysRemaining(m.expiryDate)} color="border-slate-200" />)}
            {pipeline.month.length === 0 && <EmptyPipelineColumn />}
          </div>
        </div>

        {/* Renewed Today */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-purple-50 text-purple-700 px-3 py-2.5 rounded-xl border border-purple-100">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              ✅ Renewed Today
            </span>
            <span className="text-[9px] bg-purple-600 text-white font-black px-2 py-0.5 rounded-full">{pipeline.renewed.length}</span>
          </div>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {pipeline.renewed.map(m => <MemberPipelineCard key={m.id} member={m} days={getDaysRemaining(m.expiryDate)} color="border-purple-300 bg-purple-50/10 shadow-[0_0_12px_rgba(168,85,247,0.06)]" isRenewed />)}
            {pipeline.renewed.length === 0 && <EmptyPipelineColumn />}
          </div>
        </div>
      </div>

      {/* Timeline / Followup history modal */}
      {showTimelineModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowTimelineModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 z-10 shadow-[0_30px_70px_rgba(0,0,0,0.12)] border border-slate-100 text-left">
            <button onClick={() => setShowTimelineModal(false)} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-250 flex items-center justify-center cursor-pointer">
              <X size={12} />
            </button>
            <h3 className="font-black text-sm text-slate-900 mb-2">Follow Up History: {selectedMember.name}</h3>
            
            {/* Timeline Notes List */}
            <div className="space-y-3.5 my-4 max-h-[300px] overflow-y-auto pr-1">
              {selectedMember.followUpHistory && selectedMember.followUpHistory.length > 0 ? (
                selectedMember.followUpHistory.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start border-l-2 border-slate-200 pl-3 relative ml-1">
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <div>
                      <div className="text-[10px] font-black text-slate-800">{item.action}</div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{item.notes}</p>
                      <span className="text-[8px] text-slate-400 font-bold block mt-1">{new Date(item.timestamp).toLocaleString('en-GB')}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400 italic">No timeline records found. Log your call attempts or notes below.</div>
              )}
            </div>

            {/* Log new note */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Log New Timeline Action</h4>
              <div className="flex gap-2">
                {['Called', 'WhatsApp Sent', 'Interested', 'Coming Tomorrow', 'Rejected'].map(a => (
                  <button 
                    key={a}
                    onClick={() => setTimelineAction(a)}
                    className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all border ${
                      timelineAction === a ? 'bg-black text-white border-black' : 'bg-white text-slate-650 border-slate-200'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <textarea 
                value={timelineNote}
                onChange={e => setTimelineNote(e.target.value)}
                placeholder="Type follow-up call notes, customer response, etc..."
                className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:border-indigo-500 focus:bg-white resize-none h-16 font-medium"
              />
              <button 
                onClick={() => {
                  handleLogFollowUp(selectedMember, timelineAction, timelineNote);
                  setShowTimelineModal(false);
                }}
                className="w-full py-2.5 bg-black hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider border-none cursor-pointer"
              >
                Save Timeline Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renewal Wizard Popup Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowRenewModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 z-10 shadow-[0_30px_70px_rgba(0,0,0,0.12)] border border-slate-100 text-left">
            <button onClick={() => setShowRenewModal(null)} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-250 flex items-center justify-center cursor-pointer">
              <X size={12} />
            </button>
            <h3 className="font-black text-sm text-slate-900 mb-0.5">Renew Membership</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4">Member: {showRenewModal.name}</p>

            <div className="space-y-4">
              {/* Membership Duration */}
              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Choose Membership</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    '1 Month',
                    '3 Months (Quarterly)',
                    '6 Months (Semi-Annual)',
                    '12 Months (Annual)',
                    'Lifetime Membership',
                    'Personal Training',
                    'Premium Membership'
                  ].map(planName => (
                    <button 
                      key={planName}
                      onClick={() => setRenewPlan(planName)}
                      className={`px-3 py-2 border rounded-xl text-[10px] font-bold text-left transition-all ${
                        renewPlan === planName ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {planName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Payment Method</label>
                <div className="flex gap-2">
                  {['Cash', 'UPI', 'Card', 'Bank', 'Split Payment'].map(m => (
                    <button 
                      key={m}
                      onClick={() => setRenewMethod(m)}
                      className={`flex-1 py-2 border rounded-xl text-[10px] font-bold text-center transition-all ${
                        renewMethod === m ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculations Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Discount (₹)</label>
                  <input 
                    type="number"
                    value={renewDiscount}
                    onChange={e => setRenewDiscount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">GST (%)</label>
                  <input 
                    type="number"
                    value={renewGst}
                    onChange={e => setRenewGst(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Price Calculation Breakdowns */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400 font-semibold">
                  <span>Base Rate ({renewPlan})</span>
                  <span>{formatCurrency(planRates[renewPlan] || 5000)}</span>
                </div>
                <div className="flex justify-between text-slate-400 font-semibold">
                  <span>Discount</span>
                  <span className="text-red-500">-{formatCurrency(Number(renewDiscount))}</span>
                </div>
                <div className="flex justify-between text-slate-400 font-semibold">
                  <span>GST ({renewGst}%)</span>
                  <span>{formatCurrency(Math.max(0, (planRates[renewPlan] || 5000) - Number(renewDiscount)) * (Number(renewGst) / 100))}</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-200">
                  <span className="text-slate-900">Total Price</span>
                  <span className="text-blue-600">
                    {formatCurrency(
                      Math.max(0, (planRates[renewPlan] || 5000) - Number(renewDiscount)) * (1 + Number(renewGst) / 100)
                    )}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={handleRenewMember}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider border-none cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
                >
                  Renew Membership
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function EmptyPipelineColumn() {
  return (
    <div className="border border-dashed border-slate-200 rounded-2xl py-8 px-4 text-center text-slate-400 text-[10px] bg-slate-50/20 italic">
      No pending cards
    </div>
  );
}
