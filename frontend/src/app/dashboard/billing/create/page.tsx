'use client';

import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, IndianRupee, Receipt, Plus, Download, Search,
  TrendingUp, X, RefreshCw, Printer, Share2, CheckCircle2,
  Smartphone, Banknote, Landmark, Clock, AlertCircle, ArrowLeft,
  Sparkles, ShieldCheck, UserCheck, Calendar, ChevronRight, Check,
  Percent, Tag, DollarSign, Dumbbell, User, Award, ArrowRight, Eye, FileText
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { useGymStore } from '@/store';
import toast from '@/lib/toast';
import { formatDate, formatPhoneNumber, cleanPlanName } from '@/lib/utils';
import OfficialInvoiceReceipt from '../../components/OfficialInvoiceReceipt';

// ─── CRM Blue Design Tokens ──────────────────────────────────────────
const BLUE_PRIMARY = '#0B5CBE';
const BLUE_GRADIENT = 'bg-gradient-to-r from-[#0B5CBE] via-[#0952AC] to-[#064A9B]';
const BLUE_GRADIENT_HOVER = 'hover:from-[#064A9B] hover:to-[#043775]';

type BillingMode = 'new' | 'renew' | 'upgrade' | 'pt' | 'collect' | 'edit';

const MODE_METADATA: Record<BillingMode, { title: string; subtitle: string }> = {
  upgrade: { title: 'BILLING TERMINAL', subtitle: 'Membership Upgrade & Payment' },
  renew: { title: 'BILLING TERMINAL', subtitle: 'Membership Renewal & Extension' },
  new: { title: 'BILLING TERMINAL', subtitle: 'New Membership Enrollment' },
  pt: { title: 'BILLING TERMINAL', subtitle: 'Personal Training Session Billing' },
  collect: { title: 'BILLING TERMINAL', subtitle: 'Pending Payment & Balance Settlement' },
  edit: { title: 'BILLING TERMINAL', subtitle: 'Invoice Revision & Adjustment' },
};

function UniversalBillingTerminalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const modeParam = (searchParams.get('mode') as BillingMode) || 'upgrade';
  const memberIdParam = searchParams.get('id') || searchParams.get('memberId') || searchParams.get('member') || '';

  const { members, plans, fetchMembers, fetchPlans, fetchPayments } = useGymStore();

  const [activeMode, setActiveMode] = useState<BillingMode>(modeParam);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(memberIdParam);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  // Sync mode URL param
  useEffect(() => {
    if (modeParam && MODE_METADATA[modeParam]) {
      setActiveMode(modeParam);
    }
  }, [modeParam]);

  // Selected Member Object (Multi-field Resilient Matching)
  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    const target = selectedMemberId.trim().toLowerCase();
    const cleanNum = target.replace(/^(az-2026-|az-)/i, '');

    return members.find((m: any) => {
      if (!m) return false;
      const mId = String(m.id || '').toLowerCase();
      const mUid = String(m.uid || '').toLowerCase();
      const mDocId = String(m.docId || '').toLowerCase();
      const mMemberId = String(m.memberId || '').toLowerCase();
      const mClientId = String(m.clientId || '').toLowerCase();
      const mCode = String(m.memberCode || '').toLowerCase();

      if (mId === target || mUid === target || mDocId === target || mMemberId === target || mClientId === target || mCode === target) {
        return true;
      }
      if (cleanNum && cleanNum.length >= 2) {
        const mCleanMember = mMemberId.replace(/^(az-2026-|az-)/i, '');
        const mCleanClient = mClientId.replace(/^(az-2026-|az-)/i, '');
        if (mCleanMember === cleanNum || mCleanClient === cleanNum) return true;
      }
      return false;
    }) || null;
  }, [members, selectedMemberId]);

  useEffect(() => {
    if (selectedMember) {
      setMemberSearch(`${selectedMember.name} (${selectedMember.memberId || selectedMember.id})`);
    } else if (selectedMemberId && !selectedMember) {
      fetchMembers(true);
      (async () => {
        try {
          const memCol = collection(db, 'members');
          const qFields = ['memberId', 'clientId', 'uid', 'docId', 'memberCode'];
          for (const field of qFields) {
            const snap = await getDocs(query(memCol, where(field, '==', selectedMemberId)));
            if (!snap.empty) {
              const d = snap.docs[0];
              setSelectedMemberId(d.id);
              break;
            }
          }
        } catch (e) {
          // direct lookup notice
        }
      })();
    }
  }, [selectedMember, selectedMemberId]);

  useEffect(() => {
    if (plans.length === 0) fetchPlans();
  }, []);

  // ── FIXATION OF AUTO-GENERATED INVOICE NUMBER BEFORE CONFIRMATION ───────
  const fixedInvoiceNo = useMemo(() => {
    const today = new Date();
    const YMD = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const randomSeq = String(Math.floor(100 + Math.random() * 900));
    const prefix = activeMode === 'upgrade' ? 'INV-UPG' : (activeMode === 'renew' ? 'INV-REN' : 'INV-MEM');
    return `${prefix}-${YMD}-${randomSeq}`;
  }, [activeMode, selectedMemberId]);

  // ── DATE CALCULATIONS ──────────────────────────────────────────────────
  const todayYMD = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [billDate, setBillDate] = useState(todayYMD); // Actual transaction date
  const [startDate, setStartDate] = useState(todayYMD); // Membership start date

  // Dynamic Catalog of Packages
  const activePackages = useMemo(() => {
    if (plans.length > 0) {
      return plans.map((p: any) => ({
        id: p.id,
        name: p.name,
        durationMonths: p.durationMonths || p.months || 3,
        price: Number(p.price) || 5000,
        tag: p.tag || 'Popular'
      }));
    }
    return [
      { id: 'p1', name: '1 Month Standard', durationMonths: 1, price: 3000, tag: 'Standard' },
      { id: 'p2', name: '3 Months Prime', durationMonths: 3, price: 6500, tag: 'Popular' },
      { id: 'p3', name: '3+1 Months Offer', durationMonths: 4, price: 7500, tag: 'Best Value' },
      { id: 'p4', name: '6 Months Executive', durationMonths: 6, price: 9500, tag: 'Saver' },
      { id: 'p5', name: '12 Months VIP', durationMonths: 12, price: 14000, tag: 'Annual Pro' },
    ];
  }, [plans]);

  const [selectedPackage, setSelectedPackage] = useState<any>(activePackages[1] || activePackages[0]);
  const [packagePrice, setPackagePrice] = useState<number>(activePackages[1]?.price || 6500);

  // Auto set start date based on continuation rules
  useEffect(() => {
    if (selectedMember) {
      if (activeMode === 'renew' || activeMode === 'upgrade') {
        const curExpStr = selectedMember.expiryDate;
        const curExp = curExpStr ? new Date(curExpStr) : null;
        if (curExp && curExp.getTime() > Date.now()) {
          setStartDate(curExpStr);
        } else {
          setStartDate(todayYMD);
        }
      } else {
        setStartDate(selectedMember.startDate || selectedMember.joinDate || todayYMD);
      }
    }
  }, [selectedMember, activeMode, todayYMD]);

  // Recalculate Expiry Date
  const calculatedExpiryDate = useMemo(() => {
    const baseDate = new Date(startDate || todayYMD);
    if (isNaN(baseDate.getTime())) return todayYMD;

    const monthsToAdd = selectedPackage?.durationMonths || 3;
    baseDate.setMonth(baseDate.getMonth() + monthsToAdd);
    return baseDate.toISOString().split('T')[0];
  }, [startDate, selectedPackage, todayYMD]);

  // ── PREVIOUS MEMBERSHIP FINANCIAL SNAPSHOT & CARRY FORWARD ─────────────
  const currentMembershipSnapshot = useMemo(() => {
    if (!selectedMember) {
      return {
        package: '3 Months',
        startDate: todayYMD,
        expiryDate: todayYMD,
        originalBill: 6500,
        alreadyPaid: 2000,
        currentPending: 4500,
        previousInvoiceNo: 'INV-MEM-355612'
      };
    }

    const embeddedHistory = [
      ...(Array.isArray(selectedMember.billingHistory) ? selectedMember.billingHistory : []),
      ...(Array.isArray(selectedMember.payments) ? selectedMember.payments : []),
      ...(Array.isArray(selectedMember.membershipHistory) ? selectedMember.membershipHistory : [])
    ];

    const lastInv = embeddedHistory.length > 0 ? embeddedHistory[embeddedHistory.length - 1] : null;

    const rawPaid = lastInv?.amountPaid ?? lastInv?.paid ?? selectedMember.amountPaid ?? selectedMember.paid ?? selectedMember.totalPaid ?? selectedMember.paidAmount ?? selectedMember.amountPaidToday ?? 0;
    const rawBalance = lastInv?.pendingAmount ?? lastInv?.balanceAmount ?? selectedMember.balanceAmount ?? selectedMember.outstandingBalance ?? selectedMember.balance ?? selectedMember.dueAmount ?? selectedMember.pendingAmount ?? selectedMember.balanceDue ?? selectedMember.remainingBalance;
    const rawPrice = lastInv?.netPayable ?? lastInv?.originalAmount ?? lastInv?.amount ?? selectedMember.price ?? selectedMember.totalBilled ?? selectedMember.packagePrice ?? selectedMember.amount ?? selectedMember.netPayable ?? 6500;

    let parsedPrice = Number(rawPrice) || 0;
    if (!parsedPrice && typeof selectedMember.plan === 'string') {
      const match = selectedMember.plan.match(/₹?\s*([0-9,]+)/);
      if (match) parsedPrice = Number(match[1].replace(/,/g, ''));
    }
    if (!parsedPrice) parsedPrice = 6500;

    let paid = Number(rawPaid) || 0;

    let pending = 0;
    if (rawBalance !== undefined && rawBalance !== null && !isNaN(Number(rawBalance)) && Number(rawBalance) > 0) {
      pending = Number(rawBalance);
    } else if (parsedPrice > paid) {
      pending = Math.max(0, parsedPrice - paid);
    } else if (Number(selectedMember.outstandingBalance || 0) > 0) {
      pending = Number(selectedMember.outstandingBalance);
    }

    if (paid === 0 && pending > 0 && parsedPrice > pending) {
      paid = parsedPrice - pending;
    } else if (paid === 0 && pending === 0) {
      paid = parsedPrice;
    }

    const prevInvNo = lastInv?.invoiceNumber || lastInv?.invoice || selectedMember.lastInvoiceNo || (selectedMember.clientId ? `INV-LEG-${selectedMember.clientId}` : `INV-LEG-${String(selectedMember.id || '355').slice(0, 6)}`);

    return {
      package: selectedMember.plan || selectedMember.packageName || '3 Months Standard',
      startDate: selectedMember.startDate || selectedMember.joinDate || todayYMD,
      expiryDate: selectedMember.expiryDate || todayYMD,
      originalBill: parsedPrice,
      alreadyPaid: paid,
      currentPending: pending,
      previousInvoiceNo: prevInvNo
    };
  }, [selectedMember, todayYMD]);

  // Carry Forward Amount is AUTO-CALCULATED from Previous Pending
  const carryForwardAmount = currentMembershipSnapshot.currentPending;

  // ── DISCOUNT & ACCOUNTING ENGINE ───────────────────────────────────────
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountValue, setDiscountValue] = useState<number>(0);

  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.round((packagePrice * Math.min(100, discountValue)) / 100);
    }
    return Math.min(packagePrice, Math.max(0, discountValue));
  }, [packagePrice, discountType, discountValue]);

  // Centralized Amount Payable Calculation Function
  const finalPayable = useMemo(() => {
    const netCurrentPackage = Math.max(0, packagePrice - discountAmount);
    return netCurrentPackage + carryForwardAmount;
  }, [packagePrice, discountAmount, carryForwardAmount]);

  // ── AMOUNT PAID & REMAINING PENDING ───────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Card' | 'Bank Transfer' | 'QR' | 'Split'>('UPI');
  const [amountPaidToday, setAmountPaidToday] = useState<number>(0);
  const [userEditedPaid, setUserEditedPaid] = useState<boolean>(false);

  // Auto set amount paid today to finalPayable if manager hasn't touched it
  useEffect(() => {
    if (!userEditedPaid) {
      setAmountPaidToday(finalPayable);
    }
  }, [finalPayable, userEditedPaid]);

  const remainingPending = useMemo(() => {
    return Math.max(0, finalPayable - amountPaidToday);
  }, [finalPayable, amountPaidToday]);

  const paymentStatusLabel = useMemo(() => {
    if (remainingPending <= 0) return 'PAID IN FULL';
    if (amountPaidToday > 0) return 'PARTIAL PAYMENT';
    return 'PENDING';
  }, [remainingPending, amountPaidToday]);

  // ── MODALS & INVOICE EXECUTION ─────────────────────────────────────────
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successInvoice, setSuccessInvoice] = useState<any | null>(null);

  const handleSelectPackageCard = (pkg: any) => {
    setSelectedPackage(pkg);
    setPackagePrice(pkg.price);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedMember) {
      toast.error('Please select an active member for this upgrade.');
      return;
    }
    if (submitting) return; // Prevent double click
    setSubmitting(true);

    try {
      const upgradePayload = {
        invoiceNumber: fixedInvoiceNo,
        invoice: fixedInvoiceNo,
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        memberPhone: selectedMember.phone || '',
        mode: 'UPGRADE',
        transactionType: 'membership_upgrade',
        billingType: 'membership',
        plan: selectedPackage?.name || 'Upgraded Membership',
        packageName: selectedPackage?.name || 'Upgraded Membership',

        // Previous Billing Relationship (Old invoice untouched)
        previousInvoiceNumber: currentMembershipSnapshot.previousInvoiceNo,
        previousPackage: currentMembershipSnapshot.package,
        previousBillAmount: currentMembershipSnapshot.originalBill,
        previousAmountPaid: currentMembershipSnapshot.alreadyPaid,
        previousPending: currentMembershipSnapshot.currentPending,
        carryForward: carryForwardAmount,

        // Financial Ledger
        packagePrice: packagePrice,
        originalAmount: packagePrice,
        discountAmount: discountAmount,
        discount: discountAmount,
        discountType: discountType,
        netPayable: finalPayable,
        amount: finalPayable,
        amountPaid: amountPaidToday,
        paid: amountPaidToday,
        pendingAmount: remainingPending,
        balanceAmount: remainingPending,
        outstandingAmount: remainingPending,

        // Meta & Dates
        method: paymentMethod,
        paymentMethod: paymentMethod,
        status: remainingPending <= 0 ? 'paid' : (amountPaidToday > 0 ? 'partial' : 'pending'),
        date: billDate,
        invoiceDate: billDate,
        startDate: startDate,
        expiryDate: calculatedExpiryDate,
        createdAt: new Date().toISOString(),
        notes: `Membership upgraded to ${selectedPackage?.name}. Carry forward: ₹${carryForwardAmount}`,
      };

      // 1. Add to Firestore payments
      const docRef = await addDoc(collection(db, 'payments'), upgradePayload);
      const savedInvoice = { id: docRef.id, ...upgradePayload };

      // 2. Update Member Record (Atomic merge - preserving old history)
      const newTotalPaid = (Number(selectedMember.totalPaid) || 0) + amountPaidToday;
      const newTotalBilled = (Number(selectedMember.totalBilled) || 0) + finalPayable;

      await updateDoc(doc(db, 'members', selectedMember.id), {
        plan: selectedPackage?.name || selectedMember.plan,
        price: packagePrice,
        startDate: startDate,
        expiryDate: calculatedExpiryDate,
        status: calculatedExpiryDate >= todayYMD ? 'active' : 'expired',
        paymentStatus: remainingPending <= 0 ? 'paid' : (amountPaidToday > 0 ? 'partial' : 'pending'),
        totalBilled: newTotalBilled,
        totalPaid: newTotalPaid,
        outstandingBalance: remainingPending,
        updatedAt: new Date().toISOString(),
      });

      // 3. Refresh store state
      await fetchMembers(true);
      await fetchPayments(true);

      setSuccessInvoice(savedInvoice);
      toast.success(`Upgrade invoice ${fixedInvoiceNo} created! 🎉`);
    } catch (err: any) {
      console.error('Upgrade execution error:', err);
      toast.error('Failed to create upgrade invoice: ' + (err?.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const meta = MODE_METADATA[activeMode] || MODE_METADATA.upgrade;

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] pb-28 text-left font-sans">
      
      {/* ── 1. DEDICATED HEADER: BILLING TERMINAL ────────────────────────── */}
      <div className="bg-white border-b border-slate-200/90 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all border-none cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {meta.title}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-black uppercase text-[#0B5CBE]">
                  {activeMode.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                {meta.subtitle}
              </p>
            </div>
          </div>

          {/* FIXATED INVOICE NUMBER BADGE */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
            <Receipt size={16} className="text-[#0B5CBE]" />
            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Invoice No</span>
              <span className="font-mono text-xs font-black text-slate-900">{fixedInvoiceNo}</span>
            </div>
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        
        {successInvoice ? (
          /* ── 17. SUCCESS SCREEN ───────────────────────────────────────────────── */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl max-w-3xl mx-auto text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={38} />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900">UPGRADE SUCCESSFUL ✓</h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Transaction <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-bold">{successInvoice.invoiceNumber}</code> has been confirmed.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Member</span>
                <p className="font-black text-slate-900 mt-0.5">{selectedMember?.name}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Upgraded To</span>
                <p className="font-black text-[#0B5CBE] mt-0.5">{successInvoice.plan}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Paid Today</span>
                <p className="font-black text-emerald-700 font-mono mt-0.5">₹{successInvoice.amountPaid.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">New Expiry</span>
                <p className="font-black text-slate-900 font-mono mt-0.5">{formatDate(successInvoice.expiryDate)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowPreviewModal(true)}
                className="px-4 py-2.5 bg-blue-50 text-[#0B5CBE] border border-blue-200 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Eye size={15} /> VIEW INVOICE
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Printer size={15} /> PRINT INVOICE
              </button>
              <button
                onClick={() => {
                  setSuccessInvoice(null);
                  router.push('/dashboard/billing');
                }}
                className={`px-5 py-2.5 ${BLUE_GRADIENT} ${BLUE_GRADIENT_HOVER} text-white rounded-xl font-bold text-xs shadow-md border-none cursor-pointer flex items-center gap-1.5`}
              >
                DONE
              </button>
            </div>
          </motion.div>
        ) : (
          /* ── MAIN BILLING TERMINAL ENGINE ─────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT 7 COLS: STEP 1 TO STEP 5 */}
            <div className="lg:col-span-7 space-y-6">

              {/* ── STEP 1: UPGRADE MEMBER & CURRENT MEMBERSHIP SNAPSHOT ───────── */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0B5CBE] block">
                  STEP 1 — UPGRADE MEMBER PROFILE
                </span>

                {/* Search / Select Member Dropdown if no member in URL */}
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

                  {showMemberDropdown && !selectedMember && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {members.filter((m: any) => (m.name || '').toLowerCase().includes(memberSearch.toLowerCase())).slice(0, 8).map((m: any) => (
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
                              <div className="text-[10px] text-slate-400 font-medium">{m.memberId || m.id} • {m.phone}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{m.status || 'Active'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* MEMBER DETAILS CARD */}
                {selectedMember ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-blue-100 text-[#0B5CBE] font-black text-sm flex items-center justify-center border border-blue-200">
                          {selectedMember.name?.[0] || 'M'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-slate-900">{selectedMember.name}</h3>
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-[#0B5CBE] text-[10px] font-black">
                              {selectedMember.memberId || selectedMember.id}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            BIO-{selectedMember.biometricId || selectedMember.deviceUserId || '221'} • Status: <span className="text-emerald-700 font-bold uppercase">{selectedMember.status || 'ACTIVE'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CURRENT MEMBERSHIP SNAPSHOT */}
                    <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2.5">
                      <span className="text-[10px] font-black uppercase text-[#0B5CBE] block tracking-wider">
                        CURRENT MEMBERSHIP SNAPSHOT
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Current Package</span>
                          <span className="font-extrabold text-slate-900">{currentMembershipSnapshot.package}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Start Date</span>
                          <span className="font-bold text-slate-700">{formatDate(currentMembershipSnapshot.startDate)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Expiry Date</span>
                          <span className="font-bold text-slate-700">{formatDate(currentMembershipSnapshot.expiryDate)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Original Bill</span>
                          <span className="font-mono font-bold text-slate-800">₹{currentMembershipSnapshot.originalBill.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Already Paid</span>
                          <span className="font-mono font-bold text-emerald-700">₹{currentMembershipSnapshot.alreadyPaid.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Current Pending</span>
                          <span className="font-mono font-black text-red-600">₹{currentMembershipSnapshot.currentPending.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-400">
                    Select a member above to load membership snapshot
                  </div>
                )}
              </div>

              {/* ── STEP 2: SELECT NEW MEMBERSHIP PACKAGE ──────────────────────── */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0B5CBE] block">
                  STEP 2 — SELECT NEW MEMBERSHIP PACKAGE
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {activePackages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => handleSelectPackageCard(pkg)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative flex flex-col justify-between ${
                          isSelected
                            ? `${BLUE_GRADIENT} text-white border-none shadow-md`
                            : 'bg-white border-slate-200 hover:border-blue-200 text-slate-800'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white text-[#0B5CBE] flex items-center justify-center font-bold">
                            <Check size={12} />
                          </div>
                        )}
                        <div>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded inline-block ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-[#0B5CBE]'
                          }`}>
                            {pkg.tag}
                          </span>
                          <div className={`text-xs font-black mt-1.5 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {pkg.name}
                          </div>
                        </div>
                        <div className={`text-base font-black font-mono mt-2 ${isSelected ? 'text-white' : 'text-[#0B5CBE]'}`}>
                          ₹{pkg.price.toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── STEP 3: UPGRADE DATES & BILL DATE ─────────────────────────── */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0B5CBE] block">
                  STEP 3 — UPGRADE DATES
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0B5CBE]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Bill Date (Transaction)</label>
                    <input
                      type="date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0B5CBE]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Calculated Expiry</label>
                    <div className="w-full bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs font-black text-[#0B5CBE] font-mono">
                      {formatDate(calculatedExpiryDate)}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── STEP 4: CARRY FORWARD (AUTO-CALCULATED) ────────────────────── */}
              <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                      CARRY FORWARD (AUTO CALCULATED FROM PREVIOUS PENDING)
                    </span>
                  </div>
                  <span className="font-mono font-black text-sm text-red-600">
                    ₹{carryForwardAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="bg-white rounded-xl p-3.5 border border-amber-200 text-xs space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>Previous Invoice No:</span>
                    <span className="font-mono font-bold">{currentMembershipSnapshot.previousInvoiceNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Previous Bill Amount:</span>
                    <span className="font-mono font-bold">₹{currentMembershipSnapshot.originalBill.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Already Paid:</span>
                    <span className="font-mono font-bold text-emerald-700">₹{currentMembershipSnapshot.alreadyPaid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                    <span>Previous Pending (Carry Forward):</span>
                    <span className="font-mono text-red-600 font-black">₹{carryForwardAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* ── STEP 5: DISCOUNT & AMOUNT PAYABLE ─────────────────────────── */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0B5CBE] block">
                  STEP 5 — DISCOUNT &amp; PAYMENT SETTLEMENT
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Discount</label>
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#0B5CBE]"
                      />
                    </div>
                  </div>

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
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                {/* HIGHLIGHTED AMOUNT PAYABLE CARD */}
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#0B5CBE] tracking-wider block">FINAL AMOUNT PAYABLE</span>
                    <p className="text-xs text-slate-500 font-medium">Package (₹{packagePrice}) + Carry (₹{carryForwardAmount}) - Discount (₹{discountAmount})</p>
                  </div>
                  <span className="text-2xl font-black text-[#0B5CBE] font-mono">
                    ₹{finalPayable.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* AMOUNT PAID & REMAINING PENDING */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Amount Paid Today (₹)</label>
                    <input
                      type="number"
                      value={amountPaidToday}
                      onChange={(e) => {
                        setUserEditedPaid(true);
                        setAmountPaidToday(Number(e.target.value) || 0);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-900 outline-none focus:border-[#0B5CBE] font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Remaining Pending</label>
                    <div className={`p-2.5 rounded-xl border text-xs font-black font-mono flex items-center justify-between ${
                      remainingPending > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      <span>₹{remainingPending.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] uppercase">{paymentStatusLabel}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT 5 COLS: STICKY UPGRADE SUMMARY PANEL */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-md sticky top-24 space-y-5">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-[#0B5CBE]" />
                    <h3 className="font-extrabold text-sm text-slate-900">UPGRADE SUMMARY</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-blue-50 text-[#0B5CBE] px-2 py-0.5 rounded border border-blue-100">
                    LIVE
                  </span>
                </div>

                {/* SUMMARY ROWS */}
                <div className="space-y-2.5 text-xs text-slate-600 font-medium">
                  
                  <div className="flex justify-between">
                    <span>Member:</span>
                    <span className="font-extrabold text-slate-900">{selectedMember?.name || 'Not Selected'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Current Package:</span>
                    <span className="font-bold text-slate-700">{currentMembershipSnapshot.package}</span>
                  </div>

                  <div className="flex justify-between text-[#0B5CBE] font-bold">
                    <span>New Package:</span>
                    <span>{selectedPackage?.name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Bill Date (Transaction):</span>
                    <span className="font-mono font-bold text-slate-800">{formatDate(billDate)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>New Expiry Date:</span>
                    <span className="font-mono font-bold text-[#0B5CBE]">{formatDate(calculatedExpiryDate)}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-between">
                    <span>New Package Amount:</span>
                    <span className="font-mono font-bold text-slate-900">₹{packagePrice.toLocaleString('en-IN')}</span>
                  </div>

                  {carryForwardAmount > 0 && (
                    <div className="flex justify-between text-amber-700 font-bold">
                      <span>Carry Forward:</span>
                      <span className="font-mono">+₹{carryForwardAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount:</span>
                      <span className="font-mono">-₹{discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="font-black text-slate-900 text-sm">Final Payable</span>
                    <span className="font-black text-lg text-[#0B5CBE] font-mono">
                      ₹{finalPayable.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50/60 p-2 rounded-xl">
                    <span>Paid Today</span>
                    <span className="font-mono">₹{amountPaidToday.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-red-600 font-bold bg-red-50/60 p-2 rounded-xl">
                    <span>Remaining Pending</span>
                    <span className="font-mono">₹{remainingPending.toLocaleString('en-IN')}</span>
                  </div>

                </div>

                {/* ACTION BUTTONS */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Eye size={15} /> PREVIEW INVOICE
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmUpgrade}
                    disabled={submitting || !selectedMember}
                    className={`w-full py-3.5 px-4 ${BLUE_GRADIENT} ${BLUE_GRADIENT_HOVER} text-white font-black text-xs rounded-xl shadow-lg transition-all border-none cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" /> GENERATING UPGRADE BILL...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} /> GENERATE UPGRADE BILL
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>

      {/* ── 13. INVOICE PREVIEW MODAL BEFORE CONFIRMATION ──────────────────── */}
      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt size={18} className="text-[#0B5CBE]" />
                  <h3 className="font-extrabold text-sm text-slate-900">Official Invoice Preview</h3>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center border-none cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <OfficialInvoiceReceipt
                invoice={{
                  invoiceNumber: fixedInvoiceNo,
                  invoiceDate: billDate,
                  plan: selectedPackage?.name,
                  originalAmount: packagePrice,
                  discountAmount: discountAmount,
                  carryForward: carryForwardAmount,
                  netPayable: finalPayable,
                  amountPaid: amountPaidToday,
                  pendingAmount: remainingPending,
                  paymentMethod: paymentMethod,
                  startDate: startDate,
                  expiryDate: calculatedExpiryDate,
                  isUpgrade: true,
                  previousInvoiceNumber: currentMembershipSnapshot.previousInvoiceNo,
                  previousPaidAmount: currentMembershipSnapshot.alreadyPaid,
                }}
                member={selectedMember || { name: 'Sample Member', memberId: 'AZ-2026-0029' }}
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 cursor-pointer"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    handleConfirmUpgrade();
                  }}
                  className={`px-5 py-2 ${BLUE_GRADIENT} ${BLUE_GRADIENT_HOVER} text-white rounded-xl font-bold text-xs shadow-md border-none cursor-pointer flex items-center gap-1.5`}
                >
                  <ShieldCheck size={15} /> Confirm &amp; Generate Bill
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function UniversalBillingTerminalPage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
        <RefreshCw size={16} className="animate-spin text-[#0B5CBE]" /> Loading Billing Terminal...
      </div>
    }>
      <UniversalBillingTerminalContent />
    </Suspense>
  );
}
