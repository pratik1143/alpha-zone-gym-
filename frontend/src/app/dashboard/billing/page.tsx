'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Receipt, AlertCircle, Plus, Download, Search, TrendingUp, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useGymStore } from '@/store';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

const payMethods: Record<string, { icon: string; color: string; bg: string }> = {
  UPI:          { icon: '📱', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
  Cash:         { icon: '💵', color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
  Razorpay:     { icon: '💳', color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
  'Credit Card':{ icon: '💳', color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  PhonePe:      { icon: '📲', color: '#5b21b6', bg: 'rgba(91,33,182,0.08)' },
};

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="bg-white rounded-[20px] p-5 border border-slate-100"
      style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${color}14` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{sub || 'This Year'}</span>
      </div>
      <div className="text-[26px] font-black text-slate-900 leading-none mb-1">{value}</div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default function BillingPage() {
  const { payments, fetchPayments } = useGymStore();
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filtered = payments.filter(p =>
    p.memberName.toLowerCase().includes(search.toLowerCase()) || p.invoice.includes(search.toUpperCase())
  );

  const totalCollected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalGST       = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.gst, 0);
  const overdue        = payments.filter(p => p.status === 'overdue');

  const revenueTrendData = [
    { month: 'Jan', revenue: 845000 },
    { month: 'Feb', revenue: 912000 },
    { month: 'Mar', revenue: 1034000 },
    { month: 'Apr', revenue: 978000 },
    { month: 'May', revenue: 1125000 },
    { month: 'Jun', revenue: 1245000 },
  ];

  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-display">Payments & Billing</h1>
          <p className="text-xs text-slate-400 mt-0.5">GST Invoices · UPI · Cards · Cash ledger reports.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('GST Report generated!')} className="btn-cyber-outline text-xs py-2">
            <Download size={13} /> GST Report
          </button>
          <button className="btn-cyber-cyan text-xs py-2 px-5 cursor-pointer"
            onClick={() => toast.success('Open Member list to log payment')}>
            <Plus size={14} /> New Payment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Collections"   value={formatCurrency(totalCollected)} icon={DollarSign} color="#16a34a" />
        <StatCard label="GST Collected"       value={formatCurrency(totalGST)}       icon={Receipt}    color="#7c3aed" />
        <StatCard label="Overdue Pending"     value={`${overdue.length} payments`}    icon={AlertCircle}color="#dc2626" />
        <StatCard label="Average Ticket"      value={formatCurrency(totalCollected / (payments.length || 1))} icon={TrendingUp} color="#2563eb" />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-[20px] p-6 border border-slate-100"
        style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-black text-base text-slate-900">Revenue Trend</h3>
            <p className="text-[10px] text-slate-400 font-medium">Monthly collections — 2026</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
            <TrendingUp size={11} /> +14.2% vs last month
          </div>
        </div>
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
                formatter={(v: any) => [`₹${(v / 1000).toFixed(1)}K`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#d4ff00" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Method Splits */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(payMethods).map(([method, cfg], i) => {
          const cnt   = payments.filter(p => p.method === method && p.status === 'paid').length;
          const total = payments.filter(p => p.method === method && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
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
          <h3 className="font-black text-sm text-slate-900">Payment History Log</h3>
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400 text-xs">
                    No payment records found.
                  </td>
                </tr>
              )}
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className="font-mono text-[11px] font-bold text-blue-600">{p.invoice}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600">
                        {getInitials(p.memberName)}
                      </div>
                      <span className="font-bold text-xs text-slate-800">{p.memberName}</span>
                    </div>
                  </td>
                  <td className="text-xs text-slate-500">{p.plan?.split(' ')[0]}</td>
                  <td className="text-xs font-semibold text-slate-800">{formatCurrency(p.amount)}</td>
                  <td className="text-xs font-semibold text-violet-600">{formatCurrency(p.gst)}</td>
                  <td className="text-sm font-black text-emerald-700">{formatCurrency(p.amount + p.gst)}</td>
                  <td>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: payMethods[p.method]?.bg || '#f1f5f9', color: payMethods[p.method]?.color || '#64748b' }}>
                      {payMethods[p.method]?.icon} {p.method}
                    </span>
                  </td>
                  <td className="text-[11px] text-slate-400">{formatDate(p.date)}</td>
                  <td>
                    <span className={p.status === 'paid' ? 'badge-green' : p.status === 'overdue' ? 'badge-red' : 'badge-yellow'}>
                      {p.status}
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
            {/* Invoice accent bar */}
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
                <span className="font-black text-slate-900 font-mono">{selectedInvoice.invoice}</span>
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
                <span className="font-bold text-slate-700">{payMethods[selectedInvoice.method]?.icon} {selectedInvoice.method}</span>
              </div>
            </div>

            <div className="border-t border-b border-slate-100 py-4 mb-4 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Membership ({selectedInvoice.plan})</span>
                <span className="font-semibold text-slate-800">{formatCurrency(selectedInvoice.amount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">CGST (9%)</span>
                <span className="font-semibold text-violet-600">{formatCurrency(selectedInvoice.gst / 2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">SGST (9%)</span>
                <span className="font-semibold text-violet-600">{formatCurrency(selectedInvoice.gst / 2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-100">
                <span className="text-slate-900">Total Paid</span>
                <span className="text-emerald-600">
                  {formatCurrency(selectedInvoice.amount + selectedInvoice.gst)}
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
