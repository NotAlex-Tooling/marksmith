// Local persistence for the bookmark tree and icon cache, stored under separate
// keys so an icon-storage failure never costs the user their bookmarks.

import type { PersistedState } from './types';

const STATE_KEY = 'marksmith:state:v1';
const ICONS_KEY = 'marksmith:icons:v1';

export const STATE_VERSION = 1;

export interface SaveResult {
  ok: boolean;
  iconsDropped: boolean;
}

// Returns a debounced wrapper around fn that runs at most once per ms.
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Writes the tree and icons to localStorage, keeping the tree even if the icon
// cache is too large to store.
export function save(state: PersistedState, icons: Record<string, string>): SaveResult {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    return { ok: false, iconsDropped: false };
  }
  try {
    localStorage.setItem(ICONS_KEY, JSON.stringify(icons));
  } catch {
    try {
      localStorage.removeItem(ICONS_KEY);
    } catch {}
    return { ok: true, iconsDropped: true };
  }
  return { ok: true, iconsDropped: false };
}

export interface LoadedState {
  state: PersistedState | null;
  icons: Record<string, string>;
}

// Reads persisted state and icons, tolerating missing or corrupt entries.
export function load(): LoadedState {
  let state: PersistedState | null = null;
  let icons: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed && Array.isArray(parsed.roots)) state = parsed;
    }
  } catch {
    state = null;
  }
  try {
    const raw = localStorage.getItem(ICONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') icons = parsed as Record<string, string>;
    }
  } catch {
    icons = {};
  }
  return { state, icons };
}

// Removes all persisted data.
export function clear(): void {
  try {
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem(ICONS_KEY);
  } catch {}
}
