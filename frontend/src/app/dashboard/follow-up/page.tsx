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
import FollowUpKPI from './components/FollowUpKPI';
import FollowUpTable from './components/FollowUpTable';
import MemberDrawer from '../members/components/MemberDrawer';
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


export default function FollowUpPage() {
  const {
    members: allMembers, fetchMembers, addMember, updateMember, deleteMember, toggleFreeze, addPayment, resetPassword, sendCredentials
  } = useGymStore();
  const members = allMembers.filter((m: any) => String(m.status || "").toLowerCase() === "followup" || m.followUpDate);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeProfile, setActiveProfile] = useState<any | null>(null);
  const [editingMember, setEditingMember] = useState<any | null>(null);
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


  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      await updateMember(editingMember.id, {
        name: editingMember.name,
        phone: editingMember.phone,
        email: editingMember.email,
        plan: editingMember.plan,
        branch: editingMember.branch,
        trainer: editingMember.trainer
      });
      toast.success('Member updated successfully!');
      setEditingMember(null);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update member');
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
    <div className="space-y-6 pb-12 relative bg-[#f8fafc] min-h-screen p-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-display">CRM - Follow Ups</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your daily follow-up calls and pipeline.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download size={14} /> Export CSV
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <FollowUpKPI />

      {/* Main Table */}
      <FollowUpTable 
        members={members}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        selectedMemberId={activeProfile?.id || null}
        onSelectMember={setActiveProfile}
      />

      {/* Profile Drawer */}
      <MemberDrawer 
        member={activeProfile}
        onClose={() => setActiveProfile(null)}
        onCall={(m) => window.open(`tel:${m.phone}`)}
        onMessage={(m) => window.open(`https://wa.me/91${m.phone}`)}
        onCheckIn={(m) => alert('Manual check-in feature...')}
        onViewProfile={(m) => console.log('view full', m.id)}
        onEdit={(m) => {
          setEditingMember(m);
          setActiveProfile(null);
        }}
      />

      {/* ─── Edit Member Modal ─── */}
      {editingMember && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-lg" onClick={() => setEditingMember(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 p-6">
            <h2 className="text-xl font-bold mb-4">Edit Member</h2>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Name</label>
                <input type="text" className="w-full mt-1 p-2 border border-slate-200 rounded-lg" value={editingMember.name || ''} onChange={e => setEditingMember({ ...editingMember, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Phone</label>
                <input type="text" className="w-full mt-1 p-2 border border-slate-200 rounded-lg" value={editingMember.phone || ''} onChange={e => setEditingMember({ ...editingMember, phone: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Email</label>
                <input type="email" className="w-full mt-1 p-2 border border-slate-200 rounded-lg" value={editingMember.email || ''} onChange={e => setEditingMember({ ...editingMember, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Plan</label>
                <select className="w-full mt-1 p-2 border border-slate-200 rounded-lg" value={editingMember.plan || ''} onChange={e => setEditingMember({ ...editingMember, plan: e.target.value })}>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Semi-Annual">Semi-Annual</option>
                  <option value="Annual Premium">Annual Premium</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setEditingMember(null)} className="px-4 py-2 text-slate-500 bg-slate-100 rounded-lg font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white bg-indigo-600 rounded-lg font-bold hover:bg-indigo-700">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
