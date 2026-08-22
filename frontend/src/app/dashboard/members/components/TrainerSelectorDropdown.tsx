'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, ChevronDown, Search, Check, UserMinus, Sparkles, Shield, BadgeCheck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, getDocs, where } from 'firebase/firestore';
import toast from 'react-hot-toast';
import API from '@/services/api';

const DEFAULT_TRAINERS = [
  { id: 'emp_502', name: 'Karan Verma', employeeId: 'EMP-502', role: 'Trainer', specialization: 'Personal Trainer & Strength', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { id: 'emp_503', name: 'Sneha Kapoor', employeeId: 'EMP-503', role: 'Trainer', specialization: 'Fitness & Cardio Specialist', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
];

/**
 * Deduplicates employee trainer objects by phone, email, or employeeId/id
 */
function deduplicateTrainers(rawList: any[]) {
  const map = new Map<string, any>();

  rawList.forEach((t) => {
    // Only include actual trainers or coaches
    const r = String(t.role || t.type || '').toLowerCase();
    if (!r.includes('trainer') && !r.includes('coach')) return;

    // Unique key priority: phone > email > employeeId > id
    const key = (t.phone && String(t.phone).trim().length >= 8)
      ? String(t.phone).trim()
      : (t.email && String(t.email).trim().length > 3)
      ? String(t.email).trim().toLowerCase()
      : (t.employeeId && !t.employeeId.includes('EMP-AUTO') && String(t.employeeId).trim().length > 0)
      ? String(t.employeeId).trim()
      : String(t.id).trim();

    if (!map.has(key)) {
      map.set(key, t);
    } else {
      // If existing item has generic EMP-AUTO and new item has specific EMP-xxx, replace it
      const existing = map.get(key);
      const existingEmpId = String(existing.employeeId || '');
      const newEmpId = String(t.employeeId || '');
      if (existingEmpId.includes('AUTO') && !newEmpId.includes('AUTO')) {
        map.set(key, t);
      }
    }
  });

  return Array.from(map.values());
}

export default function TrainerSelectorDropdown({
  member,
  onTrainerUpdated,
}: {
  member: any;
  onTrainerUpdated?: (updatedTrainer: { trainerId: string | null; trainerName: string; trainerRole?: string; trainerAvatar?: string }) => void;
}) {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-time listener + API fallback for employees/trainers
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'employees'));
    const unsub = onSnapshot(q, (snap) => {
      let rawList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      let deduped = deduplicateTrainers(rawList);

      if (deduped.length > 0) {
        setTrainers(deduped);
        setLoading(false);
      } else {
        // Try API fallback
        API.get('/employees').then(res => {
          const apiList = res.data || [];
          const apiDeduped = deduplicateTrainers(apiList);
          setTrainers(apiDeduped.length > 0 ? apiDeduped : DEFAULT_TRAINERS);
        }).catch(() => {
          setTrainers(DEFAULT_TRAINERS);
        }).finally(() => setLoading(false));
      }
    }, (err) => {
      console.warn("Trainers snapshot listener error, trying API fallback:", err);
      API.get('/employees').then(res => {
        const apiDeduped = deduplicateTrainers(res.data || []);
        setTrainers(apiDeduped.length > 0 ? apiDeduped : DEFAULT_TRAINERS);
      }).catch(() => {
        setTrainers(DEFAULT_TRAINERS);
      }).finally(() => setLoading(false));
    });

    return () => unsub();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const currentTrainerName = member?.trainerName || member?.trainer || 'Unassigned';
  const currentTrainerId = member?.trainerId || null;
  const isAssigned = currentTrainerId && currentTrainerId !== 'null' && currentTrainerName !== 'Unassigned';

  const filteredTrainers = trainers.filter((t) => {
    const name = String(t.name || '').toLowerCase();
    const empId = String(t.employeeId || t.id || '').toLowerCase();
    const spec = String(t.specialization || '').toLowerCase();
    const s = search.toLowerCase();
    return name.includes(s) || empId.includes(s) || spec.includes(s);
  });

  const handleSelectTrainer = async (trainer: any | null) => {
    if (!member || !member.id) return;
    setSaving(true);
    try {
      const newTrainerId = trainer ? (trainer.employeeId || trainer.id) : null;
      const newTrainerName = trainer ? trainer.name : 'Unassigned';
      const newTrainerRole = trainer ? (trainer.specialization || trainer.role || 'Personal Trainer & Strength') : '';
      const newTrainerAvatar = trainer ? (trainer.avatarUrl || `https://i.pravatar.cc/150?u=${encodeURIComponent(trainer.name)}`) : '';

      const updateData = {
        trainerId: newTrainerId,
        trainerName: newTrainerName,
        trainer: newTrainerName,
        trainerRole: newTrainerRole,
        trainerAvatar: newTrainerAvatar,
        updatedAt: new Date().toISOString(),
      };

      try {
        await updateDoc(doc(db, 'members', member.id), updateData);
      } catch (fsErr) {
        console.warn("Direct Firestore update member trainer failed, trying API:", fsErr);
        await API.put(`/members/${member.id}`, updateData);
      }

      // Optimistically update member object in memory
      member.trainerId = newTrainerId;
      member.trainerName = newTrainerName;
      member.trainer = newTrainerName;
      member.trainerRole = newTrainerRole;
      member.trainerAvatar = newTrainerAvatar;

      if (onTrainerUpdated) {
        onTrainerUpdated({
          trainerId: newTrainerId,
          trainerName: newTrainerName,
          trainerRole: newTrainerRole,
          trainerAvatar: newTrainerAvatar,
        });
      }

      toast.success(trainer ? `Assigned trainer: ${newTrainerName}` : 'Trainer unassigned');
      setIsOpen(false);
    } catch (err: any) {
      toast.error('Failed to update trainer: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
        Assigned Trainer
      </span>

      <button
        type="button"
        disabled={saving}
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3.5 py-2 border rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 ${
          isAssigned
            ? 'bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100'
            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
        }`}
      >
        <User size={15} className={isAssigned ? 'text-indigo-600' : 'text-slate-400'} />
        <span>{saving ? 'Updating...' : currentTrainerName}</span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-200 p-3 z-[9999] animate-in fade-in select-none">
          {/* Search bar */}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trainer name, ID..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Unassign option */}
          <button
            type="button"
            onClick={() => handleSelectTrainer(null)}
            className="w-full px-3 py-2.5 text-left hover:bg-rose-50 rounded-xl flex items-center justify-between text-xs font-extrabold text-rose-600 transition-colors border-none bg-transparent cursor-pointer mb-1"
          >
            <div className="flex items-center gap-2">
              <UserMinus size={15} />
              <span>Unassign Trainer</span>
            </div>
            {!isAssigned && <Check size={15} className="text-rose-600" />}
          </button>

          <div className="border-t border-slate-100 my-1.5" />

          {/* Unique Trainers List */}
          <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
            {loading ? (
              <div className="p-4 text-center text-xs font-bold text-slate-400">Loading trainers...</div>
            ) : filteredTrainers.length === 0 ? (
              <div className="p-4 text-center text-xs font-bold text-slate-400">
                {search ? 'No trainers match search' : 'No active trainers available'}
              </div>
            ) : (
              filteredTrainers.map((t) => {
                const isSelected = (currentTrainerId && (currentTrainerId === t.id || currentTrainerId === t.employeeId)) || (currentTrainerName === t.name);
                // Format clean user-facing employee ID (never show raw 20-char firebase hash)
                let empIdBadge = t.employeeId;
                if (!empIdBadge || empIdBadge.length > 15 || empIdBadge.includes('AUTO')) {
                  empIdBadge = `EMP-${t.id ? t.id.slice(0, 5).toUpperCase() : '101'}`;
                }
                const spec = t.specialization || 'Personal Trainer & Strength';
                const avatar = t.avatarUrl || `https://i.pravatar.cc/150?u=${encodeURIComponent(t.name)}`;

                return (
                  <button
                    key={t.id || t.employeeId || t.name}
                    type="button"
                    onClick={() => handleSelectTrainer(t)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all border-none cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected ? 'bg-indigo-50/90 text-indigo-900 font-black border border-indigo-200' : 'hover:bg-slate-50 text-slate-800 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                        <img src={avatar} alt={t.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs truncate font-extrabold">{t.name}</span>
                          <span className="text-[9px] font-mono font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                            {empIdBadge}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{spec}</div>
                      </div>
                    </div>

                    {isSelected && <Check size={15} className="text-indigo-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
