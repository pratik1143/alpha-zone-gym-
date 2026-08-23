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
 * Inspired by Sonner with custom SaaS styling matching Alpha Zone design system:
 * - Crisp white card
 * - Dark slate/navy typography
 * - Subtle border & elevation
 * - Curated semantic accents & icons
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
    duration: options?.duration || 3500,
    ...options
  });
}

baseToast.success = (message: string | React.ReactNode, options?: ToastOptions) => {
  return sonnerToast.success(message, {
    duration: options?.duration || 3200,
    id: options?.id,
    description: options?.description,
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
    ...options
  });
};

baseToast.error = (message: string | React.ReactNode, options?: ToastOptions) => {
  const cleanMsg = typeof message === 'string' ? sanitizeErrorMessage(message) : message;
  return sonnerToast.error(cleanMsg, {
    duration: options?.duration || 5000,
    id: options?.id,
    description: options?.description || (typeof message === 'object' && (message as any)?.message ? sanitizeErrorMessage(message) : undefined),
    icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />,
    ...options
  });
};

baseToast.warning = (message: string | React.ReactNode, options?: ToastOptions) => {
  return sonnerToast.warning(message, {
    duration: options?.duration || 4000,
    id: options?.id,
    description: options?.description,
    icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
    ...options
  });
};

baseToast.info = (message: string | React.ReactNode, options?: ToastOptions) => {
  return sonnerToast.info(message, {
    duration: options?.duration || 3200,
    id: options?.id,
    description: options?.description,
    icon: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
    ...options
  });
};

baseToast.loading = (message: string | React.ReactNode, options?: ToastOptions) => {
  return sonnerToast.loading(message, {
    id: options?.id,
    description: options?.description,
    icon: <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0 mt-0.5" />,
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
      gap={10}
      offset="20px"
      toastOptions={{
        className: 'alpha-zone-toast font-sans',
        style: {
          background: '#ffffff',
          color: '#0f172a',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '14px 16px',
          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
          fontSize: '13px',
          fontWeight: 600
        },
        classNames: {
          toast: 'group bg-white text-slate-900 border border-slate-200/90 shadow-xl rounded-2xl flex items-start gap-3 p-4',
          title: 'text-[13.5px] font-bold text-slate-900 tracking-tight leading-snug',
          description: 'text-[12px] font-medium text-slate-500 mt-0.5 leading-normal',
          closeButton: 'bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 rounded-lg p-1 transition-colors',
          actionButton: 'bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs',
          cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl'
        }
      }}
    />
  );
}
