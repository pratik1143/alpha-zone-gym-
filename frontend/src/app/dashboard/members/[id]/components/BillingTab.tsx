'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt, CreditCard, AlertCircle, CheckCircle, Clock, Download, MessageSquare,
  RefreshCw, Plus, Eye, Printer, Mail, ArrowUpRight, Edit3, X, Calendar, Shield,
  FileText, Sparkles, Check, ChevronDown, FileSpreadsheet, FileCode
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, setDoc } from 'firebase/firestore';
import { paymentEngine } from '@/lib/engines/paymentEngine';
import { cleanPlanName, formatDate } from '@/lib/utils';
import { useGymStore } from '@/store';
import toast from 'react-hot-toast';
import RenewalWizardModal from '../../components/RenewalWizardModal';

export default function BillingTab({ member }: { member: any }) {
  const { fetchMembers } = useGymStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);

  // Modals state
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);
  const [editInvoice, setEditInvoice] = useState<any | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showNewBillModal, setShowNewBillModal] = useState(false);

  // Edit Bill Form State
  const [editForm, setEditForm] = useState({
    invoiceNumber: '',
    plan: '',
    amount: 0,
    paid: 0,
    method: 'UPI',
    status: 'paid',
    date: '',
    startDate: '',
    expiryDate: '',
  });

  // New Bill Form State
  const [newBillForm, setNewBillForm] = useState({
    plan: '3 Months (Quarterly)',
    amount: 6500,
    method: 'UPI',
    status: 'paid',
    date: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Real-time listener for member invoices
  useEffect(() => {
    if (!member) return;
    setLoading(true);

    const fallbackInvoices = Array.isArray(member.billingHistory) && member.billingHistory.length > 0
      ? member.billingHistory
      : (Array.isArray(member.payments) && member.payments.length > 0 ? member.payments : []);

    const docId = member.id || member.uid || member.memberId;
    const q = query(collection(db, 'payments'), where('memberId', '==', docId));

    const unsub = onSnapshot(q, (snap) => {
      const liveData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const combinedMap = new Map<string, any>();

      fallbackInvoices.forEach((inv: any, idx: number) => {
        const key = inv.invoiceNumber || inv.invoice || inv.id || `inv_${idx}`;
        combinedMap.set(key, inv);
      });

      liveData.forEach((inv: any) => {
        const key = inv.invoiceNumber || inv.invoice || inv.id;
        combinedMap.set(key, inv);
      });

      // If no invoices exist in database, auto-generate initial invoice from member package
      if (combinedMap.size === 0 && member) {
        const baseAmt = Number(member.totalBilled) || Number(member.paid) || 2500;
        const autoInv = {
          id: `inv_auto_${Date.now()}`,
          invoiceNumber: member.memberId ? member.memberId.replace('AZ-2026-', '') : '670',
          invoice: member.memberId ? member.memberId.replace('AZ-2026-', '') : '670',
          plan: member.plan || 'Gym membership : 3 months',
          amount: baseAmt,
          paid: Number(member.totalPaid) || baseAmt,
          discount: 0,
          method: member.paymentMethod || 'First payment',
          status: 'paid',
          date: member.joinDate || new Date().toISOString().split('T')[0],
          startDate: member.joinDate || new Date().toISOString().split('T')[0],
          expiryDate: member.expiryDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        };
        combinedMap.set(autoInv.id, autoInv);
      }

      const sorted = Array.from(combinedMap.values()).sort((a: any, b: any) =>
        new Date(b.date || b.createdAt || b.startDate || 0).getTime() -
        new Date(a.date || a.createdAt || a.startDate || 0).getTime()
      );

      setInvoices(sorted);
      setLoading(false);
    }, (err) => {
      console.warn("Firestore payments listener notice:", err);
      setInvoices(fallbackInvoices);
      setLoading(false);
    });

    return () => unsub();
  }, [member]);

  // Derived Totals
  const totalBilled = invoices.reduce((s, inv) => s + (Number(inv.amount) || Number(inv.total) || 0), 0) || Number(member?.totalBilled) || 0;
  const totalPaid = invoices.reduce((s, inv) => s + (Number(inv.paid) || Number(inv.amount) || 0), 0) || Number(member?.totalPaid) || totalBilled;
  const totalOutstanding = paymentEngine.calculateOutstandingAmount(totalBilled, totalPaid);

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  // Print Action
  const handlePrint = (inv: any) => {
    setViewInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // WhatsApp Bill
  const handleWhatsApp = (inv: any) => {
    const rawPhone = (member.phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const total = Number(inv.amount) || 0;
    const invNum = inv.invoiceNumber || inv.invoice || 'INV-001';
    const planTitle = cleanPlanName(inv.plan || member.plan);
    const billDate = inv.date ? formatDate(inv.date) : formatDate(new Date().toISOString());
    const startDate = inv.startDate ? formatDate(inv.startDate) : formatDate(member.joinDate);
    const expiryDate = inv.expiryDate ? formatDate(inv.expiryDate) : formatDate(member.expiryDate);

    const msg = encodeURIComponent(
      `🏋️ *ALPHA ZONE GYM — OFFICIAL INVOICE RECEIPT*\n\n` +
      `👤 *Member Name*: ${member.name}\n` +
      `📄 *Invoice No*: ${invNum}\n` +
      `📦 *Package*: ${planTitle}\n` +
      `📅 *Billing Date*: ${billDate}\n` +
      `🚀 *Start Date*: ${startDate}\n` +
      `🏁 *Expiry Date*: ${expiryDate}\n` +
      `💰 *Total Amount*: ₹${total.toLocaleString('en-IN')}\n` +
      `✅ *Payment Status*: ${(inv.status || 'paid').toUpperCase()}\n` +
      `💳 *Payment Mode*: ${inv.method || 'UPI'}\n\n` +
      `Thank you for training with Alpha Zone Gym! 💪`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  // Export Excel CSV
  const handleExportCSV = () => {
    if (invoices.length === 0) {
      toast.error('No invoice records to export!');
      return;
    }
    const headers = ['Date', 'Invoice No', 'Item Description', 'Item Amount', 'Discount', 'Net Payable', 'Amount Paid', 'Pending', 'Payment Method', 'Status'];
    const rows = invoices.map(inv => [
      inv.date || member.joinDate,
      inv.invoiceNumber || inv.invoice || '670',
      `Gym membership : ${inv.plan || member.plan}`,
      inv.amount || 0,
      inv.discount || 0,
      inv.amount || 0,
      inv.paid || inv.amount || 0,
      (Number(inv.amount) || 0) - (Number(inv.paid) || Number(inv.amount) || 0),
      inv.method || 'First payment',
      inv.status || 'paid'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Billing_Statement_${member.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Excel CSV Statement exported!');
  };

  // Export PDF Statement
  const handleExportPDF = () => {
    window.print();
  };

  // Save Edit Bill
  const handleSaveEdit = async () => {
    if (!editInvoice) return;
    try {
      const docId = editInvoice.id || `inv_${Date.now()}`;
      const updatedData = {
        ...editInvoice,
        invoiceNumber: editForm.invoiceNumber,
        invoice: editForm.invoiceNumber,
        plan: editForm.plan,
        amount: Number(editForm.amount),
        paid: Number(editForm.paid),
        method: editForm.method,
        status: editForm.status,
        date: editForm.date,
        startDate: editForm.startDate,
        expiryDate: editForm.expiryDate,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'payments', docId), updatedData, { merge: true });

      await updateDoc(doc(db, 'members', member.id), {
        plan: editForm.plan,
        expiryDate: editForm.expiryDate,
        updatedAt: new Date().toISOString(),
      });

      toast.success('Invoice updated successfully!');
      setEditInvoice(null);
      fetchMembers();
    } catch (err: any) {
      toast.error('Failed to update invoice: ' + err.message);
    }
  };

  // Handle Save New Bill
  const handleSaveNewBill = async () => {
    try {
      const invNum = `INV-${Math.floor(10000 + Math.random() * 90000)}`;
      const newBill = {
        memberId: member.id,
        memberName: member.name,
        memberPhone: member.phone,
        invoiceNumber: invNum,
        invoice: invNum,
        plan: newBillForm.plan,
        amount: Number(newBillForm.amount),
        paid: newBillForm.status === 'paid' ? Number(newBillForm.amount) : 0,
        method: newBillForm.method,
        status: newBillForm.status,
        date: newBillForm.date,
        startDate: newBillForm.startDate,
        expiryDate: newBillForm.expiryDate,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'payments', `inv_${Date.now()}`), newBill);

      await updateDoc(doc(db, 'members', member.id), {
        plan: newBillForm.plan,
        expiryDate: newBillForm.expiryDate,
        status: 'active',
        paymentStatus: newBillForm.status,
      });

      toast.success(`Bill ${invNum} generated successfully!`);
      setShowNewBillModal(false);
      fetchMembers();
    } catch (err: any) {
      toast.error('Failed to generate bill: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── KPI Cards Header ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Billed</p>
          <p className="text-2xl font-black text-slate-900">{fmt(totalBilled)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{invoices.length} billing entry</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Collected</p>
          <p className="text-2xl font-black text-emerald-600">{fmt(totalPaid)}</p>
          <p className="text-[10px] text-emerald-500 mt-0.5">Amount Paid</p>
        </div>
        <div className={`rounded-2xl p-4 border shadow-sm ${totalOutstanding > 0 ? 'border-red-100 bg-red-50/50' : 'border-slate-100 bg-white'}`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Outstanding</p>
          <p className={`text-2xl font-black ${totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {fmt(totalOutstanding)}
          </p>
          <p className={`text-[10px] mt-0.5 font-bold ${totalOutstanding > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {totalOutstanding > 0 ? 'Pending Balance' : 'Fully Paid ✅'}
          </p>
        </div>

        {/* Create New Bill Button */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 block">Billing Actions</span>
            <p className="text-sm font-black mt-1">Generate / Renew Bill</p>
          </div>
          <button
            onClick={() => setShowNewBillModal(true)}
            className="mt-3 py-2 px-3 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm border-none cursor-pointer"
          >
            <Plus size={14} /> Create New Bill
          </button>
        </div>
      </div>

      {/* ── Official Billing History Table Module ────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Title Bar */}
        <div className="bg-[#0b5cbe] text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={18} />
            <h3 className="font-bold text-sm tracking-wide">Billing history</h3>
          </div>
          <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
            {member.name}
          </span>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0e68d6] text-white font-bold text-[11px] uppercase border-b border-blue-700">
                <th className="p-3 whitespace-nowrap">Date</th>
                <th className="p-3 whitespace-nowrap">Invoice No</th>
                <th className="p-3 whitespace-nowrap min-w-[200px]">Item</th>
                <th className="p-3 text-right whitespace-nowrap">Item amount</th>
                <th className="p-3 text-right whitespace-nowrap">Other Charges</th>
                <th className="p-3 text-right whitespace-nowrap">Discount</th>
                <th className="p-3 text-right whitespace-nowrap">Tax</th>
                <th className="p-3 text-right whitespace-nowrap">Reward Points</th>
                <th className="p-3 text-right whitespace-nowrap">Net payable</th>
                <th className="p-3 text-right whitespace-nowrap">Amount paid</th>
                <th className="p-3 text-right whitespace-nowrap">Pending</th>
                <th className="p-3 whitespace-nowrap">Payment type</th>
                <th className="p-3 whitespace-nowrap">Status</th>
                <th className="p-3 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-10 text-center text-slate-400 font-bold">
                    No billing history recorded yet. Click "Create New Bill" to add an entry.
                  </td>
                </tr>
              ) : (
                invoices.map((inv, idx) => {
                  const invNum = inv.invoiceNumber || inv.invoice || '670';
                  const itemAmt = Number(inv.amount) || Number(inv.total) || 4500;
                  const discountAmt = Number(inv.discount) || 0;
                  const netPayable = itemAmt - discountAmt;
                  const paidAmt = Number(inv.paid) || (inv.status === 'paid' ? netPayable : 0);
                  const pendingAmt = Math.max(0, netPayable - paidAmt);
                  const startDate = inv.startDate || member.joinDate || '20-08-2026';
                  const expiryDate = inv.expiryDate || member.expiryDate || '19-10-2026';
                  const planTitle = inv.plan || member.plan || 'Gym membership : 2 months';

                  return (
                    <tr key={inv.id || idx} className="hover:bg-blue-50/40 transition-colors">
                      {/* Date */}
                      <td className="p-3 whitespace-nowrap font-mono text-slate-700">
                        {inv.date || formatDate(member.joinDate)}
                      </td>

                      {/* Invoice No */}
                      <td className="p-3 whitespace-nowrap font-mono font-bold text-blue-700">
                        {invNum}
                      </td>

                      {/* Item */}
                      <td className="p-3 min-w-[200px]">
                        <div className="font-semibold text-slate-900">{planTitle}</div>
                        <div className="text-[10px] text-slate-500 font-mono">({startDate} to {expiryDate})</div>
                      </td>

                      {/* Item amount */}
                      <td className="p-3 text-right font-mono font-bold">{itemAmt.toFixed(2)}</td>

                      {/* Other Charges */}
                      <td className="p-3 text-right font-mono text-slate-500">0.00</td>

                      {/* Discount */}
                      <td className="p-3 text-right font-mono text-slate-500">{discountAmt.toFixed(2)}</td>

                      {/* Tax */}
                      <td className="p-3 text-right font-mono text-slate-500">0.00</td>

                      {/* Reward Points */}
                      <td className="p-3 text-right font-mono text-slate-500">0.00</td>

                      {/* Net payable */}
                      <td className="p-3 text-right font-mono font-black text-slate-900">{netPayable.toFixed(2)}</td>

                      {/* Amount paid */}
                      <td className="p-3 text-right font-mono font-black text-emerald-600">{paidAmt.toFixed(2)}</td>

                      {/* Pending */}
                      <td className="p-3 text-right font-mono font-bold text-red-500">{pendingAmt.toFixed(2)}</td>

                      {/* Payment type */}
                      <td className="p-3 whitespace-nowrap font-semibold text-slate-700">
                        {inv.method || 'First payment'}
                      </td>

                      {/* Status */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          pendingAmt <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {pendingAmt <= 0 ? 'New' : 'Pending'}
                        </span>
                      </td>

                      {/* Action Dropdown Menu */}
                      <td className="p-3 text-center whitespace-nowrap relative">
                        <button
                          type="button"
                          onClick={() => setActiveDropdownIndex(activeDropdownIndex === idx ? null : idx)}
                          className="px-3 py-1.5 bg-[#e53935] hover:bg-[#d32f2f] text-white font-bold rounded text-xs uppercase tracking-wider transition-all flex items-center gap-1 mx-auto cursor-pointer border-none shadow-sm"
                        >
                          <span>ACTION</span>
                          <ChevronDown size={12} />
                        </button>

                        {/* Action Dropdown Options */}
                        {activeDropdownIndex === idx && (
                          <div className="absolute right-2 top-11 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-44 py-1 text-left text-xs font-semibold text-slate-800 animate-in fade-in">
                            <button
                              onClick={() => {
                                setShowUpgradeModal(true);
                                setActiveDropdownIndex(null);
                              }}
                              className="w-full px-4 py-2 hover:bg-slate-100 flex items-center gap-2 text-left border-none bg-transparent cursor-pointer"
                            >
                              <RefreshCw size={13} className="text-blue-600" />
                              <span>Renew</span>
                            </button>

                            <button
                              onClick={() => {
                                setShowUpgradeModal(true);
                                setActiveDropdownIndex(null);
                              }}
                              className="w-full px-4 py-2 hover:bg-slate-100 flex items-center gap-2 text-left border-none bg-transparent cursor-pointer"
                            >
                              <ArrowUpRight size={13} className="text-indigo-600" />
                              <span>Upgrade</span>
                            </button>

                            <button
                              onClick={() => {
                                setViewInvoice(inv);
                                setActiveDropdownIndex(null);
                              }}
                              className="w-full px-4 py-2 hover:bg-slate-100 flex items-center gap-2 text-left border-none bg-transparent cursor-pointer"
                            >
                              <Eye size={13} className="text-slate-600" />
                              <span>View</span>
                            </button>

                            <button
                              onClick={() => {
                                handlePrint(inv);
                                setActiveDropdownIndex(null);
                              }}
                              className="w-full px-4 py-2 hover:bg-slate-100 flex items-center gap-2 text-left border-none bg-transparent cursor-pointer"
                            >
                              <Printer size={13} className="text-slate-600" />
                              <span>Print bill</span>
                            </button>

                            <button
                              onClick={() => {
                                handleWhatsApp(inv);
                                setActiveDropdownIndex(null);
                              }}
                              className="w-full px-4 py-2 hover:bg-slate-100 flex items-center gap-2 text-left border-none bg-transparent cursor-pointer text-emerald-700 font-bold"
                            >
                              <MessageSquare size={13} className="text-emerald-600" />
                              <span>Whatsapp Bill</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Export Bar (EXCEL & PDF) */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-start gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-[#d32f2f] hover:bg-[#c62828] text-white font-bold rounded-lg text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border-none shadow-sm"
          >
            <FileSpreadsheet size={14} />
            <span>EXCEL</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="px-4 py-2 bg-[#d32f2f] hover:bg-[#c62828] text-white font-bold rounded-lg text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border-none shadow-sm"
          >
            <FileCode size={14} />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* ── 1. VIEW INVOICE MODAL (Printable Document View) ───────────────────── */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                <h3 className="text-lg font-black text-slate-900">Official Invoice Receipt</h3>
              </div>
              <button onClick={() => setViewInvoice(null)} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 border-none bg-transparent cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-6 text-slate-800">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">ALPHA ZONE GYM</h2>
                  <p className="text-xs text-slate-500">Sohana, Landran Road, Mohali, Punjab</p>
                  <p className="text-xs text-slate-500">Phone: +91 99362 86837</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-black text-blue-600 block">{viewInvoice.invoiceNumber || viewInvoice.invoice || 'INV-001'}</span>
                  <span className="text-xs font-bold text-slate-500">Date: {viewInvoice.date ? formatDate(viewInvoice.date) : formatDate(new Date().toISOString())}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase block text-[10px]">Billed To:</span>
                  <p className="font-black text-slate-900 text-sm mt-0.5">{member.name}</p>
                  <p className="text-slate-600">{member.phone}</p>
                  <p className="text-slate-600">{member.email || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase block text-[10px]">Membership Period:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">Start: {formatDate(viewInvoice.startDate || member.joinDate)}</p>
                  <p className="font-semibold text-indigo-600">Expiry: {formatDate(viewInvoice.expiryDate || member.expiryDate)}</p>
                </div>
              </div>

              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  <tr>
                    <td className="py-3">
                      <div>{cleanPlanName(viewInvoice.plan || member.plan)}</div>
                      <div className="text-[10px] text-slate-400">Payment Mode: {viewInvoice.method || 'UPI'}</div>
                    </td>
                    <td className="py-3 text-right font-black">₹{Number(viewInvoice.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>

              <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-sm font-black">
                <span>Total Amount Paid</span>
                <span className="text-emerald-600 text-lg">₹{Number(viewInvoice.amount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
              >
                <Printer size={15} /> Print Invoice
              </button>
              <button
                onClick={() => setViewInvoice(null)}
                className="py-3 px-5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all border-none cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. CREATE NEW BILL MODAL ─────────────────────────────────────────── */}
      {showNewBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-blue-600" /> Create New Bill for {member.name}
              </h3>
              <button onClick={() => setShowNewBillModal(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full border-none bg-transparent cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Select Package</label>
                <select
                  value={newBillForm.plan}
                  onChange={(e) => {
                    const selected = e.target.value;
                    let amt = 2500;
                    if (selected.includes('3 Month')) amt = 6500;
                    if (selected.includes('6 Month')) amt = 11500;
                    if (selected.includes('12 Month')) amt = 18000;
                    setNewBillForm({ ...newBillForm, plan: selected, amount: amt });
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="1 Month Standard">1 Month Standard (₹2,500)</option>
                  <option value="3 Months (Quarterly)">3 Months (Quarterly) (₹6,500)</option>
                  <option value="6 Months (Semi-Annual)">6 Months (Semi-Annual) (₹11,500)</option>
                  <option value="12 Months (Annual)">12 Months (Annual) (₹18,000)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={newBillForm.amount}
                    onChange={(e) => setNewBillForm({ ...newBillForm, amount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Payment Mode</label>
                  <select
                    value={newBillForm.method}
                    onChange={(e) => setNewBillForm({ ...newBillForm, method: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newBillForm.startDate}
                    onChange={(e) => setNewBillForm({ ...newBillForm, startDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={newBillForm.expiryDate}
                    onChange={(e) => setNewBillForm({ ...newBillForm, expiryDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveNewBill}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all border-none cursor-pointer"
              >
                Generate Bill & Activate
              </button>
              <button
                onClick={() => setShowNewBillModal(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. RENEWAL / UPGRADE WIZARD MODAL ─────────────────────────────────── */}
      {showUpgradeModal && (
        <RenewalWizardModal
          isOpen={showUpgradeModal}
          member={member}
          onClose={() => {
            setShowUpgradeModal(false);
            fetchMembers();
          }}
        />
      )}
    </div>
  );
}
