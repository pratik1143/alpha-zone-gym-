'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Calendar, CreditCard, Dumbbell, ShieldCheck, CheckCircle2,
  Clock, MapPin, Zap, User, ArrowUpRight, Filter, Fingerprint, Sparkles, AlertCircle
} from 'lucide-react';
import { useGymStore } from '@/store';
import { formatDate, formatTime, cleanPlanName, parsePlanSegments } from '@/lib/utils';

export default function ActivityTimelineTab({ member }: { member: any }) {
  const { attendance, payments } = useGymStore();
  const [filter, setFilter] = useState<'all' | 'memberships' | 'payments' | 'attendance'>('all');

  // Build combined timeline of events chronologically
  const timelineEvents = useMemo(() => {
    if (!member) return [];

    const events: any[] = [];

    // 1. Membership Events (from member.membershipHistory or parsePlanSegments or member.timeline)
    if (member.membershipHistory && member.membershipHistory.length > 0) {
      member.membershipHistory.forEach((h: any, idx: number) => {
        const cleanName = cleanPlanName(h.packageName);
        events.push({
          id: `mem_hist_${idx}`,
          category: 'memberships',
          type: idx === 0 ? 'Initial Join' : 'Membership Renewal',
          title: cleanName,
          date: h.startDate || member.joinDate || '2026-01-01',
          time: '10:00 AM',
          amount: h.amount ? `₹${Number(h.amount).toLocaleString('en-IN')}` : null,
          invoice: h.invoiceNumber || `INV-00${idx + 1}`,
          status: h.status || 'Active',
          description: `Plan: ${cleanName} • Valid till ${h.expiryDate || 'Active'}`,
          icon: ShieldCheck,
          color: 'bg-indigo-500 text-white',
          badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        });
      });
    } else if (member.plan) {
      const segments = parsePlanSegments(member.plan);
      segments.forEach((seg: string, idx: number) => {
        events.push({
          id: `mem_seg_${idx}`,
          category: 'memberships',
          type: idx === 0 ? 'Initial Plan' : 'Plan Extension',
          title: seg,
          date: member.joinDate || '2026-01-01',
          time: '10:00 AM',
          amount: member.amount ? `₹${Number(member.amount).toLocaleString('en-IN')}` : null,
          invoice: member.invoiceNumber || `LEG-00000${idx + 1}`,
          status: idx === segments.length - 1 ? 'Active' : 'Completed',
          description: `Package: ${seg}`,
          icon: ShieldCheck,
          color: 'bg-indigo-500 text-white',
          badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        });
      });
    }

    // Custom Member Timeline Events
    if (member.timeline && Array.isArray(member.timeline)) {
      member.timeline.forEach((t: any, idx: number) => {
        events.push({
          id: `custom_t_${idx}`,
          category: 'memberships',
          type: t.type || t.event || 'Activity Event',
          title: t.details || t.description || 'Member Event Recorded',
          date: t.date || member.joinDate || '2026-01-01',
          time: '12:00 PM',
          status: 'Recorded',
          description: t.details || t.description,
          icon: Sparkles,
          color: 'bg-blue-500 text-white',
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        });
      });
    }

    // 2. Payments & Invoices Events
    const memberPayments = (payments || []).filter(
      (p: any) => p.memberId === member.id || p.memberId === member.memberId || p.memberName === member.name
    );
    memberPayments.forEach((p: any, idx: number) => {
      events.push({
        id: `pay_${p.id || idx}`,
        category: 'payments',
        type: 'Payment Received',
        title: `Payment for ${cleanPlanName(p.plan || member.plan)}`,
        date: p.date || p.createdAt?.split('T')[0] || member.joinDate || '2026-01-01',
        time: p.createdAt ? formatTime(p.createdAt) : '02:30 PM',
        amount: `₹${Number(p.amount || 0).toLocaleString('en-IN')}`,
        invoice: p.invoiceNumber || p.invoice || `INV-${idx + 100}`,
        status: p.status === 'paid' ? 'Paid' : 'Pending',
        description: `Method: ${p.method || p.paymentMode || 'UPI'} • Verified`,
        icon: CreditCard,
        color: 'bg-emerald-500 text-white',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      });
    });

    // 3. Attendance Check-ins
    const memberAttendance = (attendance || []).filter(
      (a: any) => a.memberId === member.id || a.memberId === member.memberId || a.memberName === member.name
    );
    memberAttendance.forEach((a: any, idx: number) => {
      events.push({
        id: `att_${a.id || idx}`,
        category: 'attendance',
        type: 'Gym Gate Punch',
        title: `Gate Access: ${a.doorName || 'Main Entrance Gate'}`,
        date: a.checkIn?.split('T')[0] || new Date().toISOString().split('T')[0],
        time: a.checkIn ? formatTime(a.checkIn) : '07:30 AM',
        status: 'Granted',
        description: `Device: ${a.deviceId || 'k90-main-gate'} • Access Granted`,
        icon: Zap,
        color: 'bg-amber-500 text-white',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-100',
      });
    });

    // 4. Joined & Biometric Setup Event
    events.push({
      id: 'join_evt',
      category: 'memberships',
      type: 'Account Created',
      title: `Joined Alpha Zone Gym OS`,
      date: member.joinDate || '2026-01-01',
      time: '09:00 AM',
      status: 'Completed',
      description: `Registered at branch ${member.branch || 'Mohali, Punjab'}`,
      icon: User,
      color: 'bg-slate-700 text-white',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
    });

    // Sort chronologically desc
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [member, payments, attendance]);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return timelineEvents;
    return timelineEvents.filter((e) => e.category === filter);
  }, [timelineEvents, filter]);

  return (
    <div className="bg-white rounded-[32px] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-slate-100 p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Activity size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Activity Timeline & Logs</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete audit log of memberships, renewals, payments, gate check-ins, and activity history.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl shrink-0">
          {(['all', 'memberships', 'payments', 'attendance'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize ${
                filter === cat
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredEvents.length > 0 ? (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {filteredEvents.map((evt, idx) => {
            const Icon = evt.icon;
            return (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className="relative group"
              >
                {/* Node Dot Icon */}
                <div className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full ${evt.color} flex items-center justify-center shadow-md ring-4 ring-white`}>
                  <Icon size={13} />
                </div>

                {/* Timeline Card */}
                <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl p-4 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900">{evt.type}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${evt.badgeBg}`}>
                        {evt.status}
                      </span>
                      {evt.invoice && (
                        <span className="text-[10px] font-mono font-bold bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                          {evt.invoice}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                      <Calendar size={12} />
                      <span>{formatDate(evt.date)}</span>
                      <span>•</span>
                      <Clock size={12} />
                      <span>{evt.time}</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">{evt.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{evt.description}</p>
                    </div>

                    {evt.amount && (
                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-emerald-600">{evt.amount}</span>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Paid</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <AlertCircle size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No activity events found</p>
          <p className="text-xs text-slate-400 mt-1">No log entries matching filter "{filter}".</p>
        </div>
      )}
    </div>
  );
}
