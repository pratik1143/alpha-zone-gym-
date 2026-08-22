'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, ChevronDown, Search, Check, X, ShieldAlert, Sparkles, UserMinus } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function TrainerSelectorDropdown({
  member,
  onTrainerUpdated,
}: {
  member: any;
  onTrainerUpdated?: (updatedTrainer: { trainerId: string | null; trainerName: string }) => void;
}) {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-time listener for employees / trainers
  useEffect(() => {
    const q = query(collection(db, 'employees'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((emp: any) => {
          const r = String(emp.role || emp.type || '').toLowerCase();
          return r.includes('trainer');
        });
      setTrainers(list);
      setLoading(false);
    }, (err) => {
      console.warn("Trainers listener notice:", err);
      setLoading(false);
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
      const newTrainerId = trainer ? (trainer.id || trainer.employeeId) : null;
      const newTrainerName = trainer ? trainer.name : 'Unassigned';

      await updateDoc(doc(db, 'members', member.id), {
        trainerId: newTrainerId,
        trainerName: newTrainerName,
        trainer: newTrainerName,
        updatedAt: new Date().toISOString(),
      });

      if (onTrainerUpdated) {
        onTrainerUpdated({ trainerId: newTrainerId, trainerName: newTrainerName });
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
        className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-800 transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
      >
        <User size={15} className={currentTrainerId ? 'text-indigo-600' : 'text-slate-400'} />
        <span>{saving ? 'Updating...' : currentTrainerName}</span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-[999] animate-in fade-in select-none">
          {/* Search bar */}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trainer name, ID..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Unassign option */}
          <button
            type="button"
            onClick={() => handleSelectTrainer(null)}
            className="w-full px-3 py-2 text-left hover:bg-rose-50 rounded-xl flex items-center justify-between text-xs font-extrabold text-rose-600 transition-colors border-none bg-transparent cursor-pointer mb-1"
          >
            <div className="flex items-center gap-2">
              <UserMinus size={14} />
              <span>Unassign Trainer</span>
            </div>
            {!currentTrainerId && <Check size={14} />}
          </button>

          <div className="border-t border-slate-100 my-1" />

          {/* Trainers List */}
          <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar">
            {loading ? (
              <div className="p-3 text-center text-xs font-bold text-slate-400">Loading trainers...</div>
            ) : filteredTrainers.length === 0 ? (
              <div className="p-3 text-center text-xs font-bold text-slate-400">
                {search ? 'No trainers match search' : 'No active trainers available'}
              </div>
            ) : (
              filteredTrainers.map((t) => {
                const isSelected = (currentTrainerId && currentTrainerId === t.id) || (currentTrainerName === t.name);
                const empIdStr = t.employeeId || t.id || 'EMP';
                const spec = t.specialization || 'Personal Trainer';

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTrainer(t)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all border-none cursor-pointer flex items-center justify-between ${
                      isSelected ? 'bg-indigo-50 text-indigo-900 font-black' : 'hover:bg-slate-50 text-slate-800 font-bold'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{t.name}</span>
                        <span className="text-[9px] font-mono font-bold bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                          {empIdStr}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">{spec}</div>
                    </div>

                    {isSelected && <Check size={14} className="text-indigo-600 shrink-0" />}
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
