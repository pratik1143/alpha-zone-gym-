// ============================================================
// frontend/src/hooks/useRealtimeDashboard.ts
//
// Real-Time Dashboard Engine — Firestore onSnapshot listeners
// All data updates instantly without page refresh.
//
// ⚡ Uses Firestore when Firebase is configured.
// 📡 Falls back to REST API when Firebase is not yet set up.
// ============================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  collection, onSnapshot, query, where,
  orderBy, limit, Timestamp, getDocs
} from 'firebase/firestore';
import { db, isFirebaseReady } from '@/lib/firebase';
import API from '@/services/api';

export interface LiveActivity {
  id: string;
  type: 'entry' | 'exit' | 'payment' | 'register' | 'trainer';
  msg: string;
  time: string;
  memberName?: string;
  branch?: string;
}

export interface DashboardMetrics {
  // Occupancy
  membersInside: number;
  todayAttendance: number;

  // Revenue
  todayRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  pendingRevenue: number;

  // Members
  totalMembers: number;
  activeMembers: number;
  expiringMembers: number;  // expiring within 30 days
  expiredMembers: number;

  // Activity
  recentActivity: LiveActivity[];

  // Device
  esslOnline: boolean;
  lastSync: string | null;
}

const EMPTY_METRICS: DashboardMetrics = {
  membersInside: 0,
  todayAttendance: 0,
  todayRevenue: 0,
  monthRevenue: 0,
  yearRevenue: 0,
  pendingRevenue: 0,
  totalMembers: 0,
  activeMembers: 0,
  expiringMembers: 0,
  expiredMembers: 0,
  recentActivity: [],
  esslOnline: false,
  lastSync: null,
};

