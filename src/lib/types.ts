// Shared data types for bookmarks, folders, and persisted application state.

export interface Bookmark {
  id: string;
  type: 'bookmark';
  title: string;
  href: string;
  addDate: number;
}

export interface Folder {
  id: string;
  type: 'folder';
  title: string;
  addDate: number;
  lastModified: number;
  personalToolbarFolder?: boolean;
  children: TreeNode[];
}

export type TreeNode = Folder | Bookmark;

export interface HistoryEntry {
  roots: Folder[];
  selectedId: string | null;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type Theme = 'dark' | 'light';

export type SortKey = 'title' | 'href' | 'addDate' | 'type';
export type SortDir = 'asc' | 'desc';

export type LinkStatus = 'ok' | 'dead' | 'unknown' | 'checking';

export interface PersistedState {
  version: number;
  roots: Folder[];
  selectedId: string | null;
  expandedIds: Record<string, boolean>;
  showTreeBookmarks: boolean;
  theme: Theme;
}
