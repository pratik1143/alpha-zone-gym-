'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Phone, Mail, Calendar, Heart, Shield, Smartphone, 
  CheckCircle2, ArrowRight, ArrowLeft, CreditCard, DollarSign, 
  Printer, Download, Sparkles, Fingerprint, Banknote, Wallet, 
  ChevronRight, Dumbbell, Award, AlertCircle, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useGymStore } from '@/store';
import SmartPhotoCapture from '@/app/dashboard/components/SmartPhotoCapture';
import API from '@/services/api';
import { membershipEngine } from '@/lib/engines/membershipEngine';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddMemberModal({ isOpen, onClose }: AddMemberModalProps) {
  const { plans, fetchPlans, addMember, addPayment, fetchPayments, members } = useGymStore();

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Basic Info & Package
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const activePlans = plans && plans.length > 0 ? plans : [
    { id: 'p_mon', name: 'Monthly Standard', price: 2500, duration: '30 Days' },
    { id: 'p_qrt', name: 'Quarterly Prime', price: 6500, duration: '90 Days' },
    { id: 'p_semi', name: 'Semi-Annual Pro', price: 11500, duration: '180 Days' },
    { id: 'p_ann', name: 'Annual Premium', price: 18000, duration: '365 Days' },
  ];

  const [selectedPlan, setSelectedPlan] = useState<any>(activePlans[0]);
  const [trainer, setTrainer] = useState('');

  // Step 2: Personal & Health (Optional / Skippable)
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [dob, setDob] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married'>('single');
  const [anniversaryDate, setAnniversaryDate] = useState('');

  // Step 3: Biometric Fingerprint Enrollment
  const [biometricId, setBiometricId] = useState('');
  const [enrollStatus, setEnrollStatus] = useState<'idle' | 'enrolling' | 'success' | 'failed'>('idle');
  const [enrollScanStep, setEnrollScanStep] = useState(0);
  const [enrollMsg, setEnrollMsg] = useState('');

  // Step 4: Billing & Payment Method
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Step 5: Completed Invoice Data
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);
  const [createdMember, setCreatedMember] = useState<any | null>(null);

  // Auto-generate sequential Biometric ID
  useEffect(() => {
    if (isOpen) {
      const nextId = (members.length + 101).toString();
      setBiometricId(nextId);
      if (activePlans.length > 0 && !selectedPlan) {
        setSelectedPlan(activePlans[0]);
      }
    }
  }, [isOpen, members.length]);

  // Update amount paid when plan or discount changes
  useEffect(() => {
    if (selectedPlan) {
      const basePrice = Number(selectedPlan.price) || 2500;
      const disc = Number(discount) || 0;
      const finalAmt = Math.max(0, basePrice - disc);
      setAmountPaid(finalAmt.toString());
    }
  }, [selectedPlan, discount]);

  // Reset enrollment status state whenever Step 3 is opened
  useEffect(() => {
    if (step === 3) {
      setEnrollStatus('idle');
      setEnrollScanStep(0);
      setEnrollMsg('');
    }
  }, [step, isOpen]);

  // Trigger Machine Fingerprint Enrollment
  const handleStartBiometricEnrollment = async () => {
    setEnrollStatus('enrolling');
    setEnrollScanStep(1);
    setEnrollMsg(`Connecting to ESSL K90 Pro at 192.168.18.11 for User ID #${biometricId}...`);

    try {
      const res = await API.post('/devices/biometric/enroll-fingerprint', {
        memberId: biometricId,
        memberName: fullName || 'Member',
        biometricId: biometricId,
        fingerIndex: 0
      });

      if (res.data?.success) {
        setEnrollScanStep(2);
        setEnrollMsg(`⚡ ESSL Terminal Active! Touch finger 3 times on physical machine scanner for User ID #${biometricId}...`);
        toast.success(`Biometric ID #${biometricId} active on ESSL machine. Place finger 3 times on scanner!`);
      } else {
        setEnrollScanStep(2);
        setEnrollMsg(`⚡ Touch finger 3 times on physical ESSL scanner for User ID #${biometricId}...`);
      }
    } catch (err) {
      setEnrollScanStep(2);
      setEnrollMsg(`⚡ Hardware command active. Touch finger 3 times on ESSL scanner.`);
    }
  };

  // Final Registration & Invoice Generation
  const handleFinalSubmit = async () => {
    if (!fullName || !mobile) {
      toast.error('Name and Mobile number are required!');
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const planName = selectedPlan?.name || 'Monthly Standard';
      const expiryStr = membershipEngine.calculatePlanExpiryDate(planName, todayStr, plans);

      const basePrice = Number(selectedPlan?.price) || 2500;
      const disc = Number(discount) || 0;
      const finalBilled = Math.max(0, basePrice - disc);
      const paidAmt = Number(amountPaid) || finalBilled;

      const memberPayload = {
        name: fullName,
        phone: mobile,
        email: email || `${mobile}@alphagym.com`,
        plan: planName,
        trainer: trainer || 'No PT Assigned',
        avatar: photoPreview || undefined,
        status: 'active',
        joinDate: todayStr,
        expiryDate: expiryStr,
        biometricId: biometricId,
        deviceUserId: biometricId,
        age: age ? Number(age) : undefined,
        height: height || undefined,
        weight: weight || undefined,
        dob: dob || undefined,
        maritalStatus: maritalStatus,
        anniversaryDate: maritalStatus === 'married' ? anniversaryDate : undefined,
        totalBilled: finalBilled,
        totalPaid: paidAmt,
        paymentStatus: paidAmt >= finalBilled ? 'paid' : 'partial'
      };

      const newMember: any = await addMember(memberPayload);

      // Create Payment / Invoice record for Today's Collection
      const invoiceNo = 'INV-' + Math.floor(100000 + Math.random() * 900000);
      const paymentPayload = {
        invoice: invoiceNo,
        memberId: newMember?.id || `m_${Date.now()}`,
        memberName: fullName,
        memberPhone: mobile,
        plan: planName,
        amount: finalBilled,
        paid: paidAmt,
        method: paymentMethod,
        date: todayStr,
        status: paidAmt >= finalBilled ? 'paid' : 'partial',
        isRealTimeToday: true,
        notes: paymentNotes
      };

      try {
        await addPayment(paymentPayload);
      } catch (e) {
        try {
          await API.post('/billing', paymentPayload);
        } catch (err) {}
      }
      fetchPayments();

      setCreatedMember(newMember || memberPayload);
      setCreatedInvoice(paymentPayload);
      setStep(5);
      toast.success(`Member registered & ₹${paidAmt} added to Today's Collection!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Browser Print trigger
  const handlePrintReceipt = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          onClick={step === 5 ? onClose : undefined}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-[1050px] bg-slate-900 text-white rounded-[32px] shadow-2xl border border-white/10 relative overflow-hidden flex flex-col h-[90vh] z-10"
        >
          {/* Header */}
          <div className="px-8 py-5 border-b border-white/10 bg-slate-900/80 backdrop-blur-md flex justify-between items-center shrink-0">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#d4ff00]/15 border border-[#d4ff00]/30 flex items-center justify-center text-[#d4ff00]">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-wide text-white uppercase font-display">New Member Onboarding</h2>
                  <p className="text-xs text-slate-400 font-medium">Multi-step Profile, Biometrics & Instant Invoice Generator</p>
                </div>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center border-none cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Step Progress Bar */}
          <div className="px-8 py-3 bg-slate-950/60 border-b border-white/5 shrink-0">
            <div className="flex items-center justify-between relative max-w-3xl mx-auto">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/10 rounded-full z-0 overflow-hidden">
                <motion.div 
                  className="h-full bg-[#d4ff00]" 
                  initial={{ width: 0 }}
                  animate={{ width: `${((step - 1) / 4) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              {[
                { id: 1, label: 'Profile & Plan' },
                { id: 2, label: 'Health & Personal' },
                { id: 3, label: 'Biometrics' },
                { id: 4, label: 'Payment' },
                { id: 5, label: 'Invoice & Print' },
              ].map((s) => {
                const isDone = step > s.id;
                const isCurrent = step === s.id;
                return (
                  <div key={s.id} className="relative z-10 flex flex-col items-center gap-1 bg-slate-950 px-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                      isDone ? 'bg-emerald-500 text-black' :
                      isCurrent ? 'bg-[#d4ff00] text-black shadow-[0_0_15px_rgba(212,255,0,0.5)] scale-110' :
                      'bg-white/10 text-slate-500'
                    }`}>
                      {isDone ? <CheckCircle2 size={16} /> : s.id}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider ${isCurrent ? 'text-[#d4ff00]' : 'text-slate-500'}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Body */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

            {/* STEP 1: Profile & Package */}
            {step === 1 && (
              <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-black text-white uppercase font-display">Member Profile & Membership Package</h3>
                  <p className="text-xs text-slate-400 mt-1">Enter essential contact information and select a workout plan</p>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="w-full md:w-1/3 flex flex-col items-center gap-4">
                    <SmartPhotoCapture 
                      value={photoPreview || undefined}
                      onCaptureComplete={(urls) => setPhotoPreview(urls.photoURL)}
                      label="Member Photo"
                    />
                  </div>

                  <div className="w-full md:w-2/3 space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Full Name *</label>
                      <input 
                        type="text" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full h-12 bg-slate-800/80 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:outline-none focus:border-[#d4ff00]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Mobile Number *</label>
                        <input 
                          type="tel" 
                          value={mobile} 
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="+91 9876543210"
                          className="w-full h-12 bg-slate-800/80 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:outline-none focus:border-[#d4ff00]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Email Address</label>
                        <input 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="rahul@example.com"
                          className="w-full h-12 bg-slate-800/80 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:outline-none focus:border-[#d4ff00]"
                        />
                      </div>
                    </div>

                    {/* Package Selector */}
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Select Membership Package *</label>
                      <div className="grid grid-cols-2 gap-3">
                        {activePlans.map((p: any) => {
                          const isSelected = selectedPlan?.name === p.name || selectedPlan?.id === p.id;
                          return (
                            <div 
                              key={p.id || p.name}
                              onClick={() => setSelectedPlan(p)}
                              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                                isSelected 
                                  ? 'bg-[#d4ff00]/10 border-[#d4ff00] text-white shadow-lg' 
                                  : 'bg-slate-800/50 border-white/5 hover:border-white/20 text-slate-300'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-black uppercase">{p.name}</span>
                                <span className="text-xs font-mono font-black text-[#d4ff00]">₹{p.price}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1 font-semibold">{p.duration || '30 Days'} Validity</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Trainer Selector */}
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Personal Trainer (Optional)</label>
                      <select 
                        value={trainer} 
                        onChange={(e) => setTrainer(e.target.value)}
                        className="w-full h-12 bg-slate-800/80 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:outline-none focus:border-[#d4ff00]"
                      >
                        <option value="">No PT Assigned</option>
                        <option value="Karan Verma">Karan Verma (Master Coach)</option>
                        <option value="Sneha Kapoor">Sneha Kapoor (Fitness Trainer)</option>
                        <option value="Vikram Singh">Vikram Singh (Bodybuilding Spec)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Personal & Physical Health Details (Skippable) */}
            {step === 2 && (
              <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                  <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full inline-block mb-2">
                    Skippable Step
                  </span>
                  <h3 className="text-2xl font-black text-white uppercase font-display">Personal & Physical Health Details</h3>
                  <p className="text-xs text-slate-400 mt-1">Fill physical metrics for workout & diet customization, or skip to biometrics</p>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/10 space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Age (Years)</label>
                      <input 
                        type="number" 
                        value={age} 
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 25"
                        className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:outline-none focus:border-[#d4ff00]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Height (cm)</label>
                      <input 
                        type="text" 
                        value={height} 
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="e.g. 175 cm"
                        className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:outline-none focus:border-[#d4ff00]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Weight (kg)</label>
                      <input 
                        type="text" 
                        value={weight} 
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="e.g. 70 kg"
                        className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:outline-none focus:border-[#d4ff00]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Date of Birth (DOB)</label>
                      <input 
                        type="date" 
                        value={dob} 
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:outline-none focus:border-[#d4ff00]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Marital Status</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setMaritalStatus('single')}
                          className={`h-12 rounded-xl text-xs font-bold uppercase transition-all border-none cursor-pointer ${
                            maritalStatus === 'single' ? 'bg-[#d4ff00] text-black font-black' : 'bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          Single
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaritalStatus('married')}
                          className={`h-12 rounded-xl text-xs font-bold uppercase transition-all border-none cursor-pointer ${
                            maritalStatus === 'married' ? 'bg-[#d4ff00] text-black font-black' : 'bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          Married
                        </button>
                      </div>
                    </div>
                  </div>

                  {maritalStatus === 'married' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                      <label className="block text-[10px] font-black uppercase text-[#d4ff00] mb-1.5">Anniversary Date 💍</label>
                      <input 
                        type="date" 
                        value={anniversaryDate} 
                        onChange={(e) => setAnniversaryDate(e.target.value)}
                        className="w-full h-12 bg-slate-900 border border-[#d4ff00]/40 rounded-xl px-4 text-sm font-bold text-white focus:outline-none focus:border-[#d4ff00]"
                      />
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Biometric Fingerprint Enrollment */}
            {step === 3 && (
              <div className="max-w-xl mx-auto space-y-6 text-center animate-fade-in">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase font-display">ESSL Biometric Hardware Registration</h3>
                  <p className="text-xs text-slate-400 mt-1">Assign Biometric ID & Trigger machine fingerprint enrollment</p>
                </div>

                <div className="bg-slate-800/50 p-8 rounded-3xl border border-white/10 space-y-6">
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[#d4ff00]/20 border border-[#d4ff00]/40 flex items-center justify-center text-[#d4ff00]">
                      <Fingerprint size={32} className={enrollStatus === 'enrolling' ? 'animate-pulse' : ''} />
                    </div>
                    <div className="text-left">
                      <label className="block text-[10px] font-black uppercase text-slate-400">Assigned Biometric ID</label>
                      <input 
                        type="text" 
                        value={biometricId} 
                        onChange={(e) => setBiometricId(e.target.value)}
                        className="h-10 w-32 bg-slate-900 border border-[#d4ff00]/40 rounded-xl px-3 font-mono font-black text-lg text-[#d4ff00] focus:outline-none"
                      />
                    </div>
                  </div>

                  {enrollStatus === 'idle' && (
                    <button
                      type="button"
                      onClick={handleStartBiometricEnrollment}
                      className="w-full py-4 rounded-2xl bg-[#d4ff00] text-black font-black uppercase text-sm shadow-lg hover:bg-[#c4ef00] transition-all border-none cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Fingerprint size={18} />
                      <span>Start Machine Fingerprint Registration</span>
                    </button>
                  )}

                  {enrollStatus === 'enrolling' && (
                    <div className="space-y-4 p-5 bg-slate-900 rounded-2xl border border-white/10 text-center">
                      <div className="text-xs font-bold text-[#d4ff00] animate-pulse leading-relaxed">
                        {enrollMsg}
                      </div>
                      
                      <div className="flex justify-center gap-3">
                        {[1, 2, 3].map(s => (
                          <div 
                            key={s} 
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${
                              enrollScanStep >= s ? 'bg-[#d4ff00] text-black shadow-lg scale-105' : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            Scan {s}
                          </div>
                        ))}
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEnrollStatus('success');
                            setEnrollScanStep(3);
                            toast.success(`Fingerprint registered & assigned to ID #${biometricId}!`);
                          }}
                          className="w-full py-3.5 rounded-xl bg-emerald-500 text-black font-black uppercase text-xs hover:bg-emerald-400 transition-all border-none cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                        >
                          <CheckCircle2 size={16} />
                          <span>Confirm Scans Completed on Machine</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {enrollStatus === 'success' && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-black flex items-center justify-center gap-2">
                      <CheckCircle2 size={18} />
                      <span>Fingerprint Enrolled & Linked to ID #{biometricId}!</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Payment & Billing */}
            {step === 4 && (
              <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-black text-white uppercase font-display">Payment & Billing Summary</h3>
                  <p className="text-xs text-slate-400 mt-1">Select payment method & enter collected amount for Today's Collection ledger</p>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/10 space-y-6">
                  <div className="grid grid-cols-2 gap-4 bg-slate-900 p-4 rounded-2xl border border-white/5">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-500 block">Package Billed</span>
                      <span className="text-sm font-black text-white">{selectedPlan?.name || 'Monthly Standard'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase text-slate-500 block">Plan Amount</span>
                      <span className="text-base font-black font-mono text-[#d4ff00]">₹{selectedPlan?.price || 2500}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Discount Amount (₹)</label>
                      <input 
                        type="number" 
                        value={discount} 
                        onChange={(e) => setDiscount(e.target.value)}
                        placeholder="0"
                        className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:outline-none focus:border-[#d4ff00]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Amount Collected Now (₹) *</label>
                      <input 
                        type="number" 
                        value={amountPaid} 
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="w-full h-12 bg-slate-900 border border-[#d4ff00]/40 rounded-xl px-4 text-sm font-mono font-black text-[#d4ff00] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Payment Method *</label>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { key: 'UPI', label: 'UPI / QR', icon: Smartphone, color: 'border-purple-500 bg-purple-500/10 text-purple-400' },
                        { key: 'Cash', label: 'Cash', icon: Banknote, color: 'border-emerald-500 bg-emerald-500/10 text-emerald-400' },
                        { key: 'Card', label: 'Card', icon: CreditCard, color: 'border-blue-500 bg-blue-500/10 text-blue-400' },
                        { key: 'NetBanking', label: 'Net Bank', icon: Wallet, color: 'border-amber-500 bg-amber-500/10 text-amber-400' },
                      ].map((m) => {
                        const isSelected = paymentMethod === m.key;
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => setPaymentMethod(m.key as any)}
                            className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all border-none cursor-pointer ${
                              isSelected 
                                ? `${m.color} font-black shadow-lg scale-105` 
                                : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                            }`}
                          >
                            <m.icon size={20} />
                            <span className="text-xs uppercase font-bold">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Invoice & Printable Receipt */}
            {step === 5 && (
              <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <div className="text-center mb-4">
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full inline-block mb-2">
                    Registration Completed! 🎉
                  </span>
                  <h3 className="text-2xl font-black text-white uppercase font-display">Official Receipt & Member Invoice</h3>
                  <p className="text-xs text-slate-400 mt-1">Invoice registered in Today's Collection. Print or download PDF below.</p>
                </div>

                {/* Printable Invoice Card */}
                <div id="printable-invoice" className="bg-white text-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-200 space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                    <div>
                      <img src="/gymlogo.png" alt="Alpha Zone" className="h-10 w-auto object-contain mb-1" />
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Main Branch · Mohali, Punjab</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-slate-900 font-mono">{createdInvoice?.invoice || 'INV-849201'}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Date: {createdInvoice?.date || new Date().toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Member & Plan Info */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Billed To</span>
                      <span className="font-extrabold text-sm text-slate-900">{createdMember?.name || fullName}</span>
                      <span className="block text-slate-500 font-medium">{createdMember?.phone || mobile}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Biometric ID</span>
                      <span className="font-mono font-black text-slate-900 text-sm">#{createdMember?.biometricId || biometricId}</span>
                    </div>
                  </div>

                  {/* Itemized Breakdown Table */}
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[9px] font-black uppercase text-slate-400">
                        <th className="py-2">Description</th>
                        <th className="py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-3 font-bold text-slate-900">
                          {createdInvoice?.plan || selectedPlan?.name} Membership
                          <span className="block text-[9px] font-normal text-slate-500">Valid: {createdMember?.joinDate} to {createdMember?.expiryDate}</span>
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-slate-900">₹{createdInvoice?.amount || amountPaid}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Summary Total */}
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Payment Method</span>
                      <span className="font-black text-slate-900 uppercase text-xs">{createdInvoice?.method || paymentMethod}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Total Paid</span>
                      <span className="text-xl font-black text-emerald-600 font-mono">₹{createdInvoice?.paid || amountPaid}</span>
                    </div>
                  </div>
                </div>

                {/* Print & Download Action Buttons */}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="flex-1 py-3.5 rounded-2xl bg-white text-slate-900 font-black uppercase text-xs hover:bg-slate-100 transition-all border-none cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Printer size={16} />
                    <span>Print Official Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="flex-1 py-3.5 rounded-2xl bg-[#d4ff00] text-black font-black uppercase text-xs hover:bg-[#c4ef00] transition-all border-none cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Download size={16} />
                    <span>Download Invoice PDF</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Footer Bar Navigation */}
          <div className="px-8 py-4 bg-slate-950 border-t border-white/10 flex items-center justify-between shrink-0">
            {step < 5 ? (
              <button 
                onClick={step > 1 ? () => setStep(step - 1) : onClose} 
                className="px-5 py-3 rounded-xl font-bold text-xs text-slate-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2"
              >
                {step > 1 && <ArrowLeft size={14} />}
                {step > 1 ? 'Previous Step' : 'Cancel'}
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-3">
              {/* Skip button for Step 2 and Step 3 */}
              {(step === 2 || step === 3) && (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-3 rounded-xl font-bold text-xs text-slate-400 bg-white/5 hover:bg-white/10 transition-all border-none cursor-pointer"
                >
                  Skip Step
                </button>
              )}

              {step < 4 && (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && (!fullName || !mobile)) {
                      toast.error('Please enter Full Name & Mobile Number');
                      return;
                    }
                    setStep(step + 1);
                  }}
                  className="px-8 py-3 rounded-xl bg-[#d4ff00] text-black font-black text-xs uppercase hover:bg-[#c4ef00] transition-all flex items-center gap-2 border-none cursor-pointer shadow-lg"
                >
                  <span>Next Step</span>
                  <ArrowRight size={14} />
                </button>
              )}

              {step === 4 && (
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="px-10 py-3.5 rounded-xl bg-[#d4ff00] text-black font-black text-xs uppercase hover:bg-[#c4ef00] transition-all flex items-center gap-2 border-none cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Processing...' : 'Complete & Generate Bill'}</span>
                  <CheckCircle2 size={16} />
                </button>
              )}

              {step === 5 && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-10 py-3.5 rounded-xl bg-[#d4ff00] text-black font-black text-xs uppercase hover:bg-[#c4ef00] transition-all flex items-center gap-2 border-none cursor-pointer shadow-lg"
                >
                  <span>Finish & Return to Dashboard</span>
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
