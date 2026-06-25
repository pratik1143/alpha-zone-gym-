'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Phone, MessageSquare, AlertTriangle, Send, Bell, Calendar, UserX } from 'lucide-react';
import { useGymStore } from '@/store';
import { formatDate, getInitials, getRandomColor } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function InconsistentPage() {
  const { members, attendance, fetchMembers, fetchAttendance } = useGymStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'leave' | 'inconsistent'>('all');
  const [nudging, setNudging] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
    fetchAttendance();
  }, [fetchMembers, fetchAttendance]);

  // Compute days absent for each member
  const getMemberAbsenceData = (member: any) => {
    // Find all check-ins for this member
    const memberLogs = attendance.filter(a => a.memberId === member.id || a.memberId === member.uid);
    
    let lastActiveDate: Date | null = null;
    if (memberLogs.length > 0) {
      // Find latest checkin date
      const timestamps = memberLogs.map(log => new Date(log.checkIn).getTime());
      lastActiveDate = new Date(Math.max(...timestamps));
    }

    const today = new Date();
    let daysAbsent = 0;
    
    if (lastActiveDate) {
      const diffTime = today.getTime() - lastActiveDate.getTime();
      daysAbsent = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } else {
      // If never checked in, calculate since joinDate
      const join = new Date(member.joinDate || today);
      const diffTime = today.getTime() - join.getTime();
      daysAbsent = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      lastActiveDate,
      daysAbsent: Math.max(0, daysAbsent)
    };
  };

  const membersWithAbsence = members.map(m => {
    const { lastActiveDate, daysAbsent } = getMemberAbsenceData(m);
    return {
      ...m,
      lastActiveDate,
      daysAbsent
    };
  });

  // Filter: absent for >= 4 days, active members only
  const filteredList = membersWithAbsence.filter(m => {
    if (m.status !== 'active') return false; // only active membership holders
    if (m.daysAbsent < 4) return false;      // must be absent for at least 4 days

    const matchesSearch = m.name?.toLowerCase().includes(search.toLowerCase()) || 
                          m.phone?.includes(search) || 
                          m.memberId?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'leave') {
      // 4-9 days absent
      return m.daysAbsent >= 4 && m.daysAbsent <= 9;
    }
    if (activeTab === 'inconsistent') {
      // 10+ days absent
      return m.daysAbsent >= 10;
    }
    return true;
  });

  // Sort by days absent (longest absent first)
  const sortedMembers = [...filteredList].sort((a, b) => b.daysAbsent - a.daysAbsent);

  const handleSendNudge = (member: any) => {
    setNudging(member.id);
    setTimeout(() => {
      toast.success(`Motivation nudge notification pushed to ${member.name}'s mobile client!`);
      setNudging(null);
    }, 800);
  };

  const getWhatsAppLink = (m: any) => {
    const message = `Hi ${m.name}, we missed you at Alpha Gym! We noticed you haven't checked in for ${m.daysAbsent} days. Is everything okay? We hope to see you back on the gym floor soon to smash your workouts! 💪`;
    return `https://wa.me/91${m.phone}?text=${encodeURIComponent(message)}`;
  };

  const leaveCount = membersWithAbsence.filter(m => m.status === 'active' && m.daysAbsent >= 4 && m.daysAbsent <= 9).length;
  const inconsistentCount = membersWithAbsence.filter(m => m.status === 'active' && m.daysAbsent >= 10).length;
  const totalCount = leaveCount + inconsistentCount;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-brand-border/60 pb-5">
        <h1 className="text-3xl font-black text-brand-text-primary tracking-tight font-display">Inconsistent Attendance</h1>
        <p className="text-xs text-brand-text-secondary mt-0.5">
          Follow up with active members who have not checked in for 4+ days or are absent for 10-20 days.
        </p>
      </div>

      {/* Roster Filters */}
      <div className="flex gap-2">
        {(['all', 'leave', 'inconsistent'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold capitalize transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-brand-cyan text-slate-950 shadow-lg shadow-brand-cyan/10 font-extrabold'
                : 'bg-brand-bg-card border border-brand-border text-brand-text-secondary hover:text-brand-text-primary'
            }`}
          >
            {tab === 'all' ? `All Inactive (${totalCount})` : tab === 'leave' ? `On Leave / Chitti (4-9d) (${leaveCount})` : `Inconsistent (10d+) (${inconsistentCount})`}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, or member ID..."
          className="glass-input pl-9 py-2.5 text-xs"
        />
      </div>

      {/* Table Container */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="cyber-table">
            <thead>
              <tr>
                <th>Member Info</th>
                <th>Last Checked-In</th>
                <th>Days Absent</th>
                <th>Active Streak</th>
                <th>Category</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((m, i) => {
                const isHighlyInconsistent = m.daysAbsent >= 10;
                
                return (
                  <motion.tr 
                    key={m.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                      {(() => {
                        const avatarColor = getRandomColor(m.name);
                        return (
                          <div 
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm"
                            style={{ 
                              background: `linear-gradient(135deg, ${avatarColor}18 0%, ${avatarColor}30 100%)`, 
                              color: avatarColor, 
                              border: `1.5px solid ${avatarColor}25` 
                            }}
                          >
                            {getInitials(m.name)}
                          </div>
                        );
                      })()}
                        <div>
                          <div className="font-bold text-xs text-brand-text-primary">{m.name}</div>
                          <div className="text-[10px] text-brand-text-secondary">{m.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs">
                      {m.lastActiveDate ? (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          {formatDate(m.lastActiveDate.toISOString())}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Never checked in</span>
                      )}
                    </td>
                    <td>
                      <span className={`font-mono font-bold text-xs ${isHighlyInconsistent ? 'text-red-500' : 'text-[#F59E0B]'}`}>
                        {m.daysAbsent} days absent
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold">
                        {m.streak || 0} days 🔥
                      </span>
                    </td>
                    <td>
                      <span className={isHighlyInconsistent ? 'badge-red' : 'badge-yellow'} style={{ fontSize: '0.65rem' }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: isHighlyInconsistent ? '#EF4444' : '#F59E0B' }} />
                        {isHighlyInconsistent ? 'Inconsistent (10d+)' : 'Absent (4-9d)'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <a 
                          href={`tel:${m.phone}`}
                          className="px-2.5 py-1.5 rounded-lg border border-brand-border bg-slate-50 text-brand-text-secondary hover:bg-slate-100 hover:text-black transition-all text-xxs font-bold"
                        >
                          <Phone size={11} className="inline mr-1" /> Call
                        </a>
                        <a 
                          href={getWhatsAppLink(m)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg border border-brand-border bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all text-xxs font-bold"
                        >
                          <MessageSquare size={11} className="inline mr-1" /> WhatsApp
                        </a>
                        <button
                          onClick={() => handleSendNudge(m)}
                          disabled={nudging === m.id}
                          className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all text-xxs font-bold flex items-center gap-1 disabled:opacity-40"
                        >
                          <Bell size={11} />
                          {nudging === m.id ? 'Nudging...' : 'Send Nudge'}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}

              {sortedMembers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-brand-text-muted italic">
                    No members are currently absent or inconsistent.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
