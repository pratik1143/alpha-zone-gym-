'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, addDoc } from 'firebase/firestore';
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
  maritalStatus: z.string().optional(),
  anniversaryDate: z.string().optional(),
}).refine((data) => {
  if (data.maritalStatus === 'married') {
    return !!data.anniversaryDate && data.anniversaryDate.trim().length > 0;
  }
  return true;
}, {
  message: 'Anniversary Date is required when Married',
  path: ['anniversaryDate'],
});

const ptStepSchema = z.object({
  ptAmount: z.number().min(0, 'PT amount cannot be negative'),
  ptDiscount: z.number().min(0, 'Discount cannot be negative'),
  ptTax: z.number().min(0, 'Tax cannot be negative'),
  ptStartDate: z.string().min(1, 'Please select PT start date'),
  ptExpiryDate: z.string().min(1, 'Please select PT expiry date'),
}).refine((data) => {
  if (!data.ptStartDate || !data.ptExpiryDate) return true;
  return new Date(data.ptExpiryDate) >= new Date(data.ptStartDate);
}, {
  message: 'PT Expiry Date cannot be before Start Date',
  path: ['ptExpiryDate'],
});

const MAX_PHOTO_SIZE_BYTES = 300 * 1024; // 300 KB

function deduplicatePackages(rawPlans: any[]) {
  const map = new Map<string, any>();
  rawPlans.forEach((p) => {
    const name = String(p.name || '').trim().toLowerCase();
    const duration = String(p.duration || '').trim().toLowerCase();
    const key = `${name}_${duration}`;
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
  const [ptErrors, setPtErrors] = useState<Record<string, string>>({});
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Step 1: Basic Info & Package
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const rawPlans = plans && plans.length > 0 ? plans : [
    { id: 'p_mon', name: '1 MONTH', price: 3000, duration: '30 Days' },
    { id: 'p_qrt', name: '3 MONTHS', price: 6500, duration: '90 Days' },
    { id: 'p_semi', name: '6 MONTHS', price: 9500, duration: '180 Days' },
    { id: 'p_ann', name: 'ANNUAL PREMIUM', price: 14000, duration: '365 Days' },
  ];

  const activePlans = deduplicatePackages(rawPlans);
  const [selectedPlan, setSelectedPlan] = useState<any>(activePlans[0]);

  // Real Employees Query for Trainer Selection (NO FAKE / SAMPLE TRAINERS)
  const [trainersList, setTrainersList] = useState<any[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const qEmp = query(collection(db, 'employees'));
    const unsub = onSnapshot(qEmp, (snap) => {
      if (!snap.empty) {
        const rawEmps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const trns = rawEmps.filter((e: any) => {
          const r = String(e.role || e.type || '').toLowerCase();
          const isTrn = r.includes('trainer') || r.includes('coach') || e.isTrainer;
          const status = String(e.status || 'ACTIVE').toUpperCase();
          const isActive = status === 'ACTIVE' || status === 'EMPLOYED';
          return isTrn && isActive;
        });

        // Deduplication priority: 1. employee document ID, 2. employeeId/biometricId, 3. phone/email
        const map = new Map<string, any>();
        trns.forEach((t: any) => {
          const key = (t.id && String(t.id).trim())
            ? String(t.id).trim()
            : (t.employeeId && String(t.employeeId).trim())
            ? String(t.employeeId).trim()
            : (t.phone && String(t.phone).replace(/\D/g, '').length >= 8)
            ? String(t.phone).replace(/\D/g, '').slice(-10)
            : String(t.email || '').trim().toLowerCase();

          if (key && !map.has(key)) map.set(key, t);
        });
        setTrainersList(Array.from(map.values()));
      } else {
        setTrainersList([]);
      }
    }, (err) => {
      console.warn("Employees query listener notice in AddMemberModal:", err);
    });

    return () => unsub();
  }, [isOpen]);

  const selectedTrainerObj = useMemo(() => {
    if (!selectedTrainerId) return null;
    return trainersList.find(t => String(t.id || t.employeeId) === String(selectedTrainerId)) || null;
  }, [selectedTrainerId, trainersList]);

  const hasPt = Boolean(selectedTrainerId);

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

  // Step 4: Membership Billing & Payment Method
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [amountPaid, setAmountPaid] = useState('');

  // Step 5 (If PT Selected): PT Billing Details
  const [ptDuration, setPtDuration] = useState('3 Months');
  const [ptAmount, setPtAmount] = useState('6000');
  const [ptDiscount, setPtDiscount] = useState('0');
  const [ptTax, setPtTax] = useState('0');
  const [ptPaymentMethod, setPtPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [ptPaymentStatus, setPtPaymentStatus] = useState<'paid' | 'partial' | 'pending'>('paid');
  const [ptStartDate, setPtStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [ptExpiryDate, setPtExpiryDate] = useState('');
  const [ptAmountPaid, setPtAmountPaid] = useState('6000');

  // Auto-calculate PT Expiry Date based on PT Duration & PT Start Date
  useEffect(() => {
    if (!ptStartDate) return;
    const start = new Date(ptStartDate);
    if (isNaN(start.getTime())) return;

    const expiry = new Date(start);
    if (ptDuration === '1 Month') {
      expiry.setMonth(expiry.getMonth() + 1);
      expiry.setDate(expiry.getDate() - 1);
    } else if (ptDuration === '3 Months') {
      expiry.setMonth(expiry.getMonth() + 3);
      expiry.setDate(expiry.getDate() - 1);
    } else if (ptDuration === '6 Months') {
      expiry.setMonth(expiry.getMonth() + 6);
      expiry.setDate(expiry.getDate() - 1);
    } else if (ptDuration === '12 Months') {
      expiry.setFullYear(expiry.getFullYear() + 1);
      expiry.setDate(expiry.getDate() - 1);
    }
    setPtExpiryDate(expiry.toISOString().split('T')[0]);
  }, [ptStartDate, ptDuration]);

  // Update default PT price when duration changes
  useEffect(() => {
    let base = 6000;
    if (ptDuration === '1 Month') base = 2500;
    else if (ptDuration === '3 Months') base = 6000;
    else if (ptDuration === '6 Months') base = 11000;
    else if (ptDuration === '12 Months') base = 20000;
    setPtAmount(base.toString());
    const disc = Number(ptDiscount) || 0;
    const tax = Number(ptTax) || 0;
    const net = Math.max(0, base - disc + tax);
    setPtAmountPaid(net.toString());
  }, [ptDuration]);

  // Update PT Amount Paid when amount, discount, or tax changes
  useEffect(() => {
    const amt = Number(ptAmount) || 0;
    const disc = Number(ptDiscount) || 0;
    const tax = Number(ptTax) || 0;
    const net = Math.max(0, amt - disc + tax);
    setPtAmountPaid(net.toString());
  }, [ptAmount, ptDiscount, ptTax]);

  // Final Completed Invoices
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);
  const [createdPtInvoice, setCreatedPtInvoice] = useState<any | null>(null);
  const [createdMember, setCreatedMember] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Update Membership amount paid when plan or discount changes
  useEffect(() => {
    if (selectedPlan) {
      const basePrice = Number(selectedPlan.price) || 2500;
      const disc = Number(discount) || 0;
      const finalAmt = Math.max(0, basePrice - disc);
      setAmountPaid(finalAmt.toString());
    }
  }, [selectedPlan, discount]);

  // Check duplicate phone
  const duplicateMember = useMemo(() => {
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
      maritalStatus,
      anniversaryDate,
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

  // Validate PT Billing Step
  const validatePtStep = () => {
    const amtNum = Number(ptAmount) || 0;
    const discNum = Number(ptDiscount) || 0;
    const taxNum = Number(ptTax) || 0;

    const parseRes = ptStepSchema.safeParse({
      ptAmount: amtNum,
      ptDiscount: discNum,
      ptTax: taxNum,
      ptStartDate,
      ptExpiryDate,
    });

    if (!parseRes.success) {
      const errMap: Record<string, string> = {};
      parseRes.error.issues.forEach((issue) => {
        if (issue.path[0]) errMap[issue.path[0] as string] = issue.message;
      });
      setPtErrors(errMap);
      return false;
    }

    setPtErrors({});
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
    } else if (step === 4) {
      if (hasPt) {
        setStep(5); // Proceed to PT Billing Step
      } else {
        handleFinalSubmit(); // Proceed directly to finish
      }
    } else if (step === 5 && hasPt) {
      if (!validatePtStep()) {
        toast.error('Please fix PT billing errors');
        return;
      }
      handleFinalSubmit(); // Finish registration with Gym + PT bills
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

  // Final Registration & Dual Payment Transaction Creation
  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setBackendError(null);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const memStartDate = startDate || todayStr;
      const planName = selectedPlan?.name || '1 MONTH';
      const expiryStr = membershipEngine.calculatePlanExpiryDate(planName, memStartDate, plans);
      const computedStatus = membershipEngine.calculateMembershipStatus(expiryStr, memStartDate);

      const basePrice = Number(selectedPlan?.price) || 3000;
      const disc = Number(discount) || 0;
      const finalBilled = Math.max(0, basePrice - disc);
      const paidAmt = Number(amountPaid) || finalBilled;

      const normalizedEmail = email ? email.trim().toLowerCase() : '';
      const normalizedPhone = mobile.replace(/\D/g, '').slice(-10);

      const memInvoiceNo = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      const ptInvoiceNo = `INV-PT-${Math.floor(100000 + Math.random() * 900000)}`;
      const onboardingUuid = `add_mem_${normalizedPhone}_${todayStr}_${Math.floor(1000 + Math.random() * 9000)}`;

      const trnName = selectedTrainerObj?.name || (selectedTrainerId ? 'Assigned Trainer' : 'Unassigned');

      // Member Payload
      const memberPayload: any = {
        name: fullName.trim(),
        phone: normalizedPhone,
        email: normalizedEmail,
        photo: photoPreview || '',
        plan: planName,
        price: basePrice,
        originalAmount: basePrice,
        packagePrice: basePrice,
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
        trainerId: selectedTrainerId || 'null',
        trainer: trnName,
        trainerName: trnName,
        isRealTimeToday: true,
        paymentMethod: paymentMethod,
        idempotencyKey: onboardingUuid,
        invoiceNumber: memInvoiceNo,
        age, height, weight, dob, maritalStatus,
        anniversaryDate: maritalStatus === 'married' ? anniversaryDate : null,
        emergencyContact, occupation
      };

      // Attach PT billing details if trainer is selected
      if (hasPt && selectedTrainerObj) {
        const amtNum = Number(ptAmount) || 6000;
        const discNum = Number(ptDiscount) || 0;
        const taxNum = Number(ptTax) || 0;
        const netNum = Math.max(0, amtNum - discNum + taxNum);
        const pAmtPaid = Number(ptAmountPaid) || netNum;

        memberPayload.ptBilling = {
          enabled: true,
          trainerId: selectedTrainerObj.id || selectedTrainerObj.employeeId,
          trainerName: selectedTrainerObj.name,
          trainerRole: selectedTrainerObj.role || 'Personal Trainer',
          packageName: `Personal Training (${ptDuration})`,
          duration: ptDuration,
          originalAmount: amtNum,
          packagePrice: amtNum,
          discountAmount: discNum,
          discount: discNum,
          taxAmount: taxNum,
          netPayable: netNum,
          amount: netNum,
          amountPaid: pAmtPaid,
          paid: pAmtPaid,
          paymentMethod: ptPaymentMethod,
          startDate: ptStartDate,
          expiryDate: ptExpiryDate,
          invoiceNo: ptInvoiceNo,
          status: 'ACTIVE'
        };

        memberPayload.pt = {
          enabled: true,
          trainerId: selectedTrainerObj.id || selectedTrainerObj.employeeId,
          trainerName: selectedTrainerObj.name,
          trainerRole: selectedTrainerObj.role || 'Personal Trainer',
          trainerAvatar: selectedTrainerObj.photo || selectedTrainerObj.avatarUrl || '',
          packageName: ptDuration,
          duration: ptDuration,
          amount: netNum,
          startDate: ptStartDate,
          expiryDate: ptExpiryDate,
          invoiceNo: ptInvoiceNo,
          status: 'ACTIVE'
        };
      }

      // Add Member via Store (backend createMember handles creation of member + 1 membership invoice + optional 1 PT invoice)
      const resData: any = await addMember(memberPayload);

      const createdMem = resData || memberPayload;
      const memInv = resData?.invoice || {
        invoiceNumber: memInvoiceNo,
        invoiceType: 'MEMBERSHIP',
        billingType: 'MEMBERSHIP',
        packageName: planName,
        plan: planName,
        originalAmount: basePrice,
        packagePrice: basePrice,
        discountAmount: disc,
        discount: disc,
        netPayable: finalBilled,
        amount: finalBilled,
        amountPaid: paidAmt,
        paid: paidAmt,
        pendingAmount: Math.max(0, finalBilled - paidAmt),
        method: paymentMethod,
        paymentMethod: paymentMethod,
        status: paidAmt >= finalBilled ? 'paid' : 'partial',
        date: todayStr,
        startDate: memStartDate,
        expiryDate: expiryStr
      };

      setCreatedMember(createdMem);
      setCreatedInvoice(memInv);

      if (hasPt && selectedTrainerObj) {
        const amtNum = Number(ptAmount) || 6000;
        const discNum = Number(ptDiscount) || 0;
        const taxNum = Number(ptTax) || 0;
        const netNum = Math.max(0, amtNum - discNum + taxNum);
        const pAmtPaid = Number(ptAmountPaid) || netNum;

        const ptInv = resData?.ptInvoice || {
          invoiceNumber: memberPayload.ptBilling?.invoiceNo || ptInvoiceNo,
          invoiceType: 'PT',
          billingType: 'PT',
          packageName: `Personal Training (${ptDuration})`,
          plan: `Personal Training (${ptDuration})`,
          trainerName: selectedTrainerObj.name,
          originalAmount: amtNum,
          packagePrice: amtNum,
          discountAmount: discNum,
          discount: discNum,
          netPayable: netNum,
          amount: netNum,
          amountPaid: pAmtPaid,
          paid: pAmtPaid,
          pendingAmount: Math.max(0, netNum - pAmtPaid),
          method: ptPaymentMethod,
          paymentMethod: ptPaymentMethod,
          status: (netNum - pAmtPaid) <= 0 ? 'paid' : 'partial',
          date: todayStr,
          startDate: ptStartDate,
          expiryDate: ptExpiryDate
        };
        setCreatedPtInvoice(ptInv);
      }

      setStep(hasPt ? 6 : 5);
      toast.success('Member created successfully');
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
    const finalStepIndex = hasPt ? 6 : 5;
    if (step === finalStepIndex) {
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

  const totalStepCount = hasPt ? 6 : 5;

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
                  animate={{ width: `${((step - 1) / (totalStepCount - 1)) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              {[
                { s: 1, l: 'PROFILE & PLAN' },
                { s: 2, l: 'HEALTH & PERSONAL' },
                { s: 3, l: 'BIOMETRICS' },
                { s: 4, l: 'MEMBERSHIP PAYMENT' },
                ...(hasPt ? [{ s: 5, l: 'PT BILLING' }, { s: 6, l: 'INVOICE & PRINT' }] : [{ s: 5, l: 'INVOICE & PRINT' }])
              ].map((st) => (
                <div key={st.s} className="relative z-10 flex flex-col items-center">
                  <div 
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      step >= st.s 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                        : 'bg-white border-2 border-slate-300 text-slate-400'
                    }`}
                  >
                    {st.s}
                  </div>
                  <span className={`text-[8px] sm:text-[9px] font-black tracking-wider uppercase mt-1 hidden sm:block ${step >= st.s ? 'text-blue-700' : 'text-slate-400'}`}>
                    {st.l}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8">
            
            {/* STEP 1: Basic Info & Membership Package */}
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

                    {/* Start Date & Real Trainer Dropdown */}
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
                          value={selectedTrainerId} 
                          onChange={(e) => setSelectedTrainerId(e.target.value)}
                          className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all cursor-pointer"
                        >
                          <option value="">No PT Assigned</option>
                          {trainersList.length === 0 ? (
                            <option value="" disabled>No trainers available</option>
                          ) : (
                            trainersList.map((t: any) => (
                              <option key={t.id || t.employeeId} value={t.id || t.employeeId}>
                                {t.name} ({t.employeeId || 'EMP-TRN'}) — {t.role || 'Trainer'}
                              </option>
                            ))
                          )}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Date of Birth</label>
                    <input 
                      type="date" 
                      value={dob} 
                      onChange={(e) => {
                        setDob(e.target.value);
                        if (step2Errors.dob) setStep2Errors(prev => ({ ...prev, dob: '' }));
                      }}
                      className={`w-full h-11 bg-slate-50 border rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none transition-all cursor-pointer ${
                        step2Errors.dob ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-blue-600'
                      }`}
                    />
                    {step2Errors.dob && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> {step2Errors.dob}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Occupation</label>
                    <input 
                      type="text" 
                      value={occupation} 
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="e.g. Software Engineer, Doctor"
                      className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Body Weight (kg)</label>
                    <input 
                      type="number" 
                      value={weight} 
                      onChange={(e) => {
                        setWeight(e.target.value);
                        if (step2Errors.weight) setStep2Errors(prev => ({ ...prev, weight: '' }));
                      }}
                      placeholder="72"
                      className={`w-full h-11 bg-slate-50 border rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none transition-all ${
                        step2Errors.weight ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-blue-600'
                      }`}
                    />
                    {step2Errors.weight && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> {step2Errors.weight}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Height (cm)</label>
                    <input 
                      type="number" 
                      value={height} 
                      onChange={(e) => {
                        setHeight(e.target.value);
                        if (step2Errors.height) setStep2Errors(prev => ({ ...prev, height: '' }));
                      }}
                      placeholder="175"
                      className={`w-full h-11 bg-slate-50 border rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none transition-all ${
                        step2Errors.height ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-blue-600'
                      }`}
                    />
                    {step2Errors.height && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> {step2Errors.height}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Emergency Contact Phone</label>
                    <input 
                      type="tel" 
                      value={emergencyContact} 
                      onChange={(e) => {
                        setEmergencyContact(e.target.value);
                        if (step2Errors.emergencyContact) setStep2Errors(prev => ({ ...prev, emergencyContact: '' }));
                      }}
                      placeholder="9876543210"
                      className={`w-full h-11 bg-slate-50 border rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none transition-all ${
                        step2Errors.emergencyContact ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-blue-600'
                      }`}
                    />
                    {step2Errors.emergencyContact && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> {step2Errors.emergencyContact}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Marital Status</label>
                    <select 
                      value={maritalStatus} 
                      onChange={(e) => setMaritalStatus(e.target.value as any)}
                      className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
                    >
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Biometric Fingerprint Enrollment */}
            {step === 3 && (
              <div className="max-w-xl mx-auto space-y-6 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-md">
                  <Fingerprint size={32} />
                </div>

                <div>
                  <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-extrabold uppercase tracking-widest rounded-full inline-block mb-1">
                    ESSL Hardware Integration
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Biometric Gate ID Enrollment</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Assign a unique numeric Biometric User ID for physical ESSL K90 Pro / Access Control Gate scanners
                  </p>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">Biometric User ID:</span>
                    <input 
                      type="number"
                      value={biometricId}
                      onChange={(e) => setBiometricId(e.target.value)}
                      className="w-32 h-11 bg-white border border-slate-300 rounded-xl text-center font-mono text-base font-black text-blue-700 focus:outline-none focus:border-blue-600 shadow-xs"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium">
                    This ID will be synced with local ESSL attendance software listener.
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleStartBiometricEnrollment}
                      disabled={enrollStatus === 'enrolling'}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black transition-all shadow-md border-none cursor-pointer inline-flex items-center gap-2"
                    >
                      <Fingerprint size={16} />
                      <span>{enrollStatus === 'enrolling' ? 'Connecting Scanner...' : 'Trigger ESSL Terminal Enrollment'}</span>
                    </button>
                  </div>

                  {enrollMsg && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-800 text-xs font-bold animate-pulse">
                      {enrollMsg}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Membership Payment */}
            {step === 4 && (
              <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
                <div className="text-center mb-2">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Membership Payment Details</h3>
                  <p className="text-xs text-slate-500">Confirm price breakdown and select payment method for Gym Membership</p>
                </div>

                {/* Package Summary Card */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Selected Package</span>
                      <h4 className="text-lg font-black">{selectedPlan?.name || 'Monthly Standard'}</h4>
                    </div>
                    <span className="text-xl font-mono font-black text-emerald-400">
                      ₹{(selectedPlan?.price || 2500).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-300 pt-2 border-t border-white/10">
                    <span>Duration: {selectedPlan?.duration || '30 Days'}</span>
                    <span>Start Date: {startDate}</span>
                  </div>
                </div>

                {/* Pricing Calculation Form */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Discount (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-300 rounded-xl px-4 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Net Billed Amount (₹)</label>
                      <input 
                        type="number"
                        readOnly
                        value={amountPaid}
                        className="w-full h-11 bg-slate-100 border border-slate-300 rounded-xl px-4 font-mono font-black text-xs text-blue-700"
                      />
                    </div>
                  </div>

                  {/* Payment Mode Selection */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Select Payment Method *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {(['UPI', 'Cash', 'Card', 'NetBanking'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-3 px-3 rounded-2xl text-xs font-black transition-all flex flex-col items-center gap-1 border cursor-pointer ${
                            paymentMethod === method
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {method === 'UPI' && <Smartphone size={16} />}
                          {method === 'Cash' && <Banknote size={16} />}
                          {method === 'Card' && <CreditCard size={16} />}
                          {method === 'NetBanking' && <Wallet size={16} />}
                          <span>{method}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5 (DEDICATED PT BILLING STEP — ONLY SHOWN IF PT TRAINER SELECTED) */}
            {step === 5 && hasPt && (
              <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
                <div className="text-center mb-2">
                  <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-extrabold uppercase tracking-widest rounded-full inline-block mb-1">
                    Step 5 of 6
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Personal Training Billing</h3>
                  <p className="text-xs text-slate-500">Configure separate PT package duration, price, and payment terms for trainer assignment</p>
                </div>

                {/* Assigned Trainer Card */}
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-3xl border border-blue-800 shadow-md flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                      <Dumbbell size={24} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 block">Assigned Personal Trainer</span>
                      <h4 className="text-base font-black text-white">{selectedTrainerObj?.name || 'Assigned Trainer'}</h4>
                      <span className="text-[10px] text-slate-300 font-bold">{selectedTrainerObj?.role || 'Fitness Trainer & Coach'}</span>
                    </div>
                  </div>
                </div>

                {/* PT Billing Configuration Form */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-4 text-left">
                  
                  {/* PT Package Duration Preset Selector */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">PT Package / Duration *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['1 Month', '3 Months', '6 Months', '12 Months'].map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setPtDuration(dur)}
                          className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                            ptDuration === dur
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {dur}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dates Row with Auto Expiry */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">PT Start Date *</label>
                      <input 
                        type="date"
                        value={ptStartDate}
                        onChange={(e) => {
                          setPtStartDate(e.target.value);
                          if (ptErrors.ptStartDate) setPtErrors(prev => ({ ...prev, ptStartDate: '' }));
                        }}
                        className={`w-full h-11 bg-white border rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none transition-all cursor-pointer ${
                          ptErrors.ptStartDate ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-blue-600'
                        }`}
                      />
                      {ptErrors.ptStartDate && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {ptErrors.ptStartDate}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">PT Expiry Date (Auto-Calculated) *</label>
                      <input 
                        type="date"
                        value={ptExpiryDate}
                        onChange={(e) => {
                          setPtExpiryDate(e.target.value);
                          if (ptErrors.ptExpiryDate) setPtErrors(prev => ({ ...prev, ptExpiryDate: '' }));
                        }}
                        className={`w-full h-11 bg-white border rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none transition-all cursor-pointer ${
                          ptErrors.ptExpiryDate ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-blue-600'
                        }`}
                      />
                      {ptErrors.ptExpiryDate && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {ptErrors.ptExpiryDate}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Financial Amounts: Price, Discount, Tax */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">PT Price (₹) *</label>
                      <input 
                        type="number"
                        min="0"
                        value={ptAmount}
                        onChange={(e) => {
                          setPtAmount(e.target.value);
                          if (ptErrors.ptAmount) setPtErrors(prev => ({ ...prev, ptAmount: '' }));
                        }}
                        className={`w-full h-11 bg-white border rounded-xl px-3 font-mono font-bold text-xs text-slate-900 focus:outline-none ${
                          ptErrors.ptAmount ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-blue-600'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Discount (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        value={ptDiscount}
                        onChange={(e) => setPtDiscount(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Tax (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        value={ptTax}
                        onChange={(e) => setPtTax(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* PT Net Billed & Payment Mode */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">PT Net Billed Amount (₹)</label>
                      <input 
                        type="number"
                        readOnly
                        value={ptAmountPaid}
                        className="w-full h-11 bg-slate-100 border border-slate-300 rounded-xl px-4 font-mono font-black text-xs text-blue-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">PT Payment Mode *</label>
                      <select
                        value={ptPaymentMethod}
                        onChange={(e) => setPtPaymentMethod(e.target.value as any)}
                        className="w-full h-11 bg-white border border-slate-300 rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                      >
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="NetBanking">Net Banking</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5/6: INVOICE RECEIPT & PRINT */}
            {((step === 5 && !hasPt) || (step === 6 && hasPt)) && createdInvoice && (
              <div className="max-w-3xl mx-auto space-y-6 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 size={36} />
                </div>

                <div>
                  <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase tracking-widest rounded-full inline-block mb-1">
                    Onboarding Complete 🎉
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Member Registered & Bills Issued!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Member profile created. Billing receipts generated separately for audit history.
                  </p>
                </div>

                {/* Printable Official Receipt */}
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 text-left">
                  <OfficialInvoiceReceipt 
                    invoice={createdInvoice}
                    member={createdMember}
                  />

                  {createdPtInvoice && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <h4 className="text-xs font-black text-blue-700 uppercase tracking-wider mb-2">Separate Personal Training Invoice</h4>
                      <OfficialInvoiceReceipt 
                        invoice={createdPtInvoice}
                        member={createdMember}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black transition-all shadow-md border-none cursor-pointer flex items-center gap-2"
                  >
                    <Printer size={16} /> Print Invoices
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black transition-all border-none cursor-pointer"
                  >
                    Close & Finish
                  </button>
                </div>
              </div>
            )}

            {backendError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{backendError}</span>
              </div>
            )}

          </div>

          {/* Footer Controls */}
          {((step < 5 && !hasPt) || (step < 6 && hasPt)) && (
            <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (step > 1) setStep(step - 1);
                  else handleAttemptClose();
                }}
                className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> {step === 1 ? 'Cancel' : 'Back'}
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md border-none cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <span>
                  {step === 4 && !hasPt ? (isSubmitting ? 'Registering...' : 'Complete & Generate Bill') : ''}
                  {step === 5 && hasPt ? (isSubmitting ? 'Registering...' : 'Complete & Generate Bills') : ''}
                  {((step < 4 && !hasPt) || (step < 5 && hasPt)) ? 'Next Step' : ''}
                </span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

        </motion.div>
      </div>

      {/* Discard Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl border border-slate-200">
            <AlertCircle size={36} className="text-amber-500 mx-auto" />
            <h3 className="text-base font-black text-slate-900">Discard Member Registration?</h3>
            <p className="text-xs text-slate-500 font-medium">You have unsaved form data. Are you sure you want to exit without saving?</p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700"
              >
                Discard & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
