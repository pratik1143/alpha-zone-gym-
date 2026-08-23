'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, Phone, MessageSquare, Mail, Calendar, Clock,
  User, Shield, Sparkles, ArrowRight, CheckCircle2, AlertCircle, Trash2, Edit3,
  UserCheck, Flame, Sun, Snowflake, LayoutGrid, List, ChevronRight, Zap,
  RefreshCw, X, Download, Upload, Send, Check, UserPlus, FileText, Activity, TrendingUp,
  Building, MapPin, Award, Layers, History, CheckCircle, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import API from '@/services/api';
import { useGymStore } from '@/store';
import { z } from 'zod';
import { enquiryService, EnquiryItem, EnquiryHistoryItem } from '@/services/enquiry.service';
import { getTodayInIndia, isTodayInIndia, isOverdueInIndia, isUpcomingInIndia, formatIndianDate } from '@/lib/dateUtils';

type Enquiry = EnquiryItem;

const SOURCES = ['Walk-in', 'Instagram', 'Facebook', 'Google Ad', 'Referral', 'Phone Inquiry', 'Excel Import', 'Other'];
const PLANS = ['1 month', '2 months', '3 months', '6 months', '12 months', 'Day Pass', 'Monthly Standard', 'Quarterly Prime', 'Annual VIP'];
const STAFF_LIST = ['Veer Chand (manager)', 'Tanya Mehra', 'Ujjval Peet Kaur', 'Karan Verma', 'Dev Rana', 'Sneha Kapoor', 'Reception Desk'];

