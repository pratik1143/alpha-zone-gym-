'use client';

import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Search, Filter, MoreHorizontal, Phone, MessageSquare, MapPin, Edit, RefreshCw, Snowflake, Trash2, Eye, Fingerprint, ChevronLeft, ChevronRight } from 'lucide-react';
import { membershipEngine } from '@/lib/engines/membershipEngine';
import { paymentEngine } from '@/lib/engines/paymentEngine';
import { calculateRealAttendance, formatDaysLeft, calculateAge } from '@/lib/utils';
import { useGymStore } from '@/store';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import MemberAvatar from '../../components/MemberAvatar';

interface MembersTableProps {
  members: any[];
  search: string;
  setSearch: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  onSelectMember: (m: any) => void;
  selectedMemberId: string | null;
  onEdit?: (m: any) => void;
  onRenew?: (m: any) => void;
  onFreeze?: (m: any) => void;
  onDelete?: (m: any) => void;
  onMapBiometric?: (m: any) => void;
}

const getDynamicStatus = (m: any) => {
  if (m.status === 'blocked' || m.status === 'blacklisted') return 'blocked';
  if (m.status === 'frozen') return 'frozen';
  const days = membershipEngine.calculateDaysLeft(m.expiryDate);
  if (days <= 0) return 'expired';
  if (days <= 7) return 'urgent';
  if (days <= 30) return 'expiring_soon';
  return 'active';
};

const getRiskLevel = (member: any) => {
  const days = membershipEngine.calculateDaysLeft(member.expiryDate);
  const risk = membershipEngine.calculateRenewalRisk(days);
  if (days < 0) return { label: 'High', color: 'text-red-500', value: '95%' };
  const config: Record<string, { color: string; value: string }> = {
    Critical: { color: 'text-red-500', value: '95%' },
    High:     { color: 'text-red-500', value: '85%' },
    Medium:   { color: 'text-orange-500', value: '65%' },
    Low:      { color: 'text-emerald-500', value: '25%' },
  };
  return { label: risk, ...(config[risk] || config.Low) };
};

