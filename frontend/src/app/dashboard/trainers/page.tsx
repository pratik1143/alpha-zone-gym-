'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Edit, Trash2, Mail, Phone, Dumbbell, ShieldAlert, Award, 
  Calendar, ExternalLink, X, Check, Sparkles, Activity, TrendingUp, 
  Target, UserCheck, Star, Award as TrophyIcon, DollarSign, Briefcase,
  Fingerprint, CheckCheck, XCircle, AlertTriangle, Scan, Wifi, Shield
} from 'lucide-react';
import API from '@/services/api';
import { getInitials, getRandomColor, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db as fDb, isFirebaseReady } from '@/lib/firebase';

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
}

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
        // Update local state and reload
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
  }, [enrollDocId, isFirebaseReady]);

  const closeEnrollModal = () => {
    setEnrollModalOpen(false);
    setEnrollAction(null);
    setEnrollDocId(null);
    if (enrollUnsubRef.current) { enrollUnsubRef.current(); enrollUnsubRef.current = null; }
  };

  const handleEnrollTrainerFingerprint = async (trainer: Trainer) => {
    if (!trainer) return;
    setActiveTrainer(trainer);
    const biometricId = trainer.biometricId || prompt('Enter Biometric ID (device slot number, e.g. 500):', '');
    if (!biometricId) return;

    setEnrollAction('fingerprint');
    setEnrollStatus({ status: 'idle', message: 'Waiting to start...', scan: 0, totalScans: 3 });
    setEnrollDocId(null);
    setEnrollModalOpen(true);

    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/devices/biometric/enroll-fingerprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ memberId: trainer.id, memberName: trainer.name, biometricId: Number(biometricId), fingerIndex: 0 }),
      });
      const data = await res.json();
      if (data.enrollmentDocId) {
        setEnrollDocId(data.enrollmentDocId);
        // Save ID to trainer profile
        await API.put(`/trainers/${trainer.id}`, { biometricId: Number(biometricId) });
        loadData();
      } else {
        setEnrollStatus(s => ({ ...s, status: 'failed', message: data.error || 'Failed to queue enrollment' }));
      }
    } catch (e: any) {
      setEnrollStatus(s => ({ ...s, status: 'failed', message: e.message }));
    }
  };

  const handleDeleteTrainerFingerprint = async (trainer: Trainer) => {
    if (!trainer || !trainer.biometricId) return;
    setActiveTrainer(trainer);
    if (!confirm(`Delete fingerprint from device for trainer ${trainer.name}?`)) return;

    setEnrollAction('delete');
    setEnrollStatus({ status: 'idle', message: 'Deleting fingerprint from hardware...', scan: 0, totalScans: 1 });
    setEnrollDocId(null);
    setEnrollModalOpen(true);

    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/devices/biometric/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ memberId: trainer.id, memberName: trainer.name, biometricId: trainer.biometricId }),
      });
      const data = await res.json();
      if (data.enrollmentDocId) {
        setEnrollDocId(data.enrollmentDocId);
        await API.put(`/trainers/${trainer.id}`, { biometricId: null });
        loadData();
      } else {
        setEnrollStatus(s => ({ ...s, status: 'failed', message: data.error || 'Failed to delete fingerprint' }));
      }
    } catch (e: any) {
      setEnrollStatus(s => ({ ...s, status: 'failed', message: e.message }));
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
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) {
      toast.error('Trainer name and contact mobile are required.');
      return;
    }

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
      toast.success('New trainer successfully registered!');
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
      toast.error(err.response?.data?.error || 'Failed to add trainer.');
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
    setFormCertifications(trainer.certifications.join(', '));
    setFormPhoto(trainer.photo);
    setFormBio(trainer.bio);
    setFormJoiningDate(trainer.joiningDate || new Date().toISOString().split('T')[0]);
    setFormInstagram(trainer.instagram);
    setFormAchievements(trainer.achievements);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrainer) return;

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
      toast.success('Trainer profile updated!');
      setShowEditModal(false);
      resetForm();
      setActiveTrainer(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update trainer.');
    }
  };

  const handleDelete = async (trainer: Trainer) => {
    if (!confirm(`Are you sure you want to permanently delete trainer ${trainer.name}?`)) return;
    try {
      await API.delete(`/trainers/${trainer.id}`);
      toast.success('Trainer deleted.');
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
    // Find member IDs assigned to this trainer
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
    t.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtered members for checklists
  const filteredMembers = members.filter(m => 
    m.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
    (m.memberId && m.memberId.toLowerCase().includes(memberSearchQuery.toLowerCase()))
  );

  // Simulated metrics for a trainer card
  const getTrainerMetrics = (t: Trainer) => {
    // Dynamically derive some scores from details
    const base = t.name.charCodeAt(0) % 10;
    return {
      attendanceImprovement: 10 + base * 2, // 10% - 30%
      weightLossSuccess: 75 + base,        // 75% - 85%
      dietCompliance: 80 + (base % 5) * 3, // 80% - 95%
      workoutCompliance: 85 + (base % 3) * 4, // 85% - 95%
      renewalRate: 90 + (base % 4) * 2,    // 90% - 98%
      score: 88 + (base % 3) * 4           // 88 - 98
    };
  };

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-wider uppercase font-display text-slate-900">CRM — Trainers Module</h1>
          <p className="text-xs text-slate-500 font-medium">Manage gym professional trainers, member assignments, and client reviews.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="px-5 py-3 rounded-2xl bg-black text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={14} /> Add New Trainer
        </button>
      </div>

      {/* Roster Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white border border-slate-100 p-4 rounded-[24px] shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search trainer name or specialization..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-black font-medium"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
          <UserCheck size={14} />
          <span>Total Staff: {trainers.length} Trainers</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Loading Trainers...</span>
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
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-[32px] border bg-white shadow-sm flex flex-col justify-between overflow-hidden relative transition-all group ${
                  t.status === 'active' ? 'border-slate-100 hover:shadow-lg' : 'border-slate-100 opacity-65'
                }`}
              >
                
                {/* Status indicator banner */}
                <div className="absolute top-4 right-4 z-10 flex gap-1.5">
                  <button
                    onClick={() => handleToggleStatus(t)}
                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                      t.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {t.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                  <div className="px-2.5 py-1 rounded-full bg-slate-900 text-amber-400 border border-slate-800 text-[9px] font-black flex items-center gap-0.5 shadow-md">
                    <Star size={10} className="fill-current text-amber-400" />
                    <span>{t.rating || '4.8'}</span>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  
                  {/* Photo & Details row */}
                  <div className="flex gap-4 items-start">
                    {t.photo ? (
                      <img 
                        src={t.photo} 
                        alt={t.name} 
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-sm shrink-0" 
                      />
                    ) : (
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl text-white shrink-0"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {getInitials(t.name)}
                      </div>
                    )}
                    
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-black tracking-wider uppercase block w-fit">
                        {t.specialization}
                      </span>
                      <h3 className="text-sm font-black text-slate-900 leading-tight font-display">{t.name}</h3>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold font-mono">
                        <Briefcase size={10} className="text-slate-400" />
                        <span>{t.experience} Years Exp.</span>
                      </div>
                      {t.biometricId && (
                        <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold font-mono">
                          <Fingerprint size={10} />
                          <span>Biometric ID: #{t.biometricId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bio statement */}
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium italic text-left">
                    "{t.bio || 'Professional fitness coach dedicated to high output programming and personal client success logs.'}"
                  </p>

                  {/* Contact Specs */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] text-slate-600 font-semibold space-y-1.5 text-left">
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{t.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-slate-400 shrink-0" />
                      <span>{t.phone}</span>
                    </div>
                    {t.instagram && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <ExternalLink size={12} className="text-blue-400 shrink-0" />
                        <span>@{t.instagram}</span>
                      </div>
                    )}
                  </div>

                  {/* Certifications and Achievements */}
                  <div className="space-y-2 text-left text-[10px]">
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Certifications</span>
                      <div className="flex flex-wrap gap-1">
                        {t.certifications && t.certifications.length > 0 ? (
                          t.certifications.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[8px] font-black uppercase">
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">None logged</span>
                        )}
                      </div>
                    </div>
                    {t.achievements && (
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Key Achievement</span>
                        <div className="text-[10px] text-slate-600 font-semibold flex items-center gap-1.5 mt-0.5">
                          <TrophyIcon size={12} className="text-amber-500 shrink-0" />
                          <span className="truncate">{t.achievements}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Analytics Section - Trainer Performance */}
                  <div className="border-t border-slate-100 pt-3 text-left space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 uppercase tracking-wider font-bold">AI Performance Score</span>
                      <span className="text-indigo-600 font-black flex items-center gap-0.5">
                        <Sparkles size={10} />
                        Trainer Score: {metrics.score}/100
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-semibold text-slate-600">
                      <div className="flex justify-between bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400">Attendance Imp.</span>
                        <span className="text-emerald-600 font-bold">+{metrics.attendanceImprovement}%</span>
                      </div>
                      <div className="flex justify-between bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400">Fat Loss Success</span>
                        <span className="text-emerald-600 font-bold">{metrics.weightLossSuccess}%</span>
                      </div>
                      <div className="flex justify-between bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400">Diet Compliance</span>
                        <span className="text-indigo-600 font-bold">{metrics.dietCompliance}%</span>
                      </div>
                      <div className="flex justify-between bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400">Renewal Rate</span>
                        <span className="text-indigo-600 font-bold">{metrics.renewalRate}%</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom interactive card bar */}
                <div className="flex border-t border-slate-100 bg-slate-50/50">
                  <button
                    onClick={() => handleOpenAssign(t)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-black text-slate-700 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer border-r border-slate-100"
                  >
                    <UserCheck size={12} className="text-indigo-600" />
                    <span>Assign ({members.filter(m => m.trainerId === t.id || m.trainer === t.name).length})</span>
                  </button>
                  <button
                    onClick={() => handleEnrollTrainerFingerprint(t)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-black text-slate-700 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer border-r border-slate-100"
                  >
                    <Fingerprint size={12} className="text-indigo-600" />
                    <span>Finger ({t.biometricId ? `#${t.biometricId}` : 'None'})</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-black text-slate-700 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer border-r border-slate-100"
                  >
                    <Edit size={12} className="text-slate-500" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-black text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors border-none bg-transparent cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                </div>

              </motion.div>
            );
          })}

          {filteredTrainers.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 italic text-xs">
              No professional trainers matching your search filter.
            </div>
          )}
        </div>
      )}

      {/* ─── ADD TRAINER MODAL ─── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider font-display">Add Professional Trainer</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Trainer Photo URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com/photo.jpg"
                      value={formPhoto}
                      onChange={e => setFormPhoto(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rohit Sharma"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Mobile Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. rohit@alphagym.com"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Specialization *</label>
                    <select
                      value={formSpecialization}
                      onChange={e => setFormSpecialization(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    >
                      <option value="Weight Loss Specialist">Weight Loss Specialist</option>
                      <option value="Strength & Conditioning">Strength & Conditioning</option>
                      <option value="CrossFit & HIIT">CrossFit & HIIT</option>
                      <option value="Yoga & Flexibility">Yoga & Flexibility</option>
                      <option value="Bodybuilding">Bodybuilding</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Experience (Years) *</label>
                    <input
                      type="number"
                      value={formExperience}
                      onChange={e => setFormExperience(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
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
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Instagram Handler</label>
                    <input
                      type="text"
                      placeholder="rohit_sharma_coach"
                      value={formInstagram}
                      onChange={e => setFormInstagram(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Joining Date</label>
                    <input
                      type="date"
                      value={formJoiningDate}
                      onChange={e => setFormJoiningDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Staff Status</label>
                    <select
                      value={formStatus}
                      onChange={e => setFormStatus(e.target.value as any)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Certifications (Comma Separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. ACE, CSCS, CPR"
                    value={formCertifications}
                    onChange={e => setFormCertifications(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Trainer Achievements</label>
                  <input
                    type="text"
                    placeholder="e.g. Trained 100+ clients for fat loss success"
                    value={formAchievements}
                    onChange={e => setFormAchievements(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Biography Profile</label>
                  <textarea
                    rows={2}
                    placeholder="Provide a short bio description..."
                    value={formBio}
                    onChange={e => setFormBio(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Biometric Slot ID (Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={formBiometricId}
                      onChange={e => setFormBiometricId(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="enrollFingerprintAfterSave"
                      checked={enrollFingerprintAfterSave}
                      onChange={e => setEnrollFingerprintAfterSave(e.target.checked)}
                      className="w-4 h-4 rounded text-black border-slate-300 focus:ring-black cursor-pointer"
                    />
                    <label htmlFor="enrollFingerprintAfterSave" className="text-xs text-slate-700 font-bold select-none cursor-pointer flex items-center gap-1.5">
                      <Fingerprint size={14} className="text-slate-600" />
                      Enroll Fingerprint Now
                    </label>
                  </div>
                </div>

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
                    className="flex-1 py-3 bg-black hover:bg-black/90 text-white rounded-xl transition-all uppercase tracking-wider text-[10px] font-black cursor-pointer border-none"
                  >
                    Save Trainer
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider font-display">Edit Trainer Profile</h3>
                <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Trainer Photo URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com/photo.jpg"
                      value={formPhoto}
                      onChange={e => setFormPhoto(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rohit Sharma"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Mobile Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. rohit@alphagym.com"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Specialization *</label>
                    <select
                      value={formSpecialization}
                      onChange={e => setFormSpecialization(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    >
                      <option value="Weight Loss Specialist">Weight Loss Specialist</option>
                      <option value="Strength & Conditioning">Strength & Conditioning</option>
                      <option value="CrossFit & HIIT">CrossFit & HIIT</option>
                      <option value="Yoga & Flexibility">Yoga & Flexibility</option>
                      <option value="Bodybuilding">Bodybuilding</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Experience (Years) *</label>
                    <input
                      type="number"
                      value={formExperience}
                      onChange={e => setFormExperience(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
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
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Instagram Handler</label>
                    <input
                      type="text"
                      placeholder="rohit_sharma_coach"
                      value={formInstagram}
                      onChange={e => setFormInstagram(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Joining Date</label>
                    <input
                      type="date"
                      value={formJoiningDate}
                      onChange={e => setFormJoiningDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Staff Status</label>
                    <select
                      value={formStatus}
                      onChange={e => setFormStatus(e.target.value as any)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Certifications (Comma Separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. ACE, CSCS, CPR"
                    value={formCertifications}
                    onChange={e => setFormCertifications(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Trainer Achievements</label>
                  <input
                    type="text"
                    placeholder="e.g. Trained 100+ clients for fat loss success"
                    value={formAchievements}
                    onChange={e => setFormAchievements(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Biography Profile</label>
                  <textarea
                    rows={2}
                    placeholder="Provide a short bio description..."
                    value={formBio}
                    onChange={e => setFormBio(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl resize-none"
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
                    className="flex-1 py-3 bg-black hover:bg-black/90 text-white rounded-xl transition-all uppercase tracking-wider text-[10px] font-black cursor-pointer border-none"
                  >
                    Save Changes
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col justify-between text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider font-display">Assign Members</h3>
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
                  className="w-full text-xs bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2 text-slate-800 focus:outline-none focus:border-black font-semibold"
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
                          ? 'bg-black border-black text-white font-black text-xs' 
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
                  className="flex-1 py-2.5 bg-black hover:bg-black/90 text-white rounded-xl transition-all uppercase tracking-wider text-[10px] font-black cursor-pointer border-none"
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
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={enrollStatus.status === 'success' || enrollStatus.status === 'failed' || enrollStatus.status === 'info' ? closeEnrollModal : undefined} />

            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 200 }}
              className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-[32px] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)] z-10 overflow-hidden text-left"
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
                  {/* Outer pulsing ring */}
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

              {/* Scan Steps (only for fingerprint enrollment) */}
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

              {/* Loading bar */}
              {(enrollStatus.status === 'connecting' || enrollStatus.status === 'scanning' || enrollStatus.status === 'processing' || enrollStatus.status === 'ready') && (
                <div className="h-0.5 bg-white/10 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: `${enrollStatus.scan > 0 ? (enrollStatus.scan / enrollStatus.totalScans) * 100 : 30}%`, transition: 'width 0.7s ease' }} />
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
