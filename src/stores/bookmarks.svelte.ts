// Central state store managing the bookmark tree, selection, history, and UI.

import type {
  Folder,
  TreeNode,
  Toast,
  Theme,
  SortKey,
  SortDir,
  LinkStatus,
  PersistedState,
} from '../lib/types';
import { HistoryManager } from '../lib/history';
import {
  nowSec,
  makeRoot,
  makeFolder,
  makeBookmark,
  findNodeById,
  findParent,
  getBreadcrumb,
  countStats,
  getAllExpandedIds,
  expandPathToNode,
  removeNodeById,
  isSelfOrDescendant,
  sortChildren,
  flattenFolder,
  collectBookmarks,
  findDuplicateGroups,
  dedupeTree,
  type DuplicateGroup,
} from '../lib/tree-utils';
import { isHttpUrl, normalizeUrl, hostOf } from '../lib/url';
import { uid } from '../lib/uid';
import { queueIconFetch, setQueueChangeListener } from '../lib/favicon';
import {
  getIcon,
  icons,
  mergeIcons,
  loadIcons,
  snapshotIcons,
  clearIcons,
} from '../lib/icons.svelte';
import { searchTree, type SearchResult } from '../lib/search';
import { save, load, clear as clearPersisted, debounce, STATE_VERSION } from '../lib/persist';
import { checkLinks } from '../lib/deadlinks';

const history = new HistoryManager();

let roots = $state<Folder[]>([]);
let selectedId = $state<string | null>(null);
let expandedIds = $state<Record<string, boolean>>({});
let showTreeBookmarks = $state(true);
let toasts = $state<Toast[]>([]);
let searchQuery = $state('');
let iconPending = $state(0);
let theme = $state<Theme>('dark');
let selectedIds = $state<Set<string>>(new Set());
let linkStatus = $state<Record<string, LinkStatus>>({});
let duplicateGroups = $state<DuplicateGroup[]>([]);

type ModalState = {
  open: boolean;
  title: string;
  type:
    | 'editFolder'
    | 'editBookmark'
    | 'confirm'
    | 'newRoot'
    | 'importChoice'
    | 'move'
    | 'duplicates';
  nodeId?: string;
  nodeIds?: string[];
  onConfirm?: () => void;
  message?: string;
  importedData?: TreeNode[];
  importedIcons?: Record<string, string>;
};

let modalState = $state<ModalState>({ open: false, title: '', type: 'confirm' });

let canUndo = $state(false);
let canRedo = $state(false);

const stats = $derived(countStats(roots));
const selectedNode = $derived(selectedId ? (findNodeById(roots, selectedId) as Folder | null) : null);
const breadcrumb = $derived(selectedId ? getBreadcrumb(roots, selectedId) : []);
const searchResults = $derived<SearchResult[]>(searchQuery ? searchTree(roots, searchQuery) : []);

setQueueChangeListener((pending) => {
  iconPending = pending;
});

let loaded = false;
let saveFailed = false;

// Debounced write of the tree and icons to localStorage.
const scheduleSave = debounce((state: PersistedState, ic: Record<string, string>) => {
  const res = save(state, ic);
  if (!res.ok && !saveFailed) {
    saveFailed = true;
    addToast('Storage is full — export your bookmarks to keep them safe', 'error');
  } else if (res.ok) {
    saveFailed = false;
    if (res.iconsDropped) addToast('Saved, but icons were too large for storage', 'info');
  }
}, 400);

$effect.root(() => {
  $effect(() => {
    const snapshot: PersistedState = {
      version: STATE_VERSION,
      roots,
      selectedId,
      expandedIds,
      showTreeBookmarks,
      theme,
    };
    const ic = icons();
    if (!loaded) return;
    scheduleSave(snapshot, ic);
  });
});

// Applies the active theme to the document root.
function applyTheme(t: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = t;
  }
}

// Syncs the undo/redo availability flags from the history manager.
function syncHistoryState(): void {
  canUndo = history.canUndo;
  canRedo = history.canRedo;
}

// Pushes the current tree onto the undo history.
function pushHistory(): void {
  history.push(roots, selectedId);
  syncHistoryState();
}

