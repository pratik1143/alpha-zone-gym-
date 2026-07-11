'use client';
import React, { useState, useEffect } from 'react';
import { X, Receipt, Send, CreditCard, User, Smartphone, Banknote, Clock, ChevronDown } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { paymentEngine } from '@/lib/engines/paymentEngine';
import { membershipEngine } from '@/lib/engines/membershipEngine';
import toast from 'react-hot-toast';

// ── Plan Catalogue (auto-filled prices) ──────────────────────────────────────
const SUBSCRIPTION_PLANS = [
  { label: '1 Month',   months: 1,  price: 2500  },
  { label: '3 Months',  months: 3,  price: 6500  },
  { label: '6 Months',  months: 6,  price: 11500 },
  { label: '12 Months', months: 12, price: 18000 },
];

const PAYMENT_MODES = [
  { value: 'Cash',        label: 'Cash',      icon: '💵', color: '#16a34a' },
  { value: 'UPI',         label: 'UPI',       icon: '📱', color: '#7c3aed' },
  { value: 'Card',        label: 'Card',      icon: '💳', color: '#2563eb' },
  { value: 'not_paid',    label: 'Not Paid',  icon: '🕐', color: '#dc2626' },
];

// ── Member status helper ──────────────────────────────────────────────────────
function getMemberStatus(m: any): 'active' | 'expiring' | 'expired' | 'frozen' {
  if (m.status === 'frozen') return 'frozen';
  const days = membershipEngine.calculateDaysLeft(m.expiryDate);
  if (days < 0) return 'expired';
  if (days <= 15) return 'expiring';
  return 'active';
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: 'Active',   color: '#16a34a', bg: '#f0fdf4' },
  expiring: { label: 'Expiring', color: '#d97706', bg: '#fffbeb' },
  expired:  { label: 'Expired',  color: '#dc2626', bg: '#fef2f2' },
  frozen:   { label: 'Frozen',   color: '#6366f1', bg: '#eef2ff' },
};

