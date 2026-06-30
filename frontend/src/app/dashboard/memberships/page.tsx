'use client';

import React, { useState, useEffect } from 'react';
import { Snowflake, RefreshCw, Send, ShieldAlert, Plus, CheckCircle, Star, Zap, Crown, Shield } from 'lucide-react';
import { useGymStore } from '@/store';
import { formatDate, daysUntilExpiry } from '@/lib/utils';
import toast from 'react-hot-toast';

const IconMap: Record<string, any> = {
  Shield,
  Zap,
  Star,
  Crown
};

// Fallback plans if database hasn't loaded or is empty
const defaultPlansData = [
  {
    id: 'p_mon',
    name: 'Monthly Standard',
    price: 2500,
    duration: '30 Days',
    durationDays: 30,
    icon: 'Shield',
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
    durationDays: 90,
    icon: 'Zap',
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
    durationDays: 180,
    icon: 'Star',
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
    durationDays: 365,
    icon: 'Crown',
    accent: '#f59e0b',
    accentBg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fef9ec 100%)',
    border: '2px solid rgba(245,158,11,0.35)',
    badge: '🏆 Elite',
    features: ['All Semi-Annual benefits', 'Dedicated coach + personal locker', 'Guest passes (5/month)'],
  },
];

export default function MembershipsPage() {
  const { 
    members, fetchMembers, addPayment, toggleFreeze,
    plans, fetchPlans, addPlan, updatePlan, deletePlan
  } = useGymStore();

  const [expiringMembers, setExpiringMembers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);

  // Form states
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState(2500);
  const [planDuration, setPlanDuration] = useState('30 Days');
  const [planDurationDays, setPlanDurationDays] = useState(30);
  const [planBadge, setPlanBadge] = useState('');
  const [planAccent, setPlanAccent] = useState('#3b82f6');
  const [planIcon, setPlanIcon] = useState('Shield');
  const [planFeatures, setPlanFeatures] = useState<string[]>(['']);

  useEffect(() => {
    fetchMembers();
    fetchPlans();
  }, [fetchMembers, fetchPlans]);

  useEffect(() => {
    setExpiringMembers(members.filter(m => daysUntilExpiry(m.expiryDate) <= 15));
  }, [members]);

  const activePlans = plans && plans.length > 0 ? plans : defaultPlansData;

  const handleRenew = async (member: any) => {
    const matchedPlan = activePlans.find(p => p.name === member.plan || p.id === member.plan);
    const amount = matchedPlan ? matchedPlan.price : 2500;
    try {
      await addPayment({ memberId: member.id, amount, plan: member.plan, method: 'UPI' });
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

  const openCreateModal = () => {
    setEditingPlan(null);
    setPlanName('');
    setPlanPrice(2500);
    setPlanDuration('30 Days');
    setPlanDurationDays(30);
    setPlanBadge('');
    setPlanAccent('#3b82f6');
    setPlanIcon('Shield');
    setPlanFeatures(['']);
    setShowModal(true);
  };

  const openEditModal = (plan: any) => {
    setEditingPlan(plan);
    setPlanName(plan.name || '');
    setPlanPrice(plan.price || 0);
    setPlanDuration(plan.duration || '');
    setPlanDurationDays(plan.durationDays || 30);
    setPlanBadge(plan.badge || '');
    setPlanAccent(plan.accent || '#3b82f6');
    setPlanIcon(plan.icon || 'Shield');
    setPlanFeatures(plan.features || ['']);
    setShowModal(true);
  };

  const handleFeatureChange = (index: number, value: string) => {
    const updated = [...planFeatures];
    updated[index] = value;
    setPlanFeatures(updated);
  };

  const addFeatureRow = () => setPlanFeatures([...planFeatures, '']);
  const removeFeatureRow = (index: number) => setPlanFeatures(planFeatures.filter((_, i) => i !== index));

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName || !planPrice || !planDurationDays) {
      toast.error('Name, Price, and Duration in Days are required.');
      return;
    }

    const accentBg = planIcon === 'Crown' 
      ? `linear-gradient(135deg, ${planAccent}15 0%, ${planAccent}30 100%)`
      : `${planAccent}0d`; 
    const border = `2px solid ${planAccent}33`;

    const planPayload = {
      name: planName,
      price: Number(planPrice),
      duration: planDuration || `${planDurationDays} Days`,
      durationDays: Number(planDurationDays),
      features: planFeatures.filter(f => f.trim() !== ''),
      badge: planBadge || null,
      accent: planAccent,
      accentBg,
      border,
      icon: planIcon
    };

    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, planPayload);
        toast.success(`Plan '${planName}' updated!`);
      } else {
        await addPlan({
          id: 'p_' + Date.now(),
          ...planPayload
        });
        toast.success(`Plan '${planName}' created successfully!`);
      }
      setShowModal(false);
      fetchPlans();
    } catch (err) {
      toast.error('Failed to save plan');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (confirm('Are you sure you want to delete this membership plan? This action cannot be undone.')) {
      try {
        await deletePlan(id);
        toast.success('Plan deleted successfully');
        setShowModal(false);
        fetchPlans();
      } catch (err) {
        toast.error('Failed to delete plan');
      }
    }
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
          onClick={openCreateModal}
          className="btn-cyber-cyan text-xs py-2 px-5 cursor-pointer flex items-center gap-1.5"
        >
          <Plus size={14} /> Create Package
        </button>
      </div>

      {/* Plan Grid Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {activePlans.map(plan => {
          const Icon = IconMap[plan.icon] || Shield;
          const isAnnual = plan.icon === 'Crown' || plan.id === 'p_ann';
          return (
            <div
              key={plan.id}
              className="relative rounded-[22px] p-6 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                background: isAnnual ? plan.accentBg : '#ffffff',
                border: plan.border || `2px solid ${plan.accent}33`,
                boxShadow: isAnnual
                  ? `0 8px 32px ${plan.accent}20, 0 2px 8px ${plan.accent}10`
                  : `0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)`,
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{
                    background: isAnnual ? `${plan.accent}33` : `${plan.accent}18`,
                    color: plan.accent,
                    border: `1px solid ${plan.accent}35`,
                  }}
                >
                  {plan.badge}
                </div>
              )}

              {/* Icon + Duration */}
              <div className="mb-5 text-left">
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
              <ul className="space-y-2.5 mb-6 text-left">
                {plan.features.map((feat: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[11px] text-slate-600 font-medium">
                    <CheckCircle size={13} className="mt-0.5 flex-shrink-0" style={{ color: plan.accent }} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => openEditModal(plan)}
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

      {/* Editor/Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg bg-white border border-slate-100 rounded-3xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="text-left">
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                  {editingPlan ? 'Edit Membership Plan' : 'Create New Package'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
                  Configure subscription details, pricing, and features
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold border-none bg-transparent cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePlan} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={planName}
                    onChange={e => setPlanName(e.target.value)}
                    placeholder="e.g. Monthly Standard"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-brand-cyan transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Price (INR) *</label>
                  <input
                    type="number"
                    required
                    value={planPrice}
                    onChange={e => setPlanPrice(Number(e.target.value))}
                    placeholder="2500"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-brand-cyan transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration (Days) *</label>
                  <input
                    type="number"
                    required
                    value={planDurationDays}
                    onChange={e => {
                      const d = Number(e.target.value);
                      setPlanDurationDays(d);
                      setPlanDuration(`${d} Days`);
                    }}
                    placeholder="30"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-brand-cyan transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Badge (Optional)</label>
                  <input
                    type="text"
                    value={planBadge}
                    onChange={e => setPlanBadge(e.target.value)}
                    placeholder="e.g. Popular or Elite"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-brand-cyan transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Accent Color & Theme</label>
                  <select
                    value={planAccent}
                    onChange={e => setPlanAccent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-brand-cyan transition-all"
                  >
                    <option value="#3b82f6">🔵 Blue (Standard)</option>
                    <option value="#8b5cf6">🟣 Violet (Prime)</option>
                    <option value="#10b981">🟢 Emerald (Pro)</option>
                    <option value="#f59e0b">🟡 Gold (Premium/Elite)</option>
                    <option value="#ef4444">🔴 Red (Special)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan Icon symbol</label>
                  <select
                    value={planIcon}
                    onChange={e => setPlanIcon(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-brand-cyan transition-all"
                  >
                    <option value="Shield">🛡️ Shield</option>
                    <option value="Zap">⚡ Zap</option>
                    <option value="Star">⭐ Star</option>
                    <option value="Crown">👑 Crown</option>
                  </select>
                </div>
              </div>

              {/* Feature bullet rows */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Plan Highlights & Features</label>
                  <button
                    type="button"
                    onClick={addFeatureRow}
                    className="text-[9px] font-black uppercase text-blue-500 hover:underline border-none bg-transparent cursor-pointer"
                  >
                    + Add Feature
                  </button>
                </div>
                <div className="space-y-2">
                  {planFeatures.map((feat, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={feat}
                        onChange={e => handleFeatureChange(idx, e.target.value)}
                        placeholder="e.g. Locker Room access"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-cyan transition-all"
                      />
                      {planFeatures.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFeatureRow(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl border-none bg-transparent cursor-pointer font-bold text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                {editingPlan ? (
                  <button
                    type="button"
                    onClick={() => handleDeletePlan(editingPlan.id)}
                    className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-55 hover:text-red-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer bg-white"
                  >
                    Delete Plan
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-black text-white hover:bg-slate-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    {editingPlan ? 'Save Changes' : 'Create Package'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