// Loads persisted state, or seeds a default root folder.
function init(): void {
  const { state, icons: savedIcons } = load();
  if (state && state.roots.length > 0) {
    roots = state.roots;
    selectedId = state.selectedId;
    expandedIds = state.expandedIds ?? {};
    showTreeBookmarks = state.showTreeBookmarks ?? true;
    theme = state.theme ?? 'dark';
    loadIcons(savedIcons);
    if (!selectedId || !findNodeById(roots, selectedId)) {
      selectedId = roots[0].id;
      expandedIds = { ...expandedIds, [roots[0].id]: true };
    }
  } else {
    const root = makeRoot('Bookmarks');
    roots = [root];
    expandedIds = { [root.id]: true };
    selectedId = root.id;
  }
  applyTheme(theme);
  loaded = true;
}

// Selects a node and expands the folders along its path.
function selectNode(id: string): void {
  selectedId = id;
  clearSelection();
  const pathIds = expandPathToNode(roots, id);
  for (const pid of pathIds) expandedIds[pid] = true;
  expandedIds = { ...expandedIds };
}

// Selects a node, or its parent folder when it is a bookmark.
function revealNode(id: string): void {
  const node = findNodeById(roots, id);
  if (!node) return;
  if (node.type === 'folder') {
    selectNode(id);
  } else {
    const parent = findParent(roots, id);
    if (parent) selectNode(parent.id);
  }
}

// Toggles a single folder's expanded state.
function toggleExpanded(id: string): void {
  expandedIds = { ...expandedIds, [id]: !expandedIds[id] };
}

// Opens every folder in the tree.
function expandAll(): void {
  expandedIds = getAllExpandedIds(roots);
}

// Collapses everything except the root folders.
function collapseAll(): void {
  const ids: Record<string, boolean> = {};
  for (const r of roots) ids[r.id] = true;
  expandedIds = ids;
}

// Toggles whether bookmarks appear in the sidebar tree.
function toggleTreeBookmarks(): void {
  showTreeBookmarks = !showTreeBookmarks;
}

// Switches between the light and dark themes.
function toggleTheme(): void {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
}

// Adds a subfolder to a parent folder.
function addFolder(parentId: string, name: string): void {
  const parent = findNodeById(roots, parentId);
  if (!parent || parent.type !== 'folder') return;
  pushHistory();
  const folder = makeFolder(name);
  parent.children.push(folder);
  parent.lastModified = nowSec();
  expandedIds = { ...expandedIds, [parentId]: true };
  roots = [...roots];
  addToast('Folder added', 'success');
}

// Adds a single bookmark and optionally queues its favicon.
function addBookmark(parentId: string, rawUrl: string, title: string, fetchIcon: boolean): void {
  const parent = findNodeById(roots, parentId);
  if (!parent || parent.type !== 'folder') return;
  const url = normalizeUrl(rawUrl);
  if (!title) {
    try {
      title = new URL(url).hostname;
    } catch {
      title = url;
    }
  }
  pushHistory();
  const bm = makeBookmark(url, title);
  parent.children.push(bm);
  parent.lastModified = nowSec();
  expandedIds = { ...expandedIds, [parentId]: true };
  roots = [...roots];

  if (fetchIcon && isHttpUrl(url)) queueIconFetch(url);
  addToast('Bookmark added', 'success');
}

// Adds pre-parsed bookmark candidates to a folder.
function bulkAdd(
  parentId: string,
  candidates: { url: string; title: string }[],
  fetchIcons: boolean,
): { added: number; skipped: number } {
  const parent = findNodeById(roots, parentId);
  if (!parent || parent.type !== 'folder') return { added: 0, skipped: 0 };

  let added = 0;
  let skipped = 0;
  pushHistory();
  for (const cand of candidates) {
    const url = normalizeUrl(cand.url);
    if (!url) {
      skipped++;
      continue;
    }
    let title = cand.title;
    if (!title) {
      try {
        title = new URL(url).hostname;
      } catch {
        title = url;
      }
    }
    parent.children.push(makeBookmark(url, title));
    added++;
    if (fetchIcons && isHttpUrl(url)) queueIconFetch(url);
  }
  parent.lastModified = nowSec();
  expandedIds = { ...expandedIds, [parentId]: true };
  roots = [...roots];

  if (added > 0) addToast(`Added ${added} bookmark${added !== 1 ? 's' : ''}`, 'success');
  return { added, skipped };
}

