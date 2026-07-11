"use client";

import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useGymStore } from "@/store";
import { IndianRupee } from "lucide-react";

export default function FinancialAnalytics() {
  const { payments } = useGymStore();

  const data = useMemo(() => {
    // Generate last 7 days data
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    return last7Days.map(dateStr => {
      const dayPayments = payments.filter((p: any) => (p.date || p.createdAt || "").startsWith(dateStr));
      const membership = dayPayments.filter(p => !p.isPT).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const pt = dayPayments.filter(p => p.isPT).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      
      const d = new Date(dateStr);
      return {
        name: d.toLocaleDateString("en-US", { weekday: "short" }),
        Membership: membership,
        PT: pt,
        Total: membership + pt
      };
    });
  }, [payments]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-700/50">
          <p className="font-bold text-xs text-slate-400 mb-2">{label}</p>
          <p className="text-sm font-black text-indigo-400">Membership: ₹{payload[0]?.value?.toLocaleString()}</p>
          <p className="text-sm font-black text-purple-400">PT: ₹{payload[1]?.value?.toLocaleString()}</p>
          <div className="h-px bg-slate-700 my-2"></div>
          <p className="text-sm font-black text-emerald-400">Total: ₹{(payload[0]?.value + payload[1]?.value)?.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mt-6 relative">
      <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-50 -z-10 pointer-events-none" />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            Financial Analytics
          </h2>
          <p className="text-xs text-slate-500 font-medium">Revenue trends for the last 7 days</p>
        </div>
        <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full flex items-center gap-1 text-xs font-bold border border-emerald-100">
          <IndianRupee size={12} />
          +14% Growth
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMembership" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPT" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} tickFormatter={(value) => `₹${value}`} dx={-10} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '5 5' }} />
            <Area type="monotone" dataKey="Membership" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorMembership)" />
            <Area type="monotone" dataKey="PT" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorPT)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
