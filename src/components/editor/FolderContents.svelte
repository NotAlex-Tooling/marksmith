<!-- Sortable list of a folder's children: open links, multi-select, sort,
     flatten, dead-link check, move, edit, and delete. -->
<script lang="ts">
  import type { TreeNode, Folder, Bookmark, SortKey, SortDir, LinkStatus } from '../../lib/types';
  import type { Store } from '../../stores/bookmarks.svelte';
  import { dndzone } from 'svelte-dnd-action';

  let { store }: { store: Store } = $props();

  let folder = $derived(store.selectedNode as Folder | null);
  let hasParent = $derived(store.breadcrumb.length > 1);
  let selectionCount = $derived(store.selectionCount);

  let items = $state<TreeNode[]>([]);
  $effect(() => {
    items = folder ? folder.children.map((c) => ({ ...c })) : [];
  });

  let allSelected = $derived(items.length > 0 && items.every((i) => store.isSelected(i.id)));

  let sortKey = $state<SortKey>('title');
  let sortDir = $state<SortDir>('asc');

  // Updates the local drag preview.
  function handleConsider(e: CustomEvent<{ items: TreeNode[] }>) {
    items = e.detail.items;
  }
  // Commits the reordered children to the store.
  function handleFinalize(e: CustomEvent<{ items: TreeNode[] }>) {
    items = e.detail.items;
    if (store.selectedId) store.reorderChildren(store.selectedId, e.detail.items);
  }

  // Sorts the folder by the given key.
  function applySort(key: SortKey) {
    sortKey = key;
    store.sortSelected(key, sortDir);
  }
  // Flips the sort direction and re-sorts.
  function toggleDir() {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    store.sortSelected(sortKey, sortDir);
  }

  // Selects or clears every item in the folder.
  function toggleSelectAll() {
    if (allSelected) store.clearSelection();
    else store.selectMany(items.map((i) => i.id));
  }

  // Confirms and deletes a single item.
  function handleDelete(item: TreeNode) {
    store.openModal({
      open: true,
      title: item.type === 'folder' ? 'Delete folder' : 'Remove bookmark',
      type: 'confirm',
      message:
        item.type === 'folder'
          ? `Delete folder "${item.title}" and everything inside?`
          : `Remove bookmark "${item.title}"?`,
      onConfirm: () => {
        store.deleteNode(item.id);
        store.closeModal();
      },
    });
  }

  // Opens the edit dialog for an item.
  function handleEdit(item: TreeNode) {
    const isFolder = item.type === 'folder';
    store.openModal({
      open: true,
      title: isFolder ? 'Edit folder' : 'Edit bookmark',
      type: isFolder ? 'editFolder' : 'editBookmark',
      nodeId: item.id,
    });
  }

  // Opens a subfolder.
  function handleNavigate(item: TreeNode) {
    if (item.type === 'folder') store.selectNode(item.id);
  }

  // Opens the move picker for a single item.
  function moveOne(item: TreeNode) {
    store.openModal({ open: true, title: 'Move to folder', type: 'move', nodeIds: [item.id] });
  }

  // Opens the move picker for the current selection.
  function moveSelected() {
    store.openModal({
      open: true,
      title: 'Move selected to folder',
      type: 'move',
      nodeIds: [...store.selectedIds],
    });
  }

  // Confirms and deletes the current selection.
  function deleteSelected() {
    store.openModal({
      open: true,
      title: 'Delete selected',
      type: 'confirm',
      message: `Delete ${selectionCount} selected item${selectionCount !== 1 ? 's' : ''}?`,
      onConfirm: () => {
        store.deleteSelected();
        store.closeModal();
      },
    });
  }

  // Confirms and flattens the folder.
  function flatten() {
    store.openModal({
      open: true,
      title: 'Flatten folder',
      type: 'confirm',
      message: 'Move every nested bookmark into this folder and remove its subfolders?',
      onConfirm: () => {
        store.flattenSelected();
        store.closeModal();
      },
    });
  }

  // Maps a link status to a dot colour class.
  function statusColor(status: LinkStatus | undefined): string {
    if (status === 'ok') return 'bg-success';
    if (status === 'dead') return 'bg-danger';
    if (status === 'unknown') return 'bg-info';
    if (status === 'checking') return 'bg-text-tertiary animate-pulse';
    return '';
  }
  // Maps a link status to a tooltip label.
  function statusTitle(status: LinkStatus | undefined): string {
    if (status === 'ok') return 'Reachable';
    if (status === 'dead') return 'Unreachable';
    if (status === 'unknown') return 'Could not determine (timeout)';
    if (status === 'checking') return 'Checking…';
    return '';
  }
</script>

