'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Camera, User, Smartphone, Activity, CheckCircle2,
  ArrowRight, CreditCard, Shield, Clock, Plus, UploadCloud
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useGymStore } from '@/store';
import SmartPhotoCapture from '@/app/dashboard/components/SmartPhotoCapture';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddMemberModal({ isOpen, onClose }: AddMemberModalProps) {
  const { addMember } = useGymStore();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1: Basic
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Step 2: Membership
  const [plan, setPlan] = useState('Monthly');
  const [trainer, setTrainer] = useState('');

  // Step 3: Bio & App
  const [enrollBiometric, setEnrollBiometric] = useState(false);
  const [setupApp, setSetupApp] = useState(false);

  const steps = [
    { id: 1, label: 'Profile' },
    { id: 2, label: 'Membership' },
    { id: 3, label: 'Access' },
    { id: 4, label: 'Details' },
    { id: 5, label: 'Review' }
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      setTimeout(() => {
        setPhotoPreview(URL.createObjectURL(e.target.files![0]));
        setIsUploading(false);
        toast.success("Photo uploaded");
      }, 1000);
    }
  };

  const handleSave = async () => {
    if (!fullName || !mobile) {
      toast.error('Name and Mobile are required!');
      return;
    }
    setIsSubmitting(true);
    try {
      await addMember({
        name: fullName,
        phone: mobile,
        email: email,
        plan: plan,
        trainer: trainer,
        avatar: photoPreview || undefined,
        status: 'active',
        joinDate: new Date().toISOString()
      });
      toast.success('Member created successfully!');
      onClose();
      // Reset form
      setStep(1);
      setFullName('');
      setMobile('');
      setEmail('');
      setPhotoPreview(null);
    } catch (err) {
      toast.error('Failed to create member');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && (!fullName || !mobile || !email)) {
      toast.error("Please fill all required fields");
      return;
    }
    if (step < 5) setStep(prev => prev + 1);
    else handleSave();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/30 backdrop-blur-[15px] pointer-events-auto"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-[1100px] bg-[#FAFAFA] rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-[#ECECEC] pointer-events-auto relative overflow-hidden flex flex-col h-[90vh]"
        >
          {/* Header */}
          <div className="px-10 py-6 border-b border-[#ECECEC] bg-white flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <span className="bg-[#D7FF00]/20 p-2 rounded-xl text-slate-800"><User size={24} /></span>
                Add New Member
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Create a new member profile for Alpha Zone CRM in under 30s</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={onClose}
                className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center text-slate-600 border-none cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="px-10 py-5 bg-white border-b border-[#ECECEC] shrink-0">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full z-0 overflow-hidden">
                 <motion.div 
                   className="h-full bg-[#D7FF00]" 
                   initial={{ width: 0 }}
                   animate={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
                   transition={{ duration: 0.5 }}
                 />
              </div>
              {steps.map((s) => {
                const isCompleted = step > s.id;
                const isCurrent = step === s.id;
                return (
                  <div key={s.id} className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
                    <div className={"w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 " + (
                      isCompleted ? 'bg-[#22C55E] text-white' :
                      isCurrent ? 'bg-[#D7FF00] text-slate-900 shadow-[0_0_15px_rgba(215,255,0,0.4)]' :
                      'bg-slate-100 text-slate-400'
                    )}>
                      {isCompleted ? <CheckCircle2 size={20} /> : s.id}
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            
            {/* STEP 1: BASIC PROFILE */}
            {step === 1 && (
              <div className="flex gap-16 animate-fade-in h-full items-start justify-center">
                <div className="w-[280px] shrink-0 flex flex-col items-center gap-6">
                  <SmartPhotoCapture 
                    value={photoPreview || undefined}
                    onCaptureComplete={(urls) => {
                      setPhotoPreview(urls.photoURL);
                    }}
                    label="Member"
                  />
                </div>

                <div className="flex-1 max-w-[600px] flex flex-col gap-8">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Basic Details</h3>
                    <p className="text-sm text-slate-500">Only these fields are required to create a member profile.</p>
                  </div>
                  
                  <div className="space-y-6 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <div className="relative group">
                      <label className="absolute -top-2.5 left-4 px-1 bg-white text-[10px] font-black uppercase tracking-wider text-slate-500 z-10 transition-colors group-focus-within:text-[#2563EB]">
                        Full Name *
                      </label>
                      <input 
                        type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                        className="w-full h-16 bg-transparent border-2 border-slate-200 rounded-2xl px-5 text-slate-900 font-bold text-lg focus:outline-none focus:border-[#2563EB] transition-all placeholder:text-slate-300"
                        placeholder="e.g. Rahul Sharma"
                      />
                    </div>
                    
                    <div className="relative group">
                      <label className="absolute -top-2.5 left-4 px-1 bg-white text-[10px] font-black uppercase tracking-wider text-slate-500 z-10 transition-colors group-focus-within:text-[#2563EB]">
                        Mobile Number *
                      </label>
                      <input 
                        type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)}
                        className="w-full h-16 bg-transparent border-2 border-slate-200 rounded-2xl px-5 text-slate-900 font-bold text-lg focus:outline-none focus:border-[#2563EB] transition-all placeholder:text-slate-300"
                        placeholder="+91 "
                      />
                    </div>
                    
                    <div className="relative group">
                      <label className="absolute -top-2.5 left-4 px-1 bg-white text-[10px] font-black uppercase tracking-wider text-slate-500 z-10 transition-colors group-focus-within:text-[#2563EB]">
                        Email Address *
                      </label>
                      <input 
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-16 bg-transparent border-2 border-slate-200 rounded-2xl px-5 text-slate-900 font-bold text-lg focus:outline-none focus:border-[#2563EB] transition-all placeholder:text-slate-300"
                        placeholder="rahul@email.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2, 3, 4: OPTIONAL MODULES */}
            {step > 1 && step < 5 && (
              <div className="max-w-2xl mx-auto h-full flex flex-col justify-center animate-fade-in">
                <div className="text-center mb-10">
                  <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest inline-block mb-4">Optional Section</span>
                  <h3 className="text-3xl font-black text-slate-900 mb-3">
                    {step === 2 && "Membership & Coaching"}
                    {step === 3 && "Identity & App Access"}
                    {step === 4 && "Additional Details"}
                  </h3>
                  <p className="text-slate-500">You can complete this later from the member's profile.</p>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                  {step === 2 && (
                    <>
                      <div className="relative group">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Membership Plan</label>
                        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-5 text-slate-900 font-bold focus:outline-none focus:border-[#2563EB]">
                          <option>Monthly</option><option>Quarterly</option><option>Semi-Annual</option><option>Annual Premium</option>
                        </select>
                      </div>
                      <div className="relative group">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Personal Trainer</label>
                        <select value={trainer} onChange={(e) => setTrainer(e.target.value)} className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-5 text-slate-900 font-bold focus:outline-none focus:border-[#2563EB]">
                          <option value="">No PT Assigned</option><option>Karan Verma</option><option>Sneha Kapoor</option>
                        </select>
                      </div>
                    </>
                  )}

                  {step === 3 && (
                    <div className="grid grid-cols-2 gap-6">
                      <button onClick={() => setEnrollBiometric(!enrollBiometric)} className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-3 text-center ${enrollBiometric ? 'border-[#22C55E] bg-[#22C55E]/5' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${enrollBiometric ? 'bg-[#22C55E] text-white' : 'bg-slate-200 text-slate-500'}`}><Shield size={24} /></div>
                        <div>
                          <h4 className="font-bold text-slate-900">Biometric Sync</h4>
                          <p className="text-xs text-slate-500 mt-1">Enroll fingerprint on device</p>
                        </div>
                      </button>
                      
                      <button onClick={() => setSetupApp(!setupApp)} className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-3 text-center ${setupApp ? 'border-[#2563EB] bg-[#2563EB]/5' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${setupApp ? 'bg-[#2563EB] text-white' : 'bg-slate-200 text-slate-500'}`}><Smartphone size={24} /></div>
                        <div>
                          <h4 className="font-bold text-slate-900">Mobile App</h4>
                          <p className="text-xs text-slate-500 mt-1">Generate login & send WhatsApp</p>
                        </div>
                      </button>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="grid grid-cols-2 gap-4">
                      {['Diet Plan', 'Workout Plan', 'Medical History', 'Emergency Contact', 'Address', 'Documents'].map(opt => (
                        <div key={opt} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center gap-3 text-slate-400">
                          <Plus size={20} />
                          <span className="font-bold text-sm">{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW */}
            {step === 5 && (
              <div className="max-w-xl mx-auto h-full flex flex-col justify-center text-center animate-fade-in">
                <div className="w-24 h-24 bg-[#D7FF00]/20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-800">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-2">Ready to Activate</h3>
                <p className="text-slate-500 mb-8">You are about to create a new profile for {fullName || 'Member'}.</p>
                
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm text-left grid grid-cols-2 gap-y-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Name</span>
                    <span className="font-bold text-slate-900">{fullName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Mobile</span>
                    <span className="font-bold text-slate-900">{mobile}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Plan</span>
                    <span className="font-bold text-[#2563EB]">{plan}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Trainer</span>
                    <span className="font-bold text-slate-900">{trainer || 'None'}</span>
                  </div>
                </div>
              </div>
            )}
            
          </div>

          {/* Footer Bar */}
          <div className="px-10 py-6 bg-white border-t border-[#ECECEC] flex items-center justify-between shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
            <button onClick={onClose} className="px-6 py-3.5 rounded-2xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent">
              Cancel
            </button>
            
            <div className="flex gap-4">
              {step > 1 && step < 5 && (
                <button 
                  onClick={() => setStep(5)} 
                  className="px-8 py-3.5 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-2 border-none cursor-pointer"
                >
                  Skip All Remaining
                </button>
              )}
              
              <button 
                onClick={handleNext}
                disabled={isSubmitting}
                className={"px-10 py-3.5 rounded-2xl font-black text-sm text-slate-900 transition-all flex items-center gap-2 border-none cursor-pointer " + (
                  isSubmitting ? 'opacity-50 cursor-not-allowed bg-slate-200' : 'bg-[#D7FF00] hover:bg-[#c9ee00] shadow-[0_10px_30px_rgba(215,255,0,0.3)] hover:-translate-y-0.5'
                )}
              >
                {step === 5 ? (isSubmitting ? 'Creating...' : 'Activate Member') : 'Next Step'} 
                {step < 5 && <ArrowRight size={18} />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
