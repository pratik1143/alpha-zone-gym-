'use client';

import React, { useState } from 'react';
import { Camera, Edit2, MapPin, Phone, Mail, Droplet, Activity, User, Briefcase, HeartPulse, CreditCard, Calendar, Clock, Star, Dumbbell, Shield, BadgeCheck, CheckCircle2, AlertCircle, Snowflake, Repeat, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cleanPlanName, parsePlanSegments } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { useGymStore } from '@/store';
import { membershipEngine } from '@/lib/engines/membershipEngine';
import toast from 'react-hot-toast';
import { z } from 'zod';

const personalInfoSchema = z.object({
  name: z.string().trim().min(2, 'Full Name must be at least 2 characters'),
  phone: z.string().trim().regex(/^[0-9+\s-]{10,15}$/, 'Enter a valid 10-15 digit phone number'),
  email: z.string().trim().optional().refine(val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: 'Enter a valid email address'
  }),
  dob: z.string().optional().refine(val => {
    if (!val) return true;
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date();
  }, {
    message: 'Date of birth cannot be in the future'
  }),
  gender: z.string().optional(),
  occupation: z.string().optional(),
  emergencyContact: z.string().optional(),
  address: z.string().optional(),
});

const healthSchema = z.object({
  weight: z.number().positive('Weight must be a positive number'),
  height: z.number().positive('Height must be a positive number'),
  bloodGroup: z.string().optional(),
  medicalNotes: z.string().optional(),
});

