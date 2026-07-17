'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, MapPin, Phone, Mail, Globe,
  Dumbbell
} from 'lucide-react';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Packages', href: '/packages' },
  { label: 'App', href: '/app' },
  { label: 'Contact', href: '/contact' },
];

export default function PageLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#08080a] text-white flex flex-col font-poppins overflow-x-hidden selection:bg-[#d4ff00] selection:text-black">
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 25s linear infinite; }
        .text-neon-glow { text-shadow: 0 0 12px rgba(212,255,0,0.3); }
        .card-neon-hover { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
        .card-neon-hover:hover { border-color: rgba(212,255,0,0.4); box-shadow: 0 0 25px rgba(212,255,0,0.15); transform: translateY(-4px); }
        .font-poppins { font-family: 'Poppins', sans-serif; }
      `}</style>

      {/* Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#08080a]/80 backdrop-blur-md border-b border-white/10 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
            <img src="/gym_logo.png" alt="Alpha Zone Logo" className="h-14 w-auto object-contain" />
          </Link>

          <nav className="hidden lg:flex items-center gap-7 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`hover:text-[#d4ff00] hover:text-neon-glow transition-colors ${pathname === link.href ? 'text-[#d4ff00] text-neon-glow' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden sm:flex items-center gap-4">
            <Link
              href="/contact"
              className="bg-[#d4ff00] text-black font-extrabold text-xs px-6 py-3 rounded-full hover:bg-white transition-all cursor-pointer shadow-[0_0_15px_rgba(212,255,0,0.25)] hover:scale-105"
            >
              BOOK FREE TRIAL
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-white hover:text-[#d4ff00] transition-colors p-2 bg-transparent border-none cursor-pointer"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0c0c0e] border-t border-white/10 px-6 py-6 space-y-4 flex flex-col">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`font-bold text-sm tracking-wide uppercase transition-colors ${pathname === link.href ? 'text-[#d4ff00]' : 'text-slate-300 hover:text-[#d4ff00]'}`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-white/5">
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full bg-[#d4ff00] text-black font-extrabold py-3 rounded-full text-xs uppercase text-center block"
              >
                Book Free Trial
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-20">
        {children}
      </main>

      {/* Sticky CTA Button */}
      <Link
        href="/contact"
        className="fixed bottom-6 right-6 z-40 bg-[#d4ff00] text-black font-extrabold text-xs px-5 py-3 rounded-full shadow-[0_0_20px_rgba(212,255,0,0.4)] hover:bg-white hover:scale-105 transition-all tracking-wider uppercase hidden md:flex items-center gap-2"
      >
        <Dumbbell size={14} />
        Book Free Trial
      </Link>

      {/* Footer */}
      <footer className="bg-[#0a0a0c] border-t border-white/10">
        {/* CTA Banner */}
        <div className="bg-gradient-to-r from-[#d4ff00]/10 via-[#d4ff00]/5 to-transparent border-b border-white/5 py-14">
          <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
            <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase text-neon-glow">Start Today</span>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">
              Start Your Transformation Today.
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto font-poppins">
              Join thousands of members who chose Alpha Zone Gym to build strength, discipline, and a healthier life.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className="bg-[#d4ff00] text-black font-extrabold text-sm px-8 py-4 rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(212,255,0,0.3)] hover:scale-105">
                Book Free Trial →
              </Link>
              <Link href="/packages" className="border border-white/15 hover:border-[#d4ff00] text-white font-bold text-sm px-8 py-4 rounded-full transition-all hover:text-[#d4ff00]">
                View Membership Plans
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-14 font-poppins">
          <div className="grid md:grid-cols-4 gap-10 items-start text-left">

            {/* Brand */}
            <div className="space-y-4 md:col-span-1">
              <Link href="/">
                <img src="/gym_logo.png" alt="Alpha Zone Logo" className="h-12 w-auto object-contain" />
              </Link>
              <p className="text-xs text-slate-500 leading-relaxed">
                Where Discipline Meets Transformation. Punjab's most trusted fitness destination.
              </p>
              <div className="flex gap-3">
                <a href="#" aria-label="Instagram" className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[#d4ff00] hover:border-[#d4ff00]/40 transition-all">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
                <a href="#" aria-label="Twitter" className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[#d4ff00] hover:border-[#d4ff00]/40 transition-all">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a href="#" aria-label="Youtube" className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[#d4ff00] hover:border-[#d4ff00]/40 transition-all">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Quick Links</h3>
              <div className="w-8 h-[2px] bg-[#d4ff00]" />
              <div className="flex flex-col gap-2.5 text-xs text-slate-500">
                {navLinks.map(link => (
                  <Link key={link.href} href={link.href} className="hover:text-[#d4ff00] transition-colors">{link.label}</Link>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Contact</h3>
              <div className="w-8 h-[2px] bg-[#d4ff00]" />
              <div className="space-y-3 text-xs text-slate-500">
                <div className="flex items-start gap-2">
                  <Phone size={12} className="text-[#d4ff00] shrink-0 mt-0.5" />
                  <a href="tel:+919779333155" className="hover:text-white transition-colors">+91 97793 33155</a>
                </div>
                <div className="flex items-start gap-2">
                  <Mail size={12} className="text-[#d4ff00] shrink-0 mt-0.5" />
                  <a href="mailto:alphazonegym@gmail.com" className="hover:text-white transition-colors">alphazonegym@gmail.com</a>
                </div>
                <div className="flex items-start gap-2">
                  <Globe size={12} className="text-[#d4ff00] shrink-0 mt-0.5" />
                  <a href="https://alphazonegym.in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">alphazonegym.in</a>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Location</h3>
              <div className="w-8 h-[2px] bg-[#d4ff00]" />
              <div className="flex items-start gap-2 text-xs text-slate-500">
                <MapPin size={12} className="text-[#d4ff00] shrink-0 mt-0.5" />
                <p className="leading-relaxed">2nd Floor, MNB Group, SCO 16-17, Landran Road, Sohana, Sahibzada Ajit Singh Nagar, Punjab 140308</p>
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <div className="font-bold text-slate-400">Working Hours</div>
                <div>Mon – Sat: Morning &amp; Evening batches</div>
                <div>Sunday: Contact for timings</div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-600">
            <div>Copyright © 2026 Alpha Zone Gym. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <span>|</span>
              <Link href="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
