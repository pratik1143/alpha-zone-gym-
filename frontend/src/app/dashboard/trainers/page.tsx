'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Edit, Trash2, Mail, Phone, Dumbbell, ShieldAlert, Award, 
  Calendar, ExternalLink, X, Check, Sparkles, Activity, TrendingUp, 
  Target, UserCheck, Star, Award as TrophyIcon, DollarSign, Briefcase,
  Fingerprint, CheckCheck, XCircle, AlertTriangle, Scan, Wifi, Shield,
  AlertCircle, UserPlus, ArrowRight, User
} from 'lucide-react';
import { z } from 'zod';
import API from '@/services/api';
import { getInitials, getRandomColor, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db as fDb, isFirebaseReady } from '@/lib/firebase';
import SmartPhotoCapture from '../components/SmartPhotoCapture';

interface Trainer {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  experience: number;
  rating: number;
  branch: string;
  sessions: number;
  salary: number;
  status: 'active' | 'inactive';
  certifications: string[];
  photo: string;
  bio: string;
  joiningDate: string;
  instagram: string;
  achievements: string;
  members: number;
  biometricId?: number;
  employeeId?: string;
}

// Zod Validation Schema for Trainer Management
const trainerFormSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters.'),
  phone: z.string().trim().regex(/^[0-9+\s-]{10,15}$/, 'Enter a valid 10-15 digit mobile number.'),
  email: z.string().trim().email('Enter a valid email address.').or(z.literal('')),
  specialization: z.string().trim().min(1, 'Please select or enter specialization.'),
  experience: z.number({ message: 'Experience must be a number.' }).min(0, 'Experience cannot be negative.').max(60, 'Experience seems invalid.'),
  salary: z.number({ message: 'Salary must be a number.' }).min(0, 'Salary cannot be negative.'),
  joiningDate: z.string().min(1, 'Joining date is required.'),
  status: z.enum(['active', 'inactive']),
  certifications: z.string().optional(),
  achievements: z.string().optional(),
  bio: z.string().optional(),
  instagram: z.string().optional(),
  photo: z.string().optional(),
});

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [activeTrainer, setActiveTrainer] = useState<Trainer | null>(null);
  
  // Biometric Enrollment State
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollAction, setEnrollAction] = useState<'fingerprint' | 'face' | 'sync' | 'delete' | null>(null);
  const [enrollDocId, setEnrollDocId] = useState<string | null>(null);
  const [enrollStatus, setEnrollStatus] = useState<{
    status: 'idle' | 'connecting' | 'scanning' | 'processing' | 'ready' | 'success' | 'failed' | 'info';
    message: string;
    scan: number;
    totalScans: number;
    biometricId?: number;
  }>({ status: 'idle', message: 'Waiting to start...', scan: 0, totalScans: 3 });

  const enrollUnsubRef = useRef<(() => void) | null>(null);

  // Forms state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSpecialization, setFormSpecialization] = useState('Weight Loss Specialist');
  const [formExperience, setFormExperience] = useState(5);
  const [formSalary, setFormSalary] = useState(40000);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formCertifications, setFormCertifications] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formJoiningDate, setFormJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [formInstagram, setFormInstagram] = useState('');
  const [formAchievements, setFormAchievements] = useState('');
  const [formBiometricId, setFormBiometricId] = useState('');
  const [enrollFingerprintAfterSave, setEnrollFingerprintAfterSave] = useState(true);
  
  // Validation errors & submitting state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submittingForm, setSubmittingForm] = useState(false);

  // Assignment checklist state
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Fetch trainers and members
  const loadData = async () => {
    try {
      setLoading(true);
      const [trainersRes, membersRes] = await Promise.all([
        API.get('/trainers'),
        API.get('/members')
      ]);
      setTrainers(trainersRes.data);
      setMembers(membersRes.data);
    } catch (err: any) {
      console.error('Failed to load trainers data:', err);
      toast.error('Failed to retrieve trainers roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api';
  
  const getToken = async (): Promise<string> => {
    if (typeof window === 'undefined') return '';
    try {
      const { auth } = await import('@/lib/firebase');
      if (auth.currentUser) return await auth.currentUser.getIdToken();
    } catch (e) { /* ignore */ }
    try {
      const userJson = localStorage.getItem('alpha_zone_user');
      if (userJson) { const u = JSON.parse(userJson); return u.token || ''; }
    } catch (e) { /* ignore */ }
    return '';
  };

  // Listen to enrollment doc for live progress
  useEffect(() => {
    if (!enrollDocId || !isFirebaseReady || !fDb) return;
    if (enrollUnsubRef.current) enrollUnsubRef.current();
    const enrollRef = doc(fDb, 'biometric_enrollment', enrollDocId);
    const unsub = onSnapshot(enrollRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setEnrollStatus({
        status: data.status,
        message: data.message,
        scan: data.scan || 0,
        totalScans: data.totalScans || 3,
        biometricId: data.biometricId
      });
      
      if (data.status === 'success' && data.biometricId) {
        loadData();
      }
    }, (error) => {
      console.warn("Trainer biometric enrollment snapshot error:", error.message);
    });
    enrollUnsubRef.current = unsub;
    return () => {
      if (enrollUnsubRef.current) {
        enrollUnsubRef.current();
        enrollUnsubRef.current = null;
      }
    };
  }, [enrollDocId]);

  // Start Fingerprint Enrollment for Trainer
  const handleEnrollTrainerFingerprint = async (trainer: Trainer) => {
    setActiveTrainer(trainer);
    setEnrollAction('fingerprint');
    setEnrollStatus({ status: 'connecting', message: 'Connecting to hardware device...', scan: 0, totalScans: 3 });
    setEnrollModalOpen(true);

    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/biometric/enroll-fingerprint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          memberId: trainer.id,
          memberName: trainer.name,
          userType: 'employee'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setEnrollStatus({
          status: 'failed',
          message: data.error || data.message || 'Failed to start fingerprint enrollment.',
          scan: 0,
          totalScans: 3
        });
        return;
      }

      setEnrollDocId(data.enrollmentDocId);
      setEnrollStatus({
        status: 'ready',
        message: data.message || 'Please place finger on machine 3 times...',
        scan: 0,
        totalScans: 3
      });
    } catch (err: any) {
      setEnrollStatus({
        status: 'failed',
        message: err.message || 'Could not communicate with server.',
        scan: 0,
        totalScans: 3
      });
    }
  };

  const closeEnrollModal = () => {
    setEnrollModalOpen(false);
    setEnrollDocId(null);
    setEnrollAction(null);
    setEnrollStatus({ status: 'idle', message: 'Waiting to start...', scan: 0, totalScans: 3 });
    if (enrollUnsubRef.current) {
      enrollUnsubRef.current();
      enrollUnsubRef.current = null;
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormSpecialization('Weight Loss Specialist');
    setFormExperience(5);
    setFormSalary(40000);
    setFormStatus('active');
    setFormCertifications('');
    setFormPhoto('');
    setFormBio('');
    setFormJoiningDate(new Date().toISOString().split('T')[0]);
    setFormInstagram('');
    setFormAchievements('');
    setFormBiometricId('');
    setEnrollFingerprintAfterSave(true);
    setFormErrors({});
  };

  const validateTrainerForm = () => {
    const result = trainerFormSchema.safeParse({
      name: formName,
      phone: formPhone,
      email: formEmail,
      specialization: formSpecialization,
      experience: Number(formExperience),
      salary: Number(formSalary),
      joiningDate: formJoiningDate,
      status: formStatus,
      certifications: formCertifications,
      achievements: formAchievements,
      bio: formBio,
      instagram: formInstagram,
      photo: formPhoto,
    });

    if (!result.success) {
      const errMap: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) errMap[issue.path[0] as string] = issue.message;
      });
      setFormErrors(errMap);
      return false;
    }
    setFormErrors({});
    return true;
  };

  const clearFieldError = (field: string) => {
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateTrainerForm()) {
      toast.error('Please fix the errors highlighted in red.');
      return;
    }

    setSubmittingForm(true);
    const payload = {
      name: formName,
      email: formEmail || `${formPhone}@alphagym.com`,
      phone: formPhone,
      specialization: formSpecialization,
      experience: Number(formExperience) || 1,
      salary: Number(formSalary) || 30000,
      status: formStatus,
      certifications: formCertifications.split(',').map(c => c.trim()).filter(Boolean),
      photo: formPhoto || '/gym_images/Personal Training in Mohali.jpeg',
      bio: formBio,
      joiningDate: formJoiningDate,
      instagram: formInstagram,
      achievements: formAchievements,
      biometricId: formBiometricId ? Number(formBiometricId) : null
    };

    try {
      const res = await API.post('/trainers', payload);
      toast.success('Trainer created and synced to Employee roster!');
      setShowAddModal(false);
      
      const newTrainer = res.data;
      const shouldEnroll = enrollFingerprintAfterSave;
      resetForm();
      loadData();
      
      if (newTrainer && shouldEnroll) {
        setTimeout(() => {
          handleEnrollTrainerFingerprint(newTrainer);
        }, 300);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to add trainer.';
      toast.error(msg);
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleOpenEdit = (trainer: Trainer) => {
    setActiveTrainer(trainer);
    setFormName(trainer.name);
    setFormEmail(trainer.email);
    setFormPhone(trainer.phone);
    setFormSpecialization(trainer.specialization);
    setFormExperience(trainer.experience);
    setFormSalary(trainer.salary);
    setFormStatus(trainer.status);
    setFormCertifications(Array.isArray(trainer.certifications) ? trainer.certifications.join(', ') : '');
    setFormPhoto(trainer.photo);
    setFormBio(trainer.bio);
    setFormJoiningDate(trainer.joiningDate || new Date().toISOString().split('T')[0]);
    setFormInstagram(trainer.instagram);
    setFormAchievements(trainer.achievements);
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrainer) return;
    if (!validateTrainerForm()) {
      toast.error('Please fix the errors highlighted in red.');
      return;
    }

    setSubmittingForm(true);
    const payload = {
      name: formName,
      email: formEmail,
      phone: formPhone,
      specialization: formSpecialization,
      experience: Number(formExperience) || 1,
      salary: Number(formSalary) || 30000,
      status: formStatus,
      certifications: formCertifications.split(',').map(c => c.trim()).filter(Boolean),
      photo: formPhoto,
      bio: formBio,
      joiningDate: formJoiningDate,
      instagram: formInstagram,
      achievements: formAchievements
    };

    try {
      await API.put(`/trainers/${activeTrainer.id}`, payload);
      toast.success('Trainer profile & linked employee updated!');
      setShowEditModal(false);
      resetForm();
      setActiveTrainer(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update trainer.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleDelete = async (trainer: Trainer) => {
    if (!confirm(`Are you sure you want to permanently delete trainer ${trainer.name}? This will also clean up their synced employee record.`)) return;
    try {
      await API.delete(`/trainers/${trainer.id}`);
      toast.success('Trainer deleted successfully.');
      loadData();
    } catch (err: any) {
      toast.error('Failed to delete trainer.');
    }
  };

  const handleToggleStatus = async (trainer: Trainer) => {
    const newStatus = trainer.status === 'active' ? 'inactive' : 'active';
    try {
      await API.put(`/trainers/${trainer.id}`, { status: newStatus });
      toast.success(`Trainer ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`);
      loadData();
    } catch (err: any) {
      toast.error('Failed to change trainer status.');
    }
  };

  // Open Assignment Checklist
  const handleOpenAssign = (trainer: Trainer) => {
    setActiveTrainer(trainer);
    const assignedIds = members.filter(m => m.trainerId === trainer.id || m.trainer === trainer.name).map(m => m.id);
    setAssignedMemberIds(assignedIds);
    setMemberSearchQuery('');
    setShowAssignModal(true);
  };

  const handleToggleMemberSelect = (memberId: string) => {
    setAssignedMemberIds(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSaveAssignment = async () => {
    if (!activeTrainer) return;
    try {
      await API.post(`/trainers/${activeTrainer.id}/assign-members`, { memberIds: assignedMemberIds });
      toast.success('Trainer member assignments updated successfully!');
      setShowAssignModal(false);
      setActiveTrainer(null);
      loadData();
    } catch (err: any) {
      toast.error('Failed to save assignments.');
    }
  };

  // Filtered trainers list
  const filteredTrainers = trainers.filter(t => 
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.phone?.includes(searchQuery)
  );

  // Filtered members for checklists
  const filteredMembers = members.filter(m => 
    m.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
    (m.memberId && m.memberId.toLowerCase().includes(memberSearchQuery.toLowerCase()))
  );

  // Simulated metrics for a trainer card
  const getTrainerMetrics = (t: Trainer) => {
    const base = t.name.charCodeAt(0) % 10;
    return {
      attendanceImprovement: 10 + base * 2,
      weightLossSuccess: 75 + base,
      dietCompliance: 80 + (base % 5) * 3,
      workoutCompliance: 85 + (base % 3) * 4,
      renewalRate: 90 + (base % 4) * 2,
      score: 88 + (base % 3) * 4
    };
  };

  return (
    <div className="space-y-6 text-slate-800 font-display">
      
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Trainers & Fitness Roster</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0B5CBE] border border-blue-200/60 text-[10px] font-black uppercase tracking-wider">
              Alpha Zone OS
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage professional gym trainers, personal training client allocations, and automatic employee roster synchronization.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="px-5 py-3 rounded-2xl bg-[#0B5CBE] hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer border-none"
        >
          <Plus size={15} /> Add Professional Trainer
        </button>
      </div>

      {/* Roster Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white border border-slate-100 p-4 rounded-[24px] shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search trainer name, phone, or specialty..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0B5CBE] font-medium transition-all"
          />
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <UserCheck size={14} className="text-[#0B5CBE]" />
            <span>Total: <strong className="text-slate-900 font-black">{trainers.length}</strong> Trainers</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/60 border border-blue-200/60 text-blue-900">
            <Sparkles size={13} className="text-[#0B5CBE]" />
            <span>Auto Employee Sync Active</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-8 h-8 border-2 border-[#0B5CBE] border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Loading Trainers Roster...</span>
        </div>
      ) : (
        /* Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTrainers.map(t => {
            const metrics = getTrainerMetrics(t);
            const avatarColor = getRandomColor(t.name);
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-[28px] border bg-white shadow-sm flex flex-col justify-between overflow-hidden relative transition-all hover:shadow-md group ${
                  t.status === 'active' ? 'border-slate-200/80' : 'border-slate-200/60 opacity-70'
                }`}
              >
                {/* Status indicator banner */}
                <div className="absolute top-4 right-4 z-10 flex gap-1.5">
                  <button
                    onClick={() => handleToggleStatus(t)}
                    className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                      t.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {t.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                  <div className="px-2.5 py-1 rounded-full bg-slate-900 text-amber-400 border border-slate-800 text-[9px] font-black flex items-center gap-0.5 shadow-sm">
                    <Star size={10} className="fill-current text-amber-400" />
                    <span>{t.rating || '4.8'}</span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Photo & Details row */}
                  <div className="flex gap-3.5 items-start">
                    {t.photo ? (
                      <img 
                        src={t.photo} 
                        alt={t.name} 
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm shrink-0" 
                      />
                    ) : (
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {getInitials(t.name)}
                      </div>
                    )}
                    
                    <div className="space-y-1 text-left pr-16">
                      <span className="text-[9px] bg-blue-50 text-[#0B5CBE] border border-blue-200/50 px-2 py-0.5 rounded-md font-black tracking-wider uppercase inline-block">
                        {t.specialization}
                      </span>
                      <h3 className="text-sm font-black text-slate-900 leading-tight">{t.name}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
                        <span className="flex items-center gap-1"><Briefcase size={10} className="text-slate-400" /> {t.experience} Yrs Exp.</span>
                        <span>•</span>
                        <span className="text-slate-700 font-bold">{formatCurrency(t.salary)}/mo</span>
                      </div>
                    </div>
                  </div>

                  {/* Linked Employee indicator pill */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px]">
                    <span className="text-slate-500 font-semibold flex items-center gap-1">
                      <User size={12} className="text-[#0B5CBE]" />
                      Synced Staff Record:
                    </span>
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 uppercase text-[9px]">
                      Linked Employee
                    </span>
                  </div>

                  {/* Contact Specs */}
                  <div className="p-3 bg-slate-50/60 border border-slate-100 rounded-xl text-[10px] text-slate-600 font-semibold space-y-1 text-left">
                    <div className="flex items-center gap-2">
                      <Phone size={11} className="text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-800">{t.phone}</span>
                    </div>
                    {t.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={11} className="text-slate-400 shrink-0" />
                        <span className="truncate">{t.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Certifications and Bio */}
                  <div className="space-y-1.5 text-left text-[10px]">
                    {t.bio && (
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium italic">
                        "{t.bio}"
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {t.certifications && t.certifications.length > 0 ? (
                        t.certifications.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-slate-700 text-[8px] font-bold uppercase">
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] text-slate-400 italic">No certifications listed</span>
                      )}
                    </div>
                  </div>

                  {/* Performance Summary */}
                  <div className="border-t border-slate-100 pt-2.5 text-left space-y-1.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Performance Index</span>
                      <span className="text-[#0B5CBE] font-black flex items-center gap-0.5">
                        <Sparkles size={10} /> {metrics.score}/100
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[9px] font-semibold">
                      <div className="flex justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400">Success Rate</span>
                        <span className="text-emerald-600 font-bold">{metrics.weightLossSuccess}%</span>
                      </div>
                      <div className="flex justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400">Renewal Rate</span>
                        <span className="text-[#0B5CBE] font-bold">{metrics.renewalRate}%</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom interactive card bar */}
                <div className="flex border-t border-slate-100 bg-slate-50/50">
                  <button
                    onClick={() => handleOpenAssign(t)}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-black text-slate-700 hover:bg-blue-50 hover:text-[#0B5CBE] transition-colors border-none bg-transparent cursor-pointer border-r border-slate-100"
                  >
                    <UserCheck size={12} className="text-[#0B5CBE]" />
                    <span>Assign ({members.filter(m => m.trainerId === t.id || m.trainer === t.name).length})</span>
                  </button>
                  <button
                    onClick={() => handleEnrollTrainerFingerprint(t)}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-black text-slate-700 hover:bg-blue-50 hover:text-[#0B5CBE] transition-colors border-none bg-transparent cursor-pointer border-r border-slate-100"
                  >
                    <Fingerprint size={12} className="text-[#0B5CBE]" />
                    <span>Biometric ({t.biometricId ? `#${t.biometricId}` : 'Sync'})</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-black text-slate-700 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer border-r border-slate-100"
                  >
                    <Edit size={12} className="text-slate-500" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-black text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors border-none bg-transparent cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                </div>

              </motion.div>
            );
          })}

          {filteredTrainers.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 italic text-xs bg-white rounded-3xl border border-slate-100">
              No professional trainers matching your search filter.
            </div>
          )}
        </div>
      )}

      {/* ─── ADD TRAINER MODAL ─── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-2xl bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 uppercase">Add Professional Trainer</h3>
                    <span className="px-2 py-0.5 bg-blue-50 text-[#0B5CBE] text-[9px] font-black uppercase rounded-md border border-blue-200/60">
                      Auto Employee Provisioning
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Adding a trainer here automatically creates a linked record in the Gym Employee Roster.
                  </p>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)} 
                  className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-5 text-xs font-semibold">
                
                {/* Photo Option */}
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Trainer Photo</label>
                  <SmartPhotoCapture 
                    value={formPhoto || undefined}
                    onCaptureComplete={(urls) => {
                      setFormPhoto(urls.photoURL);
                      clearFieldError('photo');
                    }}
                    label="Trainer"
                  />
                </div>

                {/* Section 1: Basic & Contact Profile */}
                <div className="space-y-3 pt-1">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <User size={13} className="text-[#0B5CBE]" /> Section 1: Contact & Personal Details
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1 font-bold">Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Rohit Sharma"
                        value={formName}
                        onChange={e => {
                          setFormName(e.target.value);
                          clearFieldError('name');
                        }}
                        className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-800 font-semibold transition-all ${
                          formErrors.name ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-[#0B5CBE]'
                        }`}
                      />
                      {formErrors.name && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {formErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1 font-bold">Mobile Number *</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={formPhone}
                        onChange={e => {
                          setFormPhone(e.target.value);
                          clearFieldError('phone');
                        }}
                        className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-800 font-semibold transition-all ${
                          formErrors.phone ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-[#0B5CBE]'
                        }`}
                      />
                      {formErrors.phone && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {formErrors.phone}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1 font-bold">Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. rohit@alphagym.com"
                        value={formEmail}
                        onChange={e => {
                          setFormEmail(e.target.value);
                          clearFieldError('email');
                        }}
                        className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-800 font-semibold transition-all ${
                          formErrors.email ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-[#0B5CBE]'
                        }`}
                      />
                      {formErrors.email && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {formErrors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1 font-bold">Instagram Handler</label>
                      <input
                        type="text"
                        placeholder="rohit_sharma_coach"
                        value={formInstagram}
                        onChange={e => setFormInstagram(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE]"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Professional Qualifications */}
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Award size={13} className="text-[#0B5CBE]" /> Section 2: Professional Profile
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1 font-bold">Specialization *</label>
                      <select
                        value={formSpecialization}
                        onChange={e => {
                          setFormSpecialization(e.target.value);
                          clearFieldError('specialization');
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE] font-semibold cursor-pointer"
                      >
                        <option value="Weight Loss Specialist">Weight Loss Specialist</option>
                        <option value="Strength & Conditioning">Strength & Conditioning</option>
                        <option value="CrossFit & HIIT">CrossFit & HIIT</option>
                        <option value="Yoga & Flexibility">Yoga & Flexibility</option>
                        <option value="Bodybuilding">Bodybuilding</option>
                        <option value="Functional Training">Functional Training</option>
                        <option value="General Fitness Coach">General Fitness Coach</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1 font-bold">Experience (Years) *</label>
                      <input
                        type="number"
                        value={formExperience}
                        onChange={e => {
                          setFormExperience(Number(e.target.value));
                          clearFieldError('experience');
                        }}
                        className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-800 font-semibold transition-all ${
                          formErrors.experience ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-[#0B5CBE]'
                        }`}
                        min={0}
                      />
                      {formErrors.experience && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {formErrors.experience}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1 font-bold">Certifications (Comma Separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. ACE Certified, CSCS, CPR"
                        value={formCertifications}
                        onChange={e => setFormCertifications(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1 font-bold">Key Achievements</label>
                      <input
                        type="text"
                        placeholder="e.g. Trained 100+ fat loss clients"
                        value={formAchievements}
                        onChange={e => setFormAchievements(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1 font-bold">Short Biography</label>
                    <textarea
                      rows={2}
                      placeholder="Brief bio for trainer cards and member assignments..."
                      value={formBio}
                      onChange={e => setFormBio(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE] resize-none"
                    />
                  </div>
                </div>

                {/* Section 3: Compensation & Employment */}
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <DollarSign size={13} className="text-[#0B5CBE]" /> Section 3: Compensation & Status
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1 font-bold">Monthly Salary (INR) *</label>
                      <input
                        type="number"
                        value={formSalary}
                        onChange={e => {
                          setFormSalary(Number(e.target.value));
                          clearFieldError('salary');
                        }}
                        className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-800 font-semibold transition-all ${
                          formErrors.salary ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-[#0B5CBE]'
                        }`}
                        min={0}
                      />
                      {formErrors.salary && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {formErrors.salary}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1 font-bold">Joining Date *</label>
                      <input
                        type="date"
                        value={formJoiningDate}
                        onChange={e => {
                          setFormJoiningDate(e.target.value);
                          clearFieldError('joiningDate');
                        }}
                        className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-800 font-semibold transition-all ${
                          formErrors.joiningDate ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-[#0B5CBE]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1 font-bold">Staff Status</label>
                      <select
                        value={formStatus}
                        onChange={e => setFormStatus(e.target.value as any)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE] cursor-pointer"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 4: Biometrics Sync */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1 font-bold">Biometric Slot ID (Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 505"
                      value={formBiometricId}
                      onChange={e => setFormBiometricId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE]"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="enrollFingerprintAfterSave"
                      checked={enrollFingerprintAfterSave}
                      onChange={e => setEnrollFingerprintAfterSave(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0B5CBE] border-slate-300 focus:ring-[#0B5CBE] cursor-pointer"
                    />
                    <label htmlFor="enrollFingerprintAfterSave" className="text-xs text-slate-700 font-bold select-none cursor-pointer flex items-center gap-1.5">
                      <Fingerprint size={14} className="text-[#0B5CBE]" />
                      Prompt Fingerprint Enrollment Immediately
                    </label>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors uppercase tracking-wider text-[10px] font-black cursor-pointer bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingForm}
                    className="flex-1 py-3 bg-[#0B5CBE] hover:bg-blue-700 text-white rounded-xl transition-all uppercase tracking-wider text-[10px] font-black cursor-pointer border-none shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submittingForm ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating Trainer...</span>
                      </>
                    ) : (
                      <span>Save Trainer & Sync Employee</span>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── EDIT TRAINER MODAL ─── */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-xl bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase font-display">Edit Trainer Profile</h3>
                <button 
                  onClick={() => { setShowEditModal(false); setActiveTrainer(null); }} 
                  className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Trainer Photo URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com/photo.jpg"
                      value={formPhoto}
                      onChange={e => setFormPhoto(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Full Name *</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Mobile Number *</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Email Address</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Specialization *</label>
                    <select
                      value={formSpecialization}
                      onChange={e => setFormSpecialization(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE] cursor-pointer"
                    >
                      <option value="Weight Loss Specialist">Weight Loss Specialist</option>
                      <option value="Strength & Conditioning">Strength & Conditioning</option>
                      <option value="CrossFit & HIIT">CrossFit & HIIT</option>
                      <option value="Yoga & Flexibility">Yoga & Flexibility</option>
                      <option value="Bodybuilding">Bodybuilding</option>
                      <option value="Functional Training">Functional Training</option>
                      <option value="General Fitness Coach">General Fitness Coach</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Experience (Years) *</label>
                    <input
                      type="number"
                      value={formExperience}
                      onChange={e => setFormExperience(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE]"
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Monthly Salary (INR)</label>
                    <input
                      type="number"
                      value={formSalary}
                      onChange={e => setFormSalary(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE]"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Instagram Handler</label>
                    <input
                      type="text"
                      value={formInstagram}
                      onChange={e => setFormInstagram(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Certifications (Comma Separated)</label>
                  <input
                    type="text"
                    value={formCertifications}
                    onChange={e => setFormCertifications(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Biography Profile</label>
                  <textarea
                    rows={2}
                    value={formBio}
                    onChange={e => setFormBio(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0B5CBE] resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); setActiveTrainer(null); }}
                    className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors uppercase tracking-wider text-[10px] font-black cursor-pointer bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingForm}
                    className="flex-1 py-3 bg-[#0B5CBE] hover:bg-blue-700 text-white rounded-xl transition-all uppercase tracking-wider text-[10px] font-black cursor-pointer border-none shadow-md flex items-center justify-center gap-2"
                  >
                    {submittingForm ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ASSIGN MEMBERS POPUP MODAL ─── */}
      <AnimatePresence>
        {showAssignModal && activeTrainer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col justify-between text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Assign Members</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Select clients for Coach {activeTrainer.name}</p>
                </div>
                <button onClick={() => { setShowAssignModal(false); setActiveTrainer(null); }} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {/* Search checklist filter */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Filter members by name or ID..."
                  value={memberSearchQuery}
                  onChange={e => setMemberSearchQuery(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-slate-800 focus:outline-none focus:border-[#0B5CBE] font-semibold"
                />
              </div>

              {/* Checklist list */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[300px] pr-1 py-1">
                {filteredMembers.map(m => {
                  const isChecked = assignedMemberIds.includes(m.id);
                  return (
                    <div 
                      key={m.id}
                      onClick={() => handleToggleMemberSelect(m.id)}
                      className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800">{m.name}</div>
                        <div className="text-[9px] text-slate-400 font-mono font-bold uppercase">{m.memberId || m.id} · {m.plan}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        isChecked 
                          ? 'bg-[#0B5CBE] border-[#0B5CBE] text-white font-black text-xs' 
                          : 'border-slate-300 bg-white'
                      }`}>
                        {isChecked && '✓'}
                      </div>
                    </div>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-400 italic">No matching members.</div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAssignModal(false); setActiveTrainer(null); }}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors uppercase tracking-wider text-[10px] font-black cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAssignment}
                  className="flex-1 py-2.5 bg-[#0B5CBE] hover:bg-blue-700 text-white rounded-xl transition-all uppercase tracking-wider text-[10px] font-black cursor-pointer border-none shadow-md"
                >
                  Save Assignments
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ Biometric Enrollment Modal ═══════════════════════════════════════ */}
      <AnimatePresence>
        {enrollModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={enrollStatus.status === 'success' || enrollStatus.status === 'failed' || enrollStatus.status === 'info' ? closeEnrollModal : undefined} />

            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 200 }}
              className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-[32px] p-8 shadow-2xl z-10 overflow-hidden text-left"
            >
              {/* Glow BG */}
              <div className={`absolute inset-0 opacity-20 pointer-events-none transition-all duration-700 ${
                enrollStatus.status === 'success' ? 'bg-emerald-500' :
                enrollStatus.status === 'failed' ? 'bg-red-500' :
                enrollStatus.status === 'scanning' ? 'bg-blue-500' : 'bg-amber-500'
              } blur-3xl`} />

              {/* Close Button */}
              {(enrollStatus.status === 'success' || enrollStatus.status === 'failed' || enrollStatus.status === 'info') && (
                <button onClick={closeEnrollModal} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer border-none">
                  <X size={14} />
                </button>
              )}

              {/* Header */}
              <div className="text-center mb-8 relative">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                  {enrollAction === 'fingerprint' ? 'Trainer Fingerprint Enrollment' : 'Delete Biometric'}
                </div>
                <h3 className="text-xl font-black text-white">
                  {activeTrainer?.name}
                </h3>
              </div>

              {/* Animated Scan Ring + Icon */}
              <div className="flex items-center justify-center mb-8">
                <div className="relative w-32 h-32">
                  {(enrollStatus.status === 'scanning' || enrollStatus.status === 'ready' || enrollStatus.status === 'connecting') && (
                    <>
                      <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" />
                      <div className="absolute inset-2 rounded-full border border-blue-500/20 animate-pulse" />
                    </>
                  )}
                  {enrollStatus.status === 'success' && (
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500/40 animate-pulse" />
                  )}

                  {/* Progress arc SVG */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                    <circle
                      cx="60" cy="60" r="54"
                      fill="none"
                      stroke={enrollStatus.status === 'success' ? '#10b981' : enrollStatus.status === 'failed' ? '#ef4444' : '#3b82f6'}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 54}`}
                      strokeDashoffset={`${2 * Math.PI * 54 * (1 - (enrollStatus.scan / (enrollStatus.totalScans || 3)))}`}
                      className="transition-all duration-700"
                    />
                  </svg>

                  {/* Center Icon */}
                  <div className={`absolute inset-0 flex items-center justify-center rounded-full ${
                    enrollStatus.status === 'success' ? 'bg-emerald-500/20' :
                    enrollStatus.status === 'failed' ? 'bg-red-500/20' :
                    'bg-blue-500/10'
                  }`}>
                    {enrollStatus.status === 'success' ? (
                      <CheckCheck size={36} className="text-emerald-400" />
                    ) : enrollStatus.status === 'failed' ? (
                      <XCircle size={36} className="text-red-400" />
                    ) : enrollStatus.status === 'info' ? (
                      <AlertTriangle size={36} className="text-amber-400" />
                    ) : enrollAction === 'delete' ? (
                      <Trash2 size={36} className="text-red-400 animate-pulse" />
                    ) : (
                      <Fingerprint size={36} className={`${enrollStatus.status === 'scanning' ? 'text-blue-400 animate-pulse' : 'text-slate-400'}`} />
                    )}
                  </div>
                </div>
              </div>

              {/* Scan Steps */}
              {enrollAction === 'fingerprint' && (
                <div className="flex justify-center gap-3 mb-6">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${enrollStatus.scan >= step ? 'opacity-100' : 'opacity-30'}`}>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black border-2 transition-all duration-500 ${
                        enrollStatus.scan > step
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : enrollStatus.scan === step
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400 animate-pulse'
                          : 'bg-white/5 border-white/10 text-slate-500'
                      }`}>
                        {enrollStatus.scan > step ? '✓' : step}
                      </div>
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${enrollStatus.scan >= step ? 'text-slate-300' : 'text-slate-600'}`}>
                        Scan {step}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Status Message */}
              <div className={`text-center px-4 py-3 rounded-2xl mb-4 ${
                enrollStatus.status === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                enrollStatus.status === 'failed' ? 'bg-red-500/10 border border-red-500/20' :
                enrollStatus.status === 'info' ? 'bg-amber-500/10 border border-amber-500/20' :
                'bg-white/5 border border-white/10'
              }`}>
                <p className={`text-[11px] font-bold leading-relaxed ${
                  enrollStatus.status === 'success' ? 'text-emerald-400' :
                  enrollStatus.status === 'failed' ? 'text-red-400' :
                  enrollStatus.status === 'info' ? 'text-amber-400' :
                  'text-slate-300'
                }`}>
                  {enrollStatus.message || 'Initializing...'}
                </p>
              </div>

              {/* Success: Show assigned biometric ID */}
              {enrollStatus.status === 'success' && enrollStatus.biometricId && (
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 bg-[#d4ff00]/10 border border-[#d4ff00]/30 px-4 py-2 rounded-full">
                    <Shield size={12} className="text-[#d4ff00]" />
                    <span className="text-[11px] font-black text-[#d4ff00] uppercase tracking-widest">
                      Biometric ID: {enrollStatus.biometricId}
                    </span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {(enrollStatus.status === 'success' || enrollStatus.status === 'failed' || enrollStatus.status === 'info') && (
                  <button
                    onClick={closeEnrollModal}
                    className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none"
                  >
                    Close
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
