'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Check, Sparkles, CreditCard, User, Dumbbell, Receipt, Mail, MessageSquare, Bell, Calendar } from 'lucide-react';
import { useGymStore } from '@/store';
import { formatCurrency } from '@/lib/utils';
import { membershipEngine } from '@/lib/engines/membershipEngine';
import API from '@/services/api';
import toast from 'react-hot-toast';

interface RenewalWizardProps {
  isOpen: boolean;
  member: any;
  onClose: () => void;
}

const PLANS = [
  { id: '1m', name: '1 Month Standard', price: 2500, duration: 1, desc: 'Basic single month access' },
  { id: '3m', name: '3 Months Pro', price: 6500, duration: 3, desc: 'Quarterly membership saver' },
  { id: '6m', name: '6 Months Elite', price: 11500, duration: 6, desc: 'Semi-annual transformation pack' },
  { id: '12m', name: '12 Months VIP', price: 18000, duration: 12, desc: 'Annual ultimate access' },
  { id: 'pt', name: 'Personal Training (PT)', price: 8000, duration: 1, desc: '1-on-1 personal trainer sessions' },
  { id: 'premium', name: 'Premium Platinum', price: 25000, duration: 12, desc: 'All-inclusive premium annual access' },
  { id: 'custom', name: 'Custom Custom Plan', price: 0, duration: 1, desc: 'Enter custom pricing and duration' },
];

const METHODS = ['Cash', 'UPI', 'Card', 'Bank', 'Cheque', 'Split Payment'];

const Confetti = () => {
  const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#d4ff00'];
  const particles = Array.from({ length: 60 }).map((_, i) => ({
    id: i,
    color: colors[i % colors.length],
    x: Math.random() * 400 - 200,
    y: Math.random() * -300 - 50,
    scale: Math.random() * 0.7 + 0.3,
    rotation: Math.random() * 360,
  }));
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center z-50">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 200, scale: 0, rotate: 0, opacity: 1 }}
          animate={{
            x: p.x,
            y: p.y,
            scale: p.scale,
            rotate: p.rotation + 360,
            opacity: [1, 1, 0]
          }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  );
};

