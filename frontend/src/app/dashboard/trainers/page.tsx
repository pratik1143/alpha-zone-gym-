'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Edit, Trash2, Mail, Phone, Dumbbell, ShieldAlert, Award, 
  Calendar, ExternalLink, X, Check, Sparkles, Activity, TrendingUp, 
  Target, UserCheck, Star, DollarSign, Briefcase, Fingerprint, CheckCheck, 
  XCircle, AlertTriangle, Scan, Wifi, Shield, AlertCircle, UserPlus, 
  ArrowRight, User, MoreHorizontal, Eye, RefreshCw, Users, UserX
} from 'lucide-react';
import { z } from 'zod';
import API from '@/services/api';
import { getInitials, formatCurrency } from '@/lib/utils';
import { resolveAvatarUrl, MALE_DEFAULT_AVATAR, FEMALE_DEFAULT_AVATAR, normalizeStatus } from '@/lib/avatar';
import toast from 'react-hot-toast';
import { collection, doc, onSnapshot, query, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useGymStore } from '@/store';
import SmartPhotoCapture from '../components/SmartPhotoCapture';

interface TrainerEmployee {
  id: string;
  employeeId?: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  role?: string;
  specialization?: string;
  experience?: number;
  rating?: number;
  branch?: string;
  sessions?: number;
  salary?: number;
  status?: string;
  certifications?: string[];
  photo?: string;
  profilePhotoUrl?: string;
  avatarUrl?: string;
  bio?: string;
  joiningDate?: string;
  instagram?: string;
  achievements?: string;
  biometricId?: number | string;
  gender?: string;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_REAL_TRAINERS: TrainerEmployee[] = [
  { id: 'emp_10021', employeeId: 'EMP-10021', biometricId: 10021, name: 'Sourav Arora', phone: '7973649709', email: '', address: '', branch: 'Alpha zone gym', role: 'Trainer', status: 'Active', specialization: 'Fitness Trainer', experience: 0, rating: 0, sessions: 0, salary: 0, certifications: [], photo: '', bio: '', joiningDate: '2026-01-01', instagram: '', achievements: '' },
  { id: 'emp_10012', employeeId: 'EMP-10012', biometricId: 10012, name: 'Deepak', phone: '8196852386', email: '', address: '', branch: 'Alpha zone gym', role: 'Trainer', status: 'Active', specialization: 'Fitness Trainer', experience: 0, rating: 0, sessions: 0, salary: 0, certifications: [], photo: '', bio: '', joiningDate: '2026-01-01', instagram: '', achievements: '' },
  { id: 'emp_10009', employeeId: 'EMP-10009', biometricId: 10009, name: 'Kuldeep', phone: '8629841471', email: 'kuldeep86298@gmail.com', address: '', branch: 'Alpha zone gym', role: 'Trainer', status: 'Active', specialization: 'Fitness Trainer', experience: 0, rating: 0, sessions: 0, salary: 0, certifications: [], photo: '', bio: '', joiningDate: '2026-01-01', instagram: '', achievements: '' },
  { id: 'emp_10008', employeeId: 'EMP-10008', biometricId: 10008, name: 'Arshdeep Singh', phone: '9915866576', email: '', address: '', branch: 'Alpha zone gym', role: 'Trainer', status: 'Active', specialization: 'Fitness Trainer', experience: 0, rating: 0, sessions: 0, salary: 0, certifications: [], photo: '', bio: '', joiningDate: '2026-01-01', instagram: '', achievements: '' },
  { id: 'emp_10005', employeeId: 'EMP-10005', biometricId: 10005, name: 'Achhar Pal', phone: '9592691190', email: '', address: 'kaimbwala chd', branch: 'Alpha zone gym', role: 'Trainer', status: 'Active', specialization: 'Fitness Trainer', experience: 0, rating: 0, sessions: 0, salary: 0, certifications: [], photo: '', bio: '', joiningDate: '2026-01-01', instagram: '', achievements: '' },
  { id: 'emp_10003', employeeId: 'EMP-10003', biometricId: 10003, name: 'Abc', phone: '7884977777', email: '', address: '', branch: 'Alpha zone gym', role: 'Trainer', status: 'Active', specialization: 'Fitness Trainer', experience: 0, rating: 0, sessions: 0, salary: 0, certifications: [], photo: '', bio: '', joiningDate: '2026-01-01', instagram: '', achievements: '' },
];

const SPECIALIZATIONS = [
  'Fitness Trainer',
  'Personal Trainer',
  'Strength & Conditioning',
  'CrossFit Coach',
  'Bodybuilding & Hypertrophy',
  'Weight Loss & Nutrition Specialist',
  'Yoga & Flexibility Instructor',
  'General Floor Trainer'
];

export default function TrainersPage() {
  const { members, fetchMembers, updateMember } = useGymStore() as any;
  const [employees, setEmployees] = useState<TrainerEmployee[]>(DEFAULT_REAL_TRAINERS);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [specFilter, setSpecFilter] = useState('All');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showViewDrawer, setShowViewDrawer] = useState(false);
  const [activeTrainer, setActiveTrainer] = useState<TrainerEmployee | null>(null);

