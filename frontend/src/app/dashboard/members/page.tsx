'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, MoreHorizontal, Phone, Mail,
  RefreshCw, Download, Edit, Snowflake, X, CheckCircle,
  AlertTriangle, XCircle, Camera, Calendar, User, Info, Ban, Key,
  Fingerprint, Scan, Wifi, WifiOff, Trash2, RotateCcw, Shield,
  Activity, Clock, CheckCheck, Cpu, Sparkles, Star, Trophy
} from 'lucide-react';
import { useGymStore } from '@/store';
import { formatDate, daysUntilExpiry, getInitials, getRandomColor, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { collection, doc, onSnapshot, getDocs, query, where, addDoc, setDoc } from 'firebase/firestore';
import { db as fDb, isFirebaseReady } from '@/lib/firebase';
import API from '@/services/api';

const statusCfg = {
  active: { label: 'Active', cls: 'badge-green', dot: '#22C55E' },
  expiring: { label: 'Expiring Soon', cls: 'badge-yellow', dot: '#F59E0B' },
  expired: { label: 'Expired', cls: 'badge-red', dot: '#EF4444' },
  frozen: { label: 'Frozen', cls: 'badge-gray', dot: '#9CA3AF' },
};

const getPlanTheme = (planName: string) => {
  const name = (planName || '').toLowerCase();
  if (name.includes('monthly')) {
    return {
      color: '#3b82f6', // Indigo/Blue
      bg: 'rgba(59,130,246,0.05)',
      border: 'rgba(59,130,246,0.2)',
      textLight: '#eff6ff',
      textDark: '#1e3a8a',
    };
  }
  if (name.includes('quarterly')) {
    return {
      color: '#8b5cf6', // Violet
      bg: 'rgba(139,92,246,0.05)',
      border: 'rgba(139,92,246,0.2)',
      textLight: '#f5f3ff',
      textDark: '#4c1d95',
    };
  }
  if (name.includes('semi')) {
    return {
      color: '#10b981', // Emerald
      bg: 'rgba(16,185,129,0.05)',
      border: 'rgba(16,185,129,0.2)',
      textLight: '#ecfdf5',
      textDark: '#064e3b',
    };
  }
  // Annual or fallback
  return {
    color: '#f59e0b', // Gold/Amber
    bg: 'rgba(245,158,11,0.05)',
    border: 'rgba(245,158,11,0.25)',
    textLight: '#fef3c7',
    textDark: '#78350f',
  };
};


export default function MembersPage() {
  const {
    members, fetchMembers, addMember, updateMember, deleteMember, toggleFreeze, addPayment, resetPassword, sendCredentials
  } = useGymStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeProfile, setActiveProfile] = useState<any | null>(null);
  const [addStep, setAddStep] = useState(1);
  const [newCreatedMember, setNewCreatedMember] = useState<any | null>(null);

  // Form states for new member
  const [newName, setNewName] = useState('');
  const [newReferralCode, setNewReferralCode] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newGender, setNewGender] = useState('Male');
  const [newAge, setNewAge] = useState(25);
  const [newWeight, setNewWeight] = useState(70);
  const [newHeight, setNewHeight] = useState(172);
  const [newPlan, setNewPlan] = useState('Monthly');
  const [newBranch, setNewBranch] = useState('Mohali, Punjab');
  const [newTrainer, setNewTrainer] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPassword, setNewPassword] = useState('1234567');
  const [newBloodGroup, setNewBloodGroup] = useState('O+');
  const [newEmergencyContact, setNewEmergencyContact] = useState('');
  const [newMaritalStatus, setNewMaritalStatus] = useState('Single');
  const [newAnniversaryDate, setNewAnniversaryDate] = useState('');
  const [newBirthdayDate, setNewBirthdayDate] = useState('');
  const [newMedicalConditions, setNewMedicalConditions] = useState('');
  const [newFitnessGoal, setNewFitnessGoal] = useState('General Fitness');
  const [newOccupation, setNewOccupation] = useState('');
  const [newJoiningDate, setNewJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [newBiometricId, setNewBiometricId] = useState('');

  const [trainers, setTrainers] = useState<any[]>([]);
  const [selectedTrainerForView, setSelectedTrainerForView] = useState<any | null>(null);

  useEffect(() => {
    API.get('/trainers')
      .then(res => setTrainers(res.data))
      .catch(err => console.error('Failed to load trainers in members directory:', err));
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // ── Biometric Enrollment State ──────────────────────────────────────────────
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollAction, setEnrollAction] = useState<'fingerprint' | 'face' | 'sync' | 'delete' | null>(null);
  const [enrollDocId, setEnrollDocId] = useState<string | null>(null);
  const [enrollStatus, setEnrollStatus] = useState<{
    status: string; message: string; scan: number; totalScans: number; biometricId?: string;
  }>({ status: 'idle', message: '', scan: 0, totalScans: 3 });
  const [biometricProfile, setBiometricProfile] = useState<any>(null);
  const enrollUnsubRef = useRef<(() => void) | null>(null);

  // Load biometric profile when drawer opens OR during registration wizard Step 3
  useEffect(() => {
    const targetId = activeProfile?.id || (addStep >= 3 ? newCreatedMember?.id : null);
    if (!targetId || !isFirebaseReady || !fDb) { setBiometricProfile(null); return; }
    const profRef = doc(fDb, 'biometric_profiles', targetId);
    const unsub = onSnapshot(profRef, (snap) => {
      setBiometricProfile(snap.exists() ? snap.data() : null);
    });
    return () => unsub();
  }, [activeProfile?.id, newCreatedMember?.id, addStep, isFirebaseReady]);

  // Listen to enrollment doc for live progress
  useEffect(() => {
    if (!enrollDocId || !isFirebaseReady || !fDb) return;
    if (enrollUnsubRef.current) enrollUnsubRef.current();
    const enrollRef = doc(fDb, 'biometric_enrollment', enrollDocId);
    const unsub = onSnapshot(enrollRef, (snap) => {
      if (!snap.exists()) return;
      const d = snap.data()!;
      setEnrollStatus({
        status: d.status || 'pending',
        message: d.message || '',
        scan: d.scan || 0,
        totalScans: d.totalScans || 3,
        biometricId: d.biometricId,
      });
    });
    enrollUnsubRef.current = unsub;
    return () => unsub();
  }, [enrollDocId, isFirebaseReady]);

  const openEnrollModal = (action: 'fingerprint' | 'face' | 'sync' | 'delete') => {
    setEnrollAction(action);
    setEnrollStatus({ status: 'idle', message: 'Waiting to start...', scan: 0, totalScans: 3 });
    setEnrollDocId(null);
    setEnrollModalOpen(true);
  };

  const closeEnrollModal = () => {
    setEnrollModalOpen(false);
    setEnrollAction(null);
    setEnrollDocId(null);
    if (enrollUnsubRef.current) { enrollUnsubRef.current(); enrollUnsubRef.current = null; }
  };

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api';

  // Get Firebase ID token — always fresh from Firebase Auth
  const getToken = async (): Promise<string> => {
    if (typeof window === 'undefined') return '';
    try {
      // 1. Try fresh token from active Firebase session (most reliable)
      const { auth } = await import('@/lib/firebase');
      if (auth.currentUser) {
        return await auth.currentUser.getIdToken();
      }
    } catch (e) {
      console.warn('Firebase token fetch failed, falling back to localStorage', e);
    }
    // 2. Fallback: stored token in alpha_zone_user (may be slightly old)
    try {
      const userJson = localStorage.getItem('alpha_zone_user');
      if (userJson) {
        const user = JSON.parse(userJson);
        return user.token || '';
      }
    } catch (e) { /* ignore */ }
    return '';
  };

  const getActiveTarget = () => {
    return addStep >= 3 ? newCreatedMember : activeProfile;
  };

  const handleEnrollFingerprint = async () => {
    const target = getActiveTarget();
    if (!target) return;
    const biometricId = target.biometricId || newBiometricId || prompt('Enter Biometric ID (device slot number, e.g. 257):', '');
    if (!biometricId) return;

    if (addStep >= 3) {
      setNewBiometricId(biometricId);
    }

    if (addStep < 3) {
      openEnrollModal('fingerprint');
    } else {
      setEnrollAction('fingerprint');
      setEnrollStatus({ status: 'idle', message: 'Waiting to start...', scan: 0, totalScans: 3 });
      setEnrollDocId(null);
    }

    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/devices/biometric/enroll-fingerprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ memberId: target.id, memberName: target.name, biometricId, fingerIndex: 0 }),
      });
      const data = await res.json();
      if (data.enrollmentDocId) {
        setEnrollDocId(data.enrollmentDocId);
        // Update member biometric ID in store
        await updateMember(target.id, { biometricId });
        await fetchMembers();
        const fresh = useGymStore.getState().members.find((m: any) => m.id === target.id);
        if (addStep >= 3) {
          setNewCreatedMember(fresh);
        } else {
          setActiveProfile(fresh);
        }
      } else {
        setEnrollStatus(s => ({ ...s, status: 'failed', message: data.error || 'Failed to queue enrollment' }));
      }
    } catch (e: any) {
      setEnrollStatus(s => ({ ...s, status: 'failed', message: e.message }));
    }
  };

  const handleEnrollFace = () => {
    openEnrollModal('face');
    setEnrollStatus({ status: 'info', message: 'Face enrollment requires device firmware v6.60+. Check device manual for remote face enrollment support.', scan: 0, totalScans: 1 });
  };

  const handleSyncDevice = async () => {
    const target = getActiveTarget();
    if (!target) return;
    const biometricId = target.biometricId || newBiometricId || prompt('Enter Biometric ID to sync:', '');
    if (!biometricId) return;

    if (addStep < 3) {
      openEnrollModal('sync');
    } else {
      setEnrollAction('sync');
      setEnrollStatus({ status: 'idle', message: 'Syncing with hardware...', scan: 0, totalScans: 1 });
      setEnrollDocId(null);
    }

    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/devices/biometric/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ memberId: target.id, memberName: target.name, biometricId }),
      });
      const data = await res.json();
      if (data.enrollmentDocId) setEnrollDocId(data.enrollmentDocId);
    } catch (e: any) {
      setEnrollStatus(s => ({ ...s, status: 'failed', message: e.message }));
    }
  };

  const handleDeleteBiometric = async () => {
    const target = getActiveTarget();
    if (!target) return;
    const bioId = target.biometricId || newBiometricId;
    if (!bioId) { toast.error('No biometric ID linked to this member'); return; }
    if (!confirm(`Delete biometric for ${target.name}? This will remove fingerprint from device.`)) return;

    if (addStep < 3) {
      openEnrollModal('delete');
    } else {
      setEnrollAction('delete');
      setEnrollStatus({ status: 'idle', message: 'Deleting fingerprint from hardware...', scan: 0, totalScans: 1 });
      setEnrollDocId(null);
    }

    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/devices/biometric/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ memberId: target.id, memberName: target.name, biometricId: bioId }),
      });
      const data = await res.json();
      if (data.enrollmentDocId) setEnrollDocId(data.enrollmentDocId);
    } catch (e: any) {
      setEnrollStatus(s => ({ ...s, status: 'failed', message: e.message }));
    }
  };

  const handleImportDeviceUsers = async () => {
    if (addStep >= 3) {
      setEnrollAction('sync');
      setEnrollStatus({ status: 'pending', message: 'Importing device users list...', scan: 0, totalScans: 1 });
    } else {
      openEnrollModal('sync');
    }
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/devices/testing/import-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (addStep >= 3) {
        setEnrollStatus({ status: 'success', message: 'Device users roster import instruction sent successfully!', scan: 1, totalScans: 1 });
      }
      toast.success('Roster import instruction dispatched to device service!');
    } catch (e: any) {
      setEnrollStatus(s => ({ ...s, status: 'failed', message: e.message }));
    }
  };
  // ────────────────────────────────────────────────────────────────────────────



  const handleCreateMember = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newName || !newPhone) {
      toast.error('Name and Phone are required fields');
      return;
    }

    // Auto calculate expiry based on plan
    const daysMap: Record<string, number> = {
      'Monthly': 30, 'Quarterly': 90, 'Semi-Annual': 180, 'Annual Premium': 365
    };
    const expiry = new Date(Date.now() + (daysMap[newPlan] || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      await addMember({
        name: newName,
        phone: newPhone,
        email: newEmail,
        gender: newGender,
        age: Number(newAge),
        weight: Number(newWeight),
        height: Number(newHeight),
        plan: newPlan,
        branch: newBranch,
        trainer: newTrainer,
        address: newAddress,
        password: newPassword,
        bloodGroup: newBloodGroup,
        emergencyContact: newEmergencyContact,
        maritalStatus: newMaritalStatus,
        anniversaryDate: newAnniversaryDate,
        birthdayDate: newBirthdayDate,
        medicalConditions: newMedicalConditions,
        fitnessGoal: newFitnessGoal,
        occupation: newOccupation,
        joinDate: newJoiningDate,
        avatarUrl: newAvatarUrl,
        expiryDate: expiry,
        biometricId: newBiometricId
      });

      // Fetch the newly created member from the store
      await fetchMembers();
      const freshMembers = useGymStore.getState().members;
      const newMember = freshMembers.find((m: any) => m.phone === newPhone);
      
      // Link referral code if provided
      if (newReferralCode && fDb && isFirebaseReady && newMember) {
        const refQuery = query(collection(fDb, 'referrals'), where('friendPhone', '==', newPhone));
        const refSnap = await getDocs(refQuery);
        
        if (!refSnap.empty) {
          // If invite was sent, update it to Registered/Purchased
          const refDoc = refSnap.docs[0];
          await setDoc(doc(fDb, 'referrals', refDoc.id), {
            friendId: newMember.id,
            status: 'Membership Purchased',
            currentStep: 4,
            joinPlan: newPlan,
            referralCode: newReferralCode,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } else {
          // If no invite was sent, create a new referral document starting at step 4
          const referrerMember = freshMembers.find((m: any) => m.name.toUpperCase() + '2026' === newReferralCode.toUpperCase() || (m.memberId && m.memberId.toUpperCase() === newReferralCode.toUpperCase()));
          await addDoc(collection(fDb, 'referrals'), {
            referrerId: referrerMember ? referrerMember.id : 'm1',
            referrerName: referrerMember ? referrerMember.name : 'Pratik',
            referrerPhone: referrerMember ? referrerMember.phone || '' : '',
            friendId: newMember.id,
            friendName: newName,
            friendPhone: newPhone,
            referralCode: newReferralCode,
            status: 'Membership Purchased',
            currentStep: 4,
            joinPlan: newPlan,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      if (newMember) {
        setNewCreatedMember(newMember);
        setAddStep(3); // Advance to Fingerprint enrollment workflow step
        toast.success('Step 1 & 2 Complete: Profile registered & membership assigned!');
      } else {
        toast.success('Member registered successfully!');
        setShowAddModal(false);
      }

      // Clear forms
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewAddress('');
      setNewPassword('1234567');
      setNewEmergencyContact('');
      setNewAnniversaryDate('');
      setNewBirthdayDate('');
      setNewMedicalConditions('');
      setNewOccupation('');
      setNewAvatarUrl('');
      setNewBiometricId('');
      setNewReferralCode('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add member');
    }
  };


  const handleRenew = async (member: any) => {
    const renewAmountMap: Record<string, number> = {
      'Monthly': 2500, 'Quarterly': 6500, 'Semi-Annual': 11500, 'Annual Premium': 18000
    };
    const amt = renewAmountMap[member.plan] || 2500;
    
    try {
      await addPayment({
        memberId: member.id,
        amount: amt,
        plan: member.plan,
        method: 'UPI'
      });
      toast.success(`Membership renewed for ${member.name}! extended expiry.`);
      if (activeProfile?.id === member.id) {
        // refresh selected profile drawer
        const updatedMembers = useGymStore.getState().members;
        const fresh = updatedMembers.find(m => m.id === member.id);
        setActiveProfile(fresh || null);
      }
    } catch (err) {
      toast.error('Failed to renew plan');
    }
  };

  const handleToggleFreeze = async (member: any) => {
    try {
      await toggleFreeze(member.id);
      toast.success(`Membership status updated for ${member.name}`);
      // update active drawer
      const updatedMembers = useGymStore.getState().members;
      const fresh = updatedMembers.find(m => m.id === member.id);
      setActiveProfile(fresh || null);
    } catch (err) {
      toast.error('Failed to toggle freeze status');
    }
  };

  const handleDeleteMember = async (member: any) => {
    if (confirm(`Are you sure you want to delete member ${member.name}? This will also delete their fingerprint from all biometric terminals.`)) {
      try {
        await deleteMember(member.id);
        toast.success(`Deleted member ${member.name} and queued biometric cleanup.`);
        setActiveProfile(null);
      } catch (err) {
        toast.error('Failed to delete member');
      }
    }
  };


  const handleResetPassword = async (member: any) => {
    const newPass = prompt(`Enter new password for ${member.name}:`, '1234567');
    if (newPass === null) return;
    if (newPass.trim().length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      await resetPassword(member.id, newPass.trim());
      toast.success(`Password reset successfully for ${member.name}!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    }
  };

  const handleSendCredentials = async (member: any) => {
    try {
      await sendCredentials(member.id);
      toast.success(`Credentials dispatch triggered for ${member.name}!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send credentials');
    }
  };

  const filtered = members.filter(m => {
    const ms = m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search);
    const st = statusFilter === 'all' || m.status === statusFilter;
    return ms && st;
  });

  const counts = {
    all: members.length,
    active: members.filter(m => m.status === 'active').length,
    expiring: members.filter(m => m.status === 'expiring').length,
    expired: members.filter(m => m.status === 'expired').length,
    frozen: members.filter(m => m.status === 'frozen').length,
  };

  const handleExportCSV = () => {
    if (members.length === 0) {
      toast.error('No members to export');
      return;
    }
    const HEADERS = ['ID', 'Name', 'Phone', 'Email', 'Gender', 'Age', 'Plan', 'Branch', 'Trainer', 'Status', 'Join Date', 'Expiry Date', 'Address'];
    const escape = (val: any) => String(val ?? '').replace(/"/g, '""');
    const rows = members.map((m: any) =>
      [
        escape(m.id),
        escape(m.name),
        escape(m.phone),
        escape(m.email),
        escape(m.gender),
        escape(m.age),
        escape(m.plan),
        escape(m.branch || 'Mohali, Punjab'),
        escape(m.trainer),
        escape(m.status),
        escape(m.joinDate ? new Date(m.joinDate).toLocaleDateString('en-IN') : ''),
        escape(m.expiryDate ? new Date(m.expiryDate).toLocaleDateString('en-IN') : ''),
        escape((m.address || '').replace(/,/g, ';')),
      ].map(v => String('"') + v + String('"')).join(',')
    );
    const csv = [HEADERS.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'alpha-zone-members-' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported ' + members.length + ' members to CSV!');
  };

  return (
    <div className="space-y-6 pb-12 relative">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border/60 pb-5">
        <div>
          <h1 className="text-3xl font-black text-brand-text-primary tracking-tight font-display">Members Directory</h1>
          <p className="text-xs text-brand-text-secondary mt-0.5">
            {counts.all} members total · {counts.active} active · {counts.expiring} expiring · {counts.frozen} frozen
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportCSV}
            className="btn-cyber-outline text-xs py-2"
          >
            <Download size={13} /> Export csv
          </button>
          <button 
            className="btn-cyber-cyan text-xs py-2 px-5" 
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={14} className="text-white" /> Add Member
          </button>
        </div>
      </div>

      {/* Roster Filters Row */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([key, cnt]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold capitalize transition-all cursor-pointer ${
              statusFilter === key
                ? 'text-slate-900 font-black shadow-md'
                : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 shadow-sm'
            }`}
            style={statusFilter === key ? { background: '#d4ff00', border: '1.5px solid #b8e000' } : {}}
          >
            {key} ({cnt})
          </button>
        ))}
      </div>


      {/* Search Bar + Options */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" />
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone number, or active plan..." 
            className="glass-input pl-9 py-2.5 text-xs" 
          />
        </div>

        <select className="glass-input py-2.5 text-xs" style={{ maxWidth: 160 }}>
          <option>All Branches</option>
          <option>Mohali, Punjab</option>
        </select>

        <div className="flex rounded-xl overflow-hidden border border-brand-border bg-brand-bg-card/40">
          {(['grid', 'table'] as const).map(m => (
            <button 
              key={m} 
              onClick={() => setViewMode(m)}
              className={`px-4 py-2 text-xs capitalize font-semibold transition-all cursor-pointer ${
                viewMode === m 
                  ? 'bg-brand-cyan text-slate-950 font-extrabold shadow-sm' 
                  : 'text-brand-text-muted hover:text-brand-text-secondary'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Add Member Modal — Premium 5-Step Dark Wizard ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="add-member-modal">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-lg" onClick={() => {
            setShowAddModal(false);
            setAddStep(1);
            setNewCreatedMember(null);
          }} />
          <div
            className="relative w-full max-w-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-white/10 rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] z-10 overflow-hidden flex flex-col"
            style={{ maxHeight: '92vh' }}
          >

            {/* Top gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-cyan via-[#d4ff00] to-brand-purple" />

            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-white/8">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-1">Alpha Zone CRM</div>
                <h2 className="text-2xl font-black text-white leading-none">Register New Athlete</h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  {addStep === 1 ? "Step 1: Fill out the member's personal identity profile" :
                   addStep === 2 ? "Step 2: Assign membership plan and training coach" :
                   addStep === 3 ? "Step 3: Scan fingerprint on ESSL K90 Pro device" :
                   addStep === 4 ? "Step 4: Configure credentials for the athlete app" :
                   "Step 5: Review summary and activate contract"}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setAddStep(1);
                  setNewCreatedMember(null);
                }} 
                className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/8 hover:bg-white/14 text-slate-400 hover:text-white transition-all cursor-pointer border-none"
              >
                <X size={16} />
              </button>
            </div>

            {/* Step Progress Indicator */}
            <div className="flex justify-between items-center px-8 py-3 bg-slate-950/40 border-b border-white/5 overflow-x-auto gap-2">
              {[
                { step: 1, label: 'Profile' },
                { step: 2, label: 'Plan & Coach' },
                { step: 3, label: 'Fingerprint' },
                { step: 4, label: 'App Login' },
                { step: 5, label: 'Activate' }
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border transition-all ${
                    addStep === s.step 
                      ? 'bg-[#d4ff00] border-[#d4ff00] text-black shadow-[0_0_10px_rgba(212,255,0,0.3)]' 
                      : addStep > s.step 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : 'bg-white/5 border-white/10 text-slate-500'
                  }`}>
                    {addStep > s.step ? '✓' : s.step}
                  </div>
                  <span className={`text-[9.5px] font-bold uppercase tracking-wider ${
                    addStep === s.step ? 'text-[#d4ff00]' : addStep > s.step ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    {s.label}
                  </span>
                  {s.step < 5 && <div className="h-px w-4 bg-white/10 mx-1" />}
                </div>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(92vh - 220px)' }}>
              {addStep === 1 && (
                <div className="px-8 py-6 space-y-6">
                  {/* Avatar + Name row */}
                  <div className="flex items-start gap-5">
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-2xl bg-white/5 border-2 border-dashed border-white/15 flex flex-col items-center justify-center cursor-pointer hover:border-brand-cyan/40 transition-all group relative overflow-hidden">
                        {newAvatarUrl ? (
                          <>
                            <img src={newAvatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Camera size={14} className="text-white" />
                            </div>
                          </>
                        ) : (
                          <>
                            <Camera size={18} className="text-slate-500 group-hover:text-brand-cyan transition-colors" />
                            <span className="text-[8px] text-slate-500 mt-1 font-bold">PHOTO</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name *</label>
                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Rahul Sharma" className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-cyan/50 focus:bg-white/8 transition-all" required />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Photo URL</label>
                        <input type="text" value={newAvatarUrl} onChange={e => setNewAvatarUrl(e.target.value)} placeholder="https://..." className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-cyan/50 transition-all" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Password *</label>
                        <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="1234567" className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-cyan/50 transition-all" required />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Phone Number *</label>
                      <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="9876543210" className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-cyan/50 transition-all" required />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                      <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="rahul@email.com" className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-cyan/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Gender</label>
                      <select value={newGender} onChange={e => setNewGender(e.target.value)} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan/50 transition-all">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Age</label>
                      <input type="number" value={newAge} onChange={e => setNewAge(Number(e.target.value))} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Date of Birth</label>
                      <input type="date" value={newBirthdayDate} onChange={e => setNewBirthdayDate(e.target.value)} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Blood Group</label>
                      <select value={newBloodGroup} onChange={e => setNewBloodGroup(e.target.value)} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan/50 transition-all">
                        {['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(g => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Referral Code</label>
                      <input type="text" value={newReferralCode} onChange={e => setNewReferralCode(e.target.value)} placeholder="e.g. PRATIK2026" className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Weight (kg)</label>
                      <input type="number" value={newWeight} onChange={e => setNewWeight(Number(e.target.value))} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Height (cm)</label>
                      <input type="number" value={newHeight} onChange={e => setNewHeight(Number(e.target.value))} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Marital Status</label>
                      <select value={newMaritalStatus} onChange={e => setNewMaritalStatus(e.target.value)} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan/50 transition-all">
                        <option>Single</option><option>Married</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Emergency Contact</label>
                      <input type="text" value={newEmergencyContact} onChange={e => setNewEmergencyContact(e.target.value)} placeholder="Name & 9876543210" className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-cyan/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Occupation</label>
                      <input type="text" value={newOccupation} onChange={e => setNewOccupation(e.target.value)} placeholder="Engineer, Student..." className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-cyan/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Anniversary Date</label>
                      <input type="date" value={newAnniversaryDate} onChange={e => setNewAnniversaryDate(e.target.value)} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan/50 transition-all" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Residential Address</label>
                      <input type="text" value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Phase 7, Mohali, Punjab 160059" className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-cyan/50 transition-all" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Medical Conditions</label>
                      <textarea value={newMedicalConditions} onChange={e => setNewMedicalConditions(e.target.value)} placeholder="Asthma, Hypertension, or None" className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-cyan/50 transition-all h-14 resize-none" />
                    </div>
                  </div>
                </div>
              )}

              {addStep === 2 && (
                <div className="px-8 py-6 space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Membership Plan</label>
                      <select value={newPlan} onChange={e => setNewPlan(e.target.value)} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4ff00]/50 transition-all">
                        <option>Monthly</option>
                        <option>Quarterly</option>
                        <option>Semi-Annual</option>
                        <option>Annual Premium</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Joining Date</label>
                      <input type="date" value={newJoiningDate} onChange={e => setNewJoiningDate(e.target.value)} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4ff00]/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Branch</label>
                      <select value={newBranch} onChange={e => setNewBranch(e.target.value)} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4ff00]/50 transition-all">
                        <option>Mohali, Punjab</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Personal Trainer</label>
                      <select value={newTrainer} onChange={e => setNewTrainer(e.target.value)} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4ff00]/50 transition-all">
                        <option value="">No PT Assigned</option>
                        {trainers.map((t: any) => (
                          <option key={t.id} value={t.name}>{t.name} ({t.specialization})</option>
                        ))}
                        {trainers.length === 0 && (
                          <>
                            <option>Karan Verma</option>
                            <option>Sneha Kapoor</option>
                            <option>Dev Rana</option>
                            <option>Riya Menon</option>
                            <option>Aakash Sharma</option>
                            <option>Rohit Sharma</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fitness Goal</label>
                      <select value={newFitnessGoal} onChange={e => setNewFitnessGoal(e.target.value)} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4ff00]/50 transition-all">
                        <option>General Fitness</option>
                        <option>Lose Weight</option>
                        <option>Gain Muscle</option>
                        <option>Build Strength</option>
                        <option>Body Toning</option>
                      </select>
                    </div>
                    
                    {/* Recommendation Card */}
                    <div className="col-span-3 p-3.5 rounded-2xl bg-indigo-950/45 border border-indigo-500/20 text-left flex items-center justify-between gap-3 text-white">
                      <div className="flex gap-2.5 items-center">
                        <Sparkles size={16} className="text-indigo-400 shrink-0 animate-pulse" />
                        <div>
                          <span className="text-[9px] font-black uppercase text-indigo-400 block tracking-wider">AI Smart Recommendation</span>
                          <p className="text-[10px] font-bold">Suggested Trainer: <span className="text-amber-400">
                            {(() => {
                              const g = newFitnessGoal.toLowerCase();
                              if (g.includes('weight') || g.includes('lose') || g.includes('ton')) return 'Rohit Sharma (Weight Loss Specialist)';
                              if (g.includes('muscle') || g.includes('gain')) return 'Aakash Sharma (Bodybuilding)';
                              if (g.includes('strength')) return 'Karan Verma (Strength & Conditioning)';
                              return 'Sneha Kapoor (Yoga & Flexibility)';
                            })()}
                          </span></p>
                          <p className="text-[8.5px] text-slate-400 mt-0.5 font-medium">Automatically suggest specialized trainer based on client physical parameters and goal.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const g = newFitnessGoal.toLowerCase();
                          let tName = 'Sneha Kapoor';
                          if (g.includes('weight') || g.includes('lose') || g.includes('ton')) tName = 'Rohit Sharma';
                          else if (g.includes('muscle') || g.includes('gain')) tName = 'Aakash Sharma';
                          else if (g.includes('strength')) tName = 'Karan Verma';
                          setNewTrainer(tName);
                          toast.success(`Recommended trainer ${tName} applied!`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#d4ff00] hover:brightness-110 text-[9px] font-black uppercase tracking-wider text-black border-none cursor-pointer shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {addStep === 3 && (
                <div className="px-8 py-6 space-y-6 text-center">
                  <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-2xl text-emerald-400 text-xs font-bold mb-2 font-display">
                    <User size={13} />
                    Configuring Athlete: {newCreatedMember?.name}
                  </div>

                  {/* Device slot configuration card */}
                  <div className="max-w-md mx-auto bg-white/4 border border-white/8 rounded-2xl p-4 text-left grid grid-cols-3 gap-3 items-end">
                    <div className="col-span-2">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-display">
                        Biometric ID (ESSL Device Slot)
                      </label>
                      <input
                        type="text"
                        value={newBiometricId}
                        onChange={e => setNewBiometricId(e.target.value)}
                        placeholder="Assign device slot (e.g. 258)"
                        className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleEnrollFingerprint}
                      className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer"
                    >
                      Set ID & Start
                    </button>
                  </div>

                  {/* Animated Scan Ring + Icon */}
                  <div className="flex items-center justify-center py-4">
                    <div className="relative w-36 h-36">
                      {(enrollStatus.status === 'scanning' || enrollStatus.status === 'ready' || enrollStatus.status === 'connecting') && (
                        <>
                          <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" />
                          <div className="absolute inset-2 rounded-full border border-blue-500/20 animate-pulse" />
                        </>
                      )}
                      {biometricProfile?.fingerprintStatus === 'enrolled' && (
                        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/40 animate-pulse" />
                      )}

                      {/* Progress circle */}
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                        <circle
                          cx="60" cy="60" r="54"
                          fill="none"
                          stroke={biometricProfile?.fingerprintStatus === 'enrolled' ? '#10b981' : enrollStatus.status === 'failed' ? '#ef4444' : '#3b82f6'}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 54}`}
                          strokeDashoffset={`${2 * Math.PI * 54 * (1 - ((biometricProfile?.fingerprintStatus === 'enrolled' ? 3 : enrollStatus.scan) / 3))}`}
                          className="transition-all duration-700"
                        />
                      </svg>

                      {/* Center Icon */}
                      <div className={`absolute inset-0 flex items-center justify-center rounded-full ${
                        biometricProfile?.fingerprintStatus === 'enrolled' ? 'bg-emerald-500/20' :
                        enrollStatus.status === 'failed' ? 'bg-red-500/20' : 'bg-white/5'
                      }`}>
                        {biometricProfile?.fingerprintStatus === 'enrolled' ? (
                          <CheckCheck size={42} className="text-emerald-400" />
                        ) : enrollStatus.status === 'failed' ? (
                          <XCircle size={42} className="text-red-400" />
                        ) : (
                          <Fingerprint size={42} className={`${enrollStatus.status === 'scanning' ? 'text-blue-400 animate-pulse' : 'text-slate-400'}`} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scan step indicators */}
                  <div className="flex justify-center gap-3">
                    {[1, 2, 3].map((step) => {
                      const completed = (biometricProfile?.fingerprintStatus === 'enrolled') || (enrollStatus.scan >= step);
                      const active = enrollStatus.scan === step - 1 && enrollStatus.status === 'scanning';
                      return (
                        <div key={step} className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${completed ? 'opacity-100' : 'opacity-35'}`}>
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black border-2 transition-all duration-500 ${
                            biometricProfile?.fingerprintStatus === 'enrolled' || enrollStatus.scan >= step
                              ? 'bg-emerald-500 border-emerald-400 text-white'
                              : active
                              ? 'bg-blue-500/20 border-blue-500 text-blue-400 animate-pulse'
                              : 'bg-white/5 border-white/10 text-slate-500'
                          }`}>
                            {biometricProfile?.fingerprintStatus === 'enrolled' || enrollStatus.scan >= step ? '✓' : step}
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                            Scan {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Status Banner */}
                  <div className={`max-w-md mx-auto p-3.5 rounded-2xl text-xs font-semibold ${
                    biometricProfile?.fingerprintStatus === 'enrolled' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                    enrollStatus.status === 'failed' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                    'bg-slate-900 border border-white/5 text-slate-300'
                  }`}>
                    {biometricProfile?.fingerprintStatus === 'enrolled'
                      ? '✓ Fingerprint template enrolled successfully on Cloud and Device!'
                      : enrollStatus.message || 'Ready for hardware enrollment slot link.'}
                  </div>

                  {/* Device Control Actions Panel */}
                  <div className="max-w-md mx-auto grid grid-cols-4 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleEnrollFingerprint}
                      className="py-2 px-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <Fingerprint size={11} className="inline mr-1" /> Re-Enroll
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteBiometric}
                      className="py-2 px-1 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <Trash2 size={11} className="inline mr-1" /> Delete Bio
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncDevice}
                      className="py-2 px-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <Wifi size={11} className="inline mr-1" /> Sync Device
                    </button>
                    <button
                      type="button"
                      onClick={handleImportDeviceUsers}
                      className="py-2 px-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <Download size={11} className="inline mr-1" /> Import Users
                    </button>
                  </div>

                  {/* Diagnostic status bar */}
                  <div className="flex items-center justify-center gap-2 bg-white/4 border border-white/8 rounded-2xl px-4 py-2.5 max-w-sm mx-auto">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] text-slate-400 font-bold">ESSL K90 Pro · 192.168.18.11:4370 · Hardware Ready</span>
                  </div>
                </div>
              )}

              {addStep === 4 && (
                <div className="px-8 py-8 space-y-6 max-w-md mx-auto text-left">
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-brand-purple/15 border border-brand-purple/30 flex items-center justify-center text-brand-purple mx-auto mb-3">
                      <Key size={22} />
                    </div>
                    <h3 className="text-base font-black text-white font-display">Generate App Login</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Configure mobile app access for {newCreatedMember?.name}</p>
                  </div>

                  <div className="space-y-4 bg-white/4 border border-white/8 rounded-2xl p-5">
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-display">Username / Login ID (Phone Number)</label>
                      <input
                        type="text"
                        value={newPhone}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-400 font-mono focus:outline-none cursor-not-allowed"
                        disabled
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest font-display">Login Password</label>
                        <button
                          type="button"
                          onClick={() => {
                            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                            let pass = '';
                            for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                            setNewPassword(pass);
                            toast.success(`Generated password: ${pass}`);
                          }}
                          className="text-[8px] text-[#d4ff00] font-black uppercase hover:underline cursor-pointer border-none bg-transparent"
                        >
                          Generate Random Password
                        </button>
                      </div>
                      <input
                        type="text"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 focus:border-brand-purple/50 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Dispatch Credentials actions */}
                  <button
                    type="button"
                    onClick={() => {
                      const msg = `Welcome ${newCreatedMember?.name || 'Athlete'} to Alpha Gym Zone! Your app login credentials are:\nUsername: ${newPhone}\nPassword: ${newPassword}\nDownload the app to track your workouts, diet, and Alpha Score!`;
                      window.open(`https://wa.me/91${newPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                      toast.success('WhatsApp dispatch window opened!');
                    }}
                    className="w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-none shadow-md shadow-emerald-600/10"
                  >
                    <Phone size={14} className="text-white" />
                    Send Login via WhatsApp
                  </button>
                </div>
              )}

              {addStep === 5 && (
                <div className="px-8 py-8 space-y-6 max-w-md mx-auto text-center animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4 animate-bounce">
                    <CheckCheck size={32} />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white font-display">Contract Ready for Activation!</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Review the checklist summary below before completing enrollment.</p>
                  </div>

                  {/* Checklist Summary */}
                  <div className="bg-white/4 border border-white/8 rounded-2xl p-5 text-left space-y-3 font-mono text-xs text-slate-300">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-slate-500 uppercase text-[9px] font-bold">1. Athlete Profile</span>
                      <span className="text-white font-bold">{newCreatedMember?.name}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-slate-500 uppercase text-[9px] font-bold">2. Membership Package</span>
                      <span className="text-brand-cyan font-bold">{newCreatedMember?.plan}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-slate-500 uppercase text-[9px] font-bold">3. Fingerprint Synced</span>
                      <span className={`${biometricProfile?.fingerprintStatus === 'enrolled' ? 'text-emerald-400' : 'text-amber-500'} font-bold`}>
                        {biometricProfile?.fingerprintStatus === 'enrolled' ? `Active (Slot ${newBiometricId})` : 'Not Configured (Skipped)'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 uppercase text-[9px] font-bold">4. Mobile App Login</span>
                      <span className="text-brand-purple font-bold">Phone: {newCreatedMember?.phone}</span>
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-500 leading-relaxed">Clicking Activate will trigger local check-in sound notification alerts and log the transaction audit entry into the CRM.</p>
                </div>
              )}
            </div>

            {/* Footer action bar */}
            <div className="px-8 py-4 border-t border-white/8 flex items-center justify-between gap-4 bg-slate-950/60 shrink-0">
              {addStep === 1 ? (
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-white/6 hover:bg-white/10 text-slate-300 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none"
                >
                  Cancel
                </button>
              ) : addStep === 2 || addStep === 3 || addStep === 4 ? (
                <button
                  type="button"
                  onClick={() => setAddStep(s => s - 1)}
                  className="px-6 py-2.5 rounded-xl bg-white/6 hover:bg-white/10 text-slate-300 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                {addStep === 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!newName || !newPhone) {
                        toast.error("Name and Phone Number are required fields!");
                        return;
                      }
                      setAddStep(2);
                    }}
                    className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-brand-cyan to-blue-500 hover:brightness-110 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none"
                  >
                    Next: Membership Plan
                  </button>
                )}

                {addStep === 2 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCreateMember()}
                      className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-[#d4ff00] to-emerald-500 hover:brightness-110 text-slate-955 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none"
                    >
                      Save Profile & Continue
                    </button>
                  </>
                )}

                {addStep === 3 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setAddStep(4)}
                      className="px-6 py-2.5 rounded-xl bg-white/6 hover:bg-white/10 text-slate-300 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none"
                    >
                      Skip Biometrics
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddStep(4)}
                      className="px-8 py-2.5 rounded-xl bg-[#d4ff00] text-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer hover:brightness-105 border-none"
                    >
                      Next: App Login
                    </button>
                  </>
                )}

                {addStep === 4 && (
                  <button
                    type="button"
                    onClick={async () => {
                      // Save updated password if any
                      if (newCreatedMember) {
                        await updateMember(newCreatedMember.id, { password: newPassword });
                        await fetchMembers();
                        const fresh = useGymStore.getState().members.find((m: any) => m.id === newCreatedMember.id);
                        setNewCreatedMember(fresh);
                      }
                      setAddStep(5);
                    }}
                    className="px-8 py-2.5 rounded-xl bg-brand-purple text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer hover:brightness-105 border-none"
                  >
                    Next: Activate Account
                  </button>
                )}

                {addStep === 5 && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (newCreatedMember) {
                        await updateMember(newCreatedMember.id, { status: 'active' });
                        await fetchMembers();
                      }
                      // Play premium double chime!
                      const playChime = () => {
                        try {
                          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                          if (!AudioContext) return;
                          const ctx = new AudioContext();
                          const osc = ctx.createOscillator();
                          const gain = ctx.createGain();
                          osc.connect(gain);
                          gain.connect(ctx.destination);
                          osc.type = 'sine';
                          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                          gain.gain.setValueAtTime(0, ctx.currentTime);
                          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
                          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                          
                          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
                          gain.gain.setValueAtTime(0, ctx.currentTime + 0.15);
                          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2);
                          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                          
                          osc.start(ctx.currentTime);
                          osc.stop(ctx.currentTime + 0.6);
                        } catch (e) {
                          console.error('Audio chime failed:', e);
                        }
                      };
                      playChime();
                      
                      toast.success(`Success! Member ${newCreatedMember?.name} is now fully active!`);
                      setShowAddModal(false);
                      setAddStep(1);
                      setNewCreatedMember(null);
                    }}
                    className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:brightness-110 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none shadow-lg shadow-emerald-500/20"
                  >
                    Activate Member Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Grid View ─── */}

      {viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((m, i) => {
            const cfg = statusCfg[m.status as keyof typeof statusCfg] || statusCfg.active;
            const days = daysUntilExpiry(m.expiryDate);
            const avatarColor = getRandomColor(m.name);
            const isActive = m.status === 'active';
            const isFrozen = m.status === 'frozen';
            const isExpired = days <= 0;
            const isExpiring = days > 0 && days <= 7;
            const planTheme = getPlanTheme(m.plan);
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, type: 'spring', damping: 22 }}
                className="relative bg-white rounded-[22px] overflow-hidden flex flex-col cursor-default"
                style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}
              >
                {/* Status accent bar — left edge */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-full" style={{
                  background: isExpired ? '#EF4444' : isFrozen ? '#94A3B8' : isExpiring ? '#F59E0B' : planTheme.color
                }} />

                {/* Top section */}
                <div className="px-5 pt-5 pb-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shadow-sm flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${avatarColor}22 0%, ${avatarColor}40 100%)`, color: avatarColor, border: `1.5px solid ${avatarColor}30` }}
                      >
                        {m.avatarUrl ? (
                          <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover rounded-2xl" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : getInitials(m.name)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-[15px] text-slate-900 truncate leading-tight">{m.name}</h4>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                          <Phone size={8} className="text-slate-300" />
                          {m.phone}
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide ${
                      isExpired ? 'bg-red-50 text-red-700 border border-red-200' :
                      isFrozen ? 'bg-slate-50 text-slate-600 border border-slate-200' :
                      isExpiring ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.dot }} />
                      {cfg.label}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-1.5 mb-4">
                    {[
                      { l: 'Plan', v: m.plan?.split(' ')[0] || '—', color: planTheme.color },
                      { l: 'Streak', v: `${m.streak ?? 0}🔥`, color: '#f97316' },
                      { l: 'Check-ins', v: m.attendanceCount ?? 0, color: '#06b6d4' },
                      { l: 'BMI', v: m.bmi || '—', color: '#10b981' },
                    ].map((s, idx) => (
                      <div key={idx} className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[12px] font-black text-slate-800">{s.v}</div>
                        <div className="text-[8px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Biometric linked badge */}
                  {m.biometricId && (
                    <div className="flex items-center gap-1.5 mb-3 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                      <Fingerprint size={10} className="text-emerald-500" />
                      <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Biometric ID: {m.biometricId}</span>
                    </div>
                  )}

                  {/* Expiry bar */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] text-slate-400 font-semibold">Expires {formatDate(m.expiryDate)}</span>
                      <span className={`text-[9px] font-black ${isExpired ? 'text-red-500' : isExpiring ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {isExpired ? 'Expired' : `${days}d left`}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(3, Math.min(100, (days / 120) * 100))}%`,
                          background: isExpired ? '#EF4444' : isExpiring ? '#F59E0B' : planTheme.color
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom action row */}
                <div className="flex border-t border-slate-100 mt-auto">
                  <a
                    href={`tel:${m.phone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    <Phone size={12} className="text-slate-400" />
                    Call
                  </a>
                  <div className="w-px bg-slate-100" />
                  <button
                    onClick={() => setActiveProfile(m)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-black cursor-pointer border-none bg-transparent transition-colors"
                    style={{ color: planTheme.color }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${planTheme.color}08`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    <User size={12} style={{ color: planTheme.color }} />
                    Profile
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (

        /* Table View */
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Plan</th>
                  <th>Branch</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Attendance %</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const cfg = statusCfg[m.status as keyof typeof statusCfg] || statusCfg.active;
                  const days = daysUntilExpiry(m.expiryDate);
                  const avatarColor = getRandomColor(m.name);
                  const planTheme = getPlanTheme(m.plan);
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="flex items-center gap-3">
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
                          <div>
                            <div className="font-bold text-xs text-brand-text-primary">{m.name}</div>
                            <div className="text-[10px] text-brand-text-secondary">{m.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs">{m.plan}</td>
                      <td className="text-xs">{m.branch}</td>
                      <td className="text-xs">{formatDate(m.expiryDate)}</td>
                      <td>
                        <span className={`font-bold text-xs ${days > 30 ? 'text-brand-success' : days > 0 ? 'text-brand-warning' : 'text-brand-danger'}`}>
                          {days > 0 ? `${days}d` : 'Expired'}
                        </span>
                      </td>
                      <td className="text-xs font-bold">{m.attendancePercent || '80'}%</td>
                      <td>
                        <span className={cfg.cls}>
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.dot }} />
                          {cfg.label}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => setActiveProfile(m)}
                          className="px-3 py-1.5 rounded-xl transition-all text-xs font-bold cursor-pointer border-none"
                          style={{
                            background: `${planTheme.color}12`,
                            color: planTheme.color,
                            border: `1.5px solid ${planTheme.color}25`,
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = `${planTheme.color}22`;
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = `${planTheme.color}12`;
                          }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Drawer Detail Profile view ─── */}
      <AnimatePresence>
        {activeProfile && (
          <>
            {/* Click catcher overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveProfile(null)}
              className="fixed inset-0 bg-black z-40"
            />
            {/* Floating Drawer panel */}
            {(() => {
              const planTheme = getPlanTheme(activeProfile.plan);
              return (
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 24, stiffness: 180 }}
                  className="fixed top-0 right-0 bottom-0 w-full max-w-[420px] bg-brand-bg-card border-l border-brand-border p-6 z-50 flex flex-col justify-between overflow-y-auto"
                  style={{ boxShadow: '-10px 0 50px rgba(15,23,42,0.1)' }}
                >
                  <div className="space-y-6">
                    
                    {/* Header Profile Info */}
                    <div className="flex items-center justify-between pb-4 border-b border-brand-border">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-11 h-11 rounded-2xl text-white flex items-center justify-center font-black text-sm"
                          style={{ background: `linear-gradient(135deg, ${planTheme.color} 0%, ${planTheme.color}dd 100%)` }}
                        >
                          {getInitials(activeProfile.name)}
                        </div>
                        <div>
                          <h3 className="font-black text-base text-brand-text-primary leading-tight font-display">{activeProfile.name}</h3>
                          <p className="text-[10px] text-brand-text-secondary tracking-wide uppercase font-bold mt-0.5">{activeProfile.phone}</p>
                        </div>
                      </div>
                      <button onClick={() => setActiveProfile(null)} className="p-2 rounded-xl hover:bg-slate-100">
                        <X size={16} className="text-brand-text-muted" />
                      </button>
                    </div>

                    {/* Status Section */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-brand-bg border border-brand-border">
                      <div className="text-xs text-brand-text-secondary">Cloud Biometric Status</div>
                      <span className={statusCfg[activeProfile.status as keyof typeof statusCfg]?.cls || 'badge-green'}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusCfg[activeProfile.status as keyof typeof statusCfg]?.dot || '#22C55E' }} />
                        {statusCfg[activeProfile.status as keyof typeof statusCfg]?.label || 'Active'}
                      </span>
                    </div>

                    {/* Assigned Trainer Section */}
                    {(() => {
                      const trainerName = activeProfile.trainer;
                      const matchingTrainer = trainers.find((t: any) => t.name === trainerName) || {
                        name: trainerName || 'No PT Assigned',
                        specialization: 'Fitness Coach',
                        experience: 5,
                        rating: 4.9,
                        photo: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=150',
                        bio: 'Certified fitness professional coaching clients for strength and performance.'
                      };

                      if (!trainerName) {
                        return (
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Assigned PT Instructor</span>
                            <div className="text-xs font-black text-slate-700">No Personal Trainer Assigned</div>
                            <p className="text-[9px] text-slate-400 font-medium">Manage assignments in the trainers roster page.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 text-left space-y-3 shadow-sm">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Assigned PT Instructor</span>
                          
                          <div className="flex gap-3 items-center">
                            <img 
                              src={matchingTrainer.photo || 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=150'} 
                              alt={matchingTrainer.name} 
                              className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0" 
                            />
                            <div>
                              <h4 className="text-xs font-black text-slate-900 leading-tight">{matchingTrainer.name}</h4>
                              <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider mt-0.5">{matchingTrainer.specialization}</p>
                              <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5 font-semibold">
                                <span className="flex items-center gap-0.5 text-amber-500">⭐ {matchingTrainer.rating || '4.9'}</span>
                                <span>·</span>
                                <span>{matchingTrainer.experience || 6} Yrs Exp</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTrainerForView(matchingTrainer);
                            }}
                            className="w-full py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-[9px] font-black uppercase tracking-wider text-center transition-all cursor-pointer bg-white text-slate-700 font-semibold"
                          >
                            View Profile
                          </button>
                        </div>
                      );
                    })()}

                    {/* Details list */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest block font-display" style={{ color: planTheme.color }}>Contract Parameters</h4>
                      
                      <div className="grid grid-cols-2 gap-3.5">
                        {[
                          { l: 'Assigned Plan', v: activeProfile.plan },
                          { l: 'Branch Location', v: activeProfile.branch },
                          { l: 'Expiration Date', v: formatDate(activeProfile.expiryDate) },
                          { l: 'PT Instructor', v: activeProfile.trainer || 'No Coach' },
                          { l: 'Joining Date', v: formatDate(activeProfile.joinDate) },
                          { l: 'Biometric ID (ESSL)', v: activeProfile.biometricId || 'Not Configured' },
                          { l: 'Days Left', v: daysUntilExpiry(activeProfile.expiryDate) > 0 ? `${daysUntilExpiry(activeProfile.expiryDate)} Days` : 'Expired' }
                        ].map((det, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 border border-brand-border/40 rounded-xl">
                            <div className="text-xs font-bold text-brand-text-primary truncate">{det.v}</div>
                            <div className="text-[10px] text-brand-text-muted font-medium mt-0.5">{det.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Fitness metrics */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest block font-display" style={{ color: planTheme.color }}>Physical Parameters</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Weight', val: `${activeProfile.weight || 70}kg` },
                          { label: 'Height', val: `${activeProfile.height || 172}cm` },
                          { label: 'BMI Index', val: activeProfile.bmi || '23.6' }
                        ].map((met, idx) => (
                          <div key={idx} className="p-2.5 bg-brand-bg-card border border-brand-border rounded-xl text-center">
                            <div className="text-xs font-extrabold text-brand-text-primary">{met.val}</div>
                            <div className="text-[9px] text-brand-text-muted font-medium mt-0.5">{met.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Activity metrics */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest block font-display" style={{ color: planTheme.color }}>Activity & Engagement</h4>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-3 rounded-2xl border border-brand-border bg-slate-50">
                          <div className="text-2xl font-black" style={{ color: planTheme.color }}>{activeProfile.attendanceCount || 0}</div>
                          <div className="text-[9px] text-brand-text-muted mt-1 uppercase font-bold">Total Check-Ins</div>
                        </div>
                        <div className="p-3 rounded-2xl border border-brand-border bg-slate-50">
                          <div className="text-2xl font-black text-orange-600">{activeProfile.streak || 0} Days</div>
                          <div className="text-[9px] text-brand-text-muted mt-1 uppercase font-bold">Active Streak 🔥</div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* ── Biometric Status Panel ─────────────────────────────── */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest block font-display flex items-center gap-1.5" style={{ color: planTheme.color }}>
                      <Shield size={11} style={{ color: planTheme.color }} />
                      Biometric Setup & Status
                    </h4>

                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 border border-slate-700/60 space-y-3">
                      {/* Status Badges Row */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Biometric Status */}
                        <div className={`flex flex-col p-2.5 rounded-xl border ${
                          biometricProfile?.fingerprintStatus === 'enrolled'
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-slate-700/30 border-slate-600/40'
                        }`}>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">Biometric Status</span>
                          <span className={`text-[10px] font-black uppercase tracking-wider mt-1 ${
                            biometricProfile?.fingerprintStatus === 'enrolled' ? 'text-emerald-400' : 'text-slate-400'
                          }`}>
                            {biometricProfile?.fingerprintStatus === 'enrolled' ? 'Active' : 'Suspended'}
                          </span>
                        </div>

                        {/* Fingerprint Status */}
                        <div className={`flex flex-col p-2.5 rounded-xl border ${
                          biometricProfile?.fingerprintStatus === 'enrolled'
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-slate-700/30 border-slate-600/40'
                        }`}>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">Fingerprint Status</span>
                          <span className={`text-[10px] font-black uppercase tracking-wider mt-1 ${
                            biometricProfile?.fingerprintStatus === 'enrolled' ? 'text-emerald-400' : 'text-slate-400'
                          }`}>
                            {biometricProfile?.fingerprintStatus === 'enrolled' ? 'Enrolled' : 'Not Enrolled'}
                          </span>
                        </div>
                      </div>

                      {/* Detail Parameters Grid */}
                      <div className="grid grid-cols-2 gap-3 border-t border-slate-700/40 pt-3 text-[10px] font-mono text-slate-300">
                        <div className="space-y-0.5">
                          <span className="text-slate-500 block text-[8px] uppercase font-bold">Biometric ID</span>
                          <span className="font-extrabold text-white">{biometricProfile?.biometricId || activeProfile.biometricId || '—'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-slate-500 block text-[8px] uppercase font-bold">Device User ID</span>
                          <span className="font-extrabold text-white">{biometricProfile?.biometricId || activeProfile.biometricId || '—'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-slate-500 block text-[8px] uppercase font-bold">Fingerprint Count</span>
                          <span className="font-extrabold text-white">{biometricProfile?.fingerprintCount || (biometricProfile?.fingerprintStatus === 'enrolled' ? 1 : 0)} templates</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-slate-500 block text-[8px] uppercase font-bold">Enrollment Date</span>
                          <span className="font-extrabold text-white">
                            {biometricProfile?.enrollmentDate || (biometricProfile?.lastSync ? new Date(biometricProfile.lastSync).toLocaleDateString('en-IN') : '—')}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-slate-500 block text-[8px] uppercase font-bold">Device Name</span>
                          <span className="font-extrabold text-white truncate max-w-[130px] block">{biometricProfile?.deviceName || 'ESSL K90 Pro'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-slate-500 block text-[8px] uppercase font-bold">Last Sync</span>
                          <span className="font-extrabold text-white">
                            {biometricProfile?.lastSync ? new Date(biometricProfile.lastSync).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Enrollment Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleEnrollFingerprint}
                        className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <Fingerprint size={11} /> Enroll Fingerprint
                      </button>
                      <button
                        onClick={handleEnrollFingerprint}
                        className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <RotateCcw size={11} /> Re-Enroll
                      </button>
                      <button
                        onClick={handleDeleteBiometric}
                        className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <Trash2 size={11} /> Delete Fingerprint
                      </button>
                      <button
                        onClick={handleSyncDevice}
                        className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <Wifi size={11} /> Sync Device
                      </button>
                      <button
                        onClick={handleImportDeviceUsers}
                        className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <Download size={11} /> Import Device Users
                      </button>
                    </div>
                  </div>
                  {/* ──────────────────────────────────────────────────────── */}

                  {/* Action Buttons */}

                  <div className="space-y-2.5 pt-6 border-t border-brand-border mt-6">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleRenew(activeProfile)}
                        className="btn-cyber-cyan flex-1 py-3 text-xs font-bold text-white"
                      >
                        <RefreshCw size={13} className="text-white" /> Renew Contract
                      </button>
                      <button 
                        onClick={() => handleToggleFreeze(activeProfile)}
                        className="btn-cyber-outline flex-1 py-3 text-xs"
                      >
                        <Snowflake size={13} style={{ color: planTheme.color }} /> {activeProfile.status === 'frozen' ? 'Unfreeze' : 'Freeze Member'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleResetPassword(activeProfile)}
                        className="btn-cyber-outline flex-1 py-2 text-xxs font-medium text-brand-text-primary"
                      >
                        Reset Password
                      </button>
                      <button 
                        onClick={() => handleSendCredentials(activeProfile)}
                        className="btn-cyber-outline flex-1 py-2 text-xxs font-medium text-brand-text-primary"
                      >
                        Send Credentials
                      </button>
                    </div>
                    <button 
                      onClick={() => handleDeleteMember(activeProfile)}
                      className="w-full py-2.5 rounded-xl border border-brand-danger/25 bg-brand-danger/5 hover:bg-brand-danger/10 text-brand-danger text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={13} /> Delete Member Account
                    </button>

                  </div>

                </motion.div>
              );
            })()}
          </>
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
              className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-[32px] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)] z-10 overflow-hidden"
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
                  {enrollAction === 'fingerprint' ? 'Fingerprint Enrollment' :
                   enrollAction === 'face' ? 'Face Enrollment' :
                   enrollAction === 'sync' ? 'Device Sync' : 'Delete Biometric'}
                </div>
                <h3 className="text-xl font-black text-white">
                  {activeProfile?.name}
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
                    ) : enrollAction === 'face' ? (
                      <Scan size={36} className="text-blue-400 animate-pulse" />
                    ) : enrollAction === 'sync' ? (
                      <Wifi size={36} className="text-amber-400 animate-pulse" />
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
              {(enrollStatus.status === 'pending' || enrollStatus.status === 'connecting' || enrollStatus.status === 'scanning' || enrollStatus.status === 'processing' || enrollStatus.status === 'ready') && (
                <div className="h-0.5 bg-white/10 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-blue-500 rounded-full animate-[loading_2s_ease-in-out_infinite]" style={{ width: `${enrollStatus.scan > 0 ? (enrollStatus.scan / enrollStatus.totalScans) * 100 : 30}%`, transition: 'width 0.7s ease' }} />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {(enrollStatus.status === 'success' || enrollStatus.status === 'failed' || enrollStatus.status === 'info') && (
                  <button
                    onClick={closeEnrollModal}
                    className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none"
                  >
                    {enrollStatus.status === 'success' ? 'Done ✓' : 'Close'}
                  </button>
                )}
                {enrollStatus.status === 'failed' && (
                  <button
                    onClick={enrollAction === 'fingerprint' ? handleEnrollFingerprint : enrollAction === 'sync' ? handleSyncDevice : closeEnrollModal}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none"
                  >
                    <RotateCcw size={12} className="inline mr-1" /> Retry
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Quick View Trainer Modal */}
      <AnimatePresence>
        {selectedTrainerForView && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 text-left relative overflow-hidden text-slate-800"
            >
              <button 
                onClick={() => setSelectedTrainerForView(null)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1 rounded-full hover:bg-slate-50 border-none bg-transparent"
              >
                <X size={16} />
              </button>

              <div className="flex flex-col items-center text-center space-y-3 pb-3 border-b border-slate-150">
                <img 
                  src={selectedTrainerForView.photo} 
                  alt={selectedTrainerForView.name} 
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-md"
                />
                <div>
                  <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase inline-block">
                    {selectedTrainerForView.specialization}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 mt-1.5">{selectedTrainerForView.name}</h3>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-semibold font-mono">Mobile: {selectedTrainerForView.phone} · Exp: {selectedTrainerForView.experience} Yrs</p>
                </div>
              </div>

              <div className="space-y-3 text-xs font-semibold text-slate-700">
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Bio Biography</span>
                  <p className="text-[10px] text-slate-500 leading-relaxed italic mt-0.5">"{selectedTrainerForView.bio || 'Dedicated professional trainer.'}"</p>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Certifications</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTrainerForView.certifications?.map((c: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[8px] font-black uppercase">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                {selectedTrainerForView.achievements && (
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Achievements</span>
                    <p className="text-[10px] text-slate-700 mt-0.5 flex items-center gap-1.5 font-bold">
                      <Trophy size={12} className="text-amber-500 shrink-0" />
                      <span>{selectedTrainerForView.achievements}</span>
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedTrainerForView(null)}
                className="w-full py-2.5 bg-black hover:bg-black/90 text-white rounded-xl text-[10px] font-black uppercase tracking-wider text-center transition-colors cursor-pointer border-none"
              >
                Close Detail View
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ═══════════════════════════════════════════════════════════════════════ */}

    </div>
  );
}
