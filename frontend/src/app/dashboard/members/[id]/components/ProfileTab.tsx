'use client';

import React, { useState } from 'react';
import { Camera, Edit2, MapPin, Phone, Mail, Droplet, Activity, User, Briefcase, HeartPulse, CreditCard, Calendar, Clock, Star, Dumbbell, Shield, BadgeCheck, CheckCircle2, AlertCircle, Snowflake, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cleanPlanName, parsePlanSegments } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useGymStore } from '@/store';
import toast from 'react-hot-toast';

export default function ProfileTab({ member }: { member: any }) {
  const { fetchMembers } = useGymStore();
  const [showEditExpiryModal, setShowEditExpiryModal] = useState(false);
  const [customExpiryDate, setCustomExpiryDate] = useState(member.expiryDate || new Date().toISOString().split('T')[0]);
  const [savingExpiry, setSavingExpiry] = useState(false);

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

  // Helper component for editable fields
  const Field = ({ icon: Icon, label, value, isEditing = false }: any) => (
    <div className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0 group">
      <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
        <Icon size={14} />
      </div>
      <div className="flex-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
        {isEditing ? (
          <input type="text" defaultValue={value} className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 mt-0.5 w-full focus:outline-none focus:border-blue-500" />
        ) : (
          <span className="text-sm font-semibold text-slate-800">{value || '-'}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* TOP ROW: Membership & Trainer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Membership Card (Premium Apple-like) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-8 relative overflow-hidden text-white group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">Active Plan</span>
                <h3 className="text-3xl font-black mt-3 tracking-tight">{cleanPlanName(member.plan)}</h3>
                {member.amount ? (
                  <div className="text-xl font-bold text-amber-400 mt-1">₹{Number(member.amount).toLocaleString('en-IN')}</div>
                ) : null}
              </div>
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                <Shield className="text-white" size={24} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Start Date</span>
                <span className="text-sm font-semibold">{member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expiry Date</span>
                  <button
                    onClick={() => setShowEditExpiryModal(true)}
                    className="p-1 rounded bg-white/10 hover:bg-amber-400 hover:text-slate-900 text-amber-400 transition-all border-none cursor-pointer"
                    title="Edit Expiry Date"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
                <span className="text-sm font-black text-amber-400 cursor-pointer" onClick={() => setShowEditExpiryModal(true)}>
                  {member.expiryDate ? new Date(member.expiryDate).toLocaleDateString() : 'N/A'} ✏️
                </span>
              </div>
            </div>

            {(() => {
              const historyList = (member.membershipHistory && member.membershipHistory.length > 0)
                ? member.membershipHistory.map((h: any) => ({ ...h, packageName: cleanPlanName(h.packageName) }))
                : parsePlanSegments(member.plan).map((seg: string, idx: number) => ({
                    packageName: seg,
                    startDate: member.joinDate || 'N/A',
                    expiryDate: member.expiryDate || 'Active',
                    amount: member.amount || 2500,
                    invoiceNumber: `LEG-00000${idx + 1}`
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
              <button className="flex-1 py-3 bg-white text-slate-900 rounded-xl text-xs font-black transition-all hover:bg-slate-100 flex items-center justify-center gap-2">
                <CreditCard size={14} /> Renew Plan
              </button>
              <button className="flex-1 py-3 bg-white/10 border border-white/20 text-white rounded-xl text-xs font-black transition-all hover:bg-white/20 flex items-center justify-center gap-2">
                <Snowflake size={14} /> Freeze
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
            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
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

      {/* BOTTOM ROW: Biometrics & Trainer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Physical & Medical Info */}
        <div className="lg:col-span-2 bg-white rounded-[32px] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-slate-100 p-8">
           <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Activity size={18} className="text-rose-500" /> Health & Measurements
            </h3>
            <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
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

        {/* Assigned Trainer */}
        <div className="bg-white rounded-[32px] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-slate-100 p-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-6">
            <Dumbbell size={24} />
          </div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Personal Trainer</h3>
          
          {member.trainer ? (
            <>
              <div className="w-24 h-24 rounded-full bg-slate-100 border-[4px] border-white shadow-xl overflow-hidden mb-4 relative">
                <img src={'https://i.pravatar.cc/150?u=' + member.trainer} alt="trainer" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 right-0 bg-emerald-500 p-1.5 rounded-full border-2 border-white text-white">
                  <BadgeCheck size={12} />
                </div>
              </div>
              <h4 className="text-xl font-black text-slate-900">{member.trainer}</h4>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full mt-2">Strength & Conditioning</span>
              
              <div className="flex gap-2 w-full mt-8">
                <button className="flex-1 py-2.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2">
                  <Phone size={14} /> Call
                </button>
                <button className="flex-1 py-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2">
                  <Repeat size={14} /> Change
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <span className="text-slate-400 text-sm font-semibold mb-6">No trainer assigned</span>
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md flex justify-center items-center gap-2 w-full">
                Assign Trainer
              </button>
            </div>
          )}
        </div>

      </div>

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
                      const d2 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      setCustomExpiryDate(d2);
                      handleUpdateExpiry(d2);
                    }}
                    className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-900 font-extrabold text-xs text-left transition-all cursor-pointer flex flex-col gap-0.5"
                  >
                    <span>⚡ Expires in 2 Days</span>
                    <span className="text-[10px] text-amber-700 font-medium">Quick 48h Testing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      setCustomExpiryDate(d30);
                      handleUpdateExpiry(d30);
                    }}
                    className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-900 font-extrabold text-xs text-left transition-all cursor-pointer flex flex-col gap-0.5"
                  >
                    <span>📅 +1 Month</span>
                    <span className="text-[10px] text-blue-700 font-medium">30 Days Expiry</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      setCustomExpiryDate(d90);
                      handleUpdateExpiry(d90);
                    }}
                    className="p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-indigo-900 font-extrabold text-xs text-left transition-all cursor-pointer flex flex-col gap-0.5"
                  >
                    <span>📅 +3 Months</span>
                    <span className="text-[10px] text-indigo-700 font-medium">90 Days Expiry</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const expToday = new Date().toISOString().split('T')[0];
                      setCustomExpiryDate(expToday);
                      handleUpdateExpiry(expToday);
                    }}
                    className="p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-red-900 font-extrabold text-xs text-left transition-all cursor-pointer flex flex-col gap-0.5"
                  >
                    <span>🚫 Expire Today</span>
                    <span className="text-[10px] text-red-700 font-medium">Set Status to Expired</span>
                  </button>
                </div>

                {/* Custom Date Input */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Or Choose Custom Expiry Date</label>
                  <input
                    type="date"
                    value={customExpiryDate}
                    onChange={(e) => setCustomExpiryDate(e.target.value)}
                    className="w-full h-12 bg-slate-50 border border-slate-300 rounded-xl px-4 font-extrabold text-slate-900 text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditExpiryModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateExpiry(customExpiryDate)}
                  disabled={savingExpiry}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs border-none cursor-pointer shadow-md disabled:opacity-50"
                >
                  {savingExpiry ? 'Saving...' : 'Save Expiry Date'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
