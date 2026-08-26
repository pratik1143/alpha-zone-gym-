'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowRight, ArrowLeft, Check, Sparkles, CheckCircle2,
  Calendar, CreditCard, User, Receipt, ChevronRight,
  AlertCircle, Tag, Percent, Banknote, Clock, Star,
  Eye, Printer
} from 'lucide-react';
import { useGymStore } from '@/store';
import { formatCurrency } from '@/lib/utils';
import { membershipEngine } from '@/lib/engines/membershipEngine';
import API from '@/services/api';
import toast from '@/lib/toast';
import MemberAvatar from '../../follow-up/components/MemberAvatar';
import OfficialInvoiceReceipt from '../../components/OfficialInvoiceReceipt';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RenewalWizardProps {
  isOpen: boolean;
  member: any;
  onClose: () => void;
  onSuccess?: (updatedMember: any) => void;
}

interface PlanOption {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  durationMonths: number;
  desc: string;
  isCustom?: boolean;
}

type PaymentStatus = 'Paid' | 'Partial' | 'Pending';
type Step = 1 | 2 | 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function addMonthsToDate(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  // If day overflows (e.g. Jan 31 + 1 month = Feb 28), Date handles it automatically
  return d.toISOString().split('T')[0];
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function getStatusBadgeClass(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'active') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'expired') return 'bg-red-100 text-red-700 border-red-200';
  if (s === 'expiring') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (s === 'frozen') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
const ConfettiAnimation = () => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  const particles = useMemo(() =>
    Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      color: colors[i % colors.length],
      x: (Math.random() - 0.5) * 500,
      y: -(Math.random() * 400 + 100),
      scale: Math.random() * 0.8 + 0.3,
      rotation: Math.random() * 720 - 360,
    })), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center z-40">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 100, scale: 0, rotate: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: p.scale, rotate: p.rotation, opacity: [1, 1, 0.5, 0] }}
          transition={{ duration: 2.4, ease: 'easeOut' }}
          className="absolute w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  );
};

