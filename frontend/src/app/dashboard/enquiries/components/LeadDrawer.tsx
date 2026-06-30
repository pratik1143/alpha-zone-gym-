'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Phone, MessageSquare, Mail, Calendar, UserPlus, 
  Trash2, MapPin, Target, Weight, FileText, ArrowRight, Clock,
  MoreVertical, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface LeadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any | null;
  onFollowUpClick: (lead: any) => void;
}

export default function LeadDrawer({ isOpen, onClose, lead, onFollowUpClick }: LeadDrawerProps) {
  if (!lead) return null;

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateDoc(doc(db, 'enquiries', lead.id), { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleConvert = () => {
    // Save to local storage to prepopulate member registration
    localStorage.setItem('pending_conversion', JSON.stringify(lead));
    window.location.href = '/dashboard/members?action=new';
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteDoc(doc(db, 'enquiries', lead.id));
      toast.success('Lead deleted');
      onClose();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-950 border-l border-white/10 z-[101] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-slate-900/50 flex items-start justify-between relative overflow-hidden">
               {/* Decorative background blur */}
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-primary/20 blur-[50px] rounded-full pointer-events-none" />
               
               <div className="flex gap-4 items-center relative z-10">
                 <img 
                   src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name}`} 
                   alt={lead.name}
                   className="w-16 h-16 rounded-2xl bg-black border border-white/10"
                 />
                 <div>
                   <h2 className="text-xl font-bold text-white">{lead.name}</h2>
                   <div className="flex items-center gap-2 mt-1">
                     <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        lead.status === 'New' ? 'bg-blue-500/20 text-blue-400' :
                        lead.status === 'Converted' ? 'bg-emerald-500/20 text-emerald-400' :
                        lead.status === 'Lost' ? 'bg-red-500/20 text-red-400' :
                        'bg-amber-500/20 text-amber-400'
                     }`}>
                       {lead.status}
                     </span>
                     <span className="text-xs text-slate-400">{lead.priority} Priority</span>
                   </div>
                 </div>
               </div>
               
               <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors relative z-10">
                 <X className="w-5 h-5 text-slate-400" />
               </button>
            </div>

            {/* Quick Actions */}
            <div className="flex p-4 gap-2 border-b border-white/5 bg-black/20">
               <button 
                 onClick={() => window.open(`https://wa.me/${lead.phone}`, '_blank')}
                 className="flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] transition-colors"
               >
                 <MessageSquare className="w-5 h-5" />
                 <span className="text-[10px] font-bold uppercase">WhatsApp</span>
               </button>
               <button 
                 onClick={() => window.open(`tel:${lead.phone}`)}
                 className="flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
               >
                 <Phone className="w-5 h-5" />
                 <span className="text-[10px] font-bold uppercase">Call</span>
               </button>
               <button 
                 onClick={() => lead.email && window.open(`mailto:${lead.email}`)}
                 className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-colors ${lead.email ? 'bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400' : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}
               >
                 <Mail className="w-5 h-5" />
                 <span className="text-[10px] font-bold uppercase">Email</span>
               </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Target className="w-4 h-4" />
                    <span className="text-xs font-medium">Fitness Goal</span>
                  </div>
                  <div className="text-sm font-semibold text-white">{lead.goal || 'Not specified'}</div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-medium">Preferred Branch</span>
                  </div>
                  <div className="text-sm font-semibold text-white">{lead.preferredBranch || 'Not specified'}</div>
                </div>
              </div>

              {/* Remarks */}
              {lead.remarks && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Remarks</h3>
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-200/80 rounded-xl text-sm leading-relaxed">
                    {lead.remarks}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center justify-between">
                  Activity Timeline
                  <button onClick={() => onFollowUpClick(lead)} className="text-brand-primary flex items-center gap-1 hover:underline">
                    <Calendar className="w-3 h-3" /> Add Follow-up
                  </button>
                </h3>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                  {lead.timeline?.map((item: any, i: number) => (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-slate-900 text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        {item.type === 'created' ? <UserPlus className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-900/50 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-white text-xs">{item.note}</div>
                          <time className="text-[10px] font-medium text-slate-500">{new Date(item.timestamp).toLocaleDateString()}</time>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center text-sm text-slate-500 py-4">No activity history</div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/5 bg-slate-900/50 flex flex-col gap-2">
               {lead.status !== 'Converted' && (
                 <button 
                   onClick={handleConvert}
                   className="w-full py-3 bg-brand-primary hover:bg-brand-primary/90 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                 >
                   <CheckCircle className="w-5 h-5" />
                   Convert to Member
                 </button>
               )}
               <div className="flex gap-2">
                 <select 
                   value={lead.status}
                   onChange={(e) => handleStatusChange(e.target.value)}
                   className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-brand-primary"
                 >
                   <option value="New">New</option>
                   <option value="Contacted">Contacted</option>
                   <option value="Interested">Interested</option>
                   <option value="Trial Booked">Trial Booked</option>
                   <option value="Visited">Visited</option>
                   <option value="Negotiation">Negotiation</option>
                   <option value="Converted">Converted</option>
                   <option value="Lost">Lost</option>
                 </select>
                 <button 
                   onClick={handleDelete}
                   className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors shrink-0"
                 >
                   <Trash2 className="w-5 h-5" />
                 </button>
               </div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