// Deletes a node and fixes up the selection.
function deleteNode(nodeId: string): void {
  if (!findNodeById(roots, nodeId)) return;
  pushHistory();
  const result = removeNodeById(roots, nodeId);
  if (!result) return;
  if (result.parent === null) {
    if (selectedId === nodeId) selectedId = roots.length > 0 ? roots[0].id : null;
  } else {
    result.parent.lastModified = nowSec();
    if (selectedId === nodeId) selectedId = result.parent.id;
  }
  roots = [...roots];
  addToast('Deleted', 'success');
}

// Updates a node's title and, for bookmarks, its URL.
function editNode(nodeId: string, updates: { title?: string; href?: string }): void {
  const node = findNodeById(roots, nodeId);
  if (!node) return;
  pushHistory();
  if (updates.title !== undefined) node.title = updates.title;
  if (node.type === 'bookmark' && updates.href !== undefined) {
    node.href = normalizeUrl(updates.href);
  }
  if (node.type === 'folder') {
    node.lastModified = nowSec();
  } else {
    const parent = findParent(roots, nodeId);
    if (parent) parent.lastModified = nowSec();
  }
  roots = [...roots];
}

// Replaces a folder's children with a reordered list.
function reorderChildren(parentId: string, newChildren: TreeNode[]): void {
  const parent = findNodeById(roots, parentId);
  if (!parent || parent.type !== 'folder') return;
  pushHistory();
  parent.children = newChildren;
  parent.lastModified = nowSec();
  roots = [...roots];
}

// Replaces the root folders with a reordered list.
function reorderRoots(newRoots: Folder[]): void {
  pushHistory();
  roots = [...newRoots];
}

// Moves a node up into its grandparent folder.
function moveToParent(nodeId: string): void {
  const parent = findParent(roots, nodeId);
  if (!parent) return;
  const grandparent = findParent(roots, parent.id);
  if (!grandparent) return;
  const idx = parent.children.findIndex((c) => c.id === nodeId);
  if (idx === -1) return;
  pushHistory();
  const [node] = parent.children.splice(idx, 1);
  parent.lastModified = nowSec();
  const parentIdx = grandparent.children.findIndex((c) => c.id === parent.id);
  grandparent.children.splice(parentIdx + 1, 0, node);
  grandparent.lastModified = nowSec();
  roots = [...roots];
  addToast('Moved to parent folder', 'success');
}

// Moves valid nodes into a target folder, skipping invalid moves.
function moveNodesToFolder(nodeIds: string[], targetId: string): number {
  const target = findNodeById(roots, targetId);
  if (!target || target.type !== 'folder') return 0;

  const valid = nodeIds.filter((id) => {
    const node = findNodeById(roots, id);
    if (!node) return false;
    if (id === targetId) return false;
    if (node.type === 'folder' && isSelfOrDescendant(node, targetId)) return false;
    const parent = findParent(roots, id);
    if (parent && parent.id === targetId) return false;
    return true;
  });
  if (valid.length === 0) return 0;

  pushHistory();
  for (const id of valid) {
    const removed = removeNodeById(roots, id);
    if (removed) {
      if (removed.parent) removed.parent.lastModified = nowSec();
      target.children.push(removed.node);
    }
  }
  target.lastModified = nowSec();
  expandedIds = { ...expandedIds, [targetId]: true };
  roots = [...roots];
  addToast(`Moved ${valid.length} item${valid.length !== 1 ? 's' : ''}`, 'success');
  return valid.length;
}

// Adds a new root folder, optionally as the toolbar folder.
function addRoot(name: string, isToolbar: boolean): void {
  pushHistory();
  if (isToolbar) {
    for (const r of roots) r.personalToolbarFolder = false;
  }
  const root = makeRoot(name, isToolbar);
  roots = [...roots, root];
  expandedIds = { ...expandedIds, [root.id]: true };
  selectedId = root.id;
  addToast('Root folder added', 'success');
}

// Sorts the selected folder's children by key and direction.
function sortSelected(key: SortKey, dir: SortDir): void {
  const folder = selectedId ? findNodeById(roots, selectedId) : null;
  if (!folder || folder.type !== 'folder') return;
  pushHistory();
  folder.children = sortChildren(folder.children, key, dir);
  folder.lastModified = nowSec();
  roots = [...roots];
  addToast('Sorted', 'success');
}

