'use client';

import React from 'react';
import { Download, Smartphone, CheckCircle, Share, X, Info } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

interface PwaInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'outline' | 'compact';
  label?: string;
  showIcon?: boolean;
}

export default function PwaInstallButton({
  className = '',
  variant = 'primary',
  label,
  showIcon = true
}: PwaInstallButtonProps) {
  const {
    isInstalled,
    triggerInstall,
    showIosGuide,
    showChromeGuide,
    closeGuides
  } = usePwaInstall();

  // Button style variants
  const getButtonClass = () => {
    if (variant === 'compact') {
      return `inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
        isInstalled
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-[#d4ff00] text-black hover:bg-white'
      } ${className}`;
    }

    if (variant === 'outline') {
      return `inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer border ${
        isInstalled
          ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400'
          : 'border-[#d4ff00]/40 text-[#d4ff00] hover:bg-[#d4ff00] hover:text-black'
      } ${className}`;
    }

    // Default primary
    return `inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:scale-105 ${
      isInstalled
        ? 'bg-emerald-600 text-white shadow-emerald-900/30'
        : 'bg-[#d4ff00] text-black hover:bg-white shadow-[0_0_20px_rgba(212,255,0,0.3)]'
    } ${className}`;
  };

  const getLabel = () => {
    if (label) return label;
    if (isInstalled) return 'APP INSTALLED';
    return 'DOWNLOAD APP';
  };

  return (
    <>
      <button
        type="button"
        onClick={triggerInstall}
        className={getButtonClass()}
      >
        {showIcon && (
          isInstalled ? (
            <CheckCircle size={16} className="shrink-0" />
          ) : (
            <Smartphone size={16} className="shrink-0" />
          )
        )}
        <span>{getLabel()}</span>
      </button>

      {/* iOS Installation Instructions Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-5 text-left text-white shadow-2xl relative">
            <button
              onClick={closeGuides}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/5 border-none cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#d4ff00]/10 border border-[#d4ff00]/30 flex items-center justify-center text-[#d4ff00]">
              <Share size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white uppercase tracking-tight">Add Alpha CRM to Home Screen</h3>
              <p className="text-xs text-slate-400 font-poppins">Install Alpha Zone Gym CRM on your iPhone or iPad in 2 steps:</p>
            </div>

            <ol className="space-y-3 text-xs text-slate-300 font-poppins list-decimal list-inside bg-slate-900/80 p-4 rounded-2xl border border-white/5">
              <li className="leading-relaxed">
                Tap the <strong className="text-[#d4ff00]">Share button</strong> in Safari (bottom navigation bar).
              </li>
              <li className="leading-relaxed">
                Scroll down and select <strong className="text-white">&ldquo;Add to Home Screen&rdquo;</strong> (+).
              </li>
            </ol>

            <button
              onClick={closeGuides}
              className="w-full py-3 bg-[#d4ff00] text-black font-extrabold text-xs uppercase tracking-wider rounded-full hover:bg-white transition-all cursor-pointer border-none"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Chrome / Unsupported Browser Instructions Modal */}
      {showChromeGuide && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-5 text-left text-white shadow-2xl relative">
            <button
              onClick={closeGuides}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/5 border-none cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Info size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white uppercase tracking-tight">Install Alpha Zone CRM</h3>
              <p className="text-xs text-slate-400 font-poppins">To install Alpha CRM on your device:</p>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/5 space-y-2 text-xs text-slate-300 font-poppins">
              <p className="leading-relaxed">
                Open your browser menu <strong className="text-white">(⋮)</strong> and tap:
              </p>
              <div className="p-2.5 bg-black/50 border border-white/10 rounded-xl text-center font-bold text-[#d4ff00]">
                &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo;
              </div>
            </div>

            <button
              onClick={closeGuides}
              className="w-full py-3 bg-[#d4ff00] text-black font-extrabold text-xs uppercase tracking-wider rounded-full hover:bg-white transition-all cursor-pointer border-none"
            >
              Understand
            </button>
          </div>
        </div>
      )}
    </>
  );
}
