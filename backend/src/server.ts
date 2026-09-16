import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import router from './routes';
import { provisionAdminAccounts } from './firebase';
import { initDeviceSyncService } from './services/deviceSync.service';
import { startCleanupJob } from './jobs/cleanup';
import { startPresenceJob } from './jobs/presence';
import { initQueueJob } from './jobs/whatsappQueue.job';
import { startFollowupAutomationJob } from './jobs/followupAutomation.job';

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

import { getLocalIpAddress, triggerGateUnlock } from './controllers/attendance.controller';

// Directly mount unauthenticated LAN Gate Unlock POST endpoints on app
app.post('/api/attendance/gate-unlock', triggerGateUnlock);
app.post('/api/gate/open', triggerGateUnlock);
app.post('/api/attendance/unlock', triggerGateUnlock);
app.post('/gate/open', triggerGateUnlock);
app.post('/gate-unlock', triggerGateUnlock);

// Dedicated Standalone LAN Gate Control Web Application Served directly on Port 8000
const renderGateHtml = (req: express.Request, res: express.Response) => {
  const lanIp = getLocalIpAddress();
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ALPHA ZONE GYM — EasyBio Gate Control Terminal</title>
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
    @keyframes progress-drain {
      0% { width: 100%; }
      100% { width: 0%; }
    }
    .animate-progress { animation: progress-drain 15s linear forwards; }
  </style>
</head>
<body class="bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60 text-slate-800 min-h-screen font-sans flex flex-col justify-between antialiased selection:bg-blue-600 selection:text-white">
  
  <!-- Top Header Navigation -->
  <header class="bg-white/80 border-b border-blue-100/80 p-4 px-6 backdrop-blur-xl sticky top-0 z-30 shadow-sm">
    <div class="max-w-5xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-md shadow-blue-500/20 shrink-0 flex items-center justify-center">
          <img 
            src="https://i.ibb.co/vzG7CgD/alpha-zone-logo.png" 
            alt="Alpha Zone Gym Logo" 
            class="w-full h-full object-contain p-1 rounded-xl bg-white" 
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <div class="hidden w-full h-full items-center justify-center text-white font-black text-xl">AZ</div>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-black text-slate-900 tracking-tight uppercase">ALPHA ZONE GYM</h1>
            <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-200">
              LAN TERMINAL
            </span>
          </div>
          <p class="text-xs text-slate-500 font-semibold mt-0.5">EasyBio Hardware Access Control Engine</p>
        </div>
      </div>

      <div class="flex items-center gap-2 bg-blue-50 border border-blue-200/80 px-3.5 py-1.5 rounded-full shadow-inner">
        <span class="relative flex h-2.5 w-2.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
        </span>
        <span class="text-xs font-mono font-black text-blue-900">
          LAN ACTIVE: ${lanIp}
        </span>
      </div>
    </div>
  </header>

  <!-- Main Work Area -->
  <main class="max-w-5xl mx-auto px-4 py-8 w-full flex-1 flex flex-col items-center justify-center space-y-8">
    
    <!-- Status Dashboard Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
      <div class="bg-white/90 border border-blue-100 rounded-3xl p-5 shadow-xl shadow-blue-900/5 flex flex-col justify-between">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">HARDWARE TERMINAL</span>
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        </div>
        <div>
          <div class="text-base font-black text-slate-900">EasyBio Biometric</div>
          <div class="text-xs font-mono text-blue-600 font-bold mt-1 bg-blue-50 px-2 py-0.5 rounded-md inline-block border border-blue-100">192.168.18.11:4370</div>
        </div>
      </div>

      <div class="bg-white/90 border border-blue-100 rounded-3xl p-5 shadow-xl shadow-blue-900/5 flex flex-col justify-between">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">RELAY DURATION</span>
          <span class="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">15 SECONDS</span>
        </div>
        <div>
          <div class="text-base font-black text-slate-900">Direct Gate Unlock</div>
          <div class="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Auto-Relay Lock Active
          </div>
        </div>
      </div>

      <div class="bg-white/90 border border-blue-100 rounded-3xl p-5 shadow-xl shadow-blue-900/5 flex flex-col justify-between">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">CRM SYSTEM LINK</span>
          <span class="text-[10px] font-bold text-slate-400">PORT 3000</span>
        </div>
        <div>
          <div class="text-base font-black text-slate-900">Alpha Zone OS</div>
          <a href="http://${lanIp}:3000/dashboard" target="_blank" class="text-xs font-bold text-blue-600 hover:text-blue-800 mt-1 inline-flex items-center gap-1 group">
            Launch Main CRM <span class="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </a>
        </div>
      </div>
    </div>

    <!-- CENTRAL HEAVY GATE UNLOCK ACTION -->
    <div class="flex flex-col items-center justify-center space-y-6 py-6 w-full max-w-md">
      <div class="relative flex items-center justify-center">
        <!-- Glow Pulse Behind Button -->
        <div id="pulseBg" class="absolute w-64 h-64 rounded-full bg-blue-500/20 pulse-glow"></div>
        
        <button 
          id="unlockBtn"
          onclick="triggerGateUnlock()"
          class="relative w-56 h-56 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 active:scale-95 text-white shadow-[0_20px_60px_rgba(37,99,235,0.4)] transition-all cursor-pointer flex flex-col items-center justify-center border-4 border-white/60 group text-center"
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

      <!-- Live Interactive Feedback Banner with 15s Timer -->
      <div id="statusBanner" class="hidden w-full bg-white border border-blue-200 p-5 rounded-3xl shadow-xl space-y-3 transition-all text-center">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div id="statusDot" class="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
            <span id="bannerTitle" class="text-sm font-black text-slate-900 uppercase tracking-tight">GATE UNLOCKED!</span>
          </div>
          <span id="timerText" class="text-xs font-mono font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">15s Left</span>
        </div>
        <p id="bannerDesc" class="text-xs text-slate-600 font-semibold text-left">Hardware relay signal triggered. Gate is open for 15 seconds.</p>
        
        <!-- Animated Progress Bar -->
        <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div id="progressBar" class="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-1000 w-full"></div>
        </div>
      </div>
    </div>

    <!-- Quick WiFi Access Card -->
    <div class="bg-white/80 border border-blue-100/90 rounded-2xl p-4 px-6 text-center text-xs text-slate-600 max-w-lg shadow-sm">
      💡 <strong class="text-slate-900 font-bold">Gym WiFi Quick Access:</strong> Connect to Gym WiFi and open <code class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-bold border border-blue-200">http://${lanIp}:8000/gate-control</code> on phone or PC for 1-tap door unlock.
    </div>

  </main>

  <!-- Footer -->
  <footer class="border-t border-blue-100 bg-white/60 py-4 text-center text-xs font-semibold text-slate-500">
    Alpha Zone Gym OS &copy; 2026 • Local EasyBio Access Control Engine
  </footer>

  <script>
    let countdownInterval = null;

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

      banner.className = 'block w-full bg-white border border-blue-200 p-5 rounded-3xl shadow-xl space-y-3 transition-all text-center';
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
        if (!res.ok) {
          res = await fetch('/gate/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'lan_web_app' })
          });
        }
        const data = await res.json();

        if (data.success) {
          bannerTitle.innerText = '✅ DOOR UNLOCKED FOR 15 SECONDS!';
          bannerDesc.innerText = 'Hardware relay open. Member access granted.';
          
          // Audio chime
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          } catch(e){}

          // Start 15 Seconds Countdown Timer
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
        bannerDesc.innerText = 'Unable to reach Gate Controller API. Ensure backend service is active.';
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.style.opacity = '1';
        }, 1000);
      }
    }
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
