'use client';

import React, { useState, useEffect } from 'react';
import { Snowflake, RefreshCw, Send, ShieldAlert, Plus, CheckCircle, Star, Zap, Crown, Shield } from 'lucide-react';
import { useGymStore } from '@/store';
import { formatDate, daysUntilExpiry } from '@/lib/utils';
import toast from 'react-hot-toast';

const plansData = [
  {
    id: 'p_mon',
    name: 'Monthly Standard',
    price: 2500,
    duration: '30 Days',
    icon: Shield,
    accent: '#3b82f6',
    accentBg: 'rgba(59,130,246,0.08)',
    border: '2px solid rgba(59,130,246,0.2)',
    badge: null,
    features: ['Biometric Access Roster', 'Daily facility check-ins', 'Locker Room access'],
  },
  {
    id: 'p_qrt',
    name: 'Quarterly Prime',
    price: 6500,
    duration: '90 Days',
    icon: Zap,
    accent: '#8b5cf6',
    accentBg: 'rgba(139,92,246,0.08)',
    border: '2px solid rgba(139,92,246,0.2)',
    badge: 'Popular',
    features: ['All Monthly benefits', '2 PT consultation sessions', 'Steam Bath Access'],
  },
  {
    id: 'p_semi',
    name: 'Semi-Annual Pro',
    price: 11500,
    duration: '180 Days',
    icon: Star,
    accent: '#10b981',
    accentBg: 'rgba(16,185,129,0.08)',
    border: '2px solid rgba(16,185,129,0.2)',
    badge: 'Best Value',
    features: ['All Quarterly benefits', 'Diet & Nutrition builder', 'Body fat measurements'],
  },
  {
    id: 'p_ann',
    name: 'Annual Premium',
    price: 18000,
    duration: '365 Days',
    icon: Crown,
    accent: '#f59e0b',
    accentBg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fef9ec 100%)',
    border: '2px solid rgba(245,158,11,0.35)',
    badge: '🏆 Elite',
    features: ['All Semi-Annual benefits', 'Dedicated coach + personal locker', 'Guest passes (5/month)'],
  },
];

