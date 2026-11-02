// After a new deploy, tabs opened earlier request JS chunks that no longer
// exist. A hard reload fetches the new build; the timestamp guard prevents a
// reload loop if the failure is not actually caused by a stale build.
const RELOAD_KEY = 'az_chunk_reload_at';
const RELOAD_COOLDOWN_MS = 30_000;

export function isChunkLoadError(error: unknown): boolean {
  const err = error as { name?: string; message?: string } | null;
  const text = `${err?.name || ''} ${err?.message || String(error || '')}`;
  return (
    text.includes('ChunkLoadError') ||
    text.includes('Loading chunk') ||
    text.includes('Loading CSS chunk') ||
    text.includes('Failed to fetch dynamically imported module') ||
    text.includes('Importing a module script failed') ||
    text.includes('error loading dynamically imported module')
  );
}

/** Reloads the page unless a recovery reload already happened in the last 30s. */
export function reloadForStaleBuild(): boolean {
  if (typeof window === 'undefined') return false;
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
  } catch {}
  if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {}
  window.location.reload();
  return true;
}
