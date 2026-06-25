'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, CheckCircle2, AlertTriangle, XCircle,
  Download, RefreshCw, Users, Trash2, Eye, ChevronRight,
  Table2, FileSpreadsheet, Zap, Info
} from 'lucide-react';
import { useGymStore } from '@/store';
import toast from 'react-hot-toast';

// ── Column auto-mapping ────────────────────────────────────────────
const FIELD_MAP: Record<string, string[]> = {
  name:       ['name', 'full name', 'fullname', 'member name', 'member'],
  phone:      ['phone', 'mobile', 'contact', 'phone number', 'mobile number', 'number'],
  email:      ['email', 'email address', 'mail'],
  plan:       ['plan', 'membership', 'membership plan', 'subscription'],
  branch:     ['branch', 'location', 'gym', 'center'],
  gender:     ['gender', 'sex'],
  age:        ['age', 'years'],
  address:    ['address', 'residential', 'home address', 'addr'],
  joinDate:   ['join date', 'joining date', 'start date', 'date'],
  amount:     ['amount', 'fee', 'fees', 'price', 'payment'],
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
  const { members, addMember } = useGymStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<number, string>>({});
  const [parsed, setParsed] = useState<ParsedMember[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState({ success: 0, failed: 0, dupes: 0 });
  const [history, setHistory] = useState<{ date: string; file: string; imported: number; dupes: number }[]>([]);

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
    const existingPhones = new Set(members.map((m: any) => m.phone?.trim()));
    return rawRows.map((row, idx) => {
      const data: Record<string, string> = {};
      Object.entries(columnMap).forEach(([colIdx, field]) => {
        data[field] = row[Number(colIdx)]?.trim() || '';
      });
      const issues: string[] = [];
      if (!data.name) issues.push('Name is required');
      if (!data.phone) issues.push('Phone is required');
      else if (!/^\d{10}$/.test(data.phone.replace(/\s/g, ''))) issues.push('Invalid phone (10 digits required)');
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) issues.push('Invalid email format');

      let status: ImportStatus = issues.length > 0 ? 'invalid' : 'valid';
      if (status === 'valid' && existingPhones.has(data.phone?.replace(/\s/g, ''))) {
        status = 'duplicate';
        issues.push('Duplicate — member with this phone already exists');
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
    const toImport = parsed.filter(p => p.status === 'valid');
    if (toImport.length === 0) { toast.error('No valid records to import'); return; }
    setStep('importing');
    setImportProgress(0);

    let success = 0, failed = 0;
    const dupes = parsed.filter(p => p.status === 'duplicate').length;

    for (let i = 0; i < toImport.length; i++) {
      const member = toImport[i];
      try {
        const daysMap: Record<string, number> = { Monthly: 30, Quarterly: 90, 'Semi-Annual': 180, 'Annual Premium': 365 };
        const plan = member.data.plan || 'Monthly';
        const days = daysMap[plan] || 30;
        const expiry = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

        await addMember({
          name: member.data.name,
          phone: member.data.phone,
          email: member.data.email || '',
          plan,
          branch: member.data.branch || 'Mohali, Punjab',
          gender: member.data.gender || 'Male',
          age: Number(member.data.age) || 0,
          address: member.data.address || '',
          expiryDate: expiry,
          trainer: '',
        });
        success++;
      } catch (err) {
        failed++;
      }
      setImportProgress(Math.round(((i + 1) / toImport.length) * 100));
      await new Promise(r => setTimeout(r, 80)); // visual delay
    }

    setImportResult({ success, failed, dupes });
    setHistory(prev => [{
      date: new Date().toLocaleString('en-IN'),
      file: fileName,
      imported: success,
      dupes,
    }, ...prev.slice(0, 4)]);
    setStep('done');
    toast.success(success + ' members imported successfully!');
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
              {history.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-black text-black mb-3">Import History</h3>
                  <div className="space-y-2">
                    {history.map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                        <div>
                          <p className="text-[9px] font-black text-black truncate max-w-[120px]">{h.file}</p>
                          <p className="text-[8px] text-slate-400 font-bold">{h.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-emerald-600">{h.imported} imported</p>
                          {h.dupes > 0 && <p className="text-[8px] text-amber-500 font-bold">{h.dupes} dupes skipped</p>}
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
        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-black">Import Complete!</p>
              <p className="text-[11px] text-slate-400 font-bold mt-1">{fileName}</p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-3xl font-black text-emerald-500">{importResult.success}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1">Imported</p>
              </div>
              <div>
                <p className="text-3xl font-black text-amber-500">{importResult.dupes}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1">Skipped (Dupes)</p>
              </div>
              <div>
                <p className="text-3xl font-black text-red-500">{importResult.failed}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1">Failed</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={reset}
                className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all">
                <Upload size={13} /> Import Another File
              </button>
              <a href="/dashboard/members"
                className="flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 transition-all">
                <Users size={13} /> View Members
              </a>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
