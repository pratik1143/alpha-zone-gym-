'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, IndianRupee, Receipt, Plus, Download, Search,
  TrendingUp, X, RefreshCw, Printer, Share2, CheckCircle2,
  Smartphone, Banknote, Landmark, Clock, AlertCircle, ArrowLeft,
  Sparkles, ShieldCheck, UserCheck, Calendar, ChevronRight, Check,
  Percent, Tag, DollarSign, Dumbbell, User, Award, ArrowRight
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useGymStore } from '@/store';
import toast from '@/lib/toast';
import { formatDate, formatPhoneNumber, cleanPlanName } from '@/lib/utils';
import OfficialInvoiceReceipt from '../../components/OfficialInvoiceReceipt';

// ─── CRM Blue Design Tokens ──────────────────────────────────────────
const PRIMARY_BLUE = '#0B5CBE';
const PRIMARY_BLUE_DARK = '#064A9B';
const BLUE_GRADIENT = 'bg-gradient-to-r from-[#0B5CBE] via-[#0952AC] to-[#064A9B]';
const BLUE_GRADIENT_HOVER = 'hover:from-[#064A9B] hover:to-[#043775]';

type BillingMode = 'new' | 'renew' | 'upgrade' | 'pt' | 'collect' | 'edit';

const MODES_CONFIG: { id: BillingMode; label: string; description: string; icon: any }[] = [
  { id: 'new', label: 'NEW BILL', description: 'Create initial membership invoice', icon: Plus },
  { id: 'renew', label: 'RENEWAL', description: 'Extend existing member plan', icon: RefreshCw },
  { id: 'upgrade', label: 'UPGRADE', description: 'Switch to higher package with credit', icon: TrendingUp },
  { id: 'pt', label: 'PT BILL', description: 'Personal Training sessions invoice', icon: Dumbbell },
  { id: 'collect', label: 'COLLECT PAYMENT', description: 'Clear outstanding balance & carry-forward', icon: CreditCard },
];

const PRESET_PACKAGES = [
  { id: 'p1', name: '1 Month Standard', durationMonths: 1, price: 3000, tag: 'Popular' },
  { id: 'p2', name: '3 Months Prime', durationMonths: 3, price: 6500, tag: 'Best Value' },
  { id: 'p3', name: '3+1 Months Offer', durationMonths: 4, price: 7500, tag: 'Bonus Month' },
  { id: 'p4', name: '6 Months Executive', durationMonths: 6, price: 9500, tag: 'Saver' },
  { id: 'p5', name: '12 Months VIP', durationMonths: 12, price: 14000, tag: 'Annual Pro' },
];

function UniversalBillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const modeParam = (searchParams.get('mode') as BillingMode) || 'new';
  const memberIdParam = searchParams.get('id') || searchParams.get('member') || '';
  const invoiceIdParam = searchParams.get('invoice') || '';

  const { members, plans, fetchMembers, fetchPlans, fetchPayments } = useGymStore();

  const [activeMode, setActiveMode] = useState<BillingMode>(modeParam);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(memberIdParam);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  // Selected Member Object
  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    const target = selectedMemberId.trim().toLowerCase();
    return members.find(
      (m: any) =>
        String(m.id).toLowerCase() === target ||
        String(m.memberId || '').toLowerCase() === target ||
        String(m.uid || '').toLowerCase() === target
    ) || null;
  }, [members, selectedMemberId]);

  // Keep search inputs updated
  useEffect(() => {
    if (selectedMember) {
      setMemberSearch(`${selectedMember.name} (${selectedMember.memberId || selectedMember.id})`);
    } else if (selectedMemberId && !selectedMember) {
      fetchMembers(true);
    }
  }, [selectedMember, selectedMemberId]);

  useEffect(() => {
    if (modeParam && MODES_CONFIG.some(m => m.id === modeParam)) {
      setActiveMode(modeParam);
    }
  }, [modeParam]);

  useEffect(() => {
    if (plans.length === 0) fetchPlans();
  }, []);

  // ── BILLING FORM STATE ───────────────────────────────────────────
  const todayYMD = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [billDate, setBillDate] = useState(todayYMD);
  const [startDate, setStartDate] = useState(todayYMD);
  const [selectedPackage, setSelectedPackage] = useState<any>(PRESET_PACKAGES[1]);
  const [customPackageName, setCustomPackageName] = useState('');
  const [packagePrice, setPackagePrice] = useState<number>(6500);

  // PT specific state
  const [ptSessions, setPtSessions] = useState<number>(12);
  const [ptTrainer, setPtTrainer] = useState<string>('');

  // Discount State
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Tax State
  const [taxPercent, setTaxPercent] = useState<number>(0);

  // Carry Forward / Old Outstanding Balance Handling
  const previousOutstanding = useMemo(() => {
    if (!selectedMember) return 0;
    const rawBal = selectedMember.balanceAmount ?? selectedMember.outstandingBalance ?? selectedMember.balance ?? selectedMember.dueAmount ?? 0;
    return Math.max(0, Number(rawBal) || 0);
  }, [selectedMember]);

  const [carryForwardMode, setCarryForwardMode] = useState<'full' | 'partial' | 'waive'>('full');
  const [customCarryAmount, setCustomCarryAmount] = useState<number>(0);
  const [waiveAmount, setWaiveAmount] = useState<number>(0);

  useEffect(() => {
    setCustomCarryAmount(previousOutstanding);
    setWaiveAmount(0);
  }, [previousOutstanding]);

  // Amount Paid Today & Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Card' | 'Net Banking' | 'Split'>('UPI');
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [amountPaidToday, setAmountPaidToday] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Sync dates & amounts when package or mode changes
  useEffect(() => {
    if (selectedMember) {
      if (activeMode === 'renew' || activeMode === 'upgrade') {
        const curExp = selectedMember.expiryDate ? new Date(selectedMember.expiryDate) : new Date();
        const start = curExp.getTime() > Date.now() ? selectedMember.expiryDate : todayYMD;
        setStartDate(start || todayYMD);
      } else {
        setStartDate(selectedMember.startDate || selectedMember.joinDate || todayYMD);
      }

      if (activeMode === 'pt') {
        setPackagePrice(selectedMember.ptPrice || 5000);
      } else if (activeMode === 'collect') {
        setPackagePrice(0);
      }
    }
  }, [selectedMember, activeMode]);

  // Update Package Price when package card is selected
  const handleSelectPackage = (pkg: any) => {
    setSelectedPackage(pkg);
    setPackagePrice(pkg.price);
  };

  // ── SMART CALCULATION ENGINE ──────────────────────────────────────
  const effectiveCarryForward = useMemo(() => {
    if (activeMode === 'new') return 0; // Fresh member bill has no carry forward
    if (carryForwardMode === 'waive') {
      return Math.max(0, previousOutstanding - waiveAmount);
    }
    if (carryForwardMode === 'partial') {
      return Math.max(0, customCarryAmount);
    }
    return previousOutstanding;
  }, [activeMode, carryForwardMode, previousOutstanding, waiveAmount, customCarryAmount]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.round((packagePrice * Math.min(100, discountValue)) / 100);
    }
    return Math.min(packagePrice, Math.max(0, discountValue));
  }, [packagePrice, discountType, discountValue]);

  const taxAmount = useMemo(() => {
    const baseAfterDiscount = Math.max(0, packagePrice - discountAmount);
    return Math.round((baseAfterDiscount * taxPercent) / 100);
  }, [packagePrice, discountAmount, taxPercent]);

  // Final Net Payable = Package Price - Discount + Tax + CarryForward
  const netPayable = useMemo(() => {
    if (activeMode === 'collect') {
      return effectiveCarryForward;
    }
    const currentBillNet = Math.max(0, packagePrice - discountAmount + taxAmount);
    return currentBillNet + effectiveCarryForward;
  }, [packagePrice, discountAmount, taxAmount, effectiveCarryForward, activeMode]);

  // Auto set amount paid today to netPayable if not manually changed
  const [userTouchedPaid, setUserTouchedPaid] = useState(false);
  useEffect(() => {
    if (!userTouchedPaid) {
      setAmountPaidToday(netPayable);
    }
  }, [netPayable, userTouchedPaid]);

  const finalPaidToday = useMemo(() => {
    if (paymentMethod === 'Split') {
      return (Number(splitCash) || 0) + (Number(splitUpi) || 0) + (Number(splitCard) || 0);
    }
    return Number(amountPaidToday) || 0;
  }, [paymentMethod, splitCash, splitUpi, splitCard, amountPaidToday]);

  const finalPendingBalance = useMemo(() => {
    return Math.max(0, netPayable - finalPaidToday);
  }, [netPayable, finalPaidToday]);

  // Smart Calculated Expiry Date
  const calculatedExpiryDate = useMemo(() => {
    const baseDate = new Date(startDate || todayYMD);
    if (isNaN(baseDate.getTime())) return todayYMD;

    let monthsToAdd = selectedPackage?.durationMonths || 1;
    if (activeMode === 'pt') monthsToAdd = 1;

    baseDate.setMonth(baseDate.getMonth() + monthsToAdd);
    return baseDate.toISOString().split('T')[0];
  }, [startDate, selectedPackage, activeMode, todayYMD]);

  // ── SUBMIT & INVOICE GENERATION ──────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [generatedInvoiceDoc, setGeneratedInvoiceDoc] = useState<any | null>(null);

  const handleGenerateInvoice = async () => {
    if (!selectedMember) {
      toast.error('Please select a member first!');
      return;
    }

    if (netPayable <= 0 && finalPaidToday <= 0) {
      toast.error('Invoice net payable or paid amount must be greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      const invTimestamp = Date.now();
      const generatedInvNo = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(invTimestamp).slice(-5)}`;

      const planTitle = activeMode === 'pt'
        ? `Personal Training (${ptSessions} Sessions)`
        : (activeMode === 'collect' ? 'Balance Settlement / Carry Forward' : (selectedPackage?.name || customPackageName || 'Membership Plan'));

      const payStatus = finalPendingBalance <= 0 ? 'paid' : (finalPaidToday > 0 ? 'partial' : 'pending');

      const invoicePayload = {
        invoiceNumber: generatedInvNo,
        invoice: generatedInvNo,
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        memberPhone: selectedMember.phone || '',
        mode: activeMode,
        billingType: activeMode === 'pt' ? 'pt' : 'membership',
        plan: planTitle,
        packageName: planTitle,

        // Financial Breakdown
        packagePrice: packagePrice,
        originalAmount: packagePrice,
        discountAmount: discountAmount,
        discount: discountAmount,
        discountType: discountType,
        taxAmount: taxAmount,
        tax: taxAmount,
        carryForward: effectiveCarryForward,
        previousOutstanding: previousOutstanding,
        waiveAmount: waiveAmount,
        netPayable: netPayable,
        amount: netPayable,
        amountPaid: finalPaidToday,
        paid: finalPaidToday,
        pendingAmount: finalPendingBalance,
        balanceAmount: finalPendingBalance,
        outstandingAmount: finalPendingBalance,

        // Payment Mode
        method: paymentMethod,
        paymentMethod: paymentMethod,
        splitDetails: paymentMethod === 'Split' ? { cash: splitCash, upi: splitUpi, card: splitCard } : null,
        status: payStatus,
        paymentStatus: payStatus,

        // Dates
        date: billDate,
        invoiceDate: billDate,
        billingDate: billDate,
        startDate: startDate,
        expiryDate: calculatedExpiryDate,
        createdAt: new Date().toISOString(),

        // Metadata
        notes: notes || `Invoice generated via Universal Billing Center (${activeMode.toUpperCase()})`,
        trainer: ptTrainer || selectedMember.trainer || 'Unassigned',
      };

      // 1. Add to Firestore 'payments' collection
      const docRef = await addDoc(collection(db, 'payments'), invoicePayload);
      const savedDoc = { id: docRef.id, ...invoicePayload };

      // 2. Atomic update to Firestore 'members' collection
      const newTotalPaid = (Number(selectedMember.totalPaid) || 0) + finalPaidToday;
      const newTotalBilled = (Number(selectedMember.totalBilled) || 0) + netPayable;
      const computedMemberStatus = calculatedExpiryDate >= todayYMD ? 'active' : 'expired';

      await updateDoc(doc(db, 'members', selectedMember.id), {
        plan: activeMode !== 'pt' ? planTitle : (selectedMember.plan || planTitle),
        price: activeMode !== 'pt' ? packagePrice : selectedMember.price,
        expiryDate: activeMode !== 'pt' ? calculatedExpiryDate : (selectedMember.expiryDate || calculatedExpiryDate),
        status: computedMemberStatus,
        paymentStatus: payStatus,
        totalBilled: newTotalBilled,
        totalPaid: newTotalPaid,
        outstandingBalance: finalPendingBalance,
        balanceAmount: finalPendingBalance,
        updatedAt: new Date().toISOString(),
      });

      // 3. Refresh store state
      await fetchMembers(true);
      await fetchPayments(true);

      setGeneratedInvoiceDoc(savedDoc);
      toast.success(`Invoice ${generatedInvNo} generated successfully! 🎉`);
    } catch (err: any) {
      console.error('Invoice generation failed:', err);
      toast.error('Failed to generate invoice: ' + (err?.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered member options for dropdown
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members.slice(0, 10);
    const q = memberSearch.toLowerCase().trim();
    return members.filter(
      (m: any) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.memberId || '').toLowerCase().includes(q) ||
        (m.id || '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [members, memberSearch]);

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] pb-24 text-left font-sans">
      
      {/* ── 1. HEADER WITH MODE TABS (CRM Blue Theme) ────────────────────────── */}
      <div className="bg-white border-b border-slate-200/90 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all border-none cursor-pointer"
                title="Go Back"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Universal Billing Center
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-black uppercase text-[#0B5CBE] flex items-center gap-1">
                    <Sparkles size={11} /> Unified Engine
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Single source of truth for Membership, Renewals, Upgrades &amp; PT Invoices.
                </p>
              </div>
            </div>

            {/* MODE SWITCHER TABS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {MODES_CONFIG.map((m) => {
                const Icon = m.icon;
                const isActive = activeMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveMode(m.id);
                      router.replace(`/dashboard/billing/create?mode=${m.id}${selectedMemberId ? `&id=${selectedMemberId}` : ''}`);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer border-none ${
                      isActive
                        ? `${BLUE_GRADIENT} text-white shadow-md shadow-blue-500/20`
                        : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-[#0B5CBE]'
                    }`}
                  >
                    <Icon size={14} />
                    {m.label}
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        
        {generatedInvoiceDoc ? (
          /* ── SUCCESS RECEIPT VIEW ──────────────────────────────────────────────── */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg max-w-4xl mx-auto text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900">Invoice Created Successfully!</h2>
              <p className="text-sm text-slate-500 mt-1">
                Invoice <code className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-800">{generatedInvoiceDoc.invoiceNumber}</code> has been logged into the live CRM ledger.
              </p>
            </div>

            {/* Official Invoice Component */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 text-left overflow-x-auto">
              <OfficialInvoiceReceipt invoice={generatedInvoiceDoc} member={selectedMember} />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setGeneratedInvoiceDoc(null)}
                className={`px-5 py-3 ${BLUE_GRADIENT} ${BLUE_GRADIENT_HOVER} text-white rounded-xl font-bold text-xs shadow-md border-none cursor-pointer flex items-center gap-2`}
              >
                <Plus size={16} /> Create Another Invoice
              </button>
              <button
                onClick={() => router.push('/dashboard/billing')}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 cursor-pointer flex items-center gap-2"
              >
                <Receipt size={16} /> View All Transactions
              </button>
              <button
                onClick={() => router.push(`/dashboard/members/${selectedMember?.id}`)}
                className="px-5 py-3 bg-blue-50 hover:bg-blue-100 text-[#0B5CBE] rounded-xl font-bold text-xs border border-blue-200 cursor-pointer flex items-center gap-2"
              >
                <User size={16} /> Return to Member Profile
              </button>
            </div>
          </motion.div>
        ) : (
          /* ── MAIN BILLING ENGINE GRID ──────────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT 7 COLS: MEMBER SELECTOR & BILLING INPUTS */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* MEMBER SELECTOR CARD */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs relative">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0B5CBE] block mb-2">
                  1. SELECT MEMBER PROFILE
                </span>

                <div className="relative">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:border-[#0B5CBE] focus-within:bg-white transition-all">
                    <Search size={16} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Type member name, phone, or Member ID..."
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value);
                        setShowMemberDropdown(true);
                      }}
                      onFocus={() => setShowMemberDropdown(true)}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 outline-none"
                    />
                    {selectedMember && (
                      <button
                        onClick={() => {
                          setSelectedMemberId('');
                          setMemberSearch('');
                        }}
                        className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Options */}
                  {showMemberDropdown && !selectedMember && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {filteredMembers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">No matching members found</div>
                      ) : (
                        filteredMembers.map((m: any) => (
                          <div
                            key={m.id}
                            onClick={() => {
                              setSelectedMemberId(m.id);
                              setShowMemberDropdown(false);
                            }}
                            className="p-3 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0B5CBE] font-black text-xs flex items-center justify-center">
                                {m.name?.[0] || 'M'}
                              </div>
                              <div>
                                <div className="text-xs font-extrabold text-slate-900">{m.name}</div>
                                <div className="text-[10px] text-slate-400 font-medium">
                                  {m.memberId || m.id} • {m.phone || 'No phone'}
                                </div>
                              </div>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                              m.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {m.status || 'Active'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* SELECTED MEMBER HERO STRIP */}
                {selectedMember && (
                  <div className="mt-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-blue-200 text-[#0B5CBE] font-black text-base flex items-center justify-center shadow-xs">
                        {selectedMember.name?.[0] || 'M'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900">{selectedMember.name}</h4>
                          <span className="text-[10px] font-black bg-blue-100 text-[#0B5CBE] px-2 py-0.5 rounded">
                            {selectedMember.memberId || selectedMember.id}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-semibold mt-0.5">
                          {selectedMember.plan || 'General Plan'} • Expiry: {formatDate(selectedMember.expiryDate || todayYMD)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Current Balance</span>
                      <span className={`text-base font-black font-mono ${previousOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        ₹{previousOutstanding.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* PACKAGE SELECTION GRID (Skipped in Collect mode) */}
              {activeMode !== 'collect' && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#0B5CBE]">
                      2. SELECT MEMBERSHIP PACKAGE
                    </span>
                    <span className="text-xs text-slate-400 font-bold">Instant Price Match</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PRESET_PACKAGES.map((pkg) => {
                      const isSelected = selectedPackage?.id === pkg.id;
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => handleSelectPackage(pkg)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative flex flex-col justify-between ${
                            isSelected
                              ? 'bg-blue-50/70 border-[#0B5CBE] shadow-xs'
                              : 'bg-white border-slate-200 hover:border-blue-200'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0B5CBE] text-white flex items-center justify-center">
                              <Check size={12} />
                            </div>
                          )}
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider bg-blue-100 text-[#0B5CBE] px-2 py-0.5 rounded inline-block">
                              {pkg.tag}
                            </span>
                            <div className="text-xs font-black text-slate-900 mt-1.5">{pkg.name}</div>
                          </div>
                          <div className="text-base font-black text-[#0B5CBE] font-mono mt-2">
                            ₹{pkg.price.toLocaleString('en-IN')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CARRY FORWARD & PREVIOUS OUTSTANDING SETTLEMENT */}
              {previousOutstanding > 0 && (
                <div className="bg-amber-50/60 rounded-2xl p-5 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-900">
                      <AlertCircle size={16} className="text-amber-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider">
                        Carry Forward Settlement (Old Outstanding: ₹{previousOutstanding.toLocaleString('en-IN')})
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCarryForwardMode('full')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        carryForwardMode === 'full'
                          ? `${BLUE_GRADIENT} text-white border-none shadow-xs`
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      Apply Full (₹{previousOutstanding})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCarryForwardMode('partial')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        carryForwardMode === 'partial'
                          ? `${BLUE_GRADIENT} text-white border-none shadow-xs`
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      Partial Carry
                    </button>
                    <button
                      type="button"
                      onClick={() => setCarryForwardMode('waive')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        carryForwardMode === 'waive'
                          ? 'bg-rose-600 text-white border-none shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      Waive / Discount
                    </button>
                  </div>

                  {carryForwardMode === 'partial' && (
                    <div className="flex items-center gap-2 pt-2">
                      <label className="text-xs font-bold text-slate-700">Custom Carry Amount (₹):</label>
                      <input
                        type="number"
                        value={customCarryAmount}
                        onChange={(e) => setCustomCarryAmount(Number(e.target.value) || 0)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 w-32 outline-none focus:border-[#0B5CBE]"
                      />
                    </div>
                  )}

                  {carryForwardMode === 'waive' && (
                    <div className="flex items-center gap-2 pt-2">
                      <label className="text-xs font-bold text-slate-700">Waive Off Amount (₹):</label>
                      <input
                        type="number"
                        value={waiveAmount}
                        onChange={(e) => setWaiveAmount(Number(e.target.value) || 0)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 w-32 outline-none focus:border-rose-600"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* DISCOUNT & PAYMENT METHOD */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0B5CBE] block">
                  3. DISCOUNT &amp; PAYMENT BREAKDOWN
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Discount Input */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Discount Amount</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 outline-none"
                      >
                        <option value="flat">₹ Flat</option>
                        <option value="percent">% Percent</option>
                      </select>
                      <input
                        type="number"
                        placeholder="0"
                        value={discountValue || ''}
                        onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#0B5CBE] focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0B5CBE]"
                    >
                      <option value="UPI">UPI / QR Code</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Split">Split Payment</option>
                    </select>
                  </div>
                </div>

                {/* Amount Paid Input */}
                {paymentMethod !== 'Split' ? (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Amount Paid Today (₹)</label>
                    <input
                      type="number"
                      value={amountPaidToday}
                      onChange={(e) => {
                        setUserTouchedPaid(true);
                        setAmountPaidToday(Number(e.target.value) || 0);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-900 outline-none focus:border-[#0B5CBE] focus:bg-white font-mono"
                    />
                  </div>
                ) : (
                  /* SPLIT PAYMENT INPUTS */
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
                    <span className="text-[10px] font-black uppercase text-[#0B5CBE]">Split Payment Breakdown</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Cash (₹)</label>
                        <input
                          type="number"
                          value={splitCash || ''}
                          onChange={(e) => setSplitCash(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-900 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">UPI (₹)</label>
                        <input
                          type="number"
                          value={splitUpi || ''}
                          onChange={(e) => setSplitUpi(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-900 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Card (₹)</label>
                        <input
                          type="number"
                          value={splitCard || ''}
                          onChange={(e) => setSplitCard(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-900 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT 5 COLS: STICKY LIVE INVOICE PREVIEW CARD */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-md sticky top-24 space-y-5">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2">
                    <Receipt size={18} className="text-[#0B5CBE]" />
                    <h3 className="font-extrabold text-sm text-slate-900">Live Invoice Summary</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {activeMode.toUpperCase()}
                  </span>
                </div>

                {/* INVOICE BREAKDOWN TABLE */}
                <div className="space-y-2.5 text-xs">
                  
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Package Price</span>
                    <span className="font-mono font-bold text-slate-900">₹{packagePrice.toLocaleString('en-IN')}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount ({discountType === 'percent' ? `${discountValue}%` : 'Flat'})</span>
                      <span className="font-mono">-₹{discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {effectiveCarryForward > 0 && (
                    <div className="flex justify-between text-amber-700 font-bold">
                      <span>Carry Forward / Old Balance</span>
                      <span className="font-mono">+₹{effectiveCarryForward.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="font-black text-slate-900 text-sm">Net Payable</span>
                    <span className="font-black text-lg text-[#0B5CBE] font-mono">
                      ₹{netPayable.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50/60 p-2 rounded-xl">
                    <span>Amount Paid Today</span>
                    <span className="font-mono">₹{finalPaidToday.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-700">Remaining Pending</span>
                    <span className={`font-black font-mono text-sm ${finalPendingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ₹{finalPendingBalance.toLocaleString('en-IN')}
                    </span>
                  </div>

                </div>

                {/* DATES SUMMARY */}
                <div className="p-3 rounded-xl bg-blue-50/40 border border-blue-100 text-[11px] space-y-1 text-slate-600 font-semibold">
                  <div className="flex justify-between">
                    <span>Start Date:</span>
                    <span className="font-bold text-slate-900">{formatDate(startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Calculated Expiry:</span>
                    <span className="font-bold text-[#0B5CBE]">{formatDate(calculatedExpiryDate)}</span>
                  </div>
                </div>

                {/* ACTION SUBMIT BUTTON (CRM Blue Gradient) */}
                <button
                  type="button"
                  onClick={handleGenerateInvoice}
                  disabled={submitting || !selectedMember}
                  className={`w-full py-3.5 px-4 ${BLUE_GRADIENT} ${BLUE_GRADIENT_HOVER} text-white font-black text-xs rounded-xl shadow-lg transition-all border-none cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Generating Invoice...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} /> Confirm &amp; Generate Invoice
                    </>
                  )}
                </button>

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default function UniversalBillingPage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
        <RefreshCw size={16} className="animate-spin text-[#0B5CBE]" /> Loading Universal Billing Center...
      </div>
    }>
      <UniversalBillingContent />
    </Suspense>
  );
}
