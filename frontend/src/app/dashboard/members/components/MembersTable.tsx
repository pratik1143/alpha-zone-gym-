'use client';

import React, { useState } from 'react';
import { Search, Filter, MoreHorizontal, Phone, MessageSquare, MapPin } from 'lucide-react';
import { daysUntilExpiry, calculateRealAttendance, formatDaysLeft } from '@/lib/utils';
import { useGymStore } from '@/store';
import toast from 'react-hot-toast';
interface MembersTableProps {
  members: any[];
  search: string;
  setSearch: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  onSelectMember: (m: any) => void;
  selectedMemberId: string | null;
}

export default function MembersTable({ members, search, setSearch, statusFilter, setStatusFilter, onSelectMember, selectedMemberId }: MembersTableProps) {
  const getDynamicStatus = (m: any) => {
    if (m.status === 'blocked' || m.status === 'blacklisted') return 'blocked';
    if (m.status === 'frozen') return 'frozen';
    const days = daysUntilExpiry(m.expiryDate);
    if (days < 0) return 'expired';
    if (days <= 7) return 'urgent';
    if (days <= 30) return 'expiring_soon';
    return 'active';
  };

  const counts = {
    all: members.length,
    active: members.filter(m => getDynamicStatus(m) === 'active').length,
    expiring: members.filter(m => {
      const ds = getDynamicStatus(m);
      return ds === 'expiring_soon' || ds === 'urgent';
    }).length,
    expired: members.filter(m => getDynamicStatus(m) === 'expired').length,
    frozen: members.filter(m => getDynamicStatus(m) === 'frozen').length,
    pt: members.filter(m => m.trainer).length,
  };

  const filtered = members.filter(m => {
    const ms = m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search) || (m.memberId || m.id).toLowerCase().includes(search.toLowerCase());
    const dynStatus = getDynamicStatus(m);
    
    let st = statusFilter === 'all';
    if (statusFilter === 'active') st = dynStatus === 'active';
    else if (statusFilter === 'expiring') st = (dynStatus === 'expiring_soon' || dynStatus === 'urgent');
    else if (statusFilter === 'expired') st = dynStatus === 'expired';
    else if (statusFilter === 'frozen') st = dynStatus === 'frozen';
    
    const pt = statusFilter === 'pt' ? !!m.trainer : true;
    return ms && (statusFilter === 'pt' ? pt : st);
  });

  const getRiskLevel = (member: any) => {
    const days = daysUntilExpiry(member.expiryDate);
    if (days < 0) return { label: 'High', color: 'text-red-500', value: '95%' };
    if (days <= 7) return { label: 'High', color: 'text-red-500', value: '85%' };
    if (days <= 30) return { label: 'Medium', color: 'text-orange-500', value: '65%' };
    return { label: 'Low', color: 'text-emerald-500', value: '25%' };
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
      
      {/* Top Filter Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)}
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
            { id: 'expiring', label: 'Expiring', count: counts.expiring },
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
            {filtered.map(member => {
              const days = daysUntilExpiry(member.expiryDate);
              const risk = getRiskLevel(member);
              const isSelected = selectedMemberId === member.id;
              
              const attScore = calculateRealAttendance(member.joinDate, member.attendanceCount || 0);
              const hasPunched = (member.attendanceCount && member.attendanceCount > 0);
              
              const attColor = !hasPunched 
                ? '#cbd5e1' // Gray for no attendance
                : attScore > 75 
                  ? '#10b981' // Green
                  : attScore > 40 
                    ? '#f59e0b' // Yellow
                    : '#ef4444'; // Red

              return (
                <tr 
                  key={member.id} 
                  onClick={() => onSelectMember(member)}
                  className={`hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/50' : ''}`}
                >
                  <td className="px-4 py-4"><input type="checkbox" className="rounded border-slate-300" onClick={e => e.stopPropagation()} /></td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <img src={member.avatar || 'https://i.pravatar.cc/150?u=' + member.id} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <div className="font-bold text-slate-900">{member.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          {member.memberId || member.id}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{member.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                      member.plan?.toLowerCase().includes('gold') ? 'bg-amber-100 text-amber-700' :
                      member.plan?.toLowerCase().includes('platinum') ? 'bg-purple-100 text-purple-700' :
                      member.plan?.toLowerCase().includes('pro') ? 'bg-emerald-100 text-emerald-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {member.plan || 'Standard'}
                    </span>
                    <div className="text-xs text-slate-500 mt-1.5 font-medium">Exp: {new Date(member.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  </td>
                  <td className="px-4 py-4">
                    {member.trainer ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
                          <img src={'https://i.pravatar.cc/150?u=' + member.trainer} alt="trainer" className="w-full h-full object-cover" />
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
                    {(() => {
                      const ds = getDynamicStatus(member);
                      const color = ds === 'expired' ? 'text-slate-400 font-medium' : ds === 'urgent' ? 'text-red-500 font-extrabold' : ds === 'expiring_soon' ? 'text-orange-500 font-bold' : 'text-emerald-600 font-bold';
                      return (
                        <div className={`text-xs ${color}`}>
                          {formatDaysLeft(member.expiryDate)}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className={`text-xs font-bold ${risk.color}`}>{risk.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{risk.value}</div>
                  </td>
                  <td className="px-4 py-4">
                    {(() => {
                      const ds = getDynamicStatus(member);
                      const config = {
                        active: { label: 'Healthy', dot: 'bg-emerald-500', text: 'text-emerald-600 bg-emerald-50/50 px-2 py-0.5 rounded-full border border-emerald-100' },
                        expiring_soon: { label: 'Renew Soon', dot: 'bg-orange-500', text: 'text-orange-600 bg-orange-50/50 px-2 py-0.5 rounded-full border border-orange-100' },
                        urgent: { label: 'Urgent', dot: 'bg-red-500', text: 'text-red-600 bg-red-50/50 px-2 py-0.5 rounded-full border border-red-100' },
                        expired: { label: 'Expired', dot: 'bg-slate-400', text: 'text-slate-500 bg-slate-50/50 px-2 py-0.5 rounded-full border border-slate-150' },
                        blocked: { label: 'Blocked', dot: 'bg-black', text: 'text-white bg-black px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider font-extrabold shadow-sm' },
                        frozen: { label: 'Frozen', dot: 'bg-indigo-400', text: 'text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-full border border-indigo-150' },
                      }[ds] || { label: member.status, dot: 'bg-slate-400', text: 'text-slate-600' };

                      return (
                        <div className="flex items-center gap-1.5 justify-start">
                          {ds !== 'blocked' && <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
                          <span className={`text-[11px] font-bold ${config.text}`}>
                            {config.label}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-4">
                    {member.paymentStatus === 'pending' ? (
                      <div className="flex flex-col items-start gap-1">
                        <span className="badge-yellow text-[9px] uppercase font-black px-2 py-0.5">Pending</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if(window.confirm('Mark payment as paid and send invoice to client?')) {
                               useGymStore.getState().markPaymentPaid(member.id);
                               toast.success('Payment marked as paid!');
                            }
                          }}
                          className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold px-2 py-1 rounded cursor-pointer transition-colors"
                        >
                          Mark Paid
                        </button>
                      </div>
                    ) : (
                      <span className="badge-green text-[9px] uppercase font-black px-2 py-0.5">Paid</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" onClick={(e) => { e.stopPropagation(); }}>
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
        <div>Showing 1 to {filtered.length} of {counts.all} members</div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button className="px-2 py-1 border border-slate-200 rounded text-slate-400 hover:bg-slate-50">&lt;</button>
            <button className="px-2.5 py-1 bg-indigo-50 text-indigo-600 font-bold rounded">1</button>
            <button className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50">2</button>
            <button className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50">3</button>
            <span>...</span>
            <button className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50">30</button>
            <button className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50">&gt;</button>
          </div>
          <div className="ml-4 flex items-center gap-2">
            <span>Rows per page</span>
            <select className="px-2 py-1 border border-slate-200 rounded bg-white">
              <option>10</option>
              <option>20</option>
              <option>50</option>
            </select>
          </div>
        </div>
      </div>

    </div>
  );
}