const enquiryFormSchema = z.object({
  firstName: z.string().trim().min(2, 'First Name must be at least 2 characters'),
  contact: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  email: z.string().trim().optional().refine(val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Enter a valid email address'),
  source: z.string().min(1, 'Please select a source'),
  inquiryFor: z.string().min(1, 'Please select a membership plan'),
  remarks: z.string().max(500, 'Remarks must be under 500 characters').optional()
});

export default function EnquiryGodLevelHub() {
  const { addMember, fetchMembers } = useGymStore();

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [enquiryHistoryList, setEnquiryHistoryList] = useState<EnquiryHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState<Enquiry | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importReport, setImportReport] = useState<any | null>(null);

  // Default Today
  const todayStr = useMemo(() => getTodayInIndia(), []);

  // Filter Tabs: 'all' | 'pending' | 'today' | 'overdue' | 'upcoming' | 'closed'
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'pending' | 'today' | 'overdue' | 'upcoming' | 'closed'>('all');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
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
  const [followupDate, setFollowupDate] = useState(todayStr);
  const [followupTime, setFollowupTime] = useState('11:00');
  const [status, setStatus] = useState<'Pending' | 'Closed'>('Pending');
  const [attendedBy, setAttendedBy] = useState('Veer Chand (manager)');
  const [priority, setPriority] = useState<'Hot' | 'Warm' | 'Cold'>('Warm');
  const [source, setSource] = useState('Walk-in');
  const [inquiryFor, setInquiryFor] = useState('1 month');
  const [remarks, setRemarks] = useState('');

  // Convert to Member Form State
  const [convertPlan, setConvertPlan] = useState('Monthly Standard');
  const [convertPrice, setConvertPrice] = useState('2500');

  // ── REALTIME FIRESTORE LISTENER ──────────────
  useEffect(() => {
    setLoading(true);
    const unsubscribe = enquiryService.subscribe(
      (data) => {
        setEnquiries(data);
        setLoading(false);
      },
      (err) => {
        console.warn('Enquiries listener warning:', err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch History whenever an enquiry is selected
  useEffect(() => {
    if (selectedEnquiry?.id) {
      setLoadingHistory(true);
      enquiryService.getHistory(selectedEnquiry.id)
        .then(hist => {
          if (hist.length > 0) {
            setEnquiryHistoryList(hist);
          } else if (Array.isArray(selectedEnquiry.history)) {
            setEnquiryHistoryList(selectedEnquiry.history);
          } else {
            setEnquiryHistoryList([]);
          }
        })
        .catch(() => {
          setEnquiryHistoryList(Array.isArray(selectedEnquiry.history) ? selectedEnquiry.history : []);
        })
        .finally(() => setLoadingHistory(false));
    }
  }, [selectedEnquiry]);

  // Dynamic Tab Counts
  const allCount = enquiries.length;
  const pendingCount = useMemo(() => enquiries.filter(e => e.status === 'Pending').length, [enquiries]);
  const closedCount = useMemo(() => enquiries.filter(e => e.status === 'Closed' || e.status === 'Converted').length, [enquiries]);
  
  const todayCount = useMemo(() => enquiries.filter(e => {
    if (e.status !== 'Pending') return false;
    const d = (e.nextFollowUpDate || e.nextFollowUp || '').split('T')[0];
    return isTodayInIndia(d);
  }).length, [enquiries]);

  const overdueCount = useMemo(() => enquiries.filter(e => {
    if (e.status !== 'Pending') return false;
    const d = (e.nextFollowUpDate || e.nextFollowUp || '').split('T')[0];
    return isOverdueInIndia(d);
  }).length, [enquiries]);

  const upcomingCount = useMemo(() => enquiries.filter(e => {
    if (e.status !== 'Pending') return false;
    const d = (e.nextFollowUpDate || e.nextFollowUp || '').split('T')[0];
    return isUpcomingInIndia(d);
  }).length, [enquiries]);

  // Filtered Leads
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(item => {
      const fDate = (item.nextFollowUpDate || item.nextFollowUp || '').split('T')[0];

      // Tab filtering
      if (activeFilterTab === 'pending' && item.status !== 'Pending') return false;
      if (activeFilterTab === 'closed' && item.status !== 'Closed' && item.status !== 'Converted') return false;
      if (activeFilterTab === 'today' && (item.status !== 'Pending' || !isTodayInIndia(fDate))) return false;
      if (activeFilterTab === 'overdue' && (item.status !== 'Pending' || !isOverdueInIndia(fDate))) return false;
      if (activeFilterTab === 'upcoming' && (item.status !== 'Pending' || !isUpcomingInIndia(fDate))) return false;

      // Search & Dropdown Filters
      const nameMatch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.phone || '').includes(searchQuery) ||
                        (item.interestedPlan || '').toLowerCase().includes(searchQuery.toLowerCase());
      const priorityMatch = priorityFilter === 'All' || item.priority === priorityFilter;
      const staffMatch = staffFilter === 'All' || item.assignedTo === staffFilter;

      return nameMatch && priorityMatch && staffMatch;
    });
  }, [enquiries, activeFilterTab, searchQuery, priorityFilter, staffFilter]);

  // Reset Create Form
  const resetForm = () => {
    setFirstName(''); setLastName(''); setContact(''); setAltContact('');
    setEmail(''); setGender('Male'); setAddress(''); setFollowupDate(todayStr);
    setFollowupTime('11:00'); setStatus('Pending');
    setAttendedBy('Veer Chand (manager)'); setPriority('Warm'); setSource('Walk-in');
    setInquiryFor('1 month'); setRemarks(''); setFormErrors({});
  };

  // Create New Lead
  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validationResult = enquiryFormSchema.safeParse({
      firstName,
      contact,
      email,
      source,
      inquiryFor,
      remarks
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach(issue => {
        if (issue.path[0]) {
          errors[issue.path[0].toString()] = issue.message;
        }
      });
      setFormErrors(errors);
      toast.error('Please fix validation errors');
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const payload: Partial<EnquiryItem> = {
        name: fullName,
        firstName,
        lastName,
        phone: contact,
        altPhone: altContact,
        email,
        gender,
        address,
        nextFollowUpDate: followupDate,
        nextFollowUp: followupDate,
        followUpTime: followupTime,
        status,
        assignedTo: attendedBy,
        priority,
        source,
        interestedPlan: inquiryFor,
        duration: inquiryFor,
        remarks,
        createdAt: new Date().toISOString()
      };

      await enquiryService.create(payload);
      toast.success('✓ Enquiry lead created successfully!');
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      toast.error('Failed to create enquiry: ' + (err.message || 'Error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await enquiryService.update(id, { status: newStatus as any });
      toast.success(`Enquiry marked as ${newStatus}`);
      if (selectedEnquiry && selectedEnquiry.id === id) {
        setSelectedEnquiry({ ...selectedEnquiry, status: newStatus as any });
      }
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  // Delete Lead
  const handleDeleteEnquiry = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this enquiry lead?')) return;
    try {
      await enquiryService.remove(id);
      toast.success('Enquiry lead deleted');
      if (selectedEnquiry?.id === id) setSelectedEnquiry(null);
    } catch (err: any) {
      toast.error('Failed to delete enquiry');
    }
  };

  // Convert to Member
  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showConvertModal) return;

    try {
      await enquiryService.convertToMember(showConvertModal.id, convertPlan, convertPrice);
      toast.success('✓ Lead converted to Member successfully!', { icon: '🎉' });
      setShowConvertModal(null);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      toast.error('Failed to convert: ' + err.message);
    }
  };

  // Excel File Upload Handler
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportReport(null);
    toast.loading('Importing real client inquiries from Excel...', { id: 'imp' });

    try {
      const res = await enquiryService.importExcel(file);
      setImportReport(res.report);
      toast.success('✓ Enquiries imported successfully!', { id: 'imp' });
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (err: any) {
      toast.error('Import failed: ' + (err.response?.data?.error || err.message), { id: 'imp' });
    } finally {
      setIsImporting(false);
    }
  };

  const launchWhatsApp = (enq: Enquiry) => {
    const cleanPhone = enq.phone.replace(/[^0-9]/g, '');
    const msg = `Hello ${enq.name}, thank you for inquiring about Alpha Zone Gym (${enq.interestedPlan || 'Membership'}). How can we assist you today?`;
    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6 text-left">
      
      {/* ── 1. HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <UserPlus size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Enquiries & Leads Hub</h1>
              <p className="text-xs text-slate-500 font-medium">Real client enquiries, automatic follow-up reminders & closed lead history</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl transition-all flex items-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <Upload size={15} /> Import Excel (.xlsx)
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 border-none cursor-pointer"
          >
            <Plus size={16} /> New Enquiry
          </button>
        </div>
      </div>

      {/* ── 2. DYNAMIC FILTER TABS ───────────────────────────── */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-1 overflow-x-auto custom-scrollbar">
        {[
          { id: 'all', label: 'All', count: allCount, color: 'bg-slate-100 text-slate-800' },
          { id: 'pending', label: 'Pending', count: pendingCount, color: 'bg-amber-100 text-amber-800' },
          { id: 'today', label: "Today's Follow-up", count: todayCount, color: 'bg-blue-100 text-blue-800' },
          { id: 'overdue', label: 'Overdue', count: overdueCount, color: 'bg-red-100 text-red-800' },
          { id: 'upcoming', label: 'Upcoming', count: upcomingCount, color: 'bg-indigo-100 text-indigo-800' },
          { id: 'closed', label: 'Closed History', count: closedCount, color: 'bg-emerald-100 text-emerald-800' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilterTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border-none cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeFilterTab === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeFilterTab === tab.id ? 'bg-blue-800 text-white' : tab.color
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── 3. SEARCH & CONTROLS BAR ─────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 rounded-xl border border-slate-200 outline-none focus:border-blue-600 transition-all placeholder-slate-400"
            />
          </div>

          {/* Representative Filter */}
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 rounded-xl border border-slate-200 outline-none cursor-pointer focus:border-blue-600"
          >
            <option value="All">All Representatives</option>
            {STAFF_LIST.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 rounded-xl border border-slate-200 outline-none cursor-pointer focus:border-blue-600"
          >
            <option value="All">All Priorities</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg border-none cursor-pointer transition-all ${
              viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-1.5 rounded-lg border-none cursor-pointer transition-all ${
              viewMode === 'kanban' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* ── 4. MAIN CONTENT AREA (TABLE OR KANBAN + INSPECTOR) ─ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left 2 Cols: Lead List */}
        <div className={`${selectedEnquiry ? 'xl:col-span-2' : 'xl:col-span-3'} space-y-4`}>
          {viewMode === 'table' ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Name & Contact</th>
                      <th className="py-3.5 px-4">Plan / Duration</th>
                      <th className="py-3.5 px-4">Representative</th>
                      <th className="py-3.5 px-4">Follow-Up Date</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredEnquiries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <FileText size={32} className="mx-auto mb-2 opacity-40" />
                          <p className="font-bold text-sm text-slate-600">No matching enquiries found.</p>
                          <p className="text-xs text-slate-400 mt-1">Try switching tabs or resetting search filters.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredEnquiries.map((enq) => {
                        const isSelected = selectedEnquiry?.id === enq.id;
                        const cleanDate = (enq.nextFollowUpDate || enq.nextFollowUp || '').split('T')[0];
                        const isDueToday = cleanDate === todayStr;
                        const isTaskOverdue = isOverdueInIndia(cleanDate);

                        return (
                          <tr
                            key={enq.id}
                            onClick={() => setSelectedEnquiry(enq)}
                            className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${
                              isSelected ? 'bg-blue-50/50 font-semibold' : ''
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                                  {(enq.name || 'E').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 block">{enq.name}</span>
                                  <span className="text-[11px] text-slate-500">{enq.phone}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                                {enq.duration || enq.interestedPlan || '1 month'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-slate-700 font-semibold">
                              {enq.assignedTo || 'Veer Chand (manager)'}
                            </td>

                            <td className="py-3.5 px-4">
                              {cleanDate ? (
                                <span className={`font-bold flex items-center gap-1 ${
                                  isTaskOverdue && enq.status === 'Pending' ? 'text-red-600' :
                                  isDueToday && enq.status === 'Pending' ? 'text-blue-700 font-black' :
                                  'text-slate-700'
                                }`}>
                                  📅 {isDueToday ? 'Today' : formatIndianDate(cleanDate)}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Not set</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                enq.status === 'Converted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                enq.status === 'Closed' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                                'bg-amber-100 text-amber-900 border border-amber-200'
                              }`}>
                                {enq.status}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => launchWhatsApp(enq)}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all border border-emerald-200 cursor-pointer"
                                  title="WhatsApp"
                                >
                                  <MessageSquare size={13} />
                                </button>
                                
                                {enq.status === 'Pending' && (
                                  <button
                                    onClick={() => setShowConvertModal(enq)}
                                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 border-none cursor-pointer"
                                  >
                                    <UserPlus size={12} /> Convert
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Kanban Board */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['Pending', 'Closed'] as const).map(colStatus => {
                const colLeads = filteredEnquiries.filter(e => e.status === colStatus);
                return (
                  <div key={colStatus} className="bg-slate-100/60 rounded-3xl p-4 border border-slate-200 flex flex-col h-full min-h-[500px]">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">{colStatus} Enquiries</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-black">
                        {colLeads.length}
                      </span>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                      {colLeads.map(enq => (
                        <div
                          key={enq.id}
                          onClick={() => setSelectedEnquiry(enq)}
                          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-black text-slate-900 text-xs">{enq.name}</h4>
                              <p className="text-[10px] text-slate-500">📞 {enq.phone}</p>
                            </div>
                            <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded">
                              {enq.duration || '1 month'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
                            <span>Rep: {enq.assignedTo || 'Staff'}</span>
                            <span className="font-bold text-blue-600">{formatIndianDate(enq.nextFollowUpDate || enq.nextFollowUp || '')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Lead Inspector & History Timeline */}
        <AnimatePresence>
          {selectedEnquiry && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="xl:col-span-1"
            >
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs sticky top-6 space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <History size={14} className="text-blue-600" /> Enquiry Timeline & Details
                  </span>
                  <button
                    onClick={() => setSelectedEnquiry(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 border-none cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Profile Card */}
                <div className="text-center space-y-1">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md mb-2">
                    {(selectedEnquiry.name || 'E').charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-base font-black text-slate-900">{selectedEnquiry.name}</h3>
                  <p className="text-xs font-bold text-slate-600 flex items-center justify-center gap-1">
                    📞 {selectedEnquiry.phone}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Interested Plan: <span className="font-bold text-slate-800">{selectedEnquiry.duration || selectedEnquiry.interestedPlan || '1 month'}</span>
                  </p>
                </div>

                {/* Status Switcher */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Status</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['Pending', 'Closed'].map(st => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(selectedEnquiry.id, st)}
                        className={`py-2 text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                          selectedEnquiry.status === st
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Representative & Follow-Up Date */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Representative:</span>
                    <span className="font-bold text-slate-800">{selectedEnquiry.assignedTo || 'Veer Chand (manager)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Follow-up Date:</span>
                    <span className="font-bold text-blue-700">{formatIndianDate(selectedEnquiry.nextFollowUpDate || selectedEnquiry.nextFollowUp || '')}</span>
                  </div>
                </div>

                {/* Timeline History */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
                    <span>Activity Timeline</span>
                    <span className="text-[10px] font-bold text-slate-400">{enquiryHistoryList.length} Event(s)</span>
                  </h4>

                  {loadingHistory ? (
                    <div className="p-4 text-center text-xs text-slate-400">Loading timeline...</div>
                  ) : enquiryHistoryList.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                      No past activities recorded.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {enquiryHistoryList.map((hist, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{hist.title || 'Enquiry Event'}</span>
                            {hist.source === 'excel_import' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                                Imported History
                              </span>
                            )}
                          </div>
                          {hist.description && (
                            <p className="text-[11px] text-slate-600 leading-tight">{hist.description}</p>
                          )}
                          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                            <span>Status: {hist.status || 'Active'}</span>
                            <span>{hist.date ? formatIndianDate(hist.date) : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => launchWhatsApp(selectedEnquiry)}
                    className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all border border-emerald-200 cursor-pointer"
                  >
                    <MessageSquare size={13} /> WhatsApp
                  </button>

                  <a
                    href={`tel:${selectedEnquiry.phone}`}
                    className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all border border-blue-200 no-underline"
                  >
                    <Phone size={13} /> Call
                  </a>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ── 5. EXCEL IMPORT MODAL ────────────────────────────── */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="text-blue-600" size={18} /> Import Real Enquiries Excel
                </h3>
                <button onClick={() => setShowImportModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 border-none cursor-pointer">
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs text-slate-600">
                <p>
                  Upload your master enquiry Excel spreadsheet (e.g. <code>inquiries 230826.xlsx</code>). The system will automatically:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                  <li>Normalize and import all Sheet 1 master enquiry records (386 rows)</li>
                  <li>Link Sheet 2 closed records as history timeline without duplicates</li>
                  <li>Generate automated follow-ups for all pending enquiries</li>
                </ul>

                <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelUpload}
                    disabled={isImporting}
                    className="hidden"
                    id="excel-file-input"
                  />
                  <label htmlFor="excel-file-input" className="cursor-pointer block space-y-2">
                    <Upload size={32} className="mx-auto text-blue-600 opacity-80" />
                    <span className="font-bold text-slate-800 block text-xs">
                      {isImporting ? 'Processing & Validating Rows...' : 'Click to Browse Excel File (.xlsx)'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Strict 10-digit Indian phone normalization & date preservation</span>
                  </label>
                </div>

                {importReport && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                    <h4 className="font-black text-emerald-950 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Import Complete
                    </h4>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <span>Total Rows: <b>{importReport.totalRows}</b></span>
                      <span>Master Imported: <b>{importReport.imported}</b></span>
                      <span>Pending: <b>{importReport.pending}</b></span>
                      <span>Closed: <b>{importReport.closed}</b></span>
                      <span>Duplicates Prevented: <b>{importReport.duplicatesPrevented}</b></span>
                      <span>Closed History Linked: <b>{importReport.historicalRecordsLinked}</b></span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 6. CREATE MANUAL ENQUIRY MODAL ──────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="text-blue-600" size={18} /> New Enquiry Lead
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 border-none cursor-pointer">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateEnquiry} className="space-y-4 text-xs text-left">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sharma"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={contact}
                      onChange={e => setContact(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Interested Plan *</label>
                    <select
                      value={inquiryFor}
                      onChange={e => setInquiryFor(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                    >
                      {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Follow-up Date *</label>
                    <input
                      type="date"
                      required
                      value={followupDate}
                      onChange={e => setFollowupDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Representative</label>
                    <select
                      value={attendedBy}
                      onChange={e => setAttendedBy(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                    >
                      {STAFF_LIST.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Enter notes about client inquiry..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-600 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 border-none cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Create Enquiry'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 7. CONVERT TO MEMBER MODAL ──────────────────────── */}
      <AnimatePresence>
        {showConvertModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="text-emerald-600" size={18} /> Convert to Active Member
                </h3>
                <button onClick={() => setShowConvertModal(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 border-none cursor-pointer">
                  ✕
                </button>
              </div>

              <form onSubmit={handleConvertSubmit} className="space-y-4 text-xs text-left">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
                  <span className="font-bold text-slate-900 block">{showConvertModal.name}</span>
                  <span className="text-[11px] text-slate-500">📞 {showConvertModal.phone}</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Membership Plan</label>
                  <select
                    value={convertPlan}
                    onChange={e => setConvertPlan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                  >
                    <option value="Monthly Standard">Monthly Standard (1 Month)</option>
                    <option value="Quarterly Prime">Quarterly Prime (3 Months)</option>
                    <option value="Semi-Annual Pro">Semi-Annual Pro (6 Months)</option>
                    <option value="Annual VIP">Annual VIP (12 Months)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    required
                    value={convertPrice}
                    onChange={e => setConvertPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowConvertModal(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 border-none cursor-pointer"
                  >
                    Confirm Conversion
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
