'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Smartphone, UserCheck, UserX, RefreshCw, Search, Shield,
  ShieldOff, ShieldCheck, Wifi, WifiOff, Key, Eye, EyeOff,
  CheckCircle2, XCircle, Clock, AlertCircle, Users, Zap
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db as fDb, isFirebaseReady } from '@/lib/firebase';
import toast from 'react-hot-toast';

interface MemberAppData {
  id: string;
  name: string;
  status: string;
  plan: string;
  phone: string;
  appAccessEnabled?: boolean;
  appEmail?: string;
  authUid?: string;
  expiryDate?: string;
  originalDocId?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function MemberAppPage() {
  const [members, setMembers]       = useState<MemberAppData[]>([]);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState<'all' | 'active' | 'expired' | 'enabled' | 'disabled'>('all');
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword]   = useState(false);

  // Live Firestore listener
  useEffect(() => {
    if (!isFirebaseReady || !fDb) return;
    const unsub = onSnapshot(collection(fDb, 'members'), (snap) => {
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as MemberAppData))
        .filter(m => !m['originalDocId']); // skip mirror docs
      setMembers(all);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── stats ──────────────────────────────────────────────────────────────────
  const activeMembers  = members.filter(m => m.status === 'active');
  const expiredMembers = members.filter(m => m.status !== 'active');
  const enabledCount   = members.filter(m => m.appAccessEnabled).length;
  const disabledCount  = members.filter(m => !m.appAccessEnabled).length;

  // ── filtered list ──────────────────────────────────────────────────────────
  const filtered = members.filter(m => {
    if (m['originalDocId']) return false;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      m.name?.toLowerCase().includes(q) ||
      m.phone?.includes(q) ||
      m.appEmail?.toLowerCase().includes(q);

    const matchFilter =
      filter === 'all'      ? true :
      filter === 'active'   ? m.status === 'active' :
      filter === 'expired'  ? m.status !== 'active' :
      filter === 'enabled'  ? !!m.appAccessEnabled :
      filter === 'disabled' ? !m.appAccessEnabled : true;

    return matchSearch && matchFilter;
  });

  // ── API calls ───────────────────────────────────────────────────────────────

  const provision = useCallback(async (memberId: string, memberName: string) => {
    setActionLoading(memberId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/member-app/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(`✅ App access granted to ${memberName}!\nEmail: ${data.email}`, { duration: 4000 });
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const revoke = useCallback(async (memberId: string, memberName: string) => {
    setActionLoading(memberId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/member-app/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(`🔒 App access revoked for ${memberName}`);
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const toggleAccess = useCallback(async (member: MemberAppData) => {
    if (member.appAccessEnabled) {
      await revoke(member.id, member.name);
    } else {
      if (member.status !== 'active') {
        toast.error(`${member.name} is expired. Renew membership first.`);
        return;
      }
      await provision(member.id, member.name);
    }
  }, [provision, revoke]);

  // ── helpers ─────────────────────────────────────────────────────────────────

  const daysLeft = (dateStr?: string) => {
    if (!dateStr) return 0;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (m: MemberAppData) => {
    if (m.status !== 'active') return 'text-red-500 bg-red-50 border-red-100';
    if (m.appAccessEnabled) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    return 'text-slate-500 bg-slate-50 border-slate-100';
  };

  const getStatusLabel = (m: MemberAppData) => {
    if (m.status !== 'active') return 'Expired';
    if (m.appAccessEnabled) return 'App Active';
    return 'No Access';
  };

  return (
    <div className="flex flex-col gap-6 w-full text-slate-800">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-rowdies text-3xl md:text-4xl font-bold text-slate-900 uppercase tracking-tight leading-none flex items-center gap-3">
            <Smartphone size={32} className="text-purple-600" />
            Member App Access
          </h2>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">
            Manage which members can log into the Alpha Zone mobile app.
          </p>
        </div>

        {/* Password badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-2xl text-xs font-black">
            <Key size={14} className="text-[#d4ff00]" />
            Default Password:&nbsp;
            <span className="font-mono tracking-widest">
              {showPassword ? '1234567' : '•••••••'}
            </span>
            <button onClick={() => setShowPassword(!showPassword)} className="ml-1 text-slate-400 hover:text-white cursor-pointer border-none bg-transparent">
              {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Members',   value: activeMembers.length,  icon: UserCheck,    color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Expired Members',  value: expiredMembers.length, icon: UserX,        color: 'text-red-500',     bg: 'bg-red-50' },
          { label: 'App Access ON',    value: enabledCount,          icon: ShieldCheck,  color: 'text-purple-500',  bg: 'bg-purple-50' },
          { label: 'App Access OFF',   value: disabledCount,         icon: ShieldOff,    color: 'text-slate-400',   bg: 'bg-slate-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-100 p-5 rounded-[24px] shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{stat.value}</div>
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-100 rounded-[20px] p-4 flex items-start gap-3">
        <Zap size={18} className="text-purple-500 shrink-0 mt-0.5" />
        <div className="text-xs text-purple-800 font-medium leading-relaxed">
          <strong>Auto-provisioning enabled:</strong> When a member's status changes to <strong>active</strong> (after renewal), 
          their app account is automatically created. Email format: <code className="bg-purple-100 px-1 rounded font-mono">firstname@alpha.com</code> or <code className="bg-purple-100 px-1 rounded font-mono">firstname.lastname@alpha.com</code> for duplicate names. 
          Password: <strong>1234567</strong>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone or email..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 outline-none focus:border-purple-400 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'expired', 'enabled', 'disabled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer border transition-all ${
                filter === f
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white border border-slate-100 rounded-[24px] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Members ({filtered.length})
          </span>
          <span className="text-[9px] text-slate-400 font-bold">
            Live synced from Firestore
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
              <RefreshCw size={16} className="animate-spin" />
              <span className="text-xs font-bold">Loading members...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-slate-400 flex-col gap-2">
              <Users size={24} className="text-slate-300" />
              <span className="text-xs font-bold">No members found</span>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Member</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3">App Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(member => {
                  const days     = daysLeft(member.expiryDate);
                  const isLoading = actionLoading === member.id;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Member */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 text-[9px] font-black flex items-center justify-center shrink-0">
                            {(member.name || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-800">{member.name}</div>
                            <div className="text-[8.5px] text-slate-400 font-semibold">{member.phone}</div>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3.5">
                        <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                          {member.plan || 'Monthly'}
                        </span>
                      </td>

                      {/* Expiry */}
                      <td className="px-4 py-3.5">
                        <div className="text-[9px] font-bold">
                          {member.expiryDate ? (
                            <span className={days < 0 ? 'text-red-500' : days <= 7 ? 'text-orange-500' : 'text-slate-600'}>
                              {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </div>
                      </td>

                      {/* App Email */}
                      <td className="px-4 py-3.5">
                        {member.appEmail ? (
                          <div className="flex items-center gap-1.5">
                            <Wifi size={10} className="text-emerald-500 shrink-0" />
                            <span className="text-[9px] font-mono font-bold text-slate-600 truncate max-w-[140px]">
                              {member.appEmail}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <WifiOff size={10} className="text-slate-300 shrink-0" />
                            <span className="text-[9px] text-slate-300 font-bold">No account</span>
                          </div>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border ${getStatusColor(member)}`}>
                          {getStatusLabel(member)}
                        </span>
                      </td>

                      {/* Toggle action */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => toggleAccess(member)}
                          disabled={isLoading}
                          className={`px-3 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider cursor-pointer border-none transition-all flex items-center gap-1 ml-auto ${
                            member.appAccessEnabled
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : member.status === 'active'
                                ? 'bg-black text-white hover:bg-black/80'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          {isLoading ? (
                            <RefreshCw size={10} className="animate-spin" />
                          ) : member.appAccessEnabled ? (
                            <><ShieldOff size={10} /> Revoke</>
                          ) : (
                            <><Shield size={10} /> Grant</>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
