'use client';

import React, { useState, useEffect } from 'react';
import { X, Dumbbell, Calendar, AlertCircle, DollarSign, User, ShieldCheck, Sparkles } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, query, onSnapshot, setDoc } from 'firebase/firestore';
import { useGymStore } from '@/store';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const PT_PACKAGES = [
  { id: 'pt_4_sessions', name: '4 Sessions PT', sessions: 4, days: 30, price: 3000 },
  { id: 'pt_8_sessions', name: '8 Sessions PT', sessions: 8, days: 30, price: 5500 },
  { id: 'pt_12_sessions', name: '12 Sessions PT', sessions: 12, days: 45, price: 8000 },
  { id: 'pt_16_sessions', name: '16 Sessions PT', sessions: 16, days: 60, price: 10500 },
  { id: 'pt_monthly', name: 'Monthly Unlimited PT', sessions: 24, days: 30, price: 12000 },
  { id: 'pt_quarterly', name: '3 Month Premium PT', sessions: 72, days: 90, price: 30000 },
  { id: 'pt_custom', name: 'Custom PT Package', sessions: 10, days: 30, price: 5000 },
];

const ptBillingSchema = z.object({
  trainerId: z.string().min(1, 'Please select a trainer for PT'),
  ptPackageId: z.string().min(1, 'Please select a PT package'),
  sessionCount: z.number().min(1, 'Sessions must be at least 1'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  originalAmount: z.number().min(0, 'Amount cannot be negative'),
  discount: z.number().min(0, 'Discount cannot be negative'),
  tax: z.number().min(0, 'Tax cannot be negative'),
  amountPaid: z.number().min(0, 'Paid amount cannot be negative'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  notes: z.string().optional(),
}).refine(data => {
  return new Date(data.endDate) >= new Date(data.startDate);
}, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
}).refine(data => {
  const net = Math.max(0, data.originalAmount - data.discount + data.tax);
  return data.amountPaid <= net;
}, {
  message: 'Amount paid cannot exceed net payable amount',
  path: ['amountPaid'],
});

type PtBillingFormData = z.infer<typeof ptBillingSchema>;

export default function PtBillingModal({
  isOpen,
  member,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  member: any;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Real-time trainers query
  useEffect(() => {
    const q = query(collection(db, 'employees'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((emp: any) => {
          const r = String(emp.role || emp.type || '').toLowerCase();
          return r.includes('trainer');
        });
      setTrainers(list);
    });
    return () => unsub();
  }, []);

  const defaultTrainerId = member?.trainerId || (trainers.length > 0 ? trainers[0].id : '');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PtBillingFormData>({
    resolver: zodResolver(ptBillingSchema),
    defaultValues: {
      trainerId: defaultTrainerId,
      ptPackageId: 'pt_12_sessions',
      sessionCount: 12,
      startDate: todayStr,
      endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      originalAmount: 8000,
      discount: 0,
      tax: 0,
      amountPaid: 8000,
      paymentMethod: 'UPI',
      notes: '',
    },
  });

  const selectedTrainerId = watch('trainerId');
  const selectedPackageId = watch('ptPackageId');
  const originalAmount = watch('originalAmount') || 0;
  const discount = watch('discount') || 0;
  const tax = watch('tax') || 0;
  const amountPaid = watch('amountPaid') || 0;

  const calculatedNet = Math.max(0, originalAmount - discount + tax);

  // Set defaults when package changes
  const handlePackageChange = (pkgId: string) => {
    setValue('ptPackageId', pkgId);
    const found = PT_PACKAGES.find(p => p.id === pkgId);
    if (found) {
      setValue('sessionCount', found.sessions);
      setValue('originalAmount', found.price);
      setValue('amountPaid', found.price);
      const st = watch('startDate') || todayStr;
      const endDt = new Date(st);
      endDt.setDate(endDt.getDate() + found.days);
      setValue('endDate', endDt.toISOString().split('T')[0]);
    }
  };

  const handleSavePtBill = async (data: PtBillingFormData) => {
    if (!member) return;
    setIsSubmitting(true);

    try {
      const selectedTrainer = trainers.find(t => t.id === data.trainerId || t.employeeId === data.trainerId);
      const trainerName = selectedTrainer ? selectedTrainer.name : (member.trainerName || member.trainer || 'Assigned Trainer');
      const selectedPkg = PT_PACKAGES.find(p => p.id === data.ptPackageId);
      const pkgName = selectedPkg ? selectedPkg.name : `${data.sessionCount} Sessions PT`;

      const invoiceNum = `INV-PT-${Date.now().toString().slice(-6)}`;
      const docId = `inv_pt_${Date.now()}`;

      const netPay = Math.max(0, data.originalAmount - data.discount + data.tax);
      const memberDocId = member.id || member.uid || member.memberId;

      const newPtPayment = {
        id: docId,
        invoiceNumber: invoiceNum,
        invoice: invoiceNum,
        billingType: 'pt',
        memberId: memberDocId,
        memberName: member.name,
        memberPhone: member.phone || '',
        trainerId: data.trainerId,
        trainerName: trainerName,
        ptPackageId: data.ptPackageId,
        package: pkgName,
        plan: `Personal Training: ${pkgName} (Trainer: ${trainerName})`,
        sessionCount: data.sessionCount,
        usedSessions: 0,
        remainingSessions: data.sessionCount,
        startDate: data.startDate,
        expiryDate: data.endDate,
        ptStartDate: data.startDate,
        ptEndDate: data.endDate,
        originalAmount: data.originalAmount,
        discountAmount: data.discount,
        taxAmount: data.tax,
        netPayable: netPay,
        amount: netPay,
        amountPaid: data.amountPaid,
        paid: data.amountPaid,
        method: data.paymentMethod,
        paymentMethod: data.paymentMethod,
        status: data.amountPaid >= netPay ? 'paid' : (data.amountPaid > 0 ? 'partial' : 'pending'),
        date: todayStr,
        notes: data.notes || '',
        createdAt: new Date().toISOString(),
      };

      // 1. Save document to Firestore payments collection
      await setDoc(doc(db, 'payments', docId), newPtPayment);

      // 2. Append to member's ptHistory and update member record
      const existingPtHistory = Array.isArray(member.ptHistory) ? member.ptHistory : [];
      const updatedPtHistory = [newPtPayment, ...existingPtHistory];

      const newTotalBilled = (Number(member.totalBilled) || 0) + netPay;
      const newTotalPaid = (Number(member.totalPaid) || 0) + data.amountPaid;

      await updateDoc(doc(db, 'members', memberDocId), {
        ptHistory: updatedPtHistory,
        ptTrainerId: data.trainerId,
        ptTrainerName: trainerName,
        trainerId: member.trainerId || data.trainerId,
        trainerName: member.trainerName || trainerName,
        trainer: member.trainer || trainerName,
        totalBilled: newTotalBilled,
        totalPaid: newTotalPaid,
        outstandingBalance: Math.max(0, newTotalBilled - newTotalPaid),
        updatedAt: new Date().toISOString(),
      });

      toast.success(`⚡ Personal Training bill ${invoiceNum} generated successfully!`);

      // Refresh Store
      const { fetchPayments, fetchMembers } = useGymStore.getState();
      await fetchPayments(true);
      await fetchMembers(true);

      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      toast.error('Failed to generate PT Bill: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in text-slate-900 text-left font-sans">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-6 border border-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
              <Dumbbell size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Create Personal Training (PT) Bill</h3>
              <p className="text-xs text-slate-500 font-medium">Issue a dedicated Personal Training invoice for {member?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 border-none bg-transparent cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleSavePtBill)} className="space-y-4">
          {/* Trainer Selection */}
          <div>
            <label className="font-extrabold text-slate-700 block mb-1 text-xs">
              Select PT Trainer *
            </label>
            <select
              {...register('trainerId')}
              className={`w-full px-3.5 py-2.5 bg-white border rounded-xl font-extrabold text-xs text-slate-900 focus:outline-none ${
                errors.trainerId ? 'border-red-500 bg-red-50/30' : 'border-slate-300 focus:border-indigo-500'
              }`}
            >
              <option value="">-- Select Personal Trainer --</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.specialization || 'PT Trainer'} - {t.employeeId || 'EMP'})
                </option>
              ))}
            </select>
            {errors.trainerId && (
              <p className="mt-1 text-[11px] font-bold text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.trainerId.message}
              </p>
            )}
          </div>

          {/* PT Package Selection */}
          <div>
            <label className="font-extrabold text-slate-700 block mb-1 text-xs">
              Select PT Package *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PT_PACKAGES.map((pkg) => {
                const isSelected = selectedPackageId === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => handlePackageChange(pkg.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="font-black text-xs text-slate-900">{pkg.name}</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">{pkg.sessions} Sessions</div>
                    <div className="text-xs font-black text-amber-700 mt-1 font-mono">₹{pkg.price.toLocaleString('en-IN')}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sessions & Start/End Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-extrabold text-slate-700 block mb-1 text-xs">Total Sessions *</label>
              <input
                type="number"
                {...register('sessionCount', { valueAsNumber: true })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:outline-none"
              />
              {errors.sessionCount && (
                <p className="mt-1 text-[11px] font-bold text-red-500">{errors.sessionCount.message}</p>
              )}
            </div>

            <div>
              <label className="font-extrabold text-slate-700 block mb-1 text-xs">Start Date *</label>
              <input
                type="date"
                {...register('startDate')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:outline-none"
              />
              {errors.startDate && (
                <p className="mt-1 text-[11px] font-bold text-red-500">{errors.startDate.message}</p>
              )}
            </div>

            <div>
              <label className="font-extrabold text-slate-700 block mb-1 text-xs">End Date *</label>
              <input
                type="date"
                {...register('endDate')}
                className={`w-full px-3 py-2 bg-white border rounded-xl font-bold text-xs text-slate-900 focus:outline-none ${
                  errors.endDate ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                }`}
              />
              {errors.endDate && (
                <p className="mt-1 text-[11px] font-bold text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Financial Fields */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Financial Breakdown</h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-extrabold text-slate-600 block mb-1 text-[11px]">Original (₹)</label>
                <input
                  type="number"
                  {...register('originalAmount', { valueAsNumber: true })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-600 block mb-1 text-[11px]">Discount (₹)</label>
                <input
                  type="number"
                  {...register('discount', { valueAsNumber: true })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs text-emerald-600"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-600 block mb-1 text-[11px]">Tax (₹)</label>
                <input
                  type="number"
                  {...register('tax', { valueAsNumber: true })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs text-slate-700"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1 text-[11px]">Net Payable</label>
                <div className="px-3 py-2 bg-slate-200/70 border border-slate-300 rounded-xl font-mono font-black text-xs text-slate-900">
                  ₹{calculatedNet.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1 text-xs">Amount Paid (₹) *</label>
                <input
                  type="number"
                  {...register('amountPaid', { valueAsNumber: true })}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl font-mono font-black text-sm text-emerald-600 focus:outline-none ${
                    errors.amountPaid ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                  }`}
                />
                {errors.amountPaid && (
                  <p className="mt-1 text-[11px] font-bold text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.amountPaid.message}
                  </p>
                )}
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1 text-xs">Payment Method *</label>
                <select
                  {...register('paymentMethod')}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-900"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black transition-all border-none cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <Dumbbell size={16} />
              <span>{isSubmitting ? 'Generating PT Bill...' : 'Generate PT Bill'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
