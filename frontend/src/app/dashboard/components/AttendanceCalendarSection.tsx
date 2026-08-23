'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Users, Clock, CheckCircle2, 
  Search, Calendar, UserCheck, Shield, Briefcase
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
    // Fallback default employees roster if list from backend is still loading
    const defaultStaff = [
      { id: 'emp_501', name: 'Ramesh Kumar', phone: '9876543210', email: 'ramesh@alphagym.com', role: 'Manager', branch: 'Mohali, Punjab', biometricId: 501 },
      { id: 'emp_502', name: 'Karan Verma', phone: '9988776655', email: 'karan@alphagym.com', role: 'Trainer', branch: 'Mohali, Punjab', biometricId: 502 },
      { id: 'emp_503', name: 'Sneha Kapoor', phone: '9988776656', email: 'sneha@alphagym.com', role: 'Trainer', branch: 'Mohali, Punjab', biometricId: 503 },
      { id: 'emp_504', name: 'Priya Singh', phone: '9877407661', email: 'priya.reception@alphagym.com', role: 'Reception', branch: 'Mohali, Punjab', biometricId: 504 },
      { id: 'emp_505', name: 'Dev Rana', phone: '9988776657', email: 'dev@alphagym.com', role: 'Trainer', branch: 'Mohali, Punjab', biometricId: 505 },
      { id: 'emp_506', name: 'Gurpreet Singh', phone: '9811223344', email: 'gurpreet@alphagym.com', role: 'Cleaner', branch: 'Mohali, Punjab', biometricId: 506 }
    ];

    const sourceList = (employeesList && employeesList.length > 0) ? employeesList : defaultStaff;

    return sourceList.map((emp: any) => {
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

      // Calculate consecutive absent days starting from SYSTEM_START_DATE (2026-08-23)
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

  const presentStaffCount = staffListWithStatus.filter(e => e.punchedToday).length;
  const absentStaffCount = staffListWithStatus.filter(e => !e.punchedToday).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch text-left">
      
      {/* ─── 1. STAFF ATTENDANCE (PRIMARY PANEL - LEFT ~65% / 7-8 COLS) ─── */}
      <div className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full min-h-[460px]">
        
        {/* Panel Header & Controls */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0b5cbe] block flex items-center gap-1.5 font-display">
                <UserCheck size={13} /> STAFF ATTENDANCE
              </span>
              <h3 className="text-sm font-black text-slate-900 mt-0.5">
                Staff attendance &amp; absence tracking
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {presentStaffCount} Present
              </span>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                {absentStaffCount} Not Checked In
              </span>
              <span className="text-[10px] font-bold bg-[#eaf3ff] text-[#0b5cbe] px-2.5 py-1 rounded-lg border border-[#b9d6f5]">
                {staffListWithStatus.length} Total
              </span>
            </div>
          </div>

          {/* Search and Filter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 my-3">
            <div className="sm:col-span-8 relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name, role, phone..."
                value={staffSearch}
                onChange={e => setStaffSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0b5cbe] placeholder:text-slate-400"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={staffFilter}
                onChange={e => setStaffFilter(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0b5cbe] cursor-pointer"
              >
                <option value="all">All Staff ({staffListWithStatus.length})</option>
                <option value="present">Present Today ({presentStaffCount})</option>
                <option value="absent">Not Checked In ({absentStaffCount})</option>
                <option value="absent_2">Absent 2+ Days</option>
                <option value="absent_7">Absent 7+ Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Staff Table / Detailed Cards using horizontal width */}
        <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-1 divide-y divide-slate-100">
          {filteredStaff.length > 0 ? (
            filteredStaff.map((emp: any) => {
              const isPresent = emp.punchedToday;

              return (
                <div 
                  key={emp.id || emp.biometricId || emp.name} 
                  className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50/80 transition-colors"
                >
                  {/* Left: Staff Identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#eaf3ff] text-[#0b5cbe] font-black text-sm flex items-center justify-center shrink-0 border border-[#b9d6f5] shadow-xs">
                      {getInitials(emp.name || 'Staff')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
                        <span>{emp.name || 'Staff Member'}</span>
                        {emp.biometricId && (
                          <span className="text-[9px] font-mono text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                            #{emp.biometricId}
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-slate-400 font-medium truncate flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-slate-600">{emp.phone || 'No Contact'}</span>
                        <span>·</span>
                        <span className="text-slate-500">{emp.branch || 'Mohali, Punjab'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Role Tag */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                      {emp.role || 'Staff'}
                    </span>
                  </div>

                  {/* Right: Live Status & Punch Time */}
                  <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider ${
                      isPresent
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {isPresent ? <CheckCircle2 size={11} className="text-emerald-600" /> : <Clock size={11} className="text-slate-400" />}
                      {isPresent ? 'Present Today' : 'Not Checked In'}
                    </span>
                    <div className="text-[10px] font-semibold text-slate-500">
                      {isPresent ? (
                        <span>Punch: <strong className="font-mono text-slate-800">{formatTimeStr(emp.lastPunchTime)}</strong></span>
                      ) : (
                        <span>Absent: <strong className="font-mono text-slate-800">{emp.absentDays} days</strong></span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Users size={28} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold text-slate-600">No staff members found matching filter</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Adjust your search query or reset filter dropdown</p>
            </div>
          )}
        </div>

        {/* Panel Footer Summary */}
        <div className="border-t border-slate-100 pt-3 mt-2 flex flex-wrap justify-between items-center text-[10.5px] text-slate-500 font-semibold">
          <span>Active Staff Roster: <strong className="text-slate-900">{staffListWithStatus.length} Employees</strong></span>
          <span className="text-[10px] text-slate-400">Tracking started: <strong className="text-slate-600">{SYSTEM_START_DATE}</strong></span>
        </div>

      </div>

      {/* ─── 2. ATTENDANCE CALENDAR (COMPACT PANEL - RIGHT ~35% / 4-5 COLS) ─── */}
      <div className="lg:col-span-5 xl:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full min-h-[460px]">
        
        {/* Header with Title & Navigation Controls */}
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0b5cbe] block flex items-center gap-1.5 font-display">
                <Calendar size={13} /> ATTENDANCE CALENDAR
              </span>
              <h3 className="text-xs font-black text-slate-900 mt-0.5">
                Monthly Attendance Heatmap
              </h3>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg px-2 py-1 outline-none focus:border-[#0b5cbe] cursor-pointer"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>{m.slice(0, 3)}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg px-1.5 py-1 outline-none focus:border-[#0b5cbe] cursor-pointer"
              >
                {[2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <button
                onClick={handleJumpToday}
                className="px-2 py-1 bg-[#eaf3ff] hover:bg-[#d4e7fc] text-[#0b5cbe] font-black text-[9px] uppercase rounded-lg border border-[#b9d6f5] transition-all cursor-pointer"
              >
                Today
              </button>

              <button
                onClick={handlePrevMonth}
                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-[#eaf3ff] text-[#0b5cbe] flex items-center justify-center border border-slate-200 transition-all cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={handleNextMonth}
                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-[#eaf3ff] text-[#0b5cbe] flex items-center justify-center border border-slate-200 transition-all cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* 7-Column Compact Grid */}
          <div className="my-3">
            {/* Weekday Labels Header */}
            <div className="grid grid-cols-7 gap-1 mb-1.5 text-center text-[9.5px] font-black text-slate-400 uppercase tracking-wider">
              <span className="text-rose-600 font-extrabold">Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Calendar Day Cells */}
            <div className="grid grid-cols-7 gap-1 justify-items-center">
              {calendarDays.map((day) => {
                if (day.isOffset) {
                  return <div key={day.key} className="w-full aspect-square bg-transparent" />;
                }

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
                    className={`w-full aspect-square rounded-lg border flex flex-col items-center justify-center relative cursor-pointer transition-all ${cellBg} ${
                      day.isToday ? 'ring-2 ring-[#0b5cbe] ring-offset-1 z-10' : ''
                    } ${isSelected ? 'scale-105 shadow-md border-[#0b5cbe]' : 'hover:scale-105'}`}
                    title={`${day.ymd || ''} — ${day.totalPunches || 0} Punches`}
                  >
                    <span className={`text-[10.5px] leading-none ${day.isSunday ? 'text-rose-600' : ''}`}>
                      {day.dayNum}
                    </span>

                    {(day.totalPunches || 0) > 0 && (
                      <span className="text-[7.5px] font-mono font-black mt-0.5 leading-none opacity-90">
                        {day.totalPunches}p
                      </span>
                    )}

                    {day.isToday && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#0b5cbe]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Day Inspector Popover / Banner */}
        {activeDayObj && (
          <div className="bg-[#f4f8fd] border border-[#b9d7f7] rounded-xl p-2.5 my-2 text-xs">
            <div className="flex items-center justify-between border-b border-[#b9d7f7]/60 pb-1.5">
              <div className="font-extrabold text-slate-900 flex items-center gap-1.5 text-[11px]">
                <span>{new Date(activeDayObj.ymd || todayStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                {activeDayObj.isToday && <span className="bg-[#0b5cbe] text-white text-[7.5px] font-black px-1.5 py-0.2 rounded-full uppercase">Today</span>}
                {activeDayObj.isSunday && <span className="bg-rose-100 text-rose-700 text-[7.5px] font-black px-1.5 py-0.2 rounded-full uppercase">Sun</span>}
              </div>

              <span className="text-[9.5px] font-mono font-black text-slate-700">
                {activeDayObj.isBeforeLaunch ? 'Pre-launch' : `${activeDayObj.totalPunches || 0} punches`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1.5 text-[9px]">
              <div className="bg-white p-1.5 rounded border border-[#d9e7f7]">
                <span className="text-slate-400 font-bold block uppercase text-[7.5px]">Members</span>
                <span className="text-slate-900 font-black text-xs font-mono">{activeDayObj.memberCount || 0}</span>
              </div>
              <div className="bg-white p-1.5 rounded border border-[#d9e7f7]">
                <span className="text-slate-400 font-bold block uppercase text-[7.5px]">Staff</span>
                <span className="text-slate-900 font-black text-xs font-mono">{activeDayObj.staffCount || 0}</span>
              </div>
              <div className="bg-white p-1.5 rounded border border-[#d9e7f7]">
                <span className="text-slate-400 font-bold block uppercase text-[7.5px]">First Punch</span>
                <span className="text-slate-700 font-bold text-[8.5px] font-mono block truncate">
                  {formatTimeStr(activeDayObj.firstCheckIn || null)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Legend Bar */}
        <div className="border-t border-slate-100 pt-2.5 flex flex-wrap items-center justify-between gap-1.5 text-[9.5px] font-bold text-slate-500">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-extrabold uppercase text-[8px]">Heat:</span>
            <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded bg-slate-100 border border-slate-200" /> 0</span>
            <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded bg-[#eaf3ff] border border-[#b9d7f7]" /> 1-5</span>
            <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded bg-[#c6e0ff] border border-[#8cbcf5]" /> 6-15</span>
            <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded bg-[#0b5cbe]" /> 16+</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-rose-600"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Sun</span>
            <span className="flex items-center gap-1 text-[#0b5cbe]"><span className="w-1.5 h-1.5 rounded-full bg-[#0b5cbe]" /> Today</span>
          </div>
        </div>

      </div>

    </div>
  );
}