// ─── Progress Indicator ───────────────────────────────────────────────────────
const ProgressBar = ({ step }: { step: Step }) => {
  const steps = [
    { n: 1, label: 'Plan' },
    { n: 2, label: 'Details' },
    { n: 3, label: 'Review' },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-1">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
              step > s.n
                ? 'bg-blue-600 border-blue-600 text-white'
                : step === s.n
                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'bg-white border-slate-200 text-slate-400'
            }`}>
              {step > s.n ? <Check size={12} /> : s.n}
            </div>
            <span className={`text-[9px] font-bold mt-1 uppercase tracking-wider ${step >= s.n ? 'text-blue-600' : 'text-slate-400'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-12 mx-1 mb-4 rounded-full transition-all ${step > s.n ? 'bg-blue-600' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RenewalWizardModal({ isOpen, member, onClose, onSuccess }: RenewalWizardProps) {
  const { addPayment, updateMember, fetchMembers, plans, fetchPlans } = useGymStore();

  // Load plans from DB
  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const today = getTodayStr();

  // Build plan list from DB + fallbacks
  const availablePlans = useMemo<PlanOption[]>(() => {
    const dbPlans: PlanOption[] = (plans && plans.length > 0 ? plans : [
      { id: '1m', name: '1 Month Standard', price: 2500, durationDays: 30, features: [] },
      { id: '3m', name: '3 Months Pro', price: 6500, durationDays: 90, features: [] },
      { id: '6m', name: '6 Months Elite', price: 11500, durationDays: 180, features: [] },
      { id: '12m', name: '12 Months VIP', price: 18000, durationDays: 365, features: [] },
    ]).map((p: any) => ({
      id: p.id || p.name,
      name: p.name,
      price: Number(p.price) || 0,
      durationDays: Number(p.durationDays) || 30,
      durationMonths: Math.round((Number(p.durationDays) || 30) / 30),
      desc: Array.isArray(p.features) && p.features.length > 0
        ? p.features[0]
        : `${p.durationDays || 30} days access`,
    }));

    return [
      ...dbPlans,
      {
        id: 'custom',
        name: 'Custom Plan',
        price: 0,
        durationDays: 30,
        durationMonths: 1,
        desc: 'Enter custom pricing and duration',
        isCustom: true,
      },
    ];
  }, [plans]);

  // ─── Step 1 State ─────────────────────────────────────────────────────────
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [customPrice, setCustomPrice] = useState(3000);
  const [customDurationMonths, setCustomDurationMonths] = useState(1);

  // Auto-select current member plan on open
  useEffect(() => {
    if (!isOpen || !member) return;
    const match = availablePlans.find(p =>
      p.name.toLowerCase() === (member.plan || '').toLowerCase() ||
      p.id === member.plan
    );
    setSelectedPlanId(match?.id || availablePlans[0]?.id || '');
  }, [isOpen, member, availablePlans]);

  // ─── Step 2 State ─────────────────────────────────────────────────────────
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isExpiryManuallyEdited, setIsExpiryManuallyEdited] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState('');

  // ─── Step navigation ──────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completeDone, setCompleteDone] = useState(false);
  const [generatedInvoiceData, setGeneratedInvoiceData] = useState<any>(null);
  const [generatedInvoiceNumber, setGeneratedInvoiceNumber] = useState('');
  const [renewedMember, setRenewedMember] = useState<any>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);

  // Reset on open/close
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setCompleteDone(false);
    setIsSubmitting(false);
    setGeneratedInvoiceData(null);
    setGeneratedInvoiceNumber('');
    setRenewedMember(null);
    setShowInvoicePreview(false);
    setInvoiceDate(today);
    setDiscountAmount(0);
    setTaxAmount(0);
    setPaymentMethod('Cash');
    setPaymentStatus('Paid');
    setNotes('');
    setIsExpiryManuallyEdited(false);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Derived plan values ──────────────────────────────────────────────────
  const selectedPlan = useMemo(
    () => availablePlans.find(p => p.id === selectedPlanId) || availablePlans[0],
    [availablePlans, selectedPlanId]
  );

  const isCustom = selectedPlan?.isCustom === true;
  const baseAmount = isCustom ? customPrice : (selectedPlan?.price || 0);
  const planDurationDays = isCustom
    ? customDurationMonths * 30
    : (selectedPlan?.durationDays || 30);

  // ─── Start date default: day after current expiry if still active, else today ──
  const defaultStartDate = useMemo(() => {
    if (!member) return today;
    const expiry = member.expiryDate;
    if (expiry && expiry >= today) {
      return addDaysToDate(expiry, 1);
    }
    return today;
  }, [member, today]);

  // Initialize start date when plan changes or modal opens
  useEffect(() => {
    if (!isOpen) return;
    setStartDate(defaultStartDate);
    setIsExpiryManuallyEdited(false);
  }, [isOpen, defaultStartDate]);

  // Recalculate expiry when startDate or plan changes (unless manually edited)
  useEffect(() => {
    if (isExpiryManuallyEdited) return;
    if (!startDate) return;
    // Use membershipEngine first, fall back to local calculation
    const planName = isCustom
      ? `${customDurationMonths} Months`
      : (selectedPlan?.name || '');
    const computed = membershipEngine.calculatePlanExpiryDate(planName, startDate, plans);
    if (computed && computed !== startDate) {
      setExpiryDate(computed);
    } else {
      // fallback: add durationDays
      setExpiryDate(addDaysToDate(startDate, planDurationDays - 1));
    }
  }, [startDate, selectedPlanId, isCustom, customDurationMonths, planDurationDays, plans, isExpiryManuallyEdited, selectedPlan]);

  // ─── Financial calculation ────────────────────────────────────────────────
  const clampedDiscount = Math.max(0, Math.min(discountAmount, baseAmount));
  const netPayable = Math.max(0, baseAmount - clampedDiscount + taxAmount);

  useEffect(() => {
    if (paymentStatus === 'Paid') {
      setAmountPaid(netPayable);
    } else if (paymentStatus === 'Pending') {
      setAmountPaid(0);
    }
    // Partial: keep whatever user typed, but clamp on save
  }, [paymentStatus, netPayable]);

  const clampedAmountPaid = Math.min(Math.max(0, amountPaid), netPayable);
  const pendingAmount = Math.max(0, netPayable - clampedAmountPaid);

  // ─── Validation ───────────────────────────────────────────────────────────
  const step1Valid = !!selectedPlanId;
  const step2Valid = !!(
    startDate && expiryDate &&
    expiryDate > startDate &&
    paymentMethod && paymentStatus &&
    clampedDiscount >= 0 &&
    taxAmount >= 0 &&
    clampedAmountPaid >= 0 &&
    clampedAmountPaid <= netPayable
  );

  // ─── Navigation ───────────────────────────────────────────────────────────
  const goNext = () => {
    if (step === 1 && !step1Valid) { toast.error('Please select a plan.'); return; }
    if (step === 2 && !step2Valid) { toast.error('Please fill all required fields correctly.'); return; }
    if (step < 3) setStep(prev => (prev + 1) as Step);
  };

  const goBack = () => {
    if (step > 1) setStep(prev => (prev - 1) as Step);
  };

  // ─── CONFIRM RENEWAL — the only backend call ──────────────────────────────
  const handleConfirmRenewal = useCallback(async () => {
    if (isSubmitting) return;
    if (!step2Valid) { toast.error('Please go back and fill all required fields.'); return; }

    setIsSubmitting(true);
    const invoiceNum = `INV-${Math.floor(100000 + Math.random() * 900000)}`;

    const payload = {
      plan: isCustom ? `Custom (${customDurationMonths}m)` : selectedPlan?.name,
      startDate,
      expiryDate,
      baseAmount,
      discountAmount: clampedDiscount,
      taxAmount,
      netPayable,
      amountPaid: clampedAmountPaid,
      pendingAmount,
      paymentMethod,
      paymentStatus,
      invoiceDate,
      notes,
      invoiceNumber: invoiceNum,
    };

    try {
      // Call the new dedicated atomic renewal endpoint
      let response: any;
      try {
        const res = await API.post(`/members/${member.id}/renew`, payload);
        response = res.data;
      } catch (apiErr: any) {
        // Fallback: use store methods (direct Firestore write)
        console.warn('[Renewal] API endpoint unavailable, using store fallback:', apiErr.message);

        const invoiceData = {
          memberId: member.id,
          memberName: member.name,
          memberPhone: member.phone || '',
          invoiceType: 'MEMBERSHIP',
          billingType: 'MEMBERSHIP',
          transactionType: 'membership_renewal',
          plan: payload.plan,
          packageName: payload.plan,
          originalAmount: baseAmount,
          baseAmount,
          discountAmount: clampedDiscount,
          discount: clampedDiscount,
          taxAmount,
          tax: taxAmount,
          netPayable,
          amount: netPayable,
          amountPaid: clampedAmountPaid,
          paid: clampedAmountPaid,
          pendingAmount,
          outstandingAmount: pendingAmount,
          paymentMethod,
          method: paymentMethod,
          paymentStatus,
          status: paymentStatus,
          invoiceDate,
          billingDate: invoiceDate,
          date: invoiceDate,
          paymentDate: invoiceDate,
          transactionDate: invoiceDate,
          membershipStartDate: startDate,
          startDate,
          membershipExpiryDate: expiryDate,
          expiryDate,
          invoiceNumber: invoiceNum,
          invoice: invoiceNum,
          notes,
          isHistorical: false,
          imported: false,
          isRenewal: true,
          createdAt: new Date().toISOString(),
        };

        await addPayment(invoiceData);

        const existingHistory = Array.isArray(member.membershipHistory) ? member.membershipHistory : [];
        const historyEntry = {
          packageName: payload.plan,
          startDate,
          expiryDate,
          amount: netPayable,
          amountPaid: clampedAmountPaid,
          pendingAmount,
          paymentMethod,
          paymentStatus,
          discount: clampedDiscount,
          tax: taxAmount,
          invoiceNumber: invoiceNum,
          invoiceDate,
          renewedAt: new Date().toISOString(),
          notes,
        };

        await updateMember(member.id, {
          plan: payload.plan,
          price: baseAmount,
          amount: netPayable,
          totalBilled: (Number(member.totalBilled) || 0) + netPayable,
          totalPaid: (Number(member.totalPaid) || 0) + clampedAmountPaid,
          outstandingBalance: pendingAmount,
          startDate,
          expiryDate,
          status: 'active',
          paymentStatus,
          membershipHistory: [historyEntry, ...existingHistory],
          updatedAt: new Date().toISOString(),
        });

        response = { success: true, invoiceNumber: invoiceNum };
      }

      // Update local member state for the success screen
      const updatedMemberLocal = {
        ...member,
        plan: payload.plan,
        expiryDate,
        startDate,
        status: 'active',
        paymentStatus,
      };

      setGeneratedInvoiceNumber(response.invoiceNumber || invoiceNum);
      setRenewedMember(response.member || updatedMemberLocal);
      setGeneratedInvoiceData({
        ...payload,
        memberId: member.id,
        memberName: member.name,
        memberPhone: member.phone || '',
        invoiceNumber: response.invoiceNumber || invoiceNum,
        invoice: response.invoiceNumber || invoiceNum,
        amount: netPayable,
        paid: clampedAmountPaid,
        discount: clampedDiscount,
        status: paymentStatus.toLowerCase(),
        method: paymentMethod,
        expiryDate,
        startDate,
      });

      setCompleteDone(true);
      fetchMembers();
      if (onSuccess) onSuccess(response.member || updatedMemberLocal);
      toast.success(`🎉 Membership renewed! New expiry: ${fmtDate(expiryDate)}`);
    } catch (err: any) {
      toast.error('Renewal could not be completed. No changes were saved. (' + (err?.response?.data?.error || err.message) + ')');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting, step2Valid, isCustom, customDurationMonths, selectedPlan,
    startDate, expiryDate, baseAmount, clampedDiscount, taxAmount, netPayable,
    clampedAmountPaid, pendingAmount, paymentMethod, paymentStatus, invoiceDate, notes,
    member, addPayment, updateMember, fetchMembers, onSuccess,
  ]);

  if (!isOpen || !member) return null;

  const planName = isCustom ? `Custom (${customDurationMonths} Month${customDurationMonths > 1 ? 's' : ''})` : selectedPlan?.name || '';

  const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Net Banking', 'Other'];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      {/* Backdrop — does NOT close modal */}
      <div className="absolute inset-0" />

      <motion.div
        initial={{ scale: 0.96, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 16, opacity: 0 }}
        className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-[28px] shadow-2xl z-10 overflow-hidden text-left flex flex-col max-h-[95vh]"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        {!completeDone && (
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                  Step {step} of 3
                </span>
                <h3 className="text-base font-black text-slate-900 leading-tight mt-0.5">
                  {step === 1 ? 'Membership Renewal' : step === 2 ? 'Renewal Details' : 'Review Renewal'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border-none cursor-pointer bg-transparent"
              >
                <X size={16} />
              </button>
            </div>
            <ProgressBar step={step} />
          </div>
        )}

        {/* ── Scrollable Content ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ════════════════════════════════════════════════════════════════
                STEP 1 — CHOOSE PLAN
            ════════════════════════════════════════════════════════════════ */}
            {step === 1 && !completeDone && (
              <motion.div
                key="step1"
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -30, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-6 space-y-5"
              >
                {/* Member Info Card */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center gap-4">
                  <MemberAvatar
                    photoUrl={member.photo || member.avatarUrl || member.avatar}
                    gender={member.gender}
                    name={member.name}
                    size={56}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 text-sm truncate">{member.name}</div>
                    <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      #{member.memberId || member.id} &nbsp;·&nbsp; {member.phone || '—'}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                        {member.plan || 'Standard'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Expires: <span className="font-bold text-slate-700">{fmtDate(member.expiryDate)}</span>
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${getStatusBadgeClass(member.status)}`}>
                        {member.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plan grid */}
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
                    Choose Membership Plan
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-0.5">
                    {availablePlans.map(p => {
                      const isSelected = selectedPlanId === p.id;
                      const isCurrent = !p.isCustom &&
                        p.name.toLowerCase() === (member.plan || '').toLowerCase();

                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPlanId(p.id)}
                          className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-500/10'
                              : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                          }`}
                        >
                          {isCurrent && (
                            <span className="absolute top-2 right-2 text-[8px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full uppercase">
                              Current
                            </span>
                          )}
                          <div className="flex items-start justify-between pr-8">
                            <span className="text-xs font-black text-slate-900 leading-tight">
                              {p.name.replace(/\(.*\)/g, '').trim()}
                            </span>
                            {isSelected && (
                              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                                <Check size={10} className="text-white" />
                              </div>
                            )}
                          </div>
                          {!p.isCustom ? (
                            <>
                              <div className="text-base font-black text-blue-600 mt-1">
                                {formatCurrency(p.price)}
                              </div>
                              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                {p.durationDays} Days
                              </div>
                            </>
                          ) : (
                            <div className="text-sm font-black text-slate-400 mt-1">Custom Quote</div>
                          )}
                          <p className="text-[9px] text-slate-400 mt-1 leading-relaxed line-clamp-2">{p.desc}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom plan inputs */}
                  <AnimatePresence>
                    {isCustom && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                          <div>
                            <label className="text-[9px] font-black text-blue-700 uppercase block mb-1">Price (₹)</label>
                            <input
                              type="number"
                              min={0}
                              value={customPrice}
                              onChange={e => setCustomPrice(Math.max(0, Number(e.target.value)))}
                              className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-blue-700 uppercase block mb-1">Duration (Months)</label>
                            <input
                              type="number"
                              min={1}
                              max={24}
                              value={customDurationMonths}
                              onChange={e => setCustomDurationMonths(Math.max(1, Number(e.target.value)))}
                              className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 2 — RENEWAL DETAILS
            ════════════════════════════════════════════════════════════════ */}
            {step === 2 && !completeDone && (
              <motion.div
                key="step2"
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -30, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-6 space-y-5"
              >
                {/* Selected plan banner */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                    <Star size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900">{planName}</div>
                    <div className="text-[11px] text-blue-600 font-bold mt-0.5">
                      {formatCurrency(baseAmount)} &nbsp;·&nbsp; {planDurationDays} days
                    </div>
                  </div>
                </div>

                {/* Current vs New comparison */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Current</div>
                    <div className="text-xs font-black text-slate-800 truncate">{member.plan || 'Standard'}</div>
                    <div className="text-[10px] text-slate-500 font-semibold mt-1">
                      Expires: {fmtDate(member.expiryDate)}
                    </div>
                    <div className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border inline-block mt-1.5 ${getStatusBadgeClass(member.status)}`}>
                      {member.status || 'Active'}
                    </div>
                  </div>
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl">
                    <div className="text-[9px] font-black text-blue-500 uppercase tracking-wider mb-2">New Renewal</div>
                    <div className="text-xs font-black text-blue-800 truncate">{planName}</div>
                    <div className="text-[10px] text-blue-600 font-semibold mt-1">
                      Starts: {fmtDate(startDate)}
                    </div>
                    <div className="text-[10px] text-blue-600 font-semibold">
                      Expires: {fmtDate(expiryDate)}
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1.5">
                      Invoice Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={e => setInvoiceDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1.5">
                      Renewal Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => {
                        setStartDate(e.target.value);
                        setIsExpiryManuallyEdited(false);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1.5">
                      New Expiry Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={e => {
                        setExpiryDate(e.target.value);
                        setIsExpiryManuallyEdited(true);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 transition-colors"
                    />
                    {!isExpiryManuallyEdited && (
                      <p className="text-[9px] text-slate-400 mt-1">Auto-calculated from start date + plan duration</p>
                    )}
                  </div>
                </div>

                {/* Pricing breakdown */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Pricing</div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                      <Banknote size={13} className="text-slate-400" /> Base Amount
                    </span>
                    <span className="font-black text-slate-800">{formatCurrency(baseAmount)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-semibold text-xs flex items-center gap-1.5 shrink-0">
                      <Tag size={13} className="text-slate-400" /> Discount (₹)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={baseAmount}
                      value={discountAmount}
                      onChange={e => setDiscountAmount(Math.max(0, Math.min(Number(e.target.value), baseAmount)))}
                      className="flex-1 ml-auto w-24 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 text-right"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-semibold text-xs flex items-center gap-1.5 shrink-0">
                      <Percent size={13} className="text-slate-400" /> Tax / GST (₹)
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={taxAmount}
                      onChange={e => setTaxAmount(Math.max(0, Number(e.target.value)))}
                      className="flex-1 ml-auto w-24 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 text-right"
                    />
                  </div>

                  <div className="h-px bg-slate-200" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800">Final Payable</span>
                    <span className="text-lg font-black text-blue-600">{formatCurrency(netPayable)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                    {PAYMENT_METHODS.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-2 px-1 text-[10px] font-bold rounded-xl border transition-all cursor-pointer ${
                          paymentMethod === m
                            ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Status */}
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-2">
                    Payment Status <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Paid', 'Partial', 'Pending'] as PaymentStatus[]).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPaymentStatus(s)}
                        className={`py-2.5 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                          paymentStatus === s
                            ? s === 'Paid'
                              ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                              : s === 'Partial'
                              ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                              : 'border-red-500 bg-red-500 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Partial payment fields */}
                <AnimatePresence>
                  {paymentStatus === 'Partial' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-3 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl">
                        <div>
                          <label className="text-[9px] font-black text-amber-700 uppercase block mb-1">Amount Paid (₹)</label>
                          <input
                            type="number"
                            min={0}
                            max={netPayable}
                            value={amountPaid}
                            onChange={e => setAmountPaid(Math.max(0, Math.min(Number(e.target.value), netPayable)))}
                            className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-amber-700 uppercase block mb-1">Pending Amount</label>
                          <div className="px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-black text-amber-700">
                            {formatCurrency(Math.max(0, netPayable - amountPaid))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Notes */}
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1.5">Notes / Remarks</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Optional remarks about this renewal..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 resize-none"
                  />
                </div>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 3 — FULL REVIEW
            ════════════════════════════════════════════════════════════════ */}
            {step === 3 && !completeDone && (
              <motion.div
                key="step3"
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -30, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-6 space-y-4"
              >
                <p className="text-xs text-slate-500 font-medium">
                  Review all details carefully before confirming this renewal.
                </p>

                {/* ── MEMBER ── */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <User size={10} /> Member
                    </span>
                  </div>
                  <div className="p-4 flex items-center gap-3">
                    <MemberAvatar
                      photoUrl={member.photo || member.avatarUrl || member.avatar}
                      gender={member.gender}
                      name={member.name}
                      size={44}
                    />
                    <div>
                      <div className="font-black text-slate-900 text-sm">{member.name}</div>
                      <div className="text-[11px] text-slate-500 font-semibold">
                        #{member.memberId || member.id} &nbsp;·&nbsp; {member.phone || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── CURRENT MEMBERSHIP ── */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={10} /> Current Membership
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Plan</div>
                      <div className="font-black text-slate-800 mt-0.5">{member.plan || 'Standard'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Current Expiry</div>
                      <div className="font-black text-slate-800 mt-0.5">{fmtDate(member.expiryDate)}</div>
                    </div>
                  </div>
                </div>

                {/* ── NEW MEMBERSHIP ── */}
                <div className="border border-blue-200 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-200">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles size={10} /> New Membership
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Plan</div>
                      <div className="font-black text-blue-700 mt-0.5">{planName}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Start Date</div>
                      <div className="font-black text-slate-800 mt-0.5">{fmtDate(startDate)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Expiry Date</div>
                      <div className="font-black text-slate-800 mt-0.5">{fmtDate(expiryDate)}</div>
                    </div>
                  </div>
                </div>

                {/* ── PAYMENT SUMMARY ── */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Receipt size={10} /> Payment Summary
                    </span>
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Invoice Date</span>
                      <span className="font-bold text-slate-800">{fmtDate(invoiceDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Base Amount</span>
                      <span className="font-bold text-slate-800">{formatCurrency(baseAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Discount</span>
                      <span className={`font-bold ${clampedDiscount > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {clampedDiscount > 0 ? `– ${formatCurrency(clampedDiscount)}` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Tax / GST</span>
                      <span className={`font-bold ${taxAmount > 0 ? 'text-slate-800' : 'text-slate-500'}`}>
                        {taxAmount > 0 ? formatCurrency(taxAmount) : '—'}
                      </span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex justify-between">
                      <span className="text-sm font-black text-slate-900">Final Payable</span>
                      <span className="text-base font-black text-blue-600">{formatCurrency(netPayable)}</span>
                    </div>
                    <div className="h-px bg-slate-100" />
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Payment Method</span>
                      <span className="font-black text-slate-800">{paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Payment Status</span>
                      <span className={`font-black px-2 py-0.5 rounded-full text-[10px] border ${
                        paymentStatus === 'Paid'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : paymentStatus === 'Partial'
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {paymentStatus}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Amount Paid</span>
                      <span className="font-black text-emerald-600">{formatCurrency(clampedAmountPaid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Pending Balance</span>
                      <span className={`font-black ${pendingAmount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {formatCurrency(pendingAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── REMARKS ── */}
                {notes && (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Remarks</span>
                    </div>
                    <div className="p-4 text-xs text-slate-700 font-semibold leading-relaxed">{notes}</div>
                  </div>
                )}

                {/* Warning Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-start gap-3">
                  <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 font-semibold leading-relaxed">
                    Please review the membership dates and payment details.
                    Once confirmed, this renewal will update the member's active membership
                    and create the corresponding billing record.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                SUCCESS SCREEN
            ════════════════════════════════════════════════════════════════ */}
            {completeDone && (
              <motion.div
                key="success"
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-6 space-y-5 text-center relative"
              >
                <ConfettiAnimation />

                {/* Success icon */}
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                    className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/30"
                  >
                    <CheckCircle2 size={32} className="text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Membership Renewed!</h3>
                    <p className="text-xs text-slate-500 mt-1">Billing record created and member profile updated.</p>
                  </div>
                </div>

                {/* Summary card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5">
                  <div className="flex items-center gap-3 pb-2.5 border-b border-slate-200">
                    <MemberAvatar
                      photoUrl={member.photo || member.avatarUrl || member.avatar}
                      gender={member.gender}
                      name={member.name}
                      size={40}
                    />
                    <div>
                      <div className="font-black text-slate-900 text-sm">{member.name}</div>
                      <div className="text-[10px] text-slate-500">#{member.memberId || member.id}</div>
                    </div>
                  </div>

                  {[
                    { label: 'New Plan', value: planName },
                    { label: 'Valid From', value: fmtDate(startDate) },
                    { label: 'Expires', value: fmtDate(expiryDate) },
                    { label: 'Amount', value: formatCurrency(netPayable) },
                    { label: 'Payment', value: paymentStatus },
                    { label: 'Method', value: paymentMethod },
                    { label: 'Invoice', value: generatedInvoiceNumber },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">{row.label}</span>
                      <span className={`font-black ${row.label === 'Invoice' ? 'text-blue-600 font-mono' : 'text-slate-800'}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setShowInvoicePreview(true)}
                    className="flex flex-col items-center gap-1 py-3 px-2 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <Printer size={16} className="text-slate-500" />
                    View Invoice
                  </button>
                  <button
                    onClick={() => {
                      if (renewedMember?.id || member?.id) {
                        window.location.href = `/dashboard/members/${renewedMember?.id || member?.id}`;
                      }
                    }}
                    className="flex flex-col items-center gap-1 py-3 px-2 bg-blue-600 border border-blue-600 rounded-2xl hover:bg-blue-700 transition-colors text-xs font-bold text-white cursor-pointer"
                  >
                    <User size={16} />
                    View Member
                  </button>
                  <button
                    onClick={onClose}
                    className="flex flex-col items-center gap-1 py-3 px-2 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <Check size={16} className="text-emerald-500" />
                    Done
                  </button>
                </div>

                {/* Invoice preview overlay */}
                <AnimatePresence>
                  {showInvoicePreview && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
                    >
                      <motion.div
                        initial={{ scale: 0.95, y: 16 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 16 }}
                        className="bg-white rounded-3xl p-4 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-black text-slate-900 text-sm">Invoice Preview</h4>
                          <button
                            onClick={() => setShowInvoicePreview(false)}
                            className="p-1 rounded-full hover:bg-slate-100 text-slate-400 border-none cursor-pointer bg-transparent"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <OfficialInvoiceReceipt
                          invoice={generatedInvoiceData}
                          member={member}
                          onPrint={() => window.print()}
                        />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Footer Controls ──────────────────────────────────────────────── */}
        {!completeDone && (
          <div className="px-6 py-4 border-t border-slate-100 flex gap-2 shrink-0 bg-white">
            {step > 1 && (
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
              >
                <ArrowLeft size={13} /> Back
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={goNext}
                disabled={step === 1 ? !step1Valid : !step2Valid}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer shadow-sm shadow-blue-500/20"
              >
                Continue <ArrowRight size={13} />
              </button>
            ) : (
              <button
                onClick={handleConfirmRenewal}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black transition-all border-none cursor-pointer shadow-md shadow-emerald-500/25"
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    Creating Renewal...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Confirm Renewal
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
