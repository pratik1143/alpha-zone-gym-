'use client';

import React from 'react';
import { toast as sonnerToast, Toaster as SonnerToaster, type ExternalToast } from 'sonner';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Loader2 
} from 'lucide-react';

/**
 * Global Premium Toast System — Alpha Zone OS
 * Standout SaaS UI with:
 * - High-visibility card with distinct borders & 3D shadow
 * - Left status accent indicator
 * - Icon badge containers with micro-animations
 * - Ultra-high z-index ensuring visibility over all modals and drawers
 * - Shimmer sweep entry animation
 */

export interface ToastOptions extends ExternalToast {
  description?: string;
  id?: string | number;
  duration?: number;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

// Clean technical error sanitizer so raw Firebase/API stack traces are never shown to end-users
export function sanitizeErrorMessage(err: any, fallback = 'Unable to complete request. Please try again.'): string {
  if (!err) return fallback;
  if (typeof err === 'string') {
    if (err.includes('FirebaseError') || err.includes('PERMISSION_DENIED') || err.includes('network') || err.includes('undefined')) {
      return fallback;
    }
    return err;
  }
  const msg = err.response?.data?.error || err.response?.data?.message || err.message || '';
  if (msg.includes('FirebaseError') || msg.includes('PERMISSION_DENIED') || msg.includes('ETIMEDOUT') || msg.includes('status code')) {
    return fallback;
  }
  return msg || fallback;
}

// Base callable function
function baseToast(message: string | React.ReactNode, options?: ToastOptions) {
  if (typeof message === 'function') {
    return sonnerToast.custom(message as any, options);
  }
  return sonnerToast(message, {
    duration: options?.duration || 3800,
    ...options
  });
}

baseToast.success = (message: string | React.ReactNode, options?: ToastOptions) => {
  return sonnerToast.success(message, {
    duration: options?.duration || 3500,
    id: options?.id,
    description: options?.description,
    className: 'az-toast-success',
    icon: (
      <div className="az-toast-icon-badge bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs">
        <CheckCircle2 className="w-5 h-5" />
      </div>
    ),
    ...options
  });
};

baseToast.error = (message: string | React.ReactNode, options?: ToastOptions) => {
  const cleanMsg = typeof message === 'string' ? sanitizeErrorMessage(message) : message;
  return sonnerToast.error(cleanMsg, {
    duration: options?.duration || 5000,
    id: options?.id,
    description: options?.description || (typeof message === 'object' && (message as any)?.message ? sanitizeErrorMessage(message) : undefined),
    className: 'az-toast-error',
    icon: (
      <div className="az-toast-icon-badge bg-rose-50 border border-rose-200 text-rose-600 shadow-xs">
        <AlertCircle className="w-5 h-5" />
      </div>
    ),
    ...options
  });
};

baseToast.warning = (message: string | React.ReactNode, options?: ToastOptions) => {
  return sonnerToast.warning(message, {
    duration: options?.duration || 4200,
    id: options?.id,
    description: options?.description,
    className: 'az-toast-warning',
    icon: (
      <div className="az-toast-icon-badge bg-amber-50 border border-amber-200 text-amber-600 shadow-xs">
        <AlertTriangle className="w-5 h-5" />
      </div>
    ),
    ...options
  });
};

baseToast.info = (message: string | React.ReactNode, options?: ToastOptions) => {
  return sonnerToast.info(message, {
    duration: options?.duration || 3500,
    id: options?.id,
    description: options?.description,
    className: 'az-toast-info',
    icon: (
      <div className="az-toast-icon-badge bg-blue-50 border border-blue-200 text-[#0b5cbe] shadow-xs">
        <Info className="w-5 h-5" />
      </div>
    ),
    ...options
  });
};

baseToast.loading = (message: string | React.ReactNode, options?: ToastOptions) => {
  return sonnerToast.loading(message, {
    id: options?.id,
    description: options?.description,
    className: 'az-toast-loading',
    icon: (
      <div className="az-toast-icon-badge bg-blue-50 border border-blue-200 text-[#0b5cbe] shadow-xs">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    ),
    ...options
  });
};

baseToast.dismiss = (id?: string | number) => {
  sonnerToast.dismiss(id);
};

baseToast.promise = <T,>(
  promise: Promise<T>,
  data: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
    description?: string | ((data: T) => string);
  }
) => {
  return sonnerToast.promise(promise, {
    loading: data.loading,
    success: (res: T) => (typeof data.success === 'function' ? data.success(res) : data.success),
    error: (err: any) => (typeof data.error === 'function' ? data.error(err) : sanitizeErrorMessage(err, data.error)),
    description: data.description as any
  });
};

baseToast.custom = sonnerToast.custom;

export const toast = baseToast;
export default toast;

/**
 * Global Toaster Component for mounting at Root Layout
 */
export function GlobalToaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={true}
      richColors={false}
      closeButton={true}
      theme="light"
      gap={12}
      offset="24px"
      style={{
        zIndex: 999999
      }}
      toastOptions={{
        className: 'az-global-toast font-sans',
        style: {
          background: '#ffffff',
          color: '#0f172a',
          border: '1.5px solid #cbd5e1',
          borderRadius: '18px',
          padding: '16px 18px',
          boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.16), 0 8px 16px -4px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)',
          fontSize: '14px',
          fontWeight: 600,
          minWidth: '360px',
          maxWidth: '440px'
        },
        classNames: {
          toast: 'group bg-white text-slate-900 border-2 border-slate-300 shadow-2xl rounded-2xl flex items-start gap-3.5 p-4.5 transition-all',
          title: 'text-[14.5px] font-extrabold text-slate-900 tracking-tight leading-snug',
          description: 'text-[12.5px] font-medium text-slate-600 mt-1 leading-normal',
          closeButton: 'bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-800 border border-slate-300 rounded-lg p-1.5 transition-all shadow-2xs',
          actionButton: 'bg-[#0b5cbe] hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all',
          cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl'
        }
      }}
    />
  );
}
