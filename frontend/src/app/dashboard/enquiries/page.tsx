'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserCheck, Search, Filter, PhoneCall, TrendingUp,
  Activity, UserMinus, RefreshCw, Plus, X, ChevronDown,
  MessageSquare, Phone, Mail, Calendar, Target, MapPin,
  Clock, UserPlus, CheckCircle, Trash2, ArrowRight, Bell,
  MoreHorizontal, Wifi as WifiIcon
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM — identical tokens to Members V5
// ═══════════════════════════════════════════════════════════════════════════════
const DS = {
  bg: '#F6F8FC',
  surface: '#FFFFFF',
  border: '#E7ECF5',
  borderLight: '#F0F4FB',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  success: '#16A34A',
  successLight: '#F0FDF4',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
  cyan: '#06B6D4',
  cyanLight: '#ECFEFF',
  fuchsia: '#A855F7',
  fuchsiaLight: '#FAF5FF',
  amber: '#D97706',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
  shadowLg: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
  shadowXl: '0 24px 64px rgba(0,0,0,0.14), 0 8px 24px rgba(0,0,0,0.08)',
  radius: 20,
  radiusSm: 12,
  radiusXs: 8,
};

// ── Animated Counter ──────────────────────────────────────────────────────────
function useAnimatedCount(target: number, ms = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let t = 0; const steps = 40; const inc = target / steps; const dur = ms / steps;
    const id = setInterval(() => { t += inc; if (t >= target) { setVal(target); clearInterval(id); } else setVal(Math.floor(t)); }, dur);
    return () => clearInterval(id);
  }, [target, ms]);
  return val;
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1); const min = Math.min(...data, 0);
  const h = 36; const w = 80;
  const pts = data.map((v, i) => { const x = (i / (data.length - 1)) * w; const y = h - ((v - min) / (max - min + 1)) * h; return `${x},${y}`; }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`${color}18`} stroke="none" />
    </svg>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1fr 1fr 64px', padding: '0 24px', height: 72, alignItems: 'center', borderBottom: `1px solid ${DS.borderLight}` }}>
      {[180, 120, 100, 90, 110, 32].map((w, i) => (
        <div key={i} style={{ height: 13, width: w, borderRadius: 6, background: 'linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)', backgroundSize: '200%', animation: 'shimmer 1.4s infinite' }} />
      ))}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, bgColor, icon: Icon, trend, sparkData, isPercent }: {
  label: string; value: number; sub?: string; color: string; bgColor: string; icon: any; trend?: string; sparkData?: number[]; isPercent?: boolean;
}) {
  const count = useAnimatedCount(value);
  return (
    <motion.div whileHover={{ y: -4, boxShadow: DS.shadowLg }} transition={{ duration: 0.2 }}
      style={{ background: DS.surface, borderRadius: DS.radius, padding: '22px 24px', boxShadow: DS.shadowMd, border: `1px solid ${DS.border}`, flex: '1 1 160px', minWidth: 155, cursor: 'default', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}aa)`, borderRadius: '20px 20px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={18} color={color} /></div>
        {trend && <span style={{ fontSize: 11, fontWeight: 700, color: trend.startsWith('+') ? DS.success : DS.danger, background: trend.startsWith('+') ? DS.successLight : DS.dangerLight, padding: '3px 8px', borderRadius: 20 }}>{trend}</span>}
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color: DS.text, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>{count.toLocaleString()}{isPercent ? '%' : ''}</div>
      <div style={{ fontSize: 13, color: DS.textSecondary, fontWeight: 600, marginBottom: sub ? 4 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: DS.textMuted }}>{sub}</div>}
      {sparkData && sparkData.length > 1 && <div style={{ marginTop: 12 }}><Sparkline data={sparkData} color={color} /></div>}
    </motion.div>
  );
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  'New':          { color: DS.primary,  bg: DS.primaryLight, border: '#BFDBFE', dot: DS.primary },
  'Contacted':    { color: '#4F46E5',   bg: '#EEF2FF',       border: '#C7D2FE', dot: '#4F46E5' },
  'Interested':   { color: DS.fuchsia,  bg: DS.fuchsiaLight, border: '#E9D5FF', dot: DS.fuchsia },
  'Trial Booked': { color: DS.warning,  bg: DS.warningLight, border: '#FDE68A', dot: DS.warning },
  'Visited':      { color: '#EA580C',   bg: '#FFF7ED',       border: '#FED7AA', dot: '#EA580C' },
  'Negotiation':  { color: DS.danger,   bg: DS.dangerLight,  border: '#FCA5A5', dot: DS.danger },
  'Converted':    { color: DS.success,  bg: DS.successLight, border: '#6EE7B7', dot: DS.success },
  'Lost':         { color: DS.textMuted, bg: '#F9FAFB',      border: DS.border,  dot: DS.textMuted },
};
const statusKeys = Object.keys(STATUS_CFG);

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG['New'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />{status || 'New'}
    </span>
  );
}

// ── Priority badge ────────────────────────────────────────────────────────────
function PriorityBadge({ p }: { p: string }) {
  const cfg = p === 'High' ? { c: DS.danger, bg: DS.dangerLight } : p === 'Medium' ? { c: DS.warning, bg: DS.warningLight } : { c: DS.textMuted, bg: '#F9FAFB' };
  return <span style={{ fontSize: 10, fontWeight: 800, color: cfg.c, background: cfg.bg, padding: '2px 7px', borderRadius: 12 }}>{p || 'Low'}</span>;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 42 }: { name: string; size?: number }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const colors = ['#2563EB', '#7C3AED', '#DC2626', '#059669', '#D97706', '#0891B2', '#DB2777'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return <div style={{ width: size, height: size, borderRadius: DS.radiusXs, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.33, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{initials}</div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD DRAWER
// ═══════════════════════════════════════════════════════════════════════════════
function LeadDrawer({ lead, onClose, onFollowUpClick }: { lead: any; onClose: () => void; onFollowUpClick: (l: any) => void }) {
  const inp: React.CSSProperties = { width: '100%', padding: '9px 13px', background: DS.bg, border: `1.5px solid ${DS.border}`, borderRadius: DS.radiusSm, color: DS.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
  const sect: React.CSSProperties = { fontSize: 10, fontWeight: 800, color: DS.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 };

  const handleStatusChange = async (s: string) => {
    try { await updateDoc(doc(db, 'enquiries', lead.id), { status: s }); toast.success(`Status → ${s}`); } catch { toast.error('Failed'); }
  };
  const handleConvert = () => {
    localStorage.setItem('pending_conversion', JSON.stringify(lead));
    window.location.href = '/dashboard/members?action=new';
  };
  const handleDelete = async () => {
    if (!confirm(`Delete lead: ${lead.name}?`)) return;
    try { await deleteDoc(doc(db, 'enquiries', lead.id)); toast.success('Lead deleted'); onClose(); } catch { toast.error('Delete failed'); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.35)', zIndex: 400, backdropFilter: 'blur(6px)' }} />
      <motion.div initial={{ x: 540 }} animate={{ x: 0 }} exit={{ x: 540 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        style={{ position: 'fixed', top: 0, right: 0, width: 480, height: '100vh', background: DS.surface, borderLeft: `1px solid ${DS.border}`, zIndex: 401, overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: DS.shadowXl }}>

        {/* Hero */}
        <div style={{ background: `linear-gradient(135deg, ${DS.primaryLight}, ${DS.surface})`, padding: '24px 24px 20px', borderBottom: `1px solid ${DS.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={lead.name} size={64} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: DS.text, marginBottom: 8 }}>{lead.name}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <StatusBadge status={lead.status || 'New'} />
                  <PriorityBadge p={lead.priority} />
                  <span style={{ fontSize: 10, color: DS.textMuted, fontWeight: 600 }}>#{lead.id?.slice(0, 6).toUpperCase()}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 34, height: 34, background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: DS.textSecondary }}><X size={15} /></button>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { l: 'WhatsApp', icon: MessageSquare, color: '#16A34A', bg: '#F0FDF4', action: () => window.open(`https://wa.me/91${lead.phone}`, '_blank') },
              { l: 'Call', icon: Phone, color: DS.primary, bg: DS.primaryLight, action: () => window.open(`tel:${lead.phone}`) },
              { l: 'Email', icon: Mail, color: DS.purple, bg: DS.purpleLight, action: () => lead.email && window.open(`mailto:${lead.email}`) },
            ].map(({ l, icon: Icon, color, bg, action }) => (
              <motion.button key={l} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={action}
                style={{ padding: '10px 6px', background: bg, border: `1px solid ${color}30`, borderRadius: 12, color, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <Icon size={16} />{l}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>

          {/* Contact */}
          <div style={{ background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: DS.radiusSm, padding: '16px 18px' }}>
            <div style={sect}>Contact & Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { e: '📱', l: 'Phone', v: lead.phone },
                { e: '📧', l: 'Email', v: lead.email },
                { e: '🎯', l: 'Goal', v: lead.goal },
                { e: '📍', l: 'Preferred Branch', v: lead.preferredBranch },
                { e: '💰', l: 'Preferred Plan', v: lead.preferredPlan },
                { e: '📅', l: 'Created', v: lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
              ].filter(r => r.v).map(({ e, l, v }) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: DS.surface, borderRadius: 10, border: `1px solid ${DS.border}` }}>
                  <span style={{ fontSize: 14 }}>{e}</span>
                  <div>
                    <div style={{ fontSize: 10, color: DS.textMuted, fontWeight: 700 }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{v}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Remarks */}
          {lead.remarks && (
            <div style={{ background: DS.warningLight, border: `1px solid #FDE68A`, borderRadius: DS.radiusSm, padding: '14px 18px' }}>
              <div style={{ ...sect, color: DS.amber }}>Remarks</div>
              <div style={{ fontSize: 13, color: DS.text, lineHeight: 1.6 }}>{lead.remarks}</div>
            </div>
          )}

          {/* Timeline */}
          <div style={{ background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: DS.radiusSm, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={sect}>Activity Timeline</div>
              <button onClick={() => onFollowUpClick(lead)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: DS.primaryLight, border: `1px solid #BFDBFE`, borderRadius: 20, color: DS.primary, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                <Calendar size={11} /> Add Follow-up
              </button>
            </div>
            {lead.timeline?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {lead.timeline.map((item: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: DS.surface, border: `1.5px solid ${DS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.type === 'created' ? <UserPlus size={12} color={DS.primary} /> : <Clock size={12} color={DS.textMuted} />}
                    </div>
                    <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 10, padding: '8px 12px', flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: DS.text, marginBottom: 2 }}>{item.note}</div>
                      <div style={{ fontSize: 10, color: DS.textMuted }}>{new Date(item.timestamp).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: DS.textMuted, fontSize: 13 }}>No activity yet</div>
            )}
          </div>

          {/* Next follow-up */}
          {lead.nextFollowUp && (
            <div style={{ background: DS.warningLight, border: `1px solid #FDE68A`, borderRadius: DS.radiusSm, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bell size={16} color={DS.warning} />
              <div>
                <div style={{ fontSize: 11, color: DS.amber, fontWeight: 800 }}>NEXT FOLLOW-UP</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>{new Date(lead.nextFollowUp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${DS.border}`, background: DS.bg, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lead.status !== 'Converted' && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleConvert}
              style={{ width: '100%', padding: '12px', background: DS.primary, border: 'none', borderRadius: DS.radiusSm, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 2px 12px ${DS.primary}44` }}>
              <CheckCircle size={16} /> Convert to Member
            </motion.button>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={lead.status || 'New'} onChange={e => handleStatusChange(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', background: DS.surface, border: `1.5px solid ${DS.border}`, borderRadius: DS.radiusSm, color: DS.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
              {statusKeys.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={handleDelete}
              style={{ padding: '10px 14px', background: DS.dangerLight, border: `1px solid #FCA5A5`, borderRadius: DS.radiusSm, color: DS.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOLLOW-UP MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function FollowUpModal({ lead, onClose }: { lead: any; onClose: () => void }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [executive, setExecutive] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', background: DS.bg, border: `1.5px solid ${DS.border}`, borderRadius: DS.radiusSm, color: DS.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: DS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) { toast.error('Date and time are required'); return; }
    setSaving(true);
    try {
      const ts = new Date(`${date}T${time}`).toISOString();
      await updateDoc(doc(db, 'enquiries', lead.id), {
        nextFollowUp: ts,
        followUps: arrayUnion({ date: ts, executive, note, status: 'pending' }),
        timeline: arrayUnion({ type: 'follow_up_scheduled', timestamp: new Date().toISOString(), note: `Follow-up for ${new Date(ts).toLocaleString()} by ${executive || 'System'}. ${note}` }),
      });
      toast.success('Follow-up scheduled!');
      onClose();
    } catch { toast.error('Failed to schedule'); } finally { setSaving(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.5)', zIndex: 500, backdropFilter: 'blur(8px)' }} />
      <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '100%', maxWidth: 480, background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: DS.radius, boxShadow: DS.shadowXl, zIndex: 501, overflow: 'hidden' }}>
        <div style={{ padding: '22px 28px', borderBottom: `1px solid ${DS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: DS.warningLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bell size={16} color={DS.warning} /></div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: DS.text }}>Schedule Follow-up</div>
              <div style={{ fontSize: 12, color: DS.textSecondary }}>{lead.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: DS.textSecondary }}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><label style={lbl}><Calendar size={10} style={{ display: 'inline', marginRight: 4 }} />Date *</label><input type="date" required value={date} onChange={e => setDate(e.target.value)} style={inp} /></div>
            <div><label style={lbl}><Clock size={10} style={{ display: 'inline', marginRight: 4 }} />Time *</label><input type="time" required value={time} onChange={e => setTime(e.target.value)} style={inp} /></div>
          </div>
          <div><label style={lbl}><UserPlus size={10} style={{ display: 'inline', marginRight: 4 }} />Executive</label><input type="text" placeholder="e.g. Rahul, Priya..." value={executive} onChange={e => setExecutive(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Reminder Note</label><textarea rows={3} placeholder="What needs to be discussed?" value={note} onChange={e => setNote(e.target.value)} style={{ ...inp, resize: 'none' }} /></div>
          <motion.button type="submit" disabled={saving} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{ width: '100%', padding: '12px', background: DS.primary, border: 'none', borderRadius: DS.radiusSm, color: '#fff', fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: `0 2px 12px ${DS.primary}44` }}>
            {saving ? 'Scheduling…' : '✓ Schedule Reminder'}
          </motion.button>
        </form>
      </motion.div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD LEAD MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function AddLeadModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [goal, setGoal] = useState('Weight Loss');
  const [plan, setPlan] = useState('Monthly');
  const [branch, setBranch] = useState('Mohali, Punjab');
  const [priority, setPriority] = useState('Medium');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', background: DS.bg, border: `1.5px solid ${DS.border}`, borderRadius: DS.radiusSm, color: DS.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: DS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) { toast.error('Name and phone are required'); return; }
    setSaving(true);
    try {
      const { addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'enquiries'), {
        name, phone, email, goal, preferredPlan: plan, preferredBranch: branch, priority,
        remarks, status: 'New', createdAt: new Date().toISOString(),
        timeline: [{ type: 'created', timestamp: new Date().toISOString(), note: 'Lead created via CRM' }],
      });
      toast.success(`Lead added: ${name}`);
      onAdded();
      onClose();
    } catch { toast.error('Failed to add lead'); } finally { setSaving(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.5)', zIndex: 500, backdropFilter: 'blur(8px)' }} />
      <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '100%', maxWidth: 520, background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: DS.radius, boxShadow: DS.shadowXl, zIndex: 501, overflow: 'hidden', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '22px 28px', borderBottom: `1px solid ${DS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: DS.surface, zIndex: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: DS.text }}>Add New Lead</div>
          <button onClick={onClose} style={{ width: 32, height: 32, background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: DS.textSecondary }}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><label style={lbl}>Full Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Rahul Sharma" style={inp} /></div>
            <div><label style={lbl}>Phone *</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" style={inp} /></div>
            <div><label style={lbl}>Email</label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="rahul@email.com" style={inp} /></div>
            <div><label style={lbl}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Fitness Goal</label>
              <select value={goal} onChange={e => setGoal(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {['Weight Loss', 'Muscle Gain', 'General Fitness', 'Cardio', 'Powerlifting', 'Flexibility'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Preferred Plan</label>
              <select value={plan} onChange={e => setPlan(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'PT Monthly'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div><label style={lbl}>Preferred Branch</label><input value={branch} onChange={e => setBranch(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Remarks</label><textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any notes about this lead…" style={{ ...inp, resize: 'none' }} /></div>
          <motion.button type="submit" disabled={saving} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{ width: '100%', padding: '12px', background: DS.primary, border: 'none', borderRadius: DS.radiusSm, color: '#fff', fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: `0 2px 12px ${DS.primary}44` }}>
            {saving ? 'Adding…' : '+ Add Lead'}
          </motion.button>
        </form>
      </motion.div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function EnquiriesPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [followUpLead, setFollowUpLead] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => { const id = setInterval(() => setCurrentTime(new Date()), 30000); return () => clearInterval(id); }, []);

  useEffect(() => {
    const q = query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const handleRefresh = () => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 800); };

  // ── Stats
  const stats = React.useMemo(() => ({
    total: leads.length,
    today: leads.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length,
    pending: leads.filter(l => l.status !== 'Converted' && l.status !== 'Lost').length,
    converted: leads.filter(l => l.status === 'Converted').length,
    lost: leads.filter(l => l.status === 'Lost').length,
    convRate: leads.length > 0 ? Math.round((leads.filter(l => l.status === 'Converted').length / leads.length) * 100) : 0,
  }), [leads]);

  // ── Filtered
  const filtered = React.useMemo(() => {
    let r = [...leads];
    if (search) { const q = search.toLowerCase(); r = r.filter(l => l.name?.toLowerCase().includes(q) || l.phone?.includes(q) || l.status?.toLowerCase().includes(q) || l.goal?.toLowerCase().includes(q)); }
    if (statusFilter !== 'All') r = r.filter(l => (l.status || 'New') === statusFilter);
    if (priorityFilter !== 'All') r = r.filter(l => (l.priority || 'Medium') === priorityFilter);
    return r;
  }, [leads, search, statusFilter, priorityFilter]);

  const handleQuickStatus = async (lead: any, s: string) => {
    try { await updateDoc(doc(db, 'enquiries', lead.id), { status: s }); toast.success(`Status → ${s}`); setActiveMenuId(null); } catch { toast.error('Failed'); }
  };

  const inp: React.CSSProperties = { padding: '9px 14px', background: DS.bg, border: `1.5px solid ${DS.border}`, borderRadius: DS.radiusXs, color: DS.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' };

  return (
    <div style={{ background: DS.bg, minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: DS.text, paddingBottom: 100 }}>

      {/* ── HEADER ── */}
      <div style={{ background: DS.surface, borderBottom: `1px solid ${DS.border}`, padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, boxShadow: DS.shadow }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: DS.text, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1 }}>Lead Management</h1>
          <p style={{ fontSize: 13, color: DS.textSecondary, margin: '3px 0 0', fontWeight: 500 }}>Track enquiries, follow-ups and conversions in real-time</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, color: DS.textMuted, padding: '6px 12px', background: DS.bg, borderRadius: 8, border: `1px solid ${DS.border}`, fontWeight: 600 }}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style={{ fontSize: 11, padding: '6px 10px', background: DS.successLight, borderRadius: 8, color: DS.success, fontWeight: 700, border: `1px solid #6EE7B7`, display: 'flex', alignItems: 'center', gap: 4 }}>
            <WifiIcon size={11} />Live
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddModal(true)}
            style={{ padding: '9px 20px', background: DS.primary, border: 'none', borderRadius: DS.radiusSm, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: `0 2px 12px ${DS.primary}44` }}>
            <Plus size={16} /> Add Lead
          </motion.button>
        </div>
      </div>

      <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── KPI CARDS ── */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <KpiCard label="Total Leads" value={stats.total} color={DS.primary} bgColor={DS.primaryLight} icon={Users} sub="All enquiries" sparkData={[4, 5, 6, 7, 6, 8, stats.total]} />
          <KpiCard label="Today's Leads" value={stats.today} color={DS.cyan} bgColor={DS.cyanLight} icon={Activity} sub="Added today" />
          <KpiCard label="Pending Follow-up" value={stats.pending} color={DS.warning} bgColor={DS.warningLight} icon={PhoneCall} sub="Needs attention" trend={stats.pending > 5 ? '+risk' : '—'} />
          <KpiCard label="Converted" value={stats.converted} color={DS.success} bgColor={DS.successLight} icon={UserCheck} sub="Became members" sparkData={[1, 2, 2, 3, 3, 4, stats.converted]} />
          <KpiCard label="Lost Leads" value={stats.lost} color={DS.danger} bgColor={DS.dangerLight} icon={UserMinus} sub="Dropped out" />
          <KpiCard label="Conversion Rate" value={stats.convRate} color={DS.purple} bgColor={DS.purpleLight} icon={TrendingUp} sub="% converted" isPercent />
        </div>

        {/* ── TOOLBAR ── */}
        <div style={{ background: DS.surface, borderRadius: DS.radius, padding: '14px 20px', boxShadow: DS.shadow, border: `1px solid ${DS.border}`, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: DS.textMuted }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, status…"
              style={{ width: '100%', padding: '10px 14px 10px 38px', background: DS.bg, border: `1.5px solid ${DS.border}`, borderRadius: 10, color: DS.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: DS.border, border: 'none', borderRadius: 4, padding: '2px 4px', cursor: 'pointer', color: DS.textSecondary, display: 'flex' }}><X size={11} /></button>}
          </div>

          <button onClick={() => setShowFilterBar(!showFilterBar)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: showFilterBar ? DS.primaryLight : DS.bg, border: `1.5px solid ${showFilterBar ? DS.primary : DS.border}`, borderRadius: 10, color: showFilterBar ? DS.primary : DS.textSecondary, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Filter size={14} /> Filters
          </button>

          {/* Quick status chips */}
          {(['All', 'New', 'Interested', 'Trial Booked', 'Converted', 'Lost'] as const).map(s => (
            <motion.button key={s} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setStatusFilter(s)}
              style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${statusFilter === s ? DS.primary : DS.border}`, background: statusFilter === s ? DS.primaryLight : DS.bg, color: statusFilter === s ? DS.primary : DS.textSecondary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {s}
            </motion.button>
          ))}

          <div style={{ flex: 1 }} />
          <button onClick={handleRefresh} style={{ width: 38, height: 38, background: DS.bg, border: `1.5px solid ${DS.border}`, borderRadius: 10, cursor: 'pointer', color: DS.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={15} style={{ animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          </button>
        </div>

        {/* Filter bar */}
        <AnimatePresence>
          {showFilterBar && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ background: DS.surface, borderRadius: DS.radiusSm, border: `1px solid ${DS.border}`, padding: '16px 20px', display: 'flex', gap: 16, flexWrap: 'wrap', overflow: 'hidden' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: DS.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Priority</div>
                <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ ...inp, minWidth: 140 }}>
                  {['All', 'High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); setShowFilterBar(false); }}
                  style={{ padding: '10px 16px', background: DS.dangerLight, border: `1px solid #FCA5A5`, borderRadius: DS.radiusSm, color: DS.danger, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Clear Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── TABLE ── */}
        <div style={{ background: DS.surface, borderRadius: DS.radius, boxShadow: DS.shadowMd, border: `1px solid ${DS.border}`, overflow: 'hidden' }}>
          {/* Table header bar */}
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${DS.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: DS.text }}>All Leads</span>
            <span style={{ fontSize: 12, padding: '3px 10px', background: DS.primaryLight, color: DS.primary, borderRadius: 20, fontWeight: 700 }}>{filtered.length}</span>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1fr 1fr 52px', padding: '12px 24px', borderBottom: `1px solid ${DS.border}`, background: DS.bg }}>
            {['Lead', 'Contact', 'Goal & Plan', 'Status', 'Next Follow-up', ''].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 800, color: DS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 440px)' }}>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <div style={{ padding: '80px 40px', textAlign: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: DS.bg, border: `2px dashed ${DS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><Users size={28} color={DS.textMuted} /></div>
                <div style={{ fontSize: 18, fontWeight: 800, color: DS.text, marginBottom: 8 }}>No leads found</div>
                <div style={{ fontSize: 14, color: DS.textSecondary, marginBottom: 24 }}>Try adjusting filters or add a new lead</div>
                <motion.button whileHover={{ scale: 1.03 }} onClick={() => setShowAddModal(true)}
                  style={{ padding: '10px 24px', background: DS.primary, border: 'none', borderRadius: DS.radiusSm, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  + Add Lead
                </motion.button>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filtered.map((lead, idx) => {
                  const isActive = selectedLead?.id === lead.id;
                  const isMenuOpen = activeMenuId === lead.id;
                  const due = lead.nextFollowUp ? new Date(lead.nextFollowUp) : null;
                  const isOverdue = due && due < new Date();

                  return (
                    <motion.div key={lead.id}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.14, delay: Math.min(idx * 0.02, 0.25) }}
                      onClick={() => setSelectedLead(lead)}
                      style={{
                        display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1fr 1fr 52px',
                        padding: '0 24px', height: 72, alignItems: 'center', cursor: 'pointer',
                        background: isActive ? DS.primaryLight : DS.surface,
                        borderLeft: `3px solid ${isActive ? DS.primary : 'transparent'}`,
                        borderBottom: `1px solid ${DS.borderLight}`,
                        transition: 'all 0.15s ease',
                      }}
                      whileHover={{ background: '#F8FAFF', borderLeftColor: DS.primary + '66' }}>

                      {/* Lead */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 12 }}>
                        <Avatar name={lead.name} size={40} />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <PriorityBadge p={lead.priority || 'Medium'} />
                            <span style={{ fontSize: 10, color: DS.textMuted }}>#{lead.id?.slice(0, 6).toUpperCase()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Contact */}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{lead.phone}</div>
                        {lead.email && <div style={{ fontSize: 11, color: DS.textMuted, marginTop: 2 }}>{lead.email}</div>}
                      </div>

                      {/* Goal & Plan */}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{lead.goal || '—'}</div>
                        {lead.preferredPlan && <div style={{ fontSize: 11, color: DS.textMuted, marginTop: 2 }}>{lead.preferredPlan}</div>}
                      </div>

                      {/* Status */}
                      <div><StatusBadge status={lead.status || 'New'} /></div>

                      {/* Next Follow-up */}
                      <div>
                        {due ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: isOverdue ? DS.dangerLight : DS.warningLight, color: isOverdue ? DS.danger : DS.amber, border: `1px solid ${isOverdue ? '#FCA5A5' : '#FDE68A'}`, borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            <PhoneCall size={11} />{due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: DS.textMuted }}>Not scheduled</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setActiveMenuId(isMenuOpen ? null : lead.id)}
                          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: DS.bg, border: `1.5px solid ${DS.border}`, borderRadius: 8, cursor: 'pointer', color: DS.textSecondary }}>
                          <MoreHorizontal size={15} />
                        </button>
                        <AnimatePresence>
                          {isMenuOpen && (
                            <motion.div initial={{ opacity: 0, scale: 0.94, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.12 }}
                              style={{ position: 'absolute', right: 0, top: '110%', background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: DS.radiusSm, padding: 6, zIndex: 200, minWidth: 190, boxShadow: DS.shadowXl }}>
                              {[
                                { label: 'View Details', icon: ArrowRight, action: () => { setSelectedLead(lead); setActiveMenuId(null); } },
                                { label: 'Schedule Follow-up', icon: Calendar, action: () => { setFollowUpLead(lead); setActiveMenuId(null); } },
                                { label: 'WhatsApp', icon: MessageSquare, action: () => { window.open(`https://wa.me/91${lead.phone}`, '_blank'); setActiveMenuId(null); } },
                                { label: 'Mark Converted', icon: CheckCircle, action: () => handleQuickStatus(lead, 'Converted') },
                                { label: 'Mark Lost', icon: UserMinus, action: () => handleQuickStatus(lead, 'Lost'), danger: true },
                              ].map(({ label, icon: Icon, action, danger }) => (
                                <button key={label} onClick={action}
                                  style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: 8, color: danger ? DS.danger : DS.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = danger ? DS.dangerLight : DS.bg)}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                  <Icon size={14} color={danger ? DS.danger : DS.textSecondary} />{label}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 24px', borderTop: `1px solid ${DS.border}`, background: DS.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: DS.textSecondary }}>
            <span>Showing <strong style={{ color: DS.text }}>{filtered.length}</strong> of <strong style={{ color: DS.text }}>{stats.total}</strong> leads</span>
            <span style={{ color: DS.textMuted }}>Realtime Firebase sync active</span>
          </div>
        </div>
      </div>

      {/* ── DRAWERS & MODALS ── */}
      <AnimatePresence>
        {selectedLead && (
          <LeadDrawer
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onFollowUpClick={(l) => { setFollowUpLead(l); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {followUpLead && (
          <FollowUpModal lead={followUpLead} onClose={() => setFollowUpLead(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <AddLeadModal onClose={() => setShowAddModal(false)} onAdded={() => {}} />
        )}
      </AnimatePresence>

      {/* Keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 10px; }
        input:focus, select:focus, textarea:focus { border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
      `}</style>
    </div>
  );
}
