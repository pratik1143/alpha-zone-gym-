'use client';

import React, { useState, useEffect } from 'react';
import { Search, Phone, MessageSquare, Trash2, ArrowRight, RefreshCw, HelpCircle, MapPin, Download } from 'lucide-react';
import { useGymStore } from '@/store';
import { formatDate, getInitials, daysUntilExpiry } from '@/lib/utils';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';

export default function ExpiredPage() {
  const { members, fetchMembers, updateMember, deleteMember } = useGymStore() as any;
  const [search, setSearch] = useState('');
  
  // Follow-up modal state
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [followupDate, setFollowupDate] = useState('');
  const [followupTime, setFollowupTime] = useState('');
  const [followupRemarks, setFollowupRemarks] = useState('');
  const [followupAssignedTo, setFollowupAssignedTo] = useState('Admin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Expired and Lost members
  const expiredMembers = members.filter((m: any) => {
    const status = String(m.status || '').toLowerCase();
    if (status === 'expired' || status === 'lost') return true;
    
    // Fallback client-side expiry check
    if (!m.expiryDate) return false;
    const expiryTime = new Date(m.expiryDate).getTime();
    const nowTime = new Date().getTime();
    return expiryTime < nowTime && status !== 'frozen' && status !== 'lifetime' && status !== 'enquiry';
  });

  const filteredExpired = expiredMembers.filter((m: any) => {
    return m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search);
  });

  const getDaysSinceExpiry = (expiryDateStr: string) => {
    if (!expiryDateStr) return 0;
    const exp = new Date(expiryDateStr);
    const today = new Date();
    const diffTime = today.getTime() - exp.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleRenew = async (member: any) => {
    const confirmRenewal = confirm(`Renew membership for ${member.name} by extending it for 30 days?`);
    if (!confirmRenewal) return;
    try {
      const newExpiry = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
      await updateMember(member.id, {
        status: 'active',
        expiryDate: newExpiry,
        daysLeft: 30
      });
      toast.success(`Membership renewed successfully for ${member.name}!`);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to renew membership');
    }
  };

  const handleSendWhatsApp = (member: any) => {
    const msg = `Hi ${member.name}, your membership at Alpha Zone Gym expired on ${formatDate(member.expiryDate)}. Please reach out or visit the CRM page to renew your subscription!`;
    const encoded = encodeURIComponent(msg);
    const link = `https://wa.me/91${member.phone.replace(/[^0-9]/g, '')}?text=${encoded}`;
    window.open(link, '_blank');
  };

  const handleDelete = async (member: any) => {
    const confirmDelete = confirm(`Are you absolutely sure you want to delete ${member.name} permanently?`);
    if (!confirmDelete) return;
    try {
      await deleteMember(member.id);
      toast.success(`${member.name} deleted successfully.`);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete record');
    }
  };

  const handleOpenFollowup = (member: any) => {
    setSelectedMember(member);
    setFollowupDate('');
    setFollowupTime('');
    setFollowupRemarks('');
    setShowFollowupModal(true);
  };

  const handleScheduleFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupDate || !followupTime || !selectedMember) {
      toast.error('Please select date and time');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const scheduledDateTime = new Date(`${followupDate}T${followupTime}`);
      
      await addDoc(collection(db, 'followups'), {
        enquiryId: null,
        memberId: selectedMember.id,
        employeeId: null,
        type: 'Renewal',
        priority: 'High',
        title: `Renewal Follow-up: ${selectedMember.name}`,
        description: followupRemarks || `Follow-up scheduled for expired member ${selectedMember.name}`,
        assignedTo: followupAssignedTo,
        scheduledDate: followupDate,
        scheduledTime: followupTime,
        scheduledTimestamp: scheduledDateTime.getTime(),
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      toast.success('Follow-up scheduled successfully!');
      setShowFollowupModal(false);
    } catch (err: any) {
      toast.error('Failed to schedule follow-up: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 w-full text-slate-800 text-left">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-display flex items-center gap-2">
            CRM <ArrowRight size={18} className="text-red-500" /> Expired Memberships
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {expiredMembers.length} expired gym memberships requiring urgent renewal follow-up.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Expired', value: expiredMembers.length, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Expired Today', value: expiredMembers.filter((m: any) => getDaysSinceExpiry(m.expiryDate) === 0).length, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Lost (>90d)', value: expiredMembers.filter((m: any) => getDaysSinceExpiry(m.expiryDate) > 90).length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Recovery Rate', value: '12%', color: 'text-emerald-500', bg: 'bg-emerald-50' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.bg} ${kpi.color}`}>
              <HelpCircle size={24} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</div>
              <div className="text-2xl font-black text-slate-800">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder="Search expired members..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-500 transition-colors" 
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-4 w-12"><input type="checkbox" className="rounded border-slate-300" /></th>
                <th className="px-4 py-4">Member</th>
                <th className="px-4 py-4">Membership</th>
                <th className="px-4 py-4 text-center">Overdue Days</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpired.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No expired members found.
                  </td>
                </tr>
              ) : (
                filteredExpired.map((member: any) => {
                  const daysSince = getDaysSinceExpiry(member.expiryDate);
                  const isLost = daysSince > 90 || member.status === 'lost';

                  return (
                    <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4"><input type="checkbox" className="rounded border-slate-300" /></td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                            {getInitials(member.name)}
                          </div>
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
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider bg-slate-100 text-slate-600">
                          {member.plan || 'Standard'}
                        </span>
                        <div className="text-xs text-slate-500 mt-1.5 font-medium">Exp: {formatDate(member.expiryDate)}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="text-base font-bold text-red-500">{daysSince} Days</div>
                        <div className="text-[10px] font-medium text-red-400">Overdue</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                          isLost ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {isLost ? 'Lost Member' : 'Expired'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleSendWhatsApp(member)} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors" title="WhatsApp">
                            <MessageSquare size={16} />
                          </button>
                          <button onClick={() => window.open(`tel:${member.phone}`)} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors" title="Call">
                            <Phone size={16} />
                          </button>
                          <button onClick={() => handleOpenFollowup(member)} className="flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs transition-colors">
                            Follow-up
                          </button>
                          <button onClick={() => handleRenew(member)} className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors">
                            <RefreshCw size={14} /> Renew
                          </button>
                          <button onClick={() => handleDelete(member)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Follow-up Modal */}
      {showFollowupModal && selectedMember && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-amber-500 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                Schedule Follow-up
              </h3>
              <button onClick={() => setShowFollowupModal(false)} className="text-amber-100 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleScheduleFollowup} className="p-6 flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-1">Member</p>
                <p className="text-base font-bold text-slate-900">{selectedMember.name} <span className="text-slate-400 font-medium text-sm">({selectedMember.phone})</span></p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date<span className="text-red-500">*</span></label>
                  <input type="date" required value={followupDate} onChange={e => setFollowupDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-500 transition-colors cursor-pointer font-bold text-slate-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Time<span className="text-red-500">*</span></label>
                  <input type="time" required value={followupTime} onChange={e => setFollowupTime(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-500 transition-colors cursor-pointer font-bold text-slate-700" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned To</label>
                <select value={followupAssignedTo} onChange={e => setFollowupAssignedTo(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-500 transition-colors cursor-pointer font-semibold text-slate-700">
                  <option>Admin</option>
                  <option>Manager</option>
                  <option>Receptionist</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Remarks</label>
                <textarea rows={3} value={followupRemarks} onChange={e => setFollowupRemarks(e.target.value)} placeholder="E.g. Called and said will renew tomorrow..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-500 transition-colors resize-none placeholder-slate-400 font-medium"></textarea>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowFollowupModal(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-bold transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-sm transition-colors uppercase tracking-wide">
                  {isSubmitting ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
