'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, AlertTriangle, ShieldAlert, Gift, DollarSign, Dumbbell, X, MessageCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import API from '@/services/api';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, addDoc, where } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function NotificationCenter({ hideIcon = false }: { hideIcon?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [activeAlarms, setActiveAlarms] = useState<any[]>([]);
  const [completeOutcome, setCompleteOutcome] = useState('Connected');
  const [completeRemarks, setCompleteRemarks] = useState('');
  const [clientResponse, setClientResponse] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [snoozeMode, setSnoozeMode] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState('');
  const [snoozeTime, setSnoozeTime] = useState('');
  const [processingAlarm, setProcessingAlarm] = useState(false);

  const playAlarmSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playBeep = (time: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, time);
        osc.frequency.exponentialRampToValueAtTime(1000, time + 0.1);
        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.2);
      };

      const now = ctx.currentTime;
      playBeep(now);
      playBeep(now + 0.25);
      playBeep(now + 0.5);
    } catch(e) {}
  };

  useEffect(() => {
    if (activeAlarms.length > 0) {
      playAlarmSound();
      const intv = setInterval(playAlarmSound, 2500);
      return () => clearInterval(intv);
    }
  }, [activeAlarms.length]);

  const handleSnooze = async (f: any) => {
    if (!snoozeDate || !snoozeTime) {
      toast.error('Please select both date and time to snooze');
      return;
    }
    setProcessingAlarm(true);
    try {
      const scheduledDateTime = new Date(`${snoozeDate}T${snoozeTime}`);
      await updateDoc(doc(db, 'followups', f.id), {
        scheduledDate: snoozeDate,
        scheduledTime: snoozeTime,
        scheduledTimestamp: scheduledDateTime.getTime(),
        notificationSent: false
      });
      toast.success('Alarm snoozed successfully!');
      setActiveAlarms(prev => prev.filter(a => a.id !== f.id));
      setSnoozeMode(false);
      setSnoozeDate('');
      setSnoozeTime('');
    } catch(e) {
      toast.error('Failed to snooze');
    } finally {
      setProcessingAlarm(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(15));
    const unsub = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n: any) => !n.read).length);
    }, (err) => {
      console.warn("Firestore NotificationCenter notifications query error:", err);
    });
    return () => unsub();
  }, []);

  const pendingFollowupsRef = useRef<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'followups'), where('status', '==', 'Pending'));
    
    const unsub = onSnapshot(q, (snap) => {
      pendingFollowupsRef.current = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }, (err) => {
      console.warn("Firestore NotificationCenter followups query error:", err);
    });

    const interval = setInterval(() => {
      const now = Date.now();
      pendingFollowupsRef.current.forEach(async (f) => {
        const timestamp = f.scheduledTimestamp || new Date(`${f.scheduledDate}T${f.scheduledTime || "00:00"}`).getTime();
        
        console.log(`[Alarm Check] Follow-up ${f.id}: timestamp=${new Date(timestamp).toLocaleTimeString()}, now=${new Date(now).toLocaleTimeString()}, sent=${f.notificationSent}, shouldTrigger=${timestamp <= now && !f.notificationSent}`);

        if (timestamp && timestamp <= now && !f.notificationSent) {
          // Temporarily mark locally to prevent duplicate processing
          f.notificationSent = true;
          
          if (f.method === 'WhatsApp' && f.phone) {
            try {
              // Auto-send via WhatsApp
              await API.post('/whatsapp/test', {
                phone: f.phone,
                message: f.description || `Hi, this is an automated follow-up regarding ${f.type}. - Alpha Zone Gym`
              });
              
              await updateDoc(doc(db, 'followups', f.id), { status: 'Completed', notificationSent: true, completedAt: new Date().toISOString() });
              toast.success(`Automated WhatsApp sent for ${f.title || 'Follow-up'}`);
            } catch(e) {
              console.error('Failed to auto-send WhatsApp', e);
              // Fallback to normal notification if it fails
              setActiveAlarms(prev => {
                if (prev.find(p => p.id === f.id)) return prev;
                return [...prev, f];
              });
              try {
                await updateDoc(doc(db, 'followups', f.id), { notificationSent: true });
                await addDoc(collection(db, 'notifications'), {
                  title: 'Follow-up Due',
                  message: f.title || f.description,
                  type: 'pt',
                  read: false,
                  timestamp: new Date()
                });
              } catch(err) {
                console.error(err);
              }
            }
          } else {
            setActiveAlarms(prev => {
              if (prev.find(p => p.id === f.id)) return prev;
              return [...prev, f];
            });
            try {
              await updateDoc(doc(db, 'followups', f.id), { notificationSent: true });
              await addDoc(collection(db, 'notifications'), {
                title: 'Follow-up Due',
                message: f.title || f.description,
                type: 'pt',
                read: false,
                timestamp: new Date()
              });
            } catch(e) {
              console.error(e);
            }
          }
        }
      });
    }, 10000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const submitCompleteTask = async (e: React.FormEvent, f: any) => {
    e.preventDefault();
    if (processingAlarm) return;
    
    if (completeOutcome === 'Follow-up Scheduled' && (!rescheduleDate || !rescheduleTime)) {
      toast.error('Please select both date and time for rescheduling');
      return;
    }

    setProcessingAlarm(true);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'followups', f.id), { 
        status: 'Completed', 
        completedAt: now,
        remarks: completeRemarks,
        clientResponse: clientResponse,
        outcome: completeOutcome
      });

      if (completeOutcome === 'Follow-up Scheduled') {
        const scheduledDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`);
        await addDoc(collection(db, 'followups'), {
          memberId: f.memberId || null,
          enquiryId: f.enquiryId || null,
          employeeId: f.employeeId || null,
          type: f.type || 'Manual',
          priority: f.priority || 'Medium',
          title: `Follow-up: ${f.title || f.type}`,
          description: completeRemarks || 'Rescheduled follow-up',
          assignedTo: f.assignedTo || 'Admin',
          scheduledDate: rescheduleDate,
          scheduledTime: rescheduleTime,
          scheduledTimestamp: scheduledDateTime.getTime(),
          status: 'Pending',
          createdAt: now,
          updatedAt: now
        });
      }

      if (f.memberId || f.enquiryId) {
        await addDoc(collection(db, 'communications'), {
          memberId: f.memberId || null,
          enquiryId: f.enquiryId || null,
          type: f.type || 'Follow-up',
          content: completeRemarks || `Completed follow-up: ${f.title}`,
          outcome: completeOutcome,
          timestamp: new Date(),
          author: 'Admin'
        });
      }

      toast.success('Follow-up completed!');
      setActiveAlarms(prev => prev.filter(a => a.id !== f.id));
      setCompleteRemarks('');
      setClientResponse('');
      setCompleteOutcome('Connected');
      setRescheduleDate('');
      setRescheduleTime('');
    } catch (err) {
      toast.error('Failed to complete task');
    } finally {
      setProcessingAlarm(false);
    }
  };

  const skipAlarm = (f: any) => {
    setActiveAlarms(prev => prev.filter(a => a.id !== f.id));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'expiry': return <AlertTriangle size={14} className="text-red-500" />;
      case 'birthday': return <Gift size={14} className="text-purple-500" />;
      case 'payment': return <DollarSign size={14} className="text-orange-500" />;
      case 'pt': return <Dumbbell size={14} className="text-blue-500" />;
      default: return <Info size={14} className="text-slate-500" />;
    }
  };

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await markAsRead(n.id);
    }
  };

  return (
    <>
      {!hideIcon && (
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="relative w-10 h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-sm cursor-pointer border border-slate-100 transition-colors"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white" />
            )}
          </button>

          <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-80 bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-50 flex flex-col"
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-800">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-[10px] font-bold text-blue-600 hover:text-blue-800">
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  No new notifications
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!notif.read ? 'bg-blue-50/30' : ''}`}
                      onClick={() => {
                        if (!notif.read) markAsRead(notif.id);
                      }}
                    >
                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!notif.read ? 'bg-white shadow-sm border border-slate-100' : 'bg-slate-100'}`}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-xs ${!notif.read ? 'font-black text-slate-900' : 'font-semibold text-slate-600'}`}>
                          {notif.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{notif.message}</p>
                        <span className="text-[9px] font-bold text-slate-400 mt-1 block">
                          {notif.timestamp ? (
                            typeof notif.timestamp.toDate === 'function' 
                              ? notif.timestamp.toDate().toLocaleString() 
                              : new Date(notif.timestamp).toLocaleString()
                          ) : 'Just now'}
                        </span>
                      </div>
                      {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
              <button className="text-[10px] font-black text-slate-500 hover:text-slate-800 uppercase tracking-wider">
                View All History
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
        </div>
      )}

      {/* PERSISTENT ALARMS OVERLAY */}
      <AnimatePresence>
        {activeAlarms.length > 0 && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            {/* Audio alarm sound handled by Web Audio API in useEffect */}
            
            {activeAlarms.map((f, idx) => (
              <motion.div 
                key={f.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.4)] border-4 border-red-500 w-full max-w-md overflow-hidden relative overflow-y-auto max-h-[90vh]"
                style={{ zIndex: 9999 + idx }}
              >
                <div className="bg-red-500 px-6 py-5 flex items-center justify-between relative overflow-hidden">
                  <div className="absolute inset-0 bg-red-600 animate-ping opacity-30"></div>
                  <h3 className="text-white font-black flex items-center gap-2 uppercase tracking-widest text-lg relative z-10 animate-pulse">
                    <Bell size={24}/> ALARM RINGING!
                  </h3>
                  <button onClick={() => skipAlarm(f)} className="text-white/80 hover:text-white p-2 rounded-xl transition-colors bg-black/20 hover:bg-black/30 relative z-10"><X size={20}/></button>
                </div>
                
                <div className="p-6 bg-red-50/30">
                  <h4 className="text-xl font-black text-slate-800 mb-1">{f.title || 'Scheduled Follow-up'}</h4>
                  <p className="text-sm font-semibold text-slate-600 mb-4">{f.description}</p>
                  
                  <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-md">
                    <h5 className="text-xs font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <MessageCircle size={14}/> Take Action Now
                    </h5>
                    
                    <form onSubmit={(e) => submitCompleteTask(e, f)} className="space-y-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Outcome</label>
                        <select value={completeOutcome} onChange={e => setCompleteOutcome(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all cursor-pointer">
                          <option value="Connected">Connected</option>
                          <option value="Resolved">Resolved</option>
                          <option value="No Answer">No Answer / Missed</option>
                          <option value="Not Interested">Not Interested</option>
                          <option value="Follow-up Scheduled">Follow-up Scheduled</option>
                        </select>
                      </div>
                      
                      {completeOutcome === 'Follow-up Scheduled' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Date *</label>
                            <input type="date" required value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all" />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Time *</label>
                            <input type="time" required value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all" />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Client Response / Answer</label>
                        <textarea required value={clientResponse} onChange={e => setClientResponse(e.target.value)} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all resize-none mb-3" placeholder="What did the client say?" />
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Remarks / Notes</label>
                        <textarea value={completeRemarks} onChange={e => setCompleteRemarks(e.target.value)} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all resize-none" placeholder="Internal notes" />
                      </div>
                      
                      {!snoozeMode ? (
                        <div className="pt-2 flex gap-2">
                          <button type="button" onClick={() => setSnoozeMode(true)} className="w-1/3 py-3 rounded-xl bg-slate-100 text-slate-600 font-black text-xs hover:bg-slate-200 transition-all uppercase tracking-widest flex items-center justify-center gap-1.5">
                            <Clock size={16}/> Snooze
                          </button>
                          <button type="submit" disabled={processingAlarm} className="w-2/3 py-3 rounded-xl bg-red-500 text-white font-black text-xs shadow-xl shadow-red-500/40 hover:bg-red-600 transition-all uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-1.5">
                            <Check size={16}/> {processingAlarm ? 'Saving...' : 'Complete'}
                          </button>
                        </div>
                      ) : (
                        <div className="pt-2 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 shadow-inner">
                          <h6 className="text-xs font-black text-slate-800 mb-3 flex items-center gap-2"><Clock size={14}/> SNOOZE SETTINGS</h6>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Date</label>
                              <input type="date" required value={snoozeDate} onChange={e => setSnoozeDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Time</label>
                              <input type="time" required value={snoozeTime} onChange={e => setSnoozeTime(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setSnoozeMode(false)} className="w-1/2 py-2.5 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300">Cancel</button>
                            <button type="button" onClick={() => handleSnooze(f)} disabled={processingAlarm} className="w-1/2 py-2.5 rounded-lg bg-blue-500 text-white font-bold text-xs hover:bg-blue-600 shadow-md">Confirm Snooze</button>
                          </div>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
