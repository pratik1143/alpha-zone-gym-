'use client';

import React, { useState, useEffect } from 'react';
import { Snowflake, RefreshCw, Send, ShieldAlert, Plus, CheckCircle, Star, Zap, Crown, Shield, Search } from 'lucide-react';
import { useGymStore } from '@/store';
import { formatDate, daysUntilExpiry } from '@/lib/utils';
import toast from 'react-hot-toast';

const IconMap: Record<string, any> = {
  Shield,
  Zap,
  Star,
  Crown
};

// Fallback plans adhering strictly to Alpha Zone OS (#0B5CBE) theme
const defaultPlansData = [
  {
    id: 'p_mon',
    name: 'Monthly Standard',
    price: 2500,
    duration: '30 Days',
    durationDays: 30,
    icon: 'Shield',
    accent: '#0B5CBE',
    accentBg: '#ffffff',
    border: '1px solid rgba(226, 232, 240, 0.9)',
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
    accent: '#0B5CBE',
    accentBg: '#ffffff',
    border: '1px solid rgba(226, 232, 240, 0.9)',
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
    accentBg: '#ffffff',
    border: '1px solid rgba(226, 232, 240, 0.9)',
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
    accent: '#0B5CBE',
    accentBg: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)',
    border: '1px solid rgba(191, 217, 245, 0.9)',
    badge: 'Elite',
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
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState(2500);
  const [planDuration, setPlanDuration] = useState('30 Days');
  const [planDurationDays, setPlanDurationDays] = useState(30);
  const [planBadge, setPlanBadge] = useState('');
  const [planAccent, setPlanAccent] = useState('#0B5CBE');
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

  const filteredPlans = activePlans.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.duration?.toLowerCase().includes(q) ||
      p.price?.toString().includes(q) ||
      (p.badge && p.badge.toLowerCase().includes(q))
    );
  });

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
    setPlanAccent('#0B5CBE');
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
    setPlanAccent(plan.accent || '#0B5CBE');
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

    const accentBg = (planIcon === 'Crown' || (planBadge && planBadge.toLowerCase().includes('elite')))
      ? 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)'
      : '#ffffff'; 
    const border = (planIcon === 'Crown' || (planBadge && planBadge.toLowerCase().includes('elite')))
      ? '1px solid rgba(191, 217, 245, 0.9)'
      : '1px solid rgba(226, 232, 240, 0.9)';

    const planPayload = {
      name: planName,
      price: Number(planPrice),
      duration: planDuration || `${planDurationDays} Days`,
      durationDays: Number(planDurationDays),
      features: planFeatures.filter(f => f.trim() !== ''),
      badge: planBadge || null,
      accent: planAccent || '#0B5CBE',
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
    <div className="space-y-5 pb-10 max-w-7xl mx-auto px-1 sm:px-2">

      {/* ─── PAGE HEADER & ACTIONS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Membership Plans
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Manage subscription packages, contract renewals, and freezes.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="h-11 px-5 bg-[#0B5CBE] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 border-none shrink-0"
        >
          <Plus size={16} /> Create Package
        </button>
      </div>

      {/* ─── GLOBAL SEARCH BAR ─── */}
      <div className="relative max-w-[720px] w-full">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by plan name, duration, price, or category..."
          className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 focus:border-[#0B5CBE] focus:ring-2 focus:ring-blue-500/10 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
        />
      </div>

      {/* ─── COMPACT PLAN GRID (Responsive 4 -> 3 -> 2 -> 1) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4.5 lg:gap-5">
        {filteredPlans.map(plan => {
          const Icon = IconMap[plan.icon] || Shield;
          const isElite = plan.icon === 'Crown' || plan.id === 'p_ann' || (plan.badge && plan.badge.toLowerCase().includes('elite'));
          
          // Badge theme logic: No purple/yellow/orange
          let badgeBg = 'bg-blue-50 text-[#0B5CBE] border-blue-200/80';
          if (plan.badge) {
            const bLower = plan.badge.toLowerCase();
            if (bLower.includes('elite') || bLower.includes('crown')) {
              badgeBg = 'bg-[#0B5CBE] text-white border-transparent shadow-xs shadow-blue-500/20';
            } else if (bLower.includes('best value')) {
              badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
            }
          }

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-4.5 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 min-h-[310px] ${
                isElite
                  ? 'bg-gradient-to-br from-blue-50/90 via-white to-blue-50/50 border border-blue-200/90 shadow-sm shadow-blue-500/5 hover:border-blue-300'
                  : 'bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:shadow-blue-500/5 hover:border-blue-300'
              }`}
            >
              {/* Top Row: Icon + Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B5CBE] shrink-0">
                  <Icon size={20} className="text-[#0B5CBE]" />
                </div>
                {plan.badge && (
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${badgeBg}`}>
                    {plan.badge}
                  </span>
                )}
              </div>

              {/* Package Meta: Duration & Title */}
              <div className="text-left mb-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#0B5CBE] mb-0.5">
                  {plan.duration || `${plan.durationDays} Days`}
                </div>
                <h3 className="text-[18px] font-extrabold text-slate-900 leading-tight">
                  {plan.name}
                </h3>
              </div>

              {/* Price Display */}
              <div className="flex items-baseline gap-1.5 mb-3">
                <span className="text-[30px] sm:text-[32px] font-black text-slate-900 leading-none tracking-tight">
                  ₹{plan.price.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  GST incl.
                </span>
              </div>

              {/* Compact Features List */}
              {plan.features && plan.features.length > 0 && (
                <ul className="space-y-1.5 my-2 text-left flex-1">
                  {plan.features.slice(0, 3).map((feat: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-[11px] text-slate-600 font-medium leading-tight">
                      <CheckCircle size={13} className="text-[#0B5CBE] shrink-0" />
                      <span className="truncate">{feat}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* CTA Action Button */}
              <button
                onClick={() => openEditModal(plan)}
                className="w-full h-11 mt-3 bg-[#0B5CBE] hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none"
              >
                {isElite ? 'Configure Elite Plan' : 'Configure Plan'}
              </button>
            </div>
          );
        })}
      </div>

      {filteredPlans.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <p className="text-sm font-bold text-slate-700">No membership plans match your search.</p>
          <p className="text-xs text-slate-400 mt-1">Try clearing the search bar filter.</p>
        </div>
      )}

      {/* ─── MEMBERSHIP EXPIRY ALERTS TABLE ─── */}
      <div className="rounded-2xl overflow-hidden bg-white border border-slate-200/90 shadow-xs mt-6">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
              <ShieldAlert size={15} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
                Membership Expiry Alerts
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Members expiring within 15 days
              </p>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
            {expiringMembers.length} At Risk
          </span>
        </div>

        <div className="overflow-x-auto">
          {expiringMembers.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/30">
                  <th className="py-3 px-5">Member Name</th>
                  <th className="py-3 px-5">Contract Plan</th>
                  <th className="py-3 px-5">Expiry Date</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {expiringMembers.map(m => {
                  const days = daysUntilExpiry(m.expiryDate);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-5 font-bold text-slate-900">{m.name}</td>
                      <td className="py-3 px-5 text-slate-500">{m.plan}</td>
                      <td className="py-3 px-5 text-slate-400 font-mono text-[11px]">{formatDate(m.expiryDate)}</td>
                      <td className="py-3 px-5">
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            days > 0
                              ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                              : 'bg-red-50 text-red-700 border-red-200/80'
                          }`}
                        >
                          {days > 0 ? `${days}d left` : `${Math.abs(days)}d expired`}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleRenew(m)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all"
                          >
                            <RefreshCw size={10} /> Quick Renew
                          </button>
                          <button
                            onClick={() => handleToggleFreeze(m)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all"
                          >
                            <Snowflake size={10} /> {m.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                          </button>
                          <button
                            onClick={() => toast.success(`WhatsApp alert sent to ${m.name}`)}
                            className="p-1.5 rounded-lg text-[10px] font-bold cursor-pointer border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all"
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
            <div className="text-center py-8">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-2 text-emerald-600">
                <CheckCircle size={20} />
              </div>
              <p className="text-xs font-bold text-slate-800">All memberships are active and healthy!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No members expiring within the next 15 days.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── CREATE / EDIT PLAN MODAL ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="text-left">
                <h3 className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
                  <Shield size={18} /> {editingPlan ? 'Edit Membership Plan' : 'Create New Package'}
                </h3>
                <p className="text-[10px] text-blue-100 mt-0.5 font-medium">
                  Configure subscription details, pricing, and features
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-white/80 hover:text-white font-bold border-none bg-transparent cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePlan} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={planName}
                    onChange={e => setPlanName(e.target.value)}
                    placeholder="e.g. Monthly Standard"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#0B5CBE] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">Price (INR) *</label>
                  <input
                    type="number"
                    required
                    value={planPrice}
                    onChange={e => setPlanPrice(Number(e.target.value))}
                    placeholder="2500"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#0B5CBE] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">Duration (Days) *</label>
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#0B5CBE] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">Badge (Optional)</label>
                  <input
                    type="text"
                    value={planBadge}
                    onChange={e => setPlanBadge(e.target.value)}
                    placeholder="e.g. Popular or Elite"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#0B5CBE] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">Theme Accent</label>
                  <select
                    value={planAccent}
                    onChange={e => setPlanAccent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#0B5CBE] transition-all cursor-pointer"
                  >
                    <option value="#0B5CBE">🔵 Primary Blue</option>
                    <option value="#10b981">🟢 Emerald (Best Value)</option>
                    <option value="#4f46e5">🟣 Indigo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">Icon Symbol</label>
                  <select
                    value={planIcon}
                    onChange={e => setPlanIcon(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#0B5CBE] transition-all cursor-pointer"
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
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">Plan Highlights & Features</label>
                  <button
                    type="button"
                    onClick={addFeatureRow}
                    className="text-[10px] font-bold uppercase text-[#0B5CBE] hover:underline border-none bg-transparent cursor-pointer"
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
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#0B5CBE] transition-all"
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
                    className="px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-all cursor-pointer bg-white"
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
                    className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all cursor-pointer bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#0B5CBE] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer border-none shadow-sm"
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
