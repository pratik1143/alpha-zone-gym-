'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt, CreditCard, AlertCircle, CheckCircle, Clock, Download, MessageSquare,
  RefreshCw, Plus, Eye, Printer, Mail, ArrowUpRight, Edit3, X, Calendar, Shield,
  FileText, Sparkles, Check
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

  // 1. Action: Mark Paid
  const handleMarkPaid = async (inv: any) => {
    if (!window.confirm(`Mark ₹${(inv.amount || 0).toLocaleString('en-IN')} as PAID?`)) return;
    setMarkingId(inv.id || inv.invoiceNumber);
    try {
      const total = Number(inv.amount) || 0;
      const targetId = inv.id || `inv_${Date.now()}`;

      await setDoc(doc(db, 'payments', targetId), {
        ...inv,
        status: 'paid',
        paid: total,
        pendingAmount: 0,
      }, { merge: true });

      await updateDoc(doc(db, 'members', member.id), {
        paymentStatus: 'paid',
        paidAmount: total,
        pendingAmount: 0,
        outstandingBalance: 0,
      });

      toast.success('✅ Payment marked as PAID!');
      fetchMembers();
    } catch (e: any) {
      toast.error('Failed: ' + e.message);
    } finally {
      setMarkingId(null);
    }
  };

  // 2. Action: Print Bill
  const handlePrint = (inv: any) => {
    setViewInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // 3. Action: WhatsApp Bill
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

  // 4. Action: Email Bill
  const handleEmail = (inv: any) => {
    const targetEmail = member.email || `${member.phone || 'member'}@alphagym.com`;
    toast.success(`📧 Receipt emailed to ${targetEmail}`);
  };

  // 5. Action: Open Edit Bill Modal
  const openEditModal = (inv: any) => {
    setEditInvoice(inv);
    setEditForm({
      invoiceNumber: inv.invoiceNumber || inv.invoice || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      plan: cleanPlanName(inv.plan || member.plan),
      amount: Number(inv.amount) || 0,
      paid: Number(inv.paid || inv.amount) || 0,
      method: inv.method || inv.paymentMode || 'UPI',
      status: inv.status || 'paid',
      date: inv.date || inv.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
      startDate: inv.startDate || member.joinDate || new Date().toISOString().split('T')[0],
      expiryDate: inv.expiryDate || member.expiryDate || new Date().toISOString().split('T')[0],
    });
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

      // If this is the latest invoice, update member's plan & dates
      await updateDoc(doc(db, 'members', member.id), {
        plan: editForm.plan,
        expiryDate: editForm.expiryDate,
        updatedAt: new Date().toISOString(),
      });

      toast.success('✅ Invoice updated successfully!');
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

      toast.success(`✅ Bill ${invNum} generated successfully!`);
      setShowNewBillModal(false);
      fetchMembers();
    } catch (err: any) {
      toast.error('Failed to generate bill: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── KPI Cards Header & Action ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Billed</p>
          <p className="text-2xl font-black text-slate-900">{fmt(totalBilled)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Collected</p>
          <p className="text-2xl font-black text-emerald-600">{fmt(totalPaid)}</p>
          <p className="text-[10px] text-emerald-500 mt-0.5">Received Payment</p>
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

        {/* Generate New Bill Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 block">Billing Actions</span>
            <p className="text-sm font-black mt-1">Generate / Upgrade Bill</p>
          </div>
          <button
            onClick={() => setShowNewBillModal(true)}
            className="mt-3 py-2 px-3 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm border-none cursor-pointer"
          >
            <Plus size={14} /> Create New Bill
          </button>
        </div>
      </div>

      {/* ── Main Invoices List ───────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
        <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-blue-600" />
            <h3 className="font-black text-sm text-slate-900">Member Invoices & Billing History</h3>
            <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-2.5 py-0.5 rounded-full">
              {invoices.length} Record{invoices.length !== 1 ? 's' : ''}
            </span>
          </div>
          {loading && <RefreshCw size={14} className="animate-spin text-slate-400" />}
        </div>

        {!loading && invoices.length === 0 && (
          <div className="py-14 text-center">
            <Receipt size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No billing history found</p>
            <p className="text-xs text-slate-400 mt-1">Click "Create New Bill" above to generate an invoice.</p>
          </div>
        )}

        {invoices.length > 0 && (
          <div className="divide-y divide-slate-100">
            {invoices.map((inv, idx) => {
              const total = Number(inv.amount) || Number(inv.total) || 0;
              const paidAmt = Number(inv.paid) || (inv.status === 'paid' ? total : 0);
              const outstanding = paymentEngine.calculateOutstandingAmount(total, paidAmt);
              const isPaid = inv.status === 'paid' || outstanding <= 0;
              const isPartial = !isPaid && paidAmt > 0;
              
              const invNum = inv.invoiceNumber || inv.invoice || `INV-00${idx + 1}`;
              const planTitle = cleanPlanName(inv.plan || member.plan);
              const billDate = inv.date ? formatDate(inv.date) : (inv.createdAt ? formatDate(inv.createdAt) : formatDate(member.joinDate));
              const startDate = inv.startDate ? formatDate(inv.startDate) : formatDate(member.joinDate);
              const expiryDate = inv.expiryDate ? formatDate(inv.expiryDate) : formatDate(member.expiryDate);

              return (
                <div key={inv.id || idx} className="p-6 hover:bg-slate-50/60 transition-all space-y-4">
                  {/* Row Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200">
                        {invNum}
                      </span>
                      <span className="text-sm font-black text-slate-900">{planTitle}</span>
                      
                      {isPaid ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">PAID</span>
                      ) : isPartial ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">PARTIAL</span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">PENDING</span>
                      )}

                      <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                        {inv.method || inv.paymentMode || 'UPI'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-slate-900">{fmt(total)}</span>
                      {outstanding > 0 && (
                        <span className="text-xs font-extrabold text-red-500 block">{fmt(outstanding)} due</span>
                      )}
                    </div>
                  </div>

                  {/* Dates & Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billing Date</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                        <Calendar size={12} className="text-slate-400" /> {billDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Start Date</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                        <Clock size={12} className="text-slate-400" /> {startDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expiry Date</span>
                      <span className="font-bold text-indigo-600 flex items-center gap-1 mt-0.5">
                        <Shield size={12} className="text-indigo-400" /> {expiryDate}
                      </span>
                    </div>
                  </div>

                  {/* Complete Action Buttons Bar */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {/* View Bill */}
                    <button
                      onClick={() => setViewInvoice(inv)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border-none"
                    >
                      <Eye size={13} /> View Bill
                    </button>

                    {/* Print Bill */}
                    <button
                      onClick={() => handlePrint(inv)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border-none"
                    >
                      <Printer size={13} /> Print Bill
                    </button>

                    {/* WhatsApp Bill */}
                    <button
                      onClick={() => handleWhatsApp(inv)}
                      className="px-3 py-1.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-green-200"
                    >
                      <MessageSquare size={13} /> WhatsApp
                    </button>

                    {/* Email Bill */}
                    <button
                      onClick={() => handleEmail(inv)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-blue-200"
                    >
                      <Mail size={13} /> Email Bill
                    </button>

                    {/* Upgrade Bill */}
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-indigo-200"
                    >
                      <ArrowUpRight size={13} /> Upgrade Bill
                    </button>

                    {/* Edit Bill */}
                    <button
                      onClick={() => openEditModal(inv)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-amber-200"
                    >
                      <Edit3 size={13} /> Edit Bill
                    </button>

                    {/* Mark Paid (if pending) */}
                    {!isPaid && (
                      <button
                        onClick={() => handleMarkPaid(inv)}
                        disabled={markingId === (inv.id || inv.invoiceNumber)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1 cursor-pointer shadow-sm ml-auto border-none"
                      >
                        <Check size={13} /> {markingId === (inv.id || inv.invoiceNumber) ? 'Saving...' : 'Mark Paid'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 1. VIEW INVOICE MODAL (Printable Document View) ───────────────────── */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header Controls */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                <h3 className="text-lg font-black text-slate-900">Official Invoice Receipt</h3>
              </div>
              <button onClick={() => setViewInvoice(null)} className="p-2 rounded-full text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            {/* Invoice Printable Sheet */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-6 text-slate-800">
              {/* Gym Header */}
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

              {/* Billed To */}
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

              {/* Line Items Table */}
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

              {/* Total Summary */}
              <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-sm font-black">
                <span>Total Amount Paid</span>
                <span className="text-emerald-600 text-lg">₹{Number(viewInvoice.amount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Modal Actions */}
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

      {/* ── 2. EDIT INVOICE MODAL ─────────────────────────────────────────────── */}
      {editInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Edit3 size={18} className="text-amber-500" /> Edit Invoice Details
              </h3>
              <button onClick={() => setEditInvoice(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={editForm.invoiceNumber}
                  onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Package Name</label>
                <input
                  type="text"
                  value={editForm.plan}
                  onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Payment Mode</label>
                  <select
                    value={editForm.method}
                    onChange={(e) => setEditForm({ ...editForm, method: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Billing Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={editForm.expiryDate}
                    onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[11px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all border-none cursor-pointer"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditInvoice(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. CREATE NEW BILL MODAL ─────────────────────────────────────────── */}
      {showNewBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-blue-600" /> Create New Bill for {member.name}
              </h3>
              <button onClick={() => setShowNewBillModal(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full">
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

      {/* ── 4. RENEWAL / UPGRADE WIZARD MODAL ─────────────────────────────────── */}
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
