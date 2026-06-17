<!-- Scrollable container for the root-level tree with drag-and-drop reordering. -->
<script lang="ts">
  import TreeNode from './TreeNode.svelte';
  import { dndzone } from 'svelte-dnd-action';
  import type { Folder } from '../../lib/types';
  import type { Store } from '../../stores/bookmarks.svelte';

  let { store }: { store: Store } = $props();

  let items = $state<Folder[]>([]);
  $effect(() => {
    items = store.roots.map((r) => ({ ...r }));
  });

  // Updates the local drag preview.
  function handleConsider(e: CustomEvent<{ items: Folder[] }>) {
    items = e.detail.items;
  }

  // Commits the reordered roots to the store.
  function handleFinalize(e: CustomEvent<{ items: Folder[] }>) {
    items = e.detail.items;
    store.reorderRoots(e.detail.items);
  }
</script>

<div class="min-h-0 flex-1 overflow-auto">
  {#if store.roots.length === 0}
    <div class="px-3 py-8 text-center anim-fade-in">
      <div class="mb-3 text-lg text-text-tertiary/30">~</div>
      <div class="text-[11px] text-text-tertiary">no folders yet</div>
      <div class="mt-1 text-[10px] text-text-tertiary/60">click <span class="text-text-secondary">+new</span> to create one</div>
    </div>
  {:else}
    <ul
      class="list-none space-y-px p-1"
      use:dndzone={{ items, flipDurationMs: 0, type: 'root', dropTargetStyle: {} }}
      onconsider={handleConsider}
      onfinalize={handleFinalize}
    >
      {#each items as root (root.id)}
        <TreeNode node={root} {store} depth={0} />
      {/each}
    </ul>
  {/if}
</div>
