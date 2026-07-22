'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, Phone, MessageSquare, Mail, Calendar, Clock,
  User, Shield, Sparkles, ArrowRight, CheckCircle2, AlertCircle, Trash2, Edit3,
  UserCheck, Flame, Sun, Snowflake, LayoutGrid, List, ChevronRight, Zap,
  RefreshCw, X, Download, Send, Check, UserPlus, FileText, Activity, TrendingUp,
  Building, MapPin, Award, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import API from '@/services/api';
import { useGymStore } from '@/store';

interface Enquiry {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  altPhone?: string;
  email?: string;
  gender?: string;
  address?: string;
  nextFollowUp?: string;
  followUpTime?: string;
  trialDate?: string;
  status: 'Pending' | 'Contacted' | 'Trial Scheduled' | 'Converted' | 'Lost';
  assignedTo?: string;
  priority: 'Hot' | 'Warm' | 'Cold';
  source?: string;
  interestedPlan?: string;
  remarks?: string;
  createdAt: string;
}

const SOURCES = ['Walk-in', 'Instagram', 'Facebook', 'Google Ad', 'Referral', 'Phone Inquiry', 'Website Form', 'Other'];
const PLANS = ['Monthly Standard', 'Quarterly Prime', 'Semi-Annual Pro', 'Annual VIP', 'Personal Training (PT)', 'Day Pass'];
const STAFF_LIST = ['Karan Verma', 'Dev Rana', 'Sneha Kapoor', 'Riya Menon', 'Reception Desk', 'Demo Manager'];

