// Helpers for creating, searching, traversing, and transforming the tree.

import type { Folder, Bookmark, TreeNode, SortKey, SortDir } from './types';
import { uid } from './uid';
import { isHttpUrl } from './url';

export { isHttpUrl };

// Returns the current time in seconds since the epoch.
export const nowSec = () => Math.floor(Date.now() / 1000);

// Creates a new root-level folder with an optional toolbar flag.
export function makeRoot(title: string, toolbar = false): Folder {
  return {
    id: uid(),
    type: 'folder',
    title,
    addDate: nowSec(),
    lastModified: nowSec(),
    personalToolbarFolder: toolbar,
    children: [],
  };
}

// Creates a new subfolder.
export function makeFolder(title: string): Folder {
  return {
    id: uid(),
    type: 'folder',
    title,
    addDate: nowSec(),
    lastModified: nowSec(),
    children: [],
  };
}

// Creates a new bookmark node.
export function makeBookmark(url: string, title: string): Bookmark {
  return {
    id: uid(),
    type: 'bookmark',
    title,
    href: url,
    addDate: nowSec(),
  };
}

// Finds a node by ID anywhere in the tree, or null when absent.
export function findNodeById(roots: Folder[], id: string): TreeNode | null {
  for (const root of roots) {
    const found = findInFolder(root, id);
    if (found) return found;
  }
  return null;
}

// Recursively searches a folder and its children for a node by ID.
function findInFolder(folder: Folder, id: string): TreeNode | null {
  if (folder.id === id) return folder;
  for (const child of folder.children) {
    if (child.id === id) return child;
    if (child.type === 'folder') {
      const found = findInFolder(child, id);
      if (found) return found;
    }
  }
  return null;
}

// Finds the parent folder of a node by ID, or null when absent.
export function findParent(roots: Folder[], nodeId: string): Folder | null {
  for (const root of roots) {
    const found = findParentInFolder(root, nodeId);
    if (found) return found;
  }
  return null;
}

