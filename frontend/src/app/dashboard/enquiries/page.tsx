'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, UserCheck, Search, Filter, PhoneCall, DollarSign,
  TrendingUp, Activity, UserMinus
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import LeadDrawer from './components/LeadDrawer';
import FollowUpModal from './components/FollowUpModal';
import { formatCurrency } from '@/lib/utils';

export default function CRMEnquiriesDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [followUpLead, setFollowUpLead] = useState<any | null>(null);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeads(data);
      setFilteredLeads(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredLeads(leads);
      return;
    }
    const lowerQ = searchQuery.toLowerCase();
    const filtered = leads.filter(l => 
      (l.name && l.name.toLowerCase().includes(lowerQ)) ||
      (l.phone && l.phone.includes(lowerQ)) ||
      (l.status && l.status.toLowerCase().includes(lowerQ))
    );
    setFilteredLeads(filtered);
  }, [searchQuery, leads]);

  const openDrawer = (lead: any) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const openFollowUp = (lead: any) => {
    setFollowUpLead(lead);
    setIsFollowUpModalOpen(true);
    // If opening from drawer, you might want to keep the drawer open or close it
    // We'll keep it open but the modal will overlay
  };

  // KPIs
  const totalEnquiries = leads.length;
  const todayEnquiries = leads.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length;
  const pendingFollowUp = leads.filter(l => l.status !== 'Converted' && l.status !== 'Lost').length;
  const convertedCount = leads.filter(l => l.status === 'Converted').length;
  const lostCount = leads.filter(l => l.status === 'Lost').length;
  const avgConversion = totalEnquiries > 0 ? ((convertedCount / totalEnquiries) * 100).toFixed(1) : '0.0';

  const statusColors: any = {
    'New': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Contacted': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    'Interested': 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
    'Trial Booked': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Visited': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'Negotiation': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'Converted': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Lost': 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-poppins selection:bg-brand-primary/30">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-brand-primary" />
            Lead Management
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Manage your sales pipeline and track enquiry conversions.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search leads..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary transition-colors w-64"
            />
          </div>
          <button className="p-2.5 bg-slate-900 border border-white/10 rounded-xl hover:bg-slate-800 transition-colors">
            <Filter className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Enquiries', value: totalEnquiries, icon: Users, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
          { label: 'Today\'s Enquiries', value: todayEnquiries, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Pending Follow-up', value: pendingFollowUp, icon: PhoneCall, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Converted Members', value: convertedCount, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Lost Leads', value: lostCount, icon: UserMinus, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Conversion Rate', value: `${avgConversion}%`, icon: TrendingUp, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
        ].map((kpi, i) => (
          <div key={i} className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:bg-slate-800/50 transition-colors">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-bold text-white group-hover:text-brand-primary transition-colors">{kpi.value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${kpi.bg}`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* CRM Table */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-black/40 text-slate-400 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Lead Info</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Contact</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Goal & Plan</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Next Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLeads.map((lead, i) => (
                <motion.tr 
                  key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => openDrawer(lead)}
                  className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name}`} 
                        className="w-10 h-10 rounded-xl bg-black border border-white/10"
                        alt={lead.name}
                      />
                      <div>
                        <div className="font-semibold text-white group-hover:text-brand-primary transition-colors">{lead.name}</div>
                        <div className="text-xs text-slate-500">ID: #{lead.id.slice(0,6).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{lead.phone}</div>
                    {lead.email && <div className="text-xs text-slate-500">{lead.email}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white">{lead.goal || '-'}</div>
                    <div className="text-xs text-slate-500">{lead.preferredPlan || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusColors[lead.status] || statusColors['New']}`}>
                      {lead.status || 'New'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {lead.nextFollowUp ? (
                      <div className="text-amber-400 text-xs font-medium bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1 w-max">
                        <PhoneCall className="w-3 h-3" />
                        {new Date(lead.nextFollowUp).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs">Not scheduled</span>
                    )}
                  </td>
                </motion.tr>
              ))}
              
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No leads found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LeadDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        lead={selectedLead} 
        onFollowUpClick={openFollowUp}
      />

      <FollowUpModal 
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        lead={followUpLead}
      />

    </div>
  );
}
