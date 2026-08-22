'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, DollarSign, Receipt, AlertCircle, Plus, Download, Search, 
  TrendingUp, X, RefreshCw, Printer, Mail, MessageSquare, Share2, 
  CheckCircle2, Phone, Calendar, ArrowUpRight, Shield, Filter, Check, Wallet, Smartphone, Banknote,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query, updateDoc, doc } from 'firebase/firestore';
import { paymentEngine } from '@/lib/engines/paymentEngine';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { useGymStore } from '@/store';
import toast from 'react-hot-toast';
import InvoiceBuilderModal from './components/InvoiceBuilderModal';
import OfficialInvoiceReceipt from '../components/OfficialInvoiceReceipt';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const payMethods: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  UPI:           { icon: Smartphone, label: 'UPI / QR', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  Cash:          { icon: Banknote,   label: 'Cash',     color: '#16a34a', bg: 'rgba(22,163,74,0.1)'  },
  Card:          { icon: CreditCard, label: 'Card',     color: '#2563eb', bg: 'rgba(37,99,235,0.1)'  },
  NetBanking:    { icon: Wallet,     label: 'Net Bank', color: '#0284c7', bg: 'rgba(2,132,199,0.1)'  },
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: "easeOut" as const },
});

export default function BillingPage() {
  const { members, fetchPayments: refreshStorePayments } = useGymStore();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(localSearch);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Real-time Firestore listener with member billing history fallback
  useEffect(() => {
    setLoading(true);

    const getFallbackPayments = () => {
      const allInvoices: any[] = [];
      members.forEach((m: any) => {
        const history = Array.isArray(m.billingHistory) && m.billingHistory.length > 0
          ? m.billingHistory
          : (Array.isArray(m.payments) && m.payments.length > 0 ? m.payments : []);

        history.forEach((inv: any, idx: number) => {
          allInvoices.push({
            id: inv.id || `pay_${m.id || m.memberId}_${idx}`,
            invoice: inv.invoice || inv.invoiceNumber || `INV-${String(idx + 1).padStart(6, '0')}`,
            memberId: m.id || m.memberId,
            memberName: m.name || 'Member',
            memberPhone: m.phone || '',
            plan: inv.plan || inv.package || m.plan || 'Monthly Access',
            amount: Number(inv.amount) || Number(m.totalBilled) || 2500,
            paid: Number(inv.paid) || Number(inv.amount) || 2500,
            pendingAmount: 0,
            status: inv.status || 'paid',
            method: inv.method || inv.paymentMethod || inv.paymentMode || m.paymentMethod || m.method || 'Cash',
            date: inv.date || inv.createdAt || m.joinDate || todayStr,
            isRealTimeToday: inv.isRealTimeToday || false
          });
        });
      });
      return allInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const q = query(collection(db, 'payments'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const fallbacks = getFallbackPayments();
      const combinedMap = new Map<string, any>();
      fallbacks.forEach(item => combinedMap.set(item.invoice || item.id, item));
      data.forEach(item => combinedMap.set(item.invoice || item.id, item));

      const merged = Array.from(combinedMap.values()).sort((a: any, b: any) => {
        const aInv = String(a.invoice || a.invoiceNumber || '');
        const bInv = String(b.invoice || b.invoiceNumber || '');

        const aIsLegacy = a.isLegacyImport === true || aInv.startsWith('LEG-') || String(a.notes || '').includes('Legacy Import');
        const bIsLegacy = b.isLegacyImport === true || bInv.startsWith('LEG-') || String(b.notes || '').includes('Legacy Import');

        // Real user transactions ALWAYS take top priority over legacy migration imports
        if (!aIsLegacy && bIsLegacy) return -1;
        if (aIsLegacy && !bIsLegacy) return 1;

        // Within real transactions or legacy transactions, sort by timestamp / date descending
        const timeA = new Date(a.createdAt || a.date || 0).getTime();
        const timeB = new Date(b.createdAt || b.date || 0).getTime();
        return timeB - timeA;
      });

      setPayments(merged.length > 0 ? merged : fallbacks);
      setLoading(false);
    }, (err) => {
      setPayments(getFallbackPayments());
      setLoading(false);
    });

    return () => unsub();
  }, [members, todayStr]);

  // Derived stats (ignoring VOID and duplicate invoices)
  const validPayments = useMemo(() => payments.filter(p => p && p.status !== 'VOID' && p.status !== 'void' && !p.isDuplicate), [payments]);
  const paidPayments = useMemo(() => validPayments.filter(p => (p.status || '').toLowerCase() === 'paid'), [validPayments]);
  
  // Today's Real Collections (includes cash, UPI, card payments collected today)
  const todaysRealCollection = useMemo(() => {
    return paidPayments
      .filter(p => {
        if (!p || p.isLegacyImport || p.isHistorical || p.isSample || p.isMock) return false;
        const pDate = String(p.date || p.paymentDate || p.createdAt || '').split('T')[0];
        return pDate === todayStr || p.isRealTimeToday;
      })
      .reduce((s, p) => s + (Number(p.paid) || Number(p.amountPaid) || Number(p.amount) || 0), 0);
  }, [paidPayments, todayStr]);

  const totalCollected = useMemo(() => paidPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0), [paidPayments]);
  const overdueCount   = useMemo(() => payments.filter(p => (p.status || '').toLowerCase() === 'pending' || (p.status || '').toLowerCase() === 'overdue').length, [payments]);
  const avgTicket      = useMemo(() => paidPayments.length ? totalCollected / paidPayments.length : 0, [paidPayments, totalCollected]);

  // Method breakdown totals
  const methodTotals = useMemo(() => {
    const counts: Record<string, { total: number; count: number }> = {
      UPI: { total: 0, count: 0 },
      Cash: { total: 0, count: 0 },
      Card: { total: 0, count: 0 },
      NetBanking: { total: 0, count: 0 },
    };

    paidPayments.forEach(p => {
      const m = String(p.method || 'UPI').trim();
      const norm = m.includes('Cash') ? 'Cash' : m.includes('Card') ? 'Card' : m.includes('Net') ? 'NetBanking' : 'UPI';
      counts[norm].total += Number(p.paid || p.amount || 0);
      counts[norm].count += 1;
    });

    return counts;
  }, [paidPayments]);

  const handleMarkPaid = async (p: any) => {
    if (!window.confirm(`Mark ₹${(Number(p.amount)||0).toLocaleString('en-IN')} invoice as PAID for ${p.memberName}?`)) return;
    setMarkingPaid(p.id);
    try {
      const total = Number(p.amount) || 0;
      await updateDoc(doc(db, 'payments', p.id), {
        status: 'paid',
        paid: total,
        pendingAmount: 0,
        isRealTimeToday: true
      });
      
      if (p.memberId) {
        await updateDoc(doc(db, 'members', p.memberId), {
          paymentStatus: 'paid',
          paidAmount: total,
          pendingAmount: 0,
          status: 'active'
        });
      }

      toast.success(`Payment marked as PAID for ${p.memberName}! 🎉`);
      refreshStorePayments();
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleShareWhatsApp = (p: any) => {
    const member = members.find((m: any) => m.id === p.memberId);
    const phone = (member?.phone || p.memberPhone || '').replace(/\D/g, '');
    if (!phone || phone.length < 10) {
      toast.error('No valid phone number found for this member.');
      return;
    }
    const total = Number(p.amount) || 0;
    const msg = encodeURIComponent(
      `🏋️ Alpha Zone Gym — Official Payment Receipt\n\nInvoice No: ${p.invoice || 'N/A'}\nClient Name: ${p.memberName}\nPlan: ${p.plan || 'Membership'}\nAmount Billed: ₹${total.toLocaleString('en-IN')}\nPayment Method: ${p.method || 'UPI'}\nStatus: ${(p.status || 'paid').toUpperCase()} ✅\nDate: ${p.date || todayStr}\n\nThank you for training with Alpha Zone Gym! 💪`
    );
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank');
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const name = (p.memberName || '').toLowerCase();
      const inv  = (p.invoice || '').toLowerCase();
      const phone = (p.memberPhone || '').toLowerCase();
      const q    = search.toLowerCase();
      const matchesSearch = name.includes(q) || inv.includes(q) || phone.includes(q);

      const pStatus = (p.status || 'paid').toLowerCase();
      const matchesStatus = statusFilter === 'all'
        ? true
        : statusFilter === 'paid' ? pStatus === 'paid' : pStatus !== 'paid';

      const pMethod = String(p.method || 'UPI');
      const matchesMethod = methodFilter === 'all'
        ? true
        : pMethod.toLowerCase().includes(methodFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [payments, search, statusFilter, methodFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  return (
    <div className="w-full space-y-6 pb-12 text-left">

      {/* ── HERO HEADER CARD ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[24px] px-6 pt-6 pb-8 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 left-0 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9.5px] font-black uppercase tracking-[0.15em] text-emerald-400 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Billing Ledger • Automatic Receipts
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              Payments &amp; <span className="text-pink-400">Billing Manager</span> 💳
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1.5 font-medium">
              Track daily collections, collect membership fees, and issue GST digital receipts.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => setShowInvoiceModal('Gym')}
              className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-extrabold px-5 py-3 rounded-2xl shadow-lg shadow-pink-600/30 transition-all border border-pink-400/30 flex items-center gap-2 uppercase tracking-wider cursor-pointer active:scale-95"
            >
              <Plus size={16} /> + Collect Membership Payment
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 STAT CARDS ── */}
      <motion.div {...fadeUp(0.1)} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today's Real Collection */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] flex items-center gap-4 hover:border-emerald-400 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Today's Collection</span>
            <h3 className="text-2xl font-black text-emerald-600 mt-0.5 leading-none">
              ₹{todaysRealCollection.toLocaleString('en-IN')}
            </h3>
            <p className="text-[9px] font-bold text-slate-400 mt-1">Collected today</p>
          </div>
        </div>

        {/* Total Subscription Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] flex items-center gap-4 hover:border-purple-400 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Receipt size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Revenue</span>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5 leading-none">
              ₹{totalCollected.toLocaleString('en-IN')}
            </h3>
            <p className="text-[9px] font-bold text-slate-400 mt-1">{paidPayments.length} paid invoices</p>
          </div>
        </div>

        {/* Average Plan Ticket */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] flex items-center gap-4 hover:border-sky-400 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Average Ticket</span>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5 leading-none">
              ₹{Math.round(avgTicket).toLocaleString('en-IN')}
            </h3>
            <p className="text-[9px] font-bold text-slate-400 mt-1">Per transaction avg</p>
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] flex items-center gap-4 hover:border-amber-400 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Pending Payments</span>
            <h3 className="text-2xl font-black text-amber-600 mt-0.5 leading-none">
              {overdueCount} Invoices
            </h3>
            <p className="text-[9px] font-bold text-amber-600 mt-1">Action required</p>
          </div>
        </div>

      </motion.div>

      {/* ── PAYMENT METHODS BREAKDOWN STRIP ── */}
      <motion.div {...fadeUp(0.15)} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(payMethods).map(([key, item]) => {
          const stats = methodTotals[key] || { total: 0, count: 0 };
          const IconComp = item.icon;
          const isSelected = methodFilter === key;

          return (
            <button
              key={key}
              onClick={() => setMethodFilter(isSelected ? 'all' : key)}
              className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between ${
                isSelected 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : item.bg, color: isSelected ? '#fff' : item.color }}
                >
                  <IconComp size={18} />
                </div>
                <div>
                  <div className={`text-[10px] font-extrabold uppercase tracking-wider ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                    {item.label}
                  </div>
                  <div className={`text-base font-black mt-0.5 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    ₹{stats.total.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {stats.count}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* ── FILTER & SEARCH BAR ── */}
      <motion.div {...fadeUp(0.2)} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Member Name, Phone, or Invoice #..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-pink-500 transition-all"
          />
          {localSearch && (
            <button onClick={() => { setLocalSearch(''); setSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none cursor-pointer bg-transparent">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
            {(['all', 'paid', 'pending'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => { setStatusFilter(mode); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer border-none ${
                  statusFilter === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {mode === 'all' ? 'All Status' : mode}
              </button>
            ))}
          </div>

          {(methodFilter !== 'all' || statusFilter !== 'all' || localSearch) && (
            <button
              onClick={() => { setLocalSearch(''); setSearch(''); setStatusFilter('all'); setMethodFilter('all'); setPage(1); }}
              className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-rose-200 cursor-pointer shrink-0"
            >
              Clear Filters
            </button>
          )}
        </div>

      </motion.div>

      {/* ── TRANSACTIONS TABLE ── */}
      <motion.div {...fadeUp(0.25)} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-pink-600" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
              Payment Transactions History ({filteredPayments.length})
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Sorted by Latest</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin text-pink-600" /> Loading payment records...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No payment records found</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing filters or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-6">Member &amp; Client</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Plan / Package</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {paginatedPayments.map((p, idx) => {
                  const isPaid = (p.status || 'paid').toLowerCase() === 'paid';
                  const methodNorm = String(p.method || 'UPI');
                  const MethodIcon = methodNorm.includes('Cash') ? Banknote : methodNorm.includes('Card') ? CreditCard : Smartphone;

                  return (
                    <tr key={p.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                            {getInitials(p.memberName || 'M')}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900">{p.memberName || 'Client Member'}</div>
                            <div className="text-[10px] text-slate-400 font-bold">{p.memberPhone || 'No Phone'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {p.invoice || `INV-${String(idx+1).padStart(6, '0')}`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{p.plan || 'Monthly Standard'}</span>
                      </td>

                      <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                        ₹{(Number(p.paid) || Number(p.amount) || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <MethodIcon size={12} /> {p.method || 'UPI'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        <div className="font-bold text-slate-900">{formatDate(p.date || p.createdAt || todayStr)}</div>
                        <div className="text-[10px] text-slate-400 font-sans font-medium">
                          {p.createdAt ? new Date(p.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Live Sync'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isPaid ? <CheckCircle2 size={10}/> : <AlertCircle size={10}/>}
                          {isPaid ? 'Paid' : 'Pending'}
                        </span>
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isPaid && (
                            <button
                              onClick={() => handleMarkPaid(p)}
                              disabled={markingPaid === p.id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] border-none cursor-pointer"
                            >
                              Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedReceipt(p)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border-none cursor-pointer"
                            title="View Receipt"
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            onClick={() => handleShareWhatsApp(p)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border-none cursor-pointer"
                            title="Share on WhatsApp"
                          >
                            <Share2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── PAGINATION FOOTER ── */}
        {!loading && filteredPayments.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 bg-slate-50/30">
            <div>
              Showing {filteredPayments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredPayments.length)} of {filteredPayments.length} transactions
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button 
                  disabled={currentPage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="p-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 3 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button 
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span>Per page:</span>
                <select 
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 border border-slate-200 rounded bg-white font-medium text-slate-700 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── MODAL 1: INVOICE BUILDER MODAL ── */}
      <InvoiceBuilderModal 
        isOpen={!!showInvoiceModal}
        type={showInvoiceModal}
        onClose={() => setShowInvoiceModal(null)}
        members={members}
      />

      {/* ── MODAL 2: UNIVERSAL OFFICIAL INVOICE PREVIEW MODAL ── */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedReceipt(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden text-left z-10 p-6 space-y-4 max-h-[92vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">Official Tax Invoice &amp; Receipt</h3>
                <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-slate-700 border-none cursor-pointer bg-transparent"><X size={20}/></button>
              </div>

              {/* Universal Official Invoice Receipt Template */}
              <OfficialInvoiceReceipt 
                invoice={selectedReceipt} 
                member={members.find((m: any) => m.id === selectedReceipt.memberId || m.memberId === selectedReceipt.memberId) || {
                  name: selectedReceipt.memberName,
                  phone: selectedReceipt.memberPhone,
                  memberId: selectedReceipt.memberId,
                  biometricId: selectedReceipt.memberId,
                  plan: selectedReceipt.plan,
                  joinDate: selectedReceipt.date
                }}
              />

              <div className="pt-2 flex gap-3 max-w-[800px] mx-auto">
                <button onClick={() => window.print()} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-md">
                  <Printer size={15} /> Print Official Invoice
                </button>
                <button onClick={() => handleShareWhatsApp(selectedReceipt)} className="py-3 px-6 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-200">
                  <Share2 size={15} /> Share WhatsApp
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
