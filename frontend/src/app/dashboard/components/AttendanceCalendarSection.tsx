'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Users, Clock, CheckCircle2, 
  Search, Calendar, UserCheck
} from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { SYSTEM_START_DATE, SYSTEM_CONFIG } from '@/config/system';

interface AttendanceCalendarSectionProps {
  memberAttendanceLogs: any[];
  employeeAttendanceLogs: any[];
  employeesList: any[];
  membersList: any[];
}

export default function AttendanceCalendarSection({
  memberAttendanceLogs = [],
  employeeAttendanceLogs = [],
  employeesList = [],
  membersList = [],
}: AttendanceCalendarSectionProps) {
  // Current calendar navigation state (Asia/Kolkata)
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-11
  const [selectedDateYmd, setSelectedDateYmd] = useState<string | null>(null);

  // Staff card state
  const [staffSearch, setStaffSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState<'all' | 'present' | 'absent' | 'absent_2' | 'absent_7'>('all');

  const todayStr = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: SYSTEM_CONFIG.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  }, []);

  // Default active selected date to today
  const activeYmd = selectedDateYmd || todayStr;

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleJumpToday = () => {
    const d = new Date();
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
    setSelectedDateYmd(todayStr);
  };

  // Helper to extract YYYY-MM-DD in Asia/Kolkata timezone
  const extractKolkataYMD = (rawDate: string | null | undefined): string | null => {
    if (!rawDate) return null;
    try {
      if (rawDate.length === 10 && rawDate.includes('-')) return rawDate;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return null;
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: SYSTEM_CONFIG.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d);
    } catch {
      return null;
    }
  };

  // Pre-index ONLY valid attendance logs strictly on or after SYSTEM_START_DATE
  const attendanceByDate = useMemo(() => {
    const map = new Map<string, {
      memberPunches: any[];
      employeePunches: any[];
      uniqueMembers: Set<string>;
      uniqueEmployees: Set<string>;
      firstCheckIn: string | null;
      lastCheckIn: string | null;
    }>();

    // Process Member logs (Strictly exclude any pre-launch logs)
    (memberAttendanceLogs || []).forEach(log => {
      if (!log || log.isSample || log.isMock) return;
      const rawDate = String(log.checkIn || log.timestamp || log.createdAt || '');
      const ymd = extractKolkataYMD(rawDate);
      if (!ymd || ymd < SYSTEM_START_DATE) return; // STRICT ZERO BEFORE SYSTEM_START_DATE

      if (!map.has(ymd)) {
        map.set(ymd, {
          memberPunches: [],
          employeePunches: [],
          uniqueMembers: new Set(),
          uniqueEmployees: new Set(),
          firstCheckIn: null,
          lastCheckIn: null,
        });
      }

      const entry = map.get(ymd)!;
      entry.memberPunches.push(log);
      const mKey = log.memberId || log.biometricId || log.deviceUserId || log.memberName;
      if (mKey && String(mKey).trim()) entry.uniqueMembers.add(String(mKey).trim());

      const timeStr = log.checkIn || log.timestamp;
      if (timeStr) {
        if (!entry.firstCheckIn || timeStr < entry.firstCheckIn) entry.firstCheckIn = timeStr;
        if (!entry.lastCheckIn || timeStr > entry.lastCheckIn) entry.lastCheckIn = timeStr;
      }
    });

    // Process Employee logs (Strictly exclude any pre-launch logs)
    (employeeAttendanceLogs || []).forEach(log => {
      if (!log || log.isSample || log.isMock) return;
      const rawDate = String(log.timestamp || log.checkIn || log.createdAt || '');
      const ymd = extractKolkataYMD(rawDate);
      if (!ymd || ymd < SYSTEM_START_DATE) return; // STRICT ZERO BEFORE SYSTEM_START_DATE

      if (!map.has(ymd)) {
        map.set(ymd, {
          memberPunches: [],
          employeePunches: [],
          uniqueMembers: new Set(),
          uniqueEmployees: new Set(),
          firstCheckIn: null,
          lastCheckIn: null,
        });
      }

      const entry = map.get(ymd)!;
      entry.employeePunches.push(log);
      const eKey = log.employeeId || log.biometricId || log.employeeName;
      if (eKey && String(eKey).trim()) entry.uniqueEmployees.add(String(eKey).trim());

      const timeStr = log.timestamp || log.checkIn;
      if (timeStr) {
        if (!entry.firstCheckIn || timeStr < entry.firstCheckIn) entry.firstCheckIn = timeStr;
        if (!entry.lastCheckIn || timeStr > entry.lastCheckIn) entry.lastCheckIn = timeStr;
      }
    });

    return map;
  }, [memberAttendanceLogs, employeeAttendanceLogs]);

  // Calendar Grid metrics for currently selected month
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sunday

    const days = [];

    // Empty offset slots
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ isOffset: true, key: `offset-${i}` });
    }

    // Actual calendar days
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      const ymd = `${selectedYear}-${monthStr}-${dayStr}`;
      const dayOfWeek = new Date(selectedYear, selectedMonth, d).getDay(); // 0 = Sunday

      const isSunday = dayOfWeek === 0;
      const isToday = ymd === todayStr;
      const isBeforeLaunch = ymd < SYSTEM_START_DATE;

      // When before launch date, punches are strictly 0 and cannot have heatmap
      const record = isBeforeLaunch ? null : attendanceByDate.get(ymd);
      const memberPunches = record ? record.memberPunches.length : 0;
      const staffPunches = record ? record.employeePunches.length : 0;
      const totalPunches = isBeforeLaunch ? 0 : (memberPunches + staffPunches);
      const memberCount = record ? record.uniqueMembers.size : 0;
      const staffCount = record ? record.uniqueEmployees.size : 0;

      // Intensity level
      let intensity: 'none' | 'low' | 'medium' | 'high' | 'peak' = 'none';
      if (totalPunches > 0) {
        if (totalPunches <= 5) intensity = 'low';
        else if (totalPunches <= 15) intensity = 'medium';
        else if (totalPunches <= 30) intensity = 'high';
        else intensity = 'peak';
      }

      days.push({
        isOffset: false,
        key: ymd,
        dayNum: d,
        ymd,
        isSunday,
        isToday,
        isBeforeLaunch,
        totalPunches,
        memberPunches,
        staffPunches,
        memberCount,
        staffCount,
        intensity,
        firstCheckIn: record?.firstCheckIn || null,
        lastCheckIn: record?.lastCheckIn || null,
      });
    }

    return days;
  }, [selectedYear, selectedMonth, attendanceByDate, todayStr]);

  // Active inspected day object
  const activeDayObj = useMemo(() => {
    const found = calendarDays.find(d => !d.isOffset && d.ymd === activeYmd);
    if (found) return found;

    // Fallback if day is in another month
    const isBeforeLaunch = activeYmd < SYSTEM_START_DATE;
    const isToday = activeYmd === todayStr;
    const record = isBeforeLaunch ? null : attendanceByDate.get(activeYmd);
    const memberPunches = record ? record.memberPunches.length : 0;
    const staffPunches = record ? record.employeePunches.length : 0;
    const totalPunches = isBeforeLaunch ? 0 : (memberPunches + staffPunches);

    return {
      isOffset: false,
      key: activeYmd,
      dayNum: Number(activeYmd.split('-')[2] || '1'),
      ymd: activeYmd,
      isSunday: new Date(activeYmd).getDay() === 0,
      isToday,
      isBeforeLaunch,
      totalPunches,
      memberPunches,
      staffPunches,
      memberCount: record ? record.uniqueMembers.size : 0,
      staffCount: record ? record.uniqueEmployees.size : 0,
      intensity: 'none',
      firstCheckIn: record?.firstCheckIn || null,
      lastCheckIn: record?.lastCheckIn || null,
    };
  }, [calendarDays, activeYmd, todayStr, attendanceByDate]);

  // Helper to format ISO time to friendly string (e.g. 08:42 AM)
  const formatTimeStr = (iso: string | null) => {
    if (!iso) return '--';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '--';
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: SYSTEM_CONFIG.timezone,
      });
    } catch {
      return '--';
    }
  };

  // Staff Attendance & Absence Tracking
  const staffListWithStatus = useMemo(() => {
    return (employeesList || []).map((emp: any) => {
      const empLogs = (employeeAttendanceLogs || []).filter(l => {
        if (!l || l.isSample || l.isMock) return false;
        const eId = l.employeeId || l.biometricId;
        const targetId = emp.id || emp.biometricId || emp.employeeId;
        const rawDate = String(l.timestamp || l.checkIn || '');
        const ymd = extractKolkataYMD(rawDate);
        if (!ymd || ymd < SYSTEM_START_DATE) return false;
        return (eId && targetId && (String(eId) === String(targetId) || String(l.biometricId) === String(emp.biometricId)));
      });

      // Filter logs for today
      const todayLogs = empLogs.filter(l => {
        const rawDate = String(l.timestamp || l.checkIn || '');
        return extractKolkataYMD(rawDate) === todayStr;
      });

      const punchedToday = todayLogs.length > 0;
      let lastPunchTime: string | null = null;
      let lastSeenDateStr: string | null = null;

      if (todayLogs.length > 0) {
        lastPunchTime = todayLogs[0].timestamp || todayLogs[0].checkIn;
      } else if (empLogs.length > 0) {
        const sorted = [...empLogs].sort((a, b) => new Date(b.timestamp || b.checkIn || 0).getTime() - new Date(a.timestamp || a.checkIn || 0).getTime());
        lastSeenDateStr = sorted[0].timestamp || sorted[0].checkIn;
      }

      // Calculate consecutive absent days starting from SYSTEM_START_DATE
      // Since software started fresh on SYSTEM_START_DATE (2026-08-23), if today is launch date, absent is 0!
      let absentDays = 0;
      if (!punchedToday) {
        const todayD = new Date(todayStr);
        const startD = new Date(SYSTEM_START_DATE);
        
        if (todayD.getTime() > startD.getTime()) {
          const refDate = lastSeenDateStr ? new Date(lastSeenDateStr.split('T')[0]) : startD;
          let curr = new Date(refDate);
          curr.setDate(curr.getDate() + 1);

          while (curr < todayD) {
            if (curr.getDay() !== 0) { // Do not count Sundays as absent
              absentDays++;
            }
            curr.setDate(curr.getDate() + 1);
          }
          if (todayD.getDay() !== 0) absentDays++;
        }
      }

      return {
        ...emp,
        punchedToday,
        lastPunchTime,
        lastSeenDateStr,
        absentDays
      };
    });
  }, [employeesList, employeeAttendanceLogs, todayStr]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffListWithStatus.filter(emp => {
      const q = staffSearch.trim().toLowerCase();
      const matchesQuery = !q || (emp.name && emp.name.toLowerCase().includes(q)) || (emp.role && emp.role.toLowerCase().includes(q)) || (emp.phone && emp.phone.includes(q));
      if (!matchesQuery) return false;

      if (staffFilter === 'present') return emp.punchedToday;
      if (staffFilter === 'absent') return !emp.punchedToday;
      if (staffFilter === 'absent_2') return !emp.punchedToday && emp.absentDays >= 2;
      if (staffFilter === 'absent_7') return !emp.punchedToday && emp.absentDays >= 7;

      return true;
    });
  }, [staffListWithStatus, staffSearch, staffFilter]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full text-left">
      
      {/* ─── 1. ATTENDANCE CALENDAR (7 COLS ON DESKTOP) ─── */}
      <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[420px]">
        
        {/* Header with Title & Navigation Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0b5cbe] block flex items-center gap-1.5 font-display">
              <Calendar size={13} /> ATTENDANCE CALENDAR
            </span>
            <h3 className="text-sm font-black text-slate-900 mt-0.5">
              Track member &amp; staff attendance across every day
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Month Dropdown */}
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none focus:border-[#0b5cbe] cursor-pointer"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>

            {/* Year Dropdown */}
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none focus:border-[#0b5cbe] cursor-pointer"
            >
              {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Today Button */}
            <button
              onClick={handleJumpToday}
              className="px-2.5 py-1.5 bg-[#eaf3ff] hover:bg-[#d4e7fc] text-[#0b5cbe] font-black text-[10px] uppercase rounded-xl border border-[#b9d6f5] transition-all cursor-pointer"
            >
              Today
            </button>

            {/* Prev / Next Month Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-[#eaf3ff] text-[#0b5cbe] flex items-center justify-center border border-slate-200 transition-all cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-[#eaf3ff] text-[#0b5cbe] flex items-center justify-center border border-slate-200 transition-all cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* 7-Column Calendar Grid */}
        <div className="my-4">
          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
            <span className="text-rose-600 font-extrabold">Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1.5 justify-items-center">
            {calendarDays.map((day) => {
              if (day.isOffset) {
                return <div key={day.key} className="w-full aspect-square bg-transparent" />;
              }

              // Color styling based on Sunday and Heatmap intensity
              let cellBg = 'bg-slate-50 border-slate-200/80 text-slate-700 hover:border-[#0b5cbe] hover:bg-slate-100';
              if (day.isSunday && day.intensity === 'none') {
                cellBg = 'bg-rose-50/70 border-rose-200/80 text-rose-700 font-extrabold';
              } else if (day.intensity === 'low') {
                cellBg = 'bg-[#eaf3ff] border-[#b9d7f7] text-[#0b5cbe] font-bold shadow-xs';
              } else if (day.intensity === 'medium') {
                cellBg = 'bg-[#c6e0ff] border-[#8cbcf5] text-[#084a99] font-black shadow-xs';
              } else if (day.intensity === 'high') {
                cellBg = 'bg-[#0b5cbe] border-[#0b5cbe] text-white font-black shadow-xs';
              } else if (day.intensity === 'peak') {
                cellBg = 'bg-[#073673] border-[#073673] text-white font-black shadow-xs';
              }

              const isSelected = activeYmd === day.ymd;

              return (
                <div
                  key={day.key}
                  onClick={() => { if (day.ymd) setSelectedDateYmd(day.ymd); }}
                  className={`w-full aspect-square rounded-xl border flex flex-col items-center justify-center relative cursor-pointer transition-all ${cellBg} ${
                    day.isToday ? 'ring-2 ring-[#0b5cbe] ring-offset-1 z-10' : ''
                  } ${isSelected ? 'scale-105 shadow-md border-[#0b5cbe]' : 'hover:scale-105'}`}
                  title={`${day.ymd || ''} — ${day.totalPunches || 0} Punches`}
                >
                  <span className={`text-[11px] leading-none ${day.isSunday ? 'text-rose-600' : ''}`}>
                    {day.dayNum}
                  </span>

                  {(day.totalPunches || 0) > 0 && (
                    <span className="text-[8px] font-mono font-black mt-0.5 leading-none opacity-90">
                      {day.totalPunches}p
                    </span>
                  )}

                  {day.isToday && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#0b5cbe]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Inspector Popover / Banner */}
        {activeDayObj && (
          <div className="bg-[#f4f8fd] border border-[#b9d7f7] rounded-xl p-3.5 mb-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#b9d7f7]/60 pb-2">
              <div className="font-extrabold text-slate-900 flex items-center gap-2">
                <span>{new Date(activeDayObj.ymd || todayStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {activeDayObj.isToday && <span className="bg-[#0b5cbe] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Today</span>}
                {activeDayObj.isSunday && <span className="bg-rose-100 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Sunday</span>}
              </div>

              <div className="text-[10px] text-slate-500 font-semibold">
                {activeDayObj.isBeforeLaunch ? (
                  <span className="text-slate-400 italic">System not active before launch date ({SYSTEM_START_DATE})</span>
                ) : (
                  <span>Status: <strong>{(activeDayObj.totalPunches || 0) > 0 ? `${activeDayObj.totalPunches} recorded punches` : '0 punches (No check-ins)'}</strong></span>
                )}
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 text-[10px]">
              <div className="bg-white p-2 rounded-lg border border-[#d9e7f7]">
                <span className="text-slate-400 font-bold block uppercase text-[8.5px]">Total Punches</span>
                <span className="text-slate-900 font-black text-sm font-mono">{activeDayObj.totalPunches || 0}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#d9e7f7]">
                <span className="text-slate-400 font-bold block uppercase text-[8.5px]">Members</span>
                <span className="text-slate-900 font-black text-sm font-mono">{activeDayObj.memberCount || 0}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#d9e7f7]">
                <span className="text-slate-400 font-bold block uppercase text-[8.5px]">Staff</span>
                <span className="text-slate-900 font-black text-sm font-mono">{activeDayObj.staffCount || 0}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#d9e7f7]">
                <span className="text-slate-400 font-bold block uppercase text-[8.5px]">First / Last Check-in</span>
                <span className="text-slate-700 font-bold text-[9.5px] font-mono block truncate">
                  {formatTimeStr(activeDayObj.firstCheckIn || null)} · {formatTimeStr(activeDayObj.lastCheckIn || null)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Legend Bar */}
        <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-extrabold uppercase text-[9px]">Punches:</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-200" /> 0</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#eaf3ff] border border-[#b9d7f7]" /> 1-5</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#c6e0ff] border border-[#8cbcf5]" /> 6-15</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#0b5cbe]" /> 16-30</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#073673]" /> 31+</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-rose-600"><span className="w-2 h-2 rounded-full bg-rose-500" /> Sunday</span>
            <span className="flex items-center gap-1 text-[#0b5cbe]"><span className="w-2 h-2 rounded-full bg-[#0b5cbe]" /> Today</span>
          </div>
        </div>

      </div>

      {/* ─── 2. STAFF ATTENDANCE CARD (5 COLS ON DESKTOP) ─── */}
      <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[420px]">
        
        {/* Card Header & Filter Row */}
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0b5cbe] block flex items-center gap-1.5 font-display">
                <UserCheck size={13} /> STAFF ATTENDANCE
              </span>
              <h3 className="text-sm font-black text-slate-900 mt-0.5">
                Staff attendance &amp; absence tracking
              </h3>
            </div>

            <span className="text-[10px] font-bold bg-[#eaf3ff] text-[#0b5cbe] px-2 py-0.5 rounded-lg border border-[#b9d6f5]">
              {filteredStaff.length} Staff
            </span>
          </div>

          {/* Search and Filter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={staffSearch}
                onChange={e => setStaffSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0b5cbe] placeholder:text-slate-400"
              />
            </div>

            <select
              value={staffFilter}
              onChange={e => setStaffFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-[#0b5cbe] cursor-pointer"
            >
              <option value="all">All Staff</option>
              <option value="present">Present Today</option>
              <option value="absent">Not Checked In</option>
              <option value="absent_2">Absent 2+ Days</option>
              <option value="absent_7">Absent 7+ Days</option>
            </select>
          </div>
        </div>

        {/* Staff Roster List */}
        <div className="flex-1 overflow-y-auto max-h-[280px] space-y-2 pr-1 divide-y divide-slate-100">
          {filteredStaff.length > 0 ? (
            filteredStaff.map((emp: any) => {
              const isPresent = emp.punchedToday;

              return (
                <div key={emp.id || emp.employeeId || emp.name} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#eaf3ff] text-[#0b5cbe] font-black text-xs flex items-center justify-center shrink-0 border border-[#b9d6f5]">
                      {getInitials(emp.name || 'Staff')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {emp.name || 'Staff Member'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium truncate">
                        {emp.role || emp.designation || 'Staff'} · {emp.phone || 'No Phone'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      isPresent
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {isPresent ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                      {isPresent ? 'Present' : 'Not In'}
                    </span>
                    <div className="text-[9.5px] font-semibold text-slate-500 mt-0.5">
                      {isPresent
                        ? `Punched: ${formatTimeStr(emp.lastPunchTime)}`
                        : `Absent: ${emp.absentDays}d`}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Users size={24} className="mx-auto mb-1.5 opacity-50" />
              <p className="text-xs font-bold">No staff found matching filter</p>
            </div>
          )}
        </div>

        {/* Staff Card Footer Summary */}
        <div className="border-t border-slate-100 pt-2.5 mt-2 flex justify-between items-center text-[10px] text-slate-500 font-bold">
          <span>Present: <strong className="text-emerald-600">{staffListWithStatus.filter(e => e.punchedToday).length}</strong></span>
          <span>Absent: <strong className="text-slate-700">{staffListWithStatus.filter(e => !e.punchedToday).length}</strong></span>
          <span>Total Staff: <strong className="text-slate-900">{staffListWithStatus.length}</strong></span>
        </div>

      </div>

    </div>
  );
}
