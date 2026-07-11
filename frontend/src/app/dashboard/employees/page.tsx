'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, Plus, Filter, UserCheck, Briefcase, 
  Trash2, Edit, X, Check, ArrowRight, UserPlus, Phone, 
  Mail, MapPin, Shield, Cpu, RefreshCw, Eye, Sparkles, Clock, AlertCircle
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { formatDate } from '@/lib/utils';
import API from '@/services/api';
import toast from 'react-hot-toast';
import SmartPhotoCapture from '../components/SmartPhotoCapture';
import SendWhatsAppModal from '../components/SendWhatsAppModal';
import { MessageSquare } from 'lucide-react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Drawers
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [activeProfile, setActiveProfile] = useState<any | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [whatsAppModalEmployee, setWhatsAppModalEmployee] = useState<any | null>(null);

  // Realtime Firestore listeners
  useEffect(() => {
    setLoading(true);
    const qEmp = query(collection(db, 'employees'));
    const unsubEmp = onSnapshot(qEmp, (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    const qAtt = query(collection(db, 'employeeAttendance'), orderBy('timestamp', 'desc'));
    const unsubAtt = onSnapshot(qAtt, (snap) => {
      setAttendance(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error(err);
    });

    return () => {
      unsubEmp();
      unsubAtt();
    };
  }, []);

  // Stats
  const totalEmployees = employees.length;
  const presentToday = employees.filter(e => e.todayStatus === 'Present').length;
  const absentToday = Math.max(0, totalEmployees - presentToday);
  const currentlyInside = employees.filter(e => e.currentStatus === 'Inside').length;

  // Filter lists
  const filteredEmployees = employees.filter(e => {
    const matchesSearch = 
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      String(e.biometricId)?.includes(search) ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.phone?.includes(search);
    
    const matchesRole = roleFilter === 'all' || e.role === roleFilter;
    const matchesBranch = branchFilter === 'all' || e.branch === branchFilter;
    
    let status = 'Outside';
    if (e.currentStatus === 'Inside') status = 'Inside';
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    return matchesSearch && matchesRole && matchesBranch && matchesStatus;
  });

  // Delete Handler
  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee record?')) {
      try {
        await deleteDoc(doc(db, 'employees', id));
        toast.success('Employee record deleted');
      } catch (err: any) {
        toast.error('Failed to delete employee: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12 w-full text-slate-800 text-left">
      
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-display">Staff & Employees</h1>
          <p className="text-xs text-slate-500 font-medium font-display">Manage gym trainers, receptionists, cleaners and security workspace roster.</p>
        </div>
        
        <button 
          onClick={() => setShowAddWizard(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider border-none cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/10 transition-all active:scale-95"
        >
          <Plus size={15} /> Add Employee
        </button>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: totalEmployees, sub: 'Registered Staff', color: 'border-blue-150 text-blue-600 bg-blue-50/20' },
          { label: 'Present Today', value: presentToday, sub: 'Checked In', color: 'border-emerald-150 text-emerald-600 bg-emerald-50/20' },
          { label: 'Absent Today', value: absentToday, sub: 'Not Punched Yet', color: 'border-rose-150 text-rose-600 bg-rose-50/20' },
          { label: 'Currently Inside', value: currentlyInside, sub: 'Active inside Gym', color: 'border-purple-150 text-purple-600 bg-purple-50/20' }
        ].map((stat, i) => (
          <div key={i} className={`border rounded-[20px] p-5 flex flex-col justify-between transition-all bg-white hover:shadow-sm ${stat.color}`}>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-none">{stat.label}</span>
            <div className="text-2xl font-black mt-3 leading-none font-mono">{stat.value}</div>
            <span className="text-[9px] font-bold mt-1 opacity-70 leading-none">{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-wrap gap-4 items-center shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employees by name, phone, biometric ID..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-medium"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select 
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-650 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="all">All Roles</option>
            {['Trainer', 'Reception', 'Manager', 'Owner', 'Cleaner', 'Security', 'Nutritionist', 'Sales', 'Custom'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select 
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-650 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="all">All Branches</option>
            <option value="Mohali, Punjab">Mohali, Punjab</option>
            <option value="Chandigarh">Chandigarh</option>
            <option value="Panchkula">Panchkula</option>
          </select>

          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-650 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Inside">Inside Gym</option>
            <option value="Outside">Outside</option>
          </select>
        </div>
      </div>

      {/* Custom Table Grid */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100">
              <tr>
                <th className="px-5 py-4 w-12 text-center">Photo</th>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Contact</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Branch</th>
                <th className="px-5 py-4 text-center">Biometric ID</th>
                <th className="px-5 py-4 text-center">Today's Status</th>
                <th className="px-5 py-4">Last Punch</th>
                <th className="px-5 py-4">Current Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 font-medium">
              {filteredEmployees.map(emp => {
                const avatar = emp.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${emp.name?.replace(/ /g, '')}`;
                const isInside = emp.currentStatus === 'Inside';
                
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-center">
                      <img src={avatar} className="w-8 h-8 rounded-full bg-slate-100 border border-slate-100 mx-auto" alt="" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-extrabold text-slate-900">{emp.name}</div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">Emp ID: {emp.id.slice(-6).toUpperCase()}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div>{emp.phone}</div>
                      <div className="text-[9px] text-slate-450">{emp.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700 font-semibold">{emp.branch}</td>
                    <td className="px-5 py-3 text-center font-mono font-bold text-slate-800">{emp.biometricId || '—'}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider border ${
                        emp.todayStatus === 'Present' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {emp.todayStatus || 'Absent'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 font-semibold font-mono">
                      {emp.lastPunch ? new Date(emp.lastPunch).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5 font-bold">
                        <span className={`w-2 h-2 rounded-full ${isInside ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
                        {isInside ? 'Inside Gym' : 'Outside'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          onClick={() => {
                            setActiveProfile(emp);
                          }}
                          className="w-7 h-7 bg-slate-55 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-90"
                          title="View Profile Drawer"
                        >
                          <Eye size={12} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingEmployee(emp);
                          }}
                          className="w-7 h-7 bg-slate-55 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-90"
                          title="Edit Details"
                        >
                          <Edit size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-rose-650 border border-rose-100 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-90"
                          title="Delete Employee"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 italic">No employees found. Add staff to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee wizard popup */}
      {showAddWizard && <AddEmployeeWizard onClose={() => setShowAddWizard(false)} />}

      {/* Edit Employee popup */}
      {editingEmployee && <EditEmployeeModal employee={editingEmployee} onClose={() => setEditingEmployee(null)} />}

      {/* Profile Drawer */}
      <AnimatePresence>
        {activeProfile && (
          <EmployeeProfileDrawer 
            employee={activeProfile} 
            attendance={attendance.filter(a => a.employeeId === activeProfile.id)}
            onClose={() => setActiveProfile(null)} 
            onWhatsApp={(emp) => {
              setWhatsAppModalEmployee(emp);
              setActiveProfile(null);
            }}
          />
        )}
      </AnimatePresence>

      <SendWhatsAppModal
        isOpen={!!whatsAppModalEmployee}
        onClose={() => setWhatsAppModalEmployee(null)}
        phone={whatsAppModalEmployee?.phone || ''}
        memberName={whatsAppModalEmployee?.name || ''}
        plan="Staff"
        expiryDate="N/A"
        trainer="N/A"
      />

    </div>
  );
}

// ─── ADD EMPLOYEE WIZARD COMPONENT ───
function AddEmployeeWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Trainer');
  const [branch, setBranch] = useState('Mohali, Punjab');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Biometric details
  const [device, setDevice] = useState('ESSL K90 Pro');
  const [biometricIdType, setBiometricIdType] = useState<'auto' | 'manual'>('auto');
  const [manualBiometricId, setManualBiometricId] = useState('');
  const [enrollStatus, setEnrollStatus] = useState<'idle' | 'scanning' | 'success'>('idle');

  const handleNext = () => {
    if (!name || !phone || !email) {
      toast.error('Please fill in all required fields marked with *');
      return;
    }
    setStep(2);
  };

  const handleEnrollFingerprint = () => {
    setEnrollStatus('scanning');
    setTimeout(() => {
      setEnrollStatus('success');
      toast.success('Fingerprint enrolled successfully!');
    }, 2500);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        name,
        phone,
        email,
        role,
        branch,
        emergencyContact,
        address,
        avatarUrl,
        device,
        biometricId: biometricIdType === 'auto' ? 'auto' : manualBiometricId,
        deviceUserId: biometricIdType === 'auto' ? '' : manualBiometricId,
        todayStatus: 'Absent',
        currentStatus: 'Outside',
        lastPunch: null
      };

      await API.post('/employees', payload);

      toast.success('Employee created successfully!');
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-3xl z-10 shadow-[0_30px_70px_rgba(0,0,0,0.12)] overflow-hidden border border-slate-100 flex flex-col justify-between text-slate-800 text-left font-display">
        {/* Top Accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-[#d4ff00]" />

        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-250 flex items-center justify-center cursor-pointer">
          <X size={12} />
        </button>

        {/* Wizard content */}
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-sm text-slate-900 leading-none">Register Gym Employee</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Step {step} of 2: {step === 1 ? 'Personal Profile' : 'Biometric Link'}</p>
            </div>
            {/* Progress indicators */}
            <div className="flex gap-1.5">
              <span className={`w-3.5 h-1.5 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
              <span className={`w-3.5 h-1.5 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
            </div>
          </div>

          {step === 1 ? (
            <div className="space-y-4 text-xs font-semibold">
              <div className="w-full">
                <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-2">Employee Photo</label>
                <SmartPhotoCapture 
                  value={avatarUrl || undefined}
                  onCaptureComplete={(urls) => {
                    setAvatarUrl(urls.photoURL);
                  }}
                  label="Employee"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Ramesh Kumar" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Phone Number *</label>
                  <input 
                    type="tel" 
                    required 
                    placeholder="e.g. 9876543210" 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Email ID *</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="e.g. ramesh@alphazonegym.com" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Role *</label>
                  <select 
                    value={role} 
                    onChange={e => setRole(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-700 font-semibold cursor-pointer"
                  >
                    {['Trainer', 'Reception', 'Manager', 'Owner', 'Cleaner', 'Security', 'Nutritionist', 'Sales', 'Custom'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Branch Location *</label>
                  <select 
                    value={branch} 
                    onChange={e => setBranch(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="Mohali, Punjab">Mohali, Punjab</option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Panchkula">Panchkula</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Emergency Contact (Optional)</label>
                  <input 
                    type="tel" 
                    placeholder="e.g. +91 99999 88888" 
                    value={emergencyContact}
                    onChange={e => setEmergencyContact(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Residential Address (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. H.No 1234, Phase 3B2, Mohali" 
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-medium"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs font-semibold">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu size={13} className="text-blue-600 animate-pulse" /> ESSL Biometric Integration
                </h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Connect employee account directly to the physical biometric lock. Employees punch biometric ID to log attendance and unlock the gate.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Assign Device</label>
                  <select 
                    value={device} 
                    onChange={e => setDevice(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="ESSL K90 Pro">ESSL K90 Pro (Mohali Front Gate)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Biometric ID Assignment</label>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setBiometricIdType('auto')}
                      className={`flex-1 py-2 text-center rounded-xl border text-[10px] font-bold ${biometricIdType === 'auto' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                    >
                      Auto Generate
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setBiometricIdType('manual')}
                      className={`flex-1 py-2 text-center rounded-xl border text-[10px] font-bold ${biometricIdType === 'manual' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                    >
                      Manual ID
                    </button>
                  </div>
                </div>
              </div>

              {biometricIdType === 'manual' && (
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Biometric ID Number</label>
                  <input 
                    type="number" 
                    placeholder="Enter device user slot (e.g. 501)" 
                    value={manualBiometricId}
                    onChange={e => setManualBiometricId(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-medium"
                  />
                </div>
              )}

              {/* Fingerprint Enrollment Simulation */}
              <div className="border border-slate-150 rounded-2xl p-4 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">Enroll Fingerprint</h4>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Initialize biometric hardware enrollment scan</p>
                </div>
                {enrollStatus === 'idle' && (
                  <button 
                    type="button" 
                    onClick={handleEnrollFingerprint}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300 rounded-xl text-[10px] font-bold cursor-pointer"
                  >
                    Start Scan
                  </button>
                )}
                {enrollStatus === 'scanning' && (
                  <div className="flex items-center gap-2 text-[10px] font-extrabold text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Scanning Finger...
                  </div>
                )}
                {enrollStatus === 'success' && (
                  <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                    ✓ Enrolled
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-150 flex justify-between items-center">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-black uppercase tracking-wider bg-transparent border-none cursor-pointer">Cancel</button>
              <button 
                onClick={handleNext}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider border-none cursor-pointer flex items-center gap-1.5"
              >
                Next Step <ArrowRight size={13} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-black uppercase tracking-wider bg-transparent border-none cursor-pointer">Back</button>
              <div className="flex gap-2">
                <button 
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-300 cursor-pointer"
                >
                  Skip Biometric
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider border-none cursor-pointer flex items-center gap-1 shadow-md shadow-blue-600/10"
                >
                  {submitting ? 'Registering...' : 'Finish Registration'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EDIT EMPLOYEE MODAL ───
function EditEmployeeModal({ employee, onClose }: { employee: any, onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState(employee.name || '');
  const [phone, setPhone] = useState(employee.phone || '');
  const [email, setEmail] = useState(employee.email || '');
  const [role, setRole] = useState(employee.role || 'Trainer');
  const [branch, setBranch] = useState(employee.branch || 'Mohali, Punjab');
  const [emergencyContact, setEmergencyContact] = useState(employee.emergencyContact || '');
  const [address, setAddress] = useState(employee.address || '');
  const [biometricId, setBiometricId] = useState(employee.biometricId || '');
  const [avatarUrl, setAvatarUrl] = useState(employee.avatarUrl || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.put(`/employees/${employee.id}`, {
        name, phone, email, role, branch, emergencyContact, address, biometricId, avatarUrl
      });

      toast.success('Employee profile updated!');
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <form onSubmit={handleSubmit} className="relative w-full max-w-md bg-white rounded-3xl z-10 shadow-[0_30px_70px_rgba(0,0,0,0.12)] overflow-hidden border border-slate-100 flex flex-col justify-between text-slate-800 text-left font-display">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-[#d4ff00]" />
        
        <button type="button" onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-250 flex items-center justify-center cursor-pointer">
          <X size={12} />
        </button>

        <div className="p-6 space-y-4">
          <h3 className="font-black text-sm text-slate-900 mb-4">Edit Staff Profile</h3>

          <div className="space-y-3.5 text-xs font-semibold">
            <div className="w-full">
              <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-2">Staff Photo</label>
              <SmartPhotoCapture 
                value={avatarUrl || undefined}
                onCaptureComplete={(urls) => {
                  setAvatarUrl(urls.photoURL);
                }}
                label="Employee"
              />
            </div>

            <div>
              <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-700" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-700" />
              </div>
              <div>
                <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-700" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Role</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none text-slate-700 font-semibold cursor-pointer">
                  {['Trainer', 'Reception', 'Manager', 'Owner', 'Cleaner', 'Security', 'Nutritionist', 'Sales', 'Custom'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Biometric ID</label>
                <input type="number" value={biometricId} onChange={e => setBiometricId(Number(e.target.value))} required className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-700" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Branch</label>
                <select value={branch} onChange={e => setBranch(e.target.value)} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none text-slate-700 font-semibold cursor-pointer">
                  <option value="Mohali, Punjab">Mohali, Punjab</option>
                  <option value="Chandigarh">Chandigarh</option>
                  <option value="Panchkula">Panchkula</option>
                </select>
              </div>
              <div>
                <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Emergency Contact</label>
                <input type="tel" value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none text-slate-700" />
              </div>
            </div>

            <div>
              <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none text-slate-700" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-150 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-black uppercase tracking-wider bg-transparent border-none cursor-pointer">Cancel</button>
          <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider border-none cursor-pointer flex items-center gap-1 shadow-md shadow-blue-600/10">
            {submitting ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── EMPLOYEE PROFILE DRAWER COMPONENT ───
function EmployeeProfileDrawer({ employee, attendance, onClose, onWhatsApp }: { employee: any, attendance: any[], onClose: () => void, onWhatsApp?: (emp: any) => void }) {
  const avatar = employee.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${employee.name?.replace(/ /g, '')}`;

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45]" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[50] shadow-2xl p-6 overflow-y-auto flex flex-col justify-between border-l border-slate-100 text-left"
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
              <Briefcase size={14} className="text-blue-600" /> Employee Profile
            </h3>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-250 flex items-center justify-center cursor-pointer">
              <X size={12} />
            </button>
          </div>

          {/* Profile Header Card */}
          <div className="flex gap-4 items-center bg-slate-50 border border-slate-100 rounded-3xl p-5">
            <img src={avatar} className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-sm" alt="" />
            <div>
              <h4 className="text-base font-black text-slate-800 leading-tight">{employee.name}</h4>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{employee.role}</div>
              <div className="text-[9px] text-slate-500 mt-0.5 font-semibold">Biometric ID: <b className="text-slate-850 font-mono">{employee.biometricId}</b></div>
            </div>
          </div>

          {/* Personal Details */}
          <div className="space-y-3.5 text-xs">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">Staff Contact Details</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 font-semibold block text-[9.5px]">Phone Number</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-slate-800 font-bold">{employee.phone}</span>
                  <button 
                    onClick={() => onWhatsApp?.(employee)}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-slate-100 cursor-pointer"
                    title="Send WhatsApp"
                  >
                    <MessageSquare size={12} />
                  </button>
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[9.5px]">Email ID</span>
                <span className="text-slate-800 font-bold truncate block">{employee.email}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 font-semibold block text-[9.5px]">Branch Location</span>
                <span className="text-slate-800 font-bold">{employee.branch}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[9.5px]">Emergency Phone</span>
                <span className="text-slate-800 font-bold">{employee.emergencyContact || '—'}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block text-[9.5px]">Residential Address</span>
              <span className="text-slate-800 font-bold">{employee.address || '—'}</span>
            </div>
          </div>

          {/* Today's Status Banner */}
          <div className="space-y-3.5 text-xs">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">Today's Attendance Status</h4>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-[9px] font-bold">CURRENT STATUS</span>
                <span className="text-slate-800 font-black text-sm">{employee.currentStatus === 'Inside' ? 'Inside Gym' : 'Outside'}</span>
              </div>
              <span className={`px-2.5 py-1 rounded font-black text-[10px] uppercase tracking-wider border ${
                employee.todayStatus === 'Present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}>
                {employee.todayStatus || 'Absent'}
              </span>
            </div>
          </div>

          {/* Biometric Punch History Logs */}
          <div className="space-y-3.5 text-xs">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">Punch Log Timeline</h4>
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {attendance.map((log: any, idx: number) => {
                const clockIn = log.checkIn ? new Date(log.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
                const clockOut = log.checkOut ? new Date(log.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Active Inside';
                
                return (
                  <div key={idx} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex justify-between items-center">
                    <div>
                      <div className="text-[10px] font-black text-slate-800">{new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Device: {log.deviceName || 'Front Gate'}</div>
                    </div>
                    <div className="text-right text-[10px] font-bold">
                      <div className="text-emerald-600 font-black">In: {clockIn}</div>
                      <div className="text-slate-500 font-black mt-0.5">Out: {clockOut}</div>
                    </div>
                  </div>
                );
              })}
              {attendance.length === 0 && (
                <div className="text-center py-6 text-slate-400 italic">No biometric logs logged for this employee.</div>
              )}
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-xl border-none cursor-pointer text-center"
        >
          Close Drawer
        </button>
      </motion.div>
    </>
  );
}