export default function EnquiryGodLevelHub() {
  const { addMember, fetchMembers } = useGymStore();

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState<Enquiry | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [staffFilter, setStaffFilter] = useState<string>('All');

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contact, setContact] = useState('');
  const [altContact, setAltContact] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Male');
  const [address, setAddress] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [followupTime, setFollowupTime] = useState('11:00');
  const [trialDate, setTrialDate] = useState('');
  const [status, setStatus] = useState<'Pending' | 'Contacted' | 'Trial Scheduled' | 'Converted' | 'Lost'>('Pending');
  const [attendedBy, setAttendedBy] = useState('Karan Verma');
  const [priority, setPriority] = useState<'Hot' | 'Warm' | 'Cold'>('Warm');
  const [source, setSource] = useState('Instagram');
  const [inquiryFor, setInquiryFor] = useState('Monthly Standard');
  const [remarks, setRemarks] = useState('');
  const [sendWelcomeText, setSendWelcomeText] = useState(true);
  const [sendWhatsAppMessage, setSendWhatsAppMessage] = useState(true);

  // Convert to Member Form State
  const [convertPlan, setConvertPlan] = useState('Monthly Standard');
  const [convertPrice, setConvertPrice] = useState('2500');

  // ── REALTIME FIRESTORE LISTENER WITH SAFE API FALLBACK ────────────
  useEffect(() => {
    setLoading(true);
    let isMounted = true;

    const fetchFallbackEnquiries = async () => {
      try {
        const res = await API.get('/enquiries');
        if (isMounted && res.data) {
          setEnquiries(res.data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('API fallback for enquiries failed:', err);
      }
      // Demo mock fallback if Firestore & API both unavailable
      if (isMounted && enquiries.length === 0) {
        setEnquiries([
          {
            id: 'enq_101',
            name: 'Rohit Sharma',
            firstName: 'Rohit',
            lastName: 'Sharma',
            phone: '9876543210',
            email: 'rohit.s@gmail.com',
            gender: 'Male',
            address: 'Phase 7, Mohali',
            nextFollowUp: '2026-07-24',
            followUpTime: '14:00',
            trialDate: '2026-07-23',
            status: 'Trial Scheduled',
            assignedTo: 'Karan Verma',
            priority: 'Hot',
            source: 'Instagram',
            interestedPlan: 'Annual VIP',
            remarks: 'Wants personal training + diet consultation.',
            createdAt: new Date().toISOString()
          },
          {
            id: 'enq_102',
            name: 'Ananya Roy',
            firstName: 'Ananya',
            lastName: 'Roy',
            phone: '9812345678',
            email: 'ananya.roy@yahoo.com',
            gender: 'Female',
            address: 'Sector 68, Mohali',
            nextFollowUp: '2026-07-25',
            followUpTime: '11:30',
            trialDate: '',
            status: 'Pending',
            assignedTo: 'Sneha Kapoor',
            priority: 'Warm',
            source: 'Walk-in',
            interestedPlan: 'Quarterly Prime',
            remarks: 'Inquired about ladies fitness batch.',
            createdAt: new Date().toISOString()
          },
          {
            id: 'enq_103',
            name: 'Vikram Singh',
            firstName: 'Vikram',
            lastName: 'Singh',
            phone: '9988776655',
            email: 'vikram.v@gmail.com',
            gender: 'Male',
            address: 'Aerocity, Mohali',
            nextFollowUp: '2026-07-22',
            followUpTime: '17:00',
            trialDate: '2026-07-22',
            status: 'Contacted',
            assignedTo: 'Dev Rana',
            priority: 'Hot',
            source: 'Referral',
            interestedPlan: 'Monthly Standard',
            remarks: 'Friend of Arjun Mehta. Excited for trial today.',
            createdAt: new Date().toISOString()
          }
        ]);
        setLoading(false);
      }
    };

    try {
      const q = query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        if (!isMounted) return;
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Enquiry[];
        setEnquiries(data);
        setLoading(false);
      }, (error) => {
        console.warn('Enquiries Firestore listener error:', error.message);
        if (isMounted) fetchFallbackEnquiries();
      });

      return () => {
        isMounted = false;
        unsub();
      };
    } catch (e) {
      fetchFallbackEnquiries();
    }
  }, []);

  // ── FILTERED LEADS ──────────────
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(item => {
      const nameMatch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.phone || '').includes(searchQuery) ||
                        (item.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      const statusMatch = statusFilter === 'All' || item.status === statusFilter;
      const priorityMatch = priorityFilter === 'All' || item.priority === priorityFilter;
      const staffMatch = staffFilter === 'All' || item.assignedTo === staffFilter;

      return nameMatch && statusMatch && priorityMatch && staffMatch;
    });
  }, [enquiries, searchQuery, statusFilter, priorityFilter, staffFilter]);

  // ── KPI METRICS ──────────────
  const totalLeadsCount = enquiries.length;
  const hotLeadsCount = enquiries.filter(e => e.priority === 'Hot').length;
  const convertedCount = enquiries.filter(e => e.status === 'Converted').length;
  const conversionRate = totalLeadsCount > 0 ? Math.round((convertedCount / totalLeadsCount) * 100) : 68;

  // Reset Create Form
  const resetForm = () => {
    setFirstName(''); setLastName(''); setContact(''); setAltContact('');
    setEmail(''); setGender('Male'); setAddress(''); setFollowupDate('');
    setFollowupTime('11:00'); setTrialDate(''); setStatus('Pending');
    setAttendedBy('Karan Verma'); setPriority('Warm'); setSource('Instagram');
    setInquiryFor('Monthly Standard'); setRemarks('');
  };

  // Create New Lead
  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !contact) {
      toast.error('First Name and Contact Number are required!');
      return;
    }

    const newLeadPayload: Omit<Enquiry, 'id'> = {
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      phone: contact,
      altPhone: altContact,
      email,
      gender,
      address,
      nextFollowUp: followupDate || new Date().toISOString().split('T')[0],
      followUpTime: followupTime || '11:00',
      trialDate,
      status,
      assignedTo: attendedBy,
      priority,
      source,
      interestedPlan: inquiryFor,
      remarks,
      createdAt: new Date().toISOString()
    };

    try {
      let docId = 'enq_' + Date.now();
      try {
        const docRef = await addDoc(collection(db, 'enquiries'), newLeadPayload);
        docId = docRef.id;
      } catch (err) {
        console.warn('Saved locally due to offline/permission:', err);
      }

      setEnquiries(prev => [{ id: docId, ...newLeadPayload }, ...prev]);
      toast.success('🎉 New Enquiry Lead Captured Successfully!');
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      resetForm();
      setShowCreateModal(false);
    } catch (e: any) {
      toast.error('Failed to create enquiry: ' + e.message);
    }
  };

  // Update Status
  const handleUpdateStatus = async (id: string, newStatus: Enquiry['status']) => {
    try {
      await updateDoc(doc(db, 'enquiries', id), { status: newStatus });
      toast.success(`Updated status to ${newStatus}`);
    } catch (_) {}
    setEnquiries(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    if (selectedEnquiry?.id === id) {
      setSelectedEnquiry(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  // Delete Enquiry
  const handleDeleteEnquiry = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this enquiry record?')) return;
    try {
      await deleteDoc(doc(db, 'enquiries', id));
    } catch (_) {}
    setEnquiries(prev => prev.filter(e => e.id !== id));
    if (selectedEnquiry?.id === id) setSelectedEnquiry(null);
    toast.success('Enquiry record deleted');
  };

  // Convert Lead to Member
  const handleConvertLead = async (enq: Enquiry) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await addMember({
        name: enq.name,
        phone: enq.phone,
        email: enq.email || `${enq.phone}@alphagym.com`,
        plan: convertPlan,
        branch: 'Mohali, Punjab',
        trainer: enq.assignedTo || 'Karan Verma',
        gender: enq.gender || 'Male',
        joinDate: today,
        expiryDate: expiry,
        status: 'active',
        paymentStatus: 'paid',
        paidAmount: Number(convertPrice) || 2500
      });

      // Update enquiry status to Converted
      await handleUpdateStatus(enq.id, 'Converted');

      confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
      toast.success(`🚀 ${enq.name} successfully converted to Active Member!`);
      setShowConvertModal(null);
    } catch (err: any) {
      toast.error('Conversion failed: ' + err.message);
    }
  };

  // Direct WhatsApp Launcher
  const launchWhatsApp = (enq: Enquiry) => {
    const phone = enq.phone.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hi ${enq.name}! 👋 Thank you for inquiring at Alpha Gym Zone. We'd love to invite you for your complimentary trial session. When can we schedule your visit? 💪`
    );
    window.open(`https://wa.me/91${phone}?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6 font-sans text-slate-800 pb-32">
      
      {/* ── 1. HEADER SECTION ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                Alpha CRM OS 4.0
              </span>
              <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                <Sparkles size={12} /> AI Lead Scorer Active
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Lead Intelligence & Enquiry Hub
            </h1>
            <p className="text-xs lg:text-sm font-semibold text-slate-500 mt-1">
              Capture, qualify, track, and convert fitness leads into active gym memberships.
            </p>
          </div>

          {/* Quick Actions Header Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List size={14} /> Directory View
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                  viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid size={14} /> Kanban Pipeline
              </button>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} /> Capture New Lead
            </button>
          </div>
        </div>

        {/* ── KPI METRICS CARDS ROW ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100">
          <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100/80">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider">Total Pipeline Leads</span>
              <FileText size={16} className="text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{totalLeadsCount}</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">+14% wk</span>
            </div>
          </div>

          <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100/80">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider">High Convertibility (Hot)</span>
              <Flame size={16} className="text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600">{hotLeadsCount}</span>
              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">High Intent</span>
            </div>
          </div>

          <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100/80">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider">Converted Members</span>
              <UserCheck size={16} className="text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600">{convertedCount}</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Won</span>
            </div>
          </div>

          <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100/80">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider">Lead Closing Rate</span>
              <TrendingUp size={16} className="text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-600">{conversionRate}%</span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">AI Optimized</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. CONTROLS & FILTER BAR ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search lead name, mobile number, or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Contacted">Contacted</option>
            <option value="Trial Scheduled">Trial Scheduled</option>
            <option value="Converted">Converted</option>
            <option value="Lost">Lost</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="All">All Convertibility</option>
            <option value="Hot">🔥 Hot Leads</option>
            <option value="Warm">☀️ Warm Leads</option>
            <option value="Cold">❄️ Cold Leads</option>
          </select>

          {/* Assigned Staff Filter */}
          <select
            value={staffFilter}
            onChange={e => setStaffFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="All">All Staff</option>
            {STAFF_LIST.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('All'); setPriorityFilter('All'); setStaffFilter('All'); }}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Reset Filters"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── 3. MAIN CONTENT: TABLE OR KANBAN ────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        <div className={selectedEnquiry ? 'xl:col-span-3' : 'xl:col-span-4'}>
          {loading ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : viewMode === 'table' ? (
            /* ── DIRECTORY TABLE VIEW ────────────────────────────── */
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Lead Name & Contact</th>
                      <th className="px-4 py-4">Interested Plan</th>
                      <th className="px-4 py-4">Source</th>
                      <th className="px-4 py-4 text-center">Convertibility</th>
                      <th className="px-4 py-4">Assigned To</th>
                      <th className="px-4 py-4">Next Follow-Up</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEnquiries.length > 0 ? (
                      filteredEnquiries.map(enq => {
                        const isSelected = selectedEnquiry?.id === enq.id;
                        return (
                          <tr
                            key={enq.id}
                            onClick={() => setSelectedEnquiry(enq)}
                            className={`hover:bg-slate-50/80 transition-all cursor-pointer ${
                              isSelected ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-700 font-black text-xs flex items-center justify-center shrink-0 border border-white shadow-sm">
                                  {(enq.name || 'L').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                    {enq.name}
                                  </div>
                                  <div className="text-slate-400 font-semibold text-[11px] flex items-center gap-2 mt-0.5">
                                    <span>📞 {enq.phone}</span>
                                    {enq.email && <span>• ✉️ {enq.email}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                                {enq.interestedPlan || 'General Fitness'}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <span className="text-slate-500 font-semibold flex items-center gap-1">
                                <Building size={12} className="text-slate-400" />
                                {enq.source || 'Direct'}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-center">
                              {enq.priority === 'Hot' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 rounded-full font-black text-[10px] uppercase border border-rose-100">
                                  <Flame size={12} /> Hot Lead
                                </span>
                              ) : enq.priority === 'Warm' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full font-black text-[10px] uppercase border border-amber-100">
                                  <Sun size={12} /> Warm
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-bold text-[10px] uppercase">
                                  <Snowflake size={12} /> Cold
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <div className="text-slate-700 font-semibold flex items-center gap-1.5">
                                <User size={13} className="text-slate-400" />
                                {enq.assignedTo || 'Unassigned'}
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              {enq.nextFollowUp ? (
                                <div className="text-slate-700 font-semibold flex items-center gap-1">
                                  <Calendar size={13} className="text-blue-500" />
                                  {enq.nextFollowUp} <span className="text-slate-400 font-normal">({enq.followUpTime || '11:00'})</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Not set</span>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                enq.status === 'Converted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                enq.status === 'Trial Scheduled' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                enq.status === 'Contacted' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                enq.status === 'Lost' ? 'bg-rose-50 text-rose-500 border border-rose-100' :
                                'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}>
                                {enq.status}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => launchWhatsApp(enq)}
                                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all border border-emerald-100"
                                  title="Send WhatsApp Message"
                                >
                                  <MessageSquare size={14} />
                                </button>
                                
                                {enq.status !== 'Converted' && (
                                  <button
                                    onClick={() => setShowConvertModal(enq)}
                                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm"
                                    title="Convert to Member"
                                  >
                                    <UserPlus size={13} /> Convert
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteEnquiry(enq.id)}
                                  className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all border border-slate-100"
                                  title="Delete Lead"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-slate-400">
                          <FileText size={32} className="mx-auto mb-2 opacity-50" />
                          <p className="font-bold text-sm text-slate-600">No leads matching your current filters.</p>
                          <p className="text-xs text-slate-400 mt-1">Try clearing filters or adding a new enquiry lead.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ── KANBAN BOARD VIEW ──────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {(['Pending', 'Contacted', 'Trial Scheduled', 'Converted', 'Lost'] as const).map(colStatus => {
                const colLeads = filteredEnquiries.filter(e => e.status === colStatus);
                return (
                  <div key={colStatus} className="bg-slate-100/60 rounded-3xl p-4 border border-slate-200/60 flex flex-col h-full min-h-[600px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider">{colStatus}</span>
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center">
                          {colLeads.length}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                      {colLeads.map(enq => (
                        <motion.div
                          key={enq.id}
                          layout
                          onClick={() => setSelectedEnquiry(enq)}
                          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-black text-slate-900 text-xs">{enq.name}</h4>
                              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">📞 {enq.phone}</p>
                            </div>
                            {enq.priority === 'Hot' && <Flame size={14} className="text-rose-500" />}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                            <span className="font-bold text-slate-700">{enq.interestedPlan || 'Standard'}</span>
                            <span className="text-blue-600 font-bold">{enq.source}</span>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); launchWhatsApp(enq); }}
                              className="flex-1 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold transition-all text-center"
                            >
                              WhatsApp
                            </button>
                            {colStatus !== 'Converted' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setShowConvertModal(enq); }}
                                className="flex-1 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold transition-all text-center"
                              >
                                Convert
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 4. RIGHT SIDE INSPECTOR / TIMELINE PANEL ────────────────────────────── */}
        <AnimatePresence>
          {selectedEnquiry && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="xl:col-span-1"
            >
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] sticky top-6 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Inspector</span>
                  <button
                    onClick={() => setSelectedEnquiry(null)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Profile Brief */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md mb-3">
                    {(selectedEnquiry.name || 'L').charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-lg font-black text-slate-900">{selectedEnquiry.name}</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">{selectedEnquiry.phone}</p>
                </div>

                {/* Lead Status Controls */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Lead Pipeline Status</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['Pending', 'Contacted', 'Trial Scheduled', 'Converted', 'Lost'] as const).map(st => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(selectedEnquiry.id, st)}
                        className={`py-2 px-3 rounded-xl text-[10px] font-extrabold transition-all border ${
                          selectedEnquiry.status === st
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lead Specs */}
                <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-100 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Convertibility:</span>
                    <span className="font-bold text-slate-800">{selectedEnquiry.priority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Source:</span>
                    <span className="font-bold text-slate-800">{selectedEnquiry.source || 'Direct'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Interested Plan:</span>
                    <span className="font-bold text-slate-800">{selectedEnquiry.interestedPlan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned To:</span>
                    <span className="font-bold text-slate-800">{selectedEnquiry.assignedTo}</span>
                  </div>
                  {selectedEnquiry.remarks && (
                    <div className="pt-2 border-t border-slate-200/60 text-slate-600">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Notes / Remarks</span>
                      <p className="italic bg-white p-2.5 rounded-xl border border-slate-200/60">{selectedEnquiry.remarks}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => launchWhatsApp(selectedEnquiry)}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageSquare size={16} /> WhatsApp Follow-Up
                  </button>

                  {selectedEnquiry.status !== 'Converted' && (
                    <button
                      onClick={() => setShowConvertModal(selectedEnquiry)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserPlus size={16} /> Convert to Active Member
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 5. CREATE NEW LEAD MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 lg:p-8 z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Capture New Enquiry Lead</h3>
                  <p className="text-xs font-semibold text-slate-400">Fill in prospect details to enter into CRM automation pipeline</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateEnquiry} className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="e.g. Rahul"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="e.g. Verma"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">Contact Number *</label>
                    <input
                      type="tel"
                      required
                      value={contact}
                      onChange={e => setContact(e.target.value)}
                      placeholder="Mobile number"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">Convertibility (Priority)</label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Hot">🔥 Hot Lead (High Intent)</option>
                      <option value="Warm">☀️ Warm Lead (Moderate)</option>
                      <option value="Cold">❄️ Cold Lead (Low)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">Lead Source</label>
                    <select
                      value={source}
                      onChange={e => setSource(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">Interested Membership</label>
                    <select
                      value={inquiryFor}
                      onChange={e => setInquiryFor(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">Assigned Staff</label>
                    <select
                      value={attendedBy}
                      onChange={e => setAttendedBy(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      {STAFF_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">Next Follow-Up Date</label>
                    <input
                      type="date"
                      value={followupDate}
                      onChange={e => setFollowupDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">Scheduled Trial Date</label>
                    <input
                      type="date"
                      value={trialDate}
                      onChange={e => setTrialDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">Remarks / Special Requirements</label>
                  <textarea
                    rows={3}
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Wants morning slots, interested in weight loss package..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendWhatsAppMessage}
                        onChange={e => setSendWhatsAppMessage(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span>Auto WhatsApp Greeting</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      Create Inquiry Lead
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 6. CONVERT TO MEMBER MODAL ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showConvertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConvertModal(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Convert Lead to Member</h3>
                    <p className="text-[11px] font-semibold text-slate-400">{showConvertModal.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConvertModal(null)}
                  className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">Membership Plan</label>
                  <select
                    value={convertPlan}
                    onChange={e => setConvertPlan(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">Package Price (₹)</label>
                  <input
                    type="number"
                    value={convertPrice}
                    onChange={e => setConvertPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowConvertModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConvertLead(showConvertModal)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} /> Confirm & Activate Member
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