// Flattens the selected folder into a flat bookmark list.
function flattenSelected(): void {
  const folder = selectedId ? findNodeById(roots, selectedId) : null;
  if (!folder || folder.type !== 'folder') return;
  pushHistory();
  const count = flattenFolder(folder);
  roots = [...roots];
  addToast(`Flattened to ${count} bookmark${count !== 1 ? 's' : ''}`, 'success');
}

// Computes duplicate groups and opens the duplicates dialog.
function openDuplicates(): void {
  duplicateGroups = findDuplicateGroups(roots);
  modalState = {
    open: true,
    title: 'Duplicate bookmarks',
    type: 'duplicates',
  };
}

// Removes duplicate bookmarks across the tree.
function dedupeAll(): void {
  pushHistory();
  const removed = dedupeTree(roots);
  roots = [...roots];
  duplicateGroups = [];
  addToast(removed > 0 ? `Removed ${removed} duplicate${removed !== 1 ? 's' : ''}` : 'No duplicates found', removed > 0 ? 'success' : 'info');
}

// Toggles a node's membership in the multi-selection.
function toggleSelection(id: string): void {
  const next = new Set(selectedIds);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds = next;
}

// Replaces the multi-selection with the given IDs.
function selectMany(ids: string[]): void {
  selectedIds = new Set(ids);
}

// Clears the multi-selection.
function clearSelection(): void {
  if (selectedIds.size > 0) selectedIds = new Set();
}

// Deletes all selected nodes.
function deleteSelected(): void {
  const ids = [...selectedIds];
  if (ids.length === 0) return;
  pushHistory();
  for (const id of ids) removeNodeById(roots, id);
  if (selectedId && !findNodeById(roots, selectedId)) {
    selectedId = roots.length > 0 ? roots[0].id : null;
  }
  clearSelection();
  roots = [...roots];
  addToast(`Deleted ${ids.length} item${ids.length !== 1 ? 's' : ''}`, 'success');
}

// Moves the selected nodes into a target folder.
function moveSelected(targetId: string): void {
  const ids = [...selectedIds];
  if (moveNodesToFolder(ids, targetId) > 0) clearSelection();
}

// Checks reachability of bookmarks in the chosen scope.
async function runLinkCheck(scope: 'all' | 'selected'): Promise<void> {
  let source: TreeNode[] = roots;
  if (scope === 'selected' && selectedNode) source = [selectedNode];
  const targets = source
    .flatMap((n) => collectBookmarks(n))
    .map((b) => ({ id: b.id, href: b.href }))
    .filter((t) => isHttpUrl(t.href));
  if (targets.length === 0) {
    addToast('No links to check here', 'info');
    return;
  }
  addToast(`Checking ${targets.length} link${targets.length !== 1 ? 's' : ''}…`, 'info');
  await checkLinks(targets, (id, status) => {
    linkStatus = { ...linkStatus, [id]: status };
  });
  const dead = Object.values(linkStatus).filter((s) => s === 'dead').length;
  addToast(dead > 0 ? `${dead} link${dead !== 1 ? 's' : ''} look unreachable` : 'No unreachable links found', dead > 0 ? 'error' : 'success');
}

// Clears all stored link-check statuses.
function clearLinkStatus(): void {
  linkStatus = {};
}

// Imports parsed folders using the chosen merge strategy.
function importRoots(
  imported: TreeNode[],
  importedIcons: Record<string, string>,
  mode: 'replace' | 'merge' | 'alongside',
): void {
  pushHistory();
  mergeIcons(importedIcons);
  if (mode === 'merge' && selectedId) {
    const folder = findNodeById(roots, selectedId);
    if (folder && folder.type === 'folder') {
      folder.children.push(...imported);
      folder.lastModified = nowSec();
      expandedIds = { ...expandedIds, [folder.id]: true };
    }
  } else {
    const newRoots = imported.filter((item): item is Folder => item.type === 'folder');
    if (newRoots.length === 0) {
      const wrap = makeRoot('Imported');
      wrap.children.push(...imported);
      newRoots.push(wrap);
    }
    if (mode === 'alongside') {
      roots = [...roots, ...newRoots];
    } else {
      roots = newRoots;
      selectedId = null;
    }
  }
  expandedIds = getAllExpandedIds(roots);
  showTreeBookmarks = true;
  roots = [...roots];
  if (!selectedId && roots.length > 0) selectedId = roots[0].id;
  const s = countStats(roots);
  addToast(`Imported ${s.folders} folders, ${s.bookmarks} bookmarks`, 'success');
}

