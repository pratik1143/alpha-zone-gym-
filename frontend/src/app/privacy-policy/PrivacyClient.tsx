'use client';

import React from 'react';
import PageLayout from '@/components/PageLayout';
import { Shield, Eye, Lock, FileText } from 'lucide-react';

export default function PrivacyClient() {
  return (
    <PageLayout>
      <div className="relative min-h-screen bg-[#08080a] text-slate-300 pt-32 pb-24 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#d4ff00]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 relative z-10 space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <span className="inline-flex items-center gap-2 bg-[#d4ff00]/10 text-[#d4ff00] text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-wider border border-[#d4ff00]/25">
              <Shield size={12} />
              Privacy Protection
            </span>
            <h1 className="font-rowdies text-4xl md:text-6xl font-bold tracking-tight text-white uppercase leading-none">
              Privacy <span className="text-[#d4ff00]">Policy</span>
            </h1>
            <p className="text-slate-500 text-xs md:text-sm font-mono tracking-wider uppercase">
              Last Updated: July 17, 2026 · Alpha Zone Gym
            </p>
            <div className="w-16 h-[2px] bg-[#d4ff00] mx-auto mt-6" />
          </div>

          {/* Intro Card */}
          <div className="bg-slate-900/40 border border-white/5 p-6 md:p-8 rounded-3xl backdrop-blur-md">
            <p className="text-sm md:text-base leading-relaxed text-slate-300 font-poppins">
              At Alpha Zone Gym, we respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and protect your information when you register at our gym branch, visit our website, or use our mobile membership application.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-8 font-poppins text-sm md:text-base leading-relaxed">
            
            {/* Section 1 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <span className="text-[#d4ff00]">1.</span> Information We Collect
              </h2>
              <p className="text-slate-400">
                To provide you with a seamless and premium experience, we may collect the following categories of personal information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400 text-sm md:text-base">
                <li><strong className="text-white">Identity Details:</strong> Full name, date of birth, gender, and photograph (for membership profiles).</li>
                <li><strong className="text-white">Contact Details:</strong> Phone number, email address, and physical address.</li>
                <li><strong className="text-white">Fitness & Health Metrics:</strong> Health declarations, weight, height, heart rate, completed sets, and fitness goals to tailor workouts.</li>
                <li><strong className="text-white">Biometric Turnstile Info:</strong> Punch logs or QR codes generated for access control at the branch reception.</li>
              </ul>
            </div>

            {/* Section 2 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <span className="text-[#d4ff00]">2.</span> How We Use Your Information
              </h2>
              <p className="text-slate-400">
                Your data is processed only to enhance your journey with us:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400 text-sm md:text-base">
                <li>To manage your membership subscriptions, renewals, and billing records.</li>
                <li>To synchronize biometric scanner records for direct entry.</li>
                <li>To power your personalized mobile app progress dashboards (calories, hours, hydration).</li>
                <li>To notify you about trainer updates, branch timings, or promotional offers via SMS/WhatsApp.</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <span className="text-[#d4ff00]">3.</span> Data Security & Storage
              </h2>
              <p className="text-slate-400">
                We implement strict administrative, technical, and physical security measures to guard your information. All health metrics, payment receipts, and profile logs are encrypted and stored in secure cloud systems. We do not sell or lease your personal information to third parties.
              </p>
            </div>

            {/* Section 4 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <span className="text-[#d4ff00]">4.</span> Your Rights & Choice
              </h2>
              <p className="text-slate-400">
                You can review, modify, or update your profile data directly inside our gym mobile app dashboard, or by requesting updates at the reception desk. If you wish to delete your account or opt out of notification channels, contact us at our support email.
              </p>
            </div>

            {/* Section 5 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <span className="text-[#d4ff00]">5.</span> Contact Privacy Team
              </h2>
              <p className="text-slate-400">
                If you have queries regarding this privacy notice, data retention, or cookie settings, please contact our privacy compliance desk:
              </p>
              <div className="bg-slate-900/30 border border-white/5 p-5 rounded-2xl space-y-2 mt-2 text-sm">
                <div><span className="text-slate-500">Support Desk:</span> <span className="text-[#d4ff00] font-bold">+91 97793 33155</span></div>
                <div><span className="text-slate-500">Direct Email:</span> <span className="text-white font-bold">alphazonegym@gmail.com</span></div>
                <div><span className="text-slate-500">Address:</span> <span className="text-white">2nd Floor, MNB Group, SCO 16-17, Landran Road, Sohana, Mohali, Punjab 140308</span></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </PageLayout>
  );
}
