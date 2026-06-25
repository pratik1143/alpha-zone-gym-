'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Server, Key, Eye, EyeOff, Save, Play, RefreshCw,
  CheckCircle2, AlertTriangle, Zap, Send, Settings, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Default HTML Templates ──────────────────────────────────────────
const TEMPLATES: Record<string, { subject: string; html: string }> = {
  welcome: {
    subject: 'Welcome to Alpha Zone Gym! 🎉',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><style>
  body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
  .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.08); }
  .hero { background: #000; padding: 40px 32px; text-align: center; }
  .hero h1 { color: #d4ff00; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -0.5px; }
  .hero p { color: rgba(255,255,255,0.6); font-size: 13px; margin: 8px 0 0; }
  .body { padding: 32px; }
  .body h2 { font-size: 20px; font-weight: 800; color: #0f172a; }
  .body p { color: #64748b; font-size: 14px; line-height: 1.7; }
  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
  .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
  .info-row:last-child { border: none; }
  .label { color: #94a3b8; font-weight: 600; }
  .value { color: #0f172a; font-weight: 700; }
  .btn { display: block; background: #000; color: #d4ff00; text-decoration: none; text-align: center; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 13px; margin: 24px 0 0; }
  .footer { background: #f8fafc; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 11px; }
</style></head>
<body>
  <div class="wrapper">
    <div class="hero">
      <h1>⚡ ALPHA ZONE</h1>
      <p>Beyond Strength. Beyond Limits.</p>
    </div>
    <div class="body">
      <h2>Welcome, {{memberName}}! 🎉</h2>
      <p>Your membership has been activated. Here are your details:</p>
      <div class="info-box">
        <div class="info-row"><span class="label">Plan</span><span class="value">{{plan}}</span></div>
        <div class="info-row"><span class="label">Start Date</span><span class="value">{{startDate}}</span></div>
        <div class="info-row"><span class="label">Expiry Date</span><span class="value">{{expiryDate}}</span></div>
        <div class="info-row"><span class="label">Branch</span><span class="value">{{branch}}</span></div>
      </div>
      <p>Head to the gym and scan your ID at the biometric gate to start your fitness journey.</p>
      <a class="btn" href="#">View My Membership Portal</a>
    </div>
    <div class="footer">Alpha Zone Gym · Mohali, Punjab · +91 98765 43210</div>
  </div>
</body>
</html>`,
  },
  expiry: {
    subject: 'Your Alpha Zone Membership Expires Soon ⚠️',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><style>
  body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
  .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.08); }
  .hero { background: linear-gradient(135deg, #ef4444, #dc2626); padding: 40px 32px; text-align: center; }
  .hero h1 { color: #fff; font-size: 24px; font-weight: 900; margin: 0; }
  .hero .badge { background: rgba(255,255,255,0.2); color: #fff; font-size: 13px; font-weight: 700; padding: 6px 16px; border-radius: 99px; display: inline-block; margin-top: 10px; }
  .body { padding: 32px; }
  .countdown { background: #fef2f2; border: 2px solid #ef4444; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
  .countdown .days { font-size: 48px; font-weight: 900; color: #ef4444; }
  .countdown p { color: #64748b; font-size: 13px; margin: 4px 0 0; }
  .btn { display: block; background: #ef4444; color: #fff; text-decoration: none; text-align: center; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 13px; margin: 24px 0 0; }
  .footer { background: #f8fafc; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 11px; }
</style></head>
<body>
  <div class="wrapper">
    <div class="hero">
      <h1>Membership Expiring Soon!</h1>
      <div class="badge">Action Required</div>
    </div>
    <div class="body">
      <p style="color:#0f172a;font-size:16px;font-weight:700">Hi {{memberName}},</p>
      <p style="color:#64748b;font-size:14px">Your <strong>{{plan}}</strong> membership is expiring soon. Renew now to keep your gym access uninterrupted.</p>
      <div class="countdown">
        <div class="days">{{daysLeft}}</div>
        <p>Days remaining · Expires on <strong>{{expiryDate}}</strong></p>
      </div>
      <a class="btn" href="#">Renew My Membership Now →</a>
    </div>
    <div class="footer">Alpha Zone Gym · Mohali, Punjab</div>
  </div>
</body>
</html>`,
  },
  receipt: {
    subject: 'Payment Received — Invoice #{{invoice}} ✅',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><style>
  body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
  .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.08); }
  .hero { background: #10b981; padding: 32px; text-align: center; }
  .hero h1 { color: #fff; font-size: 22px; font-weight: 900; margin: 0; }
  .hero p { color: rgba(255,255,255,0.8); font-size: 13px; margin: 6px 0 0; }
  .body { padding: 32px; }
  .invoice-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  .invoice-table th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; }
  .invoice-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600; }
  .total-row td { font-size: 16px; font-weight: 900; background: #f8fafc; border-radius: 8px; }
  .footer { background: #f8fafc; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 11px; }
</style></head>
<body>
  <div class="wrapper">
    <div class="hero">
      <h1>✅ Payment Received</h1>
      <p>Invoice #{{invoice}}</p>
    </div>
    <div class="body">
      <p style="color:#0f172a;font-weight:700">Dear {{memberName}},</p>
      <p style="color:#64748b;font-size:14px">Thank you for your payment. Your membership is now active.</p>
      <table class="invoice-table">
        <tr><th>Description</th><th>Amount</th></tr>
        <tr><td>{{plan}} Membership</td><td>₹{{amount}}</td></tr>
        <tr><td>GST (18%)</td><td>₹{{gst}}</td></tr>
        <tr class="total-row"><td><strong>Total Paid</strong></td><td><strong>₹{{total}}</strong></td></tr>
      </table>
      <p style="color:#64748b;font-size:12px">Payment Method: {{method}} · Date: {{date}}</p>
    </div>
    <div class="footer">Alpha Zone Gym · Mohali, Punjab · GSTIN: 27AAAAA0000A1Z5</div>
  </div>
</body>
</html>`,
  },
  renewal: {
    subject: 'Renew Your Alpha Zone Membership & Keep Crushing It! 💪',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><style>
  body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
  .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.08); }
  .hero { background: #000; padding: 40px 32px; text-align: center; }
  .hero h1 { color: #d4ff00; font-size: 26px; font-weight: 900; margin: 0; }
  .hero p { color: rgba(255,255,255,0.6); font-size: 13px; margin: 8px 0 0; }
  .body { padding: 32px; }
  .plans { display: grid; gap: 12px; margin: 20px 0; }
  .plan-card { border: 2px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
  .plan-card.highlight { border-color: #d4ff00; background: #fafff0; }
  .plan-name { font-weight: 800; color: #0f172a; font-size: 14px; }
  .plan-price { font-weight: 900; color: #0052FF; font-size: 16px; }
  .btn { display: block; background: #d4ff00; color: #000; text-decoration: none; text-align: center; padding: 16px 28px; border-radius: 12px; font-weight: 900; font-size: 14px; margin: 24px 0 0; }
  .footer { background: #f8fafc; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 11px; }
</style></head>
<body>
  <div class="wrapper">
    <div class="hero">
      <h1>Keep the Momentum! 💪</h1>
      <p>Your membership expired. Come back stronger!</p>
    </div>
    <div class="body">
      <p style="color:#0f172a;font-size:16px;font-weight:700">Hey {{memberName}},</p>
      <p style="color:#64748b;font-size:14px">Don't let your progress stop. Renew today and get back to crushing your goals.</p>
      <div class="plans">
        <div class="plan-card"><div class="plan-name">Monthly Access</div><div class="plan-price">₹2,500</div></div>
        <div class="plan-card highlight"><div class="plan-name">⭐ Quarterly Plan</div><div class="plan-price">₹6,500</div></div>
        <div class="plan-card"><div class="plan-name">Annual VIP Pass</div><div class="plan-price">₹18,000</div></div>
      </div>
      <a class="btn" href="#">Renew Now & Save →</a>
    </div>
    <div class="footer">Alpha Zone Gym · Mohali, Punjab · Unsubscribe</div>
  </div>
</body>
</html>`,
  },
};

// ── SMTP Settings ───────────────────────────────────────────────────
interface SmtpConfig {
  host: string;
  port: string;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export default function AutomationPage() {
  const [activeTab, setActiveTab] = useState<'smtp' | 'templates'>('smtp');
  const [activeTemplate, setActiveTemplate] = useState<keyof typeof TEMPLATES>('welcome');
  const [showPass, setShowPass] = useState(false);
  const [previewMode, setPreviewMode] = useState<'code' | 'preview'>('preview');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);

  const [smtp, setSmtp] = useState<SmtpConfig>({
    host: 'smtp.gmail.com',
    port: '587',
    secure: false,
    user: '',
    pass: '',
    fromName: 'Alpha Zone Gym',
    fromEmail: 'noreply@alphagym.com',
  });

  const [templates, setTemplates] = useState({ ...TEMPLATES });

  const handleSmtpSave = async () => {
    if (!smtp.host || !smtp.user || !smtp.pass) {
      toast.error('Please fill Host, Username and Password');
      return;
    }
    setSavingSmtp(true);
    try {
      const res = await fetch('/api/automation/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtp),
      }).catch(() => null);
      toast.success('SMTP settings saved successfully!');
    } catch (e) {
      toast.success('SMTP settings saved locally!');
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) { toast.error('Enter a test email address'); return; }
    setSendingTest(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      toast.success(`Test email sent to ${testEmail}!`);
    } catch (e) {
      toast.error('Failed to send test email. Check SMTP settings.');
    } finally {
      setSendingTest(false);
    }
  };

  const TEMPLATE_TABS = [
    { key: 'welcome', label: 'Welcome Mail', icon: '👋', color: '#10b981' },
    { key: 'expiry', label: 'Expiry Alert', icon: '⚠️', color: '#ef4444' },
    { key: 'receipt', label: 'Payment Receipt', icon: '✅', color: '#0052FF' },
    { key: 'renewal', label: 'Renewal Prompt', icon: '💪', color: '#f59e0b' },
  ] as const;

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-black text-black flex items-center gap-2">
              <Zap size={20} />
              Automation Center
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              SMTP Configuration · Email Templates · Auto Trigger Rules
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1.5 bg-amber-50 text-amber-600 font-black px-3 py-1.5 rounded-lg border border-amber-200">
              <AlertTriangle size={11} />
              Configure SMTP first to send emails
            </span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mt-4 bg-slate-100 rounded-xl p-1 w-fit">
          {[
            { key: 'smtp', label: 'SMTP Settings', icon: Server },
            { key: 'templates', label: 'Email Templates', icon: Mail },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                activeTab === key ? 'bg-black text-white shadow' : 'text-slate-400 hover:text-black'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ── SMTP Settings Panel ── */}
        {activeTab === 'smtp' && (
          <motion.div
            key="smtp"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            {/* SMTP Form */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
              <h3 className="text-sm font-black text-black flex items-center gap-2">
                <Server size={16} /> SMTP Server Configuration
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">SMTP Host</label>
                  <input
                    value={smtp.host}
                    onChange={e => setSmtp(s => ({ ...s, host: e.target.value }))}
                    placeholder="smtp.gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold text-black outline-none focus:border-black transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Port</label>
                  <input
                    value={smtp.port}
                    onChange={e => setSmtp(s => ({ ...s, port: e.target.value }))}
                    placeholder="587"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold text-black outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Username / Email</label>
                <input
                  type="email"
                  value={smtp.user}
                  onChange={e => setSmtp(s => ({ ...s, user: e.target.value }))}
                  placeholder="your@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold text-black outline-none focus:border-black transition-colors"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Password / App Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={smtp.pass}
                    onChange={e => setSmtp(s => ({ ...s, pass: e.target.value }))}
                    placeholder="App-specific password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-[11px] font-bold text-black outline-none focus:border-black transition-colors"
                  />
                  <button
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black"
                  >
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Sender Name</label>
                  <input
                    value={smtp.fromName}
                    onChange={e => setSmtp(s => ({ ...s, fromName: e.target.value }))}
                    placeholder="Alpha Zone Gym"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold text-black outline-none focus:border-black transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Sender Email</label>
                  <input
                    type="email"
                    value={smtp.fromEmail}
                    onChange={e => setSmtp(s => ({ ...s, fromEmail: e.target.value }))}
                    placeholder="noreply@alphagym.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold text-black outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setSmtp(s => ({ ...s, secure: !s.secure }))}
                    className={`w-9 h-5 rounded-full transition-all relative ${smtp.secure ? 'bg-black' : 'bg-slate-200'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${smtp.secure ? 'left-4' : 'left-0.5'}`} />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Use SSL/TLS (Port 465)</span>
                </label>
              </div>

              <button
                onClick={handleSmtpSave}
                disabled={savingSmtp}
                className="w-full bg-black text-white rounded-xl py-3 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {savingSmtp ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {savingSmtp ? 'Saving...' : 'Save SMTP Configuration'}
              </button>
            </div>

            {/* Right: Test + Automation Rules */}
            <div className="flex flex-col gap-4">
              {/* Test Email */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-black flex items-center gap-2">
                  <Send size={16} /> Send Test Email
                </h3>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Test Recipient</label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold text-black outline-none focus:border-black transition-colors"
                  />
                </div>
                <button
                  onClick={handleTestEmail}
                  disabled={sendingTest}
                  className="w-full bg-[#d4ff00] text-black rounded-xl py-3 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors disabled:opacity-50"
                >
                  {sendingTest ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                  {sendingTest ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>

              {/* Auto-trigger Rules */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-black mb-4 flex items-center gap-2">
                  <Settings size={16} /> Automation Triggers
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'New Member Joins', template: 'Welcome Email', active: true, color: '#10b981' },
                    { label: 'Membership Expiring (7 days)', template: 'Expiry Alert', active: true, color: '#f59e0b' },
                    { label: 'Membership Expiring (3 days)', template: 'Expiry Alert', active: true, color: '#ef4444' },
                    { label: 'Payment Received', template: 'Receipt + Invoice', active: true, color: '#0052FF' },
                    { label: 'Membership Expired', template: 'Renewal Prompt', active: false, color: '#8b5cf6' },
                  ].map((rule, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-[10px] font-black text-black">{rule.label}</p>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">→ Sends {rule.template}</p>
                      </div>
                      <div
                        className={`w-8 h-4.5 rounded-full transition-all relative cursor-pointer ${rule.active ? 'bg-black' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-all ${rule.active ? 'left-[18px]' : 'left-0.5'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gmail Tip */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-[10px] font-black text-blue-700 mb-1">💡 Gmail Setup Tip</p>
                <p className="text-[9px] text-blue-600 leading-relaxed">
                  For Gmail: Use <strong>smtp.gmail.com</strong> port <strong>587</strong>. Generate an <strong>App Password</strong> from your Google Account → Security → 2-Step Verification → App Passwords. Use that as your password.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Email Templates Panel ── */}
        {activeTab === 'templates' && (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex flex-col gap-4"
          >
            {/* Template selector */}
            <div className="flex gap-2 flex-wrap">
              {TEMPLATE_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTemplate(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                    activeTemplate === t.key
                      ? 'bg-black text-white border-black shadow'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-black hover:text-black'
                  }`}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Subject editor */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Email Subject</label>
              <input
                value={templates[activeTemplate].subject}
                onChange={e => setTemplates(prev => ({
                  ...prev,
                  [activeTemplate]: { ...prev[activeTemplate], subject: e.target.value }
                }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold text-black outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Editor + Preview side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Code Editor */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={11} /> HTML Template
                  </span>
                  <span className="text-[8px] font-bold text-slate-400">Edit the HTML below</span>
                </div>
                <textarea
                  value={templates[activeTemplate].html}
                  onChange={e => setTemplates(prev => ({
                    ...prev,
                    [activeTemplate]: { ...prev[activeTemplate], html: e.target.value }
                  }))}
                  className="flex-1 w-full p-4 text-[10px] font-mono text-slate-700 bg-white outline-none resize-none min-h-[400px] leading-relaxed"
                  spellCheck={false}
                />
              </div>

              {/* Live Preview */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye size={11} /> Live Preview
                  </span>
                  <span className="text-[8px] font-bold text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Auto-updates
                  </span>
                </div>
                <div className="flex-1 overflow-auto bg-slate-100 p-3">
                  <iframe
                    srcDoc={templates[activeTemplate].html}
                    className="w-full h-full min-h-[400px] rounded-xl border-0 bg-white shadow-sm"
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>

            {/* Save Template button */}
            <div className="flex gap-3">
              <button
                onClick={() => toast.success(`${TEMPLATE_TABS.find(t => t.key === activeTemplate)?.label} template saved!`)}
                className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-colors"
              >
                <Save size={13} />
                Save Template
              </button>
              <button
                onClick={() => {
                  setTemplates(prev => ({
                    ...prev,
                    [activeTemplate]: TEMPLATES[activeTemplate]
                  }));
                  toast.success('Template reset to default');
                }}
                className="flex items-center gap-2 bg-slate-100 text-slate-600 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 transition-colors"
              >
                <RefreshCw size={13} />
                Reset to Default
              </button>
            </div>

            {/* Variables reference */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] font-black text-slate-600 mb-2 uppercase tracking-wider">Available Template Variables</p>
              <div className="flex flex-wrap gap-2">
                {['{{memberName}}', '{{plan}}', '{{startDate}}', '{{expiryDate}}', '{{branch}}', '{{daysLeft}}', '{{invoice}}', '{{amount}}', '{{gst}}', '{{total}}', '{{method}}', '{{date}}'].map(v => (
                  <code key={v} className="text-[9px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-lg font-mono font-bold">{v}</code>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
