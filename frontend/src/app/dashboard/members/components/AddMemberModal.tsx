'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Phone, Mail, Calendar, Heart, Shield, Smartphone, 
  CheckCircle2, ArrowRight, ArrowLeft, CreditCard, DollarSign, 
  Printer, Download, Sparkles, Fingerprint, Banknote, Wallet, 
  ChevronRight, Dumbbell, Award, AlertCircle, FileText, Upload, Camera, Trash2, RefreshCw, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useGymStore } from '@/store';
import SmartPhotoCapture from '@/app/dashboard/components/SmartPhotoCapture';
import OfficialInvoiceReceipt from '@/app/dashboard/components/OfficialInvoiceReceipt';
import API from '@/services/api';
import { membershipEngine } from '@/lib/engines/membershipEngine';
import { z } from 'zod';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── ZOD SCHEMAS ───

const step1Schema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(80, 'Full name is too long'),
  mobile: z
    .string()
    .trim()
    .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'Enter a valid email address',
    }),
  membershipPackageId: z.string().min(1, 'Please select a membership package'),
  startDate: z.string().min(1, 'Please select a start date'),
});

const step2Schema = z.object({
  dob: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const d = new Date(val);
      return !isNaN(d.getTime()) && d <= new Date();
    }, { message: 'Date of birth cannot be in the future' }),
  weight: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, { message: 'Weight must be greater than 0' }),
  height: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, { message: 'Height must be greater than 0' }),
  emergencyContact: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return /^[0-9+\s-]{10,15}$/.test(val);
    }, { message: 'Enter a valid 10-15 digit phone number' }),
});

const MAX_PHOTO_SIZE_BYTES = 300 * 1024; // 300 KB

function deduplicatePackages(rawPlans: any[]) {
  const map = new Map<string, any>();
  rawPlans.forEach((p) => {
    const key = String(p.id || p.name || '').trim().toLowerCase();
    if (key && !map.has(key)) {
      map.set(key, p);
    }
  });
  return Array.from(map.values());
}

