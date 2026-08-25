'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, X, Save, RefreshCw, Receipt, CheckCircle2, User, CreditCard, AlertCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { PaymentRecord, getISTDateStr } from '@/hooks/useTodaysPayments';
import { formatDate } from '@/lib/utils';
import toast from '@/lib/toast';

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRecord | null;
  onSaved?: () => void;
}

export default function EditPaymentModal({
  isOpen,
  onClose,
  payment,
  onSaved,
}: EditPaymentModalProps) {
  const [transactionDate, setTransactionDate] = useState<string>('');
  const [transactionTime, setTransactionTime] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (payment) {
      // Resolve initial date (YYYY-MM-DD)
      const rawDate = String(payment.transactionDate || payment.paymentDate || payment.date || payment.createdAt || getISTDateStr()).split('T')[0];
      setTransactionDate(rawDate);

      // Resolve initial time (12-hour or 24-hour time format)
      let rawTime = String(payment.transactionTime || payment.paymentTime || payment.time || '');
      if (!rawTime && payment.createdAt && payment.createdAt.includes('T')) {
        try {
          const d = new Date(payment.createdAt);
          if (!isNaN(d.getTime())) {
            rawTime = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
          }
        } catch (e) {
          // ignore
        }
      }
      if (!rawTime) {
        rawTime = '05:30 PM';
      }
      setTransactionTime(rawTime);
      setErrorMsg('');
    }
  }, [payment]);

  if (!isOpen || !payment) return null;

  const handleSave = async () => {
    if (!transactionDate) {
      setErrorMsg('Transaction Date is required.');
      return;
    }
    if (!transactionTime) {
      setErrorMsg('Transaction Time is required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const updates = {
        transactionDate,
        transactionTime,
        paymentDate: transactionDate,
        paymentTime: transactionTime,
        date: transactionDate,
        time: transactionTime,
        updatedAt: new Date().toISOString(),
        isRealTimeToday: false, // Ensure date filtering relies strictly on transactionDate
      };

      // 1. Update Firestore payments document
      if (payment.id) {
        await updateDoc(doc(db, 'payments', payment.id), updates);
      }

      // 2. Also sync to invoices collection if present
      const invoiceId = payment.id || payment.invoiceNumber || payment.invoice;
      if (invoiceId) {
        try {
          await updateDoc(doc(db, 'invoices', String(invoiceId)), updates);
        } catch (e) {
          // Invoice doc might not exist under this exact ID, non-fatal
        }
      }

      toast.success('Bill date & time updated successfully! 🎉');
      if (onSaved) onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg('Failed to update transaction: ' + msg);
      toast.error('Failed to update bill date: ' + msg);
    } finally {
      setIsSaving(false);
    }
  };

  const invNum = payment.invoice || payment.invoiceNumber || 'AZ-INV-000000';
  const memberName = payment.memberName || 'Member';
  const planName = payment.plan || 'Membership';
  const totalAmount = Number(payment.paid) || Number(payment.amount) || 0;
  const payMethod = payment.method || payment.paymentMethod || 'UPI';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => { if (!isSaving) onClose(); }}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg z-10 overflow-hidden text-left"
        >
          {/* Header */}
          <div className="bg-slate-50/80 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-[#0B5CBE] flex items-center justify-center shrink-0">
                <Calendar size={22} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
                  Edit Payment Transaction
                </h3>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">
                  Update the actual payment date and time for this transaction.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5">

            {/* Read-Only Transaction Summary Card */}
            <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="font-mono text-xs font-black text-[#0B5CBE] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                  {invNum}
                </span>
                <span className="text-xs font-black text-slate-900">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">Member</span>
                  <span className="font-bold text-slate-800">{memberName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">Plan / Item</span>
                  <span className="font-bold text-slate-800">{planName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">Payment Method</span>
                  <span className="font-bold text-slate-800">{payMethod}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">Recorded System Date</span>
                  <span className="font-medium text-slate-500 font-mono text-[11px]">
                    {payment.createdAt ? formatDate(payment.createdAt) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Editable Fields Form */}
            <div className="space-y-4">
              
              {/* TRANSACTION DATE */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                  Transaction Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-[#0B5CBE] focus:bg-white transition-all font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Date on which payment actually occurred.
                </p>
              </div>

              {/* TRANSACTION TIME */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                  Transaction Time <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. 05:30 PM or 17:30"
                    value={transactionTime}
                    onChange={(e) => setTransactionTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-[#0B5CBE] focus:bg-white transition-all font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Actual time of payment (e.g. 11:45 AM or 05:30 PM).
                </p>
              </div>

            </div>

            {/* Notice banner regarding createdAt protection */}
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-blue-900 font-medium leading-relaxed">
              <span className="font-extrabold text-[#0B5CBE]">Note:</span> Updating this transaction date will recalculate Today's Collection and historical reports according to the new transaction date. System creation date (<code className="font-mono font-bold">createdAt</code>) will remain untouched for audit history.
            </div>

          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer bg-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#0B5CBE] hover:bg-blue-700 text-white font-extrabold text-xs transition-all cursor-pointer shadow-md flex items-center gap-2 border-none active:scale-95 disabled:opacity-60"
            >
              {isSaving ? (
                <><RefreshCw size={14} className="animate-spin" /> Saving Changes...</>
              ) : (
                <><Save size={14} /> Save Changes</>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
