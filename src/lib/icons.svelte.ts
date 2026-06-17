// Reactive favicon store keyed by hostname, kept separate from the tree so
// history snapshots stay small and each domain stores its icon once.

let iconsByHost = $state<Record<string, string>>({});

// Returns the stored data URL for a host, or null when none is cached.
export function getIcon(host: string): string | null {
  return iconsByHost[host] ?? null;
}

// Returns the reactive map so components can read it inside derived state.
export function icons(): Record<string, string> {
  return iconsByHost;
}

// Stores an icon for a host, ignoring empty hosts and non-image data.
export function setIcon(host: string, dataURL: string | null): void {
  if (!host || !dataURL) return;
  if (!dataURL.startsWith('data:image/')) return;
  if (iconsByHost[host] === dataURL) return;
  iconsByHost = { ...iconsByHost, [host]: dataURL };
}

// Merges a batch of host to data URL entries, used when importing.
export function mergeIcons(batch: Record<string, string>): void {
  let changed = false;
  const next = { ...iconsByHost };
  for (const [host, data] of Object.entries(batch)) {
    if (host && data?.startsWith('data:image/') && next[host] !== data) {
      next[host] = data;
      changed = true;
    }
  }
  if (changed) iconsByHost = next;
}

// Replaces the entire map, used when loading persisted state.
export function loadIcons(map: Record<string, string>): void {
  iconsByHost = { ...map };
}

// Returns a plain snapshot of the map for persistence and export.
export function snapshotIcons(): Record<string, string> {
  return { ...iconsByHost };
}

// Clears all cached icons.
export function clearIcons(): void {
  iconsByHost = {};
}
