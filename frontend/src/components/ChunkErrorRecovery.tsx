'use client';

import { useEffect } from 'react';

export default function ChunkErrorRecovery() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleChunkError = (message?: string | Event) => {
      const msgStr = typeof message === 'string' ? message : JSON.stringify(message || '');
      const isChunkError =
        msgStr.includes('Loading chunk') ||
        msgStr.includes('ChunkLoadError') ||
        msgStr.includes('Failed to fetch dynamically imported module') ||
        msgStr.includes('Importing a module script failed');

      if (isChunkError) {
        const hasReloaded = sessionStorage.getItem('chunk_reload_attempted');
        if (!hasReloaded) {
          sessionStorage.setItem('chunk_reload_attempted', 'true');
          console.warn('[ChunkErrorRecovery] Stale chunk detected, performing single recovery reload...');
          window.location.reload();
        }
      }
    };

    const onError = (event: ErrorEvent) => {
      handleChunkError(event.message || event.error?.message);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason?.message || String(reason || '');
      handleChunkError(msg);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
