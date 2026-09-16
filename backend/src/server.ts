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
  <title>ALPHA ZONE GYM — EasyBio Local Gate Control</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @keyframes pulse-ring {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.05); opacity: 0.4; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }
    .pulse-glow { animation: pulse-ring 2.5s infinite ease-in-out; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans flex flex-col justify-between">
  
  <!-- Header Banner -->
  <header class="bg-slate-900/80 border-b border-slate-800 p-5 backdrop-blur-md sticky top-0 z-30">
    <div class="max-w-4xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black text-lg shadow-inner">
          ⚡
        </div>
        <div>
          <h1 class="text-lg font-black text-white tracking-wider uppercase">ALPHA ZONE GYM</h1>
          <p class="text-xs text-amber-400/90 font-bold">EasyBio LAN Gate Control Terminal</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/80">
          LAN ACTIVE: ${lanIp}
        </span>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <main class="max-w-4xl mx-auto px-4 py-8 w-full flex-1 flex flex-col items-center justify-center space-y-8">
    
    <!-- Status Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
        <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider">HARDWARE DEVICE</span>
        <span class="text-sm font-black text-white mt-1">EasyBio Biometric</span>
        <span class="text-xs font-mono text-emerald-400 font-bold mt-0.5">192.168.18.11:4370</span>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
        <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider">GATE RELAY ACTION</span>
        <span class="text-sm font-black text-white mt-1">Direct Unlock (15s)</span>
        <span class="text-xs font-mono text-emerald-400 font-bold mt-0.5">Hardware Enabled</span>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
        <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider">CRM SYSTEM</span>
        <span class="text-sm font-black text-white mt-1">Alpha Zone OS</span>
        <a href="http://${lanIp}:3000/dashboard" target="_blank" class="text-xs font-mono text-blue-400 font-bold mt-0.5 hover:underline">
          Open CRM (Port 3000) &rarr;
        </a>
      </div>
    </div>

    <!-- MAIN HEAVY GATE UNLOCK BUTTON -->
    <div class="flex flex-col items-center justify-center space-y-4 py-4">
      <div class="relative flex items-center justify-center">
        <div id="pulseBg" class="absolute w-56 h-56 rounded-full bg-emerald-500/20 pulse-glow"></div>
        
        <button 
          id="unlockBtn"
          onclick="triggerGateUnlock()"
          class="relative w-48 h-48 rounded-full bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white shadow-[0_15px_40px_rgba(16,185,129,0.5)] active:scale-95 transition-all cursor-pointer flex flex-col items-center justify-center border-4 border-emerald-300/40 text-center"
        >
          <span class="text-4xl mb-1">🔓</span>
          <span class="text-lg font-black tracking-wider uppercase">OPEN GATE</span>
          <span class="text-[10px] font-bold tracking-widest uppercase opacity-90">Press to Unlock</span>
        </button>
      </div>

      <!-- Live Feedback Banner -->
      <div id="statusBanner" class="hidden text-center max-w-md p-4 rounded-2xl border font-bold text-sm transition-all shadow-lg"></div>
    </div>

    <!-- Quick Info Notice -->
    <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center text-xs text-slate-400 max-w-xl">
      💡 <strong class="text-slate-200">Gym WiFi Quick Access:</strong> Anyone connected to the Gym WiFi network can open <code class="bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-mono">http://${lanIp}:8000/gate-control</code> on their phone or PC to trigger gate unlock.
    </div>

  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
    Alpha Zone Gym OS &copy; 2026 • Local EasyBio Access Control Engine
  </footer>

  <script>
    async function triggerGateUnlock() {
      const btn = document.getElementById('unlockBtn');
      const banner = document.getElementById('statusBanner');
      const pulse = document.getElementById('pulseBg');

      btn.disabled = true;
      btn.style.opacity = '0.7';
      banner.className = 'block bg-blue-900/60 border-blue-500/50 text-blue-200 text-center max-w-md p-4 rounded-2xl border font-bold text-sm shadow-lg animate-pulse';
      banner.innerHTML = '⏳ Sending Unlock Signal to EasyBio Device (192.168.18.11)...';

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
          banner.className = 'block bg-emerald-950 border-emerald-500 text-emerald-300 text-center max-w-md p-4 rounded-2xl border font-black text-sm shadow-xl';
          banner.innerHTML = '✅ DOOR UNLOCKED FOR 15 SECONDS!<br><span class="text-xs font-normal text-emerald-400">Hardware relay signal triggered successfully.</span>';
          
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
        } else {
          banner.className = 'block bg-red-950 border-red-500 text-red-300 text-center max-w-md p-4 rounded-2xl border font-bold text-sm shadow-xl';
          banner.innerHTML = '⚠️ ' + (data.message || 'Gate Unlock Request Failed');
        }
      } catch (err) {
        banner.className = 'block bg-red-950 border-red-500 text-red-300 text-center max-w-md p-4 rounded-2xl border font-bold text-sm shadow-xl';
        banner.innerHTML = '❌ Connection Error: Unable to reach Gate Controller API';
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
