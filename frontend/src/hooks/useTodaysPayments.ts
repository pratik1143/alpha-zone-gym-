'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from '@/store';
import { migrateMissingBillingPhones } from '@/lib/migrations/migrateBillingPhones';

// ─── IST-aware today string (YYYY-MM-DD in Asia/Kolkata timezone) ───────────
export function getISTDateStr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export interface PaymentRecord {
  id: string;
  invoice?: string;
  invoiceNumber?: string;
  memberId?: string;
  memberName?: string;
  memberPhone?: string;
  plan?: string;
  amount?: number;
  paid?: number;
  amountPaid?: number;
  pendingAmount?: number;
  status?: string;
  paymentStatus?: string;
  method?: string;
  paymentMethod?: string;
  transactionDate?: string;
  transactionTime?: string;
  date?: string;
  paymentDate?: string;
  time?: string;
  paymentTime?: string;
  createdAt?: string;
  updatedAt?: string;
  editedBy?: string;
  isHistorical?: boolean;
  imported?: boolean;
  isLegacyImport?: boolean;
  transactionType?: string;
  isSample?: boolean;
  isMock?: boolean;
  isRealTimeToday?: boolean;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  isDuplicate?: boolean;
  [key: string]: unknown;
}

export interface MethodTotals {
  UPI: { total: number; count: number };
  Cash: { total: number; count: number };
  Card: { total: number; count: number };
  'Net Banking': { total: number; count: number };
}

export interface UseTodaysPaymentsResult {
  /** All non-deleted, non-void payment records from Firestore (live) */
  allPayments: PaymentRecord[];
  /** Only today's (IST) paid, non-deleted, non-historical payments */
  todaysPayments: PaymentRecord[];
  /** Sum of today's paid amounts */
  todaysTotal: number;
  /** Per-method totals for today's payments only */
  todayMethodTotals: MethodTotals;
  /** All-time total revenue (non-deleted paid payments) */
  allTimeTotal: number;
  /** Count of pending/overdue non-deleted payments */
  pendingCount: number;
  /** IST today string (YYYY-MM-DD) */
  todayStr: string;
  /** Whether the Firestore listener is still loading */
  loading: boolean;
  /** Soft-delete a payment. Returns true on success. */
  deletePayment: (payment: PaymentRecord) => Promise<boolean>;
  /** Update transaction date and time for a payment record. */
  updatePaymentDateTime: (paymentId: string, transactionDate: string, transactionTime: string) => Promise<boolean>;
}

/**
 * useTodaysPayments — single source of truth for all financial KPIs.
 *
 * One Firestore onSnapshot listener; IST-correct date; shared by
 * Overview, Dashboard, and Billing pages.
 */