// Loads a Marksmith JSON export, replacing all data.
function importFromJSON(parsed: { roots: TreeNode[]; icons: Record<string, string> }): void {
  pushHistory();
  const newRoots = parsed.roots.filter((r): r is Folder => r.type === 'folder');
  loadIcons(parsed.icons);
  roots = newRoots.length > 0 ? newRoots : [makeRoot('Bookmarks')];
  expandedIds = getAllExpandedIds(roots);
  selectedId = roots[0].id;
  showTreeBookmarks = true;
  const s = countStats(roots);
  addToast(`Loaded ${s.folders} folders, ${s.bookmarks} bookmarks`, 'success');
}

// Clears everything and starts from a single empty root.
function reset(): void {
  history.clear();
  syncHistoryState();
  clearIcons();
  clearLinkStatus();
  clearSelection();
  const root = makeRoot('Bookmarks');
  roots = [root];
  expandedIds = { [root.id]: true };
  selectedId = root.id;
  showTreeBookmarks = true;
  clearPersisted();
  addToast('Reset complete', 'success');
}

// Restores the previous history snapshot.
function undo(): void {
  const entry = history.undo(roots, selectedId);
  if (!entry) return;
  roots = entry.roots;
  selectedId = entry.selectedId;
  syncHistoryState();
  addToast('Undone', 'info');
}

// Restores the next history snapshot.
function redo(): void {
  const entry = history.redo(roots, selectedId);
  if (!entry) return;
  roots = entry.roots;
  selectedId = entry.selectedId;
  syncHistoryState();
  addToast('Redone', 'info');
}

// Shows a transient toast message.
function addToast(message: string, type: Toast['type'] = 'info'): void {
  const id = uid();
  toasts = [...toasts, { id, message, type }];
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
  }, 3000);
}

// Opens a modal with the given configuration.
function openModal(config: ModalState): void {
  modalState = config;
}

// Closes the modal.
function closeModal(): void {
  modalState = { open: false, title: '', type: 'confirm' };
}

// Sets the current search query.
function setSearchQuery(q: string): void {
  searchQuery = q;
}

// Returns a favicon data URL for a bookmark href, or null.
function iconFor(href: string): string | null {
  const map = icons();
  return map[hostOf(href)] ?? null;
}

// Returns the reactive store API consumed by components.
export function getStore() {
  return {
    get roots() {
      return roots;
    },
    get selectedId() {
      return selectedId;
    },
    get expandedIds() {
      return expandedIds;
    },
    get showTreeBookmarks() {
      return showTreeBookmarks;
    },
    get stats() {
      return stats;
    },
    get selectedNode() {
      return selectedNode;
    },
    get breadcrumb() {
      return breadcrumb;
    },
    get toasts() {
      return toasts;
    },
    get searchQuery() {
      return searchQuery;
    },
    get searchResults() {
      return searchResults;
    },
    get iconPending() {
      return iconPending;
    },
    get modalState() {
      return modalState;
    },
    get canUndo() {
      return canUndo;
    },
    get canRedo() {
      return canRedo;
    },
    get theme() {
      return theme;
    },
    get selectedIds() {
      return selectedIds;
    },
    get selectionCount() {
      return selectedIds.size;
    },
    get linkStatus() {
      return linkStatus;
    },
    get duplicateGroups() {
      return duplicateGroups;
    },
    isSelected: (id: string) => selectedIds.has(id),
    iconFor,
    getIconForHost: getIcon,
    snapshotIcons,

    init,
    selectNode,
    revealNode,
    toggleExpanded,
    expandAll,
    collapseAll,
    toggleTreeBookmarks,
    toggleTheme,
    addFolder,
    addBookmark,
    bulkAdd,
    deleteNode,
    editNode,
    reorderChildren,
    reorderRoots,
    moveToParent,
    moveNodesToFolder,
    addRoot,
    sortSelected,
    flattenSelected,
    openDuplicates,
    dedupeAll,
    toggleSelection,
    selectMany,
    clearSelection,
    deleteSelected,
    moveSelected,
    runLinkCheck,
    importRoots,
    importFromJSON,
    reset,
    undo,
    redo,
    addToast,
    openModal,
    closeModal,
    setSearchQuery,
  };
}

export type Store = ReturnType<typeof getStore>;
