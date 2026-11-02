'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { isChunkLoadError, reloadForStaleBuild } from '@/lib/chunkRecovery';

// Keeps the dashboard sidebar in place when a page crashes. Stale-build chunk
// errors (common right after a deploy) reload automatically; anything else
// shows the real message so it can be reported instead of a blank error page.
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const [reloading, setReloading] = useState(false);
  const staleBuild = isChunkLoadError(error);

  useEffect(() => {
    console.error('[Dashboard] Page error:', error);
    if (staleBuild && reloadForStaleBuild()) setReloading(true);
  }, [error, staleBuild]);

  if (reloading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-slate-500">
        Loading the latest version…
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle size={22} />
        </div>
        <h2 className="text-lg font-black text-slate-900">This page hit an error</h2>
        <p className="mt-1 text-sm text-slate-500">
          {staleBuild ? 'A new version of the CRM was deployed.' : 'Your data is safe. Try again, or reload the page.'}
        </p>
        <pre className="mt-4 max-h-32 overflow-auto rounded-xl bg-slate-50 p-3 text-left text-[11px] text-slate-600 whitespace-pre-wrap break-words">
          {error.message || 'Unknown error'}
          {error.digest ? `\nRef: ${error.digest}` : ''}
        </pre>
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={() => unstable_retry()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
          >
            <RefreshCw size={14} /> Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
