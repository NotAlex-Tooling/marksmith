// Best-effort dead-link checking using opaque no-cors requests, which can only
// reliably detect hard network failures, not cross-origin HTTP error codes.

import type { LinkStatus } from './types';

const CONCURRENCY = 8;
const TIMEOUT_MS = 8000;

export interface LinkTarget {
  id: string;
  href: string;
}

// Probes a single URL and resolves to a coarse reachability status.
async function probe(href: string): Promise<LinkStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    await fetch(href, { method: 'GET', mode: 'no-cors', signal: controller.signal });
    return 'ok';
  } catch {
    return controller.signal.aborted ? 'unknown' : 'dead';
  } finally {
    clearTimeout(timer);
  }
}

// Checks targets with bounded concurrency, reporting each status via onUpdate.
export async function checkLinks(
  targets: LinkTarget[],
  onUpdate: (id: string, status: LinkStatus) => void,
): Promise<void> {
  let i = 0;
  // Pulls targets off the shared index until the list is exhausted.
  async function worker() {
    while (i < targets.length) {
      const target = targets[i++];
      onUpdate(target.id, 'checking');
      const status = await probe(target.href);
      onUpdate(target.id, status);
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker);
  await Promise.all(workers);
}
