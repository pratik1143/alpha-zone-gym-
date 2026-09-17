import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import router from './routes';
import { provisionAdminAccounts, db, getFirestoreDb } from './firebase';
import { initDeviceSyncService } from './services/deviceSync.service';
import { startCleanupJob } from './jobs/cleanup';
import { startPresenceJob } from './jobs/presence';
import { initQueueJob } from './jobs/whatsappQueue.job';
import { startFollowupAutomationJob } from './jobs/followupAutomation.job';
import { startEnrollFingerprint } from './controllers/device.controller';
import { getLocalIpAddress, triggerGateUnlock } from './controllers/attendance.controller';

// Trigger reload after Firestore activation by user
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing
app.use(cors({
  origin: '*', // Allow all origins for local testing and dev
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware (50mb limit for batch excel migration)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request Logger Middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.on('finish', () => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl} - Status: ${res.statusCode}`);
  });
  next();
});

// API route middleware mounting
app.use('/api', router);

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'healthy', service: 'alpha-zone-os-api', timestamp: new Date().toISOString() });
});

// Directly mount unauthenticated LAN Gate Unlock & Biometric Enrollment endpoints
app.post('/api/attendance/gate-unlock', triggerGateUnlock);
app.post('/api/gate/open', triggerGateUnlock);
app.post('/api/attendance/unlock', triggerGateUnlock);
app.post('/gate/open', triggerGateUnlock);
app.post('/gate-unlock', triggerGateUnlock);

app.post('/api/gate/enroll-fingerprint', startEnrollFingerprint);
app.post('/api/devices/biometric/enroll-fingerprint', startEnrollFingerprint);

app.get('/api/gate/roster', async (req: express.Request, res: express.Response) => {
  try {
    let members: any[] = [];
    let employees: any[] = [];
    
    try {
      members = await db.getMembers();
    } catch (e) {
      const firestore = getFirestoreDb();
      if (firestore) {
        const snap = await firestore.collection('members').get();
        members = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    }

    try {
      const firestore = getFirestoreDb();
      if (firestore) {
        const snap = await firestore.collection('employees').get();
        employees = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (e) {}

    res.json({ success: true, members, employees });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated Standalone LAN Gate Control & Biometric Enrollment Web Application Served directly on Port 8000 / 5000
const renderGateHtml = (req: express.Request, res: express.Response) => {
  const lanIp = getLocalIpAddress();
  const crmUrl = "https://www.alphazonegym.in/dashboard";
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ALPHA ZONE GYM — EasyBio Gate Control & Enrollment</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    @keyframes pulse-ring {
      0% { transform: scale(0.96); opacity: 0.7; }
      50% { transform: scale(1.06); opacity: 0.35; }
      100% { transform: scale(0.96); opacity: 0.7; }
    }
    .pulse-glow { animation: pulse-ring 2.8s infinite ease-in-out; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans flex flex-col justify-between antialiased selection:bg-blue-600 selection:text-white">
  
  <!-- Header -->
  <header class="bg-slate-900/90 border-b border-slate-800 p-4 px-6 backdrop-blur-xl sticky top-0 z-30 shadow-xl">
    <div class="max-w-5xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-md shadow-blue-500/20 shrink-0 flex items-center justify-center">
          <img 
            src="https://i.ibb.co/vzG7CgD/alpha-zone-logo.png" 
            alt="Alpha Zone Gym" 
            class="w-full h-full object-contain p-1 rounded-xl bg-white" 
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <div class="hidden w-full h-full items-center justify-center text-white font-black text-xl">AZ</div>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-black text-white tracking-tight uppercase">ALPHA ZONE GYM</h1>
            <span class="px-2 py-0.5 rounded-full bg-blue-900/80 text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-700">
              LAN TERMINAL
            </span>
          </div>
          <p class="text-xs text-slate-400 font-semibold mt-0.5">EasyBio Hardware Access & Fingerprint Engine</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <a href="${crmUrl}" target="_blank" class="hidden sm:inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl border border-blue-400 transition-all shadow-md">
          <span>🚀 Open Deployed CRM</span>
        </a>

        <div class="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3.5 py-1.5 rounded-full shadow-inner">
          <span class="relative flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span class="text-xs font-mono font-black text-emerald-400">
            ${lanIp}
          </span>
        </div>
      </div>
    </div>
  </header>

  <!-- Navigation Tabs -->
  <div class="max-w-5xl mx-auto px-4 pt-6 w-full flex items-center justify-center gap-2">
    <button 
      id="tabBtnGate" 
      onclick="switchTab('gate')"
      class="px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-2 bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/40"
    >
      🔓 Gate Control
    </button>
    <button 
      id="tabBtnClient" 
      onclick="switchTab('client')"
      class="px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-2 bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
    >
      👤 Enroll Client
    </button>
    <button 
      id="tabBtnEmployee" 
      onclick="switchTab('employee')"
      class="px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-2 bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
    >
      👔 Enroll Employee
    </button>
  </div>

  <!-- Main Work Area -->
  <main class="max-w-5xl mx-auto px-4 py-6 w-full flex-1 flex flex-col items-center justify-start space-y-6">
    
    <!-- Status Dashboard Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
      <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">HARDWARE TERMINAL</span>
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <div>
          <div class="text-base font-black text-white">EasyBio Biometric</div>
          <div class="text-xs font-mono text-blue-400 font-bold mt-1 bg-blue-950/60 px-2 py-0.5 rounded-md inline-block border border-blue-800">192.168.18.11:4370</div>
        </div>
      </div>

      <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">RELAY DURATION</span>
          <span class="text-[10px] font-extrabold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">15 SECONDS</span>
        </div>
        <div>
          <div class="text-base font-black text-white">Direct Gate Unlock</div>
          <div class="text-xs text-emerald-400 font-bold mt-1 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Auto-Relay Lock Active
          </div>
        </div>
      </div>

      <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">PRODUCTION CRM SITE</span>
          <span class="text-[10px] font-extrabold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">alphazonegym.in</span>
        </div>
        <div>
          <div class="text-base font-black text-white">Alpha Zone OS</div>
          <a href="${crmUrl}" target="_blank" class="text-xs font-bold text-blue-400 hover:text-blue-300 mt-1 inline-flex items-center gap-1 group">
            Launch Main CRM <span class="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </a>
        </div>
      </div>
    </div>

    <!-- ── TAB 1: GATE UNLOCK ── -->
    <div id="tabContentGate" class="w-full max-w-md flex flex-col items-center justify-center space-y-6 py-4">
      <div class="relative flex items-center justify-center">
        <div id="pulseBg" class="absolute w-64 h-64 rounded-full bg-blue-600/20 pulse-glow"></div>
        <button 
          id="unlockBtn"
          onclick="triggerGateUnlock()"
          class="relative w-56 h-56 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 active:scale-95 text-white shadow-[0_20px_60px_rgba(37,99,235,0.4)] transition-all cursor-pointer flex flex-col items-center justify-center border-4 border-white/20 group text-center"
        >
          <div class="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 transition-transform">
            <span id="lockIcon" class="text-3xl">🔓</span>
          </div>
          <span class="text-xl font-black tracking-wider uppercase">OPEN GATE</span>
          <span class="text-[10px] font-bold tracking-widest uppercase opacity-80 mt-1 bg-white/10 px-2.5 py-0.5 rounded-full">
            UNLOCK 15 SECONDS
          </span>
        </button>
      </div>

      <div id="statusBanner" class="hidden w-full bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-3 transition-all text-center">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div id="statusDot" class="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
            <span id="bannerTitle" class="text-sm font-black text-white uppercase tracking-tight">GATE UNLOCKED!</span>
          </div>
          <span id="timerText" class="text-xs font-mono font-black text-blue-400 bg-blue-950 px-2.5 py-1 rounded-full border border-blue-800">15s Left</span>
        </div>
        <p id="bannerDesc" class="text-xs text-slate-400 font-semibold text-left">Hardware relay signal triggered. Gate is open for 15 seconds.</p>
        <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div id="progressBar" class="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-1000 w-full"></div>
        </div>
      </div>
    </div>

    <!-- ── TAB 2: ENROLL CLIENT (MEMBERS) ── -->
    <div id="tabContentClient" class="hidden w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
      <div>
        <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
          <span>👤 Enroll Client Fingerprint</span>
        </h2>
        <p class="text-xs text-slate-400 mt-1">
          Select member to capture finger scan on ESSL scanner & map to permanent Biometric ID
        </p>
      </div>

      <div class="space-y-3">
        <input 
          type="text" 
          id="searchClient" 
          oninput="renderRoster()"
          placeholder="Search client by Biometric ID (e.g. 222), Name, or Phone..."
          class="w-full h-11 bg-slate-800 border border-slate-700 rounded-2xl px-4 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />

        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button onclick="setFilter('client', 'pending')" id="btnFilterClientPending" class="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all bg-amber-500 text-slate-950">Pending</button>
            <button onclick="setFilter('client', 'enrolled')" id="btnFilterClientEnrolled" class="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all text-slate-400 hover:text-white">Enrolled</button>
            <button onclick="setFilter('client', 'all')" id="btnFilterClientAll" class="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all text-slate-400 hover:text-white">All</button>
          </div>
          <span id="clientCountText" class="text-[11px] text-slate-400 font-mono">Loading members...</span>
        </div>
      </div>

      <!-- Enrollment Progress Banner -->
      <div id="enrollProgressBannerClient" class="hidden p-4 bg-slate-800 border border-blue-500/40 rounded-2xl space-y-3">
        <div class="flex items-center justify-between border-b border-slate-700 pb-2">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
            <span id="enrollProgressTargetClient" class="text-xs font-black uppercase text-white tracking-wider">Target Client</span>
          </div>
          <span id="enrollProgressStateClient" class="text-[10px] font-mono font-bold text-blue-400 bg-blue-950 border border-blue-800 px-2 py-0.5 rounded-md">INITIALIZING</span>
        </div>
        <div id="enrollProgressMsgClient" class="text-xs font-semibold text-slate-300">Place finger on scanner 3 times...</div>
        <div class="grid grid-cols-4 gap-2 pt-1 text-center text-[10px] font-mono font-bold">
          <div id="scanStep1_client" class="p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-600">SCAN 1</div>
          <div id="scanStep2_client" class="p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-600">SCAN 2</div>
          <div id="scanStep3_client" class="p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-600">SCAN 3</div>
          <div id="scanStep4_client" class="p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-600">MAPPED ✓</div>
        </div>
      </div>

      <div id="clientRosterList" class="space-y-2 max-h-96 overflow-y-auto pr-1"></div>
    </div>

    <!-- ── TAB 3: ENROLL EMPLOYEE (STAFF) ── -->
    <div id="tabContentEmployee" class="hidden w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
      <div>
        <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
          <span>👔 Enroll Employee Fingerprint</span>
        </h2>
        <p class="text-xs text-slate-400 mt-1">
          Select staff/trainer to map their fingerprint for attendance & gate access
        </p>
      </div>

      <div class="space-y-3">
        <input 
          type="text" 
          id="searchEmployee" 
          oninput="renderRoster()"
          placeholder="Search employee by Biometric ID, Name, Role, or Phone..."
          class="w-full h-11 bg-slate-800 border border-slate-700 rounded-2xl px-4 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />

        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button onclick="setFilter('employee', 'pending')" id="btnFilterEmpPending" class="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all bg-amber-500 text-slate-950">Pending</button>
            <button onclick="setFilter('employee', 'enrolled')" id="btnFilterEmpEnrolled" class="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all text-slate-400 hover:text-white">Enrolled</button>
            <button onclick="setFilter('employee', 'all')" id="btnFilterEmpAll" class="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all text-slate-400 hover:text-white">All</button>
          </div>
          <span id="employeeCountText" class="text-[11px] text-slate-400 font-mono">Loading staff...</span>
        </div>
      </div>

      <!-- Enrollment Progress Banner -->
      <div id="enrollProgressBannerEmployee" class="hidden p-4 bg-slate-800 border border-blue-500/40 rounded-2xl space-y-3">
        <div class="flex items-center justify-between border-b border-slate-700 pb-2">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
            <span id="enrollProgressTargetEmployee" class="text-xs font-black uppercase text-white tracking-wider">Target Staff</span>
          </div>
          <span id="enrollProgressStateEmployee" class="text-[10px] font-mono font-bold text-blue-400 bg-blue-950 border border-blue-800 px-2 py-0.5 rounded-md">INITIALIZING</span>
        </div>
        <div id="enrollProgressMsgEmployee" class="text-xs font-semibold text-slate-300">Place finger on scanner 3 times...</div>
        <div class="grid grid-cols-4 gap-2 pt-1 text-center text-[10px] font-mono font-bold">
          <div id="scanStep1_emp" class="p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-600">SCAN 1</div>
          <div id="scanStep2_emp" class="p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-600">SCAN 2</div>
          <div id="scanStep3_emp" class="p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-600">SCAN 3</div>
          <div id="scanStep4_emp" class="p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-600">MAPPED ✓</div>
        </div>
      </div>

      <div id="employeeRosterList" class="space-y-2 max-h-96 overflow-y-auto pr-1"></div>
    </div>

    <!-- Quick Access Links Card -->
    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 px-6 text-center text-xs text-slate-400 max-w-lg shadow-sm">
      💡 <strong class="text-white font-bold">Gym WiFi Quick Access:</strong> Connect to Gym WiFi and open <code class="bg-blue-950 text-blue-300 px-2 py-0.5 rounded font-mono font-bold border border-blue-800">http://${lanIp}:8000/gate-control</code> for 1-tap gate unlock & fingerprint enrollment.
    </div>

  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-800 bg-slate-900/60 py-4 text-center text-xs font-semibold text-slate-500">
    Alpha Zone Gym OS &copy; 2026 • Deployed Site: <a href="${crmUrl}" target="_blank" class="text-blue-400 underline">alphazonegym.in</a>
  </footer>

  <script>
    let currentTab = 'gate';
    let filterClient = 'pending';
    let filterEmployee = 'pending';
    let membersData = [];
    let employeesData = [];
    let countdownInterval = null;

    function switchTab(tab) {
      currentTab = tab;
      document.getElementById('tabContentGate').className = tab === 'gate' ? 'w-full max-w-md flex flex-col items-center justify-center space-y-6 py-4' : 'hidden';
      document.getElementById('tabContentClient').className = tab === 'client' ? 'w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5' : 'hidden';
      document.getElementById('tabContentEmployee').className = tab === 'employee' ? 'w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5' : 'hidden';

      document.getElementById('tabBtnGate').className = tab === 'gate' ? 'px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-2 bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/40' : 'px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-2 bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white';
      document.getElementById('tabBtnClient').className = tab === 'client' ? 'px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-2 bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/40' : 'px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-2 bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white';
      document.getElementById('tabBtnEmployee').className = tab === 'employee' ? 'px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-2 bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/40' : 'px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-2 bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white';

      if (tab === 'client' || tab === 'employee') {
        fetchRoster();
      }
    }

    async function fetchRoster() {
      try {
        const res = await fetch('/api/gate/roster');
        const data = await res.json();
        if (data.success) {
          membersData = data.members || [];
          employeesData = data.employees || [];
          renderRoster();
        }
      } catch (err) {
        console.error('Failed to fetch gate roster:', err);
      }
    }

    function setFilter(type, filter) {
      if (type === 'client') {
        filterClient = filter;
        document.getElementById('btnFilterClientPending').className = filter === 'pending' ? 'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all bg-amber-500 text-slate-950' : 'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all text-slate-400 hover:text-white';
        document.getElementById('btnFilterClientEnrolled').className = filter === 'enrolled' ? 'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all bg-emerald-500 text-slate-950' : 'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all text-slate-400 hover:text-white';
        document.getElementById('btnFilterClientAll').className = filter === 'all' ? 'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all bg-blue-600 text-white' : 'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all text-slate-400 hover:text-white';
      } else {
        filterEmployee = filter;
        document.getElementById('btnFilterEmpPending').className = filter === 'pending' ? 'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all bg-amber-500 text-slate-950' : 'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all text-slate-400 hover:text-white';
        document.getElementById('btnFilterEmpEnrolled').className = filter === 'enrolled' ? 'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all bg-emerald-500 text-slate-950' : 'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all text-slate-400 hover:text-white';
        document.getElementById('btnFilterEmpAll').className = filter === 'all' ? 'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all bg-blue-600 text-white' : 'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all text-slate-400 hover:text-white';
      }
      renderRoster();
    }

    function renderRoster() {
      // 1. Render Client Members
      const qClient = (document.getElementById('searchClient').value || '').trim().toLowerCase();
      const filteredMembers = membersData.filter(m => {
        const bioId = String(m.biometricId || m.memberId || m.id || '');
        const name = String(m.name || '').toLowerCase();
        const phone = String(m.phone || '');
        const matches = !qClient || bioId.includes(qClient) || name.includes(qClient) || phone.includes(qClient);
        const isEnrolled = m.fingerprintStatus === 'ENROLLED' || m.fingerprintEnrolled === true;
        if (!matches) return false;
        if (filterClient === 'pending') return !isEnrolled;
        if (filterClient === 'enrolled') return isEnrolled;
        return true;
      });

      document.getElementById('clientCountText').innerText = 'Showing ' + filteredMembers.length + ' members';
      const clientList = document.getElementById('clientRosterList');
      if (filteredMembers.length === 0) {
        clientList.innerHTML = '<div class="p-8 text-center text-xs text-slate-500 bg-slate-800/40 rounded-2xl border border-slate-800">No members found matching selected filter & search keyword.</div>';
      } else {
        clientList.innerHTML = filteredMembers.map(m => {
          const bioId = String(m.biometricId || m.memberId || m.id || 'N/A');
          const isEnrolled = m.fingerprintStatus === 'ENROLLED' || m.fingerprintEnrolled === true;
          return \`
            <div class="p-3.5 rounded-2xl border bg-slate-800/60 border-slate-700/60 flex items-center justify-between hover:border-slate-700 transition-all">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-mono text-xs font-black text-blue-400 shrink-0">
                  #\${bioId}
                </div>
                <div>
                  <div class="text-xs font-black text-white">\${m.name || 'Member'} <span class="text-[10px] font-mono text-slate-400">(\${m.phone || 'No phone'})</span></div>
                  <div class="text-[11px] text-slate-400 mt-0.5">\${m.plan || 'Standard'} • <span class="\${isEnrolled ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}">\${isEnrolled ? '✓ Enrolled' : 'Pending'}</span></div>
                </div>
              </div>
              <button onclick="triggerEnroll('\${m.id}', '\${bioId}', '\${encodeURIComponent(m.name || '')}', false)" class="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer \${isEnrolled ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-md'}">
                \${isEnrolled ? 'Re-Enroll' : 'Start Enroll'}
              </button>
            </div>
          \`;
        }).join('');
      }

      // 2. Render Employees (Staff)
      const qEmp = (document.getElementById('searchEmployee').value || '').trim().toLowerCase();
      const filteredEmployees = employeesData.filter(e => {
        const bioId = String(e.biometricId || e.id || '');
        const name = String(e.name || '').toLowerCase();
        const role = String(e.role || '').toLowerCase();
        const phone = String(e.phone || '');
        const matches = !qEmp || bioId.includes(qEmp) || name.includes(qEmp) || role.includes(qEmp) || phone.includes(qEmp);
        const isEnrolled = e.fingerprintStatus === 'ENROLLED' || e.fingerprintEnrolled === true;
        if (!matches) return false;
        if (filterEmployee === 'pending') return !isEnrolled;
        if (filterEmployee === 'enrolled') return isEnrolled;
        return true;
      });

      document.getElementById('employeeCountText').innerText = 'Showing ' + filteredEmployees.length + ' staff members';
      const empList = document.getElementById('employeeRosterList');
      if (filteredEmployees.length === 0) {
        empList.innerHTML = '<div class="p-8 text-center text-xs text-slate-500 bg-slate-800/40 rounded-2xl border border-slate-800">No staff members found matching selected filter & search keyword.</div>';
      } else {
        empList.innerHTML = filteredEmployees.map(e => {
          const bioId = String(e.biometricId || e.id || 'N/A');
          const isEnrolled = e.fingerprintStatus === 'ENROLLED' || e.fingerprintEnrolled === true;
          return \`
            <div class="p-3.5 rounded-2xl border bg-slate-800/60 border-slate-700/60 flex items-center justify-between hover:border-slate-700 transition-all">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-mono text-xs font-black text-purple-400 shrink-0">
                  #\${bioId}
                </div>
                <div>
                  <div class="text-xs font-black text-white">\${e.name || 'Staff'} <span class="text-[10px] font-mono text-purple-300">(\${e.role || 'Staff'})</span></div>
                  <div class="text-[11px] text-slate-400 mt-0.5">\${e.phone || 'No Phone'} • <span class="\${isEnrolled ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}">\${isEnrolled ? '✓ Enrolled' : 'Pending'}</span></div>
                </div>
              </div>
              <button onclick="triggerEnroll('\${e.id}', '\${bioId}', '\${encodeURIComponent(e.name || '')}', true)" class="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer \${isEnrolled ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500 shadow-md'}">
                \${isEnrolled ? 'Re-Enroll' : 'Start Enroll'}
              </button>
            </div>
          \`;
        }).join('');
      }
    }

    async function triggerEnroll(targetId, bioId, encodedName, isEmployee) {
      const name = decodeURIComponent(encodedName);
      const prefix = isEmployee ? 'Employee' : 'Client';
      const banner = document.getElementById(isEmployee ? 'enrollProgressBannerEmployee' : 'enrollProgressBannerClient');
      const targetText = document.getElementById(isEmployee ? 'enrollProgressTargetEmployee' : 'enrollProgressTargetClient');
      const stateText = document.getElementById(isEmployee ? 'enrollProgressStateEmployee' : 'enrollProgressStateClient');
      const msgText = document.getElementById(isEmployee ? 'enrollProgressMsgEmployee' : 'enrollProgressMsgClient');

      const step1 = document.getElementById(isEmployee ? 'scanStep1_emp' : 'scanStep1_client');
      const step2 = document.getElementById(isEmployee ? 'scanStep2_emp' : 'scanStep2_client');
      const step3 = document.getElementById(isEmployee ? 'scanStep3_emp' : 'scanStep3_client');
      const step4 = document.getElementById(isEmployee ? 'scanStep4_emp' : 'scanStep4_client');

      banner.className = 'block p-4 bg-slate-800 border border-blue-500/40 rounded-2xl space-y-3 animate-pulse';
      targetText.innerText = 'TARGET ' + prefix.toUpperCase() + ': #' + bioId + ' — ' + name;
      stateText.innerText = 'DEVICE READY';
      msgText.innerText = 'Please place finger on physical ESSL K90 scanner 3 times...';

      step1.className = 'p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-600';
      step2.className = 'p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-600';
      step3.className = 'p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-600';
      step4.className = 'p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-600';

      setTimeout(() => { step1.className = 'p-2 rounded-xl border bg-blue-900/60 border-blue-500 text-blue-300'; }, 1000);
      setTimeout(() => { step2.className = 'p-2 rounded-xl border bg-blue-900/60 border-blue-500 text-blue-300'; }, 2500);
      setTimeout(() => { step3.className = 'p-2 rounded-xl border bg-blue-900/60 border-blue-500 text-blue-300'; }, 4000);

      try {
        const payload = {
          biometricId: bioId,
          memberName: name,
          name: name,
          enrollmentSessionId: 'sess_' + bioId + '_' + Date.now(),
          isEmployee: isEmployee
        };
        if (isEmployee) payload.employeeId = targetId;
        else payload.memberId = targetId;

        const res = await fetch('/api/gate/enroll-fingerprint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
          step4.className = 'p-2 rounded-xl border bg-emerald-900/60 border-emerald-500 text-emerald-300';
          stateText.innerText = 'SUCCESS ✓';
          stateText.className = 'text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-md';
          msgText.innerText = '✓ Fingerprint captured & mapped to Biometric ID #' + bioId + ' (' + name + ')';
          fetchRoster();
        } else {
          stateText.innerText = 'FAILED';
          stateText.className = 'text-[10px] font-mono font-bold text-rose-400 bg-rose-950 border border-rose-800 px-2 py-0.5 rounded-md';
          msgText.innerText = data.error || data.message || 'Fingerprint capture failed on hardware device.';
        }
      } catch (err) {
        stateText.innerText = 'ERROR';
        stateText.className = 'text-[10px] font-mono font-bold text-rose-400 bg-rose-950 border border-rose-800 px-2 py-0.5 rounded-md';
        msgText.innerText = 'Connection error during fingerprint enrollment.';
      }
    }

    async function triggerGateUnlock() {
      const btn = document.getElementById('unlockBtn');
      const banner = document.getElementById('statusBanner');
      const bannerTitle = document.getElementById('bannerTitle');
      const bannerDesc = document.getElementById('bannerDesc');
      const timerText = document.getElementById('timerText');
      const progressBar = document.getElementById('progressBar');
      const lockIcon = document.getElementById('lockIcon');

      btn.disabled = true;
      btn.style.opacity = '0.7';
      lockIcon.innerText = '🔓';

      banner.className = 'block w-full bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-3 transition-all text-center';
      bannerTitle.innerText = '⏳ TRANSMITTING UNLOCK SIGNAL...';
      bannerDesc.innerText = 'Sending signal to EasyBio hardware at 192.168.18.11...';
      timerText.innerText = '15s';
      progressBar.style.width = '100%';

      try {
        let res = await fetch('/api/attendance/gate-unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'lan_web_app' })
        });
        if (!res.ok) {
          res = await fetch('/api/gate/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'lan_web_app' })
          });
        }
        const data = await res.json();

        if (data.success) {
          bannerTitle.innerText = '✅ DOOR UNLOCKED FOR 15 SECONDS!';
          bannerDesc.innerText = 'Hardware relay open. Access granted.';
          
          let secondsLeft = 15;
          if (countdownInterval) clearInterval(countdownInterval);

          countdownInterval = setInterval(() => {
            secondsLeft -= 1;
            timerText.innerText = secondsLeft + 's Left';
            const pct = (secondsLeft / 15) * 100;
            progressBar.style.width = pct + '%';

            if (secondsLeft <= 0) {
              clearInterval(countdownInterval);
              bannerTitle.innerText = '🔒 GATE RELAY LOCKED';
              bannerDesc.innerText = '15 seconds elapsed. Gate relay auto-locked.';
              timerText.innerText = 'Locked';
              lockIcon.innerText = '🔒';
              progressBar.style.width = '0%';
            }
          }, 1000);

        } else {
          bannerTitle.innerText = '⚠️ UNLOCK FAILED';
          bannerDesc.innerText = data.message || 'Gate Unlock Request Failed';
        }
      } catch (err) {
        bannerTitle.innerText = '❌ CONNECTION ERROR';
        bannerDesc.innerText = 'Unable to reach Gate Controller API.';
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.style.opacity = '1';
        }, 1000);
      }
    }

    // Initial load
    fetchRoster();
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
};

app.get('/gate-control', renderGateHtml);
app.get('/gate', renderGateHtml);
app.get('/', renderGateHtml);

if (process.env.VERCEL) {
  // In Vercel serverless environment, just export the app
  module.exports = app;
} else {
  // Boot the server locally bound to 0.0.0.0 for GYM LAN availability
  const numPort = Number(PORT) || 5000;
  app.listen(numPort, '0.0.0.0', async () => {
    const lanIp = getLocalIpAddress();
    const deviceIp = process.env.EASYBIO_DEVICE_IP || '192.168.18.11';
    console.log(`===================================================`);
    console.log(`  ALPHA ZONE GYM — GATE CONTROL & BACKEND SERVER`);
    console.log(`===================================================`);
    console.log(`  Status       : ONLINE`);
    console.log(`  Local URL    : http://127.0.0.1:${numPort}/api`);
    console.log(`  LAN URL      : http://${lanIp}:${numPort}/api`);
    console.log(`  Gate Control : http://${lanIp}:${numPort}/gate-control`);
    console.log(`  EasyBio Device: ${deviceIp}`);
    console.log(`===================================================`);

    try {
      await provisionAdminAccounts();
    } catch (err) {
      console.error('Failed to provision admin accounts on boot:', err);
    }

    try {
      initDeviceSyncService();
    } catch (err) {
      console.error('Failed to initialize Device Sync service on boot:', err);
    }

    // Start the automated Firebase Spark Plan cleanup cron job
    startCleanupJob();

    // Start the LIVE MEMBERS INSIDE ENGINE cron job
    startPresenceJob();

    // Start the WhatsApp Queue worker
    initQueueJob();

    // Start the Automated Follow-Up Generation Engine
    startFollowupAutomationJob();

    // ⛔ Auto email scheduler DISABLED — emails send only via manual dashboard trigger
    // To re-enable: uncomment the block below
    // try {
    //   const { runDailyAutomationChecks } = require('./services/automation.service');
    //   setTimeout(() => {
    //     runDailyAutomationChecks().catch((err: any) => console.error('Error running daily automation checks:', err));
    //   }, 10000);
    //   setInterval(() => {
    //     runDailyAutomationChecks().catch((err: any) => console.error('Error running daily automation checks:', err));
    //   }, 12 * 60 * 60 * 1000);
    // } catch (err) {
    //   console.error('Failed to initialize daily automation scheduler:', err);
    // }
  });
}