// ─── Helper: format timestamp ────────────────────────────────
function formatTime(ts: any): string {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function isToday(ts: any): boolean {
  if (!ts) return false;
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isThisMonth(ts: any): boolean {
  if (!ts) return false;
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const today = new Date();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

function isThisYear(ts: any): boolean {
  if (!ts) return false;
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.getFullYear() === new Date().getFullYear();
}

function daysUntil(dateStr: string): number {
  const exp = new Date(dateStr);
  const now = new Date();
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Main Hook ────────────────────────────────────────────────
export function useRealtimeDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY_METRICS);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<'firebase' | 'api' | 'none'>('none');

  // ── FIREBASE PATH ──────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseReady || !db) return;

    setSource('firebase');
    const unsubs: (() => void)[] = [];
    let attendance: any[] = [];
    let payments: any[] = [];
    let members: any[] = [];

    const recalculate = () => {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Occupancy
      const membersInside = attendance.filter(a => {
        if (a.checkOut) return false;
        const checkInDate = a.checkIn?.toDate ? a.checkIn.toDate() : new Date(a.checkIn);
        return (Date.now() - checkInDate.getTime()) < 3600000;
      }).length;
      const todayAttendance = attendance.filter(a => isToday(a.checkIn)).length;

      // Revenue
      const todayRevenue = payments
        .filter(p => p.status === 'paid' && isToday(p.createdAt || p.date))
        .reduce((s, p) => s + (p.amount || 0), 0);
      const monthRevenue = payments
        .filter(p => p.status === 'paid' && isThisMonth(p.createdAt || p.date))
        .reduce((s, p) => s + (p.amount || 0), 0);
      const yearRevenue = payments
        .filter(p => p.status === 'paid' && isThisYear(p.createdAt || p.date))
        .reduce((s, p) => s + (p.amount || 0), 0);
      const pendingRevenue = payments
        .filter(p => p.status === 'overdue' || p.status === 'pending')
        .reduce((s, p) => s + (p.amount || 0), 0);

      // Members
      const totalMembers = members.length;
      const activeMembers = members.filter(m => m.status === 'active').length;
      const expiringMembers = members.filter(m => {
        const d = daysUntil(m.expiryDate || '');
        return d >= 0 && d <= 30;
      }).length;
      const expiredMembers = members.filter(m => m.status === 'expired' || daysUntil(m.expiryDate || '') < 0).length;

      // Activity feed from recent attendance
      const recentActivity: LiveActivity[] = attendance
        .sort((a, b) => {
          const ta = a.checkIn?.toDate ? a.checkIn.toDate() : new Date(a.checkIn || 0);
          const tb = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn || 0);
          return tb.getTime() - ta.getTime();
        })
        .slice(0, 10)
        .map(a => ({
          id: a.id,
          type: a.checkOut ? 'exit' : 'entry',
          msg: a.checkOut
            ? `${a.memberName || 'Member'} checked out`
            : `${a.memberName || 'Member'} checked in — ${a.branch || ''} ${a.method ? `(${a.method})` : ''}`.trim(),
          time: formatTime(a.checkIn),
          memberName: a.memberName,
          branch: a.branch,
        }));

      setMetrics({
        membersInside, todayAttendance,
        todayRevenue, monthRevenue, yearRevenue, pendingRevenue,
        totalMembers, activeMembers, expiringMembers, expiredMembers,
        recentActivity,
        esslOnline: false, lastSync: null,
      });
      setIsLoading(false);
    };

    // onSnapshot: attendance (today's records)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const attQ = query(
      collection(db, 'attendance'),
      where('checkIn', '>=', Timestamp.fromDate(todayStart)),
      orderBy('checkIn', 'desc'),
      limit(100)
    );
    unsubs.push(onSnapshot(attQ, snap => {
      attendance = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      recalculate();
    }));

    // onSnapshot: payments
    unsubs.push(onSnapshot(collection(db, 'payments'), snap => {
      payments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      recalculate();
    }));

    // onSnapshot: members
    unsubs.push(onSnapshot(collection(db, 'members'), snap => {
      members = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      recalculate();
    }));

    return () => unsubs.forEach(u => u());
  }, []);

  // ── REST API FALLBACK (when Firebase not configured) ───────
  useEffect(() => {
    if (isFirebaseReady) return;

    setSource('api');
    let cancelled = false;

    const load = async () => {
      try {
        const [att, pay, mem] = await Promise.all([
          API.get('/attendance').then(r => r.data),
          API.get('/payments').then(r => r.data),
          API.get('/members').then(r => r.data),
        ]);

        if (cancelled) return;

        const today = new Date().toISOString().split('T')[0];
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();

        const oneHourAgo = Date.now() - 3600000;
        const membersInside = att.filter((a: any) => {
          if (a.checkOut || !a.checkIn) return false;
          const checkInTime = new Date(a.checkIn).getTime();
          return !isNaN(checkInTime) && checkInTime > oneHourAgo;
        }).length;
        const todayAttendance = att.filter((a: any) => a.checkIn?.startsWith(today)).length;
        const todayRevenue = pay.filter((p: any) => p.date?.startsWith(today) && p.status === 'paid').reduce((s: number, p: any) => s + p.amount, 0);
        const monthRevenue = pay.filter((p: any) => new Date(p.date || '').getMonth() === thisMonth && p.status === 'paid').reduce((s: number, p: any) => s + p.amount, 0);
        const yearRevenue = pay.filter((p: any) => new Date(p.date || '').getFullYear() === thisYear && p.status === 'paid').reduce((s: number, p: any) => s + p.amount, 0);
        const pendingRevenue = pay.filter((p: any) => p.status === 'overdue' || p.status === 'pending').reduce((s: number, p: any) => s + p.amount, 0);

        const recentActivity: LiveActivity[] = att.slice(0, 10).map((a: any) => ({
          id: a.id,
          type: a.checkOut ? 'exit' : 'entry',
          msg: a.checkOut
            ? `${a.memberName || 'Member'} checked out`
            : `${a.memberName || 'Member'} checked in via ${a.method || 'Biometric'}`,
          time: a.checkIn ? new Date(a.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
          memberName: a.memberName,
          branch: a.branch,
        }));

        setMetrics({
          membersInside, todayAttendance,
          todayRevenue, monthRevenue, yearRevenue, pendingRevenue,
          totalMembers: mem.length,
          activeMembers: mem.filter((m: any) => m.status === 'active').length,
          expiringMembers: mem.filter((m: any) => daysUntil(m.expiryDate || '') >= 0 && daysUntil(m.expiryDate || '') <= 30).length,
          expiredMembers: mem.filter((m: any) => m.status === 'expired').length,
          recentActivity,
          esslOnline: false, lastSync: null,
        });
        setIsLoading(false);
      } catch {
        setIsLoading(false);
      }
    };

    load();
    // Poll every 30s as fallback when no real-time listener
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { metrics, isLoading, source };
}