{#if !folder}
  <p class="py-4 text-center text-[11px] text-text-tertiary anim-fade-in">no folder selected</p>
{:else}
  <div class="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-text-tertiary">
    {#if items.length > 0}
      <label class="flex cursor-pointer items-center gap-1.5" title="Select all">
        <input type="checkbox" checked={allSelected} onchange={toggleSelectAll} class="h-3 w-3 accent-accent" />
        all
      </label>
    {/if}

    {#if selectionCount > 0}
      <span class="text-accent tabular-nums">{selectionCount} selected</span>
      <button class="transition-colors hover:text-text" onclick={moveSelected}>move</button>
      <button class="transition-colors hover:text-danger" onclick={deleteSelected}>delete</button>
      <button class="transition-colors hover:text-text" onclick={() => store.clearSelection()}>clear</button>
    {:else if items.length > 0}
      <span class="text-text-tertiary/60">sort</span>
      <button class="transition-colors hover:text-text {sortKey === 'title' ? 'text-accent' : ''}" onclick={() => applySort('title')}>name</button>
      <button class="transition-colors hover:text-text {sortKey === 'href' ? 'text-accent' : ''}" onclick={() => applySort('href')}>url</button>
      <button class="transition-colors hover:text-text {sortKey === 'addDate' ? 'text-accent' : ''}" onclick={() => applySort('addDate')}>added</button>
      <button class="transition-colors hover:text-text" onclick={toggleDir} title="Toggle direction">{sortDir === 'asc' ? '↑' : '↓'}</button>
      <span class="text-border">|</span>
      <button class="transition-colors hover:text-text" onclick={flatten} title="Move all nested bookmarks up and remove subfolders">flatten</button>
      <button class="transition-colors hover:text-text" onclick={() => store.runLinkCheck('selected')} title="Check links in this folder for reachability">check</button>
    {/if}
  </div>

  {#if folder.children.length === 0}
    <p class="py-4 text-center text-[11px] text-text-tertiary anim-fade-in">empty -- add bookmarks above</p>
  {:else}
    <div
      class="border border-border"
      use:dndzone={{ items, flipDurationMs: 0, type: 'folder-contents', dropTargetStyle: {} }}
      onconsider={handleConsider}
      onfinalize={handleFinalize}
    >
      {#each items as item, idx (item.id)}
        {@const selected = store.isSelected(item.id)}
        {@const status = item.type === 'bookmark' ? store.linkStatus[item.id] : undefined}
        <div
          class="group flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-surface-2
            {selected ? 'bg-accent-muted' : ''}
            {idx < items.length - 1 ? 'border-b border-border' : ''}"
        >
          <input
            type="checkbox"
            checked={selected}
            onchange={() => store.toggleSelection(item.id)}
            class="h-3 w-3 flex-shrink-0 accent-accent"
            aria-label="Select {item.title}"
          />

          <span class="cursor-grab text-text-tertiary/20 transition-colors group-hover:text-text-tertiary/50" title="Drag to reorder">
            <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
            </svg>
          </span>

          <span class="flex w-4 flex-shrink-0 items-center justify-center {item.type === 'folder' ? 'text-accent' : 'text-text-tertiary'}">
            {#if item.type === 'folder'}
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            {:else if store.iconFor((item as Bookmark).href)}
              <img src={store.iconFor((item as Bookmark).href)} alt="" class="h-3.5 w-3.5 rounded-sm" />
            {:else}
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 006.364 6.364l1.757-1.757" />
              </svg>
            {/if}
          </span>

          <div class="min-w-0 flex-1">
            {#if item.type === 'folder'}
              <button
                class="block w-full truncate text-left text-[12px] text-text"
                onclick={() => handleNavigate(item)}
              >{item.title}</button>
              <div class="text-[10px] text-text-tertiary">
                {(item as Folder).children.filter((c) => c.type === 'bookmark').length} links,
                {(item as Folder).children.filter((c) => c.type === 'folder').length} dirs
              </div>
            {:else}
              <a
                href={(item as Bookmark).href}
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1.5 truncate text-[12px] text-text no-underline hover:text-accent"
              >
                {#if status}
                  <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full {statusColor(status)}" title={statusTitle(status)}></span>
                {/if}
                <span class="truncate">{item.title || (item as Bookmark).href}</span>
              </a>
              <div class="truncate text-[10px] text-text-tertiary">{(item as Bookmark).href}</div>
            {/if}
          </div>

          <div class="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              class="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-3 hover:text-text"
              onclick={() => moveOne(item)}
              title="Move to folder…"
            >
              <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
              </svg>
            </button>
            {#if hasParent}
              <button
                class="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-3 hover:text-text"
                onclick={() => store.moveToParent(item.id)}
                title="Move to parent folder"
              >
                <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 9l6-6m0 0l6 6m-6-6v12a6 6 0 01-12 0v-3" />
                </svg>
              </button>
            {/if}
            <button
              class="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-3 hover:text-text"
              onclick={() => handleEdit(item)}
              title="Edit"
            >
              <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>
            <button
              class="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-3 hover:text-danger"
              onclick={() => handleDelete(item)}
              title="Delete"
            >
              <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      {/each}
    </div>

    <p class="mt-2 text-[10px] text-text-tertiary tabular-nums">
      {folder.children.length} item{folder.children.length !== 1 ? 's' : ''}
    </p>
  {/if}
{/if}