// Memoized individual row component for smooth 60fps rendering
const MemberTableRow = memo(function MemberTableRow({
  member,
  isSelected,
  onRowClick,
  onMapBiometric,
  onEdit,
  onSelectMember,
  onRenew,
  onFreeze,
  onDelete
}: {
  member: any;
  isSelected: boolean;
  onRowClick: () => void;
  onMapBiometric?: (m: any) => void;
  onEdit?: (m: any) => void;
  onSelectMember: (m: any) => void;
  onRenew?: (m: any) => void;
  onFreeze?: (m: any) => void;
  onDelete?: (m: any) => void;
}) {
  const ds = getDynamicStatus(member);
  const risk = getRiskLevel(member);
  const attScore = calculateRealAttendance(member.joinDate, member.attendanceCount || 0);
  const hasPunched = (member.attendanceCount && member.attendanceCount > 0);
  
  const attColor = !hasPunched 
    ? '#cbd5e1'
    : attScore > 75 
      ? '#10b981'
      : attScore > 40 
        ? '#f59e0b'
        : '#ef4444';

  const statusConfig = {
    active: { label: 'Healthy', dot: 'bg-emerald-500', text: 'text-emerald-600 bg-emerald-50/50 px-2 py-0.5 rounded-full border border-emerald-100' },
    expiring_soon: { label: 'Renew Soon', dot: 'bg-orange-500', text: 'text-orange-600 bg-orange-50/50 px-2 py-0.5 rounded-full border border-orange-100' },
    urgent: { label: 'Urgent', dot: 'bg-red-500', text: 'text-red-600 bg-red-50/50 px-2 py-0.5 rounded-full border border-red-100' },
    expired: { label: 'Expired', dot: 'bg-slate-400', text: 'text-slate-500 bg-slate-50/50 px-2 py-0.5 rounded-full border border-slate-150' },
    blocked: { label: 'Blocked', dot: 'bg-black', text: 'text-white bg-black px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider font-extrabold shadow-sm' },
    frozen: { label: 'Frozen', dot: 'bg-indigo-400', text: 'text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-full border border-indigo-150' },
  }[ds] || { label: member.status, dot: 'bg-slate-400', text: 'text-slate-600' };

  const amountVal = Number(member.amount ?? member.currentAmount ?? member.paidAmount ?? member.price ?? member.totalPaid ?? 0);
  const isPaid = member.paymentStatus === 'paid' || (member.totalPaid && member.totalBilled && member.totalPaid >= member.totalBilled);
  const invoiceTotal = (Number(member.invoiceAmount) || 0) + (Number(member.invoiceGst) || 0);
  const paidTotal    = isPaid ? (invoiceTotal || amountVal) : Number(member.paidAmount || member.totalPaid || 0);
  const payStatus    = isPaid ? 'PAID' : (invoiceTotal > 0
    ? paymentEngine.calculatePaymentStatus(invoiceTotal, paidTotal)
    : (member.paymentStatus === 'pending' ? 'PENDING' : 'PAID'));
  const outstanding  = paymentEngine.calculateOutstandingAmount(invoiceTotal, paidTotal);

  const daysColor = ds === 'expired' ? 'text-slate-400 font-medium' : ds === 'urgent' ? 'text-red-500 font-extrabold' : ds === 'expiring_soon' ? 'text-orange-500 font-bold' : 'text-emerald-600 font-bold';

  return (
    <tr 
      onClick={onRowClick}
      className={`hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/50' : ''}`}
    >
      <td className="px-4 py-4"><input type="checkbox" className="rounded border-slate-300" onClick={e => e.stopPropagation()} /></td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <MemberAvatar member={member} className="w-10 h-10 rounded-full object-cover" />
          <div>
            <div className="font-extrabold text-slate-900 text-sm">{member.name}</div>
            <div className="text-xs font-mono font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
              {member.clientId || member.customId || (member.memberId && !member.memberId.startsWith('AZ-2026-') ? member.memberId : null) || member.biometricId || member.id}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{member.phone}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
              member.plan?.toLowerCase().includes('gold') ? 'bg-amber-100 text-amber-700' :
              member.plan?.toLowerCase().includes('platinum') ? 'bg-purple-100 text-purple-700' :
              member.plan?.toLowerCase().includes('pro') ? 'bg-emerald-100 text-emerald-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {member.plan || 'Standard'}
            </span>
            {amountVal > 0 && (
              <span className="text-xs font-black text-slate-800 font-mono">₹{amountVal.toLocaleString('en-IN')}</span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">Exp: {new Date(member.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      </td>
      <td className="px-4 py-4">
        {member.trainer ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
              <img src={'https://i.pravatar.cc/150?u=' + member.trainer} alt="trainer" loading="lazy" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">{member.trainer}</div>
              <div className="text-[10px] text-slate-500">Strength</div>
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Unassigned</span>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="flex justify-center">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="3" />
              <circle cx="18" cy="18" r="16" fill="none" stroke={attColor} strokeWidth="3" strokeDasharray="100" strokeDashoffset={100 - attScore} strokeLinecap="round" />
            </svg>
            <div className="flex flex-col items-center justify-center leading-none">
              <span className="text-[10px] font-bold" style={{ color: attColor }}>{attScore}%</span>
              {!hasPunched ? (
                 <span className="text-[6px] text-slate-400 mt-0.5">No Activity</span>
              ) : (
                 <span className="text-[7px] text-slate-400 mt-0.5">{member.attendanceCount} visits</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <div className={`text-xs ${daysColor}`}>
          {formatDaysLeft(member.expiryDate)}
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <div className={`text-xs font-bold ${risk.color}`}>{risk.label}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">{risk.value}</div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-1.5 justify-start">
          {ds !== 'blocked' && <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />}
          <span className={`text-[11px] font-bold ${statusConfig.text}`}>
            {statusConfig.label}
          </span>
        </div>
      </td>
      <td className="px-4 py-4">
        {payStatus === 'PAID' ? (
          <div className="flex flex-col items-start gap-1">
            <span className="badge-green text-[9px] uppercase font-black px-2 py-0.5">PAID</span>
            {amountVal > 0 && (
              <span className="text-xs font-black text-slate-800 font-mono">₹{amountVal.toLocaleString('en-IN')}</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-1">
            <span className="badge-yellow text-[9px] uppercase font-black px-2 py-0.5">
              {payStatus === 'PARTIAL' ? 'Partial' : 'Pending'}
            </span>
            {amountVal > 0 && (
              <span className="text-xs font-black text-slate-800 font-mono">₹{amountVal.toLocaleString('en-IN')}</span>
            )}
            {outstanding > 0 && (
              <span className="text-[9px] text-amber-600 font-black">₹{outstanding.toLocaleString('en-IN')} due</span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <button 
            title="Call Member"
            onClick={() => window.open(`tel:${member.phone}`)}
            className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer border-0"
          >
            <Phone size={14} />
          </button>
          <button 
            title="Send WhatsApp"
            onClick={() => window.open(`https://wa.me/91${(member.phone || '').replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(member.name || '')}%20👋,%20greeting%20from%20Alpha%20Zone%20Gym!`)}
            className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer border-0"
          >
            <MessageSquare size={14} />
          </button>
          <button 
            title={`Map Biometric ID (Current: #${member.biometricId || 'Unmapped'})`}
            onClick={() => onMapBiometric ? onMapBiometric(member) : null}
            className="p-1.5 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer border-0"
          >
            <Fingerprint size={14} />
          </button>
          <button 
            title="Edit Member Profile"
            onClick={() => onEdit ? onEdit(member) : onSelectMember(member)}
            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer border-0"
          >
            <Edit size={14} />
          </button>
          <button 
            title="Renew / Upgrade Membership"
            onClick={() => onRenew ? onRenew(member) : null}
            className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer border-0"
          >
            <RefreshCw size={14} />
          </button>
          <button 
            title={member.status === 'frozen' ? 'Unfreeze Status' : 'Freeze Status'}
            onClick={() => onFreeze ? onFreeze(member) : null}
            className="p-1.5 text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors cursor-pointer border-0"
          >
            <Snowflake size={14} />
          </button>
          <button 
            title="Delete Member"
            onClick={() => onDelete ? onDelete(member) : null}
            className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer border-0"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
});

export default function MembersTable({ 
  members, search, setSearch, statusFilter, setStatusFilter, onSelectMember, selectedMemberId,
  onEdit, onRenew, onFreeze, onDelete, onMapBiometric
}: MembersTableProps) {
  const router = useRouter();

  // Local search state with 300ms debounce
  const [localSearch, setLocalSearch] = useState(search);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch);
        setPage(1);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, search, setSearch]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const counts = useMemo(() => {
    let all = members.length;
    let active = 0;
    let expired = 0;
    let frozen = 0;
    let pt = 0;

    members.forEach(m => {
      const ds = getDynamicStatus(m);
      if (ds === 'active' || ds === 'expiring_soon' || ds === 'urgent') active++;
      else if (ds === 'expired') expired++;
      else if (ds === 'frozen') frozen++;
      if (m.trainer) pt++;
    });

    return { all, active, expired, frozen, pt };
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digitsOnly = q.replace(/\D/g, '');

    return members.filter(m => {
      if (q) {
        const nameMatch = (m.name || m.fullName || '').toLowerCase().includes(q);
        const idMatch = (
          (m.memberId || '').toLowerCase().includes(q) ||
          (m.id || '').toLowerCase().includes(q) ||
          (m.customId || '').toLowerCase().includes(q) ||
          (m.clientId || '').toLowerCase().includes(q) ||
          (m.biometricId || '').toLowerCase().includes(q)
        );
        const addressStr = `${m.address || ''} ${m.city || ''} ${m.locality || ''} ${m.location || ''} ${m.branch || ''}`.toLowerCase();
        const addressMatch = addressStr.includes(q);

        const computedAge = m.age ?? calculateAge(m.dob || m.dateOfBirth);
        let ageMatch = false;
        if (computedAge !== null && computedAge !== undefined) {
          const ageStr = String(computedAge);
          if (q === ageStr || q.startsWith(`age ${ageStr}`) || q.includes(`${ageStr} yr`) || q.includes(`${ageStr} year`)) {
            ageMatch = true;
          } else if (digitsOnly.length > 0 && digitsOnly.length <= 3 && digitsOnly === ageStr) {
            ageMatch = true;
          }
        }

        let phoneMatch = false;
        if (digitsOnly.length >= 2) {
          const rawPhone = (m.phone || m.mobile || m.whatsapp || '').replace(/\D/g, '');
          phoneMatch = rawPhone.includes(digitsOnly);
        }
        const emailMatch = (m.email || '').toLowerCase().includes(q);
        const genderMatch = (m.gender || '').toLowerCase().includes(q);

        const ms = nameMatch || idMatch || addressMatch || ageMatch || phoneMatch || emailMatch || genderMatch;
        if (!ms) return false;
      }

      const dynStatus = getDynamicStatus(m);
      if (statusFilter === 'active') return (dynStatus === 'active' || dynStatus === 'expiring_soon' || dynStatus === 'urgent');
      if (statusFilter === 'expired') return dynStatus === 'expired';
      if (statusFilter === 'frozen') return dynStatus === 'frozen';
      if (statusFilter === 'pt') return !!m.trainer;
      return true;
    });
  }, [members, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
      
      {/* Top Filter Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={localSearch} 
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Search by name, phone or member ID..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors" 
          />
        </div>
        <div className="flex gap-2">
          <select className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-indigo-500">
            <option>All Branches</option>
          </select>
          <select className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-indigo-500">
            <option>All Trainers</option>
          </select>
          <select className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-indigo-500">
            <option>All Memberships</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Filter size={14} /> More Filters
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 border-b border-slate-100 flex items-center justify-between overflow-x-auto">
        <div className="flex space-x-1">
          {[
            { id: 'all', label: 'All Members', count: counts.all },
            { id: 'active', label: 'Active', count: counts.active },
            { id: 'expired', label: 'Expired', count: counts.expired },
            { id: 'frozen', label: 'Frozen', count: counts.frozen },
            { id: 'pt', label: 'PT Members', count: counts.pt },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                statusFilter === tab.id 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.label} <span className="text-slate-400 font-normal">({tab.count})</span>
            </button>
          ))}
        </div>
        <button className="text-sm font-semibold text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
          Bulk Actions &or;
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
            <tr>
              <th className="px-4 py-4 w-12"><input type="checkbox" className="rounded border-slate-300" /></th>
              <th className="px-4 py-4">Member</th>
              <th className="px-4 py-4">Membership</th>
              <th className="px-4 py-4">Trainer</th>
              <th className="px-4 py-4 text-center">Attendance</th>
              <th className="px-4 py-4 text-center">Days Left</th>
              <th className="px-4 py-4 text-center">Renewal Risk</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Payment</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedMembers.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                  No members found matching your search criteria.
                </td>
              </tr>
            ) : (
              paginatedMembers.map(member => (
                <MemberTableRow
                  key={member.id}
                  member={member}
                  isSelected={selectedMemberId === member.id}
                  onRowClick={() => router.push(`/dashboard/members/${member.id}`)}
                  onMapBiometric={onMapBiometric}
                  onEdit={onEdit}
                  onSelectMember={onSelectMember}
                  onRenew={onRenew}
                  onFreeze={onFreeze}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
        <div>
          Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} members
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button 
              disabled={currentPage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 3 + i;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                    currentPage === pageNum
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button 
              disabled={currentPage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span>Per page:</span>
            <select 
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded bg-white font-medium text-slate-700 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

    </div>
  );
}
