'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, CheckCircle2, AlertTriangle, XCircle,
  Download, RefreshCw, Users, Trash2, Eye, ChevronRight,
  Table2, FileSpreadsheet, Zap, Info, HelpCircle
} from 'lucide-react';
import { useGymStore } from '@/store';
import toast from 'react-hot-toast';
import API from '@/services/api';

// ── Column auto-mapping ────────────────────────────────────────────
const FIELD_MAP: Record<string, string[]> = {
  clientId:   ['client id', 'clientid', 'id', 'biometric id', 'biometricid', 'member id', 'memberid'],
  name:       ['name', 'full name', 'fullname', 'member name', 'member'],
  phone:      ['phone', 'mobile', 'contact', 'phone number', 'mobile number', 'number'],
  email:      ['email', 'email address', 'mail'],
  branch:     ['branch', 'location', 'gym', 'center'],
  gender:     ['gender', 'sex'],
  age:        ['age', 'years'],
  address:    ['address', 'residential', 'home address', 'addr'],
  registrationDate: ['registration date', 'registrationdate', 'join date', 'joining date', 'start date', 'date'],
  membershipPackage: ['package', 'membershippackage', 'plan', 'membership', 'membership plan', 'subscription'],
  membershipExpiry: ['expiry', 'expiry date', 'expirydate', 'membershipexpiry', 'expiration', 'membership expiry'],
  amount:     ['amount', 'fee', 'fees', 'price', 'payment'],
};

const parseCSVDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const cleaned = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  const normalized = cleaned.replace(/[\/\.]/g, '-');
  const parts = normalized.split('-');

  if (parts.length === 3) {
    let part0 = parts[0].trim();
    let part1 = parts[1].trim();
    let part2 = parts[2].trim();

    const monthNames: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      january: '01', february: '02', march: '03', april: '04', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
    };

    const getMonthNum = (m: string): string => {
      const lower = m.toLowerCase();
      if (monthNames[lower]) return monthNames[lower];
      const val = parseInt(m, 10);
      if (!isNaN(val) && val >= 1 && val <= 12) {
        return String(val).padStart(2, '0');
      }
      return '';
    };

    if (part2.length === 4 || part2.length === 2) {
      let year = part2.length === 2 ? '20' + part2 : part2;
      let month = getMonthNum(part1);
      let day = parseInt(part0, 10);
      if (month && !isNaN(day) && day >= 1 && day <= 31) {
        return `${year}-${month}-${String(day).padStart(2, '0')}`;
      }
    }

    if (part0.length === 4 || part0.length === 2) {
      let year = part0.length === 2 ? '20' + part0 : part0;
      let month = getMonthNum(part1);
      let day = parseInt(part2, 10);
      if (month && !isNaN(day) && day >= 1 && day <= 31) {
        return `${year}-${month}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
};

function detectColumn(header: string): string {
  const h = header.toLowerCase().trim();
  for (const [field, aliases] of Object.entries(FIELD_MAP)) {
    if (aliases.some(a => h.includes(a))) return field;
  }
  return '';
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1).map(line => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuotes = !inQuotes; }
      else if (c === ',' && !inQuotes) { cells.push(current.trim()); current = ''; }
      else { current += c; }
    }
    cells.push(current.trim());
    return cells;
  });
  return { headers, rows };
}

type ImportStatus = 'valid' | 'invalid' | 'duplicate';

interface ParsedMember {
  idx: number;
  status: ImportStatus;
  issues: string[];
  data: Record<string, string>;
}

const SAMPLE_CSV = `Name,Phone,Email,Plan,Branch,Gender,Age,Address
Rahul Sharma,9876543210,rahul@email.com,Monthly,Mohali Punjab,Male,28,Phase 7 Mohali
Priya Kaur,9812345678,priya@email.com,Quarterly,Mohali Punjab,Female,25,Sector 70 Mohali
Amit Singh,9988776655,,Annual Premium,Mohali Punjab,Male,32,Phase 11 Mohali`;

export default function ImportPage() {
  const { members, addMember, fetchMembers } = useGymStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<number, string>>({});
  const [parsed, setParsed] = useState<ParsedMember[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [migrationHistory, setMigrationHistory] = useState<any[]>([]);
  const [backendSummary, setBackendSummary] = useState<any | null>(null);

  const fetchMigrationHistory = useCallback(async () => {
    try {
      const res = await API.get('/migrations');
      if (Array.isArray(res.data)) {
        setMigrationHistory(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch migrations:', err);
    }
  }, []);

  React.useEffect(() => {
    fetchMigrationHistory();
  }, [fetchMigrationHistory]);

  // ── Process file ──────────────────────────────────────────────────
  const processFile = (file: File) => {
    if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const { headers: h, rows: r } = parseCSV(text);
        setHeaders(h);
        setRawRows(r.filter(row => row.some(cell => cell.trim())));
        // Auto-map columns
        const autoMap: Record<number, string> = {};
        h.forEach((header, i) => {
          const field = detectColumn(header);
          if (field) autoMap[i] = field;
        });
        setColumnMap(autoMap);
        setStep('preview');
      } catch (err) {
        toast.error('Failed to parse file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  // ── Validate rows ─────────────────────────────────────────────────
  const validateRows = useCallback((): ParsedMember[] => {
    const existingPhones = new Set(members.map((m: any) => String(m.phone).trim()));
    const existingBios = new Set(members.map((m: any) => m.biometricId ? String(m.biometricId).trim() : ''));

    return rawRows.map((row, idx) => {
      const data: Record<string, string> = {};
      Object.entries(columnMap).forEach(([colIdx, field]) => {
        data[field] = row[Number(colIdx)]?.trim() || '';
      });

      // Multiline package and expiry resolution
      const pkgRaw = data.membershipPackage || data.plan || 'Monthly';
      const expiryRaw = data.membershipExpiry || data.expiryDate || '';

      const pkgs = pkgRaw.split(/[\n\r,;]+/).map(p => p.trim()).filter(Boolean);
      const expiries = expiryRaw.split(/[\n\r,;]+/).map(e => e.trim()).filter(Boolean);

      const pairs: { pkg: string; expiryParsed: string }[] = [];
      const maxLen = Math.max(pkgs.length, expiries.length);
      for (let i = 0; i < maxLen; i++) {
        const p = pkgs[i] || pkgs[pkgs.length - 1] || 'Monthly';
        const eStr = expiries[i] || expiries[expiries.length - 1] || '';
        const eParsed = parseCSVDate(eStr);
        pairs.push({ pkg: p, expiryParsed: eParsed });
      }

      // Sort descending
      pairs.sort((a, b) => {
        if (!a.expiryParsed && !b.expiryParsed) return 0;
        if (!a.expiryParsed) return 1;
        if (!b.expiryParsed) return -1;
        return b.expiryParsed.localeCompare(a.expiryParsed);
      });

      const latestPair = pairs[0] || { pkg: 'Monthly', expiryParsed: '' };

      // Update to resolved data
      data.membershipPackage = latestPair.pkg;
      data.membershipExpiry = latestPair.expiryParsed;

      const issues: string[] = [];
      if (!data.name) issues.push('Name is required');
      if (!data.phone) issues.push('Phone is required');
      else if (!/^\d{10}$/.test(data.phone.replace(/[^0-9]/g, ''))) issues.push('Invalid phone (10 digits required)');
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) issues.push('Invalid email format');

      let status: ImportStatus = issues.length > 0 ? 'invalid' : 'valid';
      const currentPhone = data.phone ? String(data.phone).trim() : '';
      const currentBio = data.clientId ? String(data.clientId).trim() : '';

      if (status === 'valid' && (existingPhones.has(currentPhone) || (currentBio && existingBios.has(currentBio)))) {
        status = 'duplicate';
        issues.push('Duplicate — updates membership history');
      }

      return { idx, status, issues, data };
    });
  }, [rawRows, columnMap, members]);

  const handlePreview = () => {
    const result = validateRows();
    setParsed(result);
  };

  // ── Import ─────────────────────────────────────────────────────────
  const handleImport = async () => {
    const toImport = parsed.filter(p => p.status === 'valid' || p.status === 'duplicate');
    if (toImport.length === 0) { toast.error('No valid records to import'); return; }
    setStep('importing');
    setImportProgress(10);

    try {
      const payload = toImport.map(p => ({
        clientId: p.data.clientId || p.data.phone || '',
        name: p.data.name || '',
        phone: p.data.phone || '',
        gender: p.data.gender || 'Male',
        registrationDate: p.data.registrationDate || '',
        membershipPackage: p.data.membershipPackage || 'Monthly',
        membershipExpiry: p.data.membershipExpiry || '',
        email: p.data.email || '',
        branch: p.data.branch || 'Mohali, Punjab',
        age: p.data.age || '',
        address: p.data.address || '',
      }));

      setImportProgress(40);
      const res = await API.post('/members/migrate', { members: payload });
      setImportProgress(80);

      const stats = res.data.stats;
      setBackendSummary(stats);

      // Refresh members local cache
      await fetchMembers();
      await fetchMigrationHistory();
      setImportProgress(100);

      setStep('done');
      toast.success((stats.importedMembers || 0) + ' members imported successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || err.message || 'Import failed');
      setStep('preview');
    }
  };

  const reset = () => {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRawRows([]);
    setColumnMap({});
    setParsed([]);
    setImportProgress(0);
  };

  // ── Download sample CSV ───────────────────────────────────────────
  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'alpha-zone-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Sample template downloaded!');
  };

  const valid = parsed.filter(p => p.status === 'valid').length;
  const invalid = parsed.filter(p => p.status === 'invalid').length;
  const dupes = parsed.filter(p => p.status === 'duplicate').length;

  return (
    <div className="flex flex-col gap-6 pb-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-black text-black flex items-center gap-2">
              <FileSpreadsheet size={20} /> CSV Import Center
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Bulk import members · Auto column mapping · Duplicate detection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadSample}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all">
              <Download size={12} /> Download Template
            </button>
            {step !== 'upload' && (
              <button onClick={reset}
                className="flex items-center gap-1.5 bg-black text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all">
                <RefreshCw size={12} /> New Import
              </button>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-0 mt-4">
          {[
            { label: 'Upload', key: 'upload' },
            { label: 'Preview & Map', key: 'preview' },
            { label: 'Importing', key: 'importing' },
            { label: 'Done', key: 'done' },
          ].map((s, i, arr) => {
            const steps = ['upload', 'preview', 'importing', 'done'];
            const active = steps.indexOf(step) >= steps.indexOf(s.key);
            return (
              <React.Fragment key={s.key}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${active ? 'bg-black text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${active ? 'bg-white text-black' : 'bg-slate-200 text-slate-400'}`}>{i + 1}</span>
                  {s.label}
                </div>
                {i < arr.length - 1 && <ChevronRight size={12} className="text-slate-300 mx-0.5" />}
              </React.Fragment>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── STEP 1: Upload ── */}
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Drop Zone */}
            <div className="lg:col-span-2">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${dragging ? 'border-black bg-black/5' : 'border-slate-200 hover:border-black hover:bg-slate-50'}`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${dragging ? 'bg-black text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <Upload size={28} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-black">Drop your CSV or Excel file here</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">or click to browse · Supports .csv, .xlsx, .xls</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {['.csv', '.xlsx', '.xls'].map(ext => (
                    <span key={ext} className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase">{ext}</span>
                  ))}
                </div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
              </div>
            </div>

            {/* Info + History */}
            <div className="flex flex-col gap-4">
              {/* Supported columns */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <h3 className="text-xs font-black text-black mb-3 flex items-center gap-2"><Info size={13} /> Auto-Detected Columns</h3>
                <div className="space-y-1.5">
                  {Object.keys(FIELD_MAP).map(field => (
                    <div key={field} className="flex items-center justify-between text-[9px]">
                      <span className="font-black text-black capitalize">{field}</span>
                      <span className="text-slate-400 font-bold">{FIELD_MAP[field].slice(0, 2).join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Import History */}
              {migrationHistory.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-black text-black mb-3">Import History</h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {migrationHistory.map((m) => (
                      <div key={m.sessionId} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100/60">
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-black text-black truncate" title={m.sessionId}>{m.sessionId}</p>
                            <p className="text-[8px] text-slate-400 font-bold">{m.timestamp ? new Date(m.timestamp).toLocaleString() : 'N/A'}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[9px] font-black text-emerald-600">+{m.importedMembers || 0}</p>
                            {m.duplicateMembers > 0 && <p className="text-[8px] text-amber-500 font-bold">~{m.duplicateMembers} dupes</p>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 mt-1">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${m.status === 'rolled_back' ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                            {m.status === 'rolled_back' ? 'Rolled Back' : 'Active'}
                          </span>
                          {m.status !== 'rolled_back' && (
                            <button
                              onClick={async () => {
                                if (confirm('Are you sure you want to rollback this import? This will delete all imported members, login profiles, and billing logs from this session.')) {
                                  try {
                                    toast.loading('Rolling back migration...', { id: 'rollback' });
                                    await API.post('/members/rollback-migration', { sessionId: m.sessionId });
                                    toast.success('Migration rolled back successfully!', { id: 'rollback' });
                                    fetchMigrationHistory();
                                    fetchMembers();
                                  } catch (err: any) {
                                    toast.error(err.response?.data?.error || 'Rollback failed', { id: 'rollback' });
                                  }
                                }
                              }}
                              className="flex items-center gap-1 text-[8px] font-black uppercase text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 size={10} /> Rollback
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Preview & Map ── */}
        {step === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="flex flex-col gap-4">

            {/* Column Mapping */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-black mb-4 flex items-center gap-2"><Table2 size={15} /> Column Mapping</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {headers.map((header, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">{header}</p>
                    <select
                      value={columnMap[i] || ''}
                      onChange={e => setColumnMap(prev => ({ ...prev, [i]: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-[10px] font-bold text-black outline-none focus:border-black transition-colors"
                    >
                      <option value="">— Skip —</option>
                      {Object.keys(FIELD_MAP).map(f => (
                        <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation summary */}
            <div className="flex gap-3 flex-wrap">
              <button onClick={handlePreview}
                className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all">
                <Eye size={13} /> Validate {rawRows.length} Records
              </button>
            </div>

            {parsed.length > 0 && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total', value: parsed.length, color: '#0052FF', bg: '#eff6ff' },
                    { label: 'Valid', value: valid, color: '#10b981', bg: '#f0fdf4' },
                    { label: 'Invalid', value: invalid, color: '#ef4444', bg: '#fef2f2' },
                    { label: 'Duplicates', value: dupes, color: '#f59e0b', bg: '#fffbeb' },
                  ].map((s, i) => (
                    <div key={i} className="rounded-2xl p-4 border border-slate-100 bg-white shadow-sm text-center">
                      <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Data Table Preview */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-black text-black">Data Preview</h3>
                    <span className="text-[9px] text-slate-400 font-bold">Showing all {parsed.length} records</span>
                  </div>
                  <div className="overflow-auto max-h-72">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-3 py-2 text-left font-black text-slate-400 uppercase tracking-wider w-8">#</th>
                          <th className="px-3 py-2 text-left font-black text-slate-400 uppercase tracking-wider">Status</th>
                          {Object.values(columnMap).filter(Boolean).map((field, i) => (
                            <th key={i} className="px-3 py-2 text-left font-black text-slate-400 uppercase tracking-wider capitalize">{field}</th>
                          ))}
                          <th className="px-3 py-2 text-left font-black text-slate-400 uppercase tracking-wider">Issues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.map((row) => (
                          <tr key={row.idx} className={`border-t border-slate-50 ${row.status === 'invalid' ? 'bg-red-50/50' : row.status === 'duplicate' ? 'bg-amber-50/50' : ''}`}>
                            <td className="px-3 py-2 font-bold text-slate-400">{row.idx + 1}</td>
                            <td className="px-3 py-2">
                              {row.status === 'valid' && <span className="flex items-center gap-1 text-emerald-600 font-black"><CheckCircle2 size={11} /> Valid</span>}
                              {row.status === 'invalid' && <span className="flex items-center gap-1 text-red-500 font-black"><XCircle size={11} /> Invalid</span>}
                              {row.status === 'duplicate' && <span className="flex items-center gap-1 text-amber-600 font-black"><AlertTriangle size={11} /> Duplicate</span>}
                            </td>
                            {Object.values(columnMap).filter(Boolean).map((field, i) => (
                              <td key={i} className="px-3 py-2 text-slate-700 font-bold max-w-[120px] truncate">{row.data[field] || '—'}</td>
                            ))}
                            <td className="px-3 py-2 text-red-400 font-bold text-[9px]">
                              {row.issues.length > 0 ? row.issues.join(' · ') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Import Button */}
                {valid > 0 && (
                  <button onClick={handleImport}
                    className="flex items-center gap-2 bg-black text-[#d4ff00] px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all w-fit">
                    <Zap size={14} /> Import {valid} Valid Members
                    {dupes > 0 && <span className="text-white/60 ml-1">({dupes} dupes skipped)</span>}
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ── STEP 3: Importing ── */}
        {step === 'importing' && (
          <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-6">
            <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center">
              <RefreshCw size={32} className="text-[#d4ff00] animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-black">Importing Members...</p>
              <p className="text-[11px] text-slate-400 font-bold mt-1">Creating records and activating memberships</p>
            </div>
            <div className="w-full max-w-sm">
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-black rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: importProgress + '%' }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-[10px] font-black text-slate-500 text-center mt-2">{importProgress}% complete</p>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: Done ── */}
        {step === 'done' && backendSummary && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg flex flex-col gap-6 text-left max-w-2xl mx-auto w-full">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h2 className="text-xl font-black text-black">CSV Import Finished!</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{fileName}</p>
              </div>
            </div>

            {/* Premium Stat Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Rows', value: backendSummary.totalRows || 0, color: '#3b82f6', bg: 'bg-blue-50' },
                { label: 'Imported', value: backendSummary.importedMembers || 0, color: '#10b981', bg: 'bg-emerald-50' },
                { label: 'Duplicates', value: backendSummary.duplicateMembers || 0, color: '#6366f1', bg: 'bg-indigo-50' },
                { label: 'Skipped/Invalid', value: backendSummary.skippedMembers || 0, color: '#ef4444', bg: 'bg-rose-50' },
              ].map((item, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border border-slate-100 ${item.bg}`}>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{item.label}</p>
                  <p className="text-3xl font-black mt-1" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Secondary stats block */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Database Routing Ledger</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div>
                  <span className="text-[14px] font-extrabold text-emerald-600">🟢 {backendSummary.activeMembers || 0}</span>
                  <p className="text-[8px] text-slate-400 font-black uppercase mt-0.5">Active</p>
                </div>
                <div>
                  <span className="text-[14px] font-extrabold text-rose-500">🔴 {backendSummary.expiredMembers || 0}</span>
                  <p className="text-[8px] text-slate-400 font-black uppercase mt-0.5">Expired</p>
                </div>
                <div>
                  <span className="text-[14px] font-extrabold text-purple-600">🟣 {backendSummary.ptMembers || 0}</span>
                  <p className="text-[8px] text-slate-400 font-black uppercase mt-0.5">PT Member</p>
                </div>
                <div>
                  <span className="text-[14px] font-extrabold text-amber-600">🟠 {backendSummary.enquiryMembers || 0}</span>
                  <p className="text-[8px] text-slate-400 font-black uppercase mt-0.5">Enquiry Lead</p>
                </div>
              </div>
            </div>

            {/* Warnings Alert Section */}
            {backendSummary.warnings && backendSummary.warnings.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <h4 className="text-xs font-black text-amber-800 flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={14} /> Import Warnings ({backendSummary.warnings.length})
                </h4>
                <div className="max-h-24 overflow-y-auto text-[9px] text-amber-700 font-semibold space-y-1.5 pr-2">
                  {backendSummary.warnings.map((w: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-amber-500">•</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-2">
              <button onClick={reset}
                className="flex-1 flex items-center justify-center gap-2 bg-black text-[#d4ff00] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all">
                <Upload size={14} /> Import Another CSV
              </button>
              <a href="/dashboard/members"
                className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 transition-all border border-slate-200 text-center">
                <Users size={14} /> Active Members
              </a>
              <a href="/dashboard/enquiries"
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-red-600 transition-all text-center">
                <HelpCircle size={14} /> Enquiries Lead Panel
              </a>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
