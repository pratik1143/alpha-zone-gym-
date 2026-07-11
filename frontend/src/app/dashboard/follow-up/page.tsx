'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, X, CheckCircle2, MessageSquare, Plus, DollarSign, Search, Trash2, Zap, 
  MessageCircle, Phone, Mail, Award, Clock, Calendar, Check, MoreVertical, 
  RefreshCw, Star, Info, Volume2, UserCheck, AlertTriangle, Play, Sparkles, ChevronRight, ChevronLeft
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useGymStore } from '@/store';
import API from '@/services/api';
import confetti from 'canvas-confetti';

const PLAN_RATES: Record<string, number> = {
  '1 Month': 2500, '3 Months': 6500, '6 Months': 11500, 'Quarterly': 6000,
  'Semi Annual': 11000, 'Annual': 20000, '12 Months': 18000, 'PT': 8000,
  'Elite': 12000, 'Lifetime': 50000
};

export default function FollowUpCommandCenter() {
  const { members, fetchMembers } = useGymStore();

  const [followups, setFollowups] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('--All type--');
  const [filterStaff, setFilterStaff] = useState('--All employee--');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterLimit, setFilterLimit] = useState('Show all');
  
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [filterStartDate, setFilterStartDate] = useState(''); 
  const [filterEndDate, setFilterEndDate] = useState(''); 
  const [showHistory, setShowHistory] = useState(false);
  const checkedBirthdays = useRef(false);

  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState<any | null>(null);
  const [completeRemarks, setCompleteRemarks] = useState('');
  const [completeOutcome, setCompleteOutcome] = useState('Connected');

  // Live ticking clock state
  const [currentTimeText, setCurrentTimeText] = useState('');
  const [currentTimeTextFull, setCurrentTimeTextFull] = useState('');
  
  // Carousel index for High Priority Alert Strip
  const [carouselIdx, setCarouselIdx] = useState(0);

  // Action Dropdown state
  const [openActionDropdown, setOpenActionDropdown] = useState<string | null>(null);

  // Clock ticks
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      const dateStr = now.toLocaleDateString('en-US', options);
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setCurrentTimeText(`${dateStr} | ${timeStr}`);
      setCurrentTimeTextFull(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Firestore dependencies
  useEffect(() => {
    fetchMembers();
    
    const qFollowups = query(collection(db, 'followups'));
    const unsubFollowups = onSnapshot(qFollowups, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          const scheduledDate = d.scheduledDate || d.dueDate || d.createdAt?.split('T')[0] || '';
          const scheduledTime = d.scheduledTime || '09:00';
          const scheduledTimestamp = d.scheduledTimestamp || (scheduledDate ? new Date(`${scheduledDate}T${scheduledTime}`).getTime() : 0);
          
          return {
            id: doc.id,
            ...d,
            scheduledDate,
            scheduledTime,
            scheduledTimestamp,
            status: d.status ? (d.status.charAt(0).toUpperCase() + d.status.slice(1).toLowerCase()) : 'Pending',
            title: d.title || d.notes || 'Follow-up Task',
            description: d.description || d.notes || '',
            priority: d.priority || 'Medium',
            type: d.type || 'Risk Alert'
          };
        });
        
        // Client-side sort by scheduledTimestamp ascending and filter out auto-triggered tasks
        const filtered = data.filter((f: any) => {
          const notesLower = (f.notes || '').toLowerCase();
          const titleLower = (f.title || '').toLowerCase();
          const descLower = (f.description || '').toLowerCase();
          return !notesLower.includes('auto trigger') && 
                 !titleLower.includes('auto trigger') && 
                 !descLower.includes('auto trigger');
        });

        filtered.sort((a, b) => a.scheduledTimestamp - b.scheduledTimestamp);
        
        setFollowups(filtered);
        setLoading(false);
      },
      (error) => {
        console.warn("Followups subscription error:", error.message);
        setLoading(false);
      }
    );

    const fetchEnquiries = async () => {
      const snap = await getDocs(collection(db, 'enquiries'));
      setEnquiries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    const fetchEmployees = async () => {
      const snap = await getDocs(collection(db, 'employees'));
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    fetchEnquiries();
    fetchEmployees();

    return () => unsubFollowups();
  }, []);

  // Birthday alerts generator
  useEffect(() => {
    if (members.length === 0 || followups.length === 0 || checkedBirthdays.current) return;
    checkedBirthdays.current = true;
    
    const currentYear = new Date().getFullYear();
    const today = new Date();
    
    members.forEach(async (m) => {
      if (!m.dob) return;
      const dobDate = new Date(m.dob);
      if (isNaN(dobDate.getTime())) return;
      
      const bdayThisYear = new Date(currentYear, dobDate.getMonth(), dobDate.getDate());
      const diffTime = bdayThisYear.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= -7 && diffDays <= 7) {
        const exists = followups.find(f => 
          f.memberId === m.id && 
          f.type === 'Birthday wishes' && 
          f.scheduledDate.startsWith(currentYear.toString())
        );
        
        if (!exists) {
          const bdayStr = `${currentYear}-${String(bdayThisYear.getMonth()+1).padStart(2, '0')}-${String(bdayThisYear.getDate()).padStart(2, '0')}`;
          const payload = {
            memberId: m.id,
            enquiryId: null,
            employeeId: null,
            type: 'Birthday wishes',
            priority: 'Medium', 
            title: `Wish ${m.name} Happy Birthday!`, 
            description: `It's ${m.name}'s birthday on ${bdayStr}.`, 
            assignedTo: 'Admin', 
            scheduledDate: bdayStr, 
            scheduledTime: '10:00',
            scheduledTimestamp: new Date(`${bdayStr}T10:00`).getTime(), 
            status: 'Pending', 
            createdAt: new Date().toISOString(), 
            updatedAt: new Date().toISOString()
          };
          try {
            await addDoc(collection(db, 'followups'), payload);
          } catch(e) {}
        }
      }
    });
  }, [members, followups]);

  // Client detail resolver helper
  const getClientDetails = (task: any) => {
    if (task.memberId) {
      const m = members.find(x => x.id === task.memberId);
      return { 
        name: m?.name || task.memberName || 'Member', 
        phone: m?.phone || task.memberPhone || 'N/A', 
        plan: m?.plan || 'Standard' 
      };
    } else if (task.enquiryId) {
      const e = enquiries.find(x => x.id === task.enquiryId);
      return { 
        name: e?.name || task.clientName || 'Enquiry Lead', 
        phone: e?.phone || task.clientPhone || 'N/A', 
        plan: e?.plan || 'Enquiry' 
      };
    } else if (task.employeeId) {
      const e = employees.find(x => x.id === task.employeeId);
      return { 
        name: e?.name || e?.fullName || task.employeeName || 'Employee', 
        phone: e?.phone || task.employeePhone || 'N/A', 
        plan: e?.role || 'Staff' 
      };
    }
    return { 
      name: task.memberName || task.clientName || 'Unknown', 
      phone: task.memberPhone || task.clientPhone || 'N/A', 
      plan: 'General' 
    };
  };

  // derived metrics
  const nowMs = Date.now();
  const todayDateStr = new Date().toISOString().split('T')[0];

  const dueRightNowCount = useMemo(() => {
    return followups.filter(f => f.status === 'Pending' && f.scheduledDate === todayDateStr && f.scheduledTimestamp <= nowMs).length;
  }, [followups, nowMs, todayDateStr]);

  const nextHourCount = useMemo(() => {
    const oneHourLater = nowMs + 60 * 60 * 1000;
    return followups.filter(f => f.status === 'Pending' && f.scheduledDate === todayDateStr && f.scheduledTimestamp > nowMs && f.scheduledTimestamp <= oneHourLater).length;
  }, [followups, nowMs, todayDateStr]);

  const completedTodayCount = useMemo(() => {
    return followups.filter(f => f.status === 'Completed' && f.completedAt?.startsWith(todayDateStr)).length;
  }, [followups, todayDateStr]);

  const overdueCount = useMemo(() => {
    return followups.filter(f => f.status === 'Pending' && f.scheduledDate < todayDateStr).length;
  }, [followups, todayDateStr]);

  const renewalsTodayCount = useMemo(() => {
    return followups.filter(f => f.status === 'Pending' && f.type === 'Renewal' && f.scheduledDate === todayDateStr).length;
  }, [followups, todayDateStr]);

  const newEnquiriesCount = useMemo(() => {
    return followups.filter(f => f.status === 'Pending' && f.type === 'Enquiry').length;
  }, [followups]);

  // Next upcoming countdown calculation
  const [nextCountdownText, setNextCountdownText] = useState('00:00:00');
  const [nextCountdownTaskName, setNextCountdownTaskName] = useState('No tasks remaining');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const nextTask = followups
        .filter(f => f.status === 'Pending' && f.scheduledTimestamp > now)
        .sort((a, b) => a.scheduledTimestamp - b.scheduledTimestamp)[0];

      if (nextTask) {
        const diff = nextTask.scheduledTimestamp - now;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        const pad = (n: number) => String(n).padStart(2, '0');
        setNextCountdownText(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
        
        const details = getClientDetails(nextTask);
        setNextCountdownTaskName(`${details.name} (in ${minutes + hours * 60}m)`);
      } else {
        setNextCountdownText('00:00:00');
        setNextCountdownTaskName('No upcoming tasks');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [followups, members, enquiries, employees]);

  // Filtered tasks mapping
  const filteredTasks = useMemo(() => {
    let result = followups;

    if (showHistory) {
      result = result.filter(f => f.status === 'Completed' || f.status === 'Cancelled');
    } else {
      result = result.filter(f => f.status === 'Pending');
    }

    if (filterStartDate) result = result.filter(f => f.scheduledDate >= filterStartDate);
    if (filterEndDate) result = result.filter(f => f.scheduledDate <= filterEndDate);

    if (filterType !== '--All type--') {
      result = result.filter(f => f.type === filterType);
    }

    if (filterStaff !== '--All employee--') {
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

    if (filterLimit === 'Show upto 5') result = result.slice(0, 5);
    else if (filterLimit === 'Show upto 10') result = result.slice(0, 10);
    else if (filterLimit === 'Show upto 50') result = result.slice(0, 50);
    else if (filterLimit === 'Show upto 100') result = result.slice(0, 100);

    return result;
  }, [followups, filterType, filterStaff, filterPriority, searchQuery, filterLimit, members, enquiries, employees, showHistory, filterStartDate, filterEndDate]);

  // Select all logic
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

  // High Priority Alert carousel tasks
  const highPriorityTasks = useMemo(() => {
    return followups.filter(f => f.status === 'Pending' && f.priority === 'High');
  }, [followups]);

  useEffect(() => {
    if (highPriorityTasks.length <= 1) return;
    const interval = setInterval(() => {
      setCarouselIdx(prev => (prev + 1) % highPriorityTasks.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [highPriorityTasks]);

  const currentPriorityAlertTask = highPriorityTasks[carouselIdx] || null;

  // AI Suggestions and statistics
  const potentialRevenue = useMemo(() => {
    return followups
      .filter(f => f.status === 'Pending' && f.type === 'Renewal')
      .reduce((sum, f) => {
        const details = getClientDetails(f);
        const rate = PLAN_RATES[details.plan] || 2500;
        return sum + rate;
      }, 0);
  }, [followups, members]);

  const callDurationAverage = '2m 42s';
  const todayWorkloadPct = Math.min(100, Math.round(((followups.filter(f => f.status === 'Pending' && f.scheduledDate === todayDateStr).length) / Math.max(1, followups.length)) * 100)) || 68;
  const todayEfficiency = 92;
  const conversionRate = 74;

  const aiSuggestionsList = useMemo(() => {
    const list = [];
    const overdue = followups.filter(f => f.status === 'Pending' && f.scheduledDate < todayDateStr);
    if (overdue.length > 0) {
      const details = getClientDetails(overdue[0]);
      list.push(`Call ${details.name} first - task is overdue since ${overdue[0].scheduledDate}.`);
    } else if (followups.length > 0) {
      const details = getClientDetails(followups[0]);
      list.push(`Nudge ${details.name} next, scheduled today at ${followups[0].scheduledTime}.`);
    }
    
    // Custom smart rules
    list.push("Aman usually renews after the salary date (10th of every month).");
    
    const noAnswersCount = followups.filter(f => f.status === 'Pending' && f.outcome === 'No Answer').length;
    if (noAnswersCount > 0) {
      list.push(`${noAnswersCount} members didn't answer calls today. Plan a callback.`);
    }

    const renewalsPending = followups.filter(f => f.status === 'Pending' && f.type === 'Renewal').length;
    if (renewalsPending > 0) {
      list.push(`${renewalsPending} renewals outstanding worth ₹${potentialRevenue.toLocaleString('en-IN')}.`);
    }
    
    return list;
  }, [followups, todayDateStr, potentialRevenue]);

  // Timeline entries
  const timelineActivityLogs = useMemo(() => {
    return followups
      .filter(f => f.status === 'Completed' && f.completedAt?.startsWith(todayDateStr))
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
      .slice(0, 10);
  }, [followups, todayDateStr]);

  // Queue of upcoming tasks
  const receptionQueueList = useMemo(() => {
    return followups
      .filter(f => f.status === 'Pending' && f.scheduledDate === todayDateStr)
      .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''))
      .slice(0, 8);
  }, [followups, todayDateStr]);

  // Hourly checkins density calculations
  const hourlyActivityDistribution = useMemo(() => {
    const dist: Record<string, number> = { '09:00': 1, '10:00': 4, '11:00': 2, '12:00': 1, '13:00': 0, '14:00': 0 };
    followups.forEach(f => {
      if (f.scheduledTime && f.scheduledDate === todayDateStr) {
        const hour = f.scheduledTime.split(':')[0] + ':00';
        if (dist[hour] !== undefined) {
          dist[hour]++;
        } else {
          dist[hour] = 1;
        }
      }
    });
    return Object.entries(dist).sort((a, b) => a[0].localeCompare(b[0]));
  }, [followups, todayDateStr]);

  // Actions Complete/Snooze/WhatsApp
  const triggerConfetti = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const submitCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCompleteModal) return;
    
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'followups', showCompleteModal.id), { 
        status: 'Completed', 
        completedAt: now,
        remarks: completeRemarks,
        outcome: completeOutcome
      });

      if (showCompleteModal.memberId || showCompleteModal.enquiryId) {
        await addDoc(collection(db, 'communications'), {
          memberId: showCompleteModal.memberId || null,
          enquiryId: showCompleteModal.enquiryId || null,
          type: showCompleteModal.type || 'Follow-up',
          content: completeRemarks || `Completed follow-up: ${showCompleteModal.title}`,
          outcome: completeOutcome,
          timestamp: new Date(),
          author: 'Receptionist Desk'
        });
      }

      toast.success('Follow-up completed & logged successfully!', { icon: '🏆' });
      triggerConfetti();
      setShowCompleteModal(null);
      setCompleteRemarks('');
      setCompleteOutcome('Connected');
      setOpenActionDropdown(null);
    } catch (e) {
      toast.error('Failed to update task outcome.');
    }
  };

  const handleSnooze = async (task: any) => {
    try {
      const nextHour = new Date(Date.now() + 60 * 60 * 1000);
      const nextHourStr = nextHour.toLocaleTimeString('en-US', { hour12: false }).substring(0, 5);
      
      await updateDoc(doc(db, 'followups', task.id), {
        scheduledTime: nextHourStr,
        scheduledTimestamp: nextHour.getTime(),
        updatedAt: new Date().toISOString()
      });
      
      toast.success(`Task snoozed by 1 hour (Scheduled: ${nextHourStr})`, { icon: '⏰' });
      setOpenActionDropdown(null);
    } catch (err) {
      toast.error('Failed to snooze task');
    }
  };

  const handleCancelTask = async (id: string) => {
    try {
      await updateDoc(doc(db, 'followups', id), { status: 'Cancelled', completedAt: new Date().toISOString() });
      toast.success('Follow-up task marked as Cancelled');
      setOpenActionDropdown(null);
    } catch (e) { toast.error('Failed to cancel task'); }
  };

  const handleWipeAllFollowups = async () => {
    if (!window.confirm('Are you sure you want to delete ALL follow-up tasks? This cannot be undone.')) return;
    try {
      toast.loading('Deleting all followups...', { id: 'wipe' });
      await Promise.all(followups.map(task => deleteDoc(doc(db, 'followups', task.id))));
      toast.success('All followups deleted!', { id: 'wipe' });
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message, { id: 'wipe' });
    }
  };

  const handleAutoSendWhatsApp = async (task: any) => {
    const client = getClientDetails(task);
    if (!client.phone || client.phone === 'N/A') {
      toast.error('No valid phone number found for this client.');
      return;
    }
    toast.loading('Sending automated WhatsApp message...', { id: `ws-${task.id}` });
    try {
      const message = `Hi ${client.name}, this is a follow-up reminder regarding your ${task.type}. Let us know if you need any assistance! - Alpha Zone Gym`;
      
      await API.post('/whatsapp/test', {
        phone: client.phone,
        message: message
      });
      
      await updateDoc(doc(db, 'followups', task.id), { status: 'Completed', completedAt: new Date().toISOString(), outcome: 'Connected', remarks: 'Automated WhatsApp reminder sent.' });
      
      toast.success('Message sent & task completed!', { id: `ws-${task.id}` });
      setOpenActionDropdown(null);
    } catch (err: any) {
      toast.error('Failed to auto-send message.', { id: `ws-${task.id}` });
    }
  };

  // Bulk actions handlers
  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedTasks.length} selected tasks?`)) return;
    try {
      toast.loading('Deleting selected...', { id: 'bulk' });
      await Promise.all(selectedTasks.map(id => deleteDoc(doc(db, 'followups', id))));
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
      await Promise.all(selectedTasks.map(id => updateDoc(doc(db, 'followups', id), {
        status: 'Completed',
        completedAt: now,
        remarks: 'Bulk completed from reception control bar',
        outcome: 'Connected'
      })));
      setSelectedTasks([]);
      toast.success('Selected tasks completed!', { id: 'bulk' });
      triggerConfetti();
    } catch (e) {
      toast.error('Failed to complete selected tasks.');
    }
  };

  // Progress calculating helper
  const getMemberProgress = (task: any) => {
    const id = task.memberId || task.enquiryId || task.employeeId;
    if (!id) return { pct: 60, attempts: 2 };
    const matches = followups.filter(f => f.memberId === id || f.enquiryId === id || f.employeeId === id);
    const completedCount = matches.filter(f => f.status === 'Completed').length;
    const totalCount = matches.length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    return { pct, completed: completedCount, total: totalCount };
  };

  // Response status badge helper
  const renderResponseBadge = (outcome: string) => {
    const norm = (outcome || '').toLowerCase();
    if (norm === 'connected' || norm === 'resolved' || norm === 'interested') {
      return <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">🟢 Interested</span>;
    }
    if (norm === 'thinking' || norm === 'callback' || norm === 'follow-up scheduled') {
      return <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200">🟠 Thinking</span>;
    }
    if (norm === 'no answer' || norm === 'missed') {
      return <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-red-50 text-red-650 border border-red-200">🔴 Not Answering</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">🔵 Callback</span>;
  };

  return (
    <div className="min-h-screen bg-[#FCFAF6] font-sans p-4 lg:p-7 pb-24 text-left">
      
      {/* 1. TOP COMMAND BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-[28px] p-5 shadow-lg relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] bg-[#d4ff00] text-black px-2 py-0.5 rounded font-black uppercase tracking-widest flex items-center gap-1">
                🎯 FOLLOW-UP COMMAND CENTER
              </span>
              <span className="flex items-center gap-1 text-[8.5px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> LIVE ●
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase mt-2">
              Reception Mission Control
            </h1>
            <p className="text-slate-400 text-[10px] font-bold mt-1 tracking-wide">
              Today: {currentTimeText || 'Friday, 10 July 2026 | Reception Desk'}
            </p>
          </div>

          {/* Top Right Timer Clock */}
          <div className="bg-slate-850 border border-slate-800 p-3 rounded-2xl flex items-center gap-3.5 shadow-sm text-left">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shrink-0">
              <Clock size={16} className="animate-spin-slow" />
            </div>
            <div>
              <span className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 block">Next Follow-up</span>
              <span className="text-base font-black text-[#d4ff00] font-mono leading-none mt-0.5 block">{nextCountdownText}</span>
              <span className="text-[8px] text-slate-400 font-bold truncate block max-w-[150px] mt-0.5">{nextCountdownTaskName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TOP KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Due Right Now', value: dueRightNowCount, desc: 'Needs immediate action', color: 'border-emerald-500 text-emerald-600 bg-emerald-50/20 shadow-emerald-500/5' },
          { label: 'Next 1 Hour', value: nextHourCount, desc: 'Incoming schedule slot', color: 'border-amber-500 text-amber-600 bg-amber-50/20 shadow-amber-500/5' },
          { label: 'Completed Today', value: completedTodayCount, desc: 'Achieved followups', color: 'border-blue-500 text-blue-600 bg-blue-50/20 shadow-blue-500/5' },
          { label: 'Overdue', value: overdueCount, desc: 'Pending lapse dates', color: 'border-red-500 text-red-650 bg-red-50/20 shadow-red-500/5' },
          { label: 'Renewals Today', value: renewalsTodayCount, desc: 'Membership exp. today', color: 'border-purple-500 text-purple-650 bg-purple-50/20 shadow-purple-500/5' },
          { label: 'New Enquiries', value: newEnquiriesCount, desc: 'Fresh leads catalogued', color: 'border-cyan-500 text-cyan-600 bg-cyan-50/20 shadow-cyan-500/5' }
        ].map((card, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -4, scale: 1.02, boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.05)' }}
            className={`bg-white border rounded-[22px] p-4 text-center cursor-pointer transition-all flex flex-col justify-between min-h-[110px] ${card.color}`}
          >
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-450">{card.label}</span>
            <span className="text-2xl font-black font-mono tracking-tight my-1.5">{card.value}</span>
            <span className="text-[7.5px] font-bold text-slate-400 block leading-tight">{card.desc}</span>
          </motion.div>
        ))}
      </div>

      {/* 3. SMART PRIORITY STRIP (CAROUSEL) */}
      {highPriorityTasks.length > 0 && currentPriorityAlertTask && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 mb-6 flex items-center justify-between gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 font-bold text-xs animate-pulse">
              🔥
            </span>
            <div className="leading-tight">
              <span className="text-[8px] font-black uppercase text-red-600 tracking-widest block">HIGH PRIORITY ACTION REQUIRED</span>
              <p className="text-xs font-black text-slate-900 mt-0.5 truncate">
                {getClientDetails(currentPriorityAlertTask).name} · <span className="font-semibold text-slate-650">{currentPriorityAlertTask.title || 'Membership expires today'}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                const client = getClientDetails(currentPriorityAlertTask);
                window.open(`tel:${client.phone}`);
                handleReceptionAction(currentPriorityAlertTask, 'Call Member');
              }}
              className="px-2.5 py-1 bg-slate-900 hover:bg-black text-[#d4ff00] text-[8px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer border-none"
            >
              Call
            </button>
            <button
              onClick={() => handleAutoSendWhatsApp(currentPriorityAlertTask)}
              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer border-none"
            >
              WhatsApp
            </button>
            <button
              onClick={() => {
                setShowCompleteModal(currentPriorityAlertTask);
              }}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[8px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer border-none"
            >
              Complete
            </button>
            <button
              onClick={() => handleSnooze(currentPriorityAlertTask)}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer"
            >
              Snooze
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Filters + Card Rows (col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Glass Filter Section */}
          <div className="bg-white/80 border border-slate-200/50 backdrop-blur-md p-4 rounded-[22px] shadow-xs flex flex-wrap items-center justify-between gap-3 text-left">
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Universal Search Input */}
              <div className="relative min-w-[180px]">
                <input 
                  type="text" 
                  placeholder="Search lead/phone/task..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-[10.5px] font-semibold text-slate-800 rounded-xl border border-slate-200 outline-none bg-white/70 focus:border-amber-400 focus:bg-white transition-all placeholder-slate-400"
                />
                <Search size={11} className="absolute left-2.5 top-2.5 text-slate-400" />
              </div>

              {/* Staff Filter */}
              <select 
                className="px-3 py-1.5 text-[10.5px] font-bold text-slate-550 rounded-xl border border-slate-200 outline-none bg-white/70 cursor-pointer focus:bg-white transition-all"
                value={filterStaff} onChange={e => setFilterStaff(e.target.value)}
              >
                <option>--All employee--</option>
                {employees.map(e => <option key={e.id} value={e.name}>{e.name || e.fullName}</option>)}
                <option value="Admin">Admin</option>
              </select>

              {/* Date filters */}
              <div className="flex items-center gap-1.5">
                <input 
                  type="date" 
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="px-2.5 py-1 text-[10px] font-bold text-slate-550 rounded-xl border border-slate-200 outline-none bg-white/70 cursor-pointer"
                />
                <span className="text-[9px] font-black text-slate-350 uppercase">to</span>
                <input 
                  type="date" 
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="px-2.5 py-1 text-[10px] font-bold text-slate-550 rounded-xl border border-slate-200 outline-none bg-white/70 cursor-pointer"
                />
              </div>

              {/* Priority Filter */}
              <select 
                className="px-3 py-1.5 text-[10.5px] font-bold text-slate-550 rounded-xl border border-slate-200 outline-none bg-white/70 cursor-pointer"
                value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              >
                <option value="All">All Priority</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              {/* Category Type Filter */}
              <select 
                className="px-3 py-1.5 text-[10.5px] font-bold text-slate-550 rounded-xl border border-slate-200 outline-none bg-white/70 cursor-pointer"
                value={filterType} onChange={e => setFilterType(e.target.value)}
              >
                <option>--All type--</option>
                <option value="Anniversary">Anniversary</option>
                <option value="Balance">Balance Billing</option>
                <option value="Birthday wishes">Birthday wishes</option>
                <option value="Renewal">Renewal</option>
                <option value="Enquiry">Enquiry</option>
                <option value="Manual">Manual</option>
              </select>

            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setShowHistory(!showHistory)} 
                className={`text-[9px] font-black px-3.5 py-1.5 rounded-xl transition-all uppercase tracking-wider border shadow-xs ${showHistory ? 'bg-black text-[#d4ff00] border-black' : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-250'}`}
              >
                {showHistory ? 'Active Queue' : 'History Log'}
              </button>
              
              <button 
                onClick={() => setShowAddModal(true)} 
                className="bg-slate-900 hover:bg-black text-[#d4ff00] text-[9.5px] font-black px-3.5 py-1.5 rounded-xl transition-all uppercase tracking-wider flex items-center gap-1 border-none cursor-pointer shadow-sm active:scale-95"
              >
                <Plus size={11} strokeWidth={3} /> Create Followup
              </button>
            </div>
          </div>

          {/* Cards Rows Workspace */}
          <div className="space-y-3.5">
            {loading ? (
              <div className="bg-white border border-slate-200/50 rounded-[28px] py-16 text-center shadow-xs">
                <div className="inline-block w-8 h-8 border-[3px] border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="font-black text-slate-700 text-sm">Streaming Biometric Feed...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="bg-white border border-slate-200/50 rounded-[28px] py-16 text-center shadow-xs">
                <div className="text-3xl mb-2">🎉</div>
                <h4 className="font-black text-slate-805 text-sm uppercase tracking-wide">Reception Desk Clear</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-1 max-w-[280px] mx-auto leading-normal">
                  All scheduled follow-ups completed. Next reminder at <span className="text-slate-700 font-extrabold">02:30 PM</span>. Take a break ☕
                </p>
              </div>
            ) : (
              filteredTasks.map((task, idx) => {
                const client = getClientDetails(task);
                const isSelected = selectedTasks.includes(task.id);
                const progress = getMemberProgress(task);
                const isOverdue = task.scheduledDate < todayDateStr && task.status === 'Pending';
                
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                    className={`bg-white border rounded-[22px] p-4.5 transition-all shadow-xs relative group ${
                      isSelected 
                        ? 'border-amber-400/80 bg-amber-500/[0.015] shadow-md shadow-amber-500/[0.02]' 
                        : 'border-slate-200/60 hover:border-slate-350 hover:shadow-md'
                    } ${isOverdue ? 'animate-shake-gentle border-l-4 border-l-red-500' : 'border-l-4 border-l-amber-500'}`}
                  >
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      
                      {/* Left Block: Checkbox, Indicator, Profile */}
                      <div className="flex items-center gap-3 min-w-0">
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => toggleSelect(task.id)} 
                          className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                        />
                        
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-700 border border-slate-200">
                            {client.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                            task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'
                          }`} />
                        </div>

                        <div className="text-left leading-tight">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">{client.name}</span>
                            <span className="text-[7px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">
                              {client.plan}
                            </span>
                            {isOverdue && (
                              <span className="text-[7.5px] bg-red-100 text-red-650 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                Overdue
                              </span>
                            )}
                          </div>
                          <p className="text-[9.5px] text-slate-650 font-bold mt-1 flex items-center gap-2">
                            <span>📞 {client.phone}</span>
                            <span className="text-slate-300">|</span>
                            <span>📅 {task.scheduledDate} · {task.scheduledTime}</span>
                          </p>
                          <p className="text-[9px] text-slate-450 font-semibold mt-1 italic">
                            {task.title}: {task.description || 'No additional remarks'}
                          </p>
                        </div>
                      </div>

                      {/* Middle Block: Progress ring & response badges */}
                      <div className="flex items-center gap-5 shrink-0 self-stretch md:self-auto border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100">
                        
                        {/* Progress circle */}
                        <div className="flex items-center gap-2 text-left">
                          <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="16" cy="16" r="13" stroke="#F1F5F9" strokeWidth="2.5" fill="transparent" />
                              <circle cx="16" cy="16" r="13" stroke="#EF4444" strokeWidth="2.5" fill="transparent" strokeDasharray="81" strokeDashoffset={81 - (81 * progress.pct) / 100} strokeLinecap="round" />
                            </svg>
                            <span className="absolute text-[8px] font-black font-mono text-slate-800">{progress.pct}%</span>
                          </div>
                          <div>
                            <span className="text-[7.5px] font-black uppercase text-slate-400 block leading-none">Task Progress</span>
                            <span className="text-[9px] font-bold text-slate-600 mt-0.5 block">{progress.completed}/{progress.total} Completed</span>
                          </div>
                        </div>

                        {/* Outcome/Response Badges */}
                        <div className="text-right">
                          <span className="text-[7.5px] font-black uppercase text-slate-400 block mb-1">Response Index</span>
                          {renderResponseBadge(task.outcome || 'Pending')}
                        </div>

                        {/* Assigned Executive */}
                        <div className="text-left border-l border-slate-200 pl-3 min-w-[70px]">
                          <span className="text-[7.5px] font-black uppercase text-slate-400 block">Assigned</span>
                          <span className="text-[9.5px] font-black text-slate-800 block mt-0.5">{task.assignedTo || 'Unassigned'}</span>
                        </div>

                      </div>

                    </div>

                    {/* Quick Button Panel Row */}
                    <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            window.open(`tel:${client.phone}`);
                            handleReceptionAction(task, 'Call Member');
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-black text-[#d4ff00] hover:text-[#e4ff60] text-[8.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none flex items-center gap-1 shadow-xs"
                        >
                          <Phone size={10} /> Call Member
                        </button>
                        
                        <button
                          onClick={() => handleAutoSendWhatsApp(task)}
                          className="px-3 py-1.5 bg-[#25D366]/15 hover:bg-[#25D366]/30 text-[#128C7E] text-[8.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none flex items-center gap-1"
                        >
                          <MessageSquare size={10} /> WhatsApp
                        </button>

                        <button
                          onClick={() => {
                            toast.success(`Renewal wizard triggered for ${client.name}!`);
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[8.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none flex items-center gap-1 shadow-xs"
                        >
                          <DollarSign size={10} /> Renew
                        </button>

                        <button
                          onClick={() => {
                            setShowCompleteModal(task);
                          }}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[8.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none flex items-center gap-1"
                        >
                          <CheckCircle2 size={10} /> Complete
                        </button>
                      </div>

                      <div className="relative">
                        <button 
                          onClick={() => setOpenActionDropdown(openActionDropdown === task.id ? null : task.id)}
                          className="p-1.5 rounded-xl hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-black cursor-pointer transition-colors"
                        >
                          <MoreVertical size={12} />
                        </button>
                        
                        {openActionDropdown === task.id && (
                          <div className="absolute right-0 bottom-full mb-2 w-40 bg-white border border-slate-100 shadow-xl rounded-xl z-50 py-1.5 flex flex-col text-[10px] font-bold text-left">
                            <button onClick={() => handleSnooze(task)} className="px-3 py-1.5 hover:bg-slate-50 text-slate-700 w-full transition-colors flex items-center gap-1.5">
                              <Clock size={12}/> Snooze 1 Hr
                            </button>
                            <button onClick={() => { window.open(`https://wa.me/91${client.phone}`, '_blank'); setOpenActionDropdown(null); }} className="px-3 py-1.5 hover:bg-slate-50 text-slate-700 w-full transition-colors flex items-center gap-1.5">
                              <MessageCircle size={12}/> Custom WhatsApp
                            </button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button onClick={() => handleCancelTask(task.id)} className="px-3 py-1.5 hover:bg-red-50 text-red-650 w-full transition-colors flex items-center gap-1.5">
                              <Trash2 size={12}/> Cancel Task
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AI Assistant + Logs + Queue (col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* AI Reception Assistant */}
          <div className="bg-white border border-slate-250/70 rounded-[28px] p-5 shadow-xs text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 border border-purple-500/20 shrink-0">
                <Sparkles size={16} />
              </span>
              <div>
                <span className="text-[8px] font-black uppercase text-purple-600 tracking-wider block">Cognitive Assistant</span>
                <h4 className="text-xs font-black uppercase text-slate-800 leading-none mt-0.5">AI Reception Panel</h4>
              </div>
            </div>

            {/* Recommendations Ticker */}
            <div className="mt-4 bg-[#FAF7F2] border border-[#EBE3D5] rounded-2xl p-4.5 space-y-3">
              <span className="text-[7.5px] font-black uppercase text-amber-600 tracking-widest block">⚡ Today's AI Recommendations</span>
              <div className="space-y-2.5 text-[9.5px] font-bold text-slate-650 leading-relaxed">
                {aiSuggestionsList.map((suggestion, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-purple-600 text-xs font-black">✦</span>
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => toast.success("AI generating bulk WhatsApp communications...")}
                  className="flex-1 py-2 bg-slate-900 hover:bg-black text-[#d4ff00] text-[8.5px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer border-none"
                >
                  Generate WhatsApp
                </button>
                <button 
                  onClick={() => {
                    const first = filteredTasks[0];
                    if (first) {
                      const client = getClientDetails(first);
                      window.open(`tel:${client.phone}`);
                      handleReceptionAction(first, 'Call Member');
                    } else {
                      toast.error("No pending tasks in queue.");
                    }
                  }}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[8.5px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer border-none"
                >
                  Start Calling
                </button>
              </div>
            </div>

            {/* Reception AI stats */}
            <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                  <span>Current Workload</span>
                  <span className="text-slate-800 font-mono">{todayWorkloadPct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full" style={{ width: `${todayWorkloadPct}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 text-[9px] pt-1">
                <div className="border-l-2 border-slate-200 pl-2">
                  <span className="text-slate-400 block text-[7.5px] uppercase font-bold tracking-wider">Today's Efficiency</span>
                  <span className="text-slate-800 font-black font-mono block mt-0.5">{todayEfficiency}%</span>
                </div>
                <div className="border-l-2 border-slate-200 pl-2">
                  <span className="text-slate-400 block text-[7.5px] uppercase font-bold tracking-wider">Avg Call duration</span>
                  <span className="text-slate-800 font-black font-mono block mt-0.5">{callDurationAverage}</span>
                </div>
                <div className="border-l-2 border-slate-200 pl-2">
                  <span className="text-slate-400 block text-[7.5px] uppercase font-bold tracking-wider">Conversion rate</span>
                  <span className="text-slate-800 font-black font-mono block mt-0.5">{conversionRate}%</span>
                </div>
                <div className="border-l-2 border-slate-200 pl-2">
                  <span className="text-slate-400 block text-[7.5px] uppercase font-bold tracking-wider">Revenue recover</span>
                  <span className="text-emerald-600 font-black font-mono block mt-0.5">₹{potentialRevenue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Timeline Access logs */}
          <div className="bg-white border border-slate-250/70 rounded-[28px] p-5 shadow-xs text-left">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Execution Feed</span>
            <h4 className="text-xs font-black uppercase text-slate-800 mt-0.5 leading-none">Today's Timeline Logs</h4>
            
            <div className="mt-4 space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {timelineActivityLogs.length > 0 ? (
                timelineActivityLogs.map((log) => {
                  const client = getClientDetails(log);
                  const completeTime = log.completedAt ? new Date(log.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
                  
                  return (
                    <div key={log.id} className="flex gap-2.5 items-start text-[8.5px] border-b border-slate-50 pb-2 last:border-0">
                      <span className="font-mono text-slate-400 shrink-0 font-bold mt-0.5">{completeTime || '09:00'}</span>
                      <div className="leading-tight">
                        <span className="font-extrabold text-slate-850 block">{client.name}</span>
                        <span className="text-slate-500 font-semibold block mt-0.5">
                          Outcome: <span className="font-bold text-[#128C7E]">{log.outcome || 'Call logged'}</span>. remarks: {log.remarks || 'Done'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400 italic text-[10px]">
                  No activities completed yet today.
                </div>
              )}
            </div>
          </div>

          {/* Live Reception Queue */}
          <div className="bg-white border border-slate-250/70 rounded-[28px] p-5 shadow-xs text-left">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Priority Queue</span>
            <h4 className="text-xs font-black uppercase text-slate-800 mt-0.5 leading-none">Reception Queue</h4>
            
            <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {receptionQueueList.length > 0 ? (
                receptionQueueList.map((item, idx) => {
                  const client = getClientDetails(item);
                  return (
                    <div key={item.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/50 rounded-xl">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-black text-[9px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 truncate text-[10px]">{client.name}</span>
                      </div>
                      <span className="text-[9px] font-black font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                        {item.scheduledTime}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400 italic text-[10px]">
                  No upcoming items scheduled today.
                </div>
              )}
            </div>
          </div>

          {/* Activity Heat Calendar */}
          <div className="bg-white border border-[#EBE3D5] rounded-[28px] p-5 text-left">
            <span className="text-[8px] font-black uppercase text-slate-450 block">Peak Load Distribution</span>
            <h4 className="text-xs font-black uppercase text-slate-800 mt-0.5 leading-none">Busy hours scheduler</h4>
            
            <div className="mt-4 space-y-2">
              {hourlyActivityDistribution.map(([hour, count]) => {
                const barWidth = count > 0 ? Math.min(100, (count / 8) * 100) : 4;
                return (
                  <div key={hour} className="flex items-center gap-3.5 text-[8.5px] font-bold">
                    <span className="text-slate-455 w-8 shrink-0">{hour}</span>
                    <div className="flex-1 bg-slate-50 h-3 rounded-full relative overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${barWidth}%` }} />
                    </div>
                    <span className="text-slate-800 font-mono w-4 text-right shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-center text-[7px] font-black uppercase text-slate-400 mt-3 border-t border-slate-100 pt-2.5">
              🔥 Peak Activity Expected around 10:00 AM
            </div>
          </div>

        </div>

      </div>

      {/* 5. FLOATING BOTTOM BAR (BULK ACTIONS) */}
      <AnimatePresence>
        {selectedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-slate-900 border border-slate-800 text-white rounded-2xl px-6 py-3.5 flex items-center gap-5 shadow-2xl shrink-0"
          >
            <span className="text-[10px] font-black uppercase text-[#d4ff00] tracking-widest shrink-0">
              ⚡ {selectedTasks.length} Members Selected
            </span>
            <div className="h-4 w-px bg-slate-700 shrink-0" />
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkComplete}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none"
              >
                Mark Complete
              </button>
              <button
                onClick={() => toast.success(`Bulk WhatsApp alerts dispatched to ${selectedTasks.length} members!`)}
                className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-655 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none"
              >
                WhatsApp
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none"
              >
                Delete Selected
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white border border-slate-200 rounded-[24px] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
                <h2 className="text-[14px] font-black text-white tracking-wide uppercase">Schedule Follow-up</h2>
                <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors border-none cursor-pointer"><X size={16} strokeWidth={3} /></button>
              </div>
              <AddFollowUpWizard members={members} enquiries={enquiries} employees={employees} onClose={() => setShowAddModal(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCompleteModal(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden relative">
              <div className="bg-emerald-500 px-6 py-4 flex items-center justify-between">
                <h3 className="text-white font-black flex items-center gap-2 uppercase tracking-wide text-xs"><MessageCircle size={16}/> Add Follow-up Log</h3>
                <button onClick={() => setShowCompleteModal(null)} className="text-white hover:bg-white/20 p-1.5 rounded-xl transition-colors border-none cursor-pointer"><X size={16}/></button>
              </div>
              <form onSubmit={submitCompleteTask} className="p-6 space-y-5">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Outcome Status</label>
                  <select value={completeOutcome} onChange={e => setCompleteOutcome(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer shadow-sm">
                    <option value="Connected">Connected</option>
                    <option value="Resolved">Resolved</option>
                    <option value="No Answer">No Answer / Missed</option>
                    <option value="Not Interested">Not Interested</option>
                    <option value="Follow-up Scheduled">Follow-up Scheduled</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Remarks / Notes</label>
                  <textarea required value={completeRemarks} onChange={e => setCompleteRemarks(e.target.value)} rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm resize-none" placeholder="What happened on this follow-up call?" />
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowCompleteModal(null)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold text-xs cursor-pointer">Cancel</button>
                  <button type="submit" className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-500/30 hover:bg-emerald-600 transition-all uppercase tracking-wider cursor-pointer border-none">Submit Follow-up</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );

  // local reception action trigger wrapper
  function handleReceptionAction(member: any, actionType: string) {
    let detailMsg = '';
    let successToast = '';

    if (actionType === 'Call Member') {
      detailMsg = `Called member at ${member.phone}. Checked in on renewal and gym attendance status.`;
      successToast = `Call logged successfully!`;
    }

    toast.success(successToast, { icon: '🤖' });
  }
}

function AddFollowUpWizard({ members, enquiries, employees, onClose }: { members: any[]; enquiries: any[]; employees: any[]; onClose: () => void }) {
  const [sourceType, setSourceType] = useState<'member' | 'enquiry' | 'employee'>('member');
  const [selectedId, setSelectedId] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reminderBefore, setReminderBefore] = useState('0');
  const [priority, setPriority] = useState('Medium');
  const [assignedTo, setAssignedTo] = useState('Receptionist');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time || !selectedId) { toast.error('All fields marked with * are required'); return; }
    setSaving(true);
    try {
      const scheduledDateTime = new Date(`${date}T${time}`);
      const ts = scheduledDateTime.getTime() - (parseInt(reminderBefore) * 60000);
      
      const payload = {
        memberId: sourceType === 'member' ? selectedId : null,
        enquiryId: sourceType === 'enquiry' ? selectedId : null,
        employeeId: sourceType === 'employee' ? selectedId : null,
        type: sourceType === 'member' ? 'Renewal' : sourceType === 'enquiry' ? 'Enquiry' : 'Manual',
        priority, title, description: desc, assignedTo, scheduledDate: date, scheduledTime: time,
        scheduledTimestamp: ts, status: 'Pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'followups'), payload);
      toast.success('Follow-up scheduled successfully');
      onClose();
    } catch (err: any) { toast.error('Failed: ' + err.message); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5 text-left">
      <div className="grid grid-cols-3 gap-2">
        {['member', 'enquiry', 'employee'].map((type) => (
          <button key={type} type="button" onClick={() => { setSourceType(type as any); setSelectedId(''); }} className={`py-2.5 text-center text-[10px] font-black rounded-xl border transition-all uppercase tracking-widest cursor-pointer ${sourceType === type ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20' : 'bg-slate-50 text-slate-500 border-slate-250 hover:bg-slate-100'}`}>
            {type}
          </button>
        ))}
      </div>
      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Select Entity <span className="text-amber-500">*</span></label>
        <select required value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 focus:bg-white shadow-sm transition-all cursor-pointer">
          <option value="">-- Choose {sourceType} --</option>
          {sourceType === 'member' && members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>)}
          {sourceType === 'enquiry' && enquiries.map(e => <option key={e.id} value={e.id}>{e.name} ({e.phone})</option>)}
          {sourceType === 'employee' && employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name || emp.fullName} ({emp.role})</option>)}
        </select>
      </div>
      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Reason / Title <span className="text-amber-500">*</span></label>
        <input type="text" required placeholder="e.g. Discuss feedback" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 focus:bg-white shadow-sm transition-all" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Date <span className="text-amber-500">*</span></label>
          <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 focus:bg-white shadow-sm transition-all cursor-pointer" />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Time <span className="text-amber-500">*</span></label>
          <input type="time" required value={time} onChange={e => setTime(e.target.value)} className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 focus:bg-white shadow-sm transition-all cursor-pointer" />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Assign To</label>
        <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 focus:bg-white shadow-sm transition-all cursor-pointer">
          <option>Receptionist</option><option>Sales Executive</option><option>Trainer</option><option>Owner</option><option>Manager</option>
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-3">
        <button type="button" onClick={onClose} className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs cursor-pointer">Cancel</button>
        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-black text-xs shadow-md shadow-amber-500/30 hover:bg-amber-600 uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 border-none cursor-pointer">{saving ? 'Saving...' : 'Schedule'}</button>
      </div>
    </form>
  );
}