export default function ProfileTab({ member }: { member: any }) {
  const router = useRouter();
  const { fetchMembers } = useGymStore();
  const plans = useGymStore(s => s.plans);

  const [showEditExpiryModal, setShowEditExpiryModal] = useState(false);
  const [customExpiryDate, setCustomExpiryDate] = useState(member.expiryDate || new Date().toISOString().split('T')[0]);
  const [savingExpiry, setSavingExpiry] = useState(false);

  // Edit Modals
  const [showEditPersonalInfoModal, setShowEditPersonalInfoModal] = useState(false);
  const [showEditHealthModal, setShowEditHealthModal] = useState(false);

  // Renew Modal States
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewPlan, setRenewPlan] = useState(member.plan || '1 Month');
  const [renewPrice, setRenewPrice] = useState<number>(member.price || member.amount || 1000);
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('UPI');
  const [renewStartDateOption, setRenewStartDateOption] = useState<'extend' | 'today'>('extend');
  const [savingRenew, setSavingRenew] = useState(false);

  // Freeze Modal States
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezeDays, setFreezeDays] = useState(7);
  const [freezeReason, setFreezeReason] = useState('Travel / Vacation');
  const [savingFreeze, setSavingFreeze] = useState(false);

  const hasTrainer = Boolean(
    member?.trainerId &&
    member?.trainerId !== 'null' &&
    member?.trainer !== 'Unassigned' &&
    member?.trainerName !== 'Unassigned'
  );

  const handleUpdateExpiry = async (targetDateStr: string) => {
    setSavingExpiry(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const targetDate = new Date(targetDateStr);
      targetDate.setHours(0, 0, 0, 0);

      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const newStatus = diffDays > 0 ? 'active' : 'expired';

      await updateDoc(doc(db, 'members', member.id), {
        expiryDate: targetDateStr,
        daysLeft: diffDays,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      member.expiryDate = targetDateStr;
      member.daysLeft = diffDays;
      member.status = newStatus;

      toast.success(`Expiry date updated to ${targetDateStr}! (${diffDays > 0 ? `${diffDays} days remaining` : 'Expired'})`);
      setShowEditExpiryModal(false);
      fetchMembers();
    } catch (err: any) {
      toast.error('Failed to update expiry date: ' + err.message);
    } finally {
      setSavingExpiry(false);
    }
  };

  const handleFreezeSubmit = async () => {
    if (!member || !member.id) return;
    setSavingFreeze(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const isCurrentlyFrozen = member.status === 'frozen';

      if (isCurrentlyFrozen) {
        const freezeStart = member.frozenStartDate || todayStr;
        const startD = new Date(freezeStart);
        const nowD = new Date();
        const frozenDurationDays = Math.max(1, Math.ceil((nowD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));

        const oldExpiry = new Date(member.expiryDate || todayStr);
        const newExpiryDate = new Date(oldExpiry.getTime() + frozenDurationDays * 24 * 60 * 60 * 1000);
        const newExpiryStr = newExpiryDate.toISOString().split('T')[0];
        const newDaysLeft = membershipEngine.calculateDaysLeft(newExpiryStr);

        await updateDoc(doc(db, 'members', member.id), {
          status: 'active',
          expiryDate: newExpiryStr,
          daysLeft: newDaysLeft,
          frozenStartDate: null,
          unfrozenAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        member.status = 'active';
        member.expiryDate = newExpiryStr;
        member.daysLeft = newDaysLeft;

        toast.success(`⚡ Membership Unfrozen! Expiry extended by ${frozenDurationDays} days to ${newExpiryStr}`);
      } else {
        const daysToFreeze = Number(freezeDays) || 7;
        const currentExpiry = new Date(member.expiryDate || todayStr);
        const newExpiryDate = new Date(currentExpiry.getTime() + daysToFreeze * 24 * 60 * 60 * 1000);
        const newExpiryStr = newExpiryDate.toISOString().split('T')[0];

        const freezeItem = {
          frozenAt: todayStr,
          days: daysToFreeze,
          reason: freezeReason,
          newExpiryDate: newExpiryStr
        };

        const existingFreezeHistory = Array.isArray(member.freezeHistory) ? member.freezeHistory : [];

        await updateDoc(doc(db, 'members', member.id), {
          status: 'frozen',
          frozenStartDate: todayStr,
          freezeReason: freezeReason,
          expiryDate: newExpiryStr,
          freezeHistory: [freezeItem, ...existingFreezeHistory],
          updatedAt: new Date().toISOString()
        });

        member.status = 'frozen';
        member.expiryDate = newExpiryStr;

        toast.success(`❄️ Membership Frozen for ${daysToFreeze} days.`);
      }
      setShowFreezeModal(false);
      fetchMembers();
    } catch (err: any) {
      toast.error('Failed to update freeze status: ' + err.message);
    } finally {
      setSavingFreeze(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 text-left font-display">
      
      {/* TOP ROW: Membership Card & Personal Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Active Membership Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between border border-slate-700/50">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Active Membership</span>
                <h2 className="text-2xl font-black tracking-tight">{cleanPlanName(member.plan || 'Standard Membership')}</h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                member.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                member.status === 'frozen' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {member.status || 'Active'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Start Date</span>
                <span className="text-sm font-black text-white">{member.startDate || 'N/A'}</span>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Expiry Date</span>
                  <button
                    onClick={() => setShowEditExpiryModal(true)}
                    className="p-1 hover:bg-white/10 rounded-lg text-amber-400 hover:text-amber-300 transition-all border-none bg-transparent cursor-pointer"
                    title="Edit Expiry Date"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
                <span className="text-sm font-black text-amber-400">{member.expiryDate || 'N/A'}</span>
              </div>
            </div>

            {/* Membership History Segment */}
            {(() => {
              const historyList = Array.isArray(member.membershipHistory) && member.membershipHistory.length > 0
                ? member.membershipHistory
                : (parsePlanSegments(member.plan) || []).map((seg: any) => ({
                    packageName: seg.plan,
                    startDate: seg.startDate,
                    expiryDate: seg.expiryDate,
                    amount: member.amount || member.price || 0,
                    invoiceNumber: member.invoice || 'Paid'
                  }));

              return (
                <div className="mb-6 pt-4 border-t border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Membership History ({historyList.length})</span>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {historyList.map((h: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-white">{h.packageName}</div>
                          <div className="text-[10px] text-slate-300">{h.startDate} → {h.expiryDate || 'Active'}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-amber-400">₹{(h.amount || 0).toLocaleString('en-IN')}</div>
                          <div className="text-[9px] uppercase font-bold text-slate-300">{h.invoiceNumber || 'Paid'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-3">
              <button 
                onClick={() => router.push(`/dashboard/members/${encodeURIComponent(member.id)}/renew`)}
                className="flex-1 py-3 bg-white text-slate-900 rounded-xl text-xs font-black transition-all hover:bg-slate-100 flex items-center justify-center gap-2 border-none cursor-pointer shadow-md active:scale-95"
              >
                <CreditCard size={14} className="text-blue-600" /> Renew Plan
              </button>
              <button 
                onClick={() => member.status === 'frozen' ? handleFreezeSubmit() : setShowFreezeModal(true)}
                className={`flex-1 py-3 border rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                  member.status === 'frozen'
                    ? 'bg-amber-500 text-slate-900 border-amber-400 hover:bg-amber-400'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <Snowflake size={14} /> {member.status === 'frozen' ? '⚡ Unfreeze' : 'Freeze'}
              </button>
            </div>
          </div>
        </div>

        {/* Personal Details Card */}
        <div className="bg-white rounded-[32px] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-slate-100 p-8 relative group">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <User size={18} className="text-blue-500" /> Personal Info
            </h3>
            <button
              onClick={() => setShowEditPersonalInfoModal(true)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border-none bg-transparent cursor-pointer"
              title="Edit Personal Info"
            >
              <Edit2 size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <Field icon={Phone} label="Phone Number" value={member.phone} />
            <Field icon={Mail} label="Email Address" value={member.email || 'No email provided'} />
            <Field icon={Calendar} label="Date of Birth" value={member.dob ? new Date(member.dob).toLocaleDateString() : 'N/A'} />
            <Field icon={User} label="Gender" value={member.gender || 'Not specified'} />
            <Field icon={Briefcase} label="Occupation" value={member.occupation || 'Not specified'} />
            <Field icon={HeartPulse} label="Emergency Contact" value={member.emergencyContact || 'N/A'} />
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Health Measurements & Personal Trainer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Physical & Medical Info (Adaptive width) */}
        <div className={hasTrainer ? "lg:col-span-2 bg-white rounded-[32px] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-slate-100 p-8" : "lg:col-span-3 bg-white rounded-[32px] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-slate-100 p-8"}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Activity size={18} className="text-rose-500" /> Health & Measurements
            </h3>
            <button
              onClick={() => setShowEditHealthModal(true)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border-none bg-transparent cursor-pointer"
              title="Edit Health & Measurements"
            >
              <Edit2 size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Weight</span>
              <span className="text-2xl font-black text-slate-900">{member.weight || '--'} <span className="text-sm font-bold text-slate-400">kg</span></span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Height</span>
              <span className="text-2xl font-black text-slate-900">{member.height || '--'} <span className="text-sm font-bold text-slate-400">cm</span></span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Blood Group</span>
              <span className="text-2xl font-black text-rose-500">{member.bloodGroup || '--'}</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">BMI</span>
              <span className="text-2xl font-black text-emerald-500">{member.bmi || '--'}</span>
            </div>
          </div>
          
          <div className="mt-6">
             <Field icon={AlertCircle} label="Medical Notes & Conditions" value={member.medicalNotes || 'No known medical conditions.'} />
          </div>
        </div>

        {/* Assigned Trainer Card (ONLY RENDERED IF TRAINER IS ASSIGNED) */}
        {hasTrainer && (
          <div className="bg-white rounded-[32px] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-slate-100 p-8 flex flex-col items-center text-center justify-between">
            <div className="flex flex-col items-center w-full">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
                <Dumbbell size={24} />
              </div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">PERSONAL TRAINER</h3>
              
              <div className="w-24 h-24 rounded-full bg-slate-100 border-[4px] border-white shadow-xl overflow-hidden mb-4 relative shrink-0">
                <img
                  src={member.trainerAvatar || (`https://i.pravatar.cc/150?u=` + encodeURIComponent(member.trainerName || member.trainer))}
                  alt="trainer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 right-0 bg-emerald-500 p-1.5 rounded-full border-2 border-white text-white">
                  <BadgeCheck size={12} />
                </div>
              </div>

              <h4 className="text-xl font-black text-slate-900 leading-tight">{member.trainerName || member.trainer}</h4>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full mt-2">
                {member.trainerRole || 'Personal Trainer & Strength'}
              </span>
            </div>
            
            <div className="flex gap-2 w-full mt-6">
              <a
                href={member.trainerPhone ? `tel:${member.trainerPhone}` : '#'}
                className="flex-1 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 no-underline"
              >
                <Phone size={14} /> Call
              </a>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
              >
                <Repeat size={14} /> Change
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── EDIT PERSONAL INFO MODAL ── */}
      {showEditPersonalInfoModal && (
        <EditPersonalInfoModal
          member={member}
          onClose={() => setShowEditPersonalInfoModal(false)}
          onSave={() => fetchMembers()}
        />
      )}

      {/* ── EDIT HEALTH & MEASUREMENTS MODAL ── */}
      {showEditHealthModal && (
        <EditHealthModal
          member={member}
          onClose={() => setShowEditHealthModal(false)}
          onSave={() => fetchMembers()}
        />
      )}

      {/* ── EDIT EXPIRY DATE MODAL ── */}
      <AnimatePresence>
        {showEditExpiryModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowEditExpiryModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 z-10 text-slate-900 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="text-amber-500" size={20} />
                  <h3 className="font-extrabold text-slate-900 text-lg">Edit Membership Expiry Date</h3>
                </div>
                <button
                  onClick={() => setShowEditExpiryModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-medium mb-3">
                  Select a quick preset or pick a custom date to update <span className="font-bold text-slate-800">{member.name}'s</span> membership validity.
                </p>

                {/* Quick Presets */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + 1);
                      const str = d.toISOString().split('T')[0];
                      setCustomExpiryDate(str);
                      handleUpdateExpiry(str);
                    }}
                    className="p-2.5 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all text-center cursor-pointer"
                  >
                    +1 Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + 3);
                      const str = d.toISOString().split('T')[0];
                      setCustomExpiryDate(str);
                      handleUpdateExpiry(str);
                    }}
                    className="p-2.5 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all text-center cursor-pointer"
                  >
                    +3 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + 6);
                      const str = d.toISOString().split('T')[0];
                      setCustomExpiryDate(str);
                      handleUpdateExpiry(str);
                    }}
                    className="p-2.5 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all text-center cursor-pointer"
                  >
                    +6 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setFullYear(d.getFullYear() + 1);
                      const str = d.toISOString().split('T')[0];
                      setCustomExpiryDate(str);
                      handleUpdateExpiry(str);
                    }}
                    className="p-2.5 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all text-center cursor-pointer"
                  >
                    +1 Year
                  </button>
                </div>

                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                  Custom Expiry Date
                </label>
                <input
                  type="date"
                  value={customExpiryDate}
                  onChange={(e) => setCustomExpiryDate(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditExpiryModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-extrabold border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingExpiry}
                  onClick={() => handleUpdateExpiry(customExpiryDate)}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black border-none cursor-pointer shadow-md disabled:opacity-50"
                >
                  {savingExpiry ? 'Updating...' : 'Save Expiry Date'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ─── HELPER COMPONENTS ───

function Field({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
        <span className="text-xs font-black text-slate-800 truncate block">{value || 'N/A'}</span>
      </div>
    </div>
  );
}

// ─── EDIT PERSONAL INFO MODAL COMPONENT ───

function EditPersonalInfoModal({ member, onClose, onSave }: { member: any; onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState(member.name || '');
  const [phone, setPhone] = useState(member.phone || '');
  const [email, setEmail] = useState(member.email || '');
  const [dob, setDob] = useState(member.dob || '');
  const [gender, setGender] = useState(member.gender || 'Male');
  const [occupation, setOccupation] = useState(member.occupation || '');
  const [emergencyContact, setEmergencyContact] = useState(member.emergencyContact || '');
  const [address, setAddress] = useState(member.address || '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    const parseRes = personalInfoSchema.safeParse({
      name,
      phone,
      email,
      dob,
      gender,
      occupation,
      emergencyContact,
      address,
    });

    if (!parseRes.success) {
      const errMap: Record<string, string> = {};
      parseRes.error.issues.forEach((issue) => {
        if (issue.path[0]) errMap[issue.path[0] as string] = issue.message;
      });
      setErrors(errMap);
      return;
    }

    setSaving(true);
    try {
      const updatePayload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        dob,
        gender,
        occupation: occupation.trim(),
        emergencyContact: emergencyContact.trim(),
        address: address.trim(),
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'members', member.id), updatePayload);

      Object.assign(member, updatePayload);

      toast.success('Personal info updated successfully!');
      onSave();
      onClose();
    } catch (err: any) {
      toast.error('Failed to update personal info: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 z-10 text-slate-900 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <User className="text-blue-600" size={20} />
            <h3 className="font-extrabold text-slate-900 text-lg">Edit Personal Info</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer">✕</button>
        </div>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 text-xs font-semibold custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: '' })); }}
                className={`w-full text-xs bg-slate-50 border rounded-xl px-3 py-2.5 focus:outline-none text-slate-800 font-bold ${errors.name ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-blue-500'}`}
              />
              {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.name}</p>}
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Phone Number *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors(p => ({ ...p, phone: '' })); }}
                className={`w-full text-xs bg-slate-50 border rounded-xl px-3 py-2.5 focus:outline-none text-slate-800 font-bold ${errors.phone ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-blue-500'}`}
              />
              {errors.phone && <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: '' })); }}
                className={`w-full text-xs bg-slate-50 border rounded-xl px-3 py-2.5 focus:outline-none text-slate-800 ${errors.email ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-blue-500'}`}
              />
              {errors.email && <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.email}</p>}
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => { setDob(e.target.value); if (errors.dob) setErrors(p => ({ ...p, dob: '' })); }}
                className={`w-full text-xs bg-slate-50 border rounded-xl px-3 py-2.5 focus:outline-none text-slate-800 ${errors.dob ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-blue-500'}`}
              />
              {errors.dob && <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.dob}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none text-slate-800 font-semibold cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Not specified">Not specified</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Occupation</label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Software Engineer"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Emergency Contact</label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="e.g. Father: 9876543210"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Residential Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Mohali, Punjab"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none text-slate-800"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-black uppercase border-none cursor-pointer">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer shadow-md disabled:opacity-50 active:scale-95 transition-all"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EDIT HEALTH & MEASUREMENTS MODAL COMPONENT ───

