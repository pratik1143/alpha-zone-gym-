'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, DollarSign, Receipt, AlertCircle, Plus, Download, Search, TrendingUp, X, RefreshCw, Printer, Mail, MessageSquare, Share2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query, updateDoc, doc } from 'firebase/firestore';
import { paymentEngine } from '@/lib/engines/paymentEngine';
import { formatCurrency, formatDate, getInitials, getMembershipName } from '@/lib/utils';
import { useGymStore } from '@/store';
import toast from 'react-hot-toast';
import InvoiceBuilderModal from './components/InvoiceBuilderModal';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const payMethods: Record<string, { icon: string; color: string; bg: string }> = {
  UPI:           { icon: '📱', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
  Cash:          { icon: '💵', color: '#16a34a', bg: 'rgba(22,163,74,0.08)'  },
  Razorpay:      { icon: '💳', color: '#2563eb', bg: 'rgba(37,99,235,0.08)'  },
  'Credit Card': { icon: '💳', color: '#dc2626', bg: 'rgba(220,38,38,0.08)'  },
  PhonePe:       { icon: '📲', color: '#5b21b6', bg: 'rgba(91,33,182,0.08)'  },
};

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="bg-white rounded-[20px] p-5 border border-slate-100"
      style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${color}14` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{sub || 'Real-Time'}</span>
      </div>
      <div className="text-[26px] font-black text-slate-900 leading-none mb-1">{value}</div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default function BillingPage() {
  const { members } = useGymStore();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showBillingDropdown, setShowBillingDropdown] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState<string | null>(null);

  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  // Real-time Firestore listener
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'payments'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayments(data);
      setLoading(false);
    }, (err) => {
      console.error('Firestore payments error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Mark a payment as fully paid using paymentEngine
  const handleMarkPaid = async (p: any) => {
    if (!window.confirm(`Mark ₹${(Number(p.amount)||0).toLocaleString('en-IN')} invoice as PAID for ${p.memberName}?`)) return;
    setMarkingPaid(p.id);
    try {
      const total = Number(p.amount) || 0;
      await updateDoc(doc(db, 'payments', p.id), {
        status: 'paid',
        paid: total,
        pendingAmount: 0,
      });
      // Also update invoices collection if it exists
      try {
        await updateDoc(doc(db, 'invoices', p.id), { status: 'paid', paid: total, pendingAmount: 0 });
      } catch (_) {}
      
      if (p.memberId) {
        await updateDoc(doc(db, 'members', p.memberId), {
          paymentStatus: 'paid',
          paidAmount: total,
          pendingAmount: 0,
        });
      }

      toast.success(`✅ ${p.memberName} — Payment marked as PAID!`);
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    } finally {
      setMarkingPaid(null);
    }
  };

  // Share invoice via WhatsApp
  const handleShareWhatsApp = (p: any) => {
    const member = members.find((m: any) => m.id === p.memberId);
    const phone = (member?.phone || p.memberPhone || '').replace(/\D/g, '');
    if (!phone || phone.length < 10) {
      toast.error('No valid phone number found for this member.');
      return;
    }
    const total = (Number(p.amount) || 0) + (Number(p.gst) || 0);
    const outstanding = paymentEngine.calculateOutstandingAmount(total, Number(p.paid) || 0);
    const msg = encodeURIComponent(
      `🏋️ Alpha Zone Gym — Invoice\n\nInvoice No: ${p.invoice || 'N/A'}\nPlan: ${p.plan || 'Membership'}\nAmount: ₹${total.toLocaleString('en-IN')}\nStatus: ${(p.status || 'pending').toUpperCase()}\n${outstanding > 0 ? `Outstanding: ₹${outstanding.toLocaleString('en-IN')}` : 'Fully Paid ✅'}\n\nThank you for being part of Alpha Zone! 💪`
    );
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank');
  };

  // Derived stats — fully computed from Firestore payments
  const paidPayments  = payments.filter(p => p.status === 'paid');
  const totalCollected = paidPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalGST       = paidPayments.reduce((s, p) => s + (Number(p.gst) || 0), 0);
  const overdueCount   = payments.filter(p => p.status === 'overdue').length;
  const avgTicket      = paidPayments.length ? totalCollected / paidPayments.length : 0;

  // Monthly revenue trend — built from actual payment dates
  const currentYear = new Date().getFullYear();
  const revenueTrendData = MONTHS.map((month, idx) => {
    const revenue = paidPayments
      .filter(p => {
        const d = new Date(p.date);
        return d.getFullYear() === currentYear && d.getMonth() === idx;
      })
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return { month, revenue };
  }).filter((_, idx) => idx <= new Date().getMonth()); // only up to current month

  // Month-over-month growth
  const len = revenueTrendData.length;
  const thisMonthRev = len >= 1 ? revenueTrendData[len - 1].revenue : 0;
  const lastMonthRev = len >= 2 ? revenueTrendData[len - 2].revenue : 0;
  const growth = lastMonthRev > 0
    ? (((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1)
    : null;

  const filtered = payments.filter(p => {
    const name = (p.memberName || '').toLowerCase();
    const inv  = (p.invoice || '').toLowerCase();
    const q    = search.toLowerCase();
    return name.includes(q) || inv.includes(q);
  });

  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-display">Payments &amp; Billing</h1>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            Live · GST Invoices · UPI · Cards · Cash ledger
          </p>
        </div>
        <div className="flex gap-2 relative">
          <button
            onClick={() => toast.success('GST Report feature coming soon!')}
            className="btn-cyber-outline text-xs py-2"
          >
            <Download size={13} /> GST Report
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowBillingDropdown(!showBillingDropdown)}
              className="bg-pink-500 hover:bg-pink-600 text-white text-xs font-black px-4 py-2 rounded-xl border-2 border-pink-600 transition-all shadow-sm flex items-center gap-1.5 uppercase tracking-wider"
              style={{ boxShadow: '0 4px 14px rgba(236, 72, 153, 0.3)' }}
            >
              BILLING & PAYMENTS
            </button>
            
            {showBillingDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowBillingDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden py-1 transform origin-top-right">
                  {[
                    { label: 'Gym membership bill', type: 'Gym' },
                    { label: 'Personal training bill', type: 'PT' },
                    { label: 'Group class bill', type: 'Group' },
                    { label: 'POS', type: 'POS' }
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setShowInvoiceModal(item.type);
                        setShowBillingDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-pink-600 transition-colors border-b border-slate-50 last:border-0"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <InvoiceBuilderModal 
        isOpen={!!showInvoiceModal}
        type={showInvoiceModal}
        onClose={() => setShowInvoiceModal(null)}
        members={members}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Collections"  value={loading ? '...' : formatCurrency(totalCollected)} icon={DollarSign}  color="#16a34a" />
        <StatCard label="GST Collected"      value={loading ? '...' : formatCurrency(totalGST)}       icon={Receipt}     color="#7c3aed" />
        <StatCard label="Overdue Pending"    value={loading ? '...' : `${overdueCount} payments`}     icon={AlertCircle} color="#dc2626" />
        <StatCard label="Average Ticket"     value={loading ? '...' : formatCurrency(avgTicket)}      icon={TrendingUp}  color="#2563eb" />
      </div>

      {/* Revenue Chart — real data */}
      <div className="bg-white rounded-[20px] p-6 border border-slate-100"
        style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-black text-base text-slate-900">Revenue Trend</h3>
            <p className="text-[10px] text-slate-400 font-medium">Monthly collections — {currentYear}</p>
          </div>
          {growth !== null && (
            <div className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full border ${
              Number(growth) >= 0
                ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                : 'text-red-500 bg-red-50 border-red-100'
            }`}>
              <TrendingUp size={11} />
              {Number(growth) >= 0 ? '+' : ''}{growth}% vs last month
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-[180px] flex items-center justify-center text-slate-400 text-xs gap-2">
            <RefreshCw size={14} className="animate-spin" /> Loading chart...
          </div>
        ) : revenueTrendData.every(d => d.revenue === 0) ? (
          <div className="h-[180px] flex flex-col items-center justify-center text-slate-300 text-sm gap-2">
            <DollarSign size={32} />
            <span>No payment data yet for {currentYear}</span>
          </div>
        ) : (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#d4ff00" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#d4ff00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 12, fontSize: 11, color: '#0f172a', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#d4ff00" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Payment Method Splits — real data */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(payMethods).map(([method, cfg], i) => {
          const cnt   = paidPayments.filter(p => p.method === method).length;
          const total = paidPayments.filter(p => p.method === method).reduce((s, p) => s + (Number(p.amount) || 0), 0);
          return (
            <div key={i} className="bg-white rounded-[18px] p-4 text-center cursor-pointer transition-all hover:-translate-y-1"
              style={{ border: '1px solid rgba(15,23,42,0.07)', boxShadow: '0 2px 10px rgba(15,23,42,0.05)' }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2.5" style={{ background: cfg.bg }}>
                <span className="text-lg">{cfg.icon}</span>
              </div>
              <div className="font-black text-xs text-slate-800">{method}</div>
              <div className="text-sm font-black mt-1" style={{ color: cfg.color }}>{formatCurrency(total)}</div>
              <div className="text-[9px] text-slate-400 font-bold mt-0.5">{cnt} payments</div>
            </div>
          );
        })}
      </div>

      {/* Payment History Table */}
      <div className="bg-white rounded-[20px] overflow-hidden border border-slate-100"
        style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-sm text-slate-900">Payment History Log</h3>
            <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">
              {payments.length} records
            </span>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice or member..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-700 outline-none focus:border-[#d4ff00] focus:bg-white transition-all w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="cyber-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Member</th>
                <th>Plan</th>
                <th>Base Amount</th>
                <th>GST (18%)</th>
                <th>Total Paid</th>
                <th>Method</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400 text-xs">
                    <RefreshCw size={16} className="animate-spin inline mr-2" />
                    Loading payments from Firestore...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-14 text-slate-400 text-xs">
                    <DollarSign size={28} className="mx-auto mb-2 opacity-20" />
                    {search ? 'No results found.' : 'No payment records yet. Add a member to get started.'}
                  </td>
                </tr>
              )}
              {!loading && filtered.map(p => (
                <tr key={p.id}>
                  <td className="font-mono text-[11px] font-bold text-blue-600">{p.invoice || '—'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600">
                        {getInitials(p.memberName || '?')}
                      </div>
                      <span className="font-bold text-xs text-slate-800">{p.memberName || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="text-xs text-slate-500">{p.plan?.split(' ')[0] || '—'}</td>
                  <td className="text-xs font-semibold text-slate-800">{formatCurrency(Number(p.amount) || 0)}</td>
                  <td className="text-xs font-semibold text-violet-600">{formatCurrency(Number(p.gst) || 0)}</td>
                  <td className="text-sm font-black text-emerald-700">{formatCurrency((Number(p.amount) || 0) + (Number(p.gst) || 0))}</td>
                  <td>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: payMethods[p.method]?.bg || '#f1f5f9', color: payMethods[p.method]?.color || '#64748b' }}>
                      {payMethods[p.method]?.icon} {p.method || '—'}
                    </span>
                  </td>
                  <td className="text-[11px] text-slate-400">{formatDate(p.date)}</td>
                  <td>
                    <span className={p.status === 'paid' ? 'badge-green' : p.status === 'partial' ? 'badge-yellow' : p.status === 'overdue' ? 'badge-red' : 'badge-yellow'}>
                      {(p.status || 'pending').toUpperCase()}
                    </span>
                    {(p.status !== 'paid') && (() => {
                      const total = (Number(p.amount)||0) + (Number(p.gst)||0);
                      const outstanding = paymentEngine.calculateOutstandingAmount(total, Number(p.paid) || 0);
                      return outstanding > 0 ? (
                        <div className="text-[9px] text-amber-600 font-black mt-0.5">₹{outstanding.toLocaleString('en-IN')} due</div>
                      ) : null;
                    })()}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {/* Mark Paid */}
                      {p.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkPaid(p)}
                          disabled={markingPaid === p.id}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {markingPaid === p.id ? '...' : '✓ Paid'}
                        </button>
                      )}
                      {/* WhatsApp */}
                      <button
                        onClick={() => handleShareWhatsApp(p)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 transition-all cursor-pointer"
                        title="Send via WhatsApp"
                      >
                        <MessageSquare size={12} />
                      </button>
                      {/* View Invoice */}
                      <button
                        onClick={() => setSelectedInvoice(p)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer"
                        title="View Invoice"
                      >
                        <Receipt size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (() => {
        const memberObj = members.find(m => m.id === selectedInvoice.memberId || m.name === selectedInvoice.memberName) || {};
        const subtotal = selectedInvoice.amount - (selectedInvoice.gst || 0);
        const cgst = Math.floor((selectedInvoice.gst || 0) / 2);
        const sgst = Math.floor((selectedInvoice.gst || 0) / 2);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setSelectedInvoice(null)} />
            
            {/* Premium Stripe/Apple White A4 Card */}
            <div className="relative w-full max-w-3xl bg-white rounded-3xl z-10 shadow-[0_30px_70px_rgba(0,0,0,0.12)] overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col justify-between text-slate-800 text-left animate-scale-up">
              
              {/* Top Accent bar (Blue + Lime gradient) */}
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-[#d4ff00]" />

              {/* Close Button Top Right */}
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all border border-slate-200 cursor-pointer z-20"
              >
                <X size={14} />
              </button>

              {/* Scrollable Printable Area */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6" id="printable-invoice">
                {/* Header */}
                <div className="flex justify-between items-start pr-8">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-sm">
                        AZ
                      </div>
                      <h2 className="text-xl font-black tracking-tight text-slate-900 font-display">ALPHA ZONE GYM</h2>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                      SCO 14-15, Phase 5, Sector 59, Mohali, Punjab - 160059<br />
                      GSTIN: 27AAAAA0000A1Z5 | Phone: +91 98765 43210<br />
                      Email: info@alphazonegym.com | Web: www.alphazonegym.com
                    </p>
                  </div>
                  <div className="text-right flex items-start gap-4">
                    <div>
                      <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full font-black uppercase tracking-wider shadow-sm">
                        Paid Receipt
                      </span>
                      <div className="text-xs font-black text-slate-900 font-mono mt-3">No. {selectedInvoice.invoice || 'INV-00000'}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-1">Date: {formatDate(selectedInvoice.date)}</div>
                    </div>
                    
                    {/* QR Code Placeholder */}
                    <svg width="60" height="60" className="border border-slate-200 p-1 bg-white rounded-lg shrink-0">
                      <rect x="0" y="0" width="16" height="16" fill="#0f172a"/>
                      <rect x="2" y="2" width="12" height="12" fill="#fff"/>
                      <rect x="4" y="4" width="8" height="8" fill="#0f172a"/>
                      <rect x="44" y="0" width="16" height="16" fill="#0f172a"/>
                      <rect x="46" y="2" width="12" height="12" fill="#fff"/>
                      <rect x="48" y="4" width="8" height="8" fill="#0f172a"/>
                      <rect x="0" y="44" width="16" height="16" fill="#0f172a"/>
                      <rect x="2" y="46" width="12" height="12" fill="#fff"/>
                      <rect x="4" y="48" width="8" height="8" fill="#0f172a"/>
                      <rect x="22" y="22" width="16" height="16" fill="#0f172a"/>
                      <rect x="24" y="24" width="12" height="12" fill="#fff"/>
                      <rect x="26" y="26" width="8" height="8" fill="#0f172a"/>
                      <rect x="20" y="4" width="4" height="4" fill="#0f172a" />
                      <rect x="28" y="8" width="4" height="4" fill="#0f172a" />
                      <rect x="36" y="12" width="4" height="4" fill="#0f172a" />
                      <rect x="4" y="20" width="4" height="4" fill="#0f172a" />
                      <rect x="12" y="28" width="4" height="4" fill="#0f172a" />
                    </svg>
                  </div>
                </div>

                {/* Billed To / Billed By Details */}
                <div className="grid grid-cols-2 gap-8 border-t border-b border-slate-100 py-6">
                  <div>
                    <h4 className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider mb-2">Billed To (Member Details)</h4>
                    <div className="space-y-1 text-xs">
                      <div className="font-extrabold text-slate-900">{selectedInvoice.memberName}</div>
                      <div className="text-slate-500 font-mono">Member ID: {memberObj.memberId || selectedInvoice.memberId || 'N/A'}</div>
                      <div className="text-slate-500 font-mono">Phone: +91 {memberObj.phone || 'N/A'}</div>
                      <div className="text-slate-500">Email: {memberObj.email || 'N/A'}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider mb-2">Gym Workspace</h4>
                    <div className="space-y-1 text-xs">
                      <div><span className="text-slate-500">Branch:</span> <span className="font-extrabold text-slate-800">{memberObj.branch || 'Mohali, Punjab'}</span></div>
                      <div><span className="text-slate-500">Coach Assignment:</span> <span className="font-extrabold text-slate-800">{memberObj.trainer || 'Strength Coach'}</span></div>
                      <div><span className="text-slate-500">Status:</span> <span className="font-extrabold text-emerald-600">Active Member</span></div>
                    </div>
                  </div>
                </div>

                {/* Membership timeline */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center text-center">
                  <div className="flex-1">
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Purchased</div>
                    <div className="text-xs font-black text-slate-800 mt-1">{formatDate(selectedInvoice.date)}</div>
                  </div>
                  <div className="text-slate-350 font-bold font-mono">&rarr;</div>
                  <div className="flex-1">
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Activated</div>
                    <div className="text-xs font-black text-slate-800 mt-1">{formatDate(selectedInvoice.date)}</div>
                  </div>
                  <div className="text-slate-355 font-bold font-mono">&rarr;</div>
                  <div className="flex-1">
                    <div className="text-[8px] font-extrabold text-blue-600 uppercase tracking-widest">Expires On</div>
                    <div className="text-xs font-black text-blue-600 mt-1">
                      {memberObj.expiryDate ? new Date(memberObj.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Billing Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                        <th className="py-2.5">Description</th>
                        <th className="py-2.5">Membership Duration</th>
                        <th className="py-2.5 text-center">Qty</th>
                        <th className="py-2.5 text-right">Price</th>
                        <th className="py-2.5 text-right">Discount</th>
                        <th className="py-2.5 text-right">GST</th>
                        <th className="py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="py-4">
                          <div className="font-extrabold text-slate-900">{getMembershipName(selectedInvoice.plan)} Gym Access</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">Cardio, strength & biometric lock access sync</div>
                        </td>
                        <td className="py-4 text-slate-700 font-semibold">
                          {selectedInvoice.plan?.includes('Custom') ? 'Custom Plan' : getMembershipName(selectedInvoice.plan)}
                        </td>
                        <td className="py-4 text-center">1</td>
                        <td className="py-4 text-right">{formatCurrency(subtotal)}</td>
                        <td className="py-4 text-right text-red-500">-{formatCurrency(0)}</td>
                        <td className="py-4 text-right">{formatCurrency(selectedInvoice.gst || 0)}</td>
                        <td className="py-4 text-right font-black text-slate-900">{formatCurrency(selectedInvoice.amount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Bottom details block */}
                <div className="flex justify-between items-start pt-4 border-t border-slate-100">
                  <div className="space-y-1.5 text-[11px] text-slate-500">
                    <div><span className="font-bold text-slate-450">Payment Status:</span> <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider border border-emerald-100">Paid</span></div>
                    <div><span className="font-bold text-slate-455">Payment Method:</span> <span className="text-slate-800 font-semibold">{selectedInvoice.method}</span></div>
                    <div><span className="font-bold text-slate-460">Transaction ID:</span> <span className="text-slate-850 font-mono font-semibold">{selectedInvoice.id}</span></div>
                    <div><span className="font-bold text-slate-465">Collected By:</span> <span className="text-slate-800 font-semibold">Staff Desk</span></div>
                  </div>

                  <div className="w-64 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs shadow-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">Subtotal</span>
                      <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">CGST (9%)</span>
                      <span className="font-bold text-slate-800">{formatCurrency(cgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">SGST (9%)</span>
                      <span className="font-bold text-slate-800">{formatCurrency(sgst)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black">
                      <span className="text-slate-900">Grand Total</span>
                      <span className="text-blue-600">{formatCurrency(selectedInvoice.amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Notes */}
                <div className="text-center pt-8 border-t border-slate-100 text-[10px] text-slate-400 space-y-1 font-medium leading-relaxed">
                  <p>Thank you for choosing Alpha Zone Gym.</p>
                  <p className="font-bold text-slate-700">Stay consistent. Stay healthy.</p>
                  <p>Powered by Alpha Zone CRM.</p>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="p-6 bg-slate-50 border-t border-slate-150 flex items-center justify-between gap-3">
                <button 
                  onClick={() => {
                    toast.success('Triggering print dialog...');
                    window.print();
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} /> Print Invoice
                </button>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      toast.success('Downloading Invoice PDF...');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all border-none flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Download size={13} /> Download PDF
                  </button>
                  <button 
                    onClick={() => {
                      toast.success('Email Invoice queued!');
                    }}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail size={13} /> Send Email
                  </button>
                  <button 
                    onClick={() => {
                      toast.success('WhatsApp Receipt queued!');
                    }}
                    className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-250 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare size={13} /> Send WhatsApp
                  </button>
                  <button 
                    onClick={() => {
                      toast.success('Receipt link copied to clipboard!');
                      navigator.clipboard.writeText(window.location.origin + `/receipt/${selectedInvoice.id}`);
                    }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                  >
                    <Share2 size={13} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