export default function AddMemberModal({ isOpen, onClose }: AddMemberModalProps) {
  const { plans, fetchPlans, addMember, fetchPayments, members } = useGymStore();

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Field Errors State
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Step 1: Basic Info & Package
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const rawPlans = plans && plans.length > 0 ? plans : [
    { id: 'p_mon', name: 'Monthly Standard', price: 2500, duration: '30 Days' },
    { id: 'p_qrt', name: 'Quarterly Prime', price: 6500, duration: '90 Days' },
    { id: 'p_semi', name: 'Semi-Annual Pro', price: 11500, duration: '180 Days' },
    { id: 'p_ann', name: 'Annual Premium', price: 18000, duration: '365 Days' },
  ];

  const activePlans = deduplicatePackages(rawPlans);
  const [selectedPlan, setSelectedPlan] = useState<any>(activePlans[0]);
  const [trainer, setTrainer] = useState('');

  // Step 2: Personal & Health
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [dob, setDob] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married'>('single');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [occupation, setOccupation] = useState('');

  // Step 3: Biometric Fingerprint Enrollment
  const [biometricId, setBiometricId] = useState('');
  const [enrollStatus, setEnrollStatus] = useState<'idle' | 'enrolling' | 'success' | 'failed'>('idle');
  const [enrollScanStep, setEnrollScanStep] = useState(0);
  const [enrollMsg, setEnrollMsg] = useState('');

  // Step 4: Billing & Payment Method
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [amountPaid, setAmountPaid] = useState('');

  // Step 5: Completed Invoice Data
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);
  const [createdMember, setCreatedMember] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

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

  // Check duplicate phone
  const duplicateMember = React.useMemo(() => {
    if (!mobile || mobile.trim().length < 10) return null;
    const rawDigits = mobile.replace(/\D/g, '').slice(-10);
    return members.find((m: any) => {
      const mDigits = String(m.phone || '').replace(/\D/g, '').slice(-10);
      return mDigits === rawDigits;
    });
  }, [mobile, members]);

  // Photo Upload Handler with 300KB Size Validation
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPhotoError('Only JPG, PNG, and WEBP formats are allowed.');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhotoError('File size must be less than 300 KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Step 1 Validation Trigger
  const validateStep1 = () => {
    const parseRes = step1Schema.safeParse({
      fullName,
      mobile,
      email,
      membershipPackageId: selectedPlan?.id || selectedPlan?.name || '',
      startDate,
    });

    if (!parseRes.success) {
      const errMap: Record<string, string> = {};
      parseRes.error.issues.forEach((issue) => {
        if (issue.path[0]) errMap[issue.path[0] as string] = issue.message;
      });
      setStep1Errors(errMap);
      return false;
    }

    setStep1Errors({});
    return true;
  };

  // Step 2 Validation Trigger
  const validateStep2 = () => {
    const parseRes = step2Schema.safeParse({
      dob,
      weight,
      height,
      emergencyContact,
    });

    if (!parseRes.success) {
      const errMap: Record<string, string> = {};
      parseRes.error.issues.forEach((issue) => {
        if (issue.path[0]) errMap[issue.path[0] as string] = issue.message;
      });
      setStep2Errors(errMap);
      return false;
    }

    setStep2Errors({});
    return true;
  };

  const handleNextStep = () => {
    setBackendError(null);
    if (step === 1) {
      if (!validateStep1()) {
        toast.error('Please fix errors highlighted in red');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) {
        toast.error('Please fix health details errors');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  // Trigger Machine Fingerprint Enrollment
  const handleStartBiometricEnrollment = async () => {
    setEnrollStatus('enrolling');
    setEnrollScanStep(1);
    setEnrollMsg(`Connecting to ESSL K90 Pro for User ID #${biometricId}...`);

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

  // Final Registration & Single Payment Transaction
  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setBackendError(null);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const memStartDate = startDate || todayStr;
      const planName = selectedPlan?.name || 'Monthly Standard';
      const expiryStr = membershipEngine.calculatePlanExpiryDate(planName, memStartDate, plans);
      const computedStatus = membershipEngine.calculateMembershipStatus(expiryStr, memStartDate);

      const basePrice = Number(selectedPlan?.price) || 2500;
      const disc = Number(discount) || 0;
      const finalBilled = Math.max(0, basePrice - disc);
      const paidAmt = Number(amountPaid) || finalBilled;

      const normalizedEmail = email ? email.trim().toLowerCase() : '';
      const normalizedPhone = mobile.replace(/\D/g, '').slice(-10);

      const memberPayload = {
        name: fullName.trim(),
        phone: normalizedPhone,
        email: normalizedEmail,
        photo: photoPreview || '',
        plan: planName,
        price: basePrice,
        originalAmount: basePrice,
        discountAmount: disc,
        discount: disc,
        netPayable: finalBilled,
        amount: finalBilled,
        amountPaid: paidAmt,
        paid: paidAmt,
        joinDate: todayStr,
        startDate: memStartDate,
        createdAt: new Date().toISOString(),
        expiryDate: expiryStr,
        status: computedStatus,
        paymentStatus: paidAmt >= finalBilled ? 'paid' : 'partial',
        totalBilled: finalBilled,
        totalPaid: paidAmt,
        biometricId: biometricId,
        deviceUserId: biometricId,
        trainer: trainer || 'Unassigned',
        isRealTimeToday: true,
        paymentMethod: paymentMethod,
        idempotencyKey: `add_mem_${normalizedPhone}_${planName.replace(/\s+/g, '_')}_${todayStr}`,
        age, height, weight, dob, maritalStatus, anniversaryDate, emergencyContact, occupation
      };

      const newMember: any = await addMember(memberPayload);

      fetchPayments();

      const createdInv = newMember?.invoice || {
        invoiceNumber: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
        plan: planName,
        amount: finalBilled,
        paid: paidAmt,
        discount: disc,
        method: paymentMethod,
        status: 'paid',
        date: todayStr
      };

      setCreatedMember(newMember || memberPayload);
      setCreatedInvoice(createdInv);
      setStep(5);
      toast.success(`Member registered & ₹${paidAmt} added to Today's Collection!`);
    } catch (err: any) {
      const errMsg = err.message || 'Failed to complete member registration. Please try again.';
      setBackendError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleAttemptClose = () => {
    if (step === 5) {
      onClose();
      return;
    }
    if (fullName || mobile || email || photoPreview) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={handleAttemptClose}
        />

        {/* Modal Window — Max 1050px, Max 90vh */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-[1050px] bg-white text-slate-900 rounded-[32px] shadow-2xl border border-slate-200 relative overflow-hidden flex flex-col h-[90vh] z-10 font-display text-left"
        >
          {/* Header Bar */}
          <div className="px-6 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-inner shrink-0">
                <User size={20} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight">New Member Onboarding</h2>
                <p className="text-xs text-blue-100 font-medium">Create a complete member profile, membership and biometric record.</p>
              </div>
            </div>

            <button 
              onClick={handleAttemptClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex items-center justify-center border-none cursor-pointer shrink-0"
              title="Close Onboarding"
            >
              <X size={18} />
            </button>
          </div>

          {/* Step Progress Bar Header */}
          <div className="px-6 sm:px-8 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0 select-none">
            <div className="flex items-center justify-between relative max-w-3xl mx-auto">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full z-0 overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-600" 
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
                const canClick = isDone || isCurrent;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      if (canClick && step !== 5) setStep(s.id);
                    }}
                    className={`relative z-10 flex flex-col items-center gap-1 bg-slate-50 px-2 sm:px-3 ${canClick ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs transition-all ${
                      isDone ? 'bg-emerald-600 text-white shadow-sm' :
                      isCurrent ? 'bg-blue-600 text-white shadow-md scale-110' :
                      'bg-slate-200 text-slate-500'
                    }`}>
                      {isDone ? <CheckCircle2 size={16} /> : s.id}
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${isCurrent ? 'text-blue-700 font-black' : isDone ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Backend Error Banner */}
          {backendError && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{backendError}</span>
            </div>
          )}

          {/* Form Content Area (Scrollable Only) */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-white" ref={formTopRef}>

            {/* STEP 1: Profile & Package */}
            {step === 1 && (
              <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                
                {/* 2-COLUMN LAYOUT: Left Photo (1/3), Right Form (2/3) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                  
                  {/* LEFT COLUMN: Profile Photo */}
                  <div className="md:col-span-1 bg-slate-50 p-6 rounded-3xl border border-slate-200/80 flex flex-col items-center text-center space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Profile Photo</span>

                    <div className="w-32 h-32 rounded-full bg-white border-4 border-slate-200 shadow-md overflow-hidden flex flex-col items-center justify-center relative group">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Member preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-slate-400">
                          <User size={48} />
                          <span className="text-[10px] font-bold mt-1">No Photo</span>
                        </div>
                      )}
                    </div>

                    <input 
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-col gap-2 w-full">
                      {!photoPreview ? (
                        <>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs border-none cursor-pointer"
                          >
                            <Upload size={14} /> Upload Photo
                          </button>
                          <SmartPhotoCapture 
                            value={photoPreview || undefined}
                            onCaptureComplete={(urls) => {
                              setPhotoPreview(urls.photoURL);
                              setPhotoError(null);
                            }}
                            label="Camera Capture"
                          />
                        </>
                      ) : (
                        <div className="flex gap-2 w-full">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black transition-all border-none cursor-pointer flex items-center justify-center gap-1"
                          >
                            <RefreshCw size={12} /> Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoPreview(null);
                              setPhotoError(null);
                            }}
                            className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-black transition-all border-none cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] font-bold text-slate-400 leading-tight">
                      Supported: JPG, PNG, WEBP<br />Maximum file size: 300 KB
                    </p>

                    {photoError && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center justify-center gap-1 bg-red-50 p-2 rounded-xl border border-red-200 w-full">
                        <AlertCircle size={12} /> {photoError}
                      </p>
                    )}
                  </div>

                  {/* RIGHT COLUMN: Contact Details & Package */}
                  <div className="md:col-span-2 space-y-4">
                    
                    {/* Full Name */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Full Name *</label>
                      <input 
                        type="text" 
                        value={fullName} 
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (step1Errors.fullName) setStep1Errors(prev => ({ ...prev, fullName: '' }));
                        }}
                        placeholder="Rahul Sharma"
                        className={`w-full h-11 bg-slate-50 border rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none transition-all ${
                          step1Errors.fullName ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-blue-600 focus:bg-white'
                        }`}
                      />
                      {step1Errors.fullName && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {step1Errors.fullName}
                        </p>
                      )}
                    </div>

                    {/* Mobile Number + Duplicate Warning */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Mobile Number *</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 font-mono font-black text-xs text-slate-500 border-r border-slate-300 pr-2 pointer-events-none">
                            +91
                          </span>
                          <input 
                            type="tel" 
                            value={mobile} 
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                              setMobile(val);
                              if (step1Errors.mobile) setStep1Errors(prev => ({ ...prev, mobile: '' }));
                            }}
                            placeholder="9876543210"
                            className={`w-full h-11 pl-14 bg-slate-50 border rounded-xl pr-3 text-xs font-mono font-black text-slate-900 focus:outline-none transition-all ${
                              step1Errors.mobile ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-blue-600 focus:bg-white'
                            }`}
                          />
                        </div>
                        {step1Errors.mobile ? (
                          <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle size={11} /> {step1Errors.mobile}
                          </p>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 mt-1 block">10 digits required</span>
                        )}

                        {duplicateMember && (
                          <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[10px] font-bold flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1">
                              <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                              <span>Member already exists with this phone!</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Email Address */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Email Address (Optional)</label>
                        <input 
                          type="email" 
                          value={email} 
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (step1Errors.email) setStep1Errors(prev => ({ ...prev, email: '' }));
                          }}
                          placeholder="rahul@example.com"
                          className={`w-full h-11 bg-slate-50 border rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none transition-all ${
                            step1Errors.email ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-blue-600 focus:bg-white'
                          }`}
                        />
                        {step1Errors.email && (
                          <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle size={11} /> {step1Errors.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Deduplicated Membership Package Cards */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Select Membership Package *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activePlans.map((p: any) => {
                          const isSelected = selectedPlan?.name === p.name || selectedPlan?.id === p.id;
                          return (
                            <div 
                              key={p.id || p.name}
                              onClick={() => {
                                setSelectedPlan(p);
                                if (step1Errors.membershipPackageId) setStep1Errors(prev => ({ ...prev, membershipPackageId: '' }));
                              }}
                              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                                isSelected 
                                  ? 'bg-blue-50/90 border-blue-600 text-blue-900 shadow-md ring-2 ring-blue-600/20' 
                                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-black uppercase">{p.name}</span>
                                <span className="text-xs font-mono font-black text-blue-700">₹{(p.price || 0).toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-[10px] text-slate-500 font-bold">{p.duration || '30 Days'} Validity</span>
                                {isSelected && (
                                  <span className="text-[9px] font-black uppercase bg-blue-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                    ✓ Selected
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {step1Errors.membershipPackageId && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {step1Errors.membershipPackageId}
                        </p>
                      )}
                    </div>

                    {/* Start Date & Trainer */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Membership Start Date *</label>
                        <input 
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Personal Trainer (Optional)</label>
                        <select 
                          value={trainer} 
                          onChange={(e) => setTrainer(e.target.value)}
                          className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all cursor-pointer"
                        >
                          <option value="">No PT Assigned</option>
                          <option value="Karan Verma">Karan Verma (Master Coach)</option>
                          <option value="Sneha Kapoor">Sneha Kapoor (Fitness Trainer)</option>
                        </select>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Personal & Physical Health Details */}
            {step === 2 && (
              <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <div className="text-center mb-4">
                  <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-extrabold uppercase tracking-widest rounded-full inline-block mb-1">
                    Optional Details
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Personal & Physical Health Details</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Fill physical metrics for workout & diet customization, or click Next Step</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Age (Years)</label>
                      <input 
                        type="number" 
                        value={age} 
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 25"
                        className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Height (cm)</label>
                      <input 
                        type="text" 
                        value={height} 
                        onChange={(e) => {
                          setHeight(e.target.value);
                          if (step2Errors.height) setStep2Errors(prev => ({ ...prev, height: '' }));
                        }}
                        placeholder="e.g. 175"
                        className={`w-full h-11 bg-white border rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none ${step2Errors.height ? 'border-red-500' : 'border-slate-300 focus:border-blue-600'}`}
                      />
                      {step2Errors.height && <p className="text-[10px] font-bold text-red-500 mt-1">{step2Errors.height}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Weight (kg)</label>
                      <input 
                        type="text" 
                        value={weight} 
                        onChange={(e) => {
                          setWeight(e.target.value);
                          if (step2Errors.weight) setStep2Errors(prev => ({ ...prev, weight: '' }));
                        }}
                        placeholder="e.g. 70"
                        className={`w-full h-11 bg-white border rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none ${step2Errors.weight ? 'border-red-500' : 'border-slate-300 focus:border-blue-600'}`}
                      />
                      {step2Errors.weight && <p className="text-[10px] font-bold text-red-500 mt-1">{step2Errors.weight}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Date of Birth (DOB)</label>
                      <input 
                        type="date" 
                        value={dob} 
                        onChange={(e) => {
                          setDob(e.target.value);
                          if (step2Errors.dob) setStep2Errors(prev => ({ ...prev, dob: '' }));
                        }}
                        className={`w-full h-11 bg-white border rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer ${step2Errors.dob ? 'border-red-500' : 'border-slate-300 focus:border-blue-600'}`}
                      />
                      {step2Errors.dob && <p className="text-[10px] font-bold text-red-500 mt-1">{step2Errors.dob}</p>}
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Marital Status</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setMaritalStatus('single')}
                          className={`h-11 rounded-xl text-xs font-extrabold uppercase transition-all border-none cursor-pointer ${
                            maritalStatus === 'single' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Single
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaritalStatus('married')}
                          className={`h-11 rounded-xl text-xs font-extrabold uppercase transition-all border-none cursor-pointer ${
                            maritalStatus === 'married' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Married
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Emergency Contact</label>
                      <input 
                        type="tel" 
                        value={emergencyContact} 
                        onChange={(e) => {
                          setEmergencyContact(e.target.value);
                          if (step2Errors.emergencyContact) setStep2Errors(prev => ({ ...prev, emergencyContact: '' }));
                        }}
                        placeholder="e.g. 9876543210"
                        className={`w-full h-11 bg-white border rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none ${step2Errors.emergencyContact ? 'border-red-500' : 'border-slate-300 focus:border-blue-600'}`}
                      />
                      {step2Errors.emergencyContact && <p className="text-[10px] font-bold text-red-500 mt-1">{step2Errors.emergencyContact}</p>}
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Occupation</label>
                      <input 
                        type="text" 
                        value={occupation} 
                        onChange={(e) => setOccupation(e.target.value)}
                        placeholder="e.g. Software Engineer"
                        className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Biometric Fingerprint Enrollment */}
            {step === 3 && (
              <div className="max-w-xl mx-auto space-y-6 text-center animate-fade-in">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">ESSL Biometric Hardware Registration</h3>
                  <p className="text-xs text-slate-500 mt-1">Assign Biometric ID & Trigger machine fingerprint enrollment</p>
                </div>

                <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6">
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                      <Fingerprint size={36} className={enrollStatus === 'enrolling' ? 'animate-pulse text-blue-600' : ''} />
                    </div>
                    <div className="text-left">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Assigned Biometric ID</label>
                      <input 
                        type="text" 
                        value={biometricId} 
                        onChange={(e) => setBiometricId(e.target.value)}
                        className="h-10 w-32 bg-white border border-blue-500 rounded-xl px-3 font-mono font-black text-lg text-blue-700 focus:outline-none shadow-sm"
                      />
                    </div>
                  </div>

                  {enrollStatus === 'idle' && (
                    <button
                      type="button"
                      onClick={handleStartBiometricEnrollment}
                      className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-extrabold uppercase text-xs shadow-md hover:bg-blue-700 transition-all border-none cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Fingerprint size={18} />
                      <span>Start Machine Fingerprint Registration</span>
                    </button>
                  )}

                  {enrollStatus === 'enrolling' && (
                    <div className="space-y-4 p-5 bg-white rounded-2xl border border-slate-200 text-center shadow-sm">
                      <div className="text-xs font-extrabold text-blue-600 animate-pulse leading-relaxed">
                        {enrollMsg}
                      </div>
                      
                      <div className="flex justify-center gap-3">
                        {[1, 2, 3].map(s => (
                          <div 
                            key={s} 
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${
                              enrollScanStep >= s ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-slate-100 text-slate-400'
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
                          className="w-full py-3 rounded-xl bg-emerald-600 text-white font-extrabold uppercase text-xs hover:bg-emerald-700 transition-all border-none cursor-pointer flex items-center justify-center gap-2 shadow-md"
                        >
                          <CheckCircle2 size={16} />
                          <span>Confirm Scans Completed on Machine</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {enrollStatus === 'success' && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-black flex items-center justify-center gap-2">
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
                <div className="text-center mb-4">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Payment & Billing Summary</h3>
                  <p className="text-xs text-slate-500 mt-1">Select payment method & enter collected amount for Today's Collection ledger</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-5">
                  <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Package Billed</span>
                      <span className="text-xs font-black text-slate-900">{selectedPlan?.name || 'Monthly Standard'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Plan Amount</span>
                      <span className="text-sm font-black font-mono text-blue-700">₹{(selectedPlan?.price || 2500).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Start Date *</label>
                      <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Discount (₹)</label>
                      <input 
                        type="number" 
                        value={discount} 
                        onChange={(e) => setDiscount(e.target.value)}
                        placeholder="0"
                        className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Collected Now (₹) *</label>
                      <input 
                        type="number" 
                        value={amountPaid} 
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="w-full h-11 bg-white border border-blue-500 rounded-xl px-3 text-xs font-mono font-black text-blue-700 focus:outline-none shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Payment Method *</label>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { key: 'UPI', label: 'UPI / QR', icon: Smartphone, color: 'border-purple-600 bg-purple-50 text-purple-700 font-extrabold shadow-sm' },
                        { key: 'Cash', label: 'Cash', icon: Banknote, color: 'border-emerald-600 bg-emerald-50 text-emerald-700 font-extrabold shadow-sm' },
                        { key: 'Card', label: 'Card', icon: CreditCard, color: 'border-blue-600 bg-blue-50 text-blue-700 font-extrabold shadow-sm' },
                        { key: 'NetBanking', label: 'Net Bank', icon: Wallet, color: 'border-amber-600 bg-amber-50 text-amber-700 font-extrabold shadow-sm' },
                      ].map((m) => {
                        const isSelected = paymentMethod === m.key;
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => setPaymentMethod(m.key as any)}
                            className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all border-none cursor-pointer ${
                              isSelected 
                                ? `${m.color}` 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <m.icon size={18} />
                            <span className="text-[10px] uppercase font-extrabold">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Official Invoice & Printable Receipt */}
            {step === 5 && (
              <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                <div className="text-center mb-4">
                  <span className="px-3.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase tracking-widest rounded-full inline-block mb-2">
                    Registration Completed! 🎉
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Official Tax Invoice &amp; Payment Receipt</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Invoice registered in Today's Collection. Print or download PDF below.</p>
                </div>

                {/* Universal Official Invoice Template */}
                <OfficialInvoiceReceipt 
                  invoice={createdInvoice} 
                  member={createdMember || {
                    memberId: biometricId,
                    biometricId: biometricId,
                    name: fullName,
                    phone: mobile,
                    email: email,
                    plan: selectedPlan?.name,
                    joinDate: new Date().toISOString().split('T')[0],
                    expiryDate: new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0],
                    totalBilled: amountPaid,
                    totalPaid: amountPaid,
                    paymentMethod: paymentMethod
                  }} 
                />

                {/* Print & Download Action Buttons */}
                <div className="flex gap-4 max-w-[800px] mx-auto">
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-900 font-extrabold uppercase text-xs hover:bg-slate-200 transition-all border-none cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Printer size={16} />
                    <span>Print Official Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-extrabold uppercase text-xs hover:bg-blue-700 transition-all border-none cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    <Download size={16} />
                    <span>Download Invoice PDF</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Footer Bar Navigation (Fixed Bottom) */}
          <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            {step < 5 ? (
              <button 
                type="button"
                onClick={step > 1 ? () => setStep(step - 1) : handleAttemptClose} 
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-900 transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2"
              >
                {step > 1 && <ArrowLeft size={14} />}
                {step > 1 ? 'Previous Step' : 'Cancel'}
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-3">
              {/* Skip button for Step 2 */}
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-700 bg-slate-200 hover:bg-slate-300 transition-all border-none cursor-pointer"
                >
                  Skip Health Details
                </button>
              )}

              {step < 4 && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-7 py-2.5 rounded-xl bg-blue-600 text-white font-extrabold text-xs uppercase hover:bg-blue-700 transition-all flex items-center gap-2 border-none cursor-pointer shadow-md active:scale-95"
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
                  className="px-8 py-3 rounded-xl bg-blue-600 text-white font-extrabold text-xs uppercase hover:bg-blue-700 transition-all flex items-center gap-2 border-none cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
                >
                  <span>{isSubmitting ? 'Registering Member... ⏳' : 'Complete & Generate Bill'}</span>
                  <CheckCircle2 size={16} />
                </button>
              )}

              {step === 5 && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 rounded-xl bg-blue-600 text-white font-extrabold text-xs uppercase hover:bg-blue-700 transition-all flex items-center gap-2 border-none cursor-pointer shadow-md"
                >
                  <span>Finish & Return to Dashboard</span>
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* DISCARD CONFIRMATION DIALOG */}
        <AnimatePresence>
          {showDiscardConfirm && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowDiscardConfirm(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-w-sm w-full z-10 text-center space-y-4 font-display">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Discard Member Registration?</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">You have unsaved member information. Are you sure you want to exit without registering?</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowDiscardConfirm(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black hover:bg-slate-200 transition-all border-none cursor-pointer">
                    Continue Editing
                  </button>
                  <button onClick={() => { setShowDiscardConfirm(false); onClose(); }} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-all border-none cursor-pointer shadow-sm">
                    Discard
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AnimatePresence>
  );
}