export default function InvoiceBuilderModal({ isOpen, type, onClose, members }: any) {
  const [memberId, setMemberId]       = useState('');
  const [selectedPlan, setSelectedPlan] = useState<typeof SUBSCRIPTION_PLANS[0] | null>(null);
  const [baseAmount, setBaseAmount]   = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setMemberId('');
      setSelectedPlan(null);
      setBaseAmount('');
      setPaymentMode('Cash');
      setDescription('');
    }
  }, [isOpen]);

  // Auto-fill price when plan is selected
  const handlePlanSelect = (plan: typeof SUBSCRIPTION_PLANS[0]) => {
    setSelectedPlan(plan);
    setBaseAmount(plan.price);
    if (!description) setDescription(plan.label + ' Membership');
  };

  // Calculations — NO GST
  const base        = Number(baseAmount) || 0;
  const gst         = 0;   // GST removed
  const total       = base; // total = base only
  const notPaid     = paymentMode === 'not_paid';
  const paid        = notPaid ? 0 : total;
  const outstanding = paymentEngine.calculateOutstandingAmount(total, paid);
  const status      = paymentEngine.calculatePaymentStatus(total, paid);

  // Group members by status
  const grouped = {
    active:   members.filter((m: any) => getMemberStatus(m) === 'active'),
    expiring: members.filter((m: any) => getMemberStatus(m) === 'expiring'),
    expired:  members.filter((m: any) => getMemberStatus(m) === 'expired'),
    frozen:   members.filter((m: any) => getMemberStatus(m) === 'frozen'),
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId)   return toast.error('Please select a member');
    if (base <= 0)   return toast.error('Please select a plan or enter an amount');

    setIsSubmitting(true);
    try {
      const member = members.find((m: any) => m.id === memberId);
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      const payload = {
        invoice:     invoiceNumber,
        memberId:    memberId,
        memberName:  member?.name || 'Unknown',
        memberPhone: member?.phone || '',
        plan:        description || selectedPlan?.label || 'Membership',
        amount:      base,
        gst:         Math.round(gst),
        total:       Math.round(total),
        paid:        Math.round(paid),
        pendingAmount: Math.round(outstanding),
        status:      status.toLowerCase(),
        method:      notPaid ? 'Not Paid' : paymentMode,
        date:        new Date().toISOString(),
      };

      await addDoc(collection(db, 'payments'), payload);
      await addDoc(collection(db, 'invoices'), payload);

      // ── SYNC MEMBER DOCUMENT ──────────────────────────────────────
      // Update the member's payment fields so profile, member list,
      // and dashboard all reflect the new bill instantly.
      const { updateDoc, doc } = await import('firebase/firestore');
      
      let memberUpdates: any = {
        invoiceAmount:  base,
        invoiceGst:     0,
        invoiceTotal:   Math.round(total),
        paidAmount:     Math.round(paid),
        pendingAmount:  Math.round(outstanding),
        paymentStatus:  notPaid ? 'pending' : 'paid',
        lastInvoice:    invoiceNumber,
        lastBillDate:   new Date().toISOString(),
      };

      // Auto-renew member if a plan is selected
      if (type !== 'POS' && selectedPlan) {
        let currentExpiry = member.expiryDate ? new Date(member.expiryDate) : new Date();
        const now = new Date();
        // If expired, start from today. If active, extend from current expiry.
        let startDate = currentExpiry < now ? now : currentExpiry;
        const newExpiry = new Date(startDate.getTime() + selectedPlan.months * 30 * 24 * 60 * 60 * 1000);
        
        memberUpdates.plan = selectedPlan.label;
        memberUpdates.expiryDate = newExpiry.toISOString().split('T')[0];
        memberUpdates.status = 'active'; // activate automatically
      }

      await updateDoc(doc(db, 'members', memberId), memberUpdates);

      toast.success(`✅ Invoice ${invoiceNumber} generated for ${member?.name}!`);
      onClose();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !type) return null;

  const titleMap: any = {
    'Gym': 'Gym Membership Bill', 'PT': 'Personal Training Bill',
    'Group': 'Group Class Bill',  'POS': 'POS / Product Sale',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-r from-pink-500 to-rose-500 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Receipt size={16} />
            </div>
            <div>
              <h2 className="font-black text-base">{titleMap[type]}</h2>
              <p className="text-[9px] font-bold text-pink-100 uppercase tracking-wider">Invoice Generator</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <form id="invoice-form" onSubmit={handleGenerate} className="space-y-4">

            {/* 1 ── Member Selection (Grouped by Status) ─────────── */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <User size={11} /> Select Member
              </label>
              <select
                value={memberId}
                onChange={e => setMemberId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-pink-500 focus:bg-white transition-all"
                required
              >
                <option value="">-- Choose Member --</option>

                {/* Active */}
                {grouped.active.length > 0 && (
                  <optgroup label={`✅ Active (${grouped.active.length})`}>
                    {grouped.active.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name} · {m.phone}</option>
                    ))}
                  </optgroup>
                )}

                {/* Expiring Soon */}
                {grouped.expiring.length > 0 && (
                  <optgroup label={`⚠️ Expiring Soon (${grouped.expiring.length})`}>
                    {grouped.expiring.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name} · {m.phone}</option>
                    ))}
                  </optgroup>
                )}

                {/* Expired */}
                {grouped.expired.length > 0 && (
                  <optgroup label={`❌ Expired (${grouped.expired.length})`}>
                    {grouped.expired.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name} · {m.phone}</option>
                    ))}
                  </optgroup>
                )}

                {/* Frozen */}
                {grouped.frozen.length > 0 && (
                  <optgroup label={`❄️ Frozen (${grouped.frozen.length})`}>
                    {grouped.frozen.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name} · {m.phone}</option>
                    ))}
                  </optgroup>
                )}
              </select>

              {/* Show selected member status badge */}
              {memberId && (() => {
                const m = members.find((x: any) => x.id === memberId);
                if (!m) return null;
                const s = getMemberStatus(m);
                const cfg = STATUS_CONFIG[s];
                const days = membershipEngine.calculateDaysLeft(m.expiryDate);
                return (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: cfg.bg }}>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: `${cfg.color}18` }}>{cfg.label}</span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {s === 'expired' ? `Expired ${Math.abs(days)} days ago` : s === 'frozen' ? 'Membership Frozen' : `${days} days remaining`}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* 2 ── Subscription Plan Selector ───────────────────── */}
            {type !== 'POS' && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">
                  Subscription Plan
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {SUBSCRIPTION_PLANS.map(plan => (
                    <button
                      key={plan.label}
                      type="button"
                      onClick={() => handlePlanSelect(plan)}
                      className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all cursor-pointer ${
                        selectedPlan?.label === plan.label
                          ? 'border-pink-500 bg-pink-50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-pink-300 hover:bg-pink-50/50'
                      }`}
                    >
                      <span className={`text-[10px] font-black ${selectedPlan?.label === plan.label ? 'text-pink-600' : 'text-slate-700'}`}>
                        {plan.label}
                      </span>
                      <span className={`text-xs font-black mt-1 ${selectedPlan?.label === plan.label ? 'text-pink-500' : 'text-slate-500'}`}>
                        ₹{plan.price.toLocaleString('en-IN')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3 ── Description + Custom Amount ──────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Description
                </label>
                <input
                  type="text"
                  placeholder={type === 'POS' ? 'e.g. Whey Protein' : 'e.g. 3 Months VIP'}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-pink-500 focus:bg-white transition-all"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Base Amount (₹)
                </label>
                <input
                  type="number"
                  value={baseAmount}
                  onChange={e => setBaseAmount(Number(e.target.value))}
                  placeholder="Auto-filled from plan"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-pink-500 focus:bg-white transition-all"
                  min="1"
                  required
                />
              </div>
            </div>

            {/* 4 ── Payment Mode ─────────────────────────────────── */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">
                Payment Mode
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_MODES.map(mode => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setPaymentMode(mode.value)}
                    className={`flex flex-col items-center py-3 px-1 rounded-xl border-2 transition-all cursor-pointer ${
                      paymentMode === mode.value
                        ? 'border-slate-900 bg-slate-900 shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                  >
                    <span className="text-lg leading-none">{mode.icon}</span>
                    <span className={`text-[9px] font-black mt-1 ${paymentMode === mode.value ? 'text-white' : 'text-slate-600'}`}>
                      {mode.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Not Paid warning */}
              {notPaid && (
                <div className="mt-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-[10px] font-black text-red-600">
                    ⚠️ Invoice will be saved as PENDING — ₹{Math.round(total).toLocaleString('en-IN')} outstanding
                  </p>
                </div>
              )}
            </div>
          </form>

          {/* ── Bill Summary ──────────────────────────────────────── */}
          <div className="bg-slate-900 rounded-2xl p-4 text-white">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-slate-400">Base Amount</span>
              <span className="text-sm font-black">₹{base.toLocaleString('en-IN')}</span>
            </div>
            <div className="w-full h-px bg-slate-700 mb-3" />
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-slate-300">Total Invoice</span>
              <span className="text-lg font-black text-pink-400">₹{Math.round(total).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">
                {notPaid ? 'Amount Collected' : 'Outstanding'}
              </span>
              <span className={`text-sm font-black ${outstanding > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                ₹{Math.round(notPaid ? 0 : outstanding).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[9px] text-slate-500 font-bold">
                {notPaid ? '🕐 Not Paid' : `Paid via ${paymentMode}`}
              </span>
              <span className={`text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full ${
                status === 'PAID'    ? 'bg-emerald-500/20 text-emerald-400' :
                status === 'PARTIAL' ? 'bg-amber-500/20 text-amber-400' :
                                       'bg-red-500/20 text-red-400'
              }`}>{status}</span>
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button
            form="invoice-form"
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-pink-500 hover:bg-pink-600 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            <Send size={13} />
            {isSubmitting ? 'Generating...' : 'Generate & Save Bill'}
          </button>
        </div>

      </div>
    </div>
  );
}
