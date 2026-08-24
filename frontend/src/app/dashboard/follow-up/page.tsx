'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Filter, 
  Search, 
  Plus, 
  Trash2, 
  MoreVertical,
  Check,
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Layers,
  PenLine
} from 'lucide-react';
import toast from '@/lib/toast';
import confetti from 'canvas-confetti';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import API from '@/services/api';
import { useGymStore } from '@/store';
import { useFollowups } from '@/hooks/useFollowups';
import { followupService, FollowUpItem } from '@/services/followup.service';
import { getTodayInIndia, isTodayInIndia, isOverdueInIndia, isUpcomingInIndia, formatIndianDate } from '@/lib/dateUtils';

// Helper: Normalize & classify Follow-up Source from real database record
export function getFollowupSourceInfo(task: FollowUpItem | any) {
  const rawSource = String(task?.source || '').trim().toLowerCase();
  
  // 1. Explicit source values
  if (rawSource === 'manual' || rawSource === 'staff' || rawSource === 'user') {
    return {
      type: 'manual',
      label: 'MANUAL',
      title: 'Staff Created',
      iconText: '✎',
      badgeClass: 'bg-indigo-50/90 text-indigo-700 border border-indigo-200/90 shadow-2xs font-extrabold'
    };
  }
  
  if (rawSource === 'auto' || rawSource === 'automatic' || rawSource === 'system' || rawSource === 'rule') {
    return {
      type: 'auto',
      label: 'AUTO',
      title: 'System Generated',
      iconText: '✦',
      badgeClass: 'bg-blue-50/90 text-[#0b5cbe] border border-blue-200/90 shadow-2xs font-extrabold'
    };
  }

  // 2. Safe Fallback for existing legacy records:
  // If task has an automationKey or ID starts with AUTO_ or is an automated renewal type:
  if (task?.automationKey?.startsWith('AUTO_') || task?.id?.startsWith('AUTO_') || task?.type === 'GYM MEMBERSHIP RENEWAL' || task?.type === 'PT RENEWAL' || task?.type === 'PENDING BALANCE') {
    return {
      type: 'auto',
      label: 'AUTO',
      title: 'System Generated',
      iconText: '✦',
      badgeClass: 'bg-blue-50/90 text-[#0b5cbe] border border-blue-200/90 shadow-2xs font-extrabold'
    };
  }

  // If it's a manually scheduled enquiry or custom task:
  return {
    type: 'manual',
    label: 'MANUAL',
    title: 'Staff Created',
    iconText: '✎',
    badgeClass: 'bg-indigo-50/90 text-indigo-700 border border-indigo-200/90 shadow-2xs font-extrabold'
  };
}

