'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, Bell, X, Check } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any | null;
}

export default function FollowUpModal({ isOpen, onClose, lead }: FollowUpModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [executive, setExecutive] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      toast.error('Date and time are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const followUpTimestamp = new Date(`${date}T${time}`).toISOString();
      const followUpObj = {
        date: followUpTimestamp,
        executive,
        note,
        status: 'pending'
      };

      const timelineObj = {
        type: 'follow_up_scheduled',
        timestamp: new Date().toISOString(),
        note: `Follow-up scheduled for ${new Date(followUpTimestamp).toLocaleString()} by ${executive || 'System'}. Note: ${note}`
      };

      await updateDoc(doc(db, 'enquiries', lead.id), {
        nextFollowUp: followUpTimestamp,
        followUps: arrayUnion(followUpObj),
        timeline: arrayUnion(timelineObj)
      });

      toast.success('Follow-up scheduled successfully!');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to schedule follow-up.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-brand-primary" />
                Schedule Follow-up
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                     <Calendar className="w-3 h-3" /> Date
                   </label>
                   <input 
                     type="date"
                     required
                     value={date}
                     onChange={e => setDate(e.target.value)}
                     className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                     <Clock className="w-3 h-3" /> Time
                   </label>
                   <input 
                     type="time"
                     required
                     value={time}
                     onChange={e => setTime(e.target.value)}
                     className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary"
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                   <User className="w-3 h-3" /> Executive
                 </label>
                 <input 
                   type="text"
                   placeholder="e.g. Rahul, Priya..."
                   value={executive}
                   onChange={e => setExecutive(e.target.value)}
                   className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary"
                 />
               </div>

               <div>
                 <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                   Reminder Note
                 </label>
                 <textarea 
                   rows={3}
                   placeholder="What needs to be discussed?"
                   value={note}
                   onChange={e => setNote(e.target.value)}
                   className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary resize-none"
                 />
               </div>

               <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-brand-primary hover:bg-brand-primary/90 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Scheduling...' : (
                    <>
                      <Check className="w-5 h-5" /> Schedule Reminder
                    </>
                  )}
               </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
