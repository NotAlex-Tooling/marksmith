<!-- Multi-purpose modal dialog: edit, confirm, create, import, move, duplicates. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { findNodeById, findParent, isSelfOrDescendant, listFolders } from '../../lib/tree-utils';
  import { trapFocus } from '../../lib/focus-trap';
  import type { Store } from '../../stores/bookmarks.svelte';

  let { store }: { store: Store } = $props();
  let modal = $derived(store.modalState);

  let editTitle = $state('');
  let editUrl = $state('');
  let newRootName = $state('');
  let newRootToolbar = $state(false);

  let lastKey = '';
  $effect(() => {
    const open = modal.open;
    const type = modal.type;
    const nodeId = modal.nodeId;
    const key = open ? `${type}:${nodeId ?? ''}` : '';
    if (key === lastKey) return;
    lastKey = key;
    if (!open) return;
    untrack(() => {
      if (type === 'editFolder' || type === 'editBookmark') {
        const node = nodeId ? findNodeById(store.roots, nodeId) : null;
        if (node) {
          editTitle = node.title;
          editUrl = node.type === 'bookmark' ? node.href : '';
        }
      } else if (type === 'newRoot') {
        newRootName = 'Bookmarks bar';
        newRootToolbar = false;
      }
    });
  });

  let moveTargets = $derived(modal.type === 'move' ? listFolders(store.roots) : []);

  // Returns true when a folder cannot receive the moved nodes.
  function isInvalidTarget(targetId: string): boolean {
    const ids = modal.nodeIds ?? [];
    for (const id of ids) {
      if (id === targetId) return true;
      const node = findNodeById(store.roots, id);
      if (node && node.type === 'folder' && isSelfOrDescendant(node, targetId)) return true;
      const parent = findParent(store.roots, id);
      if (parent && parent.id === targetId) return true;
    }
    return false;
  }

  // Moves the nodes into the chosen folder and closes.
  function doMove(targetId: string) {
    store.moveNodesToFolder(modal.nodeIds ?? [], targetId);
    store.clearSelection();
    store.closeModal();
  }

  // Applies the current dialog's action.
  function handleSave() {
    if (modal.type === 'editFolder' && modal.nodeId) {
      if (editTitle.trim()) store.editNode(modal.nodeId, { title: editTitle.trim() });
      store.closeModal();
    } else if (modal.type === 'editBookmark' && modal.nodeId) {
      const updates: { title?: string; href?: string } = {};
      if (editTitle.trim()) updates.title = editTitle.trim();
      if (editUrl.trim()) updates.href = editUrl.trim();
      store.editNode(modal.nodeId, updates);
      store.closeModal();
    } else if (modal.type === 'newRoot') {
      if (newRootName.trim()) store.addRoot(newRootName.trim(), newRootToolbar);
      store.closeModal();
    } else if (modal.type === 'confirm' && modal.onConfirm) {
      modal.onConfirm();
    }
  }

  // Closes on Escape and saves on Enter.
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') store.closeModal();
    if (e.key === 'Enter' && (modal.type === 'editFolder' || modal.type === 'editBookmark' || modal.type === 'newRoot')) {
      handleSave();
    }
  }

  // Closes the modal when the backdrop is clicked.
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) store.closeModal();
  }

  const inputClass = "w-full border-b border-border bg-transparent py-1.5 text-[12px] text-text outline-none transition-colors focus:border-accent";
  const labelClass = "mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary";
  const btnSecondary = "px-3 py-1.5 text-[11px] text-text-tertiary transition-colors hover:text-text";
  const btnPrimary = "px-3 py-1.5 text-[11px] text-accent transition-colors hover:text-accent-hover";
  const btnDanger = "px-3 py-1.5 text-[11px] text-danger transition-colors hover:text-danger";
</script>

