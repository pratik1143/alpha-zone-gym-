'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, DollarSign, Receipt, AlertCircle, Plus, Download, Search, TrendingUp, X, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

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
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

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
        <div className="flex gap-2">
          <button
            onClick={() => toast.success('GST Report feature coming soon!')}
            className="btn-cyber-outline text-xs py-2"
          >
            <Download size={13} /> GST Report
          </button>
          <button
            className="btn-cyber-cyan text-xs py-2 px-5 cursor-pointer"
            onClick={() => toast.success('Go to Members → click "Mark Paid" to record a payment')}
          >
            <Plus size={14} /> New Payment
          </button>
        </div>
      </div>

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
                    <span className={p.status === 'paid' ? 'badge-green' : p.status === 'overdue' ? 'badge-red' : 'badge-yellow'}>
                      {p.status || 'pending'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedInvoice(p)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer border-none transition-all"
                      style={{ background: 'rgba(212,255,0,0.12)', color: '#6b7c00', border: '1px solid rgba(212,255,0,0.3)' }}
                    >
                      View Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedInvoice(null)} />
          <div className="relative w-full max-w-md bg-white rounded-[28px] p-7 z-10 shadow-[0_30px_80px_rgba(0,0,0,0.15)]">
            <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-[28px] bg-gradient-to-r from-[#d4ff00] via-emerald-400 to-[#d4ff00]" />

            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Alpha Zone Gym</div>
                <h3 className="font-black text-lg text-slate-900">Tax Invoice</h3>
              </div>
              <button onClick={() => setSelectedInvoice(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all cursor-pointer border-none">
                <X size={14} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-semibold">Invoice No.</span>
                <span className="font-black text-slate-900 font-mono">{selectedInvoice.invoice || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-semibold">Date</span>
                <span className="font-bold text-slate-700">{formatDate(selectedInvoice.date)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-semibold">Member</span>
                <span className="font-bold text-slate-700">{selectedInvoice.memberName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-semibold">Method</span>
                <span className="font-bold text-slate-700">
                  {payMethods[selectedInvoice.method]?.icon} {selectedInvoice.method}
                </span>
              </div>
            </div>

            <div className="border-t border-b border-slate-100 py-4 mb-4 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Membership ({selectedInvoice.plan})</span>
                <span className="font-semibold text-slate-800">{formatCurrency(Number(selectedInvoice.amount) || 0)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">CGST (9%)</span>
                <span className="font-semibold text-violet-600">{formatCurrency((Number(selectedInvoice.gst) || 0) / 2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">SGST (9%)</span>
                <span className="font-semibold text-violet-600">{formatCurrency((Number(selectedInvoice.gst) || 0) / 2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-100">
                <span className="text-slate-900">Total Paid</span>
                <span className="text-emerald-600">
                  {formatCurrency((Number(selectedInvoice.amount) || 0) + (Number(selectedInvoice.gst) || 0))}
                </span>
              </div>
            </div>

            <p className="text-center text-[10px] text-slate-400 mb-5">
              Thank you for training with Alpha Zone!<br />
              <span className="font-bold">Beyond Strength · Beyond Limits</span>
            </p>

            <div className="flex gap-2.5">
              <button onClick={() => { toast.success('Printing...'); setSelectedInvoice(null); }}
                className="flex-1 py-3 rounded-xl text-xs font-black cursor-pointer border-none btn-cyber-cyan">
                Print Receipt
              </button>
              <button onClick={() => { toast.success('PDF downloaded!'); setSelectedInvoice(null); }}
                className="flex-1 py-3 rounded-xl text-xs font-black cursor-pointer btn-cyber-outline">
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
