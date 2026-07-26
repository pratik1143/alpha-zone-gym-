'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, User, Phone, MessageSquare, Crown, Sparkles,
  ChevronRight, ArrowRight, UserPlus, Shield, Activity, Clock, Command
} from 'lucide-react';
import { useGymStore } from '@/store';
import { getInitials } from '@/lib/utils';
import { membershipEngine } from '@/lib/engines/membershipEngine';
import MemberDrawer from '../members/components/MemberDrawer';

export default function UniversalSearchBar() {
  const router = useRouter();
  const { members, fetchMembers } = useGymStore();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsFocused(true);
      }
      if (e.key === 'Escape') {
        setIsFocused(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter members by ID, Name, or Phone
  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const digitsOnly = q.replace(/\D/g, '');
    const seenKeys = new Set<string>();

    return (members || []).filter((m: any) => {
      const key = (m.memberId && m.memberId !== 'AZ-2026-0000')
        ? `mid_${m.memberId.trim()}`
        : (m.phone ? `phone_${m.phone.replace(/\D/g, '')}` : `id_${m.id}`);
      if (seenKeys.has(key)) return false;

      const nameMatch = (m.name || m.fullName || '').toLowerCase().includes(q);
      const idMatch = (
        (m.memberId || '').toLowerCase().includes(q) ||
        (m.id || '').toLowerCase().includes(q) ||
        (m.customId || '').toLowerCase().includes(q) ||
        (m.biometricId || '').toLowerCase().includes(q) ||
        (m.code || '').toLowerCase().includes(q)
      );
      const emailMatch = (m.email || '').toLowerCase().includes(q);
      
      let phoneMatch = false;
      if (digitsOnly.length >= 2) {
        const rawPhone = (m.phone || m.mobile || m.whatsapp || m.emergencyContact || '').replace(/\D/g, '');
        phoneMatch = rawPhone.includes(digitsOnly);
      }

      const matches = nameMatch || idMatch || phoneMatch || emailMatch;
      if (matches) {
        seenKeys.add(key);
      }
      return matches;
    }).slice(0, 8); // top 8 results
  }, [query, members]);

  // Reset keyboard index on query change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isFocused || filteredMembers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredMembers.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredMembers.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredMembers.length) {
        handleMemberClick(filteredMembers[selectedIndex]);
      } else if (filteredMembers.length > 0) {
        handleMemberClick(filteredMembers[0]);
      }
    }
  };

  const handleMemberClick = (member: any) => {
    setSelectedMember(member);
    setIsFocused(false);
  };

  const getStatusBadge = (member: any) => {
    const daysLeft = membershipEngine.calculateDaysLeft(member.expiryDate);
    if (member.status === 'frozen') {
      return { label: 'Frozen', bg: 'bg-blue-100 text-blue-700 border-blue-200' };
    }
    if (daysLeft <= 0 || member.status === 'expired') {
      return { label: 'Expired', bg: 'bg-red-100 text-red-700 border-red-200' };
    }
    if (daysLeft <= 15) {
      return { label: `${daysLeft}d left`, bg: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { label: 'Active', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl z-40">
      {/* Search Bar Input Box */}
      <div
        className={`relative flex items-center w-full rounded-2xl transition-all duration-200 border bg-white/80 backdrop-blur-md shadow-sm ${
          isFocused
            ? 'border-[#0052FF] ring-4 ring-[#0052FF]/10 shadow-lg bg-white'
            : 'border-slate-200/80 hover:border-slate-300 hover:bg-white'
        }`}
      >
        <div className="pl-4 text-slate-400 flex items-center justify-center pointer-events-none">
          <Search size={18} className={isFocused ? 'text-[#0052FF]' : 'text-slate-400'} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search member by ID, Name, Phone Number..."
          className="w-full py-3 pl-3 pr-24 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />

        <div className="absolute right-3 flex items-center gap-2">
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={15} />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-400 select-none">
              <Command size={10} />
              <span>K</span>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Results Dropdown */}
      <AnimatePresence>
        {isFocused && query.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 divide-y divide-slate-100 max-h-[460px] overflow-y-auto"
          >
            {/* Header info bar */}
            <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#0052FF]" />
                Members found ({filteredMembers.length})
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Use ↑ ↓ to navigate, Enter to view</span>
            </div>

            {/* Results List */}
            {filteredMembers.length > 0 ? (
              <div className="py-1">
                {filteredMembers.map((member: any, index: number) => {
                  const status = getStatusBadge(member);
                  const isSelected = index === selectedIndex;
                  const safePhone = member.phone || member.mobile || member.whatsapp || 'No Phone';
                  const safeId = member.clientId || member.customId || (member.memberId && !member.memberId.startsWith('AZ-2026-') ? member.memberId : null) || member.biometricId || member.id;

                  return (
                    <div
                      key={member.id || index}
                      onClick={() => handleMemberClick(member)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#0052FF]/5 border-l-4 border-[#0052FF]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Member Avatar */}
                        <div className="relative shrink-0">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#d4ff00]/40 text-slate-800 font-black text-xs flex items-center justify-center border border-slate-200">
                              {getInitials(member.name || 'Member')}
                            </div>
                          )}
                        </div>

                        {/* Member Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-900 truncate">
                              {member.name || 'Unnamed Member'}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                              {safeId}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1 truncate font-mono">
                              <Phone size={11} className="text-slate-400 shrink-0" />
                              {safePhone}
                            </span>
                            {member.plan && (
                              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 truncate">
                                • {member.plan}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Status + Action */}
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.bg}`}
                        >
                          {status.label}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/members/${member.id || member.memberId}`);
                            setIsFocused(false);
                          }}
                          title="View Full 10-Tab Profile"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#0052FF] hover:bg-[#0052FF]/10 transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <User size={20} />
                </div>
                <p className="text-sm font-bold text-slate-700">No member found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  No matching ID, name, or phone number found for <span className="font-semibold text-slate-700">"{query}"</span>.
                </p>
                <button
                  onClick={() => {
                    setIsFocused(false);
                    router.push('/dashboard/members?action=new');
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0052FF] text-white text-xs font-bold shadow-md hover:bg-blue-700 transition-all cursor-pointer border-none"
                >
                  <UserPlus size={14} />
                  <span>Add New Member</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member Drawer Popover on Selection */}
      {selectedMember && (
        <MemberDrawer
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onViewProfile={(m) => {
            setSelectedMember(null);
            router.push(`/dashboard/members/${m.id || m.memberId}`);
          }}
          onCall={(m) => {
            if (m.phone) window.open(`tel:${m.phone}`, '_self');
          }}
          onMessage={(m) => {
            if (m.phone) {
              const cleanPhone = m.phone.replace(/\D/g, '');
              window.open(`https://wa.me/${cleanPhone}`, '_blank');
            }
          }}
        />
      )}
    </div>
  );
}
