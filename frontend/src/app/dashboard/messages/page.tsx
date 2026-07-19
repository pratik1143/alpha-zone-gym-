'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Mail, Phone, Calendar, Search, Filter, Trash2, 
  CheckCircle2, Clock, User, Target, ArrowUpRight, Send, CheckCheck,
  Sparkles, RefreshCw, ChevronRight, AlertCircle, Eye, EyeOff
} from 'lucide-react';

export default function WebMessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [goalFilter, setGoalFilter] = useState('All');
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Direct Reply Modal
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Realtime Firestore Listener & LocalStorage Sync
  useEffect(() => {
    let unsub = () => {};
    // Load local cache first
    try {
      const cached = localStorage.getItem('alphazone_messages');
      if (cached) setMessages(JSON.parse(cached));
    } catch (e) {}

    try {
      const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
      unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setMessages(data);
        try { localStorage.setItem('alphazone_messages', JSON.stringify(data)); } catch (e) {}
        setLoading(false);
      }, (err) => {
        // Silently handle Firestore Security Rules error without throwing overlay console error
        console.warn("Firestore permissions note:", err.message);
        setLoading(false);
      });
    } catch (e: any) {
      console.warn("Firestore listener note:", e.message);
      setLoading(false);
    }
    return () => unsub();
  }, []);

  // Filtered Messages logic
  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      // Search filter
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        msg.name?.toLowerCase().includes(q) ||
        msg.phone?.includes(q) ||
        msg.email?.toLowerCase().includes(q) ||
        msg.goal?.toLowerCase().includes(q) ||
        msg.message?.toLowerCase().includes(q);

      // Status filter
      const matchesStatus = statusFilter === 'All' || 
        (statusFilter === 'Unread' && (msg.status === 'Unread' || !msg.status)) ||
        (statusFilter === 'Read' && msg.status === 'Read') ||
        (statusFilter === 'Responded' && msg.status === 'Responded');

      // Goal filter
      const matchesGoal = goalFilter === 'All' || msg.goal === goalFilter;

      return matchesSearch && matchesStatus && matchesGoal;
    });
  }, [messages, searchQuery, statusFilter, goalFilter]);

  // Bulk selection handler
  useEffect(() => {
    if (selectAll) {
      setSelectedIds(filteredMessages.map(m => m.id));
    } else {
      setSelectedIds([]);
    }
  }, [selectAll, filteredMessages]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Status updates
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    // 1. Optimistically update local state & LocalStorage
    setMessages(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, status: newStatus } : m);
      try { localStorage.setItem('alphazone_messages', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    if (selectedMessage && selectedMessage.id === id) {
      setSelectedMessage((prev: any) => (prev ? { ...prev, status: newStatus } : null));
    }
    toast.success(`Message marked as ${newStatus}`);

    // 2. Try updating Firestore
    try {
      await updateDoc(doc(db, 'messages', id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.warn('Firestore update permission note: ' + err.message);
    }
  };

  // Single Delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    
    // Optimistic delete
    setMessages(prev => {
      const filtered = prev.filter(m => m.id !== id);
      try { localStorage.setItem('alphazone_messages', JSON.stringify(filtered)); } catch (e) {}
      return filtered;
    });
    if (selectedMessage?.id === id) setSelectedMessage(null);
    toast.success('Message deleted');

    try {
      await deleteDoc(doc(db, 'messages', id));
    } catch (err: any) {
      console.warn('Firestore delete permission note: ' + err.message);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected message(s)?`)) return;
    toast.loading('Deleting selected messages...', { id: 'bulk-delete' });
    try {
      await Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'messages', id))));
      toast.success(`${selectedIds.length} message(s) deleted`, { id: 'bulk-delete' });
      setSelectedIds([]);
      setSelectAll(false);
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message, { id: 'bulk-delete' });
    }
  };

  // Bulk Mark Read
  const handleBulkMarkRead = async () => {
    if (selectedIds.length === 0) return;
    toast.loading('Updating messages...', { id: 'bulk-read' });
    try {
      await Promise.all(selectedIds.map(id => updateDoc(doc(db, 'messages', id), { status: 'Read' })));
      toast.success(`Marked ${selectedIds.length} message(s) as Read`, { id: 'bulk-read' });
      setSelectedIds([]);
      setSelectAll(false);
    } catch (err: any) {
      toast.error('Failed: ' + err.message, { id: 'bulk-read' });
    }
  };

  // Open WhatsApp
  const handleOpenWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text = encodeURIComponent(`Hi ${name}, thank you for reaching out to Alpha Zone Gym! How can we assist you with your fitness goals?`);
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  // Stats calculation
  const totalCount = messages.length;
  const unreadCount = messages.filter(m => m.status === 'Unread' || !m.status).length;
  const respondedCount = messages.filter(m => m.status === 'Responded').length;
  const todayCount = messages.filter(m => {
    if (!m.createdAt) return false;
    const msgDate = new Date(m.createdAt).toDateString();
    return msgDate === new Date().toDateString();
  }).length;

  return (
    <div className="min-h-screen bg-slate-50/80 font-sans p-4 lg:p-8 pb-24">
      
      {/* ─── HEADER TITLE ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Website Messages
            <span className="bg-pink-100 text-pink-700 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} /> LIVE CRM
            </span>
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Inbound inquiries and contact form submissions from the Alpha Zone website.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('All');
              setGoalFilter('All');
            }}
            className="bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm hover:border-slate-300 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw size={14} /> Reset Filters
          </button>
        </div>
      </div>

      {/* ─── KPI METRICS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-[22px] border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 shrink-0">
            <MessageSquare size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-none">{totalCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">Total Inquiries</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[22px] border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <AlertCircle size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600 leading-none">{unreadCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">Unread Pending</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[22px] border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCheck size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 leading-none">{respondedCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">Responded</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[22px] border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-600 leading-none">{todayCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">New Today</div>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT / MAIN MESSAGES LIST (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          
          {/* BAR & FILTERS HEADER */}
          <div className="bg-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-[#d4ff00]">
                <MessageSquare size={18} />
              </div>
              <div>
                <h2 className="font-extrabold text-sm tracking-wide">Inbound Submissions</h2>
                <p className="text-[11px] text-slate-400 font-medium">{filteredMessages.length} message(s) found</p>
              </div>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-white/10 text-xs font-bold">
              {['All', 'Unread', 'Read', 'Responded'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    statusFilter === st 
                      ? 'bg-[#d4ff00] text-black shadow-sm font-extrabold' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* SEARCH & SECONDARY FILTERS */}
          <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, email or message..."
                className="w-full pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all placeholder-slate-400"
              />
            </div>

            <select
              value={goalFilter}
              onChange={e => setGoalFilter(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl outline-none cursor-pointer focus:border-pink-500 transition-all"
            >
              <option value="All">All Goals</option>
              <option value="weight-loss">Weight Loss</option>
              <option value="muscle-gain">Muscle Gain</option>
              <option value="general-fitness">General Fitness</option>
              <option value="personal-training">Personal Training</option>
            </select>

            {/* Bulk Action Controls */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkMarkRead}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                >
                  Mark Read ({selectedIds.length})
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                >
                  Delete ({selectedIds.length})
                </button>
              </div>
            )}
          </div>

          {/* MESSAGES LIST TABLE */}
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[650px] custom-scrollbar">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="font-bold text-slate-500 text-sm">Loading web messages...</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <MessageSquare size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-700">No Messages Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  When visitors submit the &quot;Send A Message&quot; enquiry form on your website, their entries will show up here instantly.
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const isUnread = msg.status === 'Unread' || !msg.status;
                const formattedDate = msg.createdAt ? new Date(msg.createdAt).toLocaleString('en-IN', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : 'Just now';

                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-4 transition-all cursor-pointer flex items-start gap-4 hover:bg-slate-50/90 ${
                      isSelected ? 'bg-pink-50/50 border-l-4 border-pink-500' : ''
                    } ${isUnread ? 'bg-amber-50/30 font-semibold' : ''}`}
                  >
                    {/* Checkbox */}
                    <div className="pt-1" onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(msg.id)}
                        onChange={() => toggleSelect(msg.id)}
                        className="w-4 h-4 rounded text-pink-500 border-slate-300 focus:ring-pink-500 cursor-pointer"
                      />
                    </div>

                    {/* Left Icon Avatar */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${
                      isUnread 
                        ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {msg.name ? msg.name.charAt(0).toUpperCase() : 'U'}
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm tracking-tight truncate ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}>
                            {msg.name || 'Anonymous User'}
                          </h4>

                          {/* Status Badge */}
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isUnread 
                              ? 'bg-pink-100 text-pink-700 animate-pulse' 
                              : msg.status === 'Responded'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {msg.status || 'Unread'}
                          </span>
                        </div>

                        <span className="text-[10px] font-bold text-slate-400 shrink-0">
                          {formattedDate}
                        </span>
                      </div>

                      {/* Contact & Goal Bar */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Phone size={11} className="text-slate-400" /> {msg.phone}
                        </span>
                        {msg.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={11} className="text-slate-400" /> {msg.email}
                          </span>
                        )}
                        {msg.goal && (
                          <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                            Goal: {msg.goal}
                          </span>
                        )}
                      </div>

                      {/* Message Snippet */}
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                        {msg.message || 'No additional notes provided.'}
                      </p>
                    </div>

                    {/* Right Quick Actions */}
                    <div className="flex items-center gap-1 shrink-0 pt-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenWhatsApp(msg.phone, msg.name)}
                        className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                        title="Chat on WhatsApp"
                      >
                        <Send size={13} />
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(msg.id, isUnread ? 'Read' : 'Unread')}
                        className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center shadow-sm"
                        title={isUnread ? 'Mark as Read' : 'Mark as Unread'}
                      >
                        {isUnread ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>

                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="w-8 h-8 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                        title="Delete Message"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT / MESSAGE DETAILS CARD (4 cols on lg) */}
        <div className="lg:col-span-4 sticky top-8">
          {selectedMessage ? (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm p-6 space-y-6 text-left"
            >
              {/* Header Details */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                <div>
                  <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider bg-pink-50 px-2.5 py-1 rounded-md">
                    Message Details
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight mt-2">
                    {selectedMessage.name}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock size={12} />
                    {selectedMessage.createdAt ? new Date(selectedMessage.createdAt).toLocaleString('en-IN') : 'N/A'}
                  </p>
                </div>

                <div className="flex gap-1">
                  <button 
                    onClick={() => handleUpdateStatus(selectedMessage.id, selectedMessage.status === 'Responded' ? 'Read' : 'Responded')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedMessage.status === 'Responded' 
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                    }`}
                  >
                    {selectedMessage.status === 'Responded' ? '✓ Responded' : 'Mark Responded'}
                  </button>
                </div>
              </div>

              {/* Contact Cards */}
              <div className="space-y-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                      <Phone size={14} />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Phone Number</div>
                      <div className="text-xs font-black text-slate-800">{selectedMessage.phone}</div>
                    </div>
                  </div>

                  <a 
                    href={`tel:${selectedMessage.phone}`}
                    className="bg-slate-900 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg hover:bg-pink-600 transition-all uppercase"
                  >
                    Call
                  </a>
                </div>

                {selectedMessage.email && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                        <Mail size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Email Address</div>
                        <div className="text-xs font-black text-slate-800 truncate max-w-[170px]">{selectedMessage.email}</div>
                      </div>
                    </div>

                    <a 
                      href={`mailto:${selectedMessage.email}`}
                      className="bg-slate-900 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg hover:bg-pink-600 transition-all uppercase"
                    >
                      Email
                    </a>
                  </div>
                )}

                {selectedMessage.goal && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                      <Target size={14} />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Transformation Goal</div>
                      <div className="text-xs font-black text-pink-600 uppercase">{selectedMessage.goal}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Full Message Text */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2">
                <div className="text-[10px] font-black text-[#d4ff00] uppercase tracking-wider">User Message</div>
                <p className="text-xs font-medium text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.message || 'No additional message was written.'}
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="pt-2 space-y-3">
                <button
                  onClick={() => handleOpenWhatsApp(selectedMessage.phone, selectedMessage.name)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send size={15} /> Reply via WhatsApp
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedMessage.id, selectedMessage.status === 'Read' ? 'Unread' : 'Read')}
                    className="w-1/2 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl hover:bg-slate-50 transition-all"
                  >
                    {selectedMessage.status === 'Read' ? 'Mark Unread' : 'Mark Read'}
                  </button>
                  
                  <button
                    onClick={() => handleDelete(selectedMessage.id)}
                    className="w-1/2 bg-red-50 text-red-600 font-bold text-xs py-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                  >
                    Delete Message
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white rounded-[24px] border border-slate-200/60 p-12 text-center text-slate-400 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <Eye size={24} />
              </div>
              <h4 className="font-bold text-slate-700 text-sm">No Message Selected</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Click on any message from the left list to read full details and quick-reply via WhatsApp or Phone.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
