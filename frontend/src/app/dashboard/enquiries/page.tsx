'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Phone, MessageSquare, Mail, Calendar, Clock,
  User, Shield, Sparkles, AlertCircle, Trash2, Edit, Edit3,
  UserCheck, LayoutGrid, List, SlidersHorizontal,
  X, Upload, UserPlus, FileText,
  History, CheckCircle2, MoreHorizontal, Eye, PhoneCall, ChevronRight,
  Filter, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { z } from 'zod';
import { enquiryService, EnquiryItem, EnquiryHistoryItem } from '@/services/enquiry.service';
import { getTodayInIndia, isTodayInIndia, isOverdueInIndia, isUpcomingInIndia, formatIndianDate } from '@/lib/dateUtils';
import { resolveAvatarUrl, MALE_DEFAULT_AVATAR, FEMALE_DEFAULT_AVATAR } from '@/lib/avatar';

type Enquiry = EnquiryItem;

const SOURCES = ['Walk-in', 'Instagram', 'Facebook', 'Google Ad', 'Referral', 'Phone Inquiry', 'Excel Import', 'Other'];
const PLANS = ['1 month', '2 months', '3 months', '6 months', '12 months', 'Day Pass', 'Monthly Standard', 'Quarterly Prime', 'Annual VIP'];
const DEFAULT_STAFF_LIST = ['Veer Chand (manager)', 'Tanya Mehra', 'Ujjval Peet Kaur', 'Karan Verma', 'Dev Rana', 'Sneha Kapoor', 'Reception Desk'];

