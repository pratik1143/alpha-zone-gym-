'use client';

import React, { useState } from 'react';
import { Camera, Edit2, MapPin, Phone, Mail, Droplet, Activity, User, Briefcase, HeartPulse, CreditCard, Calendar, Clock, Star, Dumbbell, Shield, BadgeCheck, CheckCircle2, AlertCircle, Snowflake, Repeat } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfileTab({ member }: { member: any }) {
  // A helper component for beautiful editable fields
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
                <h3 className="text-3xl font-black mt-3 tracking-tight">{member.plan || 'Standard Membership'}</h3>
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Expiry Date</span>
                <span className="text-sm font-semibold">{member.expiryDate ? new Date(member.expiryDate).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>

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
    </div>
  );
}