// Zod Schema for validation
const followUpFormSchema = z.object({
  memberId: z.string().min(1, 'Please select a member'),
  reason: z.string().min(2, 'Reason must be at least 2 characters'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent'], { message: 'Select priority' })
});

export default function FollowUpManager() {
  const { 
    followups, 
    todaysFollowups,
    overdueFollowups,
    activeFollowups,
    completedTodayFollowups,
    todaysCount,
    overdueCount,
    completedTodayCount,
    totalActiveCount,
    loading, 
    createFollowup, 
    completeFollowup, 
    snoozeFollowup, 
    cancelFollowup, 
    removeFollowup 
  } = useFollowups();

  const { members, fetchMembers } = useGymStore();
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Default to today in Asia/Kolkata timezone
  const todayDateStr = useMemo(() => getTodayInIndia(), []);

  // Tabs: 'today' (Default) | 'active' | 'overdue' | 'history'
  const [activeTab, setActiveTab] = useState<'today' | 'active' | 'overdue' | 'history'>('today');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [filterStaff, setFilterStaff] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStartDate, setFilterStartDate] = useState(todayDateStr);
  const [filterEndDate, setFilterEndDate] = useState(todayDateStr);
  const [isCustomDateFilterActive, setIsCustomDateFilterActive] = useState(false);

  // Selection
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState<any | null>(null);
  const [completeRemarks, setCompleteRemarks] = useState('');
  const [completeOutcome, setCompleteOutcome] = useState('Connected');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [nextFollowupTime, setNextFollowupTime] = useState('10:00');
  const [openActionDropdown, setOpenActionDropdown] = useState<string | null>(null);

  // Fetch Dependencies
  useEffect(() => {
    fetchMembers();

    const fetchEnquiries = async () => {
      try {
        const snap = await getDocs(collection(db, 'enquiries'));
        setEnquiries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (_) {
        try {
          const res = await API.get('/enquiries');
          setEnquiries(res.data || []);
        } catch (_) {}
      }
    };

    const fetchEmployees = async () => {
      try {
        const snap = await getDocs(collection(db, 'employees'));
        setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (_) {
        try {
          const res = await API.get('/employees');
          setEmployees(res.data || []);
        } catch (_) {}
      }
    };

    fetchEnquiries();
    fetchEmployees();
  }, [fetchMembers]);

  useEffect(() => {
    if (showCompleteModal) {
      const tomorrow = new Date(Date.now() + 86400000);
      const tomorrowStr = getTodayInIndia(tomorrow);
      setNextFollowupDate(tomorrowStr);
      setNextFollowupTime('10:00');
    }
  }, [showCompleteModal]);

  // Client Details Resolver
  const getClientDetails = (task: any) => {
    let name = task.name || task.memberName || task.clientName || '';
    let phone = task.phone || task.memberPhone || task.clientPhone || '';
    let plan = task.plan || 'Standard';

    if (task.memberId) {
      const m = members.find((x: any) => x.id === task.memberId || x.memberId === task.memberId);
      if (m) {
        name = m.name || name;
        phone = m.phone || phone;
        plan = m.plan || plan;
      }
    } else if (task.enquiryId) {
      const e = enquiries.find((x: any) => x.id === task.enquiryId);
      if (e) {
        name = e.name || name;
        phone = e.phone || phone;
        plan = e.plan || plan;
      }
    }

    if (!name || name === 'Member' || name === 'Unknown') {
      name = task.title ? task.title.replace('Membership Renewal:', '').replace('Followup:', '').replace('Follow-up', '').trim() : '';
    }

    return { 
      name: name || 'Gym Member', 
      phone: phone && phone !== 'N/A' ? phone : '9876543210', 
      plan: plan || 'Standard' 
    };
  };

  // Filter Logic based on Active Tab & Search/Dropdowns
  const filteredTasks = useMemo(() => {
    let result: FollowUpItem[] = [];

    if (isCustomDateFilterActive && filterStartDate && filterEndDate) {
      // When date range is explicitly selected, filter from all relevant tasks matching that date range
      const baseList = activeTab === 'history' 
        ? followups.filter(f => f.status === 'Completed' || f.status === 'Cancelled')
        : followups.filter(f => f.status !== 'Completed' && f.status !== 'Cancelled');

      result = baseList.filter(f => {
        const itemDate = (f.dueDate || f.scheduledDate || f.date || '').split('T')[0];
        return itemDate >= filterStartDate && itemDate <= filterEndDate;
      });
    } else {
      if (activeTab === 'today') {
        result = todaysFollowups;
      } else if (activeTab === 'active') {
        result = activeFollowups;
      } else if (activeTab === 'overdue') {
        result = overdueFollowups;
      } else if (activeTab === 'history') {
        result = followups.filter(f => f.status === 'Completed' || f.status === 'Cancelled');
      }
    }

    if (filterType !== 'All') {
      result = result.filter(f => f.type === filterType);
    }

    if (filterSource !== 'All') {
      result = result.filter(f => getFollowupSourceInfo(f).type === filterSource);
    }

    if (filterStaff !== 'All') {
      result = result.filter(f => f.assignedTo === filterStaff);
    }

    if (filterPriority !== 'All') {
      result = result.filter(f => (f.priority || '').toLowerCase() === filterPriority.toLowerCase());
    }

    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      result = result.filter(f => {
        const client = getClientDetails(f);
        return (
          client.name.toLowerCase().includes(sq) || 
          client.phone.includes(sq) || 
          (f.title || '').toLowerCase().includes(sq) ||
          (f.reason || '').toLowerCase().includes(sq) ||
          (f.notes || '').toLowerCase().includes(sq)
        );
      });
    }

    return result;
  }, [
    activeTab, 
    todaysFollowups, 
    activeFollowups, 
    overdueFollowups, 
    followups, 
    isCustomDateFilterActive, 
    filterStartDate, 
    filterEndDate, 
    filterType, 
    filterSource,
    filterStaff, 
    filterPriority, 
    searchQuery, 
    members, 
    enquiries
  ]);

  // Select all handling
  useEffect(() => {
    if (selectAll) {
      setSelectedTasks(filteredTasks.map(t => t.id));
    } else {
      setSelectedTasks([]);
    }
  }, [selectAll, filteredTasks]);

  const toggleSelect = (id: string) => {
    setSelectedTasks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Handlers
  const triggerConfetti = () => {
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  };

  const submitCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCompleteModal) return;
    
    const task = showCompleteModal;
    const targetId = task.id;
    const remarksLog = completeRemarks;
    const outcomeLog = completeOutcome;
    const memberIdLog = task.memberId;
    const enquiryIdLog = task.enquiryId;

    setShowCompleteModal(null);
    setCompleteRemarks('');
    setCompleteOutcome('Connected');
    setOpenActionDropdown(null);

    await completeFollowup(targetId, remarksLog, outcomeLog, memberIdLog, enquiryIdLog);

    if (outcomeLog === 'Follow-up Scheduled') {
      const client = getClientDetails(task);
      const targetDate = nextFollowupDate || getTodayInIndia(new Date(Date.now() + 86400000));
      const targetTime = nextFollowupTime || '10:00';
      const scheduledTimestamp = new Date(`${targetDate}T${targetTime}`).getTime() || (Date.now() + 86400000);

      await createFollowup({
        memberId: task.memberId || null,
        enquiryId: task.enquiryId || null,
        memberName: client.name,
        phone: client.phone,
        type: task.type || 'GYM MEMBERSHIP RENEWAL',
        priority: task.priority || 'Medium',
        assignedTo: task.assignedTo || 'Receptionist',
        scheduledDate: targetDate,
        scheduledTime: targetTime,
        scheduledTimestamp,
        dueDate: targetDate,
        date: targetDate,
        status: 'Pending',
        source: 'manual',
        title: `Rescheduled: ${client.name}`,
        reason: remarksLog ? `[Rescheduled Notes]: ${remarksLog}` : `Rescheduled from previous call`,
        notes: remarksLog ? `[Rescheduled Notes]: ${remarksLog}` : `Rescheduled from previous call`,
        description: remarksLog ? `[Rescheduled Notes]: ${remarksLog}` : `Rescheduled from previous call`,
        createdAt: new Date().toISOString()
      });

      toast.success(`Follow-up logged & Next call scheduled for ${targetDate} at ${targetTime}! 📅`);
    } else {
      toast.success('Follow-up completed successfully!', { icon: '🏆' });
      triggerConfetti();
    }
  };

  const handleSnooze = async (task: any) => {
    setOpenActionDropdown(null);
    const { nextHourStr } = await snoozeFollowup(task);
    toast.success(`Task snoozed by 1 hour (Scheduled: ${nextHourStr})`, { icon: '⏰' });
  };

  const handleDeleteTask = async (id: string) => {
    setOpenActionDropdown(null);
    try {
      toast.loading('Deleting task...', { id: `del-${id}` });
      await removeFollowup(id);
      setSelectedTasks(prev => prev.filter(x => x !== id));
      toast.success('Follow-up deleted', { id: `del-${id}` });
    } catch (err: any) {
      toast.error('Failed to delete task', { id: `del-${id}` });
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedTasks.length} selected tasks?`)) return;
    try {
      toast.loading('Deleting selected...', { id: 'bulk' });
      await Promise.allSettled(selectedTasks.map(id => removeFollowup(id)));
      setSelectedTasks([]);
      toast.success('Selected tasks deleted!', { id: 'bulk' });
    } catch (e) {
      toast.error('Failed to delete selected tasks.');
    }
  };

  const handleBulkComplete = async () => {
    try {
      toast.loading('Completing selected...', { id: 'bulk' });
      const now = new Date().toISOString();
      await Promise.allSettled(selectedTasks.map(id => updateDoc(doc(db, 'followups', id), {
        status: 'Completed',
        completedAt: now,
        remarks: 'Bulk completed from reception bar',
        outcome: 'Connected'
      })));
      setSelectedTasks([]);
      toast.success('Selected tasks completed!', { id: 'bulk' });
      triggerConfetti();
    } catch (e) {
      toast.error('Failed to complete selected tasks.');
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterType('All');
    setFilterSource('All');
    setFilterStaff('All');
    setFilterPriority('All');
    setFilterStartDate(todayDateStr);
    setFilterEndDate(todayDateStr);
    setIsCustomDateFilterActive(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6 text-left">
      
      {/* ── 1. ELEGANT HEADER (Unified Alpha Zone OS Style) ── */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-[#0b5cbe] flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Phone size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9.5px] font-black uppercase tracking-widest rounded-full shadow-2xs">
                Follow-Up Engine
              </span>
              <span className="text-xs text-slate-400 font-mono font-bold">AZ-FLP-v4.0</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 font-display">Follow-Up Manager</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Automatic membership renewals, PT reminders & reception follow-ups</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="w-full md:w-auto min-w-[180px] h-12 px-6 bg-gradient-to-r from-[#0b5cbe] to-[#2876d0] hover:from-[#084a99] hover:to-[#0b5cbe] text-white rounded-2xl text-xs font-black uppercase tracking-wider border-none cursor-pointer flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(11,92,190,0.25)] transition-all hover:scale-[1.02] active:scale-95 shrink-0"
          >
            <Plus size={18} />
            <span>New Follow-up</span>
          </button>
        </div>
      </div>

      {/* 2. STAT CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Queue */}
        <div 
          onClick={() => { setActiveTab('today'); setIsCustomDateFilterActive(false); setFilterStartDate(todayDateStr); setFilterEndDate(todayDateStr); }}
          className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
            activeTab === 'today' && !isCustomDateFilterActive ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-200/80 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">Due Today</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{todaysCount}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Clock size={22} />
            </div>
          </div>
          <span className="text-[10px] text-blue-600 font-bold mt-2 block">
            {activeTab === 'today' && !isCustomDateFilterActive ? '● Showing Today\'s Queue' : 'Click to view today\'s queue →'}
          </span>
        </div>

        {/* Card 2: Overdue Tasks */}
        <div 
          onClick={() => { setActiveTab('overdue'); setIsCustomDateFilterActive(false); }}
          className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
            activeTab === 'overdue' && !isCustomDateFilterActive ? 'border-red-600 ring-2 ring-red-500/20' : 'border-slate-200/80 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">Overdue Tasks</span>
              <span className="text-2xl font-black text-red-600 mt-1 block">{overdueCount}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
              <AlertTriangle size={22} />
            </div>
          </div>
          <span className="text-[10px] text-red-600 font-bold mt-2 block">
            {activeTab === 'overdue' && !isCustomDateFilterActive ? '● Showing Overdue Tasks' : 'Click to view overdue →'}
          </span>
        </div>

        {/* Card 3: Completed Today */}
        <div 
          onClick={() => { setActiveTab('history'); setIsCustomDateFilterActive(false); }}
          className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
            activeTab === 'history' && !isCustomDateFilterActive ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">Completed History</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">{completedTodayCount}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold mt-2 block">
            {activeTab === 'history' && !isCustomDateFilterActive ? '● Showing Completed History' : 'Click to view history →'}
          </span>
        </div>

        {/* Card 4: Total Active */}
        <div 
          onClick={() => { setActiveTab('active'); setIsCustomDateFilterActive(false); }}
          className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
            activeTab === 'active' && !isCustomDateFilterActive ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-200/80 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">Total Active</span>
              <span className="text-2xl font-black text-blue-600 mt-1 block">{totalActiveCount}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <MessageSquare size={22} />
            </div>
          </div>
          <span className="text-[10px] text-blue-600 font-bold mt-2 block">
            {activeTab === 'active' && !isCustomDateFilterActive ? '● Showing All Active' : 'Click to view all active →'}
          </span>
        </div>
      </div>

      {/* 3. CLEAN FILTER BAR & SOURCE LEGEND */}
      <div className="space-y-3">
        {/* Source Legend & Quick Information */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-500 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200/70 shadow-2xs w-fit">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Source:</span>
            <span className="flex items-center gap-1.5">
              <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-[#0b5cbe] border border-blue-200/80 flex items-center gap-1">
                <Sparkles size={9.5} className="shrink-0" /> AUTO
              </span>
              <span className="text-[11px] text-slate-600 font-medium hidden sm:inline">System generated</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center gap-1">
                <PenLine size={9.5} className="shrink-0" /> MANUAL
              </span>
              <span className="text-[11px] text-slate-600 font-medium hidden sm:inline">Staff created</span>
            </span>
          </div>

          <span className="text-xs text-slate-400 font-medium hidden md:inline">
            Real-time synchronization with Alpha Zone Cloud Engine
          </span>
        </div>

        {/* Filter Bar Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Box */}
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search member name, phone or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 rounded-xl border border-slate-200 outline-none focus:border-blue-600 transition-all placeholder-slate-400"
              />
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <input 
                type="date" 
                value={filterStartDate}
                onChange={(e) => { setFilterStartDate(e.target.value); setIsCustomDateFilterActive(true); }}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input 
                type="date" 
                value={filterEndDate}
                onChange={(e) => { setFilterEndDate(e.target.value); setIsCustomDateFilterActive(true); }}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
              />
              {isCustomDateFilterActive && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomDateFilterActive(false);
                    setFilterStartDate(todayDateStr);
                    setFilterEndDate(todayDateStr);
                  }}
                  className="px-1.5 py-0.5 text-[10px] font-extrabold text-blue-600 hover:bg-blue-100 rounded-lg border-none cursor-pointer"
                  title="Reset to default"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Source Filter Dropdown */}
            <select 
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 rounded-xl border border-slate-200 outline-none cursor-pointer focus:border-blue-600"
              value={filterSource} onChange={e => setFilterSource(e.target.value)}
            >
              <option value="All">All Sources</option>
              <option value="auto">✦ Auto Generated</option>
              <option value="manual">✎ Staff Created</option>
            </select>

            {/* Type Filter */}
            <select 
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 rounded-xl border border-slate-200 outline-none cursor-pointer focus:border-blue-600"
              value={filterType} onChange={e => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="GYM MEMBERSHIP RENEWAL">GYM MEMBERSHIP RENEWAL</option>
              <option value="PT RENEWAL">PT RENEWAL</option>
              <option value="PENDING BALANCE">PENDING BALANCE</option>
              <option value="Enquiry">Enquiry</option>
              <option value="General">General</option>
              <option value="Custom">Custom</option>
            </select>

            {/* Staff Filter */}
            <select 
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 rounded-xl border border-slate-200 outline-none cursor-pointer focus:border-blue-600"
              value={filterStaff} onChange={e => setFilterStaff(e.target.value)}
            >
              <option value="All">All Staff</option>
              {employees.map(e => <option key={e.id} value={e.name}>{e.name || e.fullName}</option>)}
            </select>

            {/* Priority Filter */}
            <select 
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 rounded-xl border border-slate-200 outline-none cursor-pointer focus:border-blue-600"
              value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            >
              <option value="All">All Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          {(searchQuery || filterType !== 'All' || filterSource !== 'All' || filterStaff !== 'All' || filterPriority !== 'All' || isCustomDateFilterActive) && (
            <button 
              onClick={resetFilters}
              className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all border-none cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. TASK CARDS LIST */}
      <div className="space-y-3">
        {/* Select All Row */}
        {filteredTasks.length > 0 && (
          <div className="flex items-center justify-between px-2 text-xs text-slate-500 font-medium">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={selectAll} 
                onChange={(e) => setSelectAll(e.target.checked)} 
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="font-bold text-slate-700">Select All ({filteredTasks.length} tasks)</span>
            </label>
            <span className="font-semibold text-slate-600">
              Showing {activeTab === 'today' ? "Today's Follow-Ups" : activeTab === 'overdue' ? 'Overdue Tasks' : activeTab === 'history' ? 'Completed History' : 'Active Tasks'}
            </span>
          </div>
        )}

        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto font-bold">
              <Check size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {activeTab === 'today' ? "No Follow-ups Due Today" : "No Follow-up Tasks Found"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              {activeTab === 'today' 
                ? "All caught up! There are currently no automated renewal or balance follow-ups due today." 
                : activeTab === 'history' 
                ? "No completed or cancelled follow-up records found." 
                : "No matching follow-up tasks for the selected view."}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const client = getClientDetails(task);
            const isSelected = selectedTasks.includes(task.id);
            const sourceInfo = getFollowupSourceInfo(task);
            const prevNotes = task.notes || task.description || task.remarks || '';

            let typeBadgeClass = 'bg-slate-100 text-slate-700 border border-slate-200/80 font-bold';
            let displayReason = task.reason || task.description || task.notes || task.title || '';

            if (task.type === 'GYM MEMBERSHIP RENEWAL' || task.type === 'Renewal') {
              typeBadgeClass = 'bg-blue-50 text-blue-800 border border-blue-200/80 font-black';
              displayReason = displayReason || 'Membership renewal due in 7 days';
            } else if (task.type === 'PT RENEWAL' || task.type === 'PT') {
              typeBadgeClass = 'bg-purple-50 text-purple-800 border border-purple-200/80 font-black';
              displayReason = displayReason || 'Personal Training renewal due in 4 days';
            } else if (task.type === 'PENDING BALANCE' || task.type === 'Payment') {
              typeBadgeClass = 'bg-amber-50 text-amber-900 border border-amber-200/80 font-black';
              const pendingAmtStr = task.pendingAmount ? `₹${Number(task.pendingAmount).toLocaleString('en-IN')}` : '';
              displayReason = pendingAmtStr ? `${pendingAmtStr} pending` : (displayReason || 'Pending membership balance');
            } else if (task.type === 'Enquiry') {
              typeBadgeClass = 'bg-slate-100 text-slate-700 border border-slate-200/80 font-bold';
            }

            const normPriority = (task.priority || 'Medium').toLowerCase();
            const isHighPriority = normPriority === 'high' || normPriority === 'critical' || normPriority === 'urgent';
            const priorityBadgeClass = isHighPriority 
              ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200' 
              : normPriority === 'medium'
              ? 'bg-blue-50 text-[#0b5cbe] font-bold border border-blue-200'
              : 'bg-slate-100 text-slate-600 font-medium border border-slate-200';

            const cleanDueDate = (task.dueDate || task.scheduledDate || '').split('T')[0];
            const isDueToday = cleanDueDate === todayDateStr;
            const isTaskOverdue = isOverdueInIndia(cleanDueDate);

            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`bg-white rounded-2xl p-5 border transition-all shadow-xs hover:shadow-md ${
                  isSelected ? 'border-blue-600 bg-blue-50/20' : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left: Checkbox + Client Avatar + Details */}
                  <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleSelect(task.id)}
                      className="w-4 h-4 mt-1 md:mt-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    />

                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                      {client.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Badge Hierarchy: [ TYPE ] [ ✦ AUTO / ✎ MANUAL ] [ PRIORITY ] */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-slate-900 truncate">{client.name}</h3>
                        
                        {/* 1. Follow-Up Type Badge */}
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${typeBadgeClass}`}>
                          {task.type || 'General'}
                        </span>

                        {/* 2. Source Badge (✦ AUTO / ✎ MANUAL) */}
                        <span 
                          className={`text-[9.5px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-wider ${sourceInfo.badgeClass}`}
                          title={sourceInfo.title}
                        >
                          {sourceInfo.type === 'auto' ? (
                            <Sparkles size={10} className="shrink-0 text-[#0b5cbe]" />
                          ) : (
                            <PenLine size={10} className="shrink-0 text-indigo-600" />
                          )}
                          <span>{sourceInfo.label}</span>
                        </span>

                        {/* 3. Priority Badge */}
                        <span className={`text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-wider ${priorityBadgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isHighPriority ? 'bg-rose-500' : 'bg-blue-500'}`} />
                          {task.priority || 'Medium'}
                        </span>

                        {task.status === 'Completed' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            Completed
                          </span>
                        )}
                      </div>

                      {/* Display Reason */}
                      <p className="text-xs font-semibold text-slate-700 mt-1">
                        {displayReason}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold mt-1 flex-wrap">
                        <a href={`tel:${client.phone}`} className="hover:text-blue-600 transition-colors flex items-center gap-1">
                          📞 {client.phone}
                        </a>
                        <span>•</span>
                        <span className={`flex items-center gap-1 font-bold ${isTaskOverdue ? 'text-rose-600' : isDueToday ? 'text-blue-700 font-black' : 'text-slate-700'}`}>
                          📅 {isDueToday ? 'Due Today' : `Due: ${formatIndianDate(cleanDueDate)}`} {task.scheduledTime ? `· ${task.scheduledTime}` : ''}
                        </span>
                        <span>•</span>
                        <span>Assigned: {task.assignedTo || 'Receptionist'}</span>
                      </div>

                      {/* Last Conversation Remarks */}
                      {prevNotes && prevNotes !== displayReason && (
                        <div className="mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-xs text-slate-700 font-medium">
                          <span className="font-bold text-slate-700">Last Note:</span> "{prevNotes}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <a
                      href={`tel:${client.phone}`}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 no-underline shadow-xs"
                    >
                      <Phone size={13} /> Call
                    </a>

                    <a
                      href={`https://wa.me/91${client.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 no-underline"
                    >
                      <MessageCircle size={13} /> WhatsApp
                    </a>

                    {task.status !== 'Completed' && (
                      <button
                        onClick={() => setShowCompleteModal(task)}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border-none cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 size={13} /> Complete
                      </button>
                    )}

                    <div className="relative">
                      <button 
                        onClick={() => setOpenActionDropdown(openActionDropdown === task.id ? null : task.id)}
                        className="p-2 rounded-xl hover:bg-slate-100 border border-slate-200 text-slate-500 cursor-pointer transition-colors"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {openActionDropdown === task.id && (
                        <div className="absolute right-0 bottom-full mb-2 w-44 bg-white border border-slate-200 shadow-xl rounded-xl z-50 py-1.5 flex flex-col text-xs font-semibold text-left">
                          <button onClick={() => handleSnooze(task)} className="px-3 py-2 hover:bg-slate-50 text-slate-700 w-full transition-colors flex items-center gap-2 border-none cursor-pointer">
                            <Clock size={14}/> Snooze 1 Hour
                          </button>
                          <div className="h-px bg-slate-100 my-1"></div>
                          <button onClick={() => handleDeleteTask(task.id)} className="px-3 py-2 hover:bg-red-50 text-red-600 w-full transition-colors flex items-center gap-2 border-none cursor-pointer">
                            <Trash2 size={14}/> Delete Task
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* 5. FLOATING BULK ACTIONS BAR */}
      <AnimatePresence>
        {selectedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-slate-900 text-white rounded-2xl px-6 py-3.5 flex items-center gap-4 shadow-2xl"
          >
            <span className="text-xs font-bold text-blue-400">
              ⚡ {selectedTasks.length} Tasks Selected
            </span>
            <div className="h-4 w-px bg-slate-700" />
            <button
              onClick={handleBulkComplete}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all border-none cursor-pointer"
            >
              Mark Complete
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all border-none cursor-pointer"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedTasks([])}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all border-none cursor-pointer"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. COMPLETE TASK MODAL */}
      <AnimatePresence>
        {showCompleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-500" size={18} /> Complete Follow-Up
                </h3>
                <button onClick={() => setShowCompleteModal(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 border-none cursor-pointer">
                  ✕
                </button>
              </div>

              {/* Task Client & Source Summary */}
              {(() => {
                const client = getClientDetails(showCompleteModal);
                const sourceInfo = getFollowupSourceInfo(showCompleteModal);
                return (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Member / Lead:</span>
                      <span className="font-extrabold text-slate-900">{client.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Contact:</span>
                      <span className="font-bold text-blue-700">{client.phone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Follow-Up Source:</span>
                      <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-wider ${sourceInfo.badgeClass}`}>
                        {sourceInfo.type === 'auto' ? <Sparkles size={10} className="shrink-0 text-[#0b5cbe]" /> : <PenLine size={10} className="shrink-0 text-indigo-600" />}
                        {sourceInfo.label} · {sourceInfo.title}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <form onSubmit={submitCompleteTask} className="space-y-4 text-left">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Call Outcome</label>
                  <select
                    value={completeOutcome}
                    onChange={(e) => setCompleteOutcome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="Connected">Connected & Spoke</option>
                    <option value="Interested in Renewal">Interested in Renewal</option>
                    <option value="Payment Promised">Payment Promised</option>
                    <option value="Follow-up Scheduled">Follow-up Rescheduled</option>
                    <option value="Not Reachable / Busy">Not Reachable / Busy</option>
                    <option value="Not Interested">Not Interested</option>
                  </select>
                </div>

                {completeOutcome === 'Follow-up Scheduled' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <div>
                      <label className="text-[11px] font-bold text-blue-900 block mb-1">Next Call Date</label>
                      <input
                        type="date"
                        required
                        value={nextFollowupDate}
                        onChange={(e) => setNextFollowupDate(e.target.value)}
                        className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-blue-900 block mb-1">Next Time</label>
                      <input
                        type="time"
                        required
                        value={nextFollowupTime}
                        onChange={(e) => setNextFollowupTime(e.target.value)}
                        className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Conversation Notes</label>
                  <textarea
                    placeholder="Enter what member said during call..."
                    rows={3}
                    value={completeRemarks}
                    onChange={(e) => setCompleteRemarks(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-600 resize-none placeholder-slate-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCompleteModal(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-md shadow-emerald-500/20 border-none cursor-pointer"
                  >
                    Save & Complete
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. ADD MANUAL FOLLOW-UP WIZARD */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Plus size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Schedule Manual Follow-Up</h3>
                    <p className="text-[11px] text-slate-500">Create staff callback task for any gym member</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 border-none cursor-pointer">
                  ✕
                </button>
              </div>

              <AddFollowUpWizard 
                members={members} 
                employees={employees} 
                createFollowup={createFollowup} 
                onClose={() => setShowAddModal(false)} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Subcomponent: Searchable Member Select
function SearchableMemberSelect({ 
  members, 
  selectedMemberId, 
  onSelect 
}: { 
  members: any[]; 
  selectedMemberId: string; 
  onSelect: (m: any) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedMember = useMemo(() => {
    return members.find(m => m.id === selectedMemberId || m.memberId === selectedMemberId);
  }, [members, selectedMemberId]);

  const filteredMembers = useMemo(() => {
    if (!searchTerm) return members.slice(0, 30);
    const term = searchTerm.toLowerCase();
    return members.filter(m => 
      m.name?.toLowerCase().includes(term) || 
      m.phone?.includes(term) || 
      m.memberId?.toLowerCase().includes(term)
    ).slice(0, 30);
  }, [members, searchTerm]);

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 flex items-center justify-between cursor-pointer focus:border-blue-600"
      >
        <span className={selectedMember ? 'text-slate-900' : 'text-slate-400'}>
          {selectedMember ? `${selectedMember.name} (${selectedMember.phone || 'No Phone'})` : '-- Select Gym Member --'}
        </span>
        <span className="text-slate-400 text-[10px]">▼</span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 max-h-56 overflow-y-auto">
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search member name or phone..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-600 font-semibold"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            {filteredMembers.map(m => (
              <div 
                key={m.id || m.memberId} 
                onClick={() => { onSelect(m); setIsOpen(false); }}
                className="px-3 py-1.5 text-xs rounded-lg hover:bg-blue-50 hover:text-blue-700 cursor-pointer flex items-center justify-between transition-colors"
              >
                <span className="font-bold text-slate-800">{m.name}</span>
                <span className="text-[10px] text-slate-400 font-semibold">{m.phone || 'No phone'}</span>
              </div>
            ))}
            {filteredMembers.length === 0 && (
              <div className="p-3 text-center text-xs text-slate-400">No members found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Add Follow-up Wizard Modal Form
function AddFollowUpWizard({ 
  members, 
  employees, 
  createFollowup, 
  onClose 
}: { 
  members: any[]; 
  employees: any[]; 
  createFollowup?: (data: any) => Promise<any>; 
  onClose: () => void;
}) {
  const todayStr = useMemo(() => getTodayInIndia(), []);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [reason, setReason] = useState('GYM MEMBERSHIP RENEWAL');
  const [customReason, setCustomReason] = useState('');
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState('10:00');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [assignedTo, setAssignedTo] = useState('Receptionist');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const REASON_OPTIONS = [
    'GYM MEMBERSHIP RENEWAL',
    'PT RENEWAL',
    'PENDING BALANCE',
    'General Follow-up',
    'Attendance Follow-up',
    'Diet Follow-up',
    'Custom'
  ];

  const staffOptions = useMemo(() => {
    const list = ['Receptionist', 'Sales Executive', 'Manager', 'Owner'];
    if (Array.isArray(employees)) {
      employees.forEach(emp => {
        const empName = emp.name || emp.fullName;
        if (empName && !list.includes(empName)) {
          list.push(empName);
        }
      });
    }
    return list;
  }, [employees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const finalReason = reason === 'Custom' ? customReason.trim() : reason;
    const memberId = selectedMember?.id || selectedMember?.memberId || '';

    // Zod validation
    const validationResult = followUpFormSchema.safeParse({
      memberId,
      reason: finalReason,
      date,
      time,
      priority
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach(issue => {
        if (issue.path[0]) {
          errors[issue.path[0].toString()] = issue.message;
        }
      });
      setFormErrors(errors);
      toast.error('Please fix form validation errors before scheduling');
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const scheduledDateTime = new Date(`${date}T${time}`);
      const ts = scheduledDateTime.getTime() || Date.now();

      const memberName = selectedMember.name || 'Member';
      const phone = selectedMember.phone || '';

      const operationId = `fol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      let followUpType = 'General';
      if (finalReason === 'GYM MEMBERSHIP RENEWAL' || finalReason.includes('Renewal') || finalReason.includes('Membership')) {
        followUpType = 'GYM MEMBERSHIP RENEWAL';
      } else if (finalReason === 'PT RENEWAL' || finalReason.includes('PT') || finalReason.includes('Personal Training')) {
        followUpType = 'PT RENEWAL';
      } else if (finalReason === 'PENDING BALANCE' || finalReason.includes('Balance') || finalReason.includes('Payment')) {
        followUpType = 'PENDING BALANCE';
      }

      const payload = {
        id: operationId,
        memberId,
        memberName,
        phone,
        priority: priority as any,
        title: finalReason,
        reason: finalReason,
        notes: `Follow-up for ${memberName}: ${finalReason}`,
        description: `Follow-up for ${memberName}: ${finalReason}`,
        assignedTo,
        dueDate: date,
        scheduledDate: date,
        scheduledTime: time,
        scheduledTimestamp: ts,
        status: 'Pending' as const,
        type: followUpType,
        source: 'manual' as const,
        createdAt: new Date().toISOString()
      };

      const createFn = createFollowup || followupService.create;
      await createFn(payload);

      toast.success('✓ Manual follow-up scheduled successfully');
      onClose();
    } catch (err: any) {
      toast.error('Failed to schedule follow-up: ' + (err.response?.data?.error || err.message || 'Error occurred'));
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
      {/* 1. Member Selector */}
      <div>
        <label className="text-xs font-bold text-slate-700 mb-1.5 block">
          Member <span className="text-blue-600">*</span>
        </label>
        <SearchableMemberSelect 
          members={members} 
          selectedMemberId={selectedMember?.id || selectedMember?.memberId || ''} 
          onSelect={(m) => { setSelectedMember(m); if (formErrors.memberId) setFormErrors(prev => ({ ...prev, memberId: '' })); }} 
        />
        {formErrors.memberId && (
          <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle size={12} /> {formErrors.memberId}
          </p>
        )}
      </div>

      {/* 2. Reason */}
      <div>
        <label className="text-xs font-bold text-slate-700 mb-1.5 block">
          Reason <span className="text-blue-600">*</span>
        </label>
        <select 
          value={reason} 
          onChange={e => { setReason(e.target.value); if (formErrors.reason) setFormErrors(prev => ({ ...prev, reason: '' })); }} 
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
        >
          {REASON_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>

        {reason === 'Custom' && (
          <input 
            type="text" 
            placeholder="Enter custom follow-up reason..." 
            value={customReason} 
            onChange={e => { setCustomReason(e.target.value); if (formErrors.reason) setFormErrors(prev => ({ ...prev, reason: '' })); }} 
            className={`w-full mt-2 bg-slate-50 border ${formErrors.reason ? 'border-red-500' : 'border-slate-200'} rounded-xl px-4 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600`}
          />
        )}

        {formErrors.reason && (
          <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle size={12} /> {formErrors.reason}
          </p>
        )}
      </div>

      {/* 3. Schedule Date & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1.5 block">
            Date <span className="text-blue-600">*</span>
          </label>
          <input 
            type="date" 
            value={date} 
            onChange={e => { setDate(e.target.value); if (formErrors.date) setFormErrors(prev => ({ ...prev, date: '' })); }} 
            className={`w-full bg-slate-50 border ${formErrors.date ? 'border-red-500' : 'border-slate-200'} rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer`}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1.5 block">
            Time <span className="text-blue-600">*</span>
          </label>
          <input 
            type="time" 
            value={time} 
            onChange={e => { setTime(e.target.value); if (formErrors.time) setFormErrors(prev => ({ ...prev, time: '' })); }} 
            className={`w-full bg-slate-50 border ${formErrors.time ? 'border-red-500' : 'border-slate-200'} rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer`}
          />
        </div>
      </div>

      {/* 4. Priority & Assigned Staff */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1.5 block">
            Priority <span className="text-blue-600">*</span>
          </label>
          <select 
            value={priority} 
            onChange={e => setPriority(e.target.value as any)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 mb-1.5 block">Assigned Staff</label>
          <select 
            value={assignedTo} 
            onChange={e => setAssignedTo(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
          >
            {staffOptions.map(staff => (
              <option key={staff} value={staff}>{staff}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
        <button 
          type="button" 
          onClick={onClose} 
          className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border-none cursor-pointer"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 border-none cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? 'Scheduling...' : 'Schedule Follow-Up'}
        </button>
      </div>
    </form>
  );
}
