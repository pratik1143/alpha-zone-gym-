'use client';

import React, { useMemo } from 'react';
import { useFollowups } from '@/hooks/useFollowups';
import { Phone, MessageCircle, CheckCircle2, Clock, Calendar, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FollowUpsTab({ member }: { member: any }) {
  const { followups, completeFollowup } = useFollowups();

  const memberId = member?.id || member?.uid || member?.memberId;

  const memberFollowups = useMemo(() => {
    if (!memberId) return [];
    return followups.filter(f => 
      f.memberId === memberId || 
      (member.phone && f.phone === member.phone) ||
      (member.name && f.memberName === member.name)
    );
  }, [followups, memberId, member]);

  const handleComplete = async (id: string) => {
    try {
      await completeFollowup(id, 'Completed from member profile', 'Connected', memberId);
      toast.success('Follow-up marked as completed!');
    } catch (err: any) {
      toast.error('Failed to complete follow-up');
    }
  };

  return (
    <div className="bg-white rounded-[32px] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-slate-100 p-6 md:p-8 space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Follow-Up History & Tasks</h2>
          <p className="text-xs text-slate-500 font-medium">Automatic renewal alerts and staff callback tasks for {member?.name}</p>
        </div>
        <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
          {memberFollowups.length} Total Task(s)
        </span>
      </div>

      {memberFollowups.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-200/60 space-y-2">
          <Clock size={28} className="mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700">No Follow-ups for this Member</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Automated follow-ups will be generated when membership or PT package approaches expiry (7 days & 4 days before) or when balance is pending.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {memberFollowups.map(task => {
            const isAutomatic = task.source === 'automatic' || !!task.automationKey;
            const normPriority = (task.priority || 'Medium').toLowerCase();
            const isHighPriority = normPriority === 'high' || normPriority === 'critical' || normPriority === 'urgent';

            let typeBadgeClass = 'bg-slate-100 text-slate-700';
            if (task.type === 'GYM MEMBERSHIP RENEWAL' || task.type === 'Renewal') {
              typeBadgeClass = 'bg-blue-100 text-blue-800 border border-blue-200';
            } else if (task.type === 'PT RENEWAL' || task.type === 'PT') {
              typeBadgeClass = 'bg-purple-100 text-purple-800 border border-purple-200';
            } else if (task.type === 'PENDING BALANCE' || task.type === 'Payment') {
              typeBadgeClass = 'bg-amber-100 text-amber-900 border border-amber-200';
            }

            return (
              <div 
                key={task.id} 
                className={`p-4 rounded-2xl border transition-all ${
                  task.status === 'Completed' 
                    ? 'bg-slate-50/60 border-slate-200/60 opacity-80' 
                    : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${typeBadgeClass}`}>
                        {task.type || 'Follow-up'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isHighPriority ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {task.priority || 'Medium'}
                      </span>
                      {isAutomatic && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ⚡ Auto
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        task.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {task.status}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800">
                      {task.reason || task.notes || task.description || task.title}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      <span>📅 Due: {task.dueDate || task.scheduledDate}</span>
                      <span>•</span>
                      <span>Assigned: {task.assignedTo || 'Receptionist'}</span>
                    </div>
                  </div>

                  {task.status !== 'Completed' && (
                    <div className="flex items-center gap-2 shrink-0">
                      {task.phone && (
                        <>
                          <a 
                            href={`tel:${task.phone}`} 
                            className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1 no-underline"
                          >
                            <Phone size={12} /> Call
                          </a>
                          <a 
                            href={`https://wa.me/91${task.phone.replace(/[^0-9]/g, '')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1 no-underline"
                          >
                            <MessageCircle size={12} /> WhatsApp
                          </a>
                        </>
                      )}
                      <button 
                        onClick={() => handleComplete(task.id)}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 border-none cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 size={12} /> Complete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