  // Custom Delete Modal State (NO window.confirm)
  const [deleteTrainerTarget, setDeleteTrainerTarget] = useState<TrainerEmployee | null>(null);
  const [deletingTrainer, setDeletingTrainer] = useState(false);

  // Actions Dropdown Portal State
  const [actionsMenu, setActionsMenu] = useState<{ trainer: TrainerEmployee; rect: DOMRect } | null>(null);

  // Biometric Enrollment State
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollDocId, setEnrollDocId] = useState<string | null>(null);
  const [enrollStatus, setEnrollStatus] = useState<{
    status: 'idle' | 'connecting' | 'scanning' | 'processing' | 'ready' | 'success' | 'failed' | 'info';
    message: string;
    scan: number;
    totalScans: number;
    biometricId?: number;
  }>({ status: 'idle', message: 'Waiting to start...', scan: 0, totalScans: 3 });

  // Add / Edit Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSpecialization, setFormSpecialization] = useState('Fitness Trainer');
  const [formBiometricId, setFormBiometricId] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formAddress, setFormAddress] = useState('');
  const [formSalary, setFormSalary] = useState('');
  const [formExperience, setFormExperience] = useState('0');
  const [formPhoto, setFormPhoto] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Member Assignment Selected IDs
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Close floating actions menu on outside click or scroll
  useEffect(() => {
    if (!actionsMenu) return;
    const handleClose = (e: MouseEvent | Event) => {
      const target = e.target as HTMLElement;
      if (target?.closest('.trainer-actions-portal-menu')) return;
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

  // Fetch employees list (Single Source of Truth)
  const fetchEmployees = async () => {
    try {
      const res = await API.get('/employees');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setEmployees(res.data);
      }
    } catch (err) {
      console.warn('API fetch employees failed, fallback to Firestore listener:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchEmployees();
    fetchMembers();

    // Realtime Firestore listener for employees collection
    const q = query(collection(db, 'employees'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as TrainerEmployee));
        setEmployees(data);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Firestore employees listener warning:', err.message);
      setLoading(false);
    });

    return () => unsub();
  }, [fetchMembers]);

  // 1. DERIVE TRAINERS FROM EMPLOYEES (Canonical Role: TRAINER)
  const trainersList = useMemo(() => {
    return employees.filter(e => {
      if (!e) return false;
      const role = String(e.role || '').trim().toLowerCase();
      return role.includes('trainer');
    });
  }, [employees]);

  // Get assigned members for a trainer
  const getAssignedMembersForTrainer = (trainer: TrainerEmployee) => {
    if (!trainer || !members) return [];
    const tId = String(trainer.employeeId || trainer.id || '').toLowerCase();
    const tBio = String(trainer.biometricId || '').toLowerCase();
    const tName = String(trainer.name || '').trim().toLowerCase();

    return members.filter((m: any) => {
      if (!m || m.status === 'deleted') return false;
      const mTrainerId = String(m.trainerId || '').toLowerCase();
      const mTrainerName = String(m.trainer || '').trim().toLowerCase();
      return (
        (mTrainerId && (mTrainerId === tId || (tBio && mTrainerId === tBio))) ||
        (mTrainerName && mTrainerName === tName)
      );
    });
  };

  // Filtered Trainers
  const filteredTrainers = useMemo(() => {
    return trainersList.filter(t => {
      const accStatus = normalizeStatus(t.status);

      // Status filter
      if (statusFilter === 'Active' && accStatus !== 'Active') return false;
      if (statusFilter === 'Inactive' && accStatus !== 'Inactive') return false;

      // Specialization filter
      if (specFilter !== 'All') {
        const spec = String(t.specialization || '').toLowerCase();
        if (!spec.includes(specFilter.toLowerCase())) return false;
      }

      // Search Query
      const q = searchQuery.toLowerCase();
      const matchName = (t.name || '').toLowerCase().includes(q);
      const matchPhone = (t.phone || '').includes(q);
      const matchEmail = (t.email || '').toLowerCase().includes(q);
      const matchBio = String(t.biometricId || '').includes(q);
      const matchEmpId = String(t.employeeId || '').toLowerCase().includes(q);

      return matchName || matchPhone || matchEmail || matchBio || matchEmpId;
    });
  }, [trainersList, searchQuery, statusFilter, specFilter]);

  // Summary Metrics (Single Source of Truth)
  const totalTrainers = trainersList.length;
  const activeTrainers = trainersList.filter(t => normalizeStatus(t.status) === 'Active').length;
  const totalAssignedPTMembers = useMemo(() => {
    if (!members) return 0;
    return members.filter((m: any) => m && m.status !== 'deleted' && (m.trainerId || m.trainer)).length;
  }, [members]);
  const unassignedPTMembers = useMemo(() => {
    if (!members) return 0;
    return members.filter((m: any) => m && m.status === 'active' && !m.trainerId && !m.trainer).length;
  }, [members]);

  // Reset Form
  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormSpecialization('Fitness Trainer');
    setFormBiometricId('');
    setFormStatus('Active');
    setFormAddress('');
    setFormSalary('');
    setFormExperience('0');
    setFormPhoto('');
  };

  // Handle Add Trainer (Creates Employee record with role: 'Trainer')
  const handleAddTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      toast.error('Please enter trainer name and phone number');
      return;
    }

    setFormSubmitting(true);
    try {
      const bioId = formBiometricId ? Number(formBiometricId) : (10000 + Math.floor(Math.random() * 9000));
      const empId = `EMP-${bioId}`;

      const payload: Partial<TrainerEmployee> = {
        employeeId: empId,
        name: formName.trim(),
        phone: formPhone.trim().replace(/\D/g, ''),
        email: formEmail.trim(),
        role: 'Trainer',
        specialization: formSpecialization || 'Fitness Trainer',
        biometricId: bioId,
        branch: 'Alpha zone gym',
        status: formStatus,
        address: formAddress.trim(),
        salary: Number(formSalary) || 0,
        experience: Number(formExperience) || 0,
        photo: formPhoto,
        profilePhotoUrl: formPhoto,
        avatarUrl: formPhoto,
        createdAt: new Date().toISOString()
      };

      // 1. Direct API creation
      try {
        await API.post('/employees', payload);
      } catch (apiErr) {
        console.warn('API post failed, writing to Firestore directly:', apiErr);
      }

      // 2. Direct Firestore fallback
      try {
        await addDoc(collection(db, 'employees'), payload);
      } catch (fsErr) {
        console.warn('Firestore direct write:', fsErr);
      }

      toast.success('✓ Trainer registered successfully as Employee!');
      setShowAddModal(false);
      resetForm();
      fetchEmployees();
    } catch (err: any) {
      toast.error('Failed to create trainer: ' + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (trainer: TrainerEmployee) => {
    setActiveTrainer(trainer);
    setFormName(trainer.name || '');
    setFormPhone(trainer.phone || '');
    setFormEmail(trainer.email || '');
    setFormSpecialization(trainer.specialization || 'Fitness Trainer');
    setFormBiometricId(String(trainer.biometricId || ''));
    setFormStatus(normalizeStatus(trainer.status) === 'Active' ? 'Active' : 'Inactive');
    setFormAddress(trainer.address || '');
    setFormSalary(String(trainer.salary || ''));
    setFormExperience(String(trainer.experience || '0'));
    setFormPhoto(trainer.profilePhotoUrl || trainer.photo || '');
    setShowEditModal(true);
  };

  // Handle Edit Trainer Submit
  const handleEditTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrainer) return;

    setFormSubmitting(true);
    try {
      const bioId = formBiometricId ? Number(formBiometricId) : activeTrainer.biometricId;
      const updates: Partial<TrainerEmployee> = {
        name: formName.trim(),
        phone: formPhone.trim().replace(/\D/g, ''),
        email: formEmail.trim(),
        specialization: formSpecialization,
        biometricId: bioId,
        status: formStatus,
        address: formAddress.trim(),
        salary: Number(formSalary) || 0,
        experience: Number(formExperience) || 0,
        photo: formPhoto,
        profilePhotoUrl: formPhoto,
        avatarUrl: formPhoto,
        updatedAt: new Date().toISOString()
      };

      // 1. API Update
      try {
        await API.put(`/employees/${activeTrainer.id}`, updates);
      } catch (apiErr) {
        console.warn('API update failed:', apiErr);
      }

      // 2. Firestore Update
      if (activeTrainer.id) {
        try {
          await updateDoc(doc(db, 'employees', activeTrainer.id), updates);
        } catch (fsErr) {
          console.warn('Firestore update error:', fsErr);
        }
      }

      toast.success('✓ Trainer updated successfully!');
      setShowEditModal(false);
      fetchEmployees();
    } catch (err: any) {
      toast.error('Failed to update trainer: ' + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Member Assignment Modal
  const handleOpenAssignMembers = (trainer: TrainerEmployee) => {
    setActiveTrainer(trainer);
    const assigned = getAssignedMembersForTrainer(trainer);
    setSelectedMemberIds(assigned.map((m: any) => m.id));
    setShowAssignModal(true);
  };

  // Submit Member Assignments
  const handleSaveAssignments = async () => {
    if (!activeTrainer) return;
    setAssigningLoading(true);

    try {
      const tId = activeTrainer.employeeId || activeTrainer.id;
      const tName = activeTrainer.name;

      // Update members
      await Promise.all(
        members.map(async (m: any) => {
          const isSelected = selectedMemberIds.includes(m.id);
          const currentTId = m.trainerId;

          if (isSelected && currentTId !== tId) {
            // Assign to this trainer
            await updateMember(m.id, { trainerId: tId, trainer: tName });
          } else if (!isSelected && (currentTId === tId || m.trainer === tName)) {
            // Unassign from this trainer
            await updateMember(m.id, { trainerId: null, trainer: null });
          }
        })
      );

      toast.success(`✓ Member assignments updated for ${activeTrainer.name}!`);
      setShowAssignModal(false);
      fetchMembers();
    } catch (err: any) {
      toast.error('Failed to assign members: ' + err.message);
    } finally {
      setAssigningLoading(false);
    }
  };

  // Handle Delete / Deactivate Trainer
  const handleConfirmDeleteTrainer = async (mode: 'deactivate' | 'delete') => {
    if (!deleteTrainerTarget) return;
    setDeletingTrainer(true);

    try {
      const id = deleteTrainerTarget.id;
      const tId = deleteTrainerTarget.employeeId || deleteTrainerTarget.id;

      if (mode === 'deactivate') {
        // Just mark Inactive
        if (id) {
          await updateDoc(doc(db, 'employees', id), {
            status: 'Inactive',
            updatedAt: new Date().toISOString()
          });
        }
        try {
          await API.put(`/employees/${id}`, { status: 'Inactive' });
        } catch (e) {}
        toast.success(`${deleteTrainerTarget.name} has been deactivated.`);
      } else {
        // Remove assignments first
        const assigned = getAssignedMembersForTrainer(deleteTrainerTarget);
        if (assigned.length > 0) {
          await Promise.all(
            assigned.map((m: any) => updateMember(m.id, { trainerId: null, trainer: null }))
          );
        }

        // Delete employee record
        try {
          await API.delete(`/employees/${id}`);
        } catch (e) {}
        try {
          await deleteDoc(doc(db, 'employees', id));
        } catch (e) {}

        toast.success(`${deleteTrainerTarget.name} deleted permanently.`);
      }

      setDeleteTrainerTarget(null);
      fetchEmployees();
      fetchMembers();
    } catch (err: any) {
      toast.error('Action failed: ' + err.message);
    } finally {
      setDeletingTrainer(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 w-full text-slate-800 text-left font-sans">
      
      {/* ── 1. PAGE HEADER (Unified with Employees & Members) ── */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
              Staff & Trainer Roster
            </span>
            <span className="text-xs text-slate-400 font-mono font-bold">AZ-TRN-v4.0</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 font-display">Trainers & Fitness Coaches</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Manage gym trainers, assigned members, personal training and trainer performance.</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button 
            onClick={() => fetchEmployees()}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl border border-slate-200 cursor-pointer shadow-2xs transition-all"
            title="Refresh List"
          >
            <RefreshCw size={15} />
          </button>

          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="px-6 py-3.5 bg-gradient-to-r from-[#0b5cbe] to-[#2876d0] hover:from-[#084a99] hover:to-[#0b5cbe] text-white rounded-2xl text-xs font-black uppercase tracking-wider border-none cursor-pointer flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(11,92,190,0.25)] transition-all hover:scale-[1.02] active:scale-95 shrink-0"
          >
            <Plus size={16} /> Add Trainer
          </button>
        </div>
      </div>

      {/* ── 2. SUMMARY METRICS CARDS (Exact Members/Employees KPI Language) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Trainers', value: totalTrainers, sub: 'Registered gym coaches', icon: Dumbbell, badgeBg: 'bg-[#eaf3ff] border-[#b9d6f5] text-[#0b5cbe]' },
          { label: 'Active Trainers', value: activeTrainers, sub: 'Currently on duty', icon: UserCheck, badgeBg: 'bg-emerald-50 border-emerald-200/60 text-emerald-600' },
          { label: 'PT Members', value: totalAssignedPTMembers, sub: 'Assigned to trainers', icon: Users, badgeBg: 'bg-indigo-50 border-indigo-200/60 text-indigo-600' },
          { label: 'Unassigned Members', value: unassignedPTMembers, sub: 'No trainer assigned', icon: UserX, badgeBg: 'bg-slate-100 border-slate-200 text-slate-700' }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-[#d9e7f7] rounded-3xl p-5 flex flex-col justify-between shadow-[0_4px_20px_rgba(11,92,190,0.03)] relative overflow-hidden group transition-all hover:border-[#0b5cbe] hover:shadow-md">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
              <div className={`p-2.5 rounded-2xl border ${stat.badgeBg}`}>
                <stat.icon size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black text-[#10233f] leading-none font-mono tracking-tight">{stat.value}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. SEARCH & FILTERS BAR (Unified with Employees & Members) ── */}
      <div className="bg-white border border-[#d9e7f7] rounded-3xl p-4 flex flex-wrap gap-4 items-center shadow-[0_4px_20px_rgba(11,92,190,0.02)]">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search trainer by name, phone, email or biometric ID..."
            className="w-full text-xs bg-[#fdfdfd] border border-[#d9e7f7] rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:border-[#0b5cbe] focus:bg-white transition-all text-[#10233f] font-semibold placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Status Filter */}
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs bg-[#fdfdfd] border border-[#d9e7f7] rounded-2xl px-4 py-3 text-[#10233f] focus:outline-none font-bold cursor-pointer hover:bg-white transition-all"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Specialization Filter */}
          <select 
            value={specFilter}
            onChange={e => setSpecFilter(e.target.value)}
            className="text-xs bg-[#fdfdfd] border border-[#d9e7f7] rounded-2xl px-4 py-3 text-[#10233f] focus:outline-none font-bold cursor-pointer hover:bg-white transition-all"
          >
            <option value="All">All Specializations</option>
            {SPECIALIZATIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {(searchQuery || statusFilter !== 'All' || specFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('All');
                setSpecFilter('All');
              }}
              className="px-3.5 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-2xl border border-rose-200 cursor-pointer transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── 4. MAIN TRAINER TABLE (Unified with Employees & Members) ── */}
      <div className="bg-white border border-[#d9e7f7] rounded-3xl overflow-hidden shadow-[0_4px_25px_rgba(11,92,190,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#0b5cbe] text-[#fdfdfd] font-extrabold uppercase tracking-wider text-[9.5px] border-b border-[#084a99]">
              <tr>
                <th className="px-5 py-4 w-[24%] text-[#fdfdfd]">TRAINER</th>
                <th className="px-5 py-4 w-[18%] text-[#fdfdfd]">CONTACT</th>
                <th className="px-5 py-4 w-[16%] text-[#fdfdfd]">SPECIALIZATION</th>
                <th className="px-5 py-4 w-[12%] text-center text-[#fdfdfd]">BIOMETRIC ID</th>
                <th className="px-5 py-4 w-[14%] text-center text-[#fdfdfd]">ASSIGNED MEMBERS</th>
                <th className="px-5 py-4 w-[11%] text-center text-[#fdfdfd]">STATUS</th>
                <th className="px-5 py-4 w-[5%] text-right text-[#fdfdfd]">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-slate-200" />
                        <div className="space-y-1.5">
                          <div className="w-24 h-3 bg-slate-200 rounded" />
                          <div className="w-16 h-2.5 bg-slate-200 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><div className="w-24 h-3 bg-slate-200 rounded" /></td>
                    <td className="px-5 py-4"><div className="w-20 h-4 bg-slate-200 rounded" /></td>
                    <td className="px-5 py-4"><div className="w-14 h-4 bg-slate-200 rounded mx-auto" /></td>
                    <td className="px-5 py-4"><div className="w-16 h-4 bg-slate-200 rounded mx-auto" /></td>
                    <td className="px-5 py-4"><div className="w-14 h-4 bg-slate-200 rounded mx-auto" /></td>
                    <td className="px-5 py-4"><div className="w-8 h-8 bg-slate-200 rounded-xl ml-auto" /></td>
                  </tr>
                ))
              ) : filteredTrainers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <Dumbbell size={32} className="mx-auto text-slate-300" />
                      <h3 className="font-extrabold text-slate-800 text-sm">No Trainers Found</h3>
                      <p className="text-xs text-slate-400">Click &quot;+ Add Trainer&quot; to register a new gym coach.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTrainers.map((trainer) => {
                  const avatar = resolveAvatarUrl(trainer);
                  const accStatus = normalizeStatus(trainer.status);
                  const assigned = getAssignedMembersForTrainer(trainer);
                  const empCode = trainer.employeeId || (trainer.biometricId ? `EMP-${trainer.biometricId}` : `EMP-${trainer.id.slice(-4).toUpperCase()}`);

                  return (
                    <tr
                      key={trainer.id}
                      onClick={() => {
                        setActiveTrainer(trainer);
                        setShowViewDrawer(true);
                      }}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      {/* 1. TRAINER: Avatar + Name + Employee ID */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img 
                              src={avatar} 
                              onError={(e) => {
                                const target = e.currentTarget;
                                const g = String(trainer.gender || '').trim().toLowerCase();
                                target.src = (g === 'female' || g === 'f') ? FEMALE_DEFAULT_AVATAR : MALE_DEFAULT_AVATAR;
                              }}
                              className="w-11 h-11 rounded-full bg-slate-100 border-2 border-white shadow-xs object-cover" 
                              alt={trainer.name} 
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 text-sm leading-tight truncate">
                              {trainer.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">
                              {empCode}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. CONTACT */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                          <span>☎</span> {trainer.phone || '—'}
                        </div>
                        {trainer.email && (
                          <div className="text-[11px] text-slate-400 font-medium truncate max-w-[170px] mt-0.5">
                            {trainer.email}
                          </div>
                        )}
                      </td>

                      {/* 3. SPECIALIZATION */}
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#0b5cbe] border border-blue-200/60 inline-block font-sans">
                          {trainer.specialization || 'Fitness Trainer'}
                        </span>
                      </td>

                      {/* 4. BIOMETRIC ID */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-mono font-bold">
                          <Fingerprint size={11} className="text-slate-400" />
                          #{trainer.biometricId || '—'}
                        </span>
                      </td>

                      {/* 5. ASSIGNED MEMBERS (Clickable) */}
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAssignMembers(trainer);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50/80 hover:bg-blue-100 text-[#0b5cbe] border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          title="Click to view/assign members"
                        >
                          <Users size={12} />
                          <span>{assigned.length} {assigned.length === 1 ? 'Member' : 'Members'}</span>
                        </button>
                      </td>

                      {/* 6. STATUS */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-black text-[9.5px] uppercase tracking-wider border ${
                          accStatus === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            accStatus === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`} />
                          {accStatus}
                        </span>
                      </td>

                      {/* 7. ACTIONS (Compact [ ⋯ ] button) */}
                      <td className="px-5 py-3.5 text-right">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setActionsMenu({ trainer, rect });
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

      {/* ── 5. FLOATING PORTAL ACTIONS DROPDOWN ── */}
      {actionsMenu && typeof document !== 'undefined' && createPortal(
        <div
          className="trainer-actions-portal-menu fixed z-[99999] bg-white border border-slate-200 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.18)] py-1.5 w-52 text-left text-xs font-semibold text-slate-800 animate-in fade-in select-none"
          style={{
            top: (window.innerHeight - actionsMenu.rect.bottom < 290)
              ? Math.max(10, actionsMenu.rect.top - 280)
              : actionsMenu.rect.bottom + 4,
            left: Math.max(10, Math.min(window.innerWidth - 220, actionsMenu.rect.right - 195)),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. View Profile */}
          <button
            type="button"
            onClick={() => {
              const t = actionsMenu.trainer;
              setActionsMenu(null);
              setActiveTrainer(t);
              setShowViewDrawer(true);
            }}
            className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-slate-700 transition-colors font-bold"
          >
            <Eye size={14} className="text-slate-500" />
            <span>View Profile</span>
          </button>

          {/* 2. Assign Members */}
          <button
            type="button"
            onClick={() => {
              const t = actionsMenu.trainer;
              setActionsMenu(null);
              handleOpenAssignMembers(t);
            }}
            className="w-full px-3.5 py-2 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-blue-700 transition-colors font-extrabold"
          >
            <Users size={14} className="text-blue-600" />
            <span>Assign Members</span>
          </button>

          {/* 3. Edit */}
          <button
            type="button"
            onClick={() => {
              const t = actionsMenu.trainer;
              setActionsMenu(null);
              handleOpenEdit(t);
            }}
            className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-slate-700 transition-colors font-bold"
          >
            <Edit size={14} className="text-slate-500" />
            <span>Edit Trainer</span>
          </button>

          {/* 4. WhatsApp */}
          <button
            type="button"
            onClick={() => {
              const t = actionsMenu.trainer;
              setActionsMenu(null);
              const cleanPhone = t.phone.replace(/\D/g, '');
              window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hi ${t.name}, message from Alpha Zone Gym management.`)}`, '_blank');
            }}
            className="w-full px-3.5 py-2 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-slate-700 transition-colors font-bold"
          >
            <Mail size={14} className="text-emerald-600" />
            <span>WhatsApp</span>
          </button>

          {/* 5. Call */}
          <button
            type="button"
            onClick={() => {
              const t = actionsMenu.trainer;
              setActionsMenu(null);
              if (t.phone) window.open(`tel:${t.phone}`);
              else toast.error('No phone number recorded');
            }}
            className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-slate-700 transition-colors font-bold"
          >
            <Phone size={14} className="text-slate-500" />
            <span>Call</span>
          </button>

          <div className="h-px bg-slate-100 my-1" />

          {/* 6. Delete Trainer (Destructive) */}
          <button
            type="button"
            onClick={() => {
              const t = actionsMenu.trainer;
              setActionsMenu(null);
              setDeleteTrainerTarget(t);
            }}
            className="w-full px-3.5 py-2 hover:bg-rose-50 flex items-center gap-2.5 text-left border-none bg-transparent cursor-pointer text-rose-600 transition-colors font-bold"
          >
            <Trash2 size={14} className="text-rose-600" />
            <span>Delete Trainer</span>
          </button>
        </div>,
        document.body
      )}

      {/* ── 6. ADD TRAINER MODAL (Creates Employee with role: 'Trainer') ── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 lg:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0b5cbe] shrink-0">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                      Add New Gym Trainer
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Registers coach into unified Staff & Trainer roster.
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)} 
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors border-none cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddTrainerSubmit} className="space-y-4 text-xs text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Trainer Name <span className="text-rose-500 font-black">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sourav Arora"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="w-full bg-[#fdfdfd] border border-slate-200 focus:border-[#0b5cbe] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Mobile Number <span className="text-rose-500 font-black">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="7973649709"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full bg-[#fdfdfd] border border-slate-200 focus:border-[#0b5cbe] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="coach@alphagym.com"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      className="w-full bg-[#fdfdfd] border border-slate-200 focus:border-[#0b5cbe] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Specialization</label>
                    <select
                      value={formSpecialization}
                      onChange={e => setFormSpecialization(e.target.value)}
                      className="w-full bg-[#fdfdfd] border border-slate-200 focus:border-[#0b5cbe] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-colors cursor-pointer"
                    >
                      {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Biometric ID</label>
                    <input
                      type="number"
                      placeholder="e.g. 10021"
                      value={formBiometricId}
                      onChange={e => setFormBiometricId(e.target.value)}
                      className="w-full bg-[#fdfdfd] border border-slate-200 focus:border-[#0b5cbe] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Account Status</label>
                    <select
                      value={formStatus}
                      onChange={e => setFormStatus(e.target.value as any)}
                      className="w-full bg-[#fdfdfd] border border-slate-200 focus:border-[#0b5cbe] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-colors cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Address / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Phase 3B2, Mohali"
                    value={formAddress}
                    onChange={e => setFormAddress(e.target.value)}
                    className="w-full bg-[#fdfdfd] border border-slate-200 focus:border-[#0b5cbe] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-colors"
                  />
                </div>

                {/* Photo Capture */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Profile Photo (Optional)</label>
                  <SmartPhotoCapture
                    value={formPhoto}
                    onCaptureComplete={({ photoURL }) => setFormPhoto(photoURL || '')}
                    label="Trainer"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={formSubmitting}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#0b5cbe] hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm transition-all border-none cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {formSubmitting ? 'Registering...' : 'Register Trainer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 7. EDIT TRAINER MODAL ── */}
      <AnimatePresence>
        {showEditModal && activeTrainer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 lg:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0b5cbe] shrink-0">
                    <Edit size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                      Edit Trainer Details
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Syncs automatically across Trainers and Employees.
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)} 
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors border-none cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditTrainerSubmit} className="space-y-4 text-xs text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Trainer Name <span className="text-rose-500 font-black">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="w-full bg-[#fdfdfd] border border-slate-200 focus:border-[#0b5cbe] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Mobile Number <span className="text-rose-500 font-black">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full bg-[#fdfdfd] border border-slate-200 focus:border-[#0b5cbe] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      className="w-full bg-[#fdfdfd] border border-slate-200 focus:border-[#0b5cbe] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Specialization</label>
                    <select
                      value={formSpecialization}
                      onChange={e => setFormSpecialization(e.target.value)}
                      className="w-full bg-[#fdfdfd] border border-slate-200 focus:border-[#0b5cbe] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-colors cursor-pointer"
                    >
                      {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Biometric ID</label>
                    <input
                      type="number"
                      value={formBiometricId}
                      onChange={e => setFormBiometricId(e.target.value)}
                      className="w-full bg-[#fdfdfd] border border-slate-200 focus:border-[#0b5cbe] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Account Status</label>
                    <select
                      value={formStatus}
                      onChange={e => setFormStatus(e.target.value as any)}
                      className="w-full bg-[#fdfdfd] border border-slate-200 focus:border-[#0b5cbe] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-colors cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Address</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={e => setFormAddress(e.target.value)}
                    className="w-full bg-[#fdfdfd] border border-slate-200 focus:border-[#0b5cbe] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={formSubmitting}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#0b5cbe] hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm transition-all border-none cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {formSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 8. ASSIGN MEMBERS MODAL (Stable ID-Based Member Assignment) ── */}
      <AnimatePresence>
        {showAssignModal && activeTrainer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 lg:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0b5cbe] shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                      Assign Members to {activeTrainer.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Select gym members to assign for personal training & floor guidance.
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowAssignModal(false)} 
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors border-none cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Members Selection List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 px-1">
                  <span>Gym Members ({members.length})</span>
                  <span className="text-[#0b5cbe]">{selectedMemberIds.length} Selected</span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl p-1 bg-slate-50/50">
                  {members.filter((m: any) => m.status !== 'deleted').map((m: any) => {
                    const isChecked = selectedMemberIds.includes(m.id);
                    return (
                      <label 
                        key={m.id}
                        className={`p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isChecked ? 'bg-blue-50/80 font-bold' : 'hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMemberIds(prev => [...prev, m.id]);
                              } else {
                                setSelectedMemberIds(prev => prev.filter(id => id !== m.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-[#0b5cbe] border-slate-300 focus:ring-[#0b5cbe] cursor-pointer"
                          />
                          <div className="min-w-0">
                            <span className="text-xs text-slate-900 block truncate">{m.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">#{m.memberId || m.id} • {m.plan || 'Standard'}</span>
                          </div>
                        </div>

                        {m.trainer && (
                          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                            {m.trainer === activeTrainer.name ? 'Currently Assigned' : `Trainer: ${m.trainer}`}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  disabled={assigningLoading}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignments}
                  disabled={assigningLoading}
                  className="px-6 py-2.5 rounded-xl bg-[#0b5cbe] hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm transition-all border-none cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {assigningLoading ? 'Saving...' : 'Save Assignments'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 9. VIEW TRAINER PROFILE DRAWER ── */}
      <AnimatePresence>
        {showViewDrawer && activeTrainer && (
          <div className="fixed inset-0 z-[110] flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 p-6 space-y-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Trainer Profile
                </span>
                <button 
                  onClick={() => setShowViewDrawer(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 border-none cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Profile Card */}
              <div className="text-center space-y-2">
                <img 
                  src={resolveAvatarUrl(activeTrainer)} 
                  onError={(e) => {
                    const target = e.currentTarget;
                    const g = String(activeTrainer.gender || '').trim().toLowerCase();
                    target.src = (g === 'female' || g === 'f') ? FEMALE_DEFAULT_AVATAR : MALE_DEFAULT_AVATAR;
                  }}
                  className="w-20 h-20 rounded-full bg-slate-100 border-4 border-white shadow-md object-cover mx-auto" 
                  alt={activeTrainer.name} 
                />
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{activeTrainer.name}</h3>
                  <span className="inline-block mt-1 px-3 py-1 bg-blue-50 text-[#0b5cbe] border border-blue-200/60 rounded-full text-[10px] font-black uppercase tracking-wider">
                    {activeTrainer.specialization || 'Fitness Trainer'}
                  </span>
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Phone</span>
                  <span className="font-extrabold text-slate-900 block mt-0.5">📞 {activeTrainer.phone}</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Biometric ID</span>
                  <span className="font-extrabold text-slate-900 block mt-0.5 font-mono">#{activeTrainer.biometricId || '—'}</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Account Status</span>
                  <span className="font-extrabold text-emerald-600 block mt-0.5 uppercase">{normalizeStatus(activeTrainer.status)}</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Members</span>
                  <span className="font-extrabold text-[#0b5cbe] block mt-0.5">
                    {getAssignedMembersForTrainer(activeTrainer).length} Active
                  </span>
                </div>
              </div>

              {/* Assigned Members List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Assigned Members</span>
                  <button
                    onClick={() => {
                      setShowViewDrawer(false);
                      handleOpenAssignMembers(activeTrainer);
                    }}
                    className="text-[11px] font-bold text-[#0b5cbe] hover:underline bg-transparent border-none cursor-pointer"
                  >
                    + Manage
                  </button>
                </h4>

                {getAssignedMembersForTrainer(activeTrainer).length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                    No members currently assigned to {activeTrainer.name}.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {getAssignedMembersForTrainer(activeTrainer).map((m: any) => (
                      <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-extrabold text-slate-900 block">{m.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">#{m.memberId || m.id} • 📞 {m.phone}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-[#0b5cbe] text-[10px] font-bold border border-blue-200/50">
                          {m.plan || 'Standard'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  onClick={() => {
                    setShowViewDrawer(false);
                    handleOpenEdit(activeTrainer);
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl border border-slate-200 cursor-pointer"
                >
                  Edit Trainer
                </button>
                <button
                  onClick={() => {
                    const cleanPhone = activeTrainer.phone.replace(/\D/g, '');
                    window.open(`https://wa.me/91${cleanPhone}`, '_blank');
                  }}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl border-none cursor-pointer shadow-sm"
                >
                  WhatsApp
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 10. CUSTOM DELETE / DEACTIVATE MODAL (Assigned Member Safety) ── */}
      <AnimatePresence>
        {deleteTrainerTarget && (
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
                  <h3 className="font-extrabold text-slate-900 text-lg">Delete Trainer?</h3>
                  <p className="text-xs text-slate-400 font-medium">Unified Staff & Trainer roster safety check.</p>
                </div>
              </div>

              {getAssignedMembersForTrainer(deleteTrainerTarget).length > 0 ? (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs font-semibold text-amber-900 space-y-2">
                  <p>
                    <span className="font-black text-amber-950">{deleteTrainerTarget.name}</span> is currently assigned to{' '}
                    <span className="font-black text-amber-950 underline">
                      {getAssignedMembersForTrainer(deleteTrainerTarget).length} gym members
                    </span>.
                  </p>
                  <p className="text-[11px] text-amber-800 font-normal">
                    We recommend deactivating the coach so assigned members and past training logs remain intact.
                  </p>
                </div>
              ) : (
                <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 text-xs font-semibold text-rose-800 space-y-1.5">
                  <p>
                    Are you sure you want to permanently delete <span className="font-black text-rose-950">"{deleteTrainerTarget.name}"</span>?
                  </p>
                  <p className="text-[11px] text-rose-700 font-normal">
                    This will remove the employee record across both Trainers and Employees modules.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTrainerTarget(null)}
                  disabled={deletingTrainer}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                {getAssignedMembersForTrainer(deleteTrainerTarget).length > 0 ? (
                  <>
                    <button
                      type="button"
                      disabled={deletingTrainer}
                      onClick={() => handleConfirmDeleteTrainer('deactivate')}
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs cursor-pointer disabled:opacity-60 transition-colors border-none shadow-sm"
                    >
                      Keep Trainer / Deactivate
                    </button>
                    <button
                      type="button"
                      disabled={deletingTrainer}
                      onClick={() => handleConfirmDeleteTrainer('delete')}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs cursor-pointer disabled:opacity-60 transition-colors border-none shadow-sm"
                    >
                      Remove & Delete
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={deletingTrainer}
                    onClick={() => handleConfirmDeleteTrainer('delete')}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs cursor-pointer disabled:opacity-60 transition-colors border-none shadow-sm"
                  >
                    {deletingTrainer ? 'Deleting...' : 'Delete Trainer'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
