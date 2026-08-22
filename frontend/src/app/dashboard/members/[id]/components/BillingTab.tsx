'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import OfficialInvoiceReceipt from '@/app/dashboard/components/OfficialInvoiceReceipt';
import EditBillingModal from './EditBillingModal';
import CreateNewBillModal from '../../components/CreateNewBillModal';

export default function BillingTab({ member: initialMember }: { member: any }) {
  const { fetchMembers } = useGymStore();
  const [member, setMember] = useState(initialMember);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Floating portal dropdown state
  const [openDropdown, setOpenDropdown] = useState<{ invoice: any; anchorRect: DOMRect } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);
  const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState<any | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showNewBillModal, setShowNewBillModal] = useState(false);

  useEffect(() => {
    setMember(initialMember);
  }, [initialMember]);

  // Click outside and Escape key handler for portal dropdown
  useEffect(() => {
    if (!openDropdown) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
      }
    };

    const handleScrollOrResize = () => {
      setOpenDropdown(null);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [openDropdown]);

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
        const baseAmt = Number(member.totalBilled) || Number(member.paid) || Number(member.amount) || 2500;
        const autoInv = {
          id: `inv_auto_${Date.now()}`,
          invoiceNumber: member.memberId ? member.memberId.replace('AZ-2026-', '') : '670',
          invoice: member.memberId ? member.memberId.replace('AZ-2026-', '') : '670',
          plan: member.plan || 'Gym membership : 3 months',
          amount: baseAmt,
          paid: Number(member.totalPaid) || baseAmt,
          discount: 0,
          method: member.paymentMethod || member.method || 'Cash',
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
  const totalBilled = invoices.reduce((s, inv) => {
    const origAmt = Number(inv.originalAmount !== undefined ? inv.originalAmount : (inv.price || inv.amount || 0));
    const discAmt = Number(inv.discountAmount !== undefined ? inv.discountAmount : (inv.discount || 0));
    const taxAmt = Number(inv.taxAmount !== undefined ? inv.taxAmount : (inv.tax || inv.gst || 0));
    const othAmt = Number(inv.otherCharges || 0);

    const calculatedNet = Math.max(0, origAmt - discAmt + taxAmt + othAmt);
    const net = Number(inv.netPayable !== undefined ? inv.netPayable : (calculatedNet > 0 ? calculatedNet : Number(inv.amount || 0)));
    return s + (isNaN(net) ? 0 : net);
  }, 0) || Number(member?.totalBilled) || 0;

  const totalPaid = invoices.reduce((s, inv) => {
    const paid = Number(inv.amountPaid !== undefined ? inv.amountPaid : (inv.paid !== undefined ? inv.paid : Number(inv.amount || 0)));
    return s + (isNaN(paid) ? 0 : paid);
  }, 0) || Number(member?.totalPaid) || totalBilled;

  const totalOutstanding = Math.max(0, totalBilled - totalPaid);

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
    const total = Number(inv.netPayable || inv.amount || 0);
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
      inv.originalAmount || inv.amount || 0,
      inv.discountAmount || inv.discount || 0,
      inv.netPayable || inv.amount || 0,
      inv.amountPaid || inv.paid || inv.amount || 0,
      Math.max(0, (Number(inv.netPayable || inv.amount) || 0) - (Number(inv.amountPaid || inv.paid) || 0)),
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



  return (
    <div className="space-y-6">
      {/* ── KPI Cards Header ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">TOTAL BILLED</p>
          <p className="text-2xl font-black text-slate-900">{fmt(totalBilled)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{invoices.length} billing entry</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">TOTAL COLLECTED</p>
          <p className="text-2xl font-black text-emerald-600">{fmt(totalPaid)}</p>
          <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Amount Paid</p>
        </div>
        <div className={`rounded-2xl p-4 border shadow-sm ${totalOutstanding > 0 ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-white'}`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">OUTSTANDING</p>
          <p className={`text-2xl font-black ${totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {fmt(totalOutstanding)}
          </p>
          <p className={`text-[10px] mt-0.5 font-bold ${totalOutstanding > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
            {totalOutstanding > 0 ? 'Pending Balance' : 'Fully Paid ✅'}
          </p>
        </div>

        {/* Create New Bill Button Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 block">BILLING ACTIONS</span>
            <p className="text-sm font-black mt-1">Generate / Renew Bill</p>
          </div>
          <button
            onClick={() => setShowNewBillModal(true)}
            className="mt-3 py-2.5 px-4 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm border-none cursor-pointer"
          >
            <Plus size={15} /> Create New Bill
          </button>
        </div>
      </div>

      {/* ── Official Billing History Table Module (Spacious & Clean Layout) ── */}
      <div className="bg-white rounded-3xl border border-slate-300 shadow-md relative min-h-[480px] overflow-hidden">
        {/* Table Top Header */}
        <div className="bg-[#0b5cbe] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Receipt size={22} className="text-blue-200" />
            <div>
              <h3 className="font-extrabold text-base tracking-wide">Billing History</h3>
              <p className="text-[11px] text-blue-100 font-medium">Complete payment records, invoices, and transaction breakdown</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-white/20 text-white font-black px-3.5 py-1.5 rounded-full border border-white/20">
              {member.name} ({invoices.length} Entries)
            </span>
          </div>
        </div>

        {/* Scrollable Container with Extra Bottom Padding to Prevent Dropdown Clipping */}
        <div className="overflow-x-auto custom-scrollbar pb-24">
          <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-[#0e68d6] text-white font-extrabold text-[11px] uppercase tracking-wider border-b border-blue-700">
                <th className="px-4 py-4 whitespace-nowrap">Date</th>
                <th className="px-4 py-4 whitespace-nowrap">Invoice No</th>
                <th className="px-4 py-4 whitespace-nowrap min-w-[250px]">Package / Description</th>
                <th className="px-4 py-4 text-right whitespace-nowrap">Original Amount</th>
                <th className="px-4 py-4 text-right whitespace-nowrap">Discount</th>
                <th className="px-4 py-4 text-right whitespace-nowrap">Tax</th>
                <th className="px-4 py-4 text-right whitespace-nowrap font-black">Net Payable</th>
                <th className="px-4 py-4 text-right whitespace-nowrap font-black">Amount Paid</th>
                <th className="px-4 py-4 text-right whitespace-nowrap">Pending</th>
                <th className="px-4 py-4 whitespace-nowrap">Method</th>
                <th className="px-4 py-4 text-center whitespace-nowrap">Status</th>
                <th className="px-4 py-4 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400 font-bold text-sm">
                    No billing history recorded yet. Click "Create New Bill" to add an entry.
                  </td>
                </tr>
              ) : (
                invoices.map((inv, idx) => {
                  const invNum = inv.invoiceNumber || inv.invoice || '670';
                  const origItemAmt = Number(inv.originalAmount !== undefined ? inv.originalAmount : (inv.price || inv.amount || 0));
                  const discountAmt = Number(inv.discountAmount !== undefined ? inv.discountAmount : (inv.discount || 0));
                  const taxAmt = Number(inv.taxAmount !== undefined ? inv.taxAmount : (inv.tax || inv.gst || 0));
                  const otherAmt = Number(inv.otherCharges || 0);

                  const computedNet = Math.max(0, origItemAmt - discountAmt + taxAmt + otherAmt);
                  const netPayable = Number(inv.netPayable !== undefined ? inv.netPayable : (computedNet > 0 ? computedNet : Number(inv.amount || 0)));
                  const paidAmt = Number(inv.amountPaid !== undefined ? inv.amountPaid : (inv.paid !== undefined ? inv.paid : netPayable));
                  const pendingAmt = Math.max(0, netPayable - paidAmt);
                  const startDate = inv.startDate || member.joinDate || '20-08-2026';
                  const expiryDate = inv.expiryDate || member.expiryDate || '19-10-2026';
                  const planTitle = inv.plan || member.plan || 'Gym membership : 2 months';

                  const displayStatus = pendingAmt <= 0 ? 'PAID' : (paidAmt > 0 ? 'PARTIAL' : 'PENDING');

                  return (
                    <tr key={inv.id || idx} className="hover:bg-blue-50/60 transition-colors border-b border-slate-100">
                      {/* Date */}
                      <td className="px-4 py-4 whitespace-nowrap font-mono text-slate-700 font-bold">
                        {inv.date || formatDate(member.joinDate)}
                      </td>

                      {/* Invoice No */}
                      <td className="px-4 py-4 whitespace-nowrap font-mono font-black text-blue-700">
                        {invNum}
                      </td>

                      {/* Item Description & Validity Period */}
                      <td className="px-4 py-4 min-w-[250px]">
                        <div className="font-extrabold text-slate-900">{planTitle}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">({startDate} to {expiryDate})</div>
                      </td>

                      {/* Original Amount */}
                      <td className="px-4 py-4 text-right font-mono font-bold text-slate-900">₹{origItemAmt.toLocaleString('en-IN')}</td>

                      {/* Discount */}
                      <td className="px-4 py-4 text-right font-mono text-emerald-600 font-bold">{discountAmt > 0 ? `- ₹${discountAmt.toLocaleString('en-IN')}` : '₹0'}</td>

                      {/* Tax */}
                      <td className="px-4 py-4 text-right font-mono text-slate-500">{taxAmt > 0 ? `₹${taxAmt.toLocaleString('en-IN')}` : '₹0'}</td>

                      {/* Net payable */}
                      <td className="px-4 py-4 text-right font-mono font-black text-slate-900">₹{netPayable.toLocaleString('en-IN')}</td>

                      {/* Amount paid */}
                      <td className="px-4 py-4 text-right font-mono font-black text-emerald-600">₹{paidAmt.toLocaleString('en-IN')}</td>

                      {/* Pending */}
                      <td className="px-4 py-4 text-right font-mono font-bold text-red-500">{pendingAmt > 0 ? `₹${pendingAmt.toLocaleString('en-IN')}` : '₹0'}</td>

                      {/* Payment type */}
                      <td className="px-4 py-4 whitespace-nowrap font-bold text-slate-700">
                        <span className="px-2 py-1 bg-slate-100 rounded text-[11px] font-bold text-slate-700">
                          {inv.method || 'Cash'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block ${
                          displayStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          displayStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {displayStatus}
                        </span>
                      </td>

                      {/* Actions & Dropdown */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 relative">
                          {/* Quick Icon Actions */}
                          <button
                            type="button"
                            title="View Invoice"
                            onClick={() => setViewInvoice(inv)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all border-none cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            title="Print Invoice"
                            onClick={() => handlePrint(inv)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all border-none cursor-pointer"
                          >
                            <Printer size={15} />
                          </button>
                          <button
                            type="button"
                            title="Send WhatsApp Bill"
                            onClick={() => handleWhatsApp(inv)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all border-none cursor-pointer"
                          >
                            <MessageSquare size={15} />
                          </button>

                          {/* ACTION Dropdown Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              if (openDropdown?.invoice?.id === (inv.id || inv.invoiceNumber)) {
                                setOpenDropdown(null);
                              } else {
                                setOpenDropdown({ invoice: inv, anchorRect: rect });
                              }
                            }}
                            className="px-3 py-1.5 bg-[#d32f2f] hover:bg-[#c62828] text-white font-black rounded-lg text-xs uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border-none shadow-md active:scale-95"
                          >
                            <span>ACTION</span>
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Export Bar (EXCEL & PDF Buttons) */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-bold">
            Showing <span className="font-extrabold text-slate-800">{invoices.length}</span> billing transactions
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-5 py-2.5 bg-[#d32f2f] hover:bg-[#c62828] text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border-none shadow-md active:scale-95"
            >
              <FileSpreadsheet size={15} />
              <span>EXCEL</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="px-5 py-2.5 bg-[#d32f2f] hover:bg-[#c62828] text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border-none shadow-md active:scale-95"
            >
              <FileCode size={15} />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. VIEW INVOICE MODAL (Official Document View) ───────────────────── */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                <h3 className="text-lg font-black text-slate-900">Official Tax Invoice &amp; Receipt</h3>
              </div>
              <button onClick={() => setViewInvoice(null)} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 border-none bg-transparent cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Universal Official Invoice Receipt Template */}
            <OfficialInvoiceReceipt invoice={viewInvoice} member={member} />

            <div className="flex items-center gap-3 max-w-[800px] mx-auto">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-2 border-none cursor-pointer shadow-md"
              >
                <Printer size={16} /> Print Official Invoice
              </button>
              <button
                onClick={() => setViewInvoice(null)}
                className="py-3.5 px-6 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all border-none cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. CREATE NEW BILL MODAL ─────────────────────────────────────────── */}
      <CreateNewBillModal
        isOpen={showNewBillModal}
        member={member}
        onClose={() => setShowNewBillModal(false)}
        onSaved={() => fetchMembers()}
      />

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

      {/* ── 4. PORTAL FLOATING ACTION DROPDOWN (NEVER CLIPPED) ──────────────── */}
      {openDropdown && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            left: Math.max(12, Math.min(window.innerWidth - 220, openDropdown.anchorRect.right - 200)),
            top: window.innerHeight - openDropdown.anchorRect.bottom >= 260
              ? openDropdown.anchorRect.bottom + 6
              : Math.max(12, openDropdown.anchorRect.top - 260),
            zIndex: 99999
          }}
          className="bg-white border border-slate-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-52 py-2 text-left text-xs font-bold text-slate-800 animate-in fade-in select-none"
        >
          <button
            type="button"
            onClick={() => {
              setViewInvoice(openDropdown.invoice);
              setOpenDropdown(null);
            }}
            className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-slate-800 transition-colors"
          >
            <Eye size={15} className="text-blue-600" />
            <span>View Bill</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedInvoiceForEdit(openDropdown.invoice);
              setOpenDropdown(null);
            }}
            className="w-full px-4 py-2.5 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-slate-800 transition-colors font-extrabold"
          >
            <Edit3 size={15} className="text-indigo-600" />
            <span>Edit Bill</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handlePrint(openDropdown.invoice);
              setOpenDropdown(null);
            }}
            className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-slate-800 transition-colors"
          >
            <Printer size={15} className="text-slate-600" />
            <span>Print Bill</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleExportPDF();
              setOpenDropdown(null);
            }}
            className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-slate-800 transition-colors"
          >
            <FileCode size={15} className="text-rose-600" />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleExportCSV();
              setOpenDropdown(null);
            }}
            className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-slate-800 transition-colors"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Download Excel</span>
          </button>

          <div className="border-t border-slate-100 my-1"></div>

          <button
            type="button"
            onClick={() => {
              handleWhatsApp(openDropdown.invoice);
              setOpenDropdown(null);
            }}
            className="w-full px-4 py-2.5 hover:bg-emerald-50 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-emerald-700 font-extrabold transition-colors"
          >
            <MessageSquare size={15} className="text-emerald-600" />
            <span>WhatsApp Bill</span>
          </button>
        </div>,
        document.body
      )}

      {/* ── 5. EDIT BILLING MODAL (FULL PRODUCTION FLOW) ────────────────────── */}
      {selectedInvoiceForEdit && (
        <EditBillingModal
          isOpen={!!selectedInvoiceForEdit}
          invoice={selectedInvoiceForEdit}
          member={member}
          onClose={() => setSelectedInvoiceForEdit(null)}
          onSaved={(updatedInv, updatedMem, shouldGenerateReceipt) => {
            setInvoices((prev: any[]) => prev.map(inv => {
              const matches = (inv.id && inv.id === updatedInv.id) ||
                (inv.invoiceNumber && inv.invoiceNumber === updatedInv.invoiceNumber) ||
                (inv.invoice && inv.invoice === updatedInv.invoice);
              return matches ? { ...inv, ...updatedInv } : inv;
            }));
            if (updatedMem) {
              setMember((prev: any) => ({ ...prev, ...updatedMem }));
            }
            if (shouldGenerateReceipt) {
              setViewInvoice(updatedInv);
            }
            fetchMembers(true);
          }}
        />
      )}
    </div>
  );
}