// Recursively searches for the folder that directly contains a node.
function findParentInFolder(folder: Folder, nodeId: string): Folder | null {
  for (const child of folder.children) {
    if (child.id === nodeId) return folder;
    if (child.type === 'folder') {
      const found = findParentInFolder(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

// Returns the {id, title} path segments from a root down to a node.
export function getBreadcrumb(roots: Folder[], nodeId: string): { id: string; title: string }[] {
  for (const root of roots) {
    const path = getBreadcrumbPath(root, nodeId, [{ id: root.id, title: root.title }]);
    if (path) return path;
  }
  return [];
}

// Recursively builds the breadcrumb path to a target node.
function getBreadcrumbPath(
  folder: Folder,
  targetId: string,
  path: { id: string; title: string }[],
): { id: string; title: string }[] | null {
  if (folder.id === targetId) return path;
  for (const child of folder.children) {
    if (child.type === 'folder') {
      const result = getBreadcrumbPath(child, targetId, [...path, { id: child.id, title: child.title }]);
      if (result) return result;
    }
  }
  return null;
}

// Counts total folders and bookmarks across all roots.
export function countStats(roots: Folder[]): { folders: number; bookmarks: number } {
  let folders = 0;
  let bookmarks = 0;
  // Recursively tallies folders and bookmarks.
  function walk(items: TreeNode[]) {
    for (const item of items) {
      if (item.type === 'folder') {
        folders++;
        walk(item.children);
      } else {
        bookmarks++;
      }
    }
  }
  walk(roots);
  return { folders, bookmarks };
}

// Deep clones a value, preferring structuredClone with a JSON fallback.
export function deepClone<T>(obj: T): T {
  const sc = (globalThis as { structuredClone?: <U>(v: U) => U }).structuredClone;
  if (typeof sc === 'function') return sc(obj);
  return JSON.parse(JSON.stringify(obj));
}

// Returns a record of every folder ID mapped to true (expanded).
export function getAllExpandedIds(roots: Folder[]): Record<string, boolean> {
  const ids: Record<string, boolean> = {};
  // Recursively marks each folder ID as expanded.
  function walk(folder: Folder) {
    ids[folder.id] = true;
    for (const ch of folder.children) {
      if (ch.type === 'folder') walk(ch);
    }
  }
  for (const root of roots) walk(root);
  return ids;
}

// Returns the folder IDs from a root down to a target node.
export function expandPathToNode(roots: Folder[], nodeId: string): string[] {
  for (const root of roots) {
    const path = getPathIds(root, nodeId, [root.id]);
    if (path) return path;
  }
  return [];
}

// Recursively builds the folder ID path to a target node.
function getPathIds(folder: Folder, targetId: string, path: string[]): string[] | null {
  if (folder.id === targetId) return path;
  for (const child of folder.children) {
    if (child.type === 'folder') {
      const result = getPathIds(child, targetId, [...path, child.id]);
      if (result) return result;
    }
  }
  return null;
}

// Returns true when targetId is the node itself or inside its subtree.
export function isSelfOrDescendant(node: TreeNode, targetId: string): boolean {
  if (node.id === targetId) return true;
  if (node.type !== 'folder') return false;
  return node.children.some((c) => isSelfOrDescendant(c, targetId));
}

// Removes a node from anywhere in the tree, returning it and its old parent.
export function removeNodeById(
  roots: Folder[],
  nodeId: string,
): { node: TreeNode; parent: Folder | null } | null {
  const rootIdx = roots.findIndex((r) => r.id === nodeId);
  if (rootIdx !== -1) {
    const [node] = roots.splice(rootIdx, 1);
    return { node, parent: null };
  }
  const parent = findParent(roots, nodeId);
  if (!parent) return null;
  const idx = parent.children.findIndex((c) => c.id === nodeId);
  if (idx === -1) return null;
  const [node] = parent.children.splice(idx, 1);
  return { node, parent };
}

// Returns a flat, depth-annotated list of every folder for move pickers.
export function listFolders(roots: Folder[]): { id: string; title: string; depth: number }[] {
  const out: { id: string; title: string; depth: number }[] = [];
  // Recursively appends each folder with its depth.
  function walk(folder: Folder, depth: number) {
    out.push({ id: folder.id, title: folder.title, depth });
    for (const ch of folder.children) {
      if (ch.type === 'folder') walk(ch, depth + 1);
    }
  }
  for (const root of roots) walk(root, 0);
  return out;
}

// Returns children sorted by key and direction, folders before bookmarks.
export function sortChildren(children: TreeNode[], key: SortKey, dir: SortDir): TreeNode[] {
  const sign = dir === 'asc' ? 1 : -1;
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  return [...children].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    let cmp = 0;
    if (key === 'addDate') {
      cmp = a.addDate - b.addDate;
    } else if (key === 'href') {
      const ah = a.type === 'bookmark' ? a.href : '';
      const bh = b.type === 'bookmark' ? b.href : '';
      cmp = collator.compare(ah, bh);
    } else {
      cmp = collator.compare(a.title, b.title);
    }
    return cmp * sign;
  });
}

// Collects every bookmark within a node, including nested folders.
export function collectBookmarks(node: TreeNode): Bookmark[] {
  const out: Bookmark[] = [];
  // Recursively gathers bookmark leaves.
  function walk(n: TreeNode) {
    if (n.type === 'bookmark') out.push(n);
    else for (const c of n.children) walk(c);
  }
  walk(node);
  return out;
}

// Replaces a folder's contents with a flat list of its bookmarks.
export function flattenFolder(folder: Folder): number {
  const bookmarks = collectBookmarks(folder);
  folder.children = bookmarks;
  folder.lastModified = nowSec();
  return bookmarks.length;
}

// Normalizes a URL for duplicate comparison.
export function normalizeForCompare(href: string): string {
  try {
    const u = new URL(href);
    u.hash = '';
    let s = u.href.toLowerCase();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return href.trim().toLowerCase().replace(/\/+$/, '');
  }
}

export interface DuplicateGroup {
  key: string;
  href: string;
  nodes: { id: string; title: string; path: string }[];
}

// Finds groups of bookmarks that share a normalized URL across the tree.
export function findDuplicateGroups(roots: Folder[]): DuplicateGroup[] {
  const map = new Map<string, DuplicateGroup>();
  // Recursively groups bookmarks by their normalized URL.
  function walk(folder: Folder, path: string[]) {
    for (const child of folder.children) {
      if (child.type === 'bookmark') {
        const key = normalizeForCompare(child.href);
        let group = map.get(key);
        if (!group) {
          group = { key, href: child.href, nodes: [] };
          map.set(key, group);
        }
        group.nodes.push({ id: child.id, title: child.title, path: path.join(' / ') });
      } else {
        walk(child, [...path, child.title]);
      }
    }
  }
  for (const root of roots) walk(root, [root.title]);
  return [...map.values()].filter((g) => g.nodes.length > 1);
}

// Removes duplicate-URL bookmarks, keeping the first occurrence of each.
export function dedupeTree(roots: Folder[]): number {
  const seen = new Set<string>();
  let removed = 0;
  // Recursively keeps the first bookmark per URL and drops the rest.
  function walk(folder: Folder) {
    const kept: TreeNode[] = [];
    for (const child of folder.children) {
      if (child.type === 'bookmark') {
        const key = normalizeForCompare(child.href);
        if (seen.has(key)) {
          removed++;
          continue;
        }
        seen.add(key);
        kept.push(child);
      } else {
        walk(child);
        kept.push(child);
      }
    }
    folder.children = kept;
  }
  for (const root of roots) walk(root);
  return removed;
}
