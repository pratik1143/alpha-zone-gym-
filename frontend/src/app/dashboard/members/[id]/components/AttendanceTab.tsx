'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, Calendar, CheckCircle2, Zap, AlertCircle, MapPin,
  UserCheck, ChevronLeft, ChevronRight, TrendingUp, Sparkles, Shield,
  ArrowDownRight, ArrowUpRight, Activity, RotateCcw
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { formatDate, formatTime } from '@/lib/utils';

export default function AttendanceTab({ member }: { member: any }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  const docId = member?.id || member?.uid || member?.memberId;
  const memberCode = member?.memberId || '';
  const bioId = member?.biometricId || member?.deviceUserId || '';

  // 1. Real-time Firestore Listener for member attendance logs
  useEffect(() => {
    if (!docId && !memberCode && !bioId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = collection(db, 'attendance_logs');

    const unsub = onSnapshot(q, (snap) => {
      const rawLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Match logs specifically for this member
      const memberLogs = rawLogs.filter((log: any) => {
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

      // Sort descending by checkIn / timestamp
      memberLogs.sort((a: any, b: any) => {
        const timeA = new Date(a.checkIn || a.timestamp || a.date || 0).getTime();
        const timeB = new Date(b.checkIn || b.timestamp || b.date || 0).getTime();
        return timeB - timeA;
      });

      setLogs(memberLogs);
      setLoading(false);
    }, (err) => {
      console.warn("Attendance logs listener notice:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [docId, memberCode, bioId, member?.phone, member?.name]);

  // 2. Dynamic Attendance Calculations
  const stats = useMemo(() => {
    if (logs.length === 0) {
      return {
        totalVisits: 0,
        presentDays: 0,
        lateEntries: 0,
        firstCheckIn: 'N/A',
        lastCheckIn: 'No visits yet',
        avgDurationMinutes: 0,
        isCurrentlyInside: false,
        lastPunchTime: null,
      };
    }

    const uniqueDays = new Set<string>();
    let lateCount = 0;
    let totalDurationMs = 0;
    let durationCount = 0;
    let earliestTime = '';
    let latestTime = '';
    let isCurrentlyInside = false;

    logs.forEach((log, idx) => {
      const rawIn = log.checkIn || log.timestamp || log.date;
      if (!rawIn) return;

      const dt = new Date(rawIn);
      if (isNaN(dt.getTime())) return;

      const dateStr = dt.toISOString().split('T')[0];
      const isDuplicate = log.status === 'duplicate' || log.isDuplicate;

      if (!isDuplicate) {
        uniqueDays.add(dateStr);
      }

      // Check if late (after 9:30 AM check-in)
      const hours = dt.getHours();
      const mins = dt.getMinutes();
      if ((hours > 9 || (hours === 9 && mins > 30)) && !isDuplicate) {
        lateCount++;
      }

      // Track earliest and latest check-ins
      if (!earliestTime || dt < new Date(earliestTime)) {
        earliestTime = rawIn;
      }
      if (!latestTime || dt > new Date(latestTime)) {
        latestTime = rawIn;
      }

      // Calculate stay duration
      const rawOut = log.checkOut || log.outTime;
      if (rawOut) {
        const outDt = new Date(rawOut);
        if (!isNaN(outDt.getTime()) && outDt > dt) {
          totalDurationMs += (outDt.getTime() - dt.getTime());
          durationCount++;
        }
      } else if (idx === 0) {
        // Latest punch has no checkout yet and was within last 4 hours
        const ageHours = (Date.now() - dt.getTime()) / (1000 * 3600);
        if (ageHours <= 4) {
          isCurrentlyInside = true;
        }
      }
    });

    const avgMs = durationCount > 0 ? totalDurationMs / durationCount : 0;
    const avgMins = Math.round(avgMs / (1000 * 60));

    return {
      totalVisits: logs.filter(l => l.status !== 'duplicate').length,
      presentDays: uniqueDays.size,
      lateEntries: lateCount,
      firstCheckIn: earliestTime ? `${formatDate(earliestTime)} • ${formatTime(earliestTime)}` : 'N/A',
      lastCheckIn: latestTime ? `${formatDate(latestTime)} • ${formatTime(latestTime)}` : 'N/A',
      avgDurationMinutes: avgMins,
      isCurrentlyInside,
      lastPunchTime: latestTime,
    };
  }, [logs]);

  // Format Duration string
  const formatDuration = (mins: number) => {
    if (mins <= 0) return 'N/A';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m} mins`;
  };

  // 3. Monthly Calendar Generation
  const calendarData = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    // Map logs by date string (YYYY-MM-DD)
    const logsByDateMap = new Map<string, any[]>();
    logs.forEach(l => {
      const raw = l.checkIn || l.timestamp || l.date;
      if (!raw) return;
      const dStr = new Date(raw).toISOString().split('T')[0];
      if (!logsByDateMap.has(dStr)) logsByDateMap.set(dStr, []);
      logsByDateMap.get(dStr)!.push(l);
    });

    const days: Array<{ dayNumber: number; dateStr: string; status: 'present' | 'late' | 'abnormal' | 'none'; logs: any[] }> = [];

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const fullDateStr = `${year}-${mStr}-${dStr}`;

      const dayLogs = logsByDateMap.get(fullDateStr) || [];
      let status: 'present' | 'late' | 'abnormal' | 'none' = 'none';

      if (dayLogs.length > 0) {
        const validLogs = dayLogs.filter(l => l.status !== 'duplicate');
        if (validLogs.length > 0) {
          const hasLate = validLogs.some(l => {
            const dt = new Date(l.checkIn || l.timestamp);
            return dt.getHours() > 9 || (dt.getHours() === 9 && dt.getMinutes() > 30);
          });
          const hasMissingOut = validLogs.some(l => !l.checkOut && !l.outTime);

          if (hasMissingOut && fullDateStr !== new Date().toISOString().split('T')[0]) {
            status = 'abnormal';
          } else if (hasLate) {
            status = 'late';
          } else {
            status = 'present';
          }
        }
      }

      days.push({ dayNumber: day, dateStr: fullDateStr, status, logs: dayLogs });
    }

    return { firstDayIndex, totalDaysInMonth, days, year, month, monthName: currentMonthDate.toLocaleString('default', { month: 'long' }) };
  }, [currentMonthDate, logs]);

  // 4. Filtered Logs by Date Selection
  const filteredLogs = useMemo(() => {
    if (!selectedDateFilter) return logs;
    return logs.filter(l => {
      const raw = l.checkIn || l.timestamp || l.date;
      if (!raw) return false;
      return new Date(raw).toISOString().split('T')[0] === selectedDateFilter;
    });
  }, [logs, selectedDateFilter]);

  return (
    <div className="w-full space-y-6 text-slate-900 text-left font-sans">
      {/* ── 1. SUMMARY CARDS DASHBOARD ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Visits */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Visits</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Zap size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalVisits}</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">Biometric Gate Accesses</p>
          </div>
        </div>

        {/* Present Days */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Present Days</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-600 tracking-tight">{stats.presentDays}</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">Unique Gym Days</p>
          </div>
        </div>

        {/* Late Entries */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Late Entries</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-amber-600 tracking-tight">{stats.lateEntries}</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">Punches after 9:30 AM</p>
          </div>
        </div>

        {/* Avg Stay Duration */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Avg Duration</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-indigo-700 tracking-tight">{formatDuration(stats.avgDurationMinutes)}</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">Workout time per session</p>
          </div>
        </div>

        {/* First Check-In */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">First Check-In</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <ArrowDownRight size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-xs font-black text-slate-800 tracking-tight truncate">{stats.firstCheckIn}</h4>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">Initial Gym Registration</p>
          </div>
        </div>

        {/* Current Inside / Outside Status */}
        <div className={`rounded-3xl p-5 border shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex flex-col justify-between ${
          stats.isCurrentlyInside ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-black uppercase tracking-wider ${stats.isCurrentlyInside ? 'text-emerald-100' : 'text-slate-400'}`}>
              Presence Status
            </span>
            <div className={`w-3 h-3 rounded-full ${stats.isCurrentlyInside ? 'bg-white animate-ping' : 'bg-slate-300'}`} />
          </div>
          <div className="mt-3">
            <h3 className={`text-xl font-black tracking-tight ${stats.isCurrentlyInside ? 'text-white' : 'text-slate-900'}`}>
              {stats.isCurrentlyInside ? '⚡ Inside Gym' : 'Outside Gym'}
            </h3>
            <p className={`text-[10px] font-bold mt-0.5 ${stats.isCurrentlyInside ? 'text-emerald-100' : 'text-slate-400'}`}>
              {stats.lastCheckIn}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. MONTHLY ATTENDANCE CALENDAR ──────────────────────────────────── */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Monthly Attendance Calendar</h3>
              <p className="text-xs text-slate-500 font-medium">
                Visual attendance history for {calendarData.monthName} {calendarData.year}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Legend Indicators */}
            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Present</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Late</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Abnormal</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block" /> No Visit</span>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setCurrentMonthDate(new Date(calendarData.year, calendarData.month - 1, 1))}
                className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-all border-none bg-transparent cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-black text-slate-800 px-2">{calendarData.monthName} {calendarData.year}</span>
              <button
                type="button"
                onClick={() => setCurrentMonthDate(new Date(calendarData.year, calendarData.month + 1, 1))}
                className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-all border-none bg-transparent cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {selectedDateFilter && (
              <button
                type="button"
                onClick={() => setSelectedDateFilter(null)}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border-none cursor-pointer"
              >
                <RotateCcw size={12} /> Clear Filter ({selectedDateFilter})
              </button>
            )}
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-400 uppercase tracking-wider py-1">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-2">
          {/* Blank Padding Days */}
          {Array.from({ length: calendarData.firstDayIndex }).map((_, i) => (
            <div key={`blank_${i}`} className="h-14 bg-slate-50/40 rounded-2xl border border-slate-100/40" />
          ))}

          {/* Actual Month Days */}
          {calendarData.days.map((d) => {
            const isSelected = selectedDateFilter === d.dateStr;
            const isToday = d.dateStr === new Date().toISOString().split('T')[0];

            return (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => setSelectedDateFilter(isSelected ? null : d.dateStr)}
                className={`h-14 rounded-2xl p-2 flex flex-col justify-between text-left transition-all border-2 cursor-pointer relative ${
                  isSelected ? 'ring-2 ring-indigo-600 border-indigo-500 shadow-md scale-105 z-10' :
                  isToday ? 'border-blue-400 bg-blue-50/20' : 'border-slate-100 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-black ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>{d.dayNumber}</span>
                  {d.status !== 'none' && (
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      d.status === 'present' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                      d.status === 'late' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                      'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                    }`} />
                  )}
                </div>

                <div className="text-[9px] font-bold text-slate-400 truncate">
                  {d.logs.length > 0 ? `${d.logs.length} punch${d.logs.length > 1 ? 'es' : ''}` : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. ATTENDANCE HISTORY TABLE ───────────────────────────────────────── */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.02)] overflow-hidden space-y-0">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Attendance Log History</h3>
            <p className="text-xs text-slate-500 font-medium">
              Real-time ESSL biometric gate check-in and check-out logs
              {selectedDateFilter ? ` (Filtered: ${selectedDateFilter})` : ''}
            </p>
          </div>

          <span className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            Showing <strong className="text-slate-900 font-black">{filteredLogs.length}</strong> records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#0e68d6] text-white font-extrabold text-[11px] uppercase tracking-wider">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Check-In</th>
                <th className="px-6 py-4">Check-Out</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Device / Gate</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold text-xs">
                    Loading ESSL biometric attendance records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 font-bold text-xs">
                    <AlertCircle size={28} className="mx-auto mb-2 text-slate-300" />
                    No attendance records found for this member.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  const rawIn = log.checkIn || log.timestamp || log.date;
                  const rawOut = log.checkOut || log.outTime;

                  const inDateStr = rawIn ? formatDate(rawIn) : 'N/A';
                  const inTimeStr = rawIn ? formatTime(rawIn) : 'N/A';
                  const outTimeStr = rawOut ? formatTime(rawOut) : (idx === 0 && stats.isCurrentlyInside ? 'Still Inside ⚡' : 'N/A');

                  let durationStr = 'N/A';
                  if (rawIn && rawOut) {
                    const diffMs = new Date(rawOut).getTime() - new Date(rawIn).getTime();
                    if (diffMs > 0) {
                      const mins = Math.round(diffMs / (1000 * 60));
                      durationStr = formatDuration(mins);
                    }
                  } else if (idx === 0 && stats.isCurrentlyInside) {
                    durationStr = 'Live ⚡';
                  }

                  const isDuplicate = log.status === 'duplicate' || log.isDuplicate;
                  const isLate = rawIn && (new Date(rawIn).getHours() > 9 || (new Date(rawIn).getHours() === 9 && new Date(rawIn).getMinutes() > 30));

                  const displayStatus = isDuplicate ? 'DUPLICATE PUNCH' : (isLate ? 'LATE' : 'PRESENT');

                  return (
                    <tr key={log.id || idx} className="hover:bg-blue-50/50 transition-colors">
                      {/* Date */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {inDateStr}
                      </td>

                      {/* Check-In */}
                      <td className="px-6 py-4 font-mono font-black text-emerald-600">
                        {inTimeStr}
                      </td>

                      {/* Check-Out */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">
                        {outTimeStr}
                      </td>

                      {/* Duration */}
                      <td className="px-6 py-4 font-mono font-extrabold text-indigo-700">
                        {durationStr}
                      </td>

                      {/* Device / Gate */}
                      <td className="px-6 py-4 font-bold text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span>{log.doorName || log.deviceName || log.gate || 'Main Gate'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block ${
                          displayStatus === 'PRESENT' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          displayStatus === 'LATE' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}>
                          {displayStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