export function useTodaysPayments(): UseTodaysPaymentsResult {
  const { user } = useAuthStore();
  const [rawPayments, setRawPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Stable IST today string — computed once per mount (refreshes on page load)
  const todayStr = useMemo(() => getISTDateStr(), []);

  // ── Live Firestore listener & automatic data relation repair ──────────────
  useEffect(() => {
    // Run safe migration once in background to repair any existing records missing memberPhone
    migrateMissingBillingPhones().catch((err) => {
      console.warn('[useTodaysPayments] background phone migration notice:', err);
    });

    let unsub: (() => void) | undefined;
    try {
      unsub = onSnapshot(
        collection(db, 'payments'),
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));
          setRawPayments(docs);
          setLoading(false);
        },
        (err) => {
          console.warn('[useTodaysPayments] listener error:', err);
          setLoading(false);
        }
      );
    } catch (err) {
      console.warn('[useTodaysPayments] failed to attach:', err);
      setLoading(false);
    }
    return () => { if (unsub) unsub(); };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const resolveAmount = (p: PaymentRecord): number => {
    const val =
      p.amountPaid !== undefined ? p.amountPaid :
      p.paid      !== undefined ? p.paid :
      (p.amount ?? 0);
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  };

  const resolveMethod = (p: PaymentRecord): keyof MethodTotals => {
    const m = String(p.method || p.paymentMethod || '').toLowerCase();
    if (m.includes('cash')) return 'Cash';
    if (m.includes('card')) return 'Card';
    if (m.includes('net') || m.includes('bank')) return 'Net Banking';
    return 'UPI';
  };

  const isHistoricalPayment = (p: PaymentRecord): boolean =>
    p.isHistorical === true ||
    p.imported === true ||
    p.isLegacyImport === true ||
    p.transactionType === 'historical_import';

  // ── Derived memos ─────────────────────────────────────────────────────────

  // All active (non-deleted, non-void, non-duplicate) payments
  const allPayments = useMemo<PaymentRecord[]>(() =>
    rawPayments.filter((p) =>
      p &&
      p.deleted !== true &&
      p.isDuplicate !== true &&
      (p.status || '').toLowerCase() !== 'void'
    ),
    [rawPayments]
  );

  // Today's valid paid payments (IST transactionDate, non-historical, non-sample)
  const todaysPayments = useMemo<PaymentRecord[]>(() => {
    const seen = new Set<string>();
    return allPayments.filter((p) => {
      if (p.isSample || p.isMock) return false;
      if (isHistoricalPayment(p)) return false;

      const status = String(p.status || p.paymentStatus || '').toLowerCase();
      if (status !== 'paid' && status !== 'partial') return false;

      // Strict IST date match on canonical invoiceDate (invoiceDate / billingDate / date / paymentDate / transactionDate)
      const pDate = String(p.invoiceDate || p.billingDate || p.date || p.paymentDate || p.transactionDate || '').split('T')[0];
      if (pDate !== todayStr) return false;

      // Deduplicate by ID
      const key = String(p.id || p.invoice || p.invoiceNumber || '').trim();
      if (key && seen.has(key)) return false;
      if (key) seen.add(key);

      return true;
    });
  }, [allPayments, todayStr]);

  const todaysTotal = useMemo<number>(
    () => todaysPayments.reduce((sum, p) => sum + resolveAmount(p), 0),
    [todaysPayments]
  );

  const todayMethodTotals = useMemo<MethodTotals>(() => {
    const counts: MethodTotals = {
      UPI:           { total: 0, count: 0 },
      Cash:          { total: 0, count: 0 },
      Card:          { total: 0, count: 0 },
      'Net Banking': { total: 0, count: 0 },
    };
    todaysPayments.forEach((p) => {
      const key = resolveMethod(p);
      counts[key].total += resolveAmount(p);
      counts[key].count += 1;
    });
    return counts;
  }, [todaysPayments]);

  const allTimeTotal = useMemo<number>(
    () => allPayments
      .filter((p) => (p.status || '').toLowerCase() === 'paid')
      .reduce((sum, p) => sum + resolveAmount(p), 0),
    [allPayments]
  );

  const pendingCount = useMemo<number>(
    () => allPayments.filter((p) => {
      const s = (p.status || '').toLowerCase();
      return s === 'pending' || s === 'overdue';
    }).length,
    [allPayments]
  );

  // ── Soft Delete ───────────────────────────────────────────────────────────
  const deletePayment = async (payment: PaymentRecord): Promise<boolean> => {
    if (!payment?.id) return false;
    try {
      await updateDoc(doc(db, 'payments', payment.id), {
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: user?.uid || user?.email || 'unknown',
      });
      return true;
    } catch (err) {
      console.error('[useTodaysPayments] deletePayment failed:', err);
      return false;
    }
  };

  // ── Update Payment Date & Time ─────────────────────────────────────────────
  const updatePaymentDateTime = async (paymentId: string, transactionDate: string, transactionTime: string): Promise<boolean> => {
    if (!paymentId || !transactionDate) return false;
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        invoiceDate: transactionDate,
        billingDate: transactionDate,
        date: transactionDate,
        paymentDate: transactionDate,
        transactionDate: transactionDate,
        transactionTime: transactionTime || '12:00 PM',
        paymentTime: transactionTime || '12:00 PM',
        time: transactionTime || '12:00 PM',
        updatedAt: new Date().toISOString(),
        editedBy: user?.uid || user?.email || 'admin',
      });
      return true;
    } catch (err) {
      console.error('[useTodaysPayments] updatePaymentDateTime failed:', err);
      return false;
    }
  };

  return {
    allPayments,
    todaysPayments,
    todaysTotal,
    todayMethodTotals,
    allTimeTotal,
    pendingCount,
    todayStr,
    loading,
    deletePayment,
    updatePaymentDateTime,
  };
}
