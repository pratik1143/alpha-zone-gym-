'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, LogOut, Percent } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format ISO/timestamp → "24 Aug 2026" */
function fmtDate(raw: string | undefined | null): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Format ISO/timestamp → "08:42 AM" */
function fmtTime(raw: string | undefined | null): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
}

/** Calculate attendance % for one log (based on session duration if available) */
function calcPercent(log: any): number {
  const checkIn = log.checkIn || log.timestamp || log.checkInTime;
  const checkOut = log.checkOut || log.checkOutTime;
  if (!checkIn) return 0;
  if (!checkOut) return 100; // still inside → present
  const inMs = new Date(checkIn).getTime();
  const outMs = new Date(checkOut).getTime();
  if (isNaN(inMs) || isNaN(outMs) || outMs <= inMs) return 100;
  const durationMin = (outMs - inMs) / 60000;
  // A standard session is considered 60 min; clamp to 100%
  return Math.min(100, Math.round((durationMin / 60) * 100));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttendanceTab({ member }: { member: any }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const docId      = member?.id        || member?.uid      || member?.memberId || '';
  const memberCode = member?.memberId  || '';
  const bioId      = member?.biometricId || member?.deviceUserId || '';

  // ── Real-time Firestore listener ────────────────────────────────────────────
  useEffect(() => {
    if (!docId && !memberCode && !bioId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsub = onSnapshot(
      collection(db, 'attendance_logs'),
      (snap) => {
        const rawLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        const mPhone = member?.phone ? String(member.phone).replace(/\D/g, '') : '';
        const mName  = String(member?.name || '').trim().toLowerCase();

        const memberLogs = rawLogs.filter((log: any) => {
          if (!log) return false;
          const lMemberId = String(log.memberId || log.memberCode || log.uid || '').trim();
          const lBioId    = String(log.biometricId || log.deviceUserId || log.bioId || '').trim();
          const lPhone    = log.phone ? String(log.phone).replace(/\D/g, '') : '';
          const lName     = String(log.memberName || '').trim().toLowerCase();

          if (docId      && lMemberId === String(docId).trim())      return true;
          if (memberCode && lMemberId === String(memberCode).trim()) return true;
          if (bioId      && lBioId    === String(bioId).trim())      return true;
          if (mPhone     && lPhone    && mPhone === lPhone)           return true;
          if (mName      && lName     && mName  === lName)            return true;
          return false;
        });

        // Newest first
        memberLogs.sort((a: any, b: any) => {
          const ta = new Date(a.checkIn || a.timestamp || a.date || 0).getTime();
          const tb = new Date(b.checkIn || b.timestamp || b.date || 0).getTime();
          return tb - ta;
        });

        setLogs(memberLogs);
        setLoading(false);
      },
      (err) => {
        console.warn('[AttendanceTab] Firestore listener notice:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [docId, memberCode, bioId, member?.phone, member?.name]);

  // ── Row data ────────────────────────────────────────────────────────────────
  const rows = useMemo(() =>
    logs.map(log => {
      const checkInRaw  = log.checkIn    || log.timestamp   || log.checkInTime  || null;
      const checkOutRaw = log.checkOut   || log.checkOutTime || null;
      const isInside    = checkInRaw && !checkOutRaw;
      const pct         = calcPercent(log);
      return { id: log.id, date: checkInRaw, checkIn: checkInRaw, checkOut: checkOutRaw, isInside, pct };
    }),
    [logs]
  );

  // ── Badge helpers ───────────────────────────────────────────────────────────
  const pctBadge = (pct: number) => {
    if (pct >= 100) return { label: '100%',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (pct >= 50)  return { label: `${pct}%`, cls: 'bg-amber-50  text-amber-700  border-amber-200'  };
    return              { label: `${pct}%`, cls: 'bg-rose-50   text-rose-700   border-rose-200'   };
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0">
      {/* ── ATTENDANCE HISTORY CARD ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">

        {/* Card Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-[#0B5CBE] flex items-center justify-center shrink-0">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm leading-tight">Attendance History</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Real-time attendance records</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-extrabold border border-slate-200">
            {loading ? '…' : `${rows.length} Record${rows.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-16 flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
            <div className="w-4 h-4 rounded-full border-2 border-[#0B5CBE] border-t-transparent animate-spin" />
            Loading attendance records…
          </div>
        )}

        {/* Empty state */}
        {!loading && rows.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-300 flex items-center justify-center">
              <Calendar size={24} />
            </div>
            <div>
              <p className="font-extrabold text-slate-700 text-sm">No attendance records yet</p>
              <p className="text-xs text-slate-400 font-medium mt-1 max-w-xs leading-relaxed">
                Attendance records will appear here automatically when this member checks in through the biometric system.
              </p>
            </div>
            <span className="mt-1 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold border border-slate-200">
              Attendance: 0%
            </span>
          </div>
        )}

        {/* ── DESKTOP TABLE ── */}
        {!loading && rows.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-5">
                      <span className="flex items-center gap-1.5"><Calendar size={11} /> Date</span>
                    </th>
                    <th className="py-3 px-4">
                      <span className="flex items-center gap-1.5"><Clock size={11} /> Check-In</span>
                    </th>
                    <th className="py-3 px-4">
                      <span className="flex items-center gap-1.5"><LogOut size={11} /> Check-Out</span>
                    </th>
                    <th className="py-3 px-4">
                      <span className="flex items-center gap-1.5"><Percent size={11} /> Attendance</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const badge = pctBadge(row.pct);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors text-xs font-semibold text-slate-700">
                        <td className="py-3.5 px-5 font-bold text-slate-900">
                          {fmtDate(row.date)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-800">
                          {fmtTime(row.checkIn)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-800">
                          {row.isInside ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Inside Gym
                            </span>
                          ) : fmtTime(row.checkOut)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── MOBILE STACKED CARDS ── */}
            <div className="block md:hidden divide-y divide-slate-100">
              {rows.map((row) => {
                const badge = pctBadge(row.pct);
                return (
                  <div key={row.id} className="px-4 py-3.5 space-y-2">
                    {/* Date + Badge */}
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 text-sm">{fmtDate(row.date)}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    {/* Check-in / Check-out */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Check-In</div>
                        <div className="font-mono font-bold text-slate-900">{fmtTime(row.checkIn)}</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Check-Out</div>
                        <div className="font-mono font-bold text-slate-900">
                          {row.isInside ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Inside
                            </span>
                          ) : fmtTime(row.checkOut)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
