'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Dumbbell, User, Calendar, CreditCard, DollarSign, 
  CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Smartphone, 
  Banknote, Wallet, Shield, Clock, Award
} from 'lucide-react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { useGymStore } from '@/store';
import API from '@/services/api';
import { resolveAvatarUrl } from '@/lib/avatar';

interface PTBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
  preselectedTrainer?: any;
  onSuccess?: (updatedMember: any) => void;
}

const ptBillingSchema = z.object({
  trainerId: z.string().min(1, 'Please select a trainer'),
  duration: z.string().min(1, 'Please select or enter PT duration'),
  amount: z.number().min(0, 'PT amount must be >= 0'),
  startDate: z.string().min(1, 'Please select start date'),
  expiryDate: z.string().min(1, 'Please select expiry date'),
});

function calculateExpiryDate(startDateStr: string, durationStr: string): string {
  if (!startDateStr) return new Date().toISOString().split('T')[0];
  const d = new Date(startDateStr);
  const dur = durationStr.toLowerCase();

  if (dur.includes('1 month') || dur.includes('30')) {
    d.setMonth(d.getMonth() + 1);
  } else if (dur.includes('3 month') || dur.includes('90')) {
    d.setMonth(d.getMonth() + 3);
  } else if (dur.includes('6 month') || dur.includes('180')) {
    d.setMonth(d.getMonth() + 6);
  } else if (dur.includes('12 month') || dur.includes('1 year') || dur.includes('365')) {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setDate(d.getDate() + 30);
  }

  return d.toISOString().split('T')[0];
}

