<!-- Renders a single tree node (folder or bookmark) with recursive children. -->
<script lang="ts">
  import type { Folder, Bookmark, TreeNode as TreeNodeType } from '../../lib/types';
  import type { Store } from '../../stores/bookmarks.svelte';
  import { dndzone } from 'svelte-dnd-action';
  import TreeNode from './TreeNode.svelte';

  let { node, store, depth = 0 }: { node: TreeNodeType; store: Store; depth: number } = $props();

  let isFolder = $derived(node.type === 'folder');
  let folder = $derived(isFolder ? (node as Folder) : null);
  let bookmark = $derived(!isFolder ? (node as Bookmark) : null);
  let isExpanded = $derived(store.expandedIds[node.id] ?? false);
  let isSelected = $derived(store.selectedId === node.id);
  let bmCount = $derived(folder ? folder.children.filter((c) => c.type === 'bookmark').length : 0);
  let folderCount = $derived(folder ? folder.children.filter((c) => c.type === 'folder').length : 0);
  let icon = $derived(bookmark ? store.iconFor(bookmark.href) : null);

  let dragEnabled = $derived(!!folder && isExpanded && store.showTreeBookmarks);
  let visibleChildren = $derived(
    folder && isExpanded
      ? store.showTreeBookmarks
        ? folder.children
        : folder.children.filter((c) => c.type === 'folder')
      : [],
  );

  let childItems = $state<TreeNodeType[]>([]);
  $effect(() => {
    if (dragEnabled && folder) childItems = [...folder.children];
  });

  // Updates the local drag preview.
  function handleConsider(e: CustomEvent<{ items: TreeNodeType[] }>) {
    childItems = e.detail.items;
  }
  // Commits the reordered children to the store.
  function handleFinalize(e: CustomEvent<{ items: TreeNodeType[] }>) {
    childItems = e.detail.items;
    if (folder) store.reorderChildren(folder.id, e.detail.items);
  }

  // Toggles the folder open or closed.
  function handleToggle(e: MouseEvent) {
    e.stopPropagation();
    store.toggleExpanded(node.id);
  }

  // Selects this folder.
  function handleSelect(e: MouseEvent) {
    e.stopPropagation();
    if (isFolder) store.selectNode(node.id);
  }

  // Opens the edit dialog for this folder.
  function handleEdit(e: MouseEvent) {
    e.stopPropagation();
    if (isFolder) {
      store.openModal({ open: true, title: 'Edit folder', type: 'editFolder', nodeId: node.id });
    }
  }
</script>

<li class="relative" style="padding-left: {depth > 0 ? '14px' : '0'}">
  {#if isFolder && folder}
    <div class="group flex items-center gap-0.5">
      <button
        class="flex h-5 w-5 flex-shrink-0 items-center justify-center text-text-tertiary transition-all duration-150 hover:text-text"
        class:rotate-90={isExpanded}
        onclick={handleToggle}
        title="Toggle folder"
        aria-label="Toggle folder"
      >
        <svg class="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 4l8 6-8 6V4z" />
        </svg>
      </button>

      <button
        class="node-btn flex flex-1 items-center gap-1.5 rounded px-1.5 py-0.5 text-left transition-colors duration-75 hover:bg-surface-2"
        class:selected={isSelected}
        onclick={handleSelect}
        ondblclick={handleEdit}
      >
        <svg class="h-3.5 w-3.5 flex-shrink-0 transition-colors duration-150 {isSelected ? 'text-accent' : 'text-text-tertiary'}" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          {#if isExpanded}
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          {/if}
        </svg>

        <span class="flex-1 truncate text-[12px] transition-colors duration-100 {isSelected ? 'text-text' : 'text-text-secondary'}">{node.title}</span>

        <span class="ml-auto text-[10px] text-text-tertiary tabular-nums">{bmCount}/{folderCount}</span>

        <span
          role="button"
          tabindex="-1"
          class="hidden flex-shrink-0 text-text-tertiary transition-colors hover:text-text group-hover:inline-flex"
          onclick={handleEdit}
          onkeydown={(e) => e.key === 'Enter' && handleEdit(e as unknown as MouseEvent)}
          title="Edit"
        >
          <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
        </span>
      </button>
    </div>

    {#if dragEnabled}
      <ul
        class="ml-2.5 list-none border-l border-border/50 p-0"
        use:dndzone={{ items: childItems, flipDurationMs: 0, type: 'tree-item', dropTargetStyle: {} }}
        onconsider={handleConsider}
        onfinalize={handleFinalize}
      >
        {#each childItems as child (child.id)}
          <TreeNode node={child} {store} depth={depth + 1} />
        {/each}
      </ul>
    {:else if visibleChildren.length > 0}
      <ul class="ml-2.5 list-none border-l border-border/50 p-0">
        {#each visibleChildren as child (child.id)}
          <TreeNode node={child} {store} depth={depth + 1} />
        {/each}
      </ul>
    {/if}
  {:else if bookmark}
    <a
      href={bookmark.href}
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center gap-1.5 rounded px-1.5 py-0.5 pl-7 text-[12px] text-text-tertiary no-underline transition-colors duration-75 hover:bg-surface-2 hover:text-text-secondary"
      title={bookmark.href}
    >
      {#if icon}
        <img src={icon} alt="" class="h-3 w-3 flex-shrink-0 rounded-sm" />
      {:else}
        <svg class="h-3 w-3 flex-shrink-0 text-text-tertiary/60" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 006.364 6.364l1.757-1.757" />
        </svg>
      {/if}
      <span class="truncate">{bookmark.title || bookmark.href}</span>
    </a>
  {/if}
</li>

<style>
  .selected {
    background-color: var(--color-accent-muted);
    border-left: 2px solid var(--color-accent);
  }
</style>
