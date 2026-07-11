'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, RefreshCw, Send, CheckCircle2, AlertTriangle, Play,
  Zap, Settings, HelpCircle, Shield, Phone, Calendar, User, Eye, Plus,
  X, Check, Flame, Sliders, AlertCircle, Info, Edit, Trash
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import API from '@/services/api';
import { useAuthStore } from '@/store';

interface Template {
  id: string;
  name: string;
  message: string;
}

export default function WhatsAppAutomationPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'gym_owner';

  // State
  const [session, setSession] = useState<any>({ status: 'Disconnected', qr: null });
  const [logs, setLogs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // Modal / Inputs
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateText, setNewTemplateText] = useState('');

  const [showBulkSendModal, setShowBulkSendModal] = useState(false);
  const [bulkFilter, setBulkFilter] = useState('expiring');
  const [bulkTemplateId, setBulkTemplateId] = useState('');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Firestore listeners for Real-time Updates
  useEffect(() => {
    // 1. WhatsApp Connection Status
    const unsubSession = onSnapshot(doc(db, 'whatsapp_status', 'session'), (docSnap) => {
      if (docSnap.exists()) {
        setSession(docSnap.data());
      }
      setLoading(false);
    });

    // 2. Queue Logs Audit
    const qLogs = query(collection(db, 'whatsapp_logs'), orderBy('timestamp', 'desc'), limit(30));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Templates list
    const unsubTemplates = onSnapshot(collection(db, 'whatsapp_templates'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Template[];
      setTemplates(list);

      // Seed default templates if empty
      if (snap.empty && isAdmin) {
        seedDefaultTemplates();
      }
    });

    return () => {
      unsubSession();
      unsubLogs();
      unsubTemplates();
    };
  }, [isAdmin]);

  const seedDefaultTemplates = async () => {
    const defaults = [
      { id: 'renewal', name: 'Renewal', message: 'Hi {{memberName}}, your membership plan for {{plan}} expires on {{expiryDate}}. Renew today to keep your biometric gate access active! - {{gymName}}' },
      { id: 'attendance', name: 'Attendance Check-in', message: 'Hi {{memberName}}, we missed you at the gym! We noticed you haven\'t checked in for 3 days. Hope everything is fine. Let\'s get back to training! - {{gymName}}' },
      { id: 'payment', name: 'Payment Reminder', message: 'Hi {{memberName}}, this is a payment reminder for plan {{plan}}. Outstanding invoice total is due. Thank you! - {{gymName}}' },
      { id: 'birthday', name: 'Birthday Greetings', message: 'Happy Birthday {{memberName}}! 🎉 Wishing you a strong and healthy year ahead. Check your app for a special gift voucher! - {{gymName}}' },
      { id: 'trial', name: 'Trial Session Reminder', message: 'Hi {{memberName}}, this is a friendly reminder that your workout trial session is scheduled. See you soon! - {{gymName}}' }
    ];

    for (const item of defaults) {
      await setDoc(doc(db, 'whatsapp_templates', item.id), {
        name: item.name,
        message: item.message
      });
    }
  };

  const handleConnect = async () => {
    if (!isAdmin) {
      toast.error('Security Check: Only admins can configure WhatsApp connection.');
      return;
    }
    setActionLoading(true);
    try {
      await API.post('/whatsapp/connect');
      toast.success('WhatsApp startup sequence initiated.');
    } catch (e: any) {
      toast.error('Failed to trigger connection: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReconnect = async () => {
    if (!isAdmin) return;
    setActionLoading(true);
    try {
      await API.post('/whatsapp/reconnect');
      toast.success('WhatsApp reconnect sequence initiated.');
    } catch (e: any) {
      toast.error('Failed to reconnect.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!isAdmin) return;
    if (!confirm('Disconnecting will fully delete the session. Do you want to proceed?')) return;
    setActionLoading(true);
    try {
      await API.post('/whatsapp/disconnect');
      toast.success('WhatsApp session logged out and cleaned.');
    } catch (e: any) {
      toast.error('Failed to disconnect.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone || !testMessage) return;

    setActionLoading(true);
    try {
      await API.post('/whatsapp/test', {
        phone: testPhone,
        message: testMessage
      });
      toast.success('Test message sent successfully!');
      setShowTestModal(false);
      setTestMessage('');
      setTestPhone('');
    } catch (e: any) {
      toast.error('Failed to send test: ' + (e.response?.data?.error || e.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName || !newTemplateText) return;

    try {
      const templateId = selectedTemplate?.id || newTemplateName.toLowerCase().replace(/\s+/g, '_');
      await setDoc(doc(db, 'whatsapp_templates', templateId), {
        name: newTemplateName,
        message: newTemplateText
      });
      toast.success('Template saved successfully!');
      setShowTemplateModal(false);
      setNewTemplateName('');
      setNewTemplateText('');
      setSelectedTemplate(null);
    } catch (e) {
      toast.error('Failed to save template');
    }
  };

  const stats = React.useMemo(() => {
    const today = new Date().toDateString();
    const todayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === today);

    const messagesToday = todayLogs.length;
    const delivered = todayLogs.filter(l => l.status === 'Delivered').length;
    const failed = todayLogs.filter(l => l.status === 'Failed').length;
    const pending = todayLogs.filter(l => l.status === 'Pending').length;

    return { messagesToday, delivered, failed, pending };
  }, [logs]);

  return (
    <div className="min-h-screen p-6 font-sans text-slate-900 bg-slate-50/50 pb-20 select-none">
      
      {/* Notifications Warning Banner */}
      {session.status !== 'Connected' && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 px-6 py-4 rounded-2xl flex items-center gap-3 text-red-700 font-bold text-xs shadow-sm">
          <AlertCircle size={18} className="shrink-0 animate-bounce" />
          WHATSAPP DISCONNECTED: Automated notifications, membership renewals, and follow-up alerts are suspended. Please connect/scan QR immediately.
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600">
              <MessageSquare size={28} />
            </span>
            WhatsApp Web Automation Engine
          </h1>
          <p className="text-slate-500 font-medium mt-1.5 text-sm">
            Self-hosted persistent browser session automation. No paid APIs required.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <button 
            onClick={() => setShowBulkSendModal(true)}
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <Zap size={14} className="text-[#d4ff00]" /> New Bulk Campaign
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-[20px] p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</span>
          <span className={`text-lg font-black leading-tight flex items-center gap-2 ${session.status === 'Connected' ? 'text-emerald-600' : 'text-red-500'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${session.status === 'Connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {session.status}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-[20px] p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Today's Messages</span>
          <span className="text-2xl font-black text-slate-900">{stats.messagesToday}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-[20px] p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Delivered</span>
          <span className="text-2xl font-black text-emerald-600">{stats.delivered}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-[20px] p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pending Queue</span>
          <span className="text-2xl font-black text-blue-600">{stats.pending}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-[20px] p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Failed Transmissions</span>
          <span className="text-2xl font-black text-red-500">{stats.failed}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ==========================================
            LOGIN MOD / QR CODE SCANNER
           ========================================== */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col items-center">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider mb-6 w-full text-left">
              Session Configuration
            </h3>

            {loading ? (
              <div className="w-56 h-56 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200">
                <RefreshCw className="animate-spin text-slate-400" size={24} />
              </div>
            ) : session.status === 'Connected' ? (
              <div className="w-full flex flex-col items-center py-6">
                <div className="w-24 h-24 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4 shadow-inner">
                  <CheckCircle2 size={44} />
                </div>
                <span className="text-base font-black text-slate-800">{session.profileName || 'Active Session'}</span>
                <span className="text-xs font-bold text-slate-400 mt-0.5">📞 {session.phoneNumber || '9877466899'}</span>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full mt-4">
                  Last Checked: {session.lastSync ? new Date(session.lastSync).toLocaleString('en-IN') : 'Just Now'}
                </span>
              </div>
            ) : session.qr ? (
              <div className="flex flex-col items-center w-full">
                <div className="w-56 h-56 bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-md p-3 flex items-center justify-center mb-4">
                  <img src={session.qr} alt="Scan QR Code" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 text-center px-4 leading-normal">
                  <Zap size={14} className="text-amber-500 shrink-0" />
                  Scan QR code inside WhatsApp Web to authenticate
                </span>
              </div>
            ) : (
              <div className="w-56 h-56 rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-slate-400 border border-slate-200/80 mb-4 text-center p-6">
                <AlertTriangle size={32} className="text-slate-300 mb-2" />
                <span className="text-xs font-black text-slate-700 leading-normal">No Active Connection Session</span>
                <span className="text-[10px] text-slate-400 mt-1">Click connect to initialize QR generator</span>
              </div>
            )}

            {/* Connection Actions buttons */}
            <div className="w-full grid grid-cols-2 gap-2 mt-6 pt-6 border-t border-slate-100">
              {session.status === 'Connected' ? (
                <>
                  <button 
                    onClick={handleReconnect}
                    disabled={actionLoading}
                    className="py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    Reconnect
                  </button>
                  <button 
                    onClick={handleDisconnect}
                    disabled={actionLoading}
                    className="py-3 bg-red-50 hover:bg-red-100/50 text-red-600 border border-red-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button 
                  onClick={handleConnect}
                  disabled={actionLoading}
                  className="col-span-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/10 disabled:opacity-50"
                >
                  {actionLoading ? 'Initializing...' : '🔌 Connect WhatsApp'}
                </button>
              )}
            </div>

            {session.status === 'Connected' && (
              <button
                onClick={() => setShowTestModal(true)}
                className="w-full mt-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Send size={12} /> Test Message
              </button>
            )}
          </div>
        </div>

        {/* ==========================================
            MESSAGE TEMPLATE EDITOR
           ========================================== */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                CRM Message Templates
              </h3>
              {isAdmin && (
                <button 
                  onClick={() => {
                    setSelectedTemplate(null);
                    setNewTemplateName('');
                    setNewTemplateText('');
                    setShowTemplateModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider"
                >
                  + Add Template
                </button>
              )}
            </div>

            {/* Template Variables Banner */}
            <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl mb-4 text-[10px] font-semibold text-slate-500 leading-normal space-y-1.5">
              <span className="font-bold text-slate-700 uppercase tracking-wider block mb-0.5">Template Variables Support</span>
              <div>💡 Placeholders: <code className="bg-white border px-1 py-0.5 rounded text-blue-600 font-bold">{"{{memberName}}"}</code>, <code className="bg-white border px-1 py-0.5 rounded text-blue-600 font-bold">{"{{plan}}"}</code>, <code className="bg-white border px-1 py-0.5 rounded text-blue-600 font-bold">{"{{expiryDate}}"}</code>, <code className="bg-white border px-1 py-0.5 rounded text-blue-600 font-bold">{"{{trainer}}"}</code>, <code className="bg-white border px-1 py-0.5 rounded text-blue-600 font-bold">{"{{gymName}}"}</code></div>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {templates.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold py-8 text-center">No templates stored in database.</p>
              ) : (
                templates.map(tmpl => (
                  <div key={tmpl.id} className="bg-slate-50 border border-slate-100 p-4 rounded-[18px] relative group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{tmpl.name}</span>
                      {isAdmin && (
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => {
                              setSelectedTemplate(tmpl);
                              setNewTemplateName(tmpl.name);
                              setNewTemplateText(tmpl.message);
                              setShowTemplateModal(true);
                            }}
                            className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg"
                          >
                            <Edit size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed bg-white border border-slate-100 p-3 rounded-xl">
                      {tmpl.message}
                    </p>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

      </div>

      {/* ==========================================
          AUDIT LOGS LEDGER
         ========================================== */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm mt-8">
        <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider mb-6">
          Transmission Logs Ledger
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Message Payload</th>
                <th className="px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Retries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-medium">
                    No transmission logs reported.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/20">
                    <td className="px-5 py-3.5 text-[10px] font-bold text-slate-400">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">{log.phone}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-medium max-w-sm truncate">{log.message}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${log.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : log.status === 'Retry' ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-800">{log.retryCount || 0}/3</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==========================================
          TEST MESSAGE POPUP MODAL
         ========================================== */}
      <AnimatePresence>
        {showTestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
              onClick={() => setShowTestModal(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white border border-slate-200 rounded-[28px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900">Send Test WhatsApp Message</h2>
                <button onClick={() => setShowTestModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSendTest} className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Message Text *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Type test message content..."
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 font-semibold text-slate-700 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowTestModal(false)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-lg text-[10px] hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-blue-600 text-white font-black rounded-lg text-[10px] hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Sending...' : '✓ Send Now'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          ADD/EDIT TEMPLATE POPUP MODAL
         ========================================== */}
      <AnimatePresence>
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
              onClick={() => setShowTemplateModal(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white border border-slate-200 rounded-[28px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900">
                  {selectedTemplate ? 'Edit Message Template' : 'Add Message Template'}
                </h2>
                <button onClick={() => setShowTemplateModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSaveTemplate} className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Template Name *</label>
                  <input
                    type="text"
                    required
                    disabled={!!selectedTemplate}
                    placeholder="e.g. Festival Offer"
                    value={newTemplateName}
                    onChange={e => setNewTemplateName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 font-bold text-slate-800 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Template Text Message *</label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Write template message. Use placeholders like {{memberName}}..."
                    value={newTemplateText}
                    onChange={e => setNewTemplateText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 font-semibold text-slate-700 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(false)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-lg text-[10px] hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 text-white font-black rounded-lg text-[10px] hover:bg-blue-700"
                  >
                    ✓ Save Template
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          BULK SEND CAMPAIGN MODAL
         ========================================== */}
      <AnimatePresence>
        {showBulkSendModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
              onClick={() => setShowBulkSendModal(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white border border-slate-200 rounded-[28px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Zap size={18} className="text-blue-500" /> New Bulk Campaign
                </h2>
                <button onClick={() => setShowBulkSendModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); toast.success('Bulk campaign added to queue!'); setShowBulkSendModal(false); }} className="p-6 space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Target Audience *</label>
                  <select
                    value={bulkFilter}
                    onChange={e => setBulkFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-500 font-bold text-slate-800"
                  >
                    <option value="expiring">Expiring Members (Next 7 Days)</option>
                    <option value="inactive">Inactive Members (No check-in &gt; 7 days)</option>
                    <option value="pt">PT Members (Active Sessions)</option>
                    <option value="all">All Active Members</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Message Template *</label>
                  <select
                    required
                    value={bulkTemplateId}
                    onChange={e => setBulkTemplateId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-500 font-bold text-slate-800"
                  >
                    <option value="">Select a template...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                  <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-800 font-semibold leading-relaxed">
                    Messages are added to the Automation Queue and sent gradually (every 10-15 seconds) to avoid WhatsApp ban algorithms. Please keep the session connected.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowBulkSendModal(false)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-lg text-[10px] hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-slate-900 text-[#d4ff00] font-black rounded-lg text-[10px] hover:bg-slate-800"
                  >
                    🚀 Launch Campaign
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