export default function RenewalWizardModal({ isOpen, member, onClose }: RenewalWizardProps) {
  const { addPayment, updateMember, fetchMembers } = useGymStore();
  const [step, setStep] = useState(1);
  const [trainers, setTrainers] = useState<any[]>([]);

  // Step 1 states
  const [selectedPlanId, setSelectedPlanId] = useState('1m');
  const [customPrice, setCustomPrice] = useState(3000);
  const [customDuration, setCustomDuration] = useState(1);

  // Step 2 states
  const [method, setMethod] = useState('UPI');
  const [discount, setDiscount] = useState(0);
  const [coupon, setCoupon] = useState('');
  const [gst, setGst] = useState(0);
  const [admissionFee, setAdmissionFee] = useState(0);
  const [outstanding, setOutstanding] = useState(member?.outstandingBalance || 0);

  // Step 3 states
  const [assignedTrainer, setAssignedTrainer] = useState(member?.trainer || '');

  // Step 4 Completion states
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeDone, setCompleteDone] = useState(false);
  const [notifications, setNotifications] = useState({
    email: 'pending',
    whatsapp: 'pending',
    push: 'pending',
  });

  useEffect(() => {
    API.get('/trainers')
      .then(res => setTrainers(res.data))
      .catch(err => console.error('Failed to load trainers:', err));
  }, []);

  useEffect(() => {
    if (member) {
      setOutstanding(member.outstandingBalance || 0);
      setAssignedTrainer(member.trainer || '');
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const currentPlan = PLANS.find(p => p.id === selectedPlanId) || PLANS[0];
  const planPrice = selectedPlanId === 'custom' ? customPrice : currentPlan.price;
  const planDuration = selectedPlanId === 'custom' ? customDuration : currentPlan.duration;

  // Coupon Code application
  const getCouponDiscount = () => {
    if (coupon.toUpperCase() === 'ALPHA10') {
      return Math.round(planPrice * 0.1);
    }
    if (coupon.toUpperCase() === 'FIT20') {
      return Math.round(planPrice * 0.2);
    }
    return 0;
  };

  const couponDiscount = getCouponDiscount();
  const totalDiscount = Number(discount) + couponDiscount;
  const gstAmount = Number(gst);
  const totalAmount = Math.max(0, Number(planPrice) + Number(admissionFee) + Number(outstanding) - totalDiscount + gstAmount);

  // Calculate Expiry Date
  const calculateNewExpiry = () => {
    const curExpiry = new Date(member.expiryDate);
    const today = new Date();
    // If membership is expired or expires today, start from today. Else start from old expiry.
    const start = curExpiry.getTime() > today.getTime() ? curExpiry : today;
    const newExpiry = new Date(start.getTime() + planDuration * 30 * 24 * 60 * 60 * 1000);
    return newExpiry.toISOString().split('T')[0];
  };

  const newExpiryString = calculateNewExpiry();

  const handleNextStep = () => {
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleFinish = async () => {
    setIsCompleting(true);
    try {
      const generatedInvoiceNum = 'INV-' + Math.floor(10000 + Math.random() * 90000);
      
      // 1. Save payment invoice to Firestore via API
      await addPayment({
        memberId: member.id,
        amount: totalAmount,
        plan: selectedPlanId === 'custom' ? `Custom (${customDuration}m)` : currentPlan.name,
        method: method,
        newExpiryDate: newExpiryString,
      });

      // 2. Update member details
      await updateMember(member.id, {
        plan: selectedPlanId === 'custom' ? `Custom (${customDuration}m)` : currentPlan.name,
        trainer: assignedTrainer,
        outstandingBalance: 0, // Reset balance since it was paid in renewal
        status: 'active',
        expiryDate: newExpiryString,
        timeline: [
          ...(member.timeline || []),
          { 
            type: 'Renewed', 
            date: new Date().toISOString().split('T')[0], 
            details: `Renewed membership: ${selectedPlanId === 'custom' ? 'Custom' : currentPlan.name} for ${planDuration} Months` 
          }
        ]
      });

      setCompleteDone(true);
      fetchMembers();

      // Trigger simulated notification delivery delays
      setTimeout(() => {
        setNotifications(n => ({ ...n, email: 'sent' }));
      }, 700);

      setTimeout(() => {
        setNotifications(n => ({ ...n, whatsapp: 'sent' }));
      }, 1400);

      setTimeout(() => {
        setNotifications(n => ({ ...n, push: 'sent' }));
      }, 2100);

    } catch (err) {
      toast.error('Failed to complete membership renewal');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={completeDone ? undefined : onClose} />

      {/* Glassmorphic Wizard Card */}
      <motion.div 
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        className="relative w-full max-w-lg bg-white/80 backdrop-blur-3xl border border-white/80 rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.15)] z-10 overflow-hidden text-slate-800 p-6 min-h-[500px] flex flex-col justify-between"
      >
        {/* Step Indicator Header */}
        {!completeDone && (
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Step {step} of 3</span>
              <h3 className="text-base font-black text-slate-900 leading-tight">Membership Renewal</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Wizard Step Content */}
        <div className="flex-1 py-4">
          <AnimatePresence mode="wait">
            {step === 1 && !completeDone && (
              <motion.div 
                key="step1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-4"
              >
                <h4 className="text-sm font-black text-slate-800">Choose Membership Plan</h4>
                <div className="grid grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {PLANS.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all duration-300 relative overflow-hidden ${
                        selectedPlanId === p.id 
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-500' 
                          : 'border-slate-200 bg-white/40 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900 flex justify-between">
                        <span>{p.name.replace(/\(.*\)/g, '')}</span>
                        {selectedPlanId === p.id && <span className="text-indigo-600"><Check size={12} /></span>}
                      </div>
                      <div className="text-[11px] font-extrabold text-indigo-600 mt-1">
                        {p.id === 'custom' ? 'Custom Quote' : formatCurrency(p.price)}
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1 leading-normal">{p.desc}</p>
                    </div>
                  ))}
                </div>

                {selectedPlanId === 'custom' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200"
                  >
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Price (INR)</label>
                      <input 
                        type="number" 
                        value={customPrice}
                        onChange={e => setCustomPrice(Math.max(0, Number(e.target.value)))}
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Duration (Months)</label>
                      <input 
                        type="number" 
                        value={customDuration}
                        onChange={e => setCustomDuration(Math.max(1, Number(e.target.value)))}
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 2 && !completeDone && (
              <motion.div 
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-4"
              >
                <h4 className="text-sm font-black text-slate-800">Payment Configuration</h4>
                
                {/* Method selector */}
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Payment Method</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {METHODS.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={`py-2 text-[10px] font-bold rounded-xl border transition-all ${
                          method === m 
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' 
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Membership Price</label>
                    <div className="mt-1 text-xs font-black text-slate-800 py-2 border-b border-slate-100">
                      {formatCurrency(planPrice)}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Outstanding Balance</label>
                    <input 
                      type="number" 
                      value={outstanding}
                      onChange={e => setOutstanding(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Membership Discount</label>
                    <input 
                      type="number" 
                      value={discount}
                      onChange={e => setDiscount(Math.max(0, Number(e.target.value)))}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Coupon Code</label>
                    <input 
                      type="text" 
                      placeholder="ALPHA10 (10%), FIT20 (20%)" 
                      value={coupon}
                      onChange={e => setCoupon(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase tracking-wider font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">GST Fee</label>
                    <input 
                      type="number" 
                      value={gst}
                      onChange={e => setGst(Math.max(0, Number(e.target.value)))}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Admission Fee</label>
                    <input 
                      type="number" 
                      value={admissionFee}
                      onChange={e => setAdmissionFee(Math.max(0, Number(e.target.value)))}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-600">Total Charged Amount</div>
                  <div className="text-lg font-black text-indigo-600">{formatCurrency(totalAmount)}</div>
                </div>
              </motion.div>
            )}

            {step === 3 && !completeDone && (
              <motion.div 
                key="step3"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-4"
              >
                <h4 className="text-sm font-black text-slate-800">Review & Confirm</h4>
                
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">Client Name</span>
                    <span className="font-extrabold text-slate-900">{member.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">Old Plan &rArr; New Plan</span>
                    <span className="font-bold text-slate-900">{member.plan || 'Standard'} &rarr; <span className="text-indigo-600 font-black">{selectedPlanId === 'custom' ? `Custom` : currentPlan.name}</span></span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">New Expiry Date</span>
                    <span className="font-extrabold text-slate-900 flex items-center gap-1">
                      <Calendar size={12} className="text-indigo-500" />
                      {new Date(newExpiryString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">Payment Method</span>
                    <span className="font-extrabold text-slate-800">{method}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">Outstanding Balance Paid</span>
                    <span className="font-extrabold text-slate-800">{formatCurrency(outstanding)}</span>
                  </div>
                  <div className="flex justify-between py-1 pt-2">
                    <span className="text-slate-900 font-extrabold text-sm">Amount Paid</span>
                    <span className="font-black text-indigo-600 text-base">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                {/* Trainer assignment */}
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Assign Strength Trainer</label>
                  <select 
                    value={assignedTrainer}
                    onChange={e => setAssignedTrainer(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Leave Unassigned / No Trainer</option>
                    {trainers.map(t => (
                      <option key={t.id} value={t.name}>{t.name} ({t.specialization})</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}

            {/* Step 4: Completion Screen */}
            {completeDone && (
              <motion.div 
                key="step4"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center space-y-6 py-6 relative"
              >
                {/* Confetti element */}
                <Confetti />

                {/* Apple Wallet Style Invoice Success Card */}
                <div className="w-64 h-36 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-xl mx-auto flex flex-col justify-between p-4 text-left relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Alpha Zone Gym VIP</div>
                      <div className="text-xs font-black text-white mt-1">{member.name}</div>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Receipt size={14} />
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-800/80 pt-3">
                    <div>
                      <div className="text-[7px] text-slate-500 font-bold uppercase">Valid Until</div>
                      <div className="text-[10px] font-bold text-white font-mono">{new Date(newExpiryString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[7px] text-slate-500 font-bold uppercase">Membership Paid</div>
                      <div className="text-[11px] font-black text-indigo-400">{formatCurrency(totalAmount)}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900 flex items-center justify-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center">✓</span>
                    Membership Renewed!
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">Database updated, invoice generated, and notifications dispatched.</p>
                </div>

                {/* Simulated Notification feed */}
                <div className="max-w-xs mx-auto space-y-2 bg-slate-50 border border-slate-100 p-3 rounded-2xl text-left">
                  <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 pb-1 border-b border-slate-200">
                    <span>Notification dispatch feed</span>
                    <span className="animate-pulse text-indigo-500">Live</span>
                  </div>
                  
                  {/* Email */}
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Mail size={12} className="text-blue-500" />
                      <span>Email Invoice Receipt</span>
                    </div>
                    <span className={`font-bold uppercase text-[8px] px-1.5 py-0.5 rounded ${
                      notifications.email === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 animate-pulse'
                    }`}>
                      {notifications.email === 'sent' ? 'Sent ✓' : 'Dispatching...'}
                    </span>
                  </div>

                  {/* WhatsApp */}
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <MessageSquare size={12} className="text-emerald-500" />
                      <span>WhatsApp Notice</span>
                    </div>
                    <span className={`font-bold uppercase text-[8px] px-1.5 py-0.5 rounded ${
                      notifications.whatsapp === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 animate-pulse'
                    }`}>
                      {notifications.whatsapp === 'sent' ? 'Sent ✓' : 'Dispatching...'}
                    </span>
                  </div>

                  {/* Push */}
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Bell size={12} className="text-amber-500" />
                      <span>App Push Alert</span>
                    </div>
                    <span className={`font-bold uppercase text-[8px] px-1.5 py-0.5 rounded ${
                      notifications.push === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 animate-pulse'
                    }`}>
                      {notifications.push === 'sent' ? 'Sent ✓' : 'Dispatching...'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer controls */}
        {!completeDone && (
          <div className="flex gap-2 pt-4 border-t border-slate-100 mt-4">
            {step > 1 && (
              <button 
                onClick={handlePrevStep}
                className="flex items-center justify-center gap-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
            
            {step < 3 ? (
              <button 
                onClick={handleNextStep}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all border-none shadow-sm cursor-pointer"
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button 
                onClick={handleFinish}
                disabled={isCompleting}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all border-none shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isCompleting ? 'Renewing...' : 'Finalize & Charge Renewal'} <Sparkles size={14} className="text-white" />
              </button>
            )}
          </div>
        )}

        {completeDone && (
          <button 
            onClick={onClose}
            className="w-full py-3 bg-black hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider text-center mt-4 transition-colors cursor-pointer border-none shadow-md"
          >
            All Done - Exit Wizard
          </button>
        )}
      </motion.div>
    </div>
  );
}
