'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Calendar, CreditCard, ShieldCheck, CheckCircle2,
  Clock, MapPin, Zap, User, Sparkles, AlertCircle, ChevronDown
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { formatDate, formatTime, cleanPlanName } from '@/lib/utils';

export default function ActivityTimelineTab({ member }: { member: any }) {
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'memberships' | 'payments' | 'attendance'>('all');
  const [displayCount, setDisplayCount] = useState(50);

  const docId = member?.id || member?.uid || member?.memberId;
  const memberCode = member?.memberId || '';
  const bioId = member?.biometricId || member?.deviceUserId || '';

  // 1. Real-time Firestore Listener for member Payments
  useEffect(() => {
    if (!docId && !memberCode) return;

    const qPayments = query(collection(db, 'payments'), where('memberId', '==', docId));

    const unsubPayments = onSnapshot(qPayments, (snap) => {
      const livePayments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Deduplicate payments by id or invoice number
      const payMap = new Map<string, any>();
      livePayments.forEach((p: any) => {
        const key = p.id || p.invoiceNumber || p.invoice;
        payMap.set(key, p);
      });

      setPaymentsList(Array.from(payMap.values()));
    }, (err) => {
      console.warn("Timeline payments listener notice:", err);
    });

    return () => unsubPayments();
  }, [docId, memberCode]);

  // 2. Real-time Firestore Listener for member Attendance Logs
  useEffect(() => {
    if (!docId && !memberCode && !bioId) return;

    const qAttendance = collection(db, 'attendance_logs');

    const unsubAttendance = onSnapshot(qAttendance, (snap) => {
      const rawLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const matchedLogs = rawLogs.filter((log: any) => {
        if (!log) return false;
        const lMemberId = String(log.memberId || log.memberCode || log.uid || '').trim();
        const lBioId = String(log.biometricId || log.deviceUserId || log.bioId || '').trim();
        const lPhone = log.phone ? String(log.phone).replace(/\D/g, '') : '';
        const mPhone = member?.phone ? String(member.phone).replace(/\D/g, '') : '';
        const lName = String(log.memberName || '').trim().toLowerCase();
        const mName = String(member?.name || '').trim().toLowerCase();

        if (docId && lMemberId === String(docId).trim()) return true;
        if (memberCode && lMemberId === String(memberCode).trim()) return true;
        if (bioId && lBioId === String(bioId).trim()) return true;
        if (mPhone && lPhone && mPhone === lPhone) return true;
        if (mName && lName && mName === lName) return true;

        return false;
      });

      setAttendanceList(matchedLogs);
      setLoading(false);
    }, (err) => {
      console.warn("Timeline attendance listener notice:", err);
      setLoading(false);
    });

    return () => unsubAttendance();
  }, [docId, memberCode, bioId, member?.phone, member?.name]);

  // 3. Build Combined Real Timeline Events
  const timelineEvents = useMemo(() => {
    if (!member) return [];

    const events: any[] = [];

    // A. REAL PAYMENT EVENTS (from payments collection)
    paymentsList.forEach((p: any) => {
      const invNum = p.invoiceNumber || p.invoice || 'INV-000';
      const origAmt = Number(p.originalAmount !== undefined ? p.originalAmount : (p.price || p.amount || 0));
      const discAmt = Number(p.discountAmount !== undefined ? p.discountAmount : (p.discount || 0));
      const taxAmt = Number(p.taxAmount !== undefined ? p.taxAmount : (p.tax || p.gst || 0));
      const othAmt = Number(p.otherCharges || 0);

      const calculatedNet = Math.max(0, origAmt - discAmt + taxAmt + othAmt);
      const netPayable = Number(p.netPayable !== undefined ? p.netPayable : (calculatedNet > 0 ? calculatedNet : Number(p.amount || 0)));
      const paidAmt = Number(p.amountPaid !== undefined ? p.amountPaid : (p.paid !== undefined ? p.paid : netPayable));
      const pendingAmt = Math.max(0, netPayable - paidAmt);

      const rawDate = p.date || p.createdAt || member?.joinDate || new Date().toISOString();
      const planTitle = cleanPlanName(p.plan || member?.plan || 'Gym Membership');

      events.push({
        id: `pay_${p.id || invNum}`,
        category: 'payments',
        type: 'PAYMENT RECEIVED',
        title: planTitle,
        date: rawDate,
        time: p.createdAt ? formatTime(p.createdAt) : '10:30 AM',
        invoice: invNum,
        startDate: p.startDate || member?.startDate || 'N/A',
        expiryDate: p.expiryDate || member?.expiryDate || 'N/A',
        originalAmount: origAmt,
        discountAmount: discAmt,
        taxAmount: taxAmt,
        netPayable,
        amountPaid: paidAmt,
        pendingAmount: pendingAmt,
        paymentMethod: p.method || p.paymentMethod || 'UPI',
        status: pendingAmt <= 0 ? 'PAID' : (paidAmt > 0 ? 'PARTIAL' : 'PENDING'),
        icon: CreditCard,
        color: 'bg-emerald-500 text-white',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        rawTimestamp: new Date(rawDate).getTime(),
      });
    });

    // B. REAL MEMBERSHIP HISTORY EVENTS (from member.membershipHistory)
    const historyItems = Array.isArray(member?.membershipHistory) ? member.membershipHistory : [];
    historyItems.forEach((h: any, idx: number) => {
      const planTitle = cleanPlanName(h.plan || h.packageName || member?.plan);
      const rawDate = h.createdAt || h.startDate || member?.joinDate || new Date().toISOString();

      events.push({
        id: `mem_hist_${h.id || idx}`,
        category: 'memberships',
        type: idx === 0 ? 'INITIAL MEMBERSHIP' : 'MEMBERSHIP RENEWAL',
        title: planTitle,
        date: rawDate,
        time: h.createdAt ? formatTime(h.createdAt) : '10:00 AM',
        invoice: h.invoiceId || h.invoiceNumber || `INV-HIST-${idx + 1}`,
        startDate: h.startDate || 'N/A',
        expiryDate: h.expiryDate || 'N/A',
        amountPaid: Number(h.amountPaid || h.amount || 0),
        status: h.status || 'ACTIVE',
        icon: ShieldCheck,
        color: 'bg-purple-600 text-white',
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
        rawTimestamp: new Date(rawDate).getTime(),
      });
    });

    // C. REAL ATTENDANCE EVENTS (from attendance_logs collection)
    attendanceList.forEach((log: any, idx: number) => {
      const rawIn = log.checkIn || log.timestamp || log.date;
      if (!rawIn) return;

      const rawOut = log.checkOut || log.outTime;
      const isDuplicate = log.status === 'duplicate' || log.isDuplicate;
      const dt = new Date(rawIn);
      const isLate = dt.getHours() > 9 || (dt.getHours() === 9 && dt.getMinutes() > 30);

      let durationText = 'N/A';
      if (rawIn && rawOut) {
        const diffMs = new Date(rawOut).getTime() - dt.getTime();
        if (diffMs > 0) {
          const mins = Math.round(diffMs / (1000 * 60));
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          durationText = h > 0 ? `${h}h ${m}m` : `${m} mins`;
        }
      } else if (idx === 0) {
        const ageHours = (Date.now() - dt.getTime()) / (1000 * 3600);
        if (ageHours <= 4) durationText = 'Currently Inside ⚡';
      }

      events.push({
        id: `att_${log.id || idx}`,
        category: 'attendance',
        type: 'BIOMETRIC GATE PUNCH',
        title: `Gate Access: ${log.doorName || log.deviceName || log.gate || 'Main Gate'}`,
        date: rawIn,
        time: formatTime(rawIn),
        gate: log.doorName || log.deviceName || log.gate || 'Main Gate',
        duration: durationText,
        status: isDuplicate ? 'DUPLICATE PUNCH' : (isLate ? 'LATE' : 'PRESENT'),
        icon: Zap,
        color: 'bg-blue-600 text-white',
        badgeBg: isDuplicate ? 'bg-slate-100 text-slate-700 border-slate-300' : (isLate ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-blue-100 text-blue-800 border-blue-300'),
        rawTimestamp: dt.getTime(),
      });
    });

    // D. ACCOUNT CREATION EVENT
    if (member?.joinDate || member?.createdAt) {
      const joinDateStr = member.joinDate || member.createdAt;
      events.push({
        id: 'account_created_evt',
        category: 'memberships',
        type: 'ACCOUNT CREATED',
        title: 'Joined Alpha Zone Gym OS',
        date: joinDateStr,
        time: '09:00 AM',
        status: 'COMPLETED',
        description: `Registered at branch ${member.branch || 'Mohali, Punjab'}`,
        icon: User,
        color: 'bg-slate-700 text-white',
        badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
        rawTimestamp: new Date(joinDateStr).getTime() || 0,
      });
    }

    // Deduplicate timeline events by ID
    const eventMap = new Map<string, any>();
    events.forEach(e => eventMap.set(e.id, e));

    // Sort chronologically descending (newest first)
    return Array.from(eventMap.values()).sort((a, b) => b.rawTimestamp - a.rawTimestamp);
  }, [member, paymentsList, attendanceList]);

  // Filter events by selected category
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return timelineEvents;
    return timelineEvents.filter((e) => e.category === filter);
  }, [timelineEvents, filter]);

  const visibleEvents = filteredEvents.slice(0, displayCount);

  return (
    <div className="w-full bg-white rounded-[32px] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-slate-100 p-8 space-y-6 text-slate-900 text-left font-sans">
      {/* ── HEADER & CATEGORY FILTERS ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Activity size={22} />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Activity Timeline &amp; Logs</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Complete real-time audit log of billing payments, membership renewals, biometric gate check-ins, and account events.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl shrink-0">
          {(['all', 'memberships', 'payments', 'attendance'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setFilter(cat);
                setDisplayCount(50);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-wider border-none cursor-pointer ${
                filter === cat
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-500 hover:text-slate-800 bg-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── TIMELINE STREAM ─────────────────────────────────────────────────── */}
      {visibleEvents.length > 0 ? (
        <div className="relative pl-6 sm:pl-10 space-y-6 before:absolute before:left-3 sm:before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
          {visibleEvents.map((evt, idx) => {
            const Icon = evt.icon;

            return (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.3) }}
                className="relative group"
              >
                {/* Node Icon */}
                <div className={`absolute -left-6 sm:-left-10 top-1 w-6 h-6 sm:w-10 sm:h-10 rounded-2xl ${evt.color} flex items-center justify-center shadow-lg ring-4 ring-white`}>
                  <Icon size={16} />
                </div>

                {/* Timeline Card */}
                <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 rounded-3xl p-5 transition-all space-y-3">
                  {/* Card Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">{evt.type}</span>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${evt.badgeBg}`}>
                        {evt.status}
                      </span>
                      {evt.invoice && (
                        <span className="text-[10px] font-mono font-black bg-white text-blue-700 px-2 py-0.5 rounded-lg border border-blue-200">
                          {evt.invoice}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 font-mono">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{formatDate(evt.date)}</span>
                      <span>•</span>
                      <Clock size={13} className="text-slate-400" />
                      <span>{evt.time}</span>
                    </div>
                  </div>

                  {/* ── TYPE SPECIFIC DETAILED CONTENT ── */}

                  {/* 1. PAYMENT CARD DETAILS */}
                  {evt.category === 'payments' && (
                    <div className="space-y-3 pt-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 tracking-tight">{evt.title}</h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Membership Validity: <strong className="font-mono text-slate-700">{evt.startDate} → {evt.expiryDate}</strong>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-emerald-600 font-mono">₹{evt.amountPaid.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Paid ({evt.paymentMethod})</span>
                        </div>
                      </div>

                      {/* Detailed Financial Breakdown Table */}
                      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Original</span>
                          <span className="font-bold text-slate-800">₹{evt.originalAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Discount</span>
                          <span className="font-bold text-emerald-600">₹{evt.discountAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Tax</span>
                          <span className="font-bold text-slate-600">₹{evt.taxAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Net Payable</span>
                          <span className="font-black text-slate-900">₹{evt.netPayable.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Amount Paid</span>
                          <span className="font-black text-emerald-600">₹{evt.amountPaid.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Pending</span>
                          <span className={`font-bold ${evt.pendingAmount > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                            ₹{evt.pendingAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Method</span>
                          <span className="font-bold text-slate-800">{evt.paymentMethod}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. ATTENDANCE CARD DETAILS */}
                  {evt.category === 'attendance' && (
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">{evt.title}</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" /> Gate: <strong className="text-slate-800">{evt.gate}</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-indigo-700 font-mono block">{evt.duration}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Stay Duration</span>
                      </div>
                    </div>
                  )}

                  {/* 3. MEMBERSHIP CARD DETAILS */}
                  {evt.category === 'memberships' && (
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">{evt.title}</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {evt.description || `Validity Period: ${evt.startDate} → ${evt.expiryDate}`}
                        </p>
                      </div>
                      {evt.amountPaid > 0 && (
                        <div className="text-right">
                          <span className="text-sm font-black text-purple-700 font-mono">₹{evt.amountPaid.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Billed</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Load More Button */}
          {filteredEvents.length > displayCount && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => setDisplayCount(prev => prev + 50)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 mx-auto border-none cursor-pointer shadow-sm active:scale-95"
              >
                <span>Load More Activity</span>
                <ChevronDown size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-16 text-center bg-slate-50 rounded-3xl border border-slate-200/80">
          <AlertCircle size={32} className="text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-black text-slate-800">No activity recorded yet.</h4>
          <p className="text-xs text-slate-500 font-medium mt-1">
            No real timeline entries matching filter "{filter}".
          </p>
        </div>
      )}
    </div>
  );
}
