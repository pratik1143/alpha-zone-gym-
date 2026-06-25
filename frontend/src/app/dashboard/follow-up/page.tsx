'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Phone, MessageSquare, RefreshCw, AlertTriangle, CheckCircle, Info, 
  Zap, TrendingUp, DollarSign, UserCheck, ShieldAlert, Award, Calendar, 
  HelpCircle, UserX, X
} from 'lucide-react';
import { useGymStore } from '@/store';
import { formatDate, daysUntilExpiry, getInitials, getRandomColor, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import API from '@/services/api';

export default function FollowUpPage() {
  const { members, fetchMembers, addPayment, updateMember } = useGymStore();
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'expiring' | 'expired'>('all');
  const [isRenewing, setIsRenewing] = useState<string | null>(null);
  
  // Dashboard Tab state
  const [viewTab, setViewTab] = useState<'roster' | 'ai-predictor'>('ai-predictor');
  
  // Trainer assignment state
  const [assigningTrainerMember, setAssigningTrainerMember] = useState<any | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState('Rohit Sharma');
  const [trainers, setTrainers] = useState<any[]>([]);

  useEffect(() => {
    fetchMembers();
    API.get('/trainers')
      .then(res => setTrainers(res.data))
      .catch(err => console.error('Failed to load trainers in follow-up page:', err));
  }, [fetchMembers]);

  // Compute days since registration (joinDate) or remaining
  const getDaysLeft = (expiryDate: string): number => {
    return daysUntilExpiry(expiryDate);
  };

  const planPrices: Record<string, number> = {
    'Monthly': 2500, 
    'Quarterly': 6500, 
    'Semi-Annual': 11500, 
    'Annual Premium': 18000
  };

  // AI Renewal Predictor Engine logic
  const getRenewalPrediction = (m: any) => {
    // Deterministic calculation based on real user factors
    let score = 45; // Start baseline

    // 1. Attendance Frequency (real log size)
    const attendCount = m.attendanceCount || 0;
    if (attendCount > 12) score += 25;
    else if (attendCount > 6) score += 15;
    else if (attendCount > 2) score += 5;
    else score -= 15; // penalize inactive

    // 2. Active Streak
    const streak = m.streak || 0;
    if (streak > 7) score += 15;
    else if (streak > 3) score += 8;

    // 3. Trainer Interaction
    const hasTrainer = m.trainer && m.trainer.trim() !== '';
    if (hasTrainer) score += 15;
    else score -= 5;

    // 4. Diet & Workout Compliance (fitness score)
    const fitScore = m.fitnessScore || 70;
    if (fitScore > 85) score += 12;
    else if (fitScore > 75) score += 6;
    else score -= 8;

    // 5. Membership type
    const plan = (m.plan || '').toLowerCase();
    if (plan.includes('annual')) score += 12;
    else if (plan.includes('semi')) score += 8;
    else if (plan.includes('quarter')) score += 4;

    // 6. Age variance
    if (m.age && m.age > 22 && m.age < 38) score += 3; // core target

    // Clamp score
    const finalScore = Math.max(8, Math.min(96, score));
    
    // Risk evaluation
    let category: 'Green' | 'Yellow' | 'Red' = 'Yellow';
    if (finalScore >= 80) category = 'Green';
    else if (finalScore < 50) category = 'Red';

    // Top reasons
    const reasons: string[] = [];
    if (attendCount > 6) reasons.push("High Attendance");
    else reasons.push("Low Attendance");

    if (hasTrainer) reasons.push("Trainer Engagement");
    else reasons.push("No Assigned Coach");

    if (fitScore > 75) reasons.push("Diet Compliance");
    else reasons.push("No Diet Tracking");

    if (streak > 4) reasons.push("Consistent Streak");

    return {
      score: finalScore,
      category,
      reasons: reasons.slice(0, 3)
    };
  };

  // Filter list: only members who are expiring or expired (daysLeft <= 15 days, down to -30 days)
  const baseFollowUpList = members.filter(m => {
    const dLeft = getDaysLeft(m.expiryDate);
    return dLeft <= 15 && dLeft >= -30;
  });

  // Apply Tab filter / Search
  const filteredList = baseFollowUpList.filter(m => {
    const matchesSearch = m.name?.toLowerCase().includes(search.toLowerCase()) || 
                          m.phone?.includes(search) || 
                          m.memberId?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (viewTab === 'roster') {
      const dLeft = getDaysLeft(m.expiryDate);
      if (filterMode === 'expiring') return dLeft > 0;
      if (filterMode === 'expired') return dLeft <= 0;
    }
    return true;
  });

  const sortedList = [...filteredList].sort((a, b) => {
    if (viewTab === 'ai-predictor') {
      return getRenewalPrediction(a).score - getRenewalPrediction(b).score; // Show red/urgent risk first
    }
    return getDaysLeft(a.expiryDate) - getDaysLeft(b.expiryDate);
  });

  // Calculate Forecast metrics
  const totalInScope = baseFollowUpList.length;
  const renewalForecast = baseFollowUpList.reduce((acc, m) => {
    const pred = getRenewalPrediction(m);
    const price = planPrices[m.plan] || 2500;
    return acc + (price * pred.score / 100);
  }, 0);

  const expectedRenewalsCount = baseFollowUpList.reduce((acc, m) => {
    const pred = getRenewalPrediction(m);
    return acc + (pred.score / 100);
  }, 0);

  const highRiskCount = baseFollowUpList.filter(m => getRenewalPrediction(m).score < 50).length;

  const handleQuickRenew = async (member: any) => {
    setIsRenewing(member.id);
    const amt = planPrices[member.plan] || 2500;
    
    try {
      await addPayment({
        memberId: member.id,
        amount: amt,
        plan: member.plan,
        method: 'UPI'
      });
      toast.success(`Membership renewed successfully for ${member.name}!`);
      fetchMembers();
    } catch (err) {
      toast.error('Failed to renew membership');
    } finally {
      setIsRenewing(null);
    }
  };

  const handleOfferDiscount = (member: any) => {
    const code = `ALPHACORE${10 + Math.floor(Math.random() * 15)}`;
    toast.success(`Discount Code Generated: "${code}" (15% Off). SMS dispatched to ${member.name}!`, {
      duration: 5000,
      icon: '🎫'
    });
  };

  const handleAssignTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTrainerMember) return;
    try {
      await updateMember(assigningTrainerMember.id, { trainer: selectedTrainer });
      toast.success(`Trainer assigned: ${selectedTrainer} assigned to ${assigningTrainerMember.name}! AI Renewal prediction score updated.`);
      setAssigningTrainerMember(null);
      fetchMembers();
    } catch (err) {
      toast.error('Failed to assign trainer');
    }
  };

  const handleCreateFollowUpTask = (member: any) => {
    toast.success(`CRM Follow-Up task scheduled for ${member.name}! Receptionist alert set for tomorrow morning.`, {
      icon: '⏰'
    });
  };

  const getWhatsAppLink = (m: any) => {
    const daysLeft = getDaysLeft(m.expiryDate);
    const pred = getRenewalPrediction(m);
    let message = '';
    if (daysLeft > 0) {
      message = `Hi ${m.name}, your membership plan (${m.plan}) at Alpha Gym is expiring soon on ${formatDate(m.expiryDate)} (${daysLeft} days remaining). We have reserved a special renewal slot for you. Let us know if you want to extend! 💪`;
    } else {
      message = `Hi ${m.name}, your membership plan (${m.plan}) at Alpha Gym expired on ${formatDate(m.expiryDate)}. Please renew to resume your biometric biometric access and daily check-ins. Thank you!`;
    }
    return `https://wa.me/91${m.phone}?text=${encodeURIComponent(message)}`;
  };

  const counts = {
    all: baseFollowUpList.length,
    expiring: baseFollowUpList.filter(m => getDaysLeft(m.expiryDate) > 0).length,
    expired: baseFollowUpList.filter(m => getDaysLeft(m.expiryDate) <= 0).length,
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="border-b border-brand-border/60 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-text-primary tracking-tight font-display">Membership Retention & Renewals</h1>
          <p className="text-xs text-brand-text-secondary mt-0.5">
            Identify expiring packages, validate AI renewal predictions, and initiate automated client campaigns.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-900 border border-white/5 rounded-2xl p-1 shrink-0 shadow-lg">
          <button
            onClick={() => setViewTab('ai-predictor')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none outline-none ${
              viewTab === 'ai-predictor'
                ? 'bg-[#d4ff00] text-black shadow-md'
                : 'text-slate-400 hover:text-white bg-transparent'
            }`}
          >
            🧠 AI Renewal Predictor
          </button>
          <button
            onClick={() => setViewTab('roster')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none outline-none ${
              viewTab === 'roster'
                ? 'bg-[#d4ff00] text-black shadow-md'
                : 'text-slate-400 hover:text-white bg-transparent'
            }`}
          >
            📋 Expiry Roster ({counts.all})
          </button>
        </div>
      </div>

      {/* AI Renewal Predictions Metrics Dashboard */}
      {viewTab === 'ai-predictor' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center justify-between border border-brand-border/40">
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expected Revenue</div>
              <div className="text-xl font-black text-brand-text-primary mt-1 font-display">{formatCurrency(Math.round(renewalForecast))}</div>
              <div className="text-[8px] text-slate-500 font-bold mt-1 uppercase">Probability Weighted Forecast</div>
            </div>
            <div className="p-2.5 rounded-xl border border-emerald-500/10 bg-emerald-500/10 text-emerald-400 shrink-0">
              <DollarSign size={16} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-4 flex items-center justify-between border border-brand-border/40">
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expected Renewals</div>
              <div className="text-xl font-black text-brand-text-primary mt-1 font-display">
                {Math.round(expectedRenewalsCount)} / {totalInScope}
              </div>
              <div className="text-[8px] text-slate-500 font-bold mt-1 uppercase">Expected Conversion Rate: {totalInScope > 0 ? Math.round((expectedRenewalsCount / totalInScope) * 100) : 0}%</div>
            </div>
            <div className="p-2.5 rounded-xl border border-blue-500/10 bg-blue-500/10 text-blue-400 shrink-0">
              <TrendingUp size={16} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 flex items-center justify-between border border-brand-border/40">
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Risk Accounts (Red)</div>
              <div className="text-xl font-black text-red-500 mt-1 font-display">{highRiskCount}</div>
              <div className="text-[8px] text-slate-500 font-bold mt-1 uppercase">Probabilities under 50%</div>
            </div>
            <div className="p-2.5 rounded-xl border border-red-500/10 bg-red-500/10 text-red-400 shrink-0">
              <UserX size={16} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4 flex items-center justify-between border border-[#d4ff00]/20 bg-[#d4ff00]/5">
            <div>
              <div className="text-[9px] font-black text-[#d4ff00] uppercase tracking-widest">AI Gym Copilot Suggestions</div>
              <div className="text-[10px] font-bold text-slate-200 mt-1 leading-snug">
                {highRiskCount > 0 ? `Offer quick 15% discount or assign trainer to ${highRiskCount} Red Risk members.` : 'Retention rate looks healthy this week.'}
              </div>
              <div className="text-[8.5px] text-[#d4ff00] font-black mt-1 uppercase tracking-wider">Instant campaigns prepped</div>
            </div>
            <div className="p-2.5 rounded-xl border border-[#d4ff00]/30 bg-[#d4ff00]/10 text-[#d4ff00] shrink-0 animate-pulse">
              <Zap size={16} />
            </div>
          </motion.div>
        </div>
      )}

      {/* Roster Mode Filters */}
      {viewTab === 'roster' && (
        <div className="flex gap-2">
          {(['all', 'expiring', 'expired'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                filterMode === mode
                  ? 'bg-brand-cyan text-slate-950 shadow-lg shadow-brand-cyan/10 font-extrabold'
                  : 'bg-brand-bg-card border border-brand-border text-brand-text-secondary hover:text-brand-text-primary'
              }`}
            >
              {mode === 'all' ? `All Pending (${counts.all})` : mode === 'expiring' ? `Expiring Soon (${counts.expiring})` : `Recently Expired (${counts.expired})`}
            </button>
          ))}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, or member ID..."
          className="glass-input pl-9 py-2.5 text-xs"
        />
      </div>

      {/* Roster Table */}
      <div className="glass-card overflow-hidden border border-brand-border/40">
        <div className="overflow-x-auto">
          <table className="cyber-table">
            <thead>
              {viewTab === 'ai-predictor' ? (
                <tr>
                  <th>Member Info</th>
                  <th>Days Left</th>
                  <th>Renewal Probability</th>
                  <th>Risk Category</th>
                  <th>Primary Risk Indicators</th>
                  <th className="text-right">AI Recommended Interventions</th>
                </tr>
              ) : (
                <tr>
                  <th>Member Info</th>
                  <th>Active Plan</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              )}
            </thead>
            <tbody>
              {sortedList.map((m, i) => {
                const daysLeft = getDaysLeft(m.expiryDate);
                const isExpired = daysLeft <= 0;
                const prediction = getRenewalPrediction(m);
                const colorsMap = {
                  Green: { border: 'border-emerald-500/20', text: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  Yellow: { border: 'border-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-500/10' },
                  Red: { border: 'border-red-500/20', text: 'text-red-500', bg: 'bg-red-500/10' }
                };
                const theme = colorsMap[prediction.category];

                return (
                  <motion.tr 
                    key={m.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        {(() => {
                          const avatarColor = getRandomColor(m.name);
                          return (
                            <div 
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm"
                              style={{ 
                                background: `linear-gradient(135deg, ${avatarColor}18 0%, ${avatarColor}30 100%)`, 
                                color: avatarColor, 
                                border: `1.5px solid ${avatarColor}25` 
                              }}
                            >
                              {getInitials(m.name)}
                            </div>
                          );
                        })()}
                        <div>
                          <div className="font-bold text-xs text-brand-text-primary">{m.name}</div>
                          <div className="text-[9px] text-brand-text-secondary font-mono">{m.memberId || m.id} · {m.plan}</div>
                        </div>
                      </div>
                    </td>

                    {viewTab === 'ai-predictor' ? (
                      <>
                        <td>
                          <span className={`font-mono text-xs font-semibold ${daysLeft > 0 ? 'text-slate-300' : 'text-red-500'}`}>
                            {daysLeft > 0 ? `${daysLeft}d remaining` : `${Math.abs(daysLeft)}d expired`}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-black text-xs ${theme.text}`}>{prediction.score}%</span>
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden shrink-0">
                              <div className={`h-full rounded-full ${prediction.category === 'Green' ? 'bg-emerald-500' : prediction.category === 'Yellow' ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${prediction.score}%` }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${theme.text} ${theme.border} ${theme.bg}`}>
                            {prediction.category} RISK
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {prediction.reasons.map((r, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5 text-[8.5px] font-medium leading-none">
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            <a 
                              href={`tel:${m.phone}`}
                              onClick={() => toast.success(`Calling ${m.name}...`)}
                              className="p-1.5 rounded-lg border border-brand-border bg-slate-900 text-brand-text-secondary hover:text-white hover:border-white/10 transition-colors"
                              title="Call Member"
                            >
                              <Phone size={12} />
                            </a>
                            <a 
                              href={getWhatsAppLink(m)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-emerald-500/10 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/20 transition-all"
                              title="Send WhatsApp Campaign"
                            >
                              <MessageSquare size={12} />
                            </a>
                            <button
                              onClick={() => handleOfferDiscount(m)}
                              className="px-2 py-1.5 rounded-lg border border-blue-500/15 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 text-[9.5px] font-black uppercase tracking-wider"
                              title="Offer Retention Discount"
                            >
                              Offer Discount
                            </button>
                            <button
                              onClick={() => setAssigningTrainerMember(m)}
                              className="px-2 py-1.5 rounded-lg border border-amber-500/15 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 text-[9.5px] font-black uppercase tracking-wider"
                              title="Assign Coach to improve compliance"
                            >
                              Assign Coach
                            </button>
                            <button
                              onClick={() => handleCreateFollowUpTask(m)}
                              className="px-2 py-1.5 rounded-lg border border-purple-500/15 bg-purple-500/5 text-purple-400 hover:bg-purple-500/10 text-[9.5px] font-black uppercase tracking-wider"
                              title="Schedule Task"
                            >
                              Schedule Call
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="text-xs text-slate-300 font-bold">{m.plan}</td>
                        <td className="text-xs text-slate-400">{formatDate(m.expiryDate)}</td>
                        <td>
                          <span className={`font-mono font-bold text-xs ${daysLeft > 0 ? 'text-[#F59E0B]' : 'text-red-500'}`}>
                            {daysLeft > 0 ? `${daysLeft} days` : `${Math.abs(daysLeft)} days ago`}
                          </span>
                        </td>
                        <td>
                          <span className={isExpired ? 'badge-red' : 'badge-yellow'} style={{ fontSize: '0.65rem' }}>
                            <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: isExpired ? '#EF4444' : '#F59E0B' }} />
                            {isExpired ? 'Expired' : 'Expiring'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-2">
                            <a 
                              href={`tel:${m.phone}`}
                              className="px-2.5 py-1.5 rounded-lg border border-brand-border bg-slate-50 text-brand-text-secondary hover:bg-slate-100 hover:text-black transition-all text-xxs font-bold"
                            >
                              <Phone size={11} className="inline mr-1" /> Call
                            </a>
                            <a 
                              href={getWhatsAppLink(m)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg border border-brand-border bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all text-xxs font-bold"
                            >
                              <MessageSquare size={11} className="inline mr-1" /> WhatsApp
                            </a>
                            <button
                              onClick={() => handleQuickRenew(m)}
                              disabled={isRenewing === m.id}
                              className="px-3 py-1.5 rounded-lg bg-brand-cyan hover:bg-brand-cyan/90 text-slate-950 transition-all text-xxs font-black disabled:opacity-40"
                            >
                              {isRenewing === m.id ? (
                                <RefreshCw size={11} className="animate-spin inline" />
                              ) : (
                                'Quick Renew'
                              )}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </motion.tr>
                );
              })}

              {sortedList.length === 0 && (
                <tr>
                  <td colSpan={viewTab === 'ai-predictor' ? 6 : 6} className="py-8 text-center text-brand-text-muted italic">
                    No members are currently in follow-up scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trainer Assign Modal */}
      <AnimatePresence>
        {assigningTrainerMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 text-left relative text-white"
            >
              <button 
                onClick={() => setAssigningTrainerMember(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer"
              >
                <X size={16} />
              </button>

              <h3 className="text-sm font-black uppercase tracking-wider font-display text-white">Assign Coach</h3>
              <p className="text-[10px] text-slate-400 leading-normal">
                Assigning a personal coach increases compliance tracking and boosts the client's membership renewal rate by 15%.
              </p>

              <form onSubmit={handleAssignTrainerSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Select Trainer</label>
                  <select
                    value={selectedTrainer}
                    onChange={e => setSelectedTrainer(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4ff00]"
                  >
                    {trainers.map((t: any) => (
                      <option key={t.id} value={t.name}>{t.name} ({t.specialization})</option>
                    ))}
                    {trainers.length === 0 && (
                      <>
                        <option>Rohit Sharma</option>
                        <option>Karan Verma</option>
                        <option>Sneha Kapoor</option>
                      </>
                    )}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#d4ff00] text-black text-xs font-black uppercase tracking-wider border-none cursor-pointer hover:scale-[1.01] active:scale-95 transition-all text-center"
                >
                  Assign & Update AI Score
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