export default function PtBillingModal({
  isOpen,
  onClose,
  member,
  preselectedTrainer,
  onSuccess,
}: PTBillingModalProps) {
  const { fetchMembers, fetchPayments } = useGymStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form States
  const [selectedTrainer, setSelectedTrainer] = useState<any>(preselectedTrainer || null);
  const [duration, setDuration] = useState('3 Months');
  const [customDuration, setCustomDuration] = useState('');
  const [amount, setAmount] = useState('6000');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');

  // Sync preselected trainer & initial expiry date
  useEffect(() => {
    if (preselectedTrainer) {
      setSelectedTrainer(preselectedTrainer);
    } else if (member?.trainerId) {
      setSelectedTrainer({
        id: member.trainerId,
        name: member.trainerName || member.trainer,
        specialization: member.trainerRole || 'Personal Trainer & Strength',
        avatarUrl: member.trainerAvatar || '',
      });
    }
  }, [preselectedTrainer, member]);

  // Update expiry date whenever start date or duration changes
  useEffect(() => {
    const activeDuration = duration === 'Custom' ? customDuration || '30 Days' : duration;
    const computedExpiry = calculateExpiryDate(startDate, activeDuration);
    setExpiryDate(computedExpiry);
  }, [startDate, duration, customDuration]);

  // Auto-adjust default amount based on duration preset
  const handleDurationPresetChange = (preset: string) => {
    setDuration(preset);
    if (preset === '1 Month') setAmount('2500');
    else if (preset === '3 Months') setAmount('6000');
    else if (preset === '6 Months') setAmount('11000');
    else if (preset === '12 Months') setAmount('20000');
  };

  const validateForm = () => {
    const numAmount = parseFloat(amount) || 0;
    const activeDuration = duration === 'Custom' ? customDuration : duration;
    const tId = selectedTrainer?.id || selectedTrainer?.employeeId || member?.trainerId || '';

    const parseRes = ptBillingSchema.safeParse({
      trainerId: tId,
      duration: activeDuration,
      amount: numAmount,
      startDate,
      expiryDate,
    });

    if (!parseRes.success) {
      const errMap: Record<string, string> = {};
      parseRes.error.issues.forEach((issue) => {
        if (issue.path[0]) errMap[issue.path[0] as string] = issue.message;
      });
      setErrors(errMap);
      return false;
    }

    if (new Date(expiryDate) < new Date(startDate)) {
      setErrors({ expiryDate: 'Expiry date cannot be before the start date' });
      return false;
    }

    setErrors({});
    return true;
  };

  const handleNextStep = () => {
    if (validateForm()) {
      setStep(2);
    } else {
      toast.error('Please fix highlighted errors');
    }
  };

  const handleConfirmPTBilling = async () => {
    if (!member || !member.id || submitting) return;
    setSubmitting(true);
    try {
      const numAmount = parseFloat(amount) || 0;
      const activeDuration = duration === 'Custom' ? customDuration : duration;
      const todayStr = new Date().toISOString().split('T')[0];
      const invoiceNo = `INV-PT-${Math.floor(100000 + Math.random() * 900000)}`;

      const trainerName = selectedTrainer?.name || member?.trainerName || member?.trainer || 'Personal Trainer';
      const trainerId = selectedTrainer?.id || selectedTrainer?.employeeId || member?.trainerId || 'emp_001';
      const trainerRole = selectedTrainer?.specialization || selectedTrainer?.role || 'Personal Trainer & Strength';
      const trainerAvatar = resolveAvatarUrl(selectedTrainer || { name: trainerName });

      // 1. Create SINGLE PT Payment / Billing Record in `payments` collection
      const ptPaymentPayload = {
        memberId: member.id,
        memberName: member.name,
        trainerId,
        trainerName,
        billingType: 'PT',
        packageType: 'PT',
        duration: activeDuration,
        plan: `PT - ${activeDuration}`,
        amount: numAmount,
        paid: numAmount,
        discount: 0,
        netPayable: numAmount,
        paymentMode: paymentMethod,
        method: paymentMethod,
        startDate,
        expiryDate,
        invoiceNo,
        invoiceNumber: invoiceNo,
        transactionType: 'pt_payment',
        isHistorical: false,
        imported: false,
        paymentDate: todayStr,
        status: 'PAID',
        createdAt: new Date().toISOString(),
        date: todayStr,
        isRealTimeToday: true,
      };

      try {
        await addDoc(collection(db, 'payments'), ptPaymentPayload);
      } catch (payErr) {
        console.warn('Direct Firestore payment creation warning, attempting API:', payErr);
        await API.post('/payments', ptPaymentPayload);
      }

      // 2. Update Member Document with Independent PT state
      const ptState = {
        enabled: true,
        trainerId,
        trainerName,
        trainerRole,
        trainerAvatar,
        startDate,
        expiryDate,
        packageName: activeDuration,
        duration: activeDuration,
        amount: numAmount,
        billingId: invoiceNo,
        invoiceNo,
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
      };

      const memberUpdateData = {
        pt: ptState,
        trainerId,
        trainerName,
        trainer: trainerName,
        trainerRole,
        trainerAvatar,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'members', member.id), memberUpdateData);

      // 3. Optimistic memory update
      Object.assign(member, memberUpdateData);

      // 4. Refresh global store & payment ledgers
      fetchMembers();
      fetchPayments();

      if (onSuccess) onSuccess(member);

      toast.success(`🎉 PT Bill ${invoiceNo} generated & ₹${numAmount} added to Today's Collection!`);
      onClose();
    } catch (err: any) {
      toast.error('Failed to create PT bill: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 font-display text-left">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative bg-white rounded-[32px] shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden z-10 text-slate-900 flex flex-col max-h-[90vh]"
        >
          {/* Header Bar */}
          <div className="px-6 py-5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-inner shrink-0">
                <Dumbbell size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg leading-tight">
                  {step === 1 ? 'Create PT Membership & Bill' : 'Review PT Bill Summary'}
                </h3>
                <p className="text-xs text-amber-100 font-medium">
                  {step === 1 ? 'Set trainer duration, pricing, and validity' : 'Confirm payment details for Today\'s Collection'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex items-center justify-center border-none cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content Body */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
            {step === 1 ? (
              <div className="space-y-4 text-xs font-semibold">
                
                {/* Member & Trainer Info Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Member</span>
                    <div className="font-black text-sm text-slate-900 truncate">{member?.name || 'Member'}</div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-amber-600 block mb-1">Selected Trainer</span>
                    <div className="font-black text-sm text-amber-900 truncate">
                      {selectedTrainer?.name || member?.trainerName || member?.trainer || 'Unassigned'}
                    </div>
                  </div>
                </div>

                {/* Duration Presets */}
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    PT Package Duration *
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {['1 Month', '3 Months', '6 Months', '12 Months'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleDurationPresetChange(preset)}
                        className={`py-2.5 px-2 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                          duration === preset
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {duration === 'Custom' && (
                    <input
                      type="text"
                      placeholder="e.g. 45 Days"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                    />
                  )}
                  {errors.duration && (
                    <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.duration}
                    </p>
                  )}
                </div>

                {/* PT Amount & Payment Method */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      PT Amount (₹) *
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        if (errors.amount) setErrors((p) => ({ ...p, amount: '' }));
                      }}
                      placeholder="6000"
                      className={`w-full text-xs bg-slate-50 border rounded-xl px-3 py-2.5 font-mono font-black text-slate-900 focus:outline-none ${
                        errors.amount ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-amber-500'
                      }`}
                    />
                    {errors.amount && (
                      <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> {errors.amount}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      Payment Mode *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="UPI">UPI / QR Code</option>
                      <option value="Cash">Cash Payment</option>
                      <option value="Card">Credit / Debit Card</option>
                      <option value="NetBanking">Net Banking</option>
                    </select>
                  </div>
                </div>

                {/* Start Date & Calculated Expiry Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      PT Start Date *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      PT Expiry Date *
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => {
                        setExpiryDate(e.target.value);
                        if (errors.expiryDate) setErrors((p) => ({ ...p, expiryDate: '' }));
                      }}
                      className={`w-full text-xs bg-slate-50 border rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-none ${
                        errors.expiryDate ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-amber-500'
                      }`}
                    />
                    {errors.expiryDate && (
                      <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> {errors.expiryDate}
                      </p>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              /* Step 2: Summary Confirmation */
              <div className="space-y-4 text-xs font-semibold animate-fade-in">
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                      PT Membership Summary
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                      Ready to Bill
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-black block mb-0.5">Member Name</span>
                      <span className="text-sm font-black text-slate-900">{member?.name}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-black block mb-0.5">Assigned Trainer</span>
                      <span className="text-sm font-black text-amber-900">
                        {selectedTrainer?.name || member?.trainerName || member?.trainer}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-black block mb-0.5">PT Duration</span>
                      <span className="text-xs font-bold text-slate-800">{duration === 'Custom' ? customDuration : duration}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-black block mb-0.5">Validity Range</span>
                      <span className="text-xs font-bold text-slate-800">{startDate} → {expiryDate}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-amber-200 pt-3">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-black block mb-0.5">Billed Amount</span>
                      <span className="text-base font-black font-mono text-amber-700">₹{parseFloat(amount).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-black block mb-0.5">Payment Method</span>
                      <span className="text-xs font-black uppercase text-slate-900">{paymentMethod}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
            {step === 1 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-black uppercase border-none bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black uppercase transition-all border-none cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <span>Next: Review Bill</span> <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-black uppercase border-none bg-transparent cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmPTBilling}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase transition-all border-none cursor-pointer flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  <span>{submitting ? 'Generating PT Bill...' : 'Confirm & Generate PT Bill'}</span>
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