{#if modal.open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    transition:fade={{ duration: 120 }}
  >
    <div
      class="w-[90%] max-w-sm border border-border bg-surface p-5 shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-label={modal.title}
      use:trapFocus
      transition:scale={{ duration: 120, start: 0.97 }}
    >
      <h3 class="mb-4 text-[12px] font-bold text-text">{modal.title}</h3>

      {#if modal.type === 'confirm'}
        <p class="mb-5 text-[11px] leading-relaxed text-text-secondary">{modal.message}</p>
        <div class="flex justify-end gap-1">
          <button class={btnSecondary} onclick={() => store.closeModal()}>cancel</button>
          <button class={btnDanger} onclick={handleSave}>confirm</button>
        </div>

      {:else if modal.type === 'editFolder'}
        <label for="edit-folder-name" class={labelClass}>folder name</label>
        <input id="edit-folder-name" type="text" bind:value={editTitle} onkeydown={handleKeydown} class="{inputClass} mb-4" />
        <div class="flex justify-end gap-1">
          <button class={btnSecondary} onclick={() => store.closeModal()}>cancel</button>
          <button class={btnPrimary} onclick={handleSave}>save</button>
        </div>

      {:else if modal.type === 'editBookmark'}
        <label for="edit-bm-title" class={labelClass}>title</label>
        <input id="edit-bm-title" type="text" bind:value={editTitle} onkeydown={handleKeydown} class="{inputClass} mb-3" />
        <label for="edit-bm-url" class={labelClass}>url</label>
        <input id="edit-bm-url" type="text" bind:value={editUrl} onkeydown={handleKeydown} class="{inputClass} mb-4" />
        <div class="flex justify-end gap-1">
          <button class={btnSecondary} onclick={() => store.closeModal()}>cancel</button>
          <button class={btnPrimary} onclick={handleSave}>save</button>
        </div>

      {:else if modal.type === 'move'}
        <p class="mb-3 text-[11px] leading-relaxed text-text-secondary">
          Move {(modal.nodeIds?.length ?? 0)} item{(modal.nodeIds?.length ?? 0) !== 1 ? 's' : ''} into:
        </p>
        <div class="mb-4 max-h-64 overflow-auto border border-border">
          {#each moveTargets as target (target.id)}
            {@const invalid = isInvalidTarget(target.id)}
            <button
              class="block w-full truncate px-3 py-1.5 text-left text-[11px] transition-colors disabled:opacity-30
                {invalid ? 'cursor-not-allowed text-text-tertiary' : 'text-text-secondary hover:bg-surface-2 hover:text-text'}"
              style="padding-left: {12 + target.depth * 14}px"
              disabled={invalid}
              onclick={() => doMove(target.id)}
            >
              {target.title}
            </button>
          {/each}
        </div>
        <div class="flex justify-end">
          <button class={btnSecondary} onclick={() => store.closeModal()}>cancel</button>
        </div>

      {:else if modal.type === 'duplicates'}
        {#if store.duplicateGroups.length === 0}
          <p class="mb-5 text-[11px] leading-relaxed text-text-secondary">No duplicate bookmarks found.</p>
          <div class="flex justify-end">
            <button class={btnSecondary} onclick={() => store.closeModal()}>close</button>
          </div>
        {:else}
          <p class="mb-3 text-[11px] leading-relaxed text-text-secondary">
            {store.duplicateGroups.length} URL{store.duplicateGroups.length !== 1 ? 's' : ''} appear more than once.
          </p>
          <div class="mb-4 max-h-64 space-y-3 overflow-auto">
            {#each store.duplicateGroups as group (group.key)}
              <div class="border border-border p-2">
                <div class="mb-1 truncate text-[10px] text-text-tertiary">{group.href}</div>
                {#each group.nodes as n (n.id)}
                  <button
                    class="block w-full truncate px-1 py-0.5 text-left text-[11px] text-text-secondary transition-colors hover:bg-surface-2 hover:text-text"
                    onclick={() => { store.revealNode(n.id); store.closeModal(); }}
                  >
                    {n.title} <span class="text-text-tertiary">— {n.path}</span>
                  </button>
                {/each}
              </div>
            {/each}
          </div>
          <div class="flex justify-end gap-1">
            <button class={btnSecondary} onclick={() => store.closeModal()}>close</button>
            <button class={btnDanger} onclick={() => { store.dedupeAll(); store.closeModal(); }}>remove duplicates</button>
          </div>
        {/if}

      {:else if modal.type === 'importChoice'}
        <p class="mb-4 text-[11px] leading-relaxed text-text-secondary">How should the imported bookmarks be added?</p>
        <div class="mb-4 space-y-2">
          <button
            class="w-full border border-border px-3 py-2.5 text-left transition-all hover:border-accent/50 hover:bg-accent/5"
            onclick={() => { store.importRoots(modal.importedData ?? [], modal.importedIcons ?? {}, 'replace'); store.closeModal(); }}
          >
            <div class="text-[11px] text-text">Replace all</div>
            <div class="text-[10px] text-text-tertiary">Remove existing bookmarks and use imported ones</div>
          </button>
          <button
            class="w-full border border-border px-3 py-2.5 text-left transition-all hover:border-accent/50 hover:bg-accent/5"
            onclick={() => { store.importRoots(modal.importedData ?? [], modal.importedIcons ?? {}, 'alongside'); store.closeModal(); }}
          >
            <div class="text-[11px] text-text">Add alongside</div>
            <div class="text-[10px] text-text-tertiary">Keep existing bookmarks and add imported folders next to them</div>
          </button>
          {#if store.selectedId}
            <button
              class="w-full border border-border px-3 py-2.5 text-left transition-all hover:border-accent/50 hover:bg-accent/5"
              onclick={() => { store.importRoots(modal.importedData ?? [], modal.importedIcons ?? {}, 'merge'); store.closeModal(); }}
            >
              <div class="text-[11px] text-text">Merge into "{store.selectedNode?.title}"</div>
              <div class="text-[10px] text-text-tertiary">Add imported items into the currently selected folder</div>
            </button>
          {/if}
        </div>
        <div class="flex justify-end">
          <button class={btnSecondary} onclick={() => store.closeModal()}>cancel</button>
        </div>

      {:else if modal.type === 'newRoot'}
        <label for="new-root-name" class={labelClass}>folder name</label>
        <input id="new-root-name" type="text" bind:value={newRootName} onkeydown={handleKeydown} class="{inputClass} mb-3" />
        <label class="mb-4 flex cursor-pointer items-center gap-1.5 text-[11px] text-text-tertiary">
          <input type="checkbox" bind:checked={newRootToolbar} class="h-3 w-3 accent-accent" />
          personal toolbar folder
        </label>
        <div class="flex justify-end gap-1">
          <button class={btnSecondary} onclick={() => store.closeModal()}>cancel</button>
          <button class={btnPrimary} onclick={handleSave}>create</button>
        </div>
      {/if}
    </div>
  </div>
{/if}