function EditHealthModal({ member, onClose, onSave }: { member: any; onClose: () => void; onSave: () => void }) {
  const [weight, setWeight] = useState<string>(member.weight ? String(member.weight) : '70');
  const [height, setHeight] = useState<string>(member.height ? String(member.height) : '175');
  const [bloodGroup, setBloodGroup] = useState<string>(member.bloodGroup || 'O+');
  const [medicalNotes, setMedicalNotes] = useState<string>(member.medicalNotes || '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const wNum = parseFloat(weight) || 0;
  const hNum = parseFloat(height) || 0;
  const calculatedBmi = (wNum > 0 && hNum > 0) ? (wNum / Math.pow(hNum / 100, 2)).toFixed(1) : '--';

  const handleSave = async () => {
    const parseRes = healthSchema.safeParse({
      weight: wNum,
      height: hNum,
      bloodGroup,
      medicalNotes,
    });

    if (!parseRes.success) {
      const errMap: Record<string, string> = {};
      parseRes.error.issues.forEach((issue) => {
        if (issue.path[0]) errMap[issue.path[0] as string] = issue.message;
      });
      setErrors(errMap);
      return;
    }

    setSaving(true);
    try {
      const updatePayload = {
        weight: wNum,
        height: hNum,
        bloodGroup,
        bmi: calculatedBmi,
        medicalNotes: medicalNotes.trim(),
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'members', member.id), updatePayload);

      Object.assign(member, updatePayload);

      toast.success('Health & Measurements updated successfully!');
      onSave();
      onClose();
    } catch (err: any) {
      toast.error('Failed to update health info: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 z-10 text-slate-900 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="text-rose-500" size={20} />
            <h3 className="font-extrabold text-slate-900 text-lg">Edit Health & Measurements</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer">✕</button>
        </div>

        <div className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Weight (kg) *</label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => { setWeight(e.target.value); if (errors.weight) setErrors(p => ({ ...p, weight: '' })); }}
                className={`w-full text-xs bg-slate-50 border rounded-xl px-3 py-2.5 focus:outline-none text-slate-800 font-bold ${errors.weight ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-rose-500'}`}
              />
              {errors.weight && <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.weight}</p>}
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Height (cm) *</label>
              <input
                type="number"
                step="0.1"
                value={height}
                onChange={(e) => { setHeight(e.target.value); if (errors.height) setErrors(p => ({ ...p, height: '' })); }}
                className={`w-full text-xs bg-slate-50 border rounded-xl px-3 py-2.5 focus:outline-none text-slate-800 font-bold ${errors.height ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-rose-500'}`}
              />
              {errors.height && <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.height}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none text-slate-800 font-semibold cursor-pointer"
              >
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '--'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Calculated BMI (kg/m²)</label>
              <div className="w-full text-xs bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-emerald-700 font-black flex items-center justify-between">
                <span>{calculatedBmi}</span>
                <span className="text-[9px] font-bold text-emerald-600 uppercase">Auto Calculated</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Medical Notes & Conditions</label>
            <textarea
              rows={3}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="e.g. Lower back sensitivity, Asthma..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none text-slate-800 font-medium"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-black uppercase border-none cursor-pointer">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer shadow-md disabled:opacity-50 active:scale-95 transition-all"
          >
            {saving ? 'Saving...' : 'Save Measurements'}
          </button>
        </div>
      </div>
    </div>
  );
}
