'use client';
import React, { useState, useEffect } from 'react';
import { Receipt, CreditCard, AlertCircle, CheckCircle, Clock, Download, MessageSquare, RefreshCw, Plus } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { paymentEngine } from '@/lib/engines/paymentEngine';
import toast from 'react-hot-toast';

export default function BillingTab({ member }: { member: any }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // ── Real-time listener for this member's invoices ────────────────────
  useEffect(() => {
    if (!member?.id) return;
    setLoading(true);

    // Listen to 'payments' collection filtered by memberId
    const q = query(collection(db, 'payments'), where('memberId', '==', member.id));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setInvoices(data);
      setLoading(false);
    });
    return () => unsub();
  }, [member?.id]);

  // ── Derived totals ───────────────────────────────────────────────────
  const totalBilled    = invoices.reduce((s, inv) => s + (Number(inv.amount) || 0), 0);
  const totalPaid      = invoices.reduce((s, inv) => s + (Number(inv.paid) || 0), 0);
  const totalOutstanding = paymentEngine.calculateOutstandingAmount(totalBilled, totalPaid);

  // ── Mark invoice as paid ─────────────────────────────────────────────
  const handleMarkPaid = async (inv: any) => {
    if (!window.confirm(`Mark ₹${(inv.amount || 0).toLocaleString('en-IN')} as PAID?`)) return;
    setMarkingId(inv.id);
    try {
      const total = Number(inv.amount) || 0;
      await updateDoc(doc(db, 'payments', inv.id), {
        status: 'paid',
        paid: total,
        pendingAmount: 0,
      });
      // Sync invoices collection too
      try { await updateDoc(doc(db, 'invoices', inv.id), { status: 'paid', paid: total, pendingAmount: 0 }); } catch (_) {}
      
      // Update the member record to reflect full payment
      await updateDoc(doc(db, 'members', member.id), {
        paymentStatus: 'paid',
        paidAmount: total,
        pendingAmount: 0,
      });

      toast.success('✅ Payment marked as PAID!');
    } catch (e: any) {
      toast.error('Failed: ' + e.message);
    } finally {
      setMarkingId(null);
    }
  };

  // ── WhatsApp share ───────────────────────────────────────────────────
  const handleWhatsApp = (inv: any) => {
    const phone = (member.phone || '').replace(/\D/g, '');
    const total = Number(inv.total) || Number(inv.amount) || 0;
    const outstanding = paymentEngine.calculateOutstandingAmount(total, Number(inv.paid) || 0);
    const msg = encodeURIComponent(
      `🏋️ Alpha Zone Gym — Invoice\n\nInvoice: ${inv.invoice || 'N/A'}\nPlan: ${inv.plan || 'Membership'}\nAmount: ₹${total.toLocaleString('en-IN')}\nStatus: ${(inv.status || 'pending').toUpperCase()}\n${outstanding > 0 ? `Outstanding: ₹${outstanding.toLocaleString('en-IN')}` : '✅ Fully Paid'}\n\nThank you! 💪`
    );
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank');
  };

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-5">

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Billed</p>
          <p className="text-xl font-black text-slate-900">{fmt(totalBilled)}</p>
          <p className="text-[9px] text-slate-400 mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Collected</p>
          <p className="text-xl font-black text-emerald-600">{fmt(totalPaid)}</p>
          <p className="text-[9px] text-emerald-500 mt-0.5">Received</p>
        </div>
        <div className={`rounded-2xl p-4 border shadow-sm ${totalOutstanding > 0 ? 'border-red-100 bg-red-50' : 'border-slate-100 bg-white'}`}>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Outstanding</p>
          <p className={`text-xl font-black ${totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {fmt(totalOutstanding)}
          </p>
          <p className={`text-[9px] mt-0.5 ${totalOutstanding > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {totalOutstanding > 0 ? 'Pending' : 'Fully Paid ✅'}
          </p>
        </div>
      </div>

      {/* ── Invoice List ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={15} className="text-slate-500" />
            <h3 className="font-black text-sm text-slate-900">Payment History</h3>
            <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">{invoices.length}</span>
          </div>
          {loading && <RefreshCw size={13} className="animate-spin text-slate-400" />}
        </div>

        {!loading && invoices.length === 0 && (
          <div className="py-14 text-center">
            <Receipt size={32} className="mx-auto mb-2 text-slate-200" />
            <p className="text-sm font-bold text-slate-400">No invoices yet</p>
            <p className="text-xs text-slate-300 mt-1">Go to Billing & Payments to generate a bill</p>
          </div>
        )}

        {invoices.length > 0 && (
          <div className="divide-y divide-slate-50">
            {invoices.map((inv) => {
              const total       = Number(inv.amount) || 0;   // no GST
              const paidAmt     = Number(inv.paid) || 0;
              const outstanding = paymentEngine.calculateOutstandingAmount(total, paidAmt);
              const isPaid      = inv.status === 'paid' || outstanding <= 0;
              const isPartial   = !isPaid && paidAmt > 0;
              const date        = inv.date ? new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

              return (
                <div key={inv.id} className="px-5 py-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] font-bold text-blue-600">{inv.invoice || '—'}</span>
                        {isPaid ? (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">PAID</span>
                        ) : isPartial ? (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">PARTIAL</span>
                        ) : (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">PENDING</span>
                        )}
                      </div>
                      <p className="text-sm font-black text-slate-800">{inv.plan || 'Membership'}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-slate-400 font-semibold">{date}</span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{inv.method || 'N/A'}</span>
                        {outstanding > 0 && (
                          <>
                            <span className="text-[10px] text-slate-400">·</span>
                            <span className="text-[10px] font-black text-red-500">{fmt(outstanding)} due</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-slate-900">{fmt(total)}</p>
                      {!isPaid && (
                        <p className="text-[9px] text-slate-400 mt-0.5">{fmt(paidAmt)} paid</p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3">
                    {!isPaid && (
                      <button
                        onClick={() => handleMarkPaid(inv)}
                        disabled={markingId === inv.id}
                        className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {markingId === inv.id ? '...' : '✓ Mark Paid'}
                      </button>
                    )}
                    <button
                      onClick={() => handleWhatsApp(inv)}
                      className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <MessageSquare size={10} /> WhatsApp
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
