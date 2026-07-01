'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Check, AlertTriangle, AlertCircle, RefreshCw, Trash2, ArrowLeft,
  ArrowRight, UserCheck, Play, Download, Search, CheckCircle, Database, ShieldAlert
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
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
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    try {
      // Helper function to parse CSV rows respecting quoted commas and line breaks
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

      // Map Headers to identify columns
      const headers = rows[0].map(h => h.trim().toLowerCase().replace(/["']/g, ''));
      
      // Robust header matching helper
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
        toast.error('Required headers not found. CSV must contain Client ID, Name/Client name, and Phone/Number.');
        return;
      }

      const parsedRecords: CSVRecord[] = [];
      const dataRows = rows.slice(1);
      
      let currentMember: CSVRecord | null = null;

      // Helper to parse dates like DD-MM-YYYY or DD/MM/YYYY into timestamp for comparison
      const parseToDateVal = (dStr: string): number => {
        if (!dStr) return 0;
        const cleaned = dStr.trim();

        // 1. Normalize separators to hyphens
        const normalized = cleaned.replace(/[\/\.]/g, '-');
        const parts = normalized.split('-');

        if (parts.length === 3) {
          let part0 = parts[0].trim();
          let part1 = parts[1].trim();
          let part2 = parts[2].trim();

          const monthNames: Record<string, number> = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
            january: 0, february: 1, march: 2, april: 3, june: 5,
            july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
          };

          const getMonthIndex = (m: string): number => {
            const lower = m.toLowerCase();
            if (monthNames[lower] !== undefined) return monthNames[lower];
            const val = parseInt(m, 10);
            if (!isNaN(val) && val >= 1 && val <= 12) return val - 1;
            return -1;
          };

          // Case A: Year is part2 (e.g. DD-MM-YYYY or DD-MM-YY)
          if (part2.length === 4 || part2.length === 2) {
            let year = part2.length === 2 ? 2000 + parseInt(part2, 10) : parseInt(part2, 10);
            let monthIdx = getMonthIndex(part1);
            let day = parseInt(part0, 10);
            if (monthIdx !== -1 && !isNaN(day) && day >= 1 && day <= 31) {
              return new Date(year, monthIdx, day).getTime();
            }
          }

          // Case B: Year is part0 (e.g. YYYY-MM-DD or YY-MM-DD)
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
        // Skip rows that don't have enough columns (could be partial/malformed)
        if (row.length < headers.length) continue;

        const clientId = colIdx.clientId !== -1 ? row[colIdx.clientId].replace(/^["']|["']$/g, '').trim() : '';
        const name = colIdx.name !== -1 ? row[colIdx.name].replace(/^["']|["']$/g, '').trim() : '';
        const phone = colIdx.phone !== -1 ? row[colIdx.phone].replace(/^["']|["']$/g, '').trim() : '';
        const gender = colIdx.gender !== -1 ? row[colIdx.gender].replace(/^["']|["']$/g, '').trim() : 'Male';
        const regDate = colIdx.regDate !== -1 ? row[colIdx.regDate].replace(/^["']|["']$/g, '').trim() : '';
        const pkgRaw = colIdx.pkg !== -1 ? row[colIdx.pkg].replace(/^["']|["']$/g, '').trim() : '';
        const expiryRaw = colIdx.expiry !== -1 ? row[colIdx.expiry].replace(/^["']|["']$/g, '').trim() : '';
        const trainerRaw = colIdx.trainer !== -1 ? row[colIdx.trainer]?.replace(/^["']|["']$/g, '').trim() : '';

        // Helper: extract PT flag from package string like "1 Month PT" → { cleanPkg: "1 Month", hasPT: true }
        const extractPT = (pkgStr: string): { cleanPkg: string; hasPT: boolean } => {
          const ptPattern = /\bPT\b/i;
          const hasPT = ptPattern.test(pkgStr);
          const cleanPkg = pkgStr.replace(/\s*\bPT\b/gi, '').replace(/\s+/g, ' ').trim();
          return { cleanPkg: cleanPkg || pkgStr, hasPT };
        };

        // Split multiline Package and Expiry
        const pkgs = pkgRaw.split(/[\n\r,;]+/).map(p => p.trim()).filter(Boolean);
        const expiries = expiryRaw.split(/[\n\r,;]+/).map(e => e.trim()).filter(Boolean);

        // Build pairs with PT detection
        const pairs: { pkg: string; cleanPkg: string; expiryStr: string; expiryVal: number; hasPT: boolean }[] = [];
        const maxLen = Math.max(pkgs.length, expiries.length, 1);
        for (let i = 0; i < maxLen; i++) {
          const p = pkgs[i] || pkgs[pkgs.length - 1] || 'Monthly';
          const eStr = expiries[i] || expiries[expiries.length - 1] || '';
          const eVal = parseToDateVal(eStr);
          const { cleanPkg, hasPT } = extractPT(p);
          pairs.push({ pkg: p, cleanPkg, expiryStr: eStr, expiryVal: eVal, hasPT });
        }

        // Sort descending by date value to find latest expiry
        pairs.sort((a, b) => b.expiryVal - a.expiryVal);

        const latestPair = pairs[0] || { pkg: 'Monthly', cleanPkg: 'Monthly', expiryStr: '', expiryVal: 0, hasPT: false };
        const activePkg = latestPair.cleanPkg;
        const activeExpiry = latestPair.expiryStr;
        // PT flag: true if ANY of the packages for this row has PT
        const rowHasPT = pairs.some(p => p.hasPT);
        // Also check explicit trainer column
        const detectedTrainer = trainerRaw || (rowHasPT ? 'PT Member' : '');

        // If the row has a client ID and name, it's a new member row
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
          // It's a sub-row/additional subscription for the same member!
          const tNew = parseToDateVal(activeExpiry);
          const tCurr = parseToDateVal(currentMember.membershipExpiry);

          // If sub-row has PT flag, propagate it to the member
          if (rowHasPT && !currentMember.trainer) {
            currentMember.trainer = 'PT Member';
          }

          // We always want to keep the latest expiration date!
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
      
      // Calculate matchmaking stats
      runMatchmakingStats(parsedRecords);
      setStep(2);

      // Automatically trigger auto-match & seeding
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
    
    // Convert device cached user IDs to Set for O(1) lookup
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

  // Device Diagnostics triggers
  const triggerDiagnostics = async (action: 'connect' | 'read-users' | 'read-attendance' | 'sync-firebase') => {
    setDiagnosticLoading(action);
    try {
      let endpoint = `/devices/testing/${action}`;
      await API.post(endpoint);
      toast.success(`Triggered diagnostic: ${action}. Wait for state update.`);
      
      // Poll tester status
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

    // If no CSV is uploaded, fetch existing active members from the database
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
      
      // If we used DB members, just update stats against them
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
      
      // Reset local states
      setCsvData([]);
      setMatchedCount(0);
      setUnmatchedCount(0);
      setStep(1);
      
      // Refresh device list and migrations list
      fetchDeviceUsers();
      fetchMigrations();
    } catch (err: any) {
      toast.error('Purge execution failed: ' + err.message);
    } finally {
      setDiagnosticLoading(null);
    }
  };

  // Trigger Migration batch
  const startMigration = async () => {
    if (csvData.length === 0) return;
    setMigrating(true);
    setStep(3);
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

  // Revert/Rollback
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

  // Manual Mapping
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
        // Refresh mapping stats
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

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen text-white">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
        <div>
          <button
            onClick={() => router.push('/dashboard/settings')}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors cursor-pointer mb-2 font-bold bg-transparent border-none"
          >
            <ArrowLeft size={13} /> Back to Settings
          </button>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase font-display">
            Member Migration Center
          </h1>
          <p className="text-xs text-white/60 font-medium">
            Import existing gym rosters and map users to biometric terminals securely.
          </p>
        </div>

        {/* Actions & Status container */}
        <div className="flex items-center gap-3">
          {/* Purge CRM Button */}
          <button
            onClick={handlePurgeCRM}
            disabled={!!diagnosticLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-xs font-black text-red-400 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {diagnosticLoading === 'purge-all' ? <RefreshCw size={13} className="animate-spin text-red-400" /> : <Trash2 size={13} className="text-red-400" />}
            Purge CRM Data
          </button>

          {/* Device Status Info */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 shadow-sm backdrop-blur-md">
            <div className="text-left">
              <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">ESSL Terminal Status</span>
              <div className="text-xs font-black text-white flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${testerStatus.connection === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                {testerStatus.deviceName || 'Main Gate'} ({testerStatus.connection === 'connected' ? 'ONLINE' : 'OFFLINE'})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection & Diagnostic Actions */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 bg-white/5 p-4 rounded-3xl border border-white/10 shadow-sm backdrop-blur-sm">
        <button
          onClick={() => triggerDiagnostics('connect')}
          disabled={!!diagnosticLoading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900/5 hover:bg-slate-900/10 border border-slate-900/10 rounded-xl text-xs font-bold text-slate-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          {diagnosticLoading === 'connect' ? <RefreshCw size={13} className="animate-spin text-blue-400" /> : <Database size={13} className="text-blue-400" />}
          Test Connection
        </button>
        <button
          onClick={() => triggerDiagnostics('read-users')}
          disabled={!!diagnosticLoading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900/5 hover:bg-slate-900/10 border border-slate-900/10 rounded-xl text-xs font-bold text-slate-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          {diagnosticLoading === 'read-users' ? <RefreshCw size={13} className="animate-spin text-yellow-400" /> : <UserCheck size={13} className="text-yellow-400" />}
          Read Device Users
        </button>
        <button
          onClick={() => triggerDiagnostics('read-attendance')}
          disabled={!!diagnosticLoading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900/5 hover:bg-slate-900/10 border border-slate-900/10 rounded-xl text-xs font-bold text-slate-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          {diagnosticLoading === 'read-attendance' ? <RefreshCw size={13} className="animate-spin text-purple-400" /> : <Play size={13} className="text-purple-400" />}
          Read Attendance Logs
        </button>
        <button
          onClick={() => triggerDiagnostics('sync-firebase')}
          disabled={!!diagnosticLoading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900/5 hover:bg-slate-900/10 border border-slate-900/10 rounded-xl text-xs font-bold text-slate-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          {diagnosticLoading === 'sync-firebase' ? <RefreshCw size={13} className="animate-spin text-green-400" /> : <RefreshCw size={13} className="text-green-400" />}
          Sync Users roster
        </button>
        <button
          onClick={autoSyncDeviceUsers}
          disabled={!!diagnosticLoading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#d4ff00]/10 hover:bg-[#d4ff00]/25 border border-[#d4ff00]/30 rounded-xl text-xs font-black text-[#d4ff00] shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          {diagnosticLoading === 'read-users' ? <RefreshCw size={13} className="animate-spin text-[#d4ff00]" /> : <CheckCircle size={13} className="text-[#d4ff00]" />}
          Auto-Map & Read
        </button>
        <button
          onClick={handlePurgeCRM}
          disabled={!!diagnosticLoading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-xs font-black text-red-400 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          {diagnosticLoading === 'purge-all' ? <RefreshCw size={13} className="animate-spin text-red-400" /> : <Trash2 size={13} className="text-red-400" />}
          Purge CRM Data
        </button>
      </div>

      {/* Migration Dashboard Progress Steps */}
      <div className="flex justify-between items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step >= 1 ? 'bg-[#d4ff00] text-slate-950 shadow-sm' : 'bg-white/10 text-white/40'}`}>1</div>
          <span className={`text-xs font-bold ${step === 1 ? 'text-white' : 'text-white/40'}`}>Upload File</span>
        </div>
        <div className="h-0.5 flex-grow bg-white/10" />
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step >= 2 ? 'bg-[#d4ff00] text-slate-950 shadow-sm' : 'bg-white/10 text-white/40'}`}>2</div>
          <span className={`text-xs font-bold ${step === 2 ? 'text-white' : 'text-white/40'}`}>Match & Verify</span>
        </div>
        <div className="h-0.5 flex-grow bg-white/10" />
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step >= 3 ? 'bg-[#d4ff00] text-slate-950 shadow-sm' : 'bg-white/10 text-white/40'}`}>3</div>
          <span className={`text-xs font-bold ${step === 3 ? 'text-white' : 'text-white/40'}`}>Import Wizard</span>
        </div>
      </div>

      {/* Main Wizard Content Area */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="p-8 rounded-3xl border border-white/10 bg-[#12131a]/60 backdrop-blur-xl shadow-2xl text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-[#d4ff00]/10 flex items-center justify-center mx-auto">
              <Upload size={28} className="text-[#d4ff00]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Upload Member Roster</h2>
              <p className="text-xs text-white/50 mt-1 max-w-md mx-auto">
                Drag and drop your roster CSV or Excel file. Make sure headers contain Client ID, Name (or Client name), Phone (or Number), and optionally packages or expiry dates.
              </p>
            </div>

            <div className="max-w-md mx-auto border-2 border-dashed border-white/20 hover:border-[#d4ff00] rounded-3xl p-8 transition-colors cursor-pointer relative bg-white/5">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Download className="mx-auto text-white/40 mb-2" size={24} />
              <span className="text-xs font-bold text-white/50">Click or Drag CSV File here</span>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Matchmaking Statistics Card */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-md">
                <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Total in File</span>
                <div className="text-3xl font-black text-white mt-1">{csvData.length}</div>
              </div>
              <div className="p-5 rounded-3xl bg-emerald-950/20 border border-emerald-500/20 shadow-sm">
                <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Device Matched</span>
                <div className="text-3xl font-black text-emerald-400 mt-1 flex items-baseline gap-1.5 font-display">
                  {matchedCount}
                  <span className="text-xs font-bold text-emerald-400/80">({csvData.length > 0 ? Math.round((matchedCount / csvData.length) * 100) : 0}%)</span>
                </div>
              </div>
              <div className="p-5 rounded-3xl bg-amber-950/20 border border-amber-500/20 shadow-sm">
                <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider">Unmatched / Not Found</span>
                <div className="text-3xl font-black text-amber-400 mt-1">{unmatchedCount}</div>
              </div>
              <div className="p-5 rounded-3xl bg-lime-950/20 border border-lime-500/20 shadow-sm">
                <span className="text-[9px] font-black uppercase text-lime-400 tracking-wider">Pending Upload</span>
                <div className="text-3xl font-black text-lime-400 mt-1">{csvData.length}</div>
              </div>
            </div>

            {/* Verification and Manual Mapping Center */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Side: Table & Search */}
              <div className="lg:col-span-2 p-6 rounded-3xl border border-white/10 bg-[#12131a]/60 backdrop-blur-xl shadow-2xl space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <h3 className="text-sm font-black uppercase text-white tracking-wide font-display">Parsed Member List</h3>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 text-white/40" size={13} />
                    <input
                      type="text"
                      placeholder="Search member in file..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 text-xs bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-brand-cyan/50 hover:border-white/20 transition-all placeholder-white/30"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[360px] custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/15 text-[9px] text-white/40 font-black uppercase tracking-wider">
                        <th className="py-2.5 px-3">Client ID</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Package</th>
                        <th className="py-2.5 px-3">PT (Trainer)</th>
                        <th className="py-2.5 px-3">Expiry Date</th>
                        <th className="py-2.5 px-3">Sync Match</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCsvData.map((row, index) => {
                        const isDeviceUserMatch = deviceUsers.some(du => String(du.userId).trim() === String(row.clientId).trim());
                        return (
                          <tr key={index} className="border-b border-white/5 hover:bg-white/5 text-xs transition-colors">
                            <td className="py-3 px-3 font-mono text-white/80 font-bold">{row.clientId}</td>
                            <td className="py-3 px-3 font-black text-white font-display">{row.name}</td>
                            <td className="py-3 px-3 text-white/70 font-medium">{row.phone}</td>
                            <td className="py-3 px-3">
                              <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">{row.membershipPackage}</span>
                            </td>
                            <td className="py-3 px-3">
                              {row.trainer ? (
                                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-bold w-fit">
                                  👤 {row.trainer}
                                </span>
                              ) : (
                                <span className="text-white/30 text-[10px] font-medium">— No PT</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {row.membershipExpiry ? (
                                (() => {
                                  const expDate = new Date(row.membershipExpiry);
                                  const isExpired = expDate < new Date();
                                  const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                  return (
                                    <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold w-fit border ${
                                      isExpired
                                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                        : daysLeft <= 15
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    }`}>
                                      {isExpired ? '🔴' : daysLeft <= 15 ? '🟠' : '🟢'} {row.membershipExpiry}
                                    </span>
                                  );
                                })()
                              ) : (
                                <span className="text-white/30 text-[10px] font-medium">— No Date</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {isDeviceUserMatch ? (
                                <span className="flex items-center gap-1 text-emerald-400 font-black text-[10px]">
                                  <CheckCircle size={10} /> Auto Matched
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-amber-400 font-bold text-[10px]">
                                  <AlertCircle size={10} /> Device ID Not Found
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {!isDeviceUserMatch && (
                                <button
                                  onClick={() => setMappingMemberId(row.clientId)}
                                  className="px-2.5 py-1 text-[10px] font-black bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-white cursor-pointer transition-all uppercase tracking-wider"
                                >
                                  Map Slot ID
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                  >
                    Back to Upload
                  </button>
                  <button
                    onClick={startMigration}
                    className="px-5 py-2.5 bg-[#d4ff00] text-slate-950 text-xs font-black rounded-xl hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-sm font-display border-none"
                  >
                    Start Import Wizard <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Right Side: Manual Matchmaker Form */}
              <div className="p-6 rounded-3xl border border-white/10 bg-[#12131a]/60 backdrop-blur-xl shadow-2xl flex flex-col justify-between min-h-[350px] text-left">
                <div>
                  <h3 className="text-sm font-black uppercase text-white font-display flex items-center gap-1.5 mb-2">
                    <UserCheck size={14} className="text-[#d4ff00]" />
                    Manual Matchmaker
                  </h3>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Map unmatched members to their physical ESSL K90 Pro user slot IDs. Manual links will immediately sync to CRM.
                  </p>

                  {mappingMemberId ? (
                    <form onSubmit={handleManualMapSubmit} className="space-y-4 mt-5 animate-slide-up">
                      <div>
                        <label className="text-[9px] font-black uppercase text-white/40 tracking-wider">Selected Client ID</label>
                        <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white mt-1 font-mono">
                          {mappingMemberId}
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-black uppercase text-white/40 tracking-wider">Map to Device User ID</label>
                        <select
                          value={selectedDeviceUserId}
                          onChange={(e) => setSelectedDeviceUserId(e.target.value)}
                          required
                          className="w-full mt-1 p-2.5 text-xs bg-slate-900 border border-white/10 rounded-xl text-white outline-none cursor-pointer font-bold"
                        >
                          <option value="" className="bg-[#12131a] text-white/50">-- Choose ZK User Slot --</option>
                          {deviceUsers.map((du) => (
                            <option key={du.userId} value={du.userId} className="bg-[#12131a] text-white">
                              ID: {du.userId} | {du.name} (FPs: {du.fingerprintCount})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-[#d4ff00] text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer hover:brightness-110 transition-all uppercase tracking-wider border-none"
                      >
                        Confirm Match Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setMappingMemberId(null)}
                        className="w-full py-2 border border-white/10 bg-white/5 text-white/80 hover:text-white text-xs font-bold rounded-xl hover:bg-white/10 cursor-pointer shadow-sm transition-all uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <div className="py-8 text-center space-y-4">
                      <div className="text-white/40 italic text-xs font-medium">
                        Select "Map Slot ID" from the table to map a member manually.
                      </div>
                      {csvData.length > 0 && unmatchedCount > 0 && (
                        <div className="pt-4 border-t border-white/10">
                          <button
                            type="button"
                            onClick={autoSyncDeviceUsers}
                            className="w-full py-2.5 bg-[#d4ff00] text-slate-950 text-xs font-black rounded-xl hover:brightness-110 flex items-center justify-center gap-1.5 cursor-pointer shadow-md font-display border-none uppercase tracking-wider transition-all animate-pulse"
                          >
                            ⚡ Auto-Read & Match ({unmatchedCount} users)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-blue-500/10 rounded-2xl border border-blue-500/25 flex gap-2 items-start text-left shadow-sm">
                  <Database size={14} className="text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-300 leading-normal">
                    Matches are loaded from device roster cache. Click <strong>Read Device Users</strong> above to sync cache.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Scrollable Live Sync Terminal logs */}
            <div className="p-6 rounded-3xl border border-white/10 bg-slate-950 text-[#d4ff00] font-mono text-xs flex flex-col justify-between h-[360px] shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#d4ff00]/25 pb-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${migrating ? 'bg-amber-500 animate-ping' : 'bg-green-500'}`} />
                  Migration Terminal Output
                </span>
                <span className="text-[9px] text-[#d4ff00]/60">AZ-OS v1.0.2</span>
              </div>

              <div className="flex-grow overflow-y-auto space-y-1.5 pr-2 custom-scrollbar text-left">
                {sessionLogs.map((log, idx) => (
                  <div key={idx} className={log.includes('[ERROR]') ? 'text-red-400 font-bold' : log.includes('[SUCCESS]') ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                    {log}
                  </div>
                ))}
                {migrating && (
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold mt-2 animate-pulse">
                    <RefreshCw size={11} className="animate-spin" /> Batching entries in transaction...
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>

            {/* Migration Report stats */}
            {migrationStats && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1 }}
                className="p-6 rounded-3xl border border-white/10 bg-[#12131a]/60 backdrop-blur-xl text-left space-y-6 shadow-2xl"
              >
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider font-display">CSV Import Summary</h3>
                  <p className="text-[10px] text-white/50">Historical import session: <span className="font-mono text-white">{migrationStats.sessionId}</span></p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[9px] font-black uppercase text-white/40">Total Rows</span>
                    <div className="text-2xl font-black text-white mt-1">{migrationStats.totalRows || migrationStats.totalMembers}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[9px] font-black uppercase text-emerald-400">Imported Members</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">{migrationStats.importedMembers || migrationStats.imported}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[9px] font-black uppercase text-amber-400">Duplicates Updated</span>
                    <div className="text-2xl font-black text-amber-400 mt-1">{migrationStats.duplicateMembers || migrationStats.duplicates}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <span className="text-[9px] font-black uppercase text-red-400">Expired Members</span>
                    <div className="text-2xl font-black text-red-400 mt-1">{migrationStats.expiredMembers || 0}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#d4ff00]/10 border border-[#d4ff00]/20">
                    <span className="text-[9px] font-black uppercase text-[#d4ff00]">Active Members</span>
                    <div className="text-2xl font-black text-[#d4ff00] mt-1">{migrationStats.activeMembers || 0}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                    <span className="text-[9px] font-black uppercase text-purple-400">PT Members</span>
                    <div className="text-xl font-black text-purple-400 mt-1">{migrationStats.ptMembers || 0}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                    <span className="text-[9px] font-black uppercase text-orange-400">Enquiry Members</span>
                    <div className="text-xl font-black text-orange-400 mt-1">{migrationStats.enquiryMembers || 0}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[9px] font-black uppercase text-white/40">Skipped/Invalid</span>
                    <div className="text-xl font-black text-white mt-1">{(migrationStats.skippedMembers || 0) + (migrationStats.invalidRows || 0)}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase text-emerald-400">Status</span>
                      <div className="text-xs font-black text-white mt-1 uppercase flex items-center gap-1">
                        <CheckCircle size={12} className="text-emerald-400" /> Completed
                      </div>
                    </div>
                  </div>
                </div>

                {migrationStats.warnings && migrationStats.warnings.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Warnings/Alerts ({migrationStats.warnings.length})
                    </span>
                    <ul className="text-[10px] list-disc list-inside space-y-0.5 opacity-90">
                      {migrationStats.warnings.map((w: string, idx: number) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all"
              >
                Back to Matchmaker
              </button>
              <button
                onClick={() => {
                  setStep(1);
                  setCsvData([]);
                  setMigrationStats(null);
                }}
                className="px-5 py-2.5 bg-[#d4ff00] text-slate-950 text-xs font-black rounded-xl hover:brightness-110 cursor-pointer shadow-md font-display border-none"
              >
                Finish Migration
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Historical Sessions & Rollback Center */}
      <div className="p-6 rounded-3xl border border-white/10 bg-[#12131a]/60 backdrop-blur-xl shadow-2xl space-y-4 text-left">
        <h3 className="text-sm font-black uppercase text-white font-display flex items-center gap-1.5">
          <ShieldAlert size={14} className="text-red-500" />
          Migration Session Audit & Rollback Control
        </h3>
        <p className="text-xs text-white/50 leading-normal">
          View details of all past member imports. If an import contained errors or invalid rows, click <strong>Rollback Session</strong> to revert all created records and billing transactions safely.
        </p>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/15 text-[9px] text-white/40 font-black uppercase tracking-wider">
                <th className="py-2.5 px-3">Session ID</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Total Rows</th>
                <th className="py-2.5 px-3">Imported</th>
                <th className="py-2.5 px-3">Duplicates</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length > 0 ? (
                sessions.map((sess) => (
                  <tr key={sess.sessionId} className="border-b border-white/5 hover:bg-white/5 text-xs transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-white/80">{sess.sessionId}</td>
                    <td className="py-3.5 px-3 text-white/70">{new Date(sess.timestamp).toLocaleString()}</td>
                    <td className="py-3.5 px-3 text-white font-bold">{sess.totalMembers}</td>
                    <td className="py-3.5 px-3 text-emerald-400 font-bold">{sess.imported}</td>
                    <td className="py-3.5 px-3 text-amber-400 font-bold">{sess.duplicates}</td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                        sess.status === 'rolled_back'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {sess.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {sess.status !== 'rolled_back' && sess.imported > 0 && (
                        <button
                          onClick={() => handleRollback(sess.sessionId)}
                          className="px-2.5 py-1 text-[10px] font-black bg-red-500/10 hover:bg-red-50 border border-red-500/20 rounded-lg text-red-400 hover:text-white cursor-pointer transition-colors shadow-sm uppercase tracking-wider"
                        >
                          Rollback Session
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-white/40 italic">
                    No migration sessions registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
