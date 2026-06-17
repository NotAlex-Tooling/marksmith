// Concurrent favicon fetcher that caches one icon per host across the app.

import { hostOf } from './url';
import { getIcon, setIcon } from './icons.svelte';

const CONCURRENCY = 6;

type FaviconResult = { host: string; iconData: string | null };
type FaviconJob = {
  host: string;
  resolve: (result: FaviconResult) => void;
};

const queue: FaviconJob[] = [];
const inFlight = new Set<string>();
let active = 0;
let onQueueChange: ((pending: number) => void) | null = null;

// Registers a callback that fires whenever the pending count changes.
export function setQueueChangeListener(fn: (pending: number) => void): void {
  onQueueChange = fn;
}

// Notifies the listener of the current pending plus active count.
function notifyChange(): void {
  onQueueChange?.(queue.length + active);
}

// Queues a favicon fetch for a URL's host, de-duplicating by host.
export function queueIconFetch(url: string): Promise<FaviconResult> {
  const host = hostOf(url);
  if (!host || getIcon(host)) {
    return Promise.resolve({ host, iconData: getIcon(host) });
  }
  if (inFlight.has(host)) {
    return Promise.resolve({ host, iconData: null });
  }
  inFlight.add(host);
  return new Promise((resolve) => {
    queue.push({ host, resolve });
    notifyChange();
    processQueue();
  });
}

// Processes queued jobs up to the concurrency limit.
function processQueue(): void {
  while (active < CONCURRENCY && queue.length > 0) {
    const job = queue.shift()!;
    active++;
    notifyChange();
    getFaviconData(job.host)
      .then((iconData) => {
        if (iconData) setIcon(job.host, iconData);
        job.resolve({ host: job.host, iconData });
      })
      .catch(() => job.resolve({ host: job.host, iconData: null }))
      .finally(() => {
        inFlight.delete(job.host);
        active--;
        notifyChange();
        processQueue();
      });
  }
}

// Tries several favicon sources and returns the first valid image data URL.
async function getFaviconData(host: string): Promise<string | null> {
  const candidates = [
    `https://icons.duckduckgo.com/ip3/${host}.ico`,
    `https://www.google.com/s2/favicons?domain=${host}&sz=64`,
    `https://${host}/favicon.ico`,
  ];
  for (const iconURL of candidates) {
    try {
      const res = await fetch(iconURL, { mode: 'cors' });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob.type.startsWith('image/') && blob.size === 0) continue;
      const dataURL = await blobToDataURL(blob);
      if (dataURL?.startsWith('data:image/')) return dataURL;
    } catch {
      continue;
    }
  }
  return null;
}

// Converts a Blob to a base64 data URL string.
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
