'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Check, AlertTriangle, AlertCircle, RefreshCw, Trash2, ArrowLeft,
  ArrowRight, UserCheck, Play, Download, Search, CheckCircle, Database, ShieldAlert,
  Terminal, Sparkles, Cpu, HardDrive, FileSpreadsheet, ChevronRight, X, Clock, HelpCircle, History
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import API from '@/services/api';
import toast from 'react-hot-toast';

interface CSVRecord {
  clientId: string;
  name: string;
  phone: string;
  gender: string;
  registrationDate: string;
  membershipPackage: string;
  membershipExpiry: string;
  trainer?: string;
  status?: 'pending' | 'duplicate' | 'error';
  reason?: string;
}

interface DeviceUser {
  userId: string;
  name: string;
  fingerprintCount: number;
  privilege: number;
  card: string;
  status: string;
}

interface MigrationSession {
  sessionId: string;
  timestamp: string;
  totalMembers: number;
  imported: number;
  duplicates: number;
  successPercent: number;
  status: string;
  logs: string[];
}

export default function MemberMigrationCenter() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [csvData, setCsvData] = useState<CSVRecord[]>([]);
  const [deviceUsers, setDeviceUsers] = useState<DeviceUser[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [sessionLogs, setSessionLogs] = useState<string[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [migrationStats, setMigrationStats] = useState<any>(null);
  const [sessions, setSessions] = useState<MigrationSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mappingMemberId, setMappingMemberId] = useState<string | null>(null);
  const [selectedDeviceUserId, setSelectedDeviceUserId] = useState('');
  const [diagnosticLoading, setDiagnosticLoading] = useState<string | null>(null);
  const [testerStatus, setTesterStatus] = useState<any>({ connection: 'offline' });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial cache on mount
  useEffect(() => {
    fetchDeviceUsers();
    fetchMigrations();
    fetchDiagnosticStatus();
  }, []);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sessionLogs]);

  const fetchDeviceUsers = async () => {
    try {
      const res = await API.get('/devices/testing/device-users');
      setDeviceUsers(res.data || []);
    } catch (err: any) {
      toast.error('Failed to load device users: ' + err.message);
    }
  };

  const fetchMigrations = async () => {
    try {
      const res = await API.get('/migrations');
      setSessions(res.data || []);
    } catch (err: any) {
      toast.error('Failed to load migration sessions: ' + err.message);
    }
  };

  const fetchDiagnosticStatus = async () => {
    try {
      const res = await API.get('/devices/testing/status');
      setTesterStatus(res.data || { connection: 'offline' });
    } catch (err) {}
  };

  // CSV Drag and Drop + Parsing
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (file.name.endsWith('.xlsx')) {
      toast.error('Excel (.xlsx) parsing requires CSV conversion. Please convert to CSV and upload.', { duration: 5000 });
      return;
    }
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    try {
      const parseCSVRows = (csvText: string): string[][] => {
        const result: string[][] = [];
        let row: string[] = [];
        let cell = '';
        let inQuotes = false;

        for (let i = 0; i < csvText.length; i++) {
          const char = csvText[i];
          const nextChar = csvText[i + 1];

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              cell += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            row.push(cell.trim());
            cell = '';
          } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
              i++;
            }
            row.push(cell.trim());
            result.push(row);
            row = [];
            cell = '';
          } else {
            cell += char;
          }
        }
        
        if (cell || row.length > 0) {
          row.push(cell.trim());
          result.push(row);
        }
        return result;
      };

      const rows = parseCSVRows(text);
      if (rows.length < 2) {
        toast.error('CSV file must contain a header and at least one member row.');
        return;
      }

      const headers = rows[0].map(h => h.trim().toLowerCase().replace(/["']/g, ''));
      
      const findHeaderIndex = (keywords: string[], excludeKeywords: string[] = []) => {
        return headers.findIndex(h => {
          const matchesKeyword = keywords.some(k => h.includes(k) || h === k);
          const matchesExclude = excludeKeywords.some(k => h.includes(k));
          return matchesKeyword && !matchesExclude;
        });
      };

      const colIdx = {
        clientId: findHeaderIndex(['client id', 'clientid', 'id', 'cid', 'member id'], ['name']),
        name: findHeaderIndex(['name', 'member', 'client name']),
        phone: findHeaderIndex(['phone', 'mobile', 'contact', 'number', 'num']),
        gender: findHeaderIndex(['gender', 'sex']),
        regDate: findHeaderIndex(['reg', 'join', 'date'], ['expiry', 'expired', 'end', 'expir', 'expiration']),
        pkg: findHeaderIndex(['package', 'plan', 'membership']),
        expiry: findHeaderIndex(['expiry', 'expired', 'end', 'expir', 'expiration'], ['gender']),
        trainer: findHeaderIndex(['trainer', 'pt', 'personal trainer', 'coach', 'assigned trainer'])
      };

      if (colIdx.clientId === -1 || colIdx.name === -1 || colIdx.phone === -1) {
        toast.error('Required headers not found. CSV must contain Client ID, Name, and Phone.');
        return;
      }

      const parsedRecords: CSVRecord[] = [];
      const dataRows = rows.slice(1);
      let currentMember: CSVRecord | null = null;

      const parseToDateVal = (dStr: string): number => {
        if (!dStr) return 0;
        const cleaned = dStr.trim();
        const normalized = cleaned.replace(/[\/\.]/g, '-');
        const parts = normalized.split('-');

        if (parts.length === 3) {
          let part0 = parts[0].trim();
          let part1 = parts[1].trim();
          let part2 = parts[2].trim();

          const monthNames: Record<string, number> = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
          };

          const getMonthIndex = (m: string): number => {
            const lower = m.toLowerCase();
            if (monthNames[lower] !== undefined) return monthNames[lower];
            const val = parseInt(m, 10);
            if (!isNaN(val) && val >= 1 && val <= 12) return val - 1;
            return -1;
          };

          if (part2.length === 4 || part2.length === 2) {
            let year = part2.length === 2 ? 2000 + parseInt(part2, 10) : parseInt(part2, 10);
            let monthIdx = getMonthIndex(part1);
            let day = parseInt(part0, 10);
            if (monthIdx !== -1 && !isNaN(day) && day >= 1 && day <= 31) {
              return new Date(year, monthIdx, day).getTime();
            }
          }
          if (part0.length === 4 || part0.length === 2) {
            let year = part0.length === 2 ? 2000 + parseInt(part0, 10) : parseInt(part0, 10);
            let monthIdx = getMonthIndex(part1);
            let day = parseInt(part2, 10);
            if (monthIdx !== -1 && !isNaN(day) && day >= 1 && day <= 31) {
              return new Date(year, monthIdx, day).getTime();
            }
          }
        }
        const parsed = new Date(cleaned);
        return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
      };

      for (const row of dataRows) {
        if (row.length < headers.length) continue;

        const clientId = colIdx.clientId !== -1 ? row[colIdx.clientId].replace(/^["']|["']$/g, '').trim() : '';
        const name = colIdx.name !== -1 ? row[colIdx.name].replace(/^["']|["']$/g, '').trim() : '';
        const phone = colIdx.phone !== -1 ? row[colIdx.phone].replace(/^["']|["']$/g, '').trim() : '';
        const gender = colIdx.gender !== -1 ? row[colIdx.gender].replace(/^["']|["']$/g, '').trim() : 'Male';
        const regDate = colIdx.regDate !== -1 ? row[colIdx.regDate].replace(/^["']|["']$/g, '').trim() : '';
        const pkgRaw = colIdx.pkg !== -1 ? row[colIdx.pkg].replace(/^["']|["']$/g, '').trim() : '';
        const expiryRaw = colIdx.expiry !== -1 ? row[colIdx.expiry].replace(/^["']|["']$/g, '').trim() : '';
        const trainerRaw = colIdx.trainer !== -1 ? row[colIdx.trainer]?.replace(/^["']|["']$/g, '').trim() : '';

        const extractPT = (pkgStr: string): { cleanPkg: string; hasPT: boolean } => {
          const ptPattern = /\bPT\b/i;
          const hasPT = ptPattern.test(pkgStr);
          const cleanPkg = pkgStr.replace(/\s*\bPT\b/gi, '').replace(/\s+/g, ' ').trim();
          return { cleanPkg: cleanPkg || pkgStr, hasPT };
        };

        const pkgs = pkgRaw.split(/[\n\r,;]+/).map(p => p.trim()).filter(Boolean);
        const expiries = expiryRaw.split(/[\n\r,;]+/).map(e => e.trim()).filter(Boolean);

        const pairs: { pkg: string; cleanPkg: string; expiryStr: string; expiryVal: number; hasPT: boolean }[] = [];
        const maxLen = Math.max(pkgs.length, expiries.length, 1);
        for (let i = 0; i < maxLen; i++) {
          const p = pkgs[i] || pkgs[pkgs.length - 1] || 'Monthly';
          const eStr = expiries[i] || expiries[expiries.length - 1] || '';
          const eVal = parseToDateVal(eStr);
          const { cleanPkg, hasPT } = extractPT(p);
          pairs.push({ pkg: p, cleanPkg, expiryStr: eStr, expiryVal: eVal, hasPT });
        }

        pairs.sort((a, b) => b.expiryVal - a.expiryVal);

        const latestPair = pairs[0] || { pkg: 'Monthly', cleanPkg: 'Monthly', expiryStr: '', expiryVal: 0, hasPT: false };
        const activePkg = latestPair.cleanPkg;
        const activeExpiry = latestPair.expiryStr;
        const rowHasPT = pairs.some(p => p.hasPT);
        const detectedTrainer = trainerRaw || (rowHasPT ? 'PT Member' : '');

        if (clientId && name) {
          if (currentMember) {
            parsedRecords.push(currentMember);
          }
          currentMember = {
            clientId,
            name,
            phone,
            gender,
            registrationDate: regDate || new Date().toISOString().split('T')[0],
            membershipPackage: activePkg,
            membershipExpiry: activeExpiry || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
            trainer: detectedTrainer,
            status: 'pending'
          };
        } else if (currentMember && (pkgRaw || expiryRaw)) {
          const tNew = parseToDateVal(activeExpiry);
          const tCurr = parseToDateVal(currentMember.membershipExpiry);
          if (rowHasPT && !currentMember.trainer) {
            currentMember.trainer = 'PT Member';
          }
          if (tNew > tCurr) {
            currentMember.membershipExpiry = activeExpiry;
            currentMember.membershipPackage = activePkg;
          }
        }
      }

      if (currentMember) {
        parsedRecords.push(currentMember);
      }

      setCsvData(parsedRecords);
      toast.success(`Successfully parsed ${parsedRecords.length} records.`);
      runMatchmakingStats(parsedRecords);
      setStep(2);

      // Trigger auto-match device users
      const unmatched = parsedRecords.filter(row => !deviceUsers.some(du => String(du.userId).trim() === String(row.clientId).trim()));
      if (unmatched.length > 0) {
        const toastId = toast.loading('Auto-matching profiles with device cache...');
        API.post('/devices/testing/seed-users', { 
          users: unmatched.map(u => ({ userId: u.clientId, name: u.name })) 
        }).then(async () => {
          const res = await API.get('/devices/testing/device-users');
          const updatedDeviceUsers = res.data || [];
          setDeviceUsers(updatedDeviceUsers);
          
          const deviceIds = new Set(updatedDeviceUsers.map((du: any) => String(du.userId).trim()));
          let matched = 0;
          let unm = 0;
          parsedRecords.forEach((rec) => {
            if (deviceIds.has(String(rec.clientId).trim())) {
              matched++;
            } else {
              unm++;
            }
          });
          setMatchedCount(matched);
          setUnmatchedCount(unm);
          toast.success(`Successfully auto-matched all ${parsedRecords.length} profiles!`, { id: toastId });
        }).catch((err) => {
          toast.error('Auto-matching failed: ' + err.message, { id: toastId });
        });
      }
    } catch (err: any) {
      toast.error('CSV Parsing Error: ' + err.message);
    }
  };

  const runMatchmakingStats = (records: CSVRecord[]) => {
    let matched = 0;
    let unmatched = 0;
    const deviceIds = new Set(deviceUsers.map(du => String(du.userId).trim()));
    records.forEach((rec) => {
      if (deviceIds.has(String(rec.clientId).trim())) {
        matched++;
      } else {
        unmatched++;
      }
    });
    setMatchedCount(matched);
    setUnmatchedCount(unmatched);
  };

  const triggerDiagnostics = async (action: 'connect' | 'read-users' | 'read-attendance' | 'sync-firebase') => {
    setDiagnosticLoading(action);
    try {
      let endpoint = `/devices/testing/${action}`;
      await API.post(endpoint);
      toast.success(`Triggered diagnostic: ${action}. Wait for state update.`);
      setTimeout(async () => {
        await fetchDiagnosticStatus();
        await fetchDeviceUsers();
        setDiagnosticLoading(null);
      }, 5000);
    } catch (err: any) {
      toast.error(`Diagnostic execution failed: ${err.message}`);
      setDiagnosticLoading(null);
    }
  };

  const autoSyncDeviceUsers = async () => {
    let sourceMembers = csvData.map(c => ({ userId: c.clientId, name: c.name }));

    if (sourceMembers.length === 0) {
      try {
        const toastId = toast.loading('Fetching existing members from CRM...');
        const res = await API.get('/members');
        const dbMembers = res.data || [];
        sourceMembers = dbMembers.map((m: any) => ({ userId: m.memberId, name: m.name }));
        toast.dismiss(toastId);
        
        if (sourceMembers.length === 0) {
          toast.error('No members found in CSV or Database to match.');
          return;
        }
      } catch (err: any) {
        toast.error('Failed to fetch members from database: ' + err.message);
        return;
      }
    }

    const unmatched = sourceMembers.filter(row => !deviceUsers.some(du => String(du.userId).trim() === String(row.userId).trim()));
    
    if (unmatched.length === 0) {
      toast.success('All users are already matched with the device!');
      return;
    }
    
    setDiagnosticLoading('read-users');
    try {
      const toastId = toast.loading(`Auto-matching ${unmatched.length} unmatched users...`);
      await API.post('/devices/testing/seed-users', { 
        users: unmatched 
      });
      toast.success(`Successfully auto-matched ${unmatched.length} users and updated device roster cache!`, { id: toastId });
      
      const res = await API.get('/devices/testing/device-users');
      setDeviceUsers(res.data || []);
      
      const deviceIds = new Set((res.data || []).map((du: any) => String(du.userId).trim()));
      let matched = 0;
      let unm = 0;
      sourceMembers.forEach((rec) => {
        if (deviceIds.has(String(rec.userId).trim())) {
          matched++;
        } else {
          unm++;
        }
      });
      setMatchedCount(matched);
      setUnmatchedCount(unm);
    } catch (err: any) {
      toast.error('Failed to auto-sync slots: ' + err.message);
    } finally {
      setDiagnosticLoading(null);
    }
  };

  const handlePurgeCRM = async () => {
    if (!confirm('WARNING: Are you absolutely sure you want to delete all members, attendance logs, payments, and reset the CRM? This cannot be undone.')) {
      return;
    }
    
    setDiagnosticLoading('purge-all');
    try {
      await API.post('/members/purge-all');
      toast.success('CRM database purged successfully! All fake members and logs deleted.');
      setCsvData([]);
      setMatchedCount(0);
      setUnmatchedCount(0);
      setStep(1);
      fetchDeviceUsers();
      fetchMigrations();
    } catch (err: any) {
      toast.error('Purge execution failed: ' + err.message);
    } finally {
      setDiagnosticLoading(null);
    }
  };

  const startMigration = async () => {
    if (csvData.length === 0) return;
    setMigrating(true);
    setStep(4);
    setSessionLogs(['[INFO] Starting member migration wizard...', `[INFO] CSV Rows Loaded: ${csvData.length}`]);

    const session = 'mig_' + Date.now();
    try {
      const res = await API.post('/members/migrate', {
        members: csvData,
        sessionId: session
      });

      if (res.data.success) {
        setMigrationStats(res.data.stats);
        setSessionLogs(res.data.stats.logs || ['Migration Finished successfully.']);
        toast.success('Migration session completed!');
        fetchMigrations();
        setStep(5);
      } else {
        throw new Error('Migration failed on server');
      }
    } catch (err: any) {
      setSessionLogs((prev) => [...prev, `[ERROR] Migration aborted: ${err.message}`]);
      toast.error('Migration session failed: ' + err.message);
    } finally {
      setMigrating(false);
    }
  };

  const handleRollback = async (sessionId: string) => {
    if (!confirm('Are you absolutely sure you want to rollback this session? This will delete all imported members, invoices, and attendance logs.')) {
      return;
    }
    try {
      const res = await API.post('/members/rollback-migration', { sessionId });
      if (res.data.success) {
        toast.success(res.data.message);
        fetchMigrations();
      }
    } catch (err: any) {
      toast.error('Rollback failed: ' + err.message);
    }
  };

  const handleManualMapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappingMemberId || !selectedDeviceUserId) return;
    try {
      const res = await API.post('/members/map-biometric', {
        memberId: mappingMemberId,
        deviceUserId: selectedDeviceUserId
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setMappingMemberId(null);
        setSelectedDeviceUserId('');
        const updatedCsv = csvData.map((c) => {
          if (c.clientId === mappingMemberId) {
            return { ...c, clientId: selectedDeviceUserId };
          }
          return c;
        });
        setCsvData(updatedCsv);
        runMatchmakingStats(updatedCsv);
      }
    } catch (err: any) {
      toast.error('Failed to map: ' + err.message);
    }
  };

  const filteredCsvData = csvData.filter((c) => {
    const term = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.phone.includes(term) || c.clientId.includes(term);
  });

  const getUrgentStats = () => {
    const today = new Date();
    const expired = csvData.filter(m => new Date(m.membershipExpiry) < today).length;
    const pt = csvData.filter(m => m.trainer && m.trainer.trim() !== '').length;
    const duplicates = csvData.filter(m => m.status === 'duplicate').length;
    return { expired, pt, duplicates };
  };

  const urgentStats = getUrgentStats();

  return (
    <div className="space-y-6 pb-12 w-full text-slate-800 text-left">
      {/* Top Title & Device Status */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <button
            onClick={() => router.push('/dashboard/settings')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer mb-2 font-bold bg-transparent border-none"
          >
            <ArrowLeft size={13} /> Back to Settings
          </button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-display">
            Member Migration Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Import existing members from CSV and map them with biometric IDs.
          </p>
        </div>

        {/* Device Status Card */}
        <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm flex items-center gap-4 min-w-[280px]">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Cpu size={20} />
          </div>
          <div className="flex-grow">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-slate-400">ESSL Device Status</span>
              <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                testerStatus?.connection === 'connected' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600 animate-pulse'
              }`}>
                {testerStatus?.connection === 'connected' ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2 text-[9.5px]">
              <div><span className="text-slate-400 font-medium">IP:</span> <span className="font-extrabold font-mono">{testerStatus?.ip || '192.168.1.12'}</span></div>
              <div><span className="text-slate-400 font-medium">Port:</span> <span className="font-extrabold font-mono">{testerStatus?.port || '4370'}</span></div>
              <div><span className="text-slate-400 font-medium">Slots:</span> <span className="font-extrabold font-mono">{deviceUsers.length}</span></div>
              <div><span className="text-slate-400 font-medium">Model:</span> <span className="font-extrabold">{testerStatus?.deviceName || 'ET100'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 flex flex-wrap gap-2.5 items-center shadow-sm">
        {[
          { label: 'Test Connection', icon: WifiIcon, action: () => triggerDiagnostics('connect'), key: 'connect', color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 hover:shadow-emerald-100/10' },
          { label: 'Read Device Users', icon: UsersIcon, action: () => triggerDiagnostics('read-users'), key: 'read-users', color: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 hover:shadow-blue-100/10' },
          { label: 'Read Attendance', icon: ClockIcon, action: () => triggerDiagnostics('read-attendance'), key: 'read-attendance', color: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100 hover:shadow-purple-100/10' },
          { label: 'Sync Device', icon: RefreshCwIcon, action: () => triggerDiagnostics('sync-firebase'), key: 'sync-firebase', color: 'bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-100 hover:shadow-teal-100/10' },
          { label: 'Auto Map', icon: UserCheckIcon, action: autoSyncDeviceUsers, key: 'auto-map', color: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 hover:shadow-amber-100/10' },
          { label: 'Purge Imported Data', icon: Trash2Icon, action: handlePurgeCRM, key: 'purge-all', color: 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 hover:shadow-rose-100/10' }
        ].map(btn => (
          <button
            key={btn.key}
            onClick={btn.action}
            disabled={diagnosticLoading !== null}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${btn.color}`}
          >
            {diagnosticLoading === btn.key ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <btn.icon size={13} />
            )}
            {btn.label}
          </button>
        ))}
      </div>

      {/* Progress Wizard */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          {[
            { id: 1, label: 'Upload CSV' },
            { id: 2, label: 'Verify Data' },
            { id: 3, label: 'Map Members' },
            { id: 4, label: 'Import' },
            { id: 5, label: 'Complete' }
          ].map((s, idx) => {
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                      : isCompleted 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {isCompleted ? <Check size={14} /> : s.id}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < 4 && (
                  <div className="flex-grow h-0.5 mx-4 max-w-[80px] bg-slate-100 rounded">
                    <div className="h-full bg-indigo-600 rounded transition-all duration-300" style={{ width: isCompleted ? '100%' : '0%' }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Flow Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Step 1: Upload CSV Area */}
        {step === 1 && (
          <>
            {/* Left Side: Upload drag & drop */}
            <div className="lg:col-span-8 space-y-6">
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`bg-white border-2 border-dashed rounded-[32px] p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer group min-h-[360px] ${
                  dragActive ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-200 hover:border-indigo-500 hover:bg-slate-50/30'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".csv"
                  className="hidden" 
                />
                
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-200">
                  <FileSpreadsheet size={28} />
                </div>
                
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  Drag & Drop CSV here
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">
                  or <span className="text-indigo-600 hover:underline">browse files</span> from your computer
                </p>
                <div className="mt-6 flex gap-4 text-[9.5px] font-black uppercase text-slate-400 tracking-wider">
                  <span>Supported: CSV</span>
                  <span>•</span>
                  <span>Max size: 20MB</span>
                </div>
              </div>

              {/* Template Download / Instructions */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <HelpCircle size={15} className="text-indigo-600" />
                    How to prepare your CSV file
                  </h3>
                  <a 
                    href="/Alpha_Zone_Import_Template.csv" 
                    download
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer decoration-none"
                  >
                    <Download size={12} /> Download CSV Template
                  </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="font-extrabold text-slate-700">Required Headers:</div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-500 font-medium">
                      <li><b>Client ID</b> (maps to biometric user ID slot number)</li>
                      <li><b>Name</b> (member name, matches device user name)</li>
                      <li><b>Phone</b> (used for mobile login credentials)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <div className="font-extrabold text-slate-700">Optional Headers:</div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-500 font-medium">
                      <li><b>Gender</b> (defaults to Male)</li>
                      <li><b>Membership Package</b> (Monthly, Quarterly, Annual Premium)</li>
                      <li><b>Membership Expiry</b> (expiry date DD-MM-YYYY)</li>
                      <li><b>Trainer</b> (assigned personal trainer coach)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Quick Stats Summary */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4 text-xs font-semibold">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Device User Cache</span>
                
                <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                  <span className="text-slate-500">Device User Slots</span>
                  <span className="font-mono font-black text-slate-900">{deviceUsers.length}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                  <span className="text-slate-500">Connected Device</span>
                  <span className="font-black text-slate-800">{testerStatus?.ip || 'ESSL Device'}</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-slate-500">Active Migrations</span>
                  <span className="font-black text-indigo-600">{sessions.length}</span>
                </div>
              </div>

              <div className="bg-indigo-950 text-white p-5 rounded-3xl shadow-md space-y-3">
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-350">Enterprise CRM sync</span>
                <h4 className="text-sm font-extrabold leading-tight">Fast Biometric Mapping</h4>
                <p className="text-[10.5px] text-indigo-250 leading-relaxed font-medium">
                  Uploading the CSV automatically checks user IDs against ESSL hardware terminals and maps credentials on the fly.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Verify & Summary Table */}
        {step === 2 && (
          <>
            {/* Left Side: Table Preview */}
            <div className="lg:col-span-9 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                
                {/* Search Bar */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search parsed records..."
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-medium"
                    />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {filteredCsvData.length} records found
                  </span>
                </div>

                {/* Table container */}
                <div className="overflow-x-auto max-h-[420px] scrollbar-thin">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3.5">Client ID</th>
                        <th className="px-4 py-3.5">Member Name</th>
                        <th className="px-4 py-3.5">Phone</th>
                        <th className="px-4 py-3.5">Membership</th>
                        <th className="px-4 py-3.5">Expiry</th>
                        <th className="px-4 py-3.5">PT Coach</th>
                        <th className="px-4 py-3.5">Biometric Status</th>
                        <th className="px-4 py-3.5">Validate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {filteredCsvData.map((row, idx) => {
                        const isMatched = deviceUsers.some(du => String(du.userId).trim() === String(row.clientId).trim());
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-slate-800">{row.clientId}</td>
                            <td className="px-4 py-3">{row.name}</td>
                            <td className="px-4 py-3 font-mono text-[10.5px] text-slate-500">{row.phone}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9.5px] font-bold">
                                {row.membershipPackage}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-500">{row.membershipExpiry}</td>
                            <td className="px-4 py-3">
                              {row.trainer ? (
                                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                  {row.trainer}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[10px]">None</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isMatched ? (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                                  Linked ({row.clientId})
                                </span>
                              ) : (
                                <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">
                                  Not Synced
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {!row.phone ? (
                                <span className="text-[9.5px] text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">❌ Missing Phone</span>
                              ) : (
                                <span className="text-[9.5px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">✅ Valid</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Row controls */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-3">
                  <button 
                    onClick={() => { setCsvData([]); setStep(1); }}
                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setStep(3)}
                      className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      Map Biometrics
                    </button>
                    <button 
                      onClick={startMigration}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-600/10"
                    >
                      Import Members
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Side: Import Summary Card */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white border border-slate-100 p-5 rounded-[28px] shadow-sm space-y-4 text-xs font-semibold">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Import Summary</span>
                
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Rows Found</span>
                    <span className="font-mono font-black text-slate-900">{csvData.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Duplicates</span>
                    <span className="font-mono font-black text-slate-800">{urgentStats.duplicates}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Expired Packages</span>
                    <span className="font-mono font-black text-orange-600">{urgentStats.expired}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">PT Members</span>
                    <span className="font-mono font-black text-indigo-600">{urgentStats.pt}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500 font-medium">Estimated Time</span>
                    <span className="font-black text-slate-800">~ 2 Sec</span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-3xl space-y-2">
                <h4 className="text-[11px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-500" />
                  Ready to Sync
                </h4>
                <p className="text-[10px] text-emerald-600 font-medium leading-relaxed">
                  All profiles validated successfully. Biometric records matched: <b>{matchedCount}</b>, missing: <b>{unmatchedCount}</b>.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Biometric Matchmaker */}
        {step === 3 && (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Biometric Mapping Desk</h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                    Unmatched: {unmatchedCount} Members · Matched: {matchedCount} Members
                  </p>
                </div>
                <button 
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 cursor-pointer"
                >
                  Back to Verify
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Side: Unmatched CSV list */}
                <div className="space-y-3.5 border-r border-slate-100 pr-0 md:pr-6">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Unmapped Profiles</span>
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {csvData.filter(c => !deviceUsers.some(du => String(du.userId).trim() === String(c.clientId).trim())).map((row) => (
                      <div 
                        key={row.clientId} 
                        onClick={() => setMappingMemberId(row.clientId)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                          mappingMemberId === row.clientId 
                            ? 'bg-indigo-50 border-indigo-200' 
                            : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-extrabold text-slate-800">{row.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">CSV Client ID: {row.clientId} · {row.phone}</div>
                        </div>
                        <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Select to Map</span>
                      </div>
                    ))}
                    {csvData.filter(c => !deviceUsers.some(du => String(du.userId).trim() === String(c.clientId).trim())).length === 0 && (
                      <div className="text-center py-10 text-xs text-slate-400 italic">All members are successfully mapped! 🎉</div>
                    )}
                  </div>
                </div>

                {/* Right Side: Mapping Form / Action */}
                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider font-display">Link selected to device slot</span>
                  
                  {mappingMemberId ? (
                    <form onSubmit={handleManualMapSubmit} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Selected CSV Member ID</label>
                        <input 
                          type="text" 
                          disabled 
                          value={mappingMemberId} 
                          className="w-full mt-1.5 p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700" 
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Select Device Biometric Slot</label>
                        <select 
                          value={selectedDeviceUserId} 
                          onChange={(e) => setSelectedDeviceUserId(e.target.value)}
                          required
                          className="w-full mt-1.5 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="">-- Select biometric slot --</option>
                          {deviceUsers.map((du) => (
                            <option key={du.userId} value={du.userId}>
                              Slot #{du.userId} - {du.name || 'Unnamed'} ({du.fingerprintCount} Fingerprints)
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-600/10 transition-transform active:scale-95"
                      >
                        Confirm Slot Mapping
                      </button>
                    </form>
                  ) : (
                    <div className="h-[240px] border border-slate-150 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-400 text-center gap-2 p-6">
                      <UserCheck size={28} className="opacity-40" />
                      <span className="text-xs font-bold">Select an unmapped profile from the left list to begin slot mapping</span>
                    </div>
                  )}

                  <div className="bg-slate-950 text-white p-4 rounded-2xl flex gap-2.5 items-start">
                    <Terminal size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                    <div className="text-[10px]">
                      <span className="font-extrabold text-indigo-400 block uppercase tracking-wider">Device Slot Hint</span>
                      <p className="text-slate-400 font-medium leading-normal mt-0.5">Ensure the Client ID in your CSV matches the User ID enrolled on the ESSL biometric terminal. If not, map them manually above.</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Step 4: Import Terminal Progress console logs */}
        {step === 4 && (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                    {migrating ? (
                      <RefreshCw size={18} className="text-indigo-600 animate-spin" />
                    ) : (
                      <CheckCircle size={18} className="text-emerald-500" />
                    )}
                    Database Migration Progress
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                    {migrating ? 'Writing and parsing rows...' : 'Import operation completed'}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${migrating ? 'bg-indigo-600 animate-pulse' : 'bg-emerald-500'}`} 
                  style={{ width: migrating ? '75%' : '100%' }}
                />
              </div>

              {/* Terminal Logs Box */}
              <div className="bg-slate-950 text-slate-350 p-5 rounded-2xl border border-slate-900 font-mono text-[10.5px] space-y-1.5 h-[280px] overflow-y-auto scrollbar-thin">
                {sessionLogs.map((log, i) => {
                  let color = 'text-slate-350';
                  if (log.includes('[ERROR]')) color = 'text-rose-400 font-bold';
                  else if (log.includes('[SUCCESS]')) color = 'text-emerald-450 font-bold';
                  else if (log.includes('[WARN]')) color = 'text-amber-400';
                  return (
                    <div key={i} className={`${color}`}>
                      {log}
                    </div>
                  );
                })}
                <div ref={terminalEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Success screen & Actions */}
        {step === 5 && (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center max-w-2xl mx-auto space-y-6">
              
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto text-2xl animate-bounce">
                🎉
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">IMPORT COMPLETED SUCCESSFULLY</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Session ID: {migrationStats?.sessionId || 'mig_000'}
                </p>
              </div>

              {/* Detailed metrics box */}
              <div className="grid grid-cols-4 gap-4 p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                {[
                  { label: 'Imported', value: migrationStats?.imported || 0, color: 'text-indigo-600' },
                  { label: 'Skipped', value: migrationStats?.duplicates || 0, color: 'text-slate-500' },
                  { label: 'PT Assigned', value: migrationStats?.ptCreated || 0, color: 'text-emerald-600' },
                  { label: 'Total Scanned', value: csvData.length, color: 'text-slate-900 font-extrabold' }
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{stat.label}</span>
                    <span className={`text-xl font-black font-mono mt-1 block ${stat.color}`}>{stat.value}</span>
                  </div>
                ))}
              </div>

              {/* Success Actions */}
              <div className="flex flex-wrap justify-center gap-3 pt-3">
                <button 
                  onClick={() => router.push('/dashboard/members')}
                  className="px-5 py-2.5 bg-black text-white hover:bg-black/90 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md"
                >
                  View Members
                </button>
                <button 
                  onClick={() => router.push('/dashboard/enquiries')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  View Enquiries
                </button>
                {migrationStats?.sessionId && (
                  <button 
                    onClick={() => { handleRollback(migrationStats.sessionId); setStep(1); }}
                    className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Rollback Import
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Import History */}
      {step === 1 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mt-6">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <History size={15} className="text-indigo-600" />
              Migration Log History
            </h3>
            <button 
              onClick={fetchMigrations}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4">Session ID</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4 text-center">Imported</th>
                  <th className="px-5 py-4 text-center">Skipped</th>
                  <th className="px-5 py-4 text-center">Success %</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {sessions.map((sess) => (
                  <tr key={sess.sessionId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-800">{sess.sessionId}</td>
                    <td className="px-5 py-4 font-mono text-slate-500">
                      {new Date(sess.timestamp || parseInt(sess.sessionId.split('_')[1], 10) || Date.now()).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4 text-center font-mono text-emerald-600">{sess.imported}</td>
                    <td className="px-5 py-4 text-center font-mono text-slate-400">{sess.duplicates}</td>
                    <td className="px-5 py-4 text-center font-mono font-bold text-slate-800">{sess.successPercent}%</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                        sess.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {sess.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button 
                        onClick={() => handleRollback(sess.sessionId)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        Rollback
                      </button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 italic font-medium">No migration history logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline Icon definitions to ensure no build/import issues
function WifiIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
      <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
      <line x1="12" y1="20" x2="12.01" y2="20"></line>
    </svg>
  );
}

function UsersIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );
}

function ClockIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}

function RefreshCwIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
  );
}

function UserCheckIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="8" cy="7" r="4"></circle>
      <polyline points="17 11 19 13 23 9"></polyline>
    </svg>
  );
}

function Trash2Icon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  );
}
