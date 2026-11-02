'use client';

import { useEffect } from 'react';
import { isChunkLoadError, reloadForStaleBuild } from '@/lib/chunkRecovery';

export default function ChunkErrorRecovery() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleError = (error: unknown) => {
      if (isChunkLoadError(error)) {
        console.warn('[ChunkErrorRecovery] Stale chunk detected, reloading to fetch the latest build...');
        reloadForStaleBuild();
      }
    };

    const onError = (event: ErrorEvent) => handleError(event.error || event.message);
    const onUnhandledRejection = (event: PromiseRejectionEvent) => handleError(event.reason);

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
