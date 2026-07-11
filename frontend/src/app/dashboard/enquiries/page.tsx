'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, addDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function EnquiryPage() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contact, setContact] = useState('');
  const [altContact, setAltContact] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Male');
  const [address, setAddress] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [followupTime, setFollowupTime] = useState('');
  const [trialDate, setTrialDate] = useState('');
  const [status, setStatus] = useState('Pending');
  const [attendedBy, setAttendedBy] = useState('Demo');
  const [convertibility, setConvertibility] = useState('Warm');
  const [source, setSource] = useState('--Select--');
  const [inquiryFor, setInquiryFor] = useState('--Select--');
  const [feedback, setFeedback] = useState('');
  const [sendTextEmail, setSendTextEmail] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);

  // Filters State
  const [filterLimit, setFilterLimit] = useState('Show upto 10');
  const [filterAttendedBy, setFilterAttendedBy] = useState('--Attended By--');
  const [filterConvertibility, setFilterConvertibility] = useState('--Convertibility--');
  const [filterStatus, setFilterStatus] = useState('--Status--');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);

  // UI state
  const [selectedEnquiries, setSelectedEnquiries] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [openActionDropdown, setOpenActionDropdown] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEnquiries(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setFirstName(''); setLastName(''); setContact(''); setAltContact('');
    setEmail(''); setGender('Male'); setAddress(''); setFollowupDate('');
    setFollowupTime(''); setTrialDate(''); setStatus('Pending'); setAttendedBy('Demo');
    setConvertibility('Warm'); setSource('--Select--'); setInquiryFor('--Select--');
    setFeedback(''); setSendTextEmail(false); setSendWhatsApp(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !contact || !followupDate || !status || !attendedBy || !convertibility || !feedback) {
      toast.error('Please fill all required fields (*) marked in red');
      return;
    }

    try {
      const enquiryPayload = {
        name: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        phone: contact,
        altPhone: altContact,
        email,
        gender,
        address,
        nextFollowUp: followupDate,
        followUpTime: followupTime,
        trialDate,
        status,
        assignedTo: attendedBy,
        priority: convertibility,
        source,
        interestedPlan: inquiryFor,
        remarks: feedback,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'enquiries'), enquiryPayload);

      // Link to follow-ups
      if (followupDate && followupTime) {
        const scheduledDateTime = new Date(`${followupDate}T${followupTime}`);
        await addDoc(collection(db, 'followups'), {
          enquiryId: docRef.id,
          memberId: null,
          employeeId: null,
          type: 'Enquiry',
          priority: convertibility === 'Hot' ? 'High' : convertibility === 'Warm' ? 'Medium' : 'Low',
          title: `Enquiry Follow-up: ${firstName} ${lastName}`,
          description: feedback,
          assignedTo: attendedBy,
          scheduledDate: followupDate,
          scheduledTime: followupTime,
          scheduledTimestamp: scheduledDateTime.getTime(),
          status: 'Pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        toast.success('Inquiry Created and Follow-up Scheduled!');
      } else {
        toast.success('Inquiry Created Successfully!');
      }

      resetForm();
    } catch (err: any) {
      toast.error('Failed to create inquiry: ' + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEnquiries.length > 0) {
      if (!window.confirm(`Are you sure you want to delete ${selectedEnquiries.length} selected inquiries?`)) return;
      toast.loading('Deleting selected inquiries...', { id: 'delete' });
      try {
        await Promise.all(selectedEnquiries.map(id => deleteDoc(doc(db, 'enquiries', id))));
        toast.success('Selected inquiries deleted!', { id: 'delete' });
        setSelectedEnquiries([]);
      } catch (err: any) {
        toast.error('Failed to delete: ' + err.message, { id: 'delete' });
      }
    } else {
      if (!window.confirm('Are you sure you want to delete ALL inquiries? This cannot be undone.')) return;
      toast.loading('Deleting all inquiries...', { id: 'delete' });
      try {
        await Promise.all(enquiries.map(inq => deleteDoc(doc(db, 'enquiries', inq.id))));
        toast.success('All inquiries deleted!', { id: 'delete' });
      } catch (err: any) {
        toast.error('Failed to delete: ' + err.message, { id: 'delete' });
      }
    }
  };

  const handleDeleteIndividual = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this inquiry?')) return;
    try {
      await deleteDoc(doc(db, 'enquiries', id));
      toast.success('Inquiry deleted successfully!');
      setOpenActionDropdown(null);
    } catch (err: any) {
      toast.error('Failed to delete inquiry: ' + err.message);
    }
  };

  const filteredEnquiries = React.useMemo(() => {
    let result = enquiries;

    if (filterAttendedBy !== '--Attended By--') {
      result = result.filter(e => e.assignedTo === filterAttendedBy);
    }
    if (filterConvertibility !== '--Convertibility--') {
      result = result.filter(e => e.priority === filterConvertibility);
    }
    if (filterStatus !== '--Status--') {
      result = result.filter(e => e.status === filterStatus);
    }
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      result = result.filter(e => e.name?.toLowerCase().includes(sq) || e.phone?.includes(sq));
    }

    const limit = parseInt(filterLimit.replace(/\D/g, '')) || 10;
    if (filterLimit !== 'Show all') {
      result = result.slice(0, limit);
    }

    return result;
  }, [enquiries, filterAttendedBy, filterConvertibility, filterStatus, searchQuery, filterLimit]);

  useEffect(() => {
    if (selectAll) setSelectedEnquiries(filteredEnquiries.map(e => e.id));
    else setSelectedEnquiries([]);
  }, [selectAll, filteredEnquiries]);

  const toggleSelect = (id: string) => {
    setSelectedEnquiries(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-slate-50/80 font-sans p-4 lg:p-8 pb-24">
      
      {/* HEADER TITLE */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          Inquiry Management
          <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">CRM</span>
        </h1>
        <p className="text-sm font-semibold text-slate-500">Capture, track, and convert your leads efficiently.</p>
      </div>

      {/* TOP SECTION: FORM & HISTORY */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        
        {/* CREATE INQUIRY FORM */}
        <div className="xl:col-span-2 bg-white rounded-[24px] shadow-sm border border-slate-200/60 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 flex items-center justify-between">
            <h2 className="font-bold text-[15px] tracking-wide flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Create New Inquiry
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 md:p-8 flex-1 flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-5 flex-1">
              
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">First Name<span className="text-pink-500 ml-1">*</span></label>
                <input type="text" placeholder="Enter Name" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all placeholder-slate-400" />
              </div>
              
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                <input type="text" placeholder="Enter Name" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all placeholder-slate-400" />
              </div>
              
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Number<span className="text-pink-500 ml-1">*</span></label>
                <input type="text" placeholder="Mobile Number" value={contact} onChange={e => setContact(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all placeholder-slate-400" />
              </div>
              
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Alt Contact</label>
                <input type="text" placeholder="Optional" value={altContact} onChange={e => setAltContact(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all placeholder-slate-400" />
              </div>
              
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">E-Mail</label>
                <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all placeholder-slate-400" />
              </div>
              
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gender<span className="text-pink-500 ml-1">*</span></label>
                <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all cursor-pointer">
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Area / Address</label>
                <input type="text" placeholder="Location" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all placeholder-slate-400" />
              </div>
              
              <div className="space-y-1 relative">
                <label className="block text-[11px] font-bold text-amber-600 uppercase tracking-wider">Schedule Follow-up<span className="text-pink-500 ml-1">*</span></label>
                <input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)} className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm font-bold text-amber-900 outline-none focus:border-amber-500 focus:bg-amber-50 transition-all cursor-pointer" />
              </div>

              <div className="space-y-1 relative">
                <label className="block text-[11px] font-bold text-amber-600 uppercase tracking-wider">Follow-up Time</label>
                <input type="time" value={followupTime} onChange={e => setFollowupTime(e.target.value)} className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm font-bold text-amber-900 outline-none focus:border-amber-500 focus:bg-amber-50 transition-all cursor-pointer" />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Trial Date</label>
                <input type="date" value={trialDate} onChange={e => setTrialDate(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all cursor-pointer" />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status<span className="text-pink-500 ml-1">*</span></label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all cursor-pointer">
                  <option>Pending</option><option>Converted</option><option>Lost</option><option>Close</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Attended By<span className="text-pink-500 ml-1">*</span></label>
                <select value={attendedBy} onChange={e => setAttendedBy(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all cursor-pointer">
                  <option>Demo</option><option>Admin</option><option>Manager</option><option>Receptionist</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Convertibility<span className="text-pink-500 ml-1">*</span></label>
                <select value={convertibility} onChange={e => setConvertibility(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all cursor-pointer">
                  <option>Warm</option><option>Hot</option><option>Cold</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Source of Inquiry<span className="text-pink-500 ml-1">*</span></label>
                <select value={source} onChange={e => setSource(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all cursor-pointer">
                  <option>--Select--</option><option>Walk-in</option><option>Instagram</option><option>Facebook</option><option>Reference</option>
                </select>
              </div>

              <div className="space-y-1 lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inquiry For<span className="text-pink-500 ml-1">*</span></label>
                <select value={inquiryFor} onChange={e => setInquiryFor(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all cursor-pointer">
                  <option>--Select--</option><option>1 month</option><option>3 months</option><option>6 months</option><option>12 months</option><option>Personal Training</option>
                </select>
              </div>

              <div className="lg:col-span-4 space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Response / Feedback <span className="text-pink-500 ml-1">*</span></label>
                <textarea rows={2} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Type notes here..." className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all resize-none placeholder-slate-400" />
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2.5 text-sm font-bold text-slate-600 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input type="checkbox" checked={sendTextEmail} onChange={e => setSendTextEmail(e.target.checked)} className="peer w-5 h-5 opacity-0 absolute cursor-pointer" />
                    <div className="w-5 h-5 rounded border-2 border-slate-300 bg-slate-50 peer-checked:bg-amber-500 peer-checked:border-amber-500 flex items-center justify-center transition-all">
                      <svg className={`w-3 h-3 text-white ${sendTextEmail ? 'opacity-100' : 'opacity-0'} transition-opacity`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  </div>
                  <span className="group-hover:text-slate-900 transition-colors">Send Email/SMS</span>
                </label>

                <label className="flex items-center gap-2.5 text-sm font-bold text-slate-600 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input type="checkbox" checked={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.checked)} className="peer w-5 h-5 opacity-0 absolute cursor-pointer" />
                    <div className="w-5 h-5 rounded border-2 border-slate-300 bg-slate-50 peer-checked:bg-green-500 peer-checked:border-green-500 flex items-center justify-center transition-all">
                      <svg className={`w-3 h-3 text-white ${sendWhatsApp ? 'opacity-100' : 'opacity-0'} transition-opacity`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  </div>
                  <span className="group-hover:text-slate-900 transition-colors">Send WhatsApp</span>
                </label>
              </div>
              <button type="submit" className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-3 rounded-xl font-black text-[13px] shadow-md shadow-pink-500/20 hover:shadow-lg hover:shadow-pink-500/30 transition-all uppercase tracking-widest active:scale-95">
                Create Inquiry
              </button>
            </div>
          </form>
        </div>

        {/* HISTORY PANEL */}
        <div className="xl:col-span-1 bg-white rounded-[24px] shadow-sm border border-slate-200/60 overflow-hidden flex flex-col h-full max-h-[600px]">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4">
            <h2 className="font-bold text-[15px] tracking-wide flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Inquiry Update History
            </h2>
          </div>
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            {selectedHistory ? (
              <div className="space-y-4">
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                  <p className="font-black text-slate-900 text-lg">{selectedHistory.name}</p>
                  <p className="text-sm font-semibold text-slate-500 mt-0.5">{selectedHistory.phone}</p>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-amber-100/50">
                    <div>
                      <p className="text-[10px] uppercase font-black text-slate-400">Status</p>
                      <p className="text-sm font-bold text-slate-800">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                        {selectedHistory.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black text-slate-400">Assigned To</p>
                      <p className="text-sm font-bold text-slate-800">{selectedHistory.assignedTo}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] uppercase font-black text-slate-400 mb-1.5">Initial Remarks</p>
                  <p className="text-sm font-semibold text-slate-700 leading-relaxed">{selectedHistory.remarks}</p>
                </div>
                
                {selectedHistory.timeline && selectedHistory.timeline.length > 0 && (
                  <div className="mt-6">
                    <p className="text-[11px] uppercase font-black text-slate-500 mb-4 px-1 tracking-wider">Activity Timeline</p>
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                      {selectedHistory.timeline.map((t: any, i: number) => (
                        <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-amber-500 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                          <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-800 text-xs">{t.type || 'Update'}</span>
                              <time className="text-[10px] font-bold text-slate-400">{t.timestamp.split('T')[0]}</time>
                            </div>
                            <div className="text-xs text-slate-600 font-medium">{t.note}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                </div>
                <p className="text-sm font-bold text-slate-500">Please Select an Inquiry<br/>to check history</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: RECORDS TABLE */}
      <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
        
        {/* HEADER & FILTERS */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 border-b border-amber-700/30">
          <h2 className="font-bold text-[15px] text-white tracking-wide flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
            Inquiry Records
          </h2>
        </div>
        
        <div className="bg-slate-50/80 px-6 py-4 flex flex-wrap items-center gap-3 border-b border-slate-100">
          <select 
            className="px-4 py-2 text-xs font-bold text-slate-600 rounded-xl border border-slate-200 outline-none bg-white shadow-sm hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all cursor-pointer min-w-[120px]"
            value={filterLimit} onChange={e => setFilterLimit(e.target.value)}
          >
            <option>Show upto 10</option>
            <option>Show upto 25</option>
            <option>Show upto 50</option>
            <option>Show all</option>
          </select>

          <select 
            className="px-4 py-2 text-xs font-bold text-slate-600 rounded-xl border border-slate-200 outline-none bg-white shadow-sm hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all cursor-pointer min-w-[140px]"
            value={filterAttendedBy} onChange={e => setFilterAttendedBy(e.target.value)}
          >
            <option>--Attended By--</option>
            <option>Demo</option><option>Admin</option><option>Manager</option><option>Receptionist</option>
          </select>

          <select 
            className="px-4 py-2 text-xs font-bold text-slate-600 rounded-xl border border-slate-200 outline-none bg-white shadow-sm hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all cursor-pointer min-w-[140px]"
            value={filterConvertibility} onChange={e => setFilterConvertibility(e.target.value)}
          >
            <option>--Convertibility--</option>
            <option>Hot</option><option>Warm</option><option>Cold</option>
          </select>

          <select 
            className="px-4 py-2 text-xs font-bold text-slate-600 rounded-xl border border-slate-200 outline-none bg-white shadow-sm hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all cursor-pointer"
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          >
            <option>--Status--</option>
            <option>Pending</option><option>Converted</option><option>Lost</option><option>Close</option>
          </select>

          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" 
              placeholder="Search leads..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 rounded-xl border border-slate-200 outline-none w-48 bg-white shadow-sm hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all placeholder-slate-400"
            />
          </div>

          <div className="relative hidden md:block">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <input 
              type="text" 
              placeholder="01-07-2026 - 05-07-2026"
              className="pl-9 pr-4 py-2 text-[11px] font-bold text-slate-500 rounded-xl border border-slate-200 outline-none w-48 bg-white shadow-sm transition-all text-center"
            />
          </div>

          <div className="flex-1 flex justify-end gap-2">
            <button onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold px-4 py-2 rounded-xl uppercase tracking-wider shadow-sm transition-colors active:scale-95">
              {selectedEnquiries.length > 0 ? `Delete (${selectedEnquiries.length})` : 'Wipe All Data'}
            </button>
            <button className="bg-pink-500 hover:bg-pink-600 text-white text-[11px] font-bold px-4 py-2 rounded-xl uppercase tracking-wider shadow-sm transition-colors active:scale-95">
              Bulk SMS
            </button>
            <button className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-4 py-2 rounded-xl uppercase tracking-wider shadow-sm transition-colors active:scale-95">
              Transfer
            </button>
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-amber-500 text-white shadow-sm relative z-10">
                <th className="px-4 py-3.5 w-12 border-r border-amber-600/50">
                  <div className="flex items-center justify-center">
                    <input type="checkbox" checked={selectAll} onChange={(e) => setSelectAll(e.target.checked)} className="w-3.5 h-3.5 rounded-sm bg-white/20 border-white/40 checked:bg-white checked:border-white cursor-pointer" />
                  </div>
                </th>
                <th className="px-4 py-3.5 border-r border-amber-600/50 font-bold tracking-wide">
                  <div className="flex items-center justify-between cursor-pointer group">Name <span className="text-[10px] text-amber-200 group-hover:text-white transition-colors">▲</span></div>
                </th>
                <th className="px-4 py-3.5 border-r border-amber-600/50 font-bold tracking-wide">
                  <div className="flex items-center justify-between cursor-pointer group">Number <span className="text-[10px] text-amber-200 group-hover:text-white transition-colors">▲</span></div>
                </th>
                <th className="px-4 py-3.5 border-r border-amber-600/50 font-bold tracking-wide">
                  <div className="flex items-center justify-between cursor-pointer group">For <span className="text-[10px] text-amber-200 group-hover:text-white transition-colors">▲</span></div>
                </th>
                <th className="px-4 py-3.5 border-r border-amber-600/50 font-bold tracking-wide">
                  <div className="flex items-center justify-between cursor-pointer group">Next follow-up <span className="text-[10px] text-amber-200 group-hover:text-white transition-colors">▲</span></div>
                </th>
                <th className="px-4 py-3.5 border-r border-amber-600/50 font-bold tracking-wide">
                  <div className="flex items-center justify-between cursor-pointer group">Rep. <span className="text-[10px] text-amber-200 group-hover:text-white transition-colors">▲</span></div>
                </th>
                <th className="px-4 py-3.5 border-r border-amber-600/50 font-bold tracking-wide">
                  <div className="flex items-center justify-between cursor-pointer group">Status <span className="text-[10px] text-amber-200 group-hover:text-white transition-colors">▲</span></div>
                </th>
                <th className="px-4 py-3.5 w-32 font-bold tracking-wide text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="font-bold text-slate-500 text-sm">Loading inquiries...</p>
                  </td>
                </tr>
              ) : filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                    </div>
                    <p className="font-bold text-slate-500 text-sm">No inquiries found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search query.</p>
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((inq, idx) => (
                  <tr key={inq.id} className={`${idx % 2 === 0 ? 'bg-amber-50/30' : 'bg-white'} hover:bg-amber-50 transition-colors border-b border-slate-100 group`}>
                    <td className="px-4 py-3.5 border-r border-slate-100 text-center">
                      <input type="checkbox" checked={selectedEnquiries.includes(inq.id)} onChange={() => toggleSelect(inq.id)} className="w-3.5 h-3.5 rounded-sm text-amber-500 border-slate-300 focus:ring-amber-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3.5 border-r border-slate-100">
                      <button onClick={() => setSelectedHistory(inq)} className="font-bold text-slate-800 hover:text-amber-600 transition-colors text-left flex items-center gap-1.5 group-hover:translate-x-1 duration-200">
                        {inq.name}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 border-r border-slate-100 font-semibold text-slate-600">{inq.phone}</td>
                    <td className="px-4 py-3.5 border-r border-slate-100 text-slate-600">{inq.interestedPlan || '-'}</td>
                    <td className="px-4 py-3.5 border-r border-slate-100 font-semibold">
                      {inq.nextFollowUp ? (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md inline-block">
                          {inq.nextFollowUp.split('-').reverse().join('-')}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3.5 border-r border-slate-100">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{inq.assignedTo || 'Demo'}</span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest">(manager)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 border-r border-slate-100">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider
                        ${inq.status === 'Converted' ? 'bg-green-100 text-green-700' : 
                          inq.status === 'Lost' ? 'bg-red-100 text-red-700' : 
                          inq.status === 'Close' ? 'bg-slate-200 text-slate-600' :
                          'bg-amber-100 text-amber-700'}`}>
                        {inq.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 relative">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* ACTION Dropdown */}
                        <div className="relative">
                          <button 
                            onClick={() => setOpenActionDropdown(openActionDropdown === inq.id ? null : inq.id)}
                            className="bg-pink-500 hover:bg-pink-600 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm shadow-pink-500/30 transition-all active:scale-95 tracking-wide uppercase"
                          >
                            ACTION <span className="text-[8px] opacity-70">▼</span>
                          </button>
                          
                          <AnimatePresence>
                            {openActionDropdown === inq.id && (
                              <motion.div 
                                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-2 w-32 bg-white border border-slate-100 shadow-xl rounded-xl z-50 py-1.5 flex flex-col text-xs font-bold overflow-hidden"
                              >
                                <button className="px-4 py-2 hover:bg-slate-50 text-slate-700 text-left w-full transition-colors">Edit Inquiry</button>
                                <button className="px-4 py-2 hover:bg-emerald-50 text-emerald-600 text-left w-full transition-colors">Convert Lead</button>
                                <div className="h-px bg-slate-100 my-1"></div>
                                <button onClick={() => handleDeleteIndividual(inq.id)} className="px-4 py-2 hover:bg-red-50 text-red-600 text-left w-full transition-colors flex items-center justify-between">
                                  Delete <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        {/* WHATSAPP Button */}
                        <button onClick={() => window.open(`https://wa.me/91${inq.phone}`, '_blank')} className="bg-green-500 hover:bg-green-600 text-white p-1.5 rounded-lg shadow-sm shadow-green-500/30 transition-all active:scale-95" title="Chat on WhatsApp">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