export default function MembershipsPage() {
  const { members, fetchMembers, addPayment, toggleFreeze } = useGymStore();
  const [expiringMembers, setExpiringMembers] = useState<any[]>([]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  useEffect(() => {
    setExpiringMembers(members.filter(m => daysUntilExpiry(m.expiryDate) <= 15));
  }, [members]);

  const handleRenew = async (member: any) => {
    const map: Record<string, number> = { 'Monthly': 2500, 'Quarterly': 6500, 'Semi-Annual': 11500, 'Annual Premium': 18000 };
    try {
      await addPayment({ memberId: member.id, amount: map[member.plan] || 2500, plan: member.plan, method: 'UPI' });
      toast.success(`Contract renewed for ${member.name}!`);
      fetchMembers();
    } catch { toast.error('Failed to renew'); }
  };

  const handleToggleFreeze = async (member: any) => {
    try {
      await toggleFreeze(member.id);
      toast.success(`Status updated for ${member.name}`);
      fetchMembers();
    } catch { toast.error('Failed to update status'); }
  };

  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-display">Membership Plans</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage subscription packages, contract renewals, and freezes.</p>
        </div>
        <button
          onClick={() => toast.success('New plan customization tool opened!')}
          className="btn-cyber-cyan text-xs py-2 px-5 cursor-pointer"
        >
          <Plus size={14} /> Create Package
        </button>
      </div>

      {/* Plan Grid Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {plansData.map(plan => {
          const Icon = plan.icon;
          const isAnnual = plan.id === 'p_ann';
          return (
            <div
              key={plan.id}
              className="relative rounded-[22px] p-6 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                background: isAnnual ? plan.accentBg : '#ffffff',
                border: plan.border,
                boxShadow: isAnnual
                  ? '0 8px 32px rgba(245,158,11,0.18), 0 2px 8px rgba(245,158,11,0.1)'
                  : `0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)`,
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{
                    background: isAnnual ? 'rgba(245,158,11,0.2)' : `${plan.accent}18`,
                    color: plan.accent,
                    border: `1px solid ${plan.accent}35`,
                  }}
                >
                  {plan.badge}
                </div>
              )}

              {/* Icon + Duration */}
              <div className="mb-5">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: `${plan.accent}18`, border: `1.5px solid ${plan.accent}30` }}
                >
                  <Icon size={20} style={{ color: plan.accent }} />
                </div>
                <div className="text-[9px] font-black uppercase tracking-[0.18em] mb-1" style={{ color: plan.accent }}>
                  {plan.duration}
                </div>
                <h3 className="text-[17px] font-black text-slate-900 leading-tight">{plan.name}</h3>
              </div>

              {/* Price */}
              <div className="mb-5 flex items-end gap-1">
                <span className="text-4xl font-black text-slate-900">₹{plan.price.toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-slate-400 font-semibold pb-1.5">GST incl.</span>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6">
                {plan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[11px] text-slate-600 font-medium">
                    <CheckCircle size={13} className="mt-0.5 flex-shrink-0" style={{ color: plan.accent }} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => toast.success(`Form prefilled for ${plan.name}`)}
                className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none"
                style={{
                  background: isAnnual
                    ? `linear-gradient(135deg, ${plan.accent} 0%, #d97706 100%)`
                    : `${plan.accent}15`,
                  color: isAnnual ? '#ffffff' : plan.accent,
                  border: isAnnual ? 'none' : `1.5px solid ${plan.accent}30`,
                  boxShadow: isAnnual ? `0 4px 14px ${plan.accent}40` : 'none',
                }}
                onMouseEnter={e => {
                  if (!isAnnual) {
                    (e.currentTarget as HTMLButtonElement).style.background = `${plan.accent}25`;
                  }
                }}
                onMouseLeave={e => {
                  if (!isAnnual) {
                    (e.currentTarget as HTMLButtonElement).style.background = `${plan.accent}15`;
                  }
                }}
              >
                {isAnnual ? '👑 Configure Elite Plan' : 'Configure Plan'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Expiry Alerts Table */}
      <div
        className="rounded-[20px] overflow-hidden"
        style={{
          background: '#ffffff',
          border: '1px solid rgba(15,23,42,0.07)',
          boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
        }}
      >
        {/* Table Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
              <ShieldAlert size={15} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">Membership Expiry Alerts</h3>
              <p className="text-[10px] text-slate-400 font-medium">Members expiring within 15 days</p>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-100">
            {expiringMembers.length} At Risk
          </span>
        </div>

        <div className="overflow-x-auto">
          {expiringMembers.length > 0 ? (
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Contract Plan</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expiringMembers.map(m => {
                  const days = daysUntilExpiry(m.expiryDate);
                  return (
                    <tr key={m.id}>
                      <td className="font-bold text-slate-900">{m.name}</td>
                      <td className="text-slate-500 text-xs">{m.plan}</td>
                      <td className="text-slate-400 text-xs font-mono">{formatDate(m.expiryDate)}</td>
                      <td>
                        <span
                          className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
                          style={days > 0
                            ? { background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.2)' }
                            : { background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }
                          }
                        >
                          {days > 0 ? `${days}d left` : `${Math.abs(days)}d expired`}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRenew(m)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer border-none transition-all"
                            style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}
                          >
                            <RefreshCw size={10} /> Quick Renew
                          </button>
                          <button
                            onClick={() => handleToggleFreeze(m)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer border-none transition-all"
                            style={{ background: 'rgba(100,116,139,0.08)', color: '#64748b', border: '1px solid rgba(100,116,139,0.15)' }}
                          >
                            <Snowflake size={10} /> {m.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                          </button>
                          <button
                            onClick={() => toast.success(`WhatsApp alert sent to ${m.name}`)}
                            className="p-1.5 rounded-lg text-[10px] font-black cursor-pointer border-none transition-all"
                            style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }}
                            title="Send WhatsApp"
                          >
                            <Send size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={22} className="text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-slate-700">All memberships are healthy!</p>
              <p className="text-xs text-slate-400 mt-1">No members expiring in the next 15 days.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
