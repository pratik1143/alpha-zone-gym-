'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, X, CheckCircle2, MessageSquare, Plus, Search, Trash2, 
  MessageCircle, Phone, Clock, Calendar, MoreVertical, 
  AlertTriangle, AlertCircle, Filter, RefreshCw, Check, User, Sparkles
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, doc, updateDoc, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useGymStore } from '@/store';
import API from '@/services/api';
import confetti from 'canvas-confetti';
import { z } from 'zod';

import { useFollowups } from '@/hooks/useFollowups';
import { followupService } from '@/services/followup.service';

export default function FollowUpManager() {
  const { members, fetchMembers } = useGymStore();
  const { 
    followups, loading, 
    dueNowCount, overdueCount, completedTodayCount, todaysCount,
    createFollowup, completeFollowup, snoozeFollowup, cancelFollowup, removeFollowup
  } = useFollowups();

  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStaff, setFilterStaff] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStartDate, setFilterStartDate] = useState(''); 
  const [filterEndDate, setFilterEndDate] = useState(''); 
  const [showHistory, setShowHistory] = useState(false);

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

  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

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
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
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
      const m = members.find(x => x.id === task.memberId || x.memberId === task.memberId);
      if (m) {
        name = m.name || name;
        phone = m.phone || phone;
        plan = m.plan || plan;
      }
    } else if (task.enquiryId) {
      const e = enquiries.find(x => x.id === task.enquiryId);
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
      name: name || 'Gym Client', 
      phone: phone && phone !== 'N/A' ? phone : '9877466899', 
      plan: plan || 'Standard' 
    };
  };

  // Filter Logic
  const filteredTasks = useMemo(() => {
    let result = followups;

    if (showHistory) {
      result = result.filter(f => f.status === 'Completed' || f.status === 'Cancelled');
    } else {
      result = result.filter(f => f.status === 'Pending');
    }

    // Date range filtering
    if (filterStartDate && filterEndDate) {
      result = result.filter(f => f.scheduledDate >= filterStartDate && f.scheduledDate <= filterEndDate);
    } else if (filterStartDate && !filterEndDate) {
      result = result.filter(f => f.scheduledDate === filterStartDate);
    } else if (!filterStartDate && filterEndDate) {
      result = result.filter(f => f.scheduledDate <= filterEndDate);
    } else {
      // Default: show today's tasks & overdue pending tasks
      result = result.filter(f => f.scheduledDate <= todayDateStr);
    }

    if (filterType !== 'All') {
      result = result.filter(f => f.type === filterType);
    }

    if (filterStaff !== 'All') {
      result = result.filter(f => f.assignedTo === filterStaff);
    }

    if (filterPriority !== 'All') {
      result = result.filter(f => f.priority === filterPriority);
    }

    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      result = result.filter(f => {
        const client = getClientDetails(f);
        return client.name.toLowerCase().includes(sq) || client.phone.includes(sq) || f.title?.toLowerCase().includes(sq);
      });
    }

    return result;
  }, [followups, filterType, filterStaff, filterPriority, searchQuery, showHistory, filterStartDate, filterEndDate, members, enquiries, todayDateStr]);

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
      const targetDate = nextFollowupDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const targetTime = nextFollowupTime || '10:00';
      const scheduledTimestamp = new Date(`${targetDate}T${targetTime}`).getTime() || (Date.now() + 86400000);

      await createFollowup({
        memberId: task.memberId || null,
        enquiryId: task.enquiryId || null,
        memberName: client.name,
        phone: client.phone,
        type: task.type || 'Renewal',
        priority: task.priority || 'Medium',
        assignedTo: task.assignedTo || 'Gym Owner',
        scheduledDate: targetDate,
        scheduledTime: targetTime,
        scheduledTimestamp,
        dueDate: targetDate,
        date: targetDate,
        status: 'Pending',
        title: `Rescheduled: ${client.name}`,
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
    setFilterStaff('All');
    setFilterPriority('All');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6 text-left">
      
      {/* 1. ELEGANT HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Phone size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Follow-Up Manager</h1>
              <p className="text-xs text-slate-500 font-medium">Manage member calls, renewal reminders & client follow-ups</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* History Mode Switch */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/60">
            <button
              onClick={() => setShowHistory(false)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border-none cursor-pointer ${!showHistory ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Active Tasks
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border-none cursor-pointer ${showHistory ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Completed History
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 border-none cursor-pointer"
          >
            <Plus size={16} /> New Follow-up
          </button>
        </div>
      </div>

      {/* 2. STAT CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">Due Today</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{todaysCount}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">Overdue Tasks</span>
            <span className="text-2xl font-black text-red-600 mt-1 block">{overdueCount}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">Completed Today</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{completedTodayCount}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">Total Active</span>
            <span className="text-2xl font-black text-blue-600 mt-1 block">{followups.filter(f => f.status === 'Pending').length}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <MessageSquare size={22} />
          </div>
        </div>
      </div>

      {/* 3. CLEAN FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search member name, phone or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 rounded-xl border border-slate-200 outline-none focus:border-blue-600 transition-all placeholder-slate-400"
            />
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <input 
              type="date" 
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
            />
            <span className="text-xs text-slate-400 font-bold">to</span>
            <input 
              type="date" 
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
            />
          </div>

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

        {(searchQuery || filterType !== 'All' || filterStaff !== 'All' || filterPriority !== 'All' || filterStartDate || filterEndDate) && (
          <button 
            onClick={resetFilters}
            className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all border-none cursor-pointer"
          >
            Clear Filters
          </button>
        )}
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
            <span>Showing {showHistory ? 'Completed/Cancelled' : 'Pending'} tasks</span>
          </div>
        )}

        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto font-bold">
              <Check size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Follow-up Tasks Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              {showHistory ? 'No completed or cancelled follow-up history records yet.' : 'All caught up! No pending follow-up calls scheduled for this view.'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const client = getClientDetails(task);
            const isSelected = selectedTasks.includes(task.id);
            const isAutomatic = task.source === 'automatic' || !!task.automationKey;
            const prevNotes = task.notes || task.description || task.remarks || '';

            let typeBadgeClass = 'bg-slate-100 text-slate-700';
            let displayReason = task.reason || task.description || task.notes || task.title || '';

            if (task.type === 'GYM MEMBERSHIP RENEWAL' || task.type === 'Renewal') {
              typeBadgeClass = 'bg-blue-100 text-blue-800 border border-blue-200';
              displayReason = displayReason || 'Membership renewal due in 7 days';
            } else if (task.type === 'PT RENEWAL' || task.type === 'PT') {
              typeBadgeClass = 'bg-purple-100 text-purple-800 border border-purple-200';
              displayReason = displayReason || 'Personal Training renewal due in 4 days';
            } else if (task.type === 'PENDING BALANCE' || task.type === 'Payment') {
              typeBadgeClass = 'bg-amber-100 text-amber-900 border border-amber-200';
              const pendingAmtStr = task.pendingAmount ? `₹${Number(task.pendingAmount).toLocaleString('en-IN')}` : '';
              displayReason = pendingAmtStr ? `${pendingAmtStr} pending` : (displayReason || 'Pending membership balance');
            } else if (task.type === 'Enquiry') {
              typeBadgeClass = 'bg-indigo-100 text-indigo-800 border border-indigo-200';
            }

            const normPriority = (task.priority || 'Medium').toLowerCase();
            const isHighPriority = normPriority === 'high' || normPriority === 'critical' || normPriority === 'urgent';
            const priorityBadgeClass = isHighPriority 
              ? 'bg-red-100 text-red-700 font-bold border border-red-200' 
              : normPriority === 'medium'
              ? 'bg-blue-100 text-blue-700 font-bold border border-blue-200'
              : 'bg-slate-100 text-slate-600 font-medium';

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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-slate-900 truncate">{client.name}</h3>
                        
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${typeBadgeClass}`}>
                          {task.type || 'General'}
                        </span>

                        <span className={`text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 ${priorityBadgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isHighPriority ? 'bg-red-500' : 'bg-blue-500'}`} />
                          {task.priority || 'Medium'}
                        </span>

                        {isAutomatic && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                            ⚡ Auto
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
                        <span className="flex items-center gap-1 text-slate-700 font-bold">
                          📅 Due: {task.dueDate || task.scheduledDate} {task.scheduledTime ? `· ${task.scheduledTime}` : ''}
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
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all border-none cursor-pointer"
            >
              Delete Selected
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. MODALS */}

      {/* Add Follow-up Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden text-left">
              <div className="bg-blue-600 px-6 py-4 flex items-center justify-between text-white">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide">NEW FOLLOW-UP</h2>
                  <p className="text-[11px] text-blue-100 font-medium mt-0.5">Create a follow-up reminder for a member.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-white/80 hover:text-white border-none cursor-pointer bg-transparent p-1">
                  <X size={18} />
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

      {/* Complete & Reschedule Log Modal */}
      <AnimatePresence>
        {showCompleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCompleteModal(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden relative text-left">
              <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between text-white">
                <div>
                  <h3 className="font-bold uppercase tracking-wide text-xs flex items-center gap-2">
                    <MessageCircle size={16}/> Add Follow-up Log & Reschedule
                  </h3>
                  <p className="text-[10px] text-emerald-100 font-medium mt-0.5">Log call outcome and set next reminder</p>
                </div>
                <button onClick={() => setShowCompleteModal(null)} className="text-white/80 hover:text-white border-none cursor-pointer bg-transparent"><X size={18}/></button>
              </div>

              {/* Previous Notes Summary */}
              {(() => {
                const client = getClientDetails(showCompleteModal);
                const prevNotes = showCompleteModal.notes || showCompleteModal.description || showCompleteModal.remarks || 'No prior notes recorded.';
                return (
                  <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">Client Details</span>
                        <h4 className="text-sm font-bold text-slate-800">{client.name}</h4>
                        <p className="text-xs text-slate-500 font-medium">📞 {client.phone} • {showCompleteModal.type || 'Follow-up'}</p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        showCompleteModal.priority === 'High' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {showCompleteModal.priority || 'Medium'} Priority
                      </span>
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                      <span className="text-xs font-bold text-slate-800 block">💬 Last Time Kya Baat Hui (Previous Notes):</span>
                      <p className="text-xs font-medium text-slate-700 mt-0.5 italic">"{prevNotes}"</p>
                    </div>
                  </div>
                );
              })()}

              <form onSubmit={submitCompleteTask} className="p-6 space-y-4 text-left">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Outcome Status</label>
                  <select value={completeOutcome} onChange={e => setCompleteOutcome(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 cursor-pointer">
                    <option value="Connected">Connected (Completed)</option>
                    <option value="Follow-up Scheduled">Follow-up Scheduled (Reschedule Next Call)</option>
                    <option value="Resolved">Resolved / Deal Closed</option>
                    <option value="No Answer">No Answer / Missed</option>
                    <option value="Not Interested">Not Interested</option>
                  </select>
                </div>

                {/* Conditional Reschedule Date/Time inputs */}
                {completeOutcome === 'Follow-up Scheduled' && (
                  <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-blue-900 text-xs font-bold">
                      <Calendar size={14}/> Next Follow-up Date & Time
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">Next Call Date</label>
                        <input 
                          type="date" 
                          required 
                          value={nextFollowupDate} 
                          onChange={e => setNextFollowupDate(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">Next Call Time</label>
                        <input 
                          type="time" 
                          required 
                          value={nextFollowupTime} 
                          onChange={e => setNextFollowupTime(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Remarks / Call Summary</label>
                  <textarea required value={completeRemarks} onChange={e => setCompleteRemarks(e.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 resize-none" placeholder="Aaj kya baat hui? Enter conversation details..." />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowCompleteModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs cursor-pointer hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 uppercase tracking-wider transition-all border-none cursor-pointer">
                    {completeOutcome === 'Follow-up Scheduled' ? 'Schedule Next Follow-up' : 'Submit Follow-up'}
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

function SearchableMemberSelect({ 
  members, 
  selectedMemberId, 
  onSelect 
}: { 
  members: any[]; 
  selectedMemberId: string; 
  onSelect: (member: any) => void;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedMember = useMemo(() => {
    return members.find(m => (m.id && m.id === selectedMemberId) || (m.memberId && m.memberId === selectedMemberId));
  }, [members, selectedMemberId]);

  const filteredMembers = useMemo(() => {
    if (!query) return members.slice(0, 50);
    const q = query.toLowerCase();
    return members.filter(m => {
      const name = (m.name || '').toLowerCase();
      const phone = (m.phone || '').toLowerCase();
      const id = (m.memberId || m.id || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || id.includes(q);
    }).slice(0, 50);
  }, [members, query]);

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-200 hover:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 cursor-pointer flex items-center justify-between transition-all"
      >
        {selectedMember ? (
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-slate-900">{selectedMember.name}</span>
            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
              {selectedMember.memberId || (selectedMember.id ? selectedMember.id.substring(0, 8) : 'AZM')}
            </span>
            <span className="text-slate-500 text-[11px]">📞 {selectedMember.phone || 'N/A'}</span>
          </div>
        ) : (
          <span className="text-slate-400 font-normal">-- Select member --</span>
        )}
        <Search size={14} className="text-slate-400 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 text-left">
          <input 
            type="text" 
            autoFocus
            placeholder="Search member name, ID or phone..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 mb-2"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredMembers.length === 0 ? (
              <p className="text-xs text-slate-400 p-2 text-center font-medium">No members found</p>
            ) : (
              filteredMembers.map((m) => (
                <div 
                  key={m.id || m.memberId}
                  onClick={() => {
                    onSelect(m);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={`p-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-all ${
                    (selectedMemberId === m.id || selectedMemberId === m.memberId)
                      ? 'bg-blue-50 text-blue-900 font-bold'
                      : 'hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <div>
                    <span className="font-bold block text-slate-900">{m.name}</span>
                    <span className="text-[10px] text-slate-500 font-medium">📞 {m.phone || 'No phone'}</span>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {m.memberId || (m.id ? m.id.substring(0, 8) : 'AZM')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const followUpFormSchema = z.object({
  memberId: z.string().min(1, 'Please select a member'),
  reason: z.string().trim().min(2, 'Follow-up reason must be at least 2 characters'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent'], { message: 'Select priority' })
});

function AddFollowUpWizard({ 
  members, 
  employees, 
  createFollowup, 
  onClose 
}: { 
  members: any[]; 
  employees: any[]; 
  createFollowup?: (data: any) => Promise<any>; 
  onClose: () => void 
}) {
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [reason, setReason] = useState('GYM MEMBERSHIP RENEWAL');
  const [customReason, setCustomReason] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
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

      {/* 3. Date & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1.5 block">
            Date <span className="text-blue-600">*</span>
          </label>
          <input 
            type="date" 
            value={date} 
            onChange={e => { setDate(e.target.value); if (formErrors.date) setFormErrors(prev => ({ ...prev, date: '' })); }} 
            className={`w-full bg-slate-50 border ${formErrors.date ? 'border-red-500' : 'border-slate-200'} rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer`}
          />
          {formErrors.date && (
            <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> {formErrors.date}
            </p>
          )}
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1.5 block">
            Time <span className="text-blue-600">*</span>
          </label>
          <input 
            type="time" 
            value={time} 
            onChange={e => { setTime(e.target.value); if (formErrors.time) setFormErrors(prev => ({ ...prev, time: '' })); }} 
            className={`w-full bg-slate-50 border ${formErrors.time ? 'border-red-500' : 'border-slate-200'} rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer`}
          />
          {formErrors.time && (
            <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> {formErrors.time}
            </p>
          )}
        </div>
      </div>

      {/* 4. Assign To & Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1.5 block">Assign To</label>
          <select 
            value={assignedTo} 
            onChange={e => setAssignedTo(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
          >
            {staffOptions.map(staff => (
              <option key={staff} value={staff}>{staff}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 mb-1.5 block">Priority</label>
          <select 
            value={priority} 
            onChange={e => setPriority(e.target.value as any)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* 5. Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button 
          type="button" 
          onClick={onClose} 
          disabled={isSubmitting}
          className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs cursor-pointer transition-all disabled:opacity-50"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 border-none cursor-pointer flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>SCHEDULING...</span>
            </>
          ) : (
            'Schedule Follow-up'
          )}
        </button>
      </div>
    </form>
  );
}
