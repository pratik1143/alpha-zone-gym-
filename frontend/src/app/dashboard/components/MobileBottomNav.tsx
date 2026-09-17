'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Plus, CreditCard, Menu, X, Clock,
  ClipboardList, Briefcase, UserX, AlertTriangle, Settings, Mail,
  MessageSquare, ShieldCheck, LogOut, Award, Smartphone, KeyRound, Unlock
} from 'lucide-react';
import { useAuthStore } from '@/store';
import toast from '@/lib/toast';
import PwaInstallButton from '@/components/PwaInstallButton';

interface MobileBottomNavProps {
  onOpenAddMember: () => void;
}

export default function MobileBottomNav({ onOpenAddMember }: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '/dashboard/overview', icon: LayoutDashboard },
    { label: 'Members', href: '/dashboard/members', icon: Users },
    { label: 'ADD', isAction: true, icon: Plus },
    { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { label: 'More', isMore: true, icon: Menu },
  ];

  const moreLinks = [
    { label: 'Attendance', href: '/dashboard/attendance', icon: Clock, desc: 'Live member check-ins' },
    { label: 'Enquiries', href: '/dashboard/enquiries', icon: ClipboardList, desc: 'Leads & follow-ups' },
    { label: 'Employees', href: '/dashboard/employees', icon: Briefcase, desc: 'Staff & trainers' },
    { label: 'Follow Up', href: '/dashboard/follow-up', icon: AlertTriangle, desc: 'Pending renewals' },
    { label: 'Expired', href: '/dashboard/expired', icon: UserX, desc: 'Expired memberships' },
    { label: 'Memberships', href: '/dashboard/memberships', icon: Award, desc: 'Packages & pricing' },
    { label: 'Gate Control', href: '/dashboard/gate-control', icon: Unlock, desc: 'Hardware door relay' },
    { label: 'WhatsApp', href: '/dashboard/automation/whatsapp', icon: MessageSquare, desc: 'Automated messaging' },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings, desc: 'Gym configuration' },
  ];

  const handleSignOut = () => {
    setIsMoreOpen(false);
    logout();
    toast.success('Signed out successfully');
    router.push('/');
  };

  return (
    <>
      {/* Mobile Bottom Navigation Bar (Visible <768px) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0c0c0e]/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-5px_25px_rgba(0,0,0,0.5)] font-sans"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto relative">
          {navItems.map((item, idx) => {
            if (item.isAction) {
              return (
                <div key={idx} className="relative -top-4 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={onOpenAddMember}
                    className="w-14 h-14 rounded-full bg-[#d4ff00] text-black shadow-[0_0_20px_rgba(212,255,0,0.4)] hover:bg-white active:scale-95 transition-all flex flex-col items-center justify-center border-4 border-[#0c0c0e] cursor-pointer"
                    aria-label="Add Member"
                  >
                    <Plus size={26} strokeWidth={3} />
                  </button>
                </div>
              );
            }

            if (item.isMore) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setIsMoreOpen(true)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full cursor-pointer bg-transparent border-none ${
                    isMoreOpen ? 'text-[#d4ff00]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
                </button>
              );
            }

            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href!));

            return (
              <Link
                key={idx}
                href={item.href!}
                onClick={() => setIsMoreOpen(false)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full cursor-pointer no-underline transition-colors ${
                  isActive ? 'text-[#d4ff00] font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-[#d4ff00]' : ''} />
                <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* MORE Bottom Sheet Drawer */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[65] bg-[#0c0c0e] border-t border-white/10 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col font-sans overflow-hidden text-white"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 70px)' }}
            >
              {/* Drawer Handle & Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/50 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#d4ff00] text-black font-black text-xs flex items-center justify-center">
                    AZ
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Alpha CRM Modules</h3>
                    <p className="text-[10px] text-slate-400 font-bold">Logged in as {user?.name || 'Admin'}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white border-none cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* PWA Install Banner inside Drawer */}
              <div className="p-4 border-b border-white/5 bg-gradient-to-r from-[#d4ff00]/10 to-transparent flex items-center justify-between gap-3 shrink-0">
                <div className="space-y-0.5">
                  <div className="text-xs font-black text-white uppercase">Install App on Phone</div>
                  <div className="text-[10px] text-slate-400">Standalone PWA app experience</div>
                </div>
                <PwaInstallButton variant="compact" label="INSTALL APP" />
              </div>

              {/* Grid of Links */}
              <div className="p-4 overflow-y-auto grid grid-cols-2 gap-2.5 scrollbar-thin">
                {moreLinks.map((link, idx) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={idx}
                      href={link.href}
                      onClick={() => setIsMoreOpen(false)}
                      className={`p-3 rounded-2xl border transition-all no-underline text-left flex flex-col justify-between ${
                        isActive
                          ? 'bg-[#d4ff00]/15 border-[#d4ff00]/40 text-[#d4ff00]'
                          : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <link.icon size={16} className={isActive ? 'text-[#d4ff00]' : 'text-slate-400'} />
                        <span className="text-xs font-black uppercase tracking-wide text-white">{link.label}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-medium leading-tight">{link.desc}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Sign Out Footer */}
              <div className="p-4 border-t border-white/10 bg-slate-950 shrink-0">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-3 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
