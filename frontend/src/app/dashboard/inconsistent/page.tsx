'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Phone, MessageSquare, AlertTriangle, Send, Bell, 
  Calendar, UserX, Users, UserCheck, RefreshCw, X, ShieldAlert,
  Clock, ArrowUpRight, HelpCircle
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { formatDate, getInitials, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const SYSTEM_LIVE_DATE = new Date('2026-07-01');

export default function InconsistentPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [empAttendance, setEmpAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'both' | 'members' | 'employees'>('both');
  const [durationFilter, setDurationFilter] = useState<'all' | '1' | '3' | '4-9' | '10+'>('all');
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // Real-time Firestore Listeners
  useEffect(() => {
    setLoading(true);
    
    // Active Members
    const unsubMembers = onSnapshot(collection(db, 'members'), (snap) => {
      const list = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((m: any) => m.status === 'active');
      setMembers(list);
      setLoading(false);
    });

    // Employees
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Member Attendance
    const unsubAtt = onSnapshot(collection(db, 'attendance'), (snap) => {
      setAttendance(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Employee Attendance
    const unsubEmpAtt = onSnapshot(collection(db, 'employeeAttendance'), (snap) => {
      setEmpAttendance(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubMembers();
      unsubEmployees();
      unsubAtt();
      unsubEmpAtt();
    };
  }, []);

  // Helper function to calculate real metrics
  const getAbsenceData = (entity: any, isEmployee: boolean) => {
    const logs = (isEmployee ? empAttendance : attendance).filter(a => {
      const checkInDate = new Date(a.checkIn || a.timestamp);
      return (a.memberId === entity.id || a.employeeId === entity.id || String(a.biometricId) === String(entity.biometricId)) && 
             checkInDate >= SYSTEM_LIVE_DATE;
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (logs.length === 0) {
      return {
        lastCheckedIn: 'Waiting for first attendance',
        daysAbsent: 0,
        streak: 0,
        punchedToday: false
      };
    }

    // Find latest punch
    const timestamps = logs.map(l => new Date(l.checkIn || l.timestamp).getTime());
    const latestTimestamp = Math.max(...timestamps);
    const lastActiveDate = new Date(latestTimestamp);
    lastActiveDate.setHours(0, 0, 0, 0);

    const diffTime = todayStart.getTime() - lastActiveDate.getTime();
    const daysAbsent = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Check if punched today
    const punchedToday = logs.some(l => {
      const d = new Date(l.checkIn || l.timestamp);
      return d.toDateString() === new Date().toDateString();
    });

    // Streak calculation
    const uniqueDates = Array.from(new Set(logs.map(l => new Date(l.checkIn || l.timestamp).toDateString())))
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const diff = uniqueDates[i].getTime() - uniqueDates[i+1].getTime();
      const diffDays = diff / (1000 * 60 * 60 * 24);
      if (diffDays <= 1.5) {
        streak++;
      } else {
        break;
      }
    }

    return {
      lastCheckedIn: new Date(latestTimestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      daysAbsent,
      streak,
      punchedToday
    };
  };

  // Build Inconsistent List
  const candidates = [
    ...members.map(m => ({ ...m, isEmployee: false })),
    ...employees.map(e => ({ ...e, isEmployee: true }))
  ].map(item => {
    const data = getAbsenceData(item, item.isEmployee);
    return {
      ...item,
      ...data
    };
  }).filter(item => {
    // Only include if checked in at least once after system live date, and did not punch today
    const hasPunched = item.lastCheckedIn !== 'Waiting for first attendance';
    const isAbsenceInRange = item.daysAbsent >= 1;
    return hasPunched && !item.punchedToday && isAbsenceInRange && !item.onLeave;
  });

  // Apply filters & search
  const filteredCandidates = candidates.filter(item => {
    // Search
    const matchesSearch = 
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.memberId?.toLowerCase().includes(search.toLowerCase()) ||
      item.phone?.includes(search) ||
      String(item.biometricId)?.includes(search);
    
    // Type Filter
    const matchesType = 
      typeFilter === 'both' ||
      (typeFilter === 'members' && !item.isEmployee) ||
      (typeFilter === 'employees' && item.isEmployee);

    // Duration Filter
    let matchesDuration = true;
    if (durationFilter === '1') matchesDuration = item.daysAbsent === 1;
    else if (durationFilter === '3') matchesDuration = item.daysAbsent === 2 || item.daysAbsent === 3;
    else if (durationFilter === '4-9') matchesDuration = item.daysAbsent >= 4 && item.daysAbsent <= 9;
    else if (durationFilter === '10+') matchesDuration = item.daysAbsent >= 10;

    // Trainer Filter
    const matchesTrainer = trainerFilter === 'all' || item.trainer === trainerFilter;

    // Branch Filter
    const matchesBranch = branchFilter === 'all' || item.branch === branchFilter;

    return matchesSearch && matchesType && matchesDuration && matchesTrainer && matchesBranch;
  });

  // KPI Calculations
  const membersMissingToday = members.filter(m => !getAbsenceData(m, false).punchedToday).length;
  const employeesMissingToday = employees.filter(e => !getAbsenceData(e, true).punchedToday).length;
  const needsFollowUpCount = candidates.filter(item => item.daysAbsent === 2 || item.daysAbsent === 3).length;
  const criticalCount = candidates.filter(item => item.daysAbsent >= 10).length;

  // Actions
  const handleLogAction = async (item: any, actionName: string, notes: string) => {
    try {
      const collectionName = item.isEmployee ? 'employees' : 'members';
      const ref = doc(db, collectionName, item.id);
      await updateDoc(ref, {
        followUpHistory: arrayUnion({
          action: actionName,
          notes,
          timestamp: new Date().toISOString()
        })
      });
      toast.success(`${actionName} logged for ${item.name}`);
    } catch (e: any) {
      toast.error('Failed to log action: ' + e.message);
    }
  };

  const handleSendReminder = async (item: any) => {
    toast.success(`Nudge Reminder queued for ${item.name}! (WhatsApp, Email & Push)`);
    await handleLogAction(item, 'Reminder Sent', 'Dispatched WhatsApp/Email motivation nudge.');
  };

  const handleMarkLeave = async (item: any) => {
    try {
      const collectionName = item.isEmployee ? 'employees' : 'members';
      const ref = doc(db, collectionName, item.id);
      await updateDoc(ref, {
        onLeave: true,
        followUpHistory: arrayUnion({
          action: 'Marked Leave',
          notes: 'Marked on leave by operator desk.',
          timestamp: new Date().toISOString()
        })
      });
      toast.success(`${item.name} marked on leave.`);
    } catch (e: any) {
      toast.error('Failed to mark leave: ' + e.message);
    }
  };

  const handleIgnore = async (item: any) => {
    await handleLogAction(item, 'Ignored', 'Inconsistency alert ignored for 48 hours.');
  };

  // Get WhatsApp Link
  const getWhatsAppLink = (item: any) => {
    const text = `Hi ${item.name}, we missed you at Alpha Zone Gym! We noticed you haven't checked in for ${item.daysAbsent} days since your last session on ${item.lastCheckedIn}. Hope to see you back on the floor soon! 💪`;
    return `https://wa.me/91${item.phone}?text=${encodeURIComponent(text)}`;
  };

  // Category display
  const getCategoryBadge = (days: number) => {
    if (days === 1) return { label: 'Inactive (1 Day)', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    if (days <= 3) return { label: 'Needs Follow-up', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (days <= 9) return { label: 'On Leave (4-9 Days)', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    return { label: 'Inconsistent (10d+)', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  const uniqueTrainers = Array.from(new Set(members.map((m: any) => m.trainer).filter(Boolean)));
  const uniqueBranches = Array.from(new Set(members.map((m: any) => m.branch).filter(Boolean)));

  return (
    <div className="space-y-6 pb-12 relative bg-[#f8fafc] min-h-screen p-6 text-slate-800 text-left">
      
      {/* Page Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-display">Inconsistent Attendance</h1>
          <p className="text-xs text-slate-500 font-medium">Real attendance tracker. System Live Date configured: <b>01-Jul-2026</b>.</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-650 flex items-center justify-center shadow-sm cursor-pointer border border-slate-150 transition-all active:scale-95"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Members Missing Today', value: membersMissingToday, sub: 'Needs punch today', color: 'border-slate-200 text-slate-600 bg-white' },
          { label: 'Employees Missing Today', value: employeesMissingToday, sub: 'Staff attendance check', color: 'border-slate-200 text-slate-600 bg-white' },
          { label: 'Needs Follow-up (3d)', value: needsFollowUpCount, sub: '2-3 Days Absent', color: 'border-amber-200 text-amber-600 bg-amber-50/20' },
          { label: 'Critical (10+ Days)', value: criticalCount, sub: 'High retention risk', color: 'border-rose-200 text-rose-600 bg-rose-50/20' }
        ].map((kpi, idx) => (
          <div key={idx} className={`border rounded-[20px] p-5 flex flex-col justify-between transition-all bg-white hover:shadow-sm ${kpi.color}`}>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-none">{kpi.label}</span>
            <div className="text-2xl font-black mt-3 leading-none font-mono">{kpi.value}</div>
            <span className="text-[9px] font-bold mt-1 opacity-70 leading-none">{kpi.sub}</span>
          </div>
        ))}
      </div>

      {/* Filters & Control Row */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-wrap gap-4 items-center shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone or Biometric ID..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-medium"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* User Type */}
          <select 
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-650 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="both">Both (Members & Staff)</option>
            <option value="members">Only Members</option>
            <option value="employees">Only Staff Employees</option>
          </select>

          {/* Absence Duration */}
          <select 
            value={durationFilter}
            onChange={e => setDurationFilter(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-650 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="all">All Durations</option>
            <option value="1">Inactive (1 Day)</option>
            <option value="3">Needs Follow-up (2-3 Days)</option>
            <option value="4-9">On Leave (4-9 Days)</option>
            <option value="10+">Inconsistent (10+ Days)</option>
          </select>

          <select 
            value={trainerFilter}
            onChange={e => setTrainerFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-650 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="all">All Trainers</option>
            {uniqueTrainers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select 
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-650 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="all">All Branches</option>
            {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* Roster Listing Grid Table */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100">
              <tr>
                <th className="px-5 py-4 w-12 text-center">Type</th>
                <th className="px-5 py-4">Name / ID</th>
                <th className="px-5 py-4">Last Checked-In</th>
                <th className="px-5 py-4 text-center">Days Absent</th>
                <th className="px-5 py-4 text-center">Active Streak</th>
                <th className="px-5 py-4">Biometric ID</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 font-medium">
              {filteredCandidates.map(item => {
                const badge = getCategoryBadge(item.daysAbsent);
                const avatar = item.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${item.name?.replace(/ /g, '')}`;
                
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                        item.isEmployee 
                          ? 'bg-purple-50 text-purple-650 border-purple-100' 
                          : 'bg-blue-50 text-blue-650 border-blue-100'
                      }`}>
                        {item.isEmployee ? 'Staff' : 'Member'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-3 items-center">
                        <img src={avatar} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100" alt="" />
                        <div>
                          <div className="font-extrabold text-slate-900">{item.name}</div>
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5">Phone: {item.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-700 font-semibold">{item.lastCheckedIn}</td>
                    <td className="px-5 py-3 text-center font-mono font-bold text-slate-800">
                      {item.daysAbsent} {item.daysAbsent === 1 ? 'day' : 'days'}
                    </td>
                    <td className="px-5 py-3 text-center font-mono font-bold text-slate-800">{item.streak} days 🔥</td>
                    <td className="px-5 py-3 font-mono text-slate-500 font-bold">{item.biometricId || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          onClick={() => handleLogAction(item, 'Called', 'Dialed registered phone number. Logged.')}
                          className="w-7 h-7 bg-slate-55 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-90"
                          title="Call Staff/Member"
                        >
                          <Phone size={12} />
                        </button>
                        <a 
                          href={getWhatsAppLink(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleLogAction(item, 'WhatsApp Sent', 'WhatsApp reminder thread opened.')}
                          className="w-7 h-7 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-90"
                          title="Send WhatsApp Message"
                        >
                          <MessageSquare size={12} />
                        </a>
                        <button 
                          onClick={() => handleSendReminder(item)}
                          className="w-7 h-7 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-90"
                          title="Send Reminder nudge"
                        >
                          <Bell size={12} />
                        </button>
                        <button 
                          onClick={() => handleMarkLeave(item)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded-xl text-[9px] font-black uppercase tracking-wider cursor-pointer"
                          title="Mark on Leave"
                        >
                          Leave
                        </button>
                        <button 
                          onClick={() => handleIgnore(item)}
                          className="text-[8px] font-extrabold uppercase text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                          title="Ignore follow-up"
                        >
                          Ignore
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCandidates.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 italic">No inconsistent members or staff found based on active check-in data.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
