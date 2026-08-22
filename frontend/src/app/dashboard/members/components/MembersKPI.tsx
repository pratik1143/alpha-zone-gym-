'use client';

import React, { useMemo } from 'react';
import { Users, CheckCircle2, Clock, Activity, IndianRupee } from 'lucide-react';
import { useGymStore } from '@/store';

export default function MembersKPI() {
  const { members, dashboardAnalytics, attendance } = useGymStore();

  const stats = useMemo(() => {
    const today = new Date();
    let expiringThisMonth = 0;
    let ptMembers = 0;
    let revenueThisMonth = 0;

    members.forEach((m: any) => {
      // Calculate expiring this month
      if (m.expiryDate) {
        const exp = new Date(m.expiryDate);
        if (exp.getMonth() === today.getMonth() && exp.getFullYear() === today.getFullYear()) {
          expiringThisMonth++;
        }
      }
      
      // Calculate PT members
      if (m.trainer && m.trainer.trim() !== '') {
        ptMembers++;
      }
      
      // Calculate revenue using actual member amounts
      const amt = Number(m.amount ?? m.currentAmount ?? m.paidAmount ?? 0);
      revenueThisMonth += amt;
    });

    // Calculate unique members who punched today
    const todayStr = today.toISOString().split('T')[0];
    const todayPunches = new Set();
    
    // We need attendance from store
    const attendanceLogs = attendance || [];
    attendanceLogs.forEach((log: any) => {
      if (log.checkIn && log.checkIn.startsWith(todayStr)) {
        todayPunches.add(log.memberId);
      }
    });

    return {
      total: members.length,
      activeToday: todayPunches.size, // Use actual punches today!
      expiring: expiringThisMonth,
      pt: ptMembers,
      revenue: revenueThisMonth
    };
  }, [members, dashboardAnalytics, attendance]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      {/* Total Members */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(11,92,190,0.04)] border border-[#d9e7f7] flex flex-col justify-between hover:border-[#0b5cbe] transition-all">
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500">Total Members</span>
          <div className="w-8 h-8 rounded-full bg-[#eaf3ff] flex items-center justify-center text-[#0b5cbe]">
            <Users size={14} strokeWidth={2.5} />
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-2xl font-black text-[#10233f]">{stats.total}</h3>
          <p className="text-[10px] font-bold text-[#0b5cbe] mt-1 flex items-center gap-1">
            <span>&uarr; 12%</span> <span className="text-slate-400 font-medium">this month</span>
          </p>
        </div>
        <div className="mt-4 h-6 w-full opacity-60">
          <svg viewBox="0 0 100 20" className="w-full h-full preserve-aspect-ratio-none">
            <path d="M0,15 Q20,5 40,15 T80,10 T100,5" fill="none" stroke="#0b5cbe" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Active Today */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(11,92,190,0.04)] border border-[#d9e7f7] flex flex-col justify-between hover:border-[#0b5cbe] transition-all">
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500">Active Today</span>
          <div className="w-8 h-8 rounded-full bg-[#eaf3ff] flex items-center justify-center text-[#0b5cbe]">
            <CheckCircle2 size={14} strokeWidth={2.5} />
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-2xl font-black text-[#10233f]">{stats.activeToday}</h3>
          <p className="text-[10px] font-bold text-[#0b5cbe] mt-1 flex items-center gap-1">
            <span>&uarr; 8%</span>
          </p>
        </div>
        <div className="mt-4 h-6 w-full opacity-60">
          <svg viewBox="0 0 100 20" className="w-full h-full preserve-aspect-ratio-none">
            <path d="M0,15 Q20,10 40,15 T80,5 T100,10" fill="none" stroke="#2876d0" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Expiring This Month */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(11,92,190,0.04)] border border-[#d9e7f7] flex flex-col justify-between hover:border-[#0b5cbe] transition-all">
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500">Expiring This Month</span>
          <div className="w-8 h-8 rounded-full bg-[#eaf3ff] flex items-center justify-center text-[#0b5cbe]">
            <Clock size={14} strokeWidth={2.5} />
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-2xl font-black text-[#10233f]">{stats.expiring}</h3>
          <p className="text-[10px] font-bold text-[#0b5cbe] mt-1 flex items-center gap-1">
            <span>&darr; 2%</span>
          </p>
        </div>
        <div className="mt-4 h-6 w-full opacity-60">
          <svg viewBox="0 0 100 20" className="w-full h-full preserve-aspect-ratio-none">
            <path d="M0,10 Q20,15 40,5 T80,15 T100,10" fill="none" stroke="#0040d0" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* PT Members */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(11,92,190,0.04)] border border-[#d9e7f7] flex flex-col justify-between hover:border-[#0b5cbe] transition-all">
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500">PT Members</span>
          <div className="w-8 h-8 rounded-full bg-[#eaf3ff] flex items-center justify-center text-[#0b5cbe]">
            <Activity size={14} strokeWidth={2.5} />
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-2xl font-black text-[#10233f]">{stats.pt}</h3>
          <p className="text-[10px] font-bold text-[#0b5cbe] mt-1 flex items-center gap-1">
            <span>&uarr; 15%</span>
          </p>
        </div>
        <div className="mt-4 h-6 w-full opacity-60">
          <svg viewBox="0 0 100 20" className="w-full h-full preserve-aspect-ratio-none">
            <path d="M0,15 Q20,5 40,15 T80,10 T100,5" fill="none" stroke="#0b5cbe" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Revenue This Month */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(11,92,190,0.04)] border border-[#d9e7f7] flex flex-col justify-between hover:border-[#0b5cbe] transition-all">
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500">Revenue This Month</span>
          <div className="w-8 h-8 rounded-full bg-[#eaf3ff] flex items-center justify-center text-[#0b5cbe]">
            <IndianRupee size={14} strokeWidth={2.5} />
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-2xl font-black text-[#10233f]">₹{stats.revenue.toLocaleString()}</h3>
          <p className="text-[10px] font-bold text-[#0b5cbe] mt-1 flex items-center gap-1">
            <span>&uarr; 18%</span>
          </p>
        </div>
        <div className="mt-4 h-6 w-full opacity-60">
          <svg viewBox="0 0 100 20" className="w-full h-full preserve-aspect-ratio-none">
            <path d="M0,15 Q20,10 40,15 T80,5 T100,10" fill="none" stroke="#2876d0" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

    </div>
  );
}