const enquiryFormSchema = z.object({
  firstName: z.string().trim().min(2, 'First Name must be at least 2 characters'),
  contact: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  email: z.string().trim().optional().refine(val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Enter a valid email address'),
  source: z.string().min(1, 'Please select a source'),
  inquiryFor: z.string().min(1, 'Please select a membership plan'),
  remarks: z.string().max(500, 'Remarks must be under 500 characters').optional()
});

export default function EnquiryGodLevelHub() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [enquiryHistoryList, setEnquiryHistoryList] = useState<EnquiryHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState<Enquiry | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importReport, setImportReport] = useState<any | null>(null);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Actions Dropdown & Custom Modals State
  const [actionsMenu, setActionsMenu] = useState<{ enquiry: Enquiry; rect: DOMRect } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Enquiry | null>(null);
  const [deletingEnquiry, setDeletingEnquiry] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState<Enquiry | null>(null);
  const [schedulingEnquiry, setSchedulingEnquiry] = useState<Enquiry | null>(null);
  const [newScheduleDate, setNewScheduleDate] = useState('');

  // Default Today
  const todayStr = useMemo(() => getTodayInIndia(), []);

  // Filter Tabs: 'all' | 'pending' | 'today' | 'overdue' | 'upcoming' | 'closed'
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'pending' | 'today' | 'overdue' | 'upcoming' | 'closed'>('all');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [staffFilter, setStaffFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [planFilter, setPlanFilter] = useState<string>('All');

  // Form State for New Lead
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

  // Edit Lead Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPlan, setEditPlan] = useState('1 month');
  const [editRep, setEditRep] = useState('Veer Chand (manager)');
  const [editFollowupDate, setEditFollowupDate] = useState(todayStr);
  const [editRemarks, setEditRemarks] = useState('');
  const [editStatus, setEditStatus] = useState('Pending');

  // Convert to Member Form State
  const [convertPlan, setConvertPlan] = useState('Monthly Standard');
  const [convertPrice, setConvertPrice] = useState('2500');

  // Close floating actions menu on outside click or scroll
  useEffect(() => {
    if (!actionsMenu) return;
    const handleClose = (e: MouseEvent | Event) => {
      const target = e.target as HTMLElement;
      if (target?.closest('.enquiry-actions-portal-menu')) return;
      setActionsMenu(null);
    };
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    window.addEventListener('mousedown', handleClose);
    return () => {
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('mousedown', handleClose);
    };
  }, [actionsMenu]);

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

  // Dynamic Representatives List from Database
  const dynamicStaffList = useMemo(() => {
    const fromData = enquiries
      .map(e => e.assignedTo?.trim())
      .filter(Boolean) as string[];
    const combined = Array.from(new Set([...DEFAULT_STAFF_LIST, ...fromData]));
    return combined.filter(Boolean).sort();
  }, [enquiries]);

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

      // Status Dropdown Filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Pending' && item.status !== 'Pending') return false;
        if (statusFilter === 'Closed' && (item.status !== 'Closed' && item.status !== 'Converted')) return false;
        if (statusFilter === 'Overdue' && (item.status !== 'Pending' || !isOverdueInIndia(fDate))) return false;
      }

      // Priority Filter
      if (priorityFilter !== 'All' && item.priority !== priorityFilter) return false;

      // Plan Filter
      if (planFilter !== 'All') {
        const p = (item.duration || item.interestedPlan || '').toLowerCase();
        if (!p.includes(planFilter.toLowerCase())) return false;
      }

      // Search Filter
      const q = searchQuery.toLowerCase();
      const nameMatch = (item.name || '').toLowerCase().includes(q) ||
                        (item.phone || '').includes(q) ||
                        (item.email || '').toLowerCase().includes(q) ||
                        (item.interestedPlan || '').toLowerCase().includes(q) ||
                        String(item.id || '').toLowerCase().includes(q);
      const staffMatch = staffFilter === 'All' || item.assignedTo === staffFilter;

      return nameMatch && staffMatch;
    });
  }, [enquiries, activeFilterTab, searchQuery, statusFilter, staffFilter, priorityFilter, planFilter]);

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

  // Open Edit Modal
  const handleOpenEdit = (enq: Enquiry) => {
    setEditingEnquiry(enq);
    setEditName(enq.name || '');
    setEditPhone(enq.phone || '');
    setEditEmail(enq.email || '');
    setEditPlan(enq.duration || enq.interestedPlan || '1 month');
    setEditRep(enq.assignedTo || 'Veer Chand (manager)');
    setEditFollowupDate((enq.nextFollowUpDate || enq.nextFollowUp || todayStr).split('T')[0]);
    setEditRemarks(enq.remarks || '');
    setEditStatus(enq.status || 'Pending');
  };

  // Submit Edit Lead
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEnquiry) return;
    try {
      await enquiryService.update(editingEnquiry.id, {
        name: editName,
        phone: editPhone,
        email: editEmail,
        duration: editPlan,
        interestedPlan: editPlan,
        assignedTo: editRep,
        nextFollowUpDate: editFollowupDate,
        nextFollowUp: editFollowupDate,
        remarks: editRemarks,
        status: editStatus as any,
        updatedAt: new Date().toISOString()
      });
      toast.success('Enquiry updated successfully!');
      setEditingEnquiry(null);
      if (selectedEnquiry?.id === editingEnquiry.id) {
        setSelectedEnquiry(prev => prev ? ({ ...prev, name: editName, phone: editPhone, email: editEmail, duration: editPlan, assignedTo: editRep, nextFollowUpDate: editFollowupDate, status: editStatus as any }) : null);
      }
    } catch (err: any) {
      toast.error('Failed to update enquiry: ' + err.message);
    }
  };

  // Open Schedule Follow-up Modal
  const handleOpenScheduleFollowup = (enq: Enquiry) => {
    setSchedulingEnquiry(enq);
    setNewScheduleDate((enq.nextFollowUpDate || enq.nextFollowUp || todayStr).split('T')[0]);
  };

  // Submit Schedule Follow-up
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingEnquiry || !newScheduleDate) return;
    try {
      await enquiryService.update(schedulingEnquiry.id, {
        nextFollowUpDate: newScheduleDate,
        nextFollowUp: newScheduleDate,
        status: 'Pending',
        updatedAt: new Date().toISOString()
      });
      toast.success('Follow-up scheduled for ' + formatIndianDate(newScheduleDate));
      setSchedulingEnquiry(null);
      if (selectedEnquiry?.id === schedulingEnquiry.id) {
        setSelectedEnquiry(prev => prev ? ({ ...prev, nextFollowUpDate: newScheduleDate, status: 'Pending' }) : null);
      }
    } catch (err: any) {
      toast.error('Failed to schedule follow-up: ' + err.message);
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

  // Custom Delete Handler (NO window.confirm)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingEnquiry(true);
    try {
      await enquiryService.remove(deleteTarget.id);
      toast.success('Enquiry lead deleted successfully.');
      if (selectedEnquiry?.id === deleteTarget.id) setSelectedEnquiry(null);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error('Failed to delete enquiry: ' + (err.message || 'Unknown error'));
    } finally {
      setDeletingEnquiry(false);
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

  // Parse Representative display
  const formatRepInfo = (assignedTo?: string) => {
    if (!assignedTo || assignedTo === 'Unassigned') {
      return { name: 'Unassigned', role: '' };
    }
    const match = assignedTo.match(/^(.+?)\s*\((.*?)\)$/);
    if (match) {
      return { name: match[1].trim(), role: match[2].trim() };
    }
    return { name: assignedTo, role: 'Staff' };
  };

  const hasActiveMoreFilters = priorityFilter !== 'All' || planFilter !== 'All';

  return (
    <div className="space-y-6 pb-12 w-full text-slate-800 text-left font-sans">
      
      {/* ── 1. HEADER (Design matching Members & Employees) ── */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
              Leads & Inquiries Engine
            </span>
            <span className="text-xs text-slate-400 font-mono font-bold">AZ-ENQ-v4.0</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 font-display">Enquiries & Leads Hub</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Real client enquiries, automatic follow-up reminders & closed lead history.</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl transition-all flex items-center gap-1.5 border border-slate-200 cursor-pointer shadow-2xs"
          >
            <Upload size={15} /> Import Excel (.xlsx)
          </button>

          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            className="px-6 py-3.5 bg-gradient-to-r from-[#0b5cbe] to-[#2876d0] hover:from-[#084a99] hover:to-[#0b5cbe] text-white rounded-2xl text-xs font-black uppercase tracking-wider border-none cursor-pointer flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(11,92,190,0.25)] transition-all hover:scale-[1.02] active:scale-95 shrink-0"
          >
            <Plus size={16} /> New Enquiry
          </button>
        </div>
      </div>

      {/* ── 2. DYNAMIC FILTER TABS ── */}
      <div className="bg-white p-2 rounded-3xl border border-[#d9e7f7] shadow-[0_4px_20px_rgba(11,92,190,0.02)] flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
        {[
          { id: 'all', label: 'All', count: allCount, color: 'bg-slate-100 text-slate-800' },
          { id: 'pending', label: 'Pending', count: pendingCount, color: 'bg-amber-100 text-amber-800' },
          { id: 'today', label: "Today's Follow-up", count: todayCount, color: 'bg-blue-100 text-blue-800' },
          { id: 'overdue', label: 'Overdue', count: overdueCount, color: 'bg-rose-100 text-rose-800' },
          { id: 'upcoming', label: 'Upcoming', count: upcomingCount, color: 'bg-indigo-100 text-indigo-800' },
          { id: 'closed', label: 'Closed History', count: closedCount, color: 'bg-emerald-100 text-emerald-800' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilterTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-bold rounded-2xl transition-all border-none cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeFilterTab === tab.id
                ? 'bg-[#0b5cbe] text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeFilterTab === tab.id ? 'bg-blue-900 text-white' : tab.color
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── 3. FILTER & SEARCH BAR (Unified with Members & Employees) ── */}
      <div className="bg-white border border-[#d9e7f7] rounded-3xl p-4 flex flex-wrap gap-4 items-center shadow-[0_4px_20px_rgba(11,92,190,0.02)]">
        {/* Search by name, phone or enquiry ID */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone or enquiry ID..."
            className="w-full text-xs bg-[#fdfdfd] border border-[#d9e7f7] rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:border-[#0b5cbe] focus:bg-white transition-all text-[#10233f] font-semibold placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Dynamic Representatives Dropdown */}
          <select 
            value={staffFilter}
            onChange={e => setStaffFilter(e.target.value)}
            className="text-xs bg-[#fdfdfd] border border-[#d9e7f7] rounded-2xl px-4 py-3 text-[#10233f] focus:outline-none font-bold cursor-pointer hover:bg-white transition-all"
          >
            <option value="All">All Representatives</option>
            {dynamicStaffList.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {/* Simple Statuses Dropdown */}
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs bg-[#fdfdfd] border border-[#d9e7f7] rounded-2xl px-4 py-3 text-[#10233f] focus:outline-none font-bold cursor-pointer hover:bg-white transition-all"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Closed">Closed</option>
            <option value="Overdue">Overdue</option>
          </select>

          {/* More Filters Toggle */}
          <button
            type="button"
            onClick={() => setShowMoreFilters(prev => !prev)}
            className={`px-4 py-3 text-xs font-bold rounded-2xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              showMoreFilters || hasActiveMoreFilters
                ? 'bg-blue-50 text-[#0b5cbe] border-[#0b5cbe]'
                : 'bg-[#fdfdfd] border-[#d9e7f7] text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>More Filters</span>
            {hasActiveMoreFilters && (
              <span className="w-2 h-2 rounded-full bg-[#0b5cbe]" />
            )}
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl border-none cursor-pointer transition-all ${
                viewMode === 'table' ? 'bg-white text-[#0b5cbe] shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-xl border-none cursor-pointer transition-all ${
                viewMode === 'kanban' ? 'bg-white text-[#0b5cbe] shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Kanban View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3.1 EXPANDABLE MORE FILTERS PANEL ── */}
      <AnimatePresence>
        {showMoreFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-[#d9e7f7] rounded-3xl p-4 shadow-[0_4px_20px_rgba(11,92,190,0.02)] grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="w-full text-xs bg-[#fdfdfd] border border-[#d9e7f7] rounded-2xl px-3.5 py-2.5 text-[#10233f] font-bold outline-none cursor-pointer"
                >
                  <option value="All">All Priorities</option>
                  <option value="Hot">Hot 🔥</option>
                  <option value="Warm">Warm ⚡</option>
                  <option value="Cold">Cold ❄️</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Plan / Duration</label>
                <select
                  value={planFilter}
                  onChange={e => setPlanFilter(e.target.value)}
                  className="w-full text-xs bg-[#fdfdfd] border border-[#d9e7f7] rounded-2xl px-3.5 py-2.5 text-[#10233f] font-bold outline-none cursor-pointer"
                >
                  <option value="All">All Plans</option>
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="flex items-end justify-between pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setPriorityFilter('All');
                    setPlanFilter('All');
                    setStatusFilter('All');
                    setStaffFilter('All');
                    setSearchQuery('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold border-none bg-transparent cursor-pointer"
                >
                  Reset All Filters
                </button>
                <button
                  type="button"
                  onClick={() => setShowMoreFilters(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 4. MAIN CONTENT AREA (REDESIGNED TABLE OR KANBAN + INSPECTOR) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Col(s): Leads Table/Board */}
        <div className={`${selectedEnquiry ? 'xl:col-span-2' : 'xl:col-span-3'} space-y-4`}>
          {viewMode === 'table' ? (
            <div className="bg-white border border-[#d9e7f7] rounded-3xl overflow-hidden shadow-[0_4px_25px_rgba(11,92,190,0.03)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#0b5cbe] text-[#fdfdfd] font-extrabold uppercase tracking-wider text-[9.5px] border-b border-[#084a99]">
                    <tr>
                      <th className="px-5 py-4 w-[24%] text-[#fdfdfd]">LEAD</th>
                      <th className="px-5 py-4 w-[18%] text-[#fdfdfd]">CONTACT</th>
                      <th className="px-5 py-4 w-[14%] text-[#fdfdfd]">PLAN</th>
                      <th className="px-5 py-4 w-[16%] text-[#fdfdfd]">REPRESENTATIVE</th>
                      <th className="px-5 py-4 w-[14%] text-[#fdfdfd]">FOLLOW-UP</th>
                      <th className="px-5 py-4 w-[9%] text-center text-[#fdfdfd]">STATUS</th>
                      <th className="px-5 py-4 w-[5%] text-right text-[#fdfdfd]">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredEnquiries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-16 text-slate-400 italic">
                          <div className="max-w-xs mx-auto text-center space-y-2">
                            <FileText size={32} className="mx-auto text-slate-300" />
                            <p className="font-bold text-slate-600 text-sm">No matching enquiries found</p>
                            <p className="text-xs text-slate-400">Try switching filter tabs or resetting search filters.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredEnquiries.map((enq) => {
                        const isSelected = selectedEnquiry?.id === enq.id;
                        const cleanDate = (enq.nextFollowUpDate || enq.nextFollowUp || '').split('T')[0];
                        const isDueToday = cleanDate === todayStr;
                        const isTaskOverdue = isOverdueInIndia(cleanDate);
                        const repInfo = formatRepInfo(enq.assignedTo);
                        const avatar = resolveAvatarUrl(enq);
                        const enqCode = String((enq as any).enquiryId || enq.id || '').slice(-4).toUpperCase();

                        return (
                          <tr
                            key={enq.id}
                            onClick={() => setSelectedEnquiry(enq)}
                            className={`hover:bg-slate-50/60 transition-colors cursor-pointer ${
                              isSelected ? 'bg-blue-50/40' : ''
                            }`}
                          >
                            {/* 1. LEAD: Merged Avatar + Name + Enquiry ID */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="relative shrink-0">
                                  <img 
                                    src={avatar} 
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      const g = String(enq.gender || '').trim().toLowerCase();
                                      target.src = (g === 'female' || g === 'f') ? FEMALE_DEFAULT_AVATAR : MALE_DEFAULT_AVATAR;
                                    }}
                                    className="w-11 h-11 rounded-full bg-slate-100 border-2 border-white shadow-xs object-cover" 
                                    alt={enq.name} 
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-extrabold text-slate-900 text-sm leading-tight truncate">
                                    {enq.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">
                                    ENQ-{enqCode}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 2. CONTACT: Dedicated Contact Column */}
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                                <span>📞</span> {enq.phone || '—'}
                              </div>
                              {enq.email && (
                                <div className="text-[11px] text-slate-400 font-medium truncate max-w-[180px] mt-0.5">
                                  {enq.email}
                                </div>
                              )}
                            </td>

                            {/* 3. PLAN / DURATION */}
                            <td className="px-5 py-3.5">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#0b5cbe] border border-blue-200/60 inline-block font-sans">
                                {enq.duration || enq.interestedPlan || '1 MONTH'}
                              </span>
                            </td>

                            {/* 4. REPRESENTATIVE */}
                            <td className="px-5 py-3.5">
                              {repInfo.name === 'Unassigned' ? (
                                <span className="text-slate-400 italic font-semibold text-xs">Unassigned</span>
                              ) : (
                                <div>
                                  <div className="font-extrabold text-slate-900 text-xs">{repInfo.name}</div>
                                  {repInfo.role && (
                                    <div className="text-[10px] text-slate-400 font-semibold">{repInfo.role}</div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* 5. FOLLOW-UP */}
                            <td className="px-5 py-3.5">
                              {cleanDate ? (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[10.5px] border ${
                                  isTaskOverdue && enq.status === 'Pending' 
                                    ? 'bg-rose-50 text-rose-600 border-rose-200/70 font-extrabold' 
                                    : isDueToday && enq.status === 'Pending' 
                                    ? 'bg-amber-50 text-amber-700 border-amber-200/70 font-extrabold' 
                                    : 'bg-slate-50 text-slate-700 border-slate-200/70'
                                }`}>
                                  <span>📅</span>
                                  <span>{isDueToday && enq.status === 'Pending' ? 'Today' : formatIndianDate(cleanDate)}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-xs">Not set</span>
                              )}
                            </td>

                            {/* 6. STATUS */}
                            <td className="px-5 py-3.5 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-black text-[9.5px] uppercase tracking-wider border ${
                                enq.status === 'Converted'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : enq.status === 'Closed'
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  enq.status === 'Converted'
                                    ? 'bg-emerald-500'
                                    : enq.status === 'Closed'
                                    ? 'bg-slate-400'
                                    : 'bg-amber-500'
                                }`} />
                                {enq.status || 'PENDING'}
                              </span>
                            </td>

                            {/* 7. ACTIONS (Compact [ ⋯ ] button matching design system) */}
                            <td className="px-5 py-3.5 text-right">
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setActionsMenu({ enquiry: enq, rect });
                                }}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 hover:bg-[#eaf3ff] hover:text-[#0b5cbe] hover:border-[#b9d6f5] text-slate-700 transition-all border border-slate-200 cursor-pointer shadow-2xs active:scale-95 ml-auto"
                                title="Actions"
                              >
                                <MoreHorizontal size={15} />
                              </button>
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
            /* Kanban Board Mode */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['Pending', 'Closed'] as const).map(colStatus => {
                const colLeads = filteredEnquiries.filter(e => e.status === colStatus);
                return (
                  <div key={colStatus} className="bg-slate-100/60 rounded-3xl p-4 border border-slate-200 flex flex-col h-full min-h-[500px]">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">{colStatus} Enquiries</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-black">
                        {colLeads.length}
                      </span>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                      {colLeads.map(enq => (
                        <div
                          key={enq.id}
                          onClick={() => setSelectedEnquiry(enq)}
                          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-xs">{enq.name}</h4>
                              <p className="text-[10px] text-slate-500 font-bold mt-0.5">📞 {enq.phone}</p>
                            </div>
                            <span className="text-[9px] font-black bg-blue-50 text-[#0b5cbe] border border-blue-200/60 px-2 py-0.5 rounded uppercase">
                              {enq.duration || '1 month'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
                            <span>Rep: <b>{formatRepInfo(enq.assignedTo).name}</b></span>
                            <span className="font-bold text-[#0b5cbe]">{formatIndianDate(enq.nextFollowUpDate || enq.nextFollowUp || '')}</span>
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

        {/* Right Col: Lead Inspector & History Timeline */}
        <AnimatePresence>
          {selectedEnquiry && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="xl:col-span-1"
            >
              <div className="bg-white rounded-3xl p-6 border border-[#d9e7f7] shadow-[0_4px_20px_rgba(11,92,190,0.03)] sticky top-6 space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <History size={14} className="text-[#0b5cbe]" /> Enquiry Timeline & Details
                  </span>
                  <button
                    onClick={() => setSelectedEnquiry(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 border-none cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Profile Card */}
                <div className="text-center space-y-1">
                  <div className="relative w-14 h-14 mx-auto mb-2 shrink-0">
                    <img 
                      src={resolveAvatarUrl(selectedEnquiry)} 
                      onError={(e) => {
                        const target = e.currentTarget;
                        const g = String(selectedEnquiry.gender || '').trim().toLowerCase();
                        target.src = (g === 'female' || g === 'f') ? FEMALE_DEFAULT_AVATAR : MALE_DEFAULT_AVATAR;
                      }}
                      className="w-14 h-14 rounded-full bg-slate-100 border-2 border-white shadow-md object-cover" 
                      alt={selectedEnquiry.name} 
                    />
                  </div>
                  <h3 className="text-base font-black text-slate-900">{selectedEnquiry.name}</h3>
                  <p className="text-xs font-bold text-slate-600 flex items-center justify-center gap-1">
                    📞 {selectedEnquiry.phone}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Interested Plan: <span className="font-bold text-[#0b5cbe] bg-blue-50 px-2 py-0.5 rounded border border-blue-200/50">{selectedEnquiry.duration || selectedEnquiry.interestedPlan || '1 month'}</span>
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
                            ? 'bg-[#0b5cbe] text-white border-[#0b5cbe] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Representative & Follow-Up Date */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Representative:</span>
                    <span className="font-bold text-slate-800">{selectedEnquiry.assignedTo || 'Veer Chand (manager)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Follow-up Date:</span>
                    <span className="font-bold text-[#0b5cbe]">{formatIndianDate(selectedEnquiry.nextFollowUpDate || selectedEnquiry.nextFollowUp || '')}</span>
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

                {/* Quick Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => launchWhatsApp(selectedEnquiry)}
                    className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all border border-emerald-200 cursor-pointer"
                  >
                    <MessageSquare size={13} /> WhatsApp
                  </button>

                  <a
                    href={`tel:${selectedEnquiry.phone}`}
                    className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all border border-blue-200 no-underline"
                  >
                    <Phone size={13} /> Call
                  </a>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ── 5. COMPACT ACTION PORTAL DROPDOWN (Strict Priority Ordering) ── */}
      {actionsMenu && typeof document !== 'undefined' && createPortal(
        <div
          className="enquiry-actions-portal-menu fixed z-[99999] bg-white border border-slate-200 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.18)] py-1.5 w-52 text-left text-xs font-semibold text-slate-800 animate-in fade-in select-none"
          style={{
            top: (window.innerHeight - actionsMenu.rect.bottom < 300)
              ? Math.max(10, actionsMenu.rect.top - 290)
              : actionsMenu.rect.bottom + 4,
            left: Math.max(10, Math.min(window.innerWidth - 220, actionsMenu.rect.right - 195)),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. View */}
          <button
            type="button"
            onClick={() => {
              const enq = actionsMenu.enquiry;
              setActionsMenu(null);
              setSelectedEnquiry(enq);
            }}
            className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-slate-700 transition-colors font-bold"
          >
            <Eye size={14} className="text-slate-500" />
            <span>View</span>
          </button>

          {/* 2. Edit */}
          <button
            type="button"
            onClick={() => {
              const enq = actionsMenu.enquiry;
              setActionsMenu(null);
              handleOpenEdit(enq);
            }}
            className="w-full px-3.5 py-2 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-slate-700 transition-colors font-bold"
          >
            <Edit size={14} className="text-blue-600" />
            <span>Edit</span>
          </button>

          {/* 3. Call */}
          <button
            type="button"
            onClick={() => {
              const enq = actionsMenu.enquiry;
              setActionsMenu(null);
              if (enq.phone) window.open(`tel:${enq.phone}`);
              else toast.error('No phone number recorded');
            }}
            className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-slate-700 transition-colors font-bold"
          >
            <Phone size={14} className="text-slate-500" />
            <span>Call</span>
          </button>

          {/* 4. WhatsApp */}
          <button
            type="button"
            onClick={() => {
              const enq = actionsMenu.enquiry;
              setActionsMenu(null);
              launchWhatsApp(enq);
            }}
            className="w-full px-3.5 py-2 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-slate-700 transition-colors font-bold"
          >
            <MessageSquare size={14} className="text-emerald-600" />
            <span>WhatsApp</span>
          </button>

          {/* 5. Follow-up */}
          <button
            type="button"
            onClick={() => {
              const enq = actionsMenu.enquiry;
              setActionsMenu(null);
              handleOpenScheduleFollowup(enq);
            }}
            className="w-full px-3.5 py-2 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-slate-700 transition-colors font-bold"
          >
            <Calendar size={14} className="text-indigo-600" />
            <span>Follow-up</span>
          </button>

          {/* 6. Convert to Member */}
          <button
            type="button"
            onClick={() => {
              const enq = actionsMenu.enquiry;
              setActionsMenu(null);
              setShowConvertModal(enq);
            }}
            className="w-full px-3.5 py-2 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-emerald-700 transition-colors font-extrabold"
          >
            <UserPlus size={14} className="text-emerald-600" />
            <span>Convert to Member</span>
          </button>

          <div className="h-px bg-slate-100 my-1" />

          {/* 7. Delete (Destructive) */}
          <button
            type="button"
            onClick={() => {
              const enq = actionsMenu.enquiry;
              setActionsMenu(null);
              setDeleteTarget(enq);
            }}
            className="w-full px-3.5 py-2 hover:bg-rose-50 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-rose-600 transition-colors font-bold"
          >
            <Trash2 size={14} className="text-rose-600" />
            <span>Delete</span>
          </button>
        </div>,
        document.body
      )}

      {/* ── 6. CUSTOM DELETE CONFIRMATION MODAL (NO window.confirm) ── */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-900 relative space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Delete Enquiry Lead?</h3>
                  <p className="text-xs text-slate-400 font-medium">This action cannot be undone.</p>
                </div>
              </div>

              <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 text-xs font-semibold text-rose-800 space-y-1.5">
                <p>
                  Are you sure you want to permanently delete <span className="font-black text-rose-950">"{deleteTarget.name}"</span>?
                </p>
                <p className="text-[11px] text-rose-700 font-normal">
                  All activity history, contact inquiries and automated follow-ups for this lead will be removed.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deletingEnquiry}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingEnquiry}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs cursor-pointer disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5 border-none shadow-sm"
                >
                  {deletingEnquiry ? 'Deleting...' : 'Delete Lead'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 7. EDIT ENQUIRY MODAL ── */}
      <AnimatePresence>
        {editingEnquiry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit className="text-[#0b5cbe]" size={18} /> Edit Enquiry Lead
                </h3>
                <button onClick={() => setEditingEnquiry(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 border-none cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs text-left">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0b5cbe]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0b5cbe]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0b5cbe]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Interested Plan</label>
                    <select
                      value={editPlan}
                      onChange={e => setEditPlan(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0b5cbe]"
                    >
                      {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Follow-up Date</label>
                    <input
                      type="date"
                      value={editFollowupDate}
                      onChange={e => setEditFollowupDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0b5cbe] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Representative</label>
                    <select
                      value={editRep}
                      onChange={e => setEditRep(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0b5cbe]"
                    >
                      {dynamicStaffList.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Remarks & Notes</label>
                  <textarea
                    rows={2}
                    value={editRemarks}
                    onChange={e => setEditRemarks(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-[#0b5cbe] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingEnquiry(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-[#0b5cbe] hover:bg-blue-700 rounded-xl shadow-md border-none cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 8. SCHEDULE FOLLOW-UP QUICK MODAL ── */}
      <AnimatePresence>
        {schedulingEnquiry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="text-[#0b5cbe]" size={18} /> Schedule Follow-up
                </h3>
                <button onClick={() => setSchedulingEnquiry(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 border-none cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs text-left">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
                  <span className="font-extrabold text-slate-900 block">{schedulingEnquiry.name}</span>
                  <span className="text-[11px] text-slate-500 font-bold">📞 {schedulingEnquiry.phone}</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">New Follow-up Date *</label>
                  <input
                    type="date"
                    required
                    value={newScheduleDate}
                    onChange={e => setNewScheduleDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#0b5cbe] cursor-pointer"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSchedulingEnquiry(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-[#0b5cbe] hover:bg-blue-700 rounded-xl shadow-md border-none cursor-pointer"
                  >
                    Set Follow-up
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 9. EXCEL IMPORT MODAL ── */}
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
                  <Upload className="text-[#0b5cbe]" size={18} /> Import Real Enquiries Excel
                </h3>
                <button onClick={() => setShowImportModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 border-none cursor-pointer">
                  <X size={18} />
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

                <div className="border-2 border-dashed border-slate-200 hover:border-[#0b5cbe] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelUpload}
                    disabled={isImporting}
                    className="hidden"
                    id="excel-file-input"
                  />
                  <label htmlFor="excel-file-input" className="cursor-pointer block space-y-2">
                    <Upload size={32} className="mx-auto text-[#0b5cbe] opacity-80" />
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

      {/* ── 10. CREATE MANUAL ENQUIRY MODAL ── */}
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
                  <UserPlus className="text-[#0b5cbe]" size={18} /> New Enquiry Lead
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 border-none cursor-pointer">
                  <X size={18} />
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0b5cbe]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sharma"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0b5cbe]"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0b5cbe]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Interested Plan *</label>
                    <select
                      value={inquiryFor}
                      onChange={e => setInquiryFor(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0b5cbe]"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0b5cbe] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Representative</label>
                    <select
                      value={attendedBy}
                      onChange={e => setAttendedBy(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0b5cbe]"
                    >
                      {dynamicStaffList.map(st => <option key={st} value={st}>{st}</option>)}
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-[#0b5cbe] resize-none"
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
                    className="px-5 py-2 text-xs font-bold text-white bg-[#0b5cbe] hover:bg-blue-700 rounded-xl shadow-md border-none cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Create Enquiry'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 11. CONVERT TO MEMBER MODAL ── */}
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
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConvertSubmit} className="space-y-4 text-xs text-left">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
                  <span className="font-extrabold text-slate-900 block">{showConvertModal.name}</span>
                  <span className="text-[11px] text-slate-500 font-bold">📞 {showConvertModal.phone}</span>
                  {showConvertModal.email && (
                    <span className="text-[11px] text-slate-400 block">{showConvertModal.email}</span>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Membership Plan</label>
                  <select
                    value={convertPlan}
                    onChange={e => setConvertPlan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0b5cbe]"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0b5cbe]"
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
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md border-none cursor-pointer"
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
