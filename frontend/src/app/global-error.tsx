'use client';

import { useEffect } from 'react';
import { isChunkLoadError, reloadForStaleBuild } from '@/lib/chunkRecovery';

// Last-resort boundary for errors in the root or dashboard layouts. Replaces
// the root layout, so it carries its own minimal inline styling.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const staleBuild = isChunkLoadError(error);

  useEffect(() => {
    console.error('[App] Unhandled error:', error);
    if (staleBuild) reloadForStaleBuild();
  }, [error, staleBuild]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: 16 }}>
        <div style={{ maxWidth: 420, width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 24, padding: 24, textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
            {staleBuild ? 'Loading the latest version…' : 'Something went wrong'}
          </h2>
          <pre style={{ marginTop: 16, background: '#f8fafc', borderRadius: 12, padding: 12, fontSize: 11, color: '#475569', textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {error.message || 'Unknown error'}
            {error.digest ? `\nRef: ${error.digest}` : ''}
          </pre>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => unstable_retry()} style={{ background: '#2563eb', color: '#fff', border: 0, borderRadius: 12, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>
              Try again
            </button>
            <button onClick={() => window.location.reload()} style={{ background: '#fff', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 12, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>
              Reload page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
