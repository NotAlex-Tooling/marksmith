<!-- Main editor area showing the selected folder's contents, add forms, and bulk import. -->
<script lang="ts">
  import Breadcrumb from './Breadcrumb.svelte';
  import AddBookmarkForm from './AddBookmarkForm.svelte';
  import BulkAddForm from './BulkAddForm.svelte';
  import FolderContents from './FolderContents.svelte';
  import { fade } from 'svelte/transition';
  import type { Store } from '../../stores/bookmarks.svelte';

  let { store }: { store: Store } = $props();

  let showBulk = $state(false);
  let subfolderName = $state('');
  let showSubfolderInput = $state(false);

  let childCount = $derived(store.selectedNode?.children.length ?? 0);

  // Creates a subfolder in the selected folder.
  function handleAddSubfolder() {
    if (!subfolderName.trim() || !store.selectedId) return;
    store.addFolder(store.selectedId, subfolderName.trim());
    subfolderName = '';
    showSubfolderInput = false;
  }

  // Confirms or cancels the subfolder input.
  function handleSubfolderKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleAddSubfolder();
    if (e.key === 'Escape') { showSubfolderInput = false; subfolderName = ''; }
  }

  // Opens the new root folder dialog.
  function handleCreateRoot() {
    store.openModal({ open: true, title: 'New root folder', type: 'newRoot' });
  }
</script>

<div class="flex flex-1 flex-col overflow-hidden">
  {#if !store.selectedNode}
    <div class="flex h-full items-center justify-center" in:fade={{ duration: 200 }}>
      <div class="max-w-xs text-center anim-fade-in">
        <svg class="mx-auto mb-3 h-8 w-8 text-text-tertiary/15" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        <p class="mb-1 text-[12px] text-text-secondary">no folder selected</p>
        <p class="mb-5 text-[10px] text-text-tertiary/60">create a root folder to start adding bookmarks</p>
        <button
          class="inline-flex items-center gap-1.5 border border-border px-4 py-2 text-[11px] text-accent transition-all hover:border-accent/50 hover:bg-accent/5 anim-fade-in-up"
          style="animation-delay: 100ms"
          onclick={handleCreateRoot}
        >
          <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          create folder
        </button>
      </div>
    </div>
  {:else}
    <div class="flex items-center gap-2 border-b border-border px-4 py-2 anim-fade-in">
      {#if store.breadcrumb.length > 1}
        <button
          class="flex-shrink-0 text-text-tertiary transition-colors hover:text-text"
          onclick={() => store.selectNode(store.breadcrumb[store.breadcrumb.length - 2].id)}
          title="Go to parent folder"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      {/if}
      <Breadcrumb {store} />
      {#if store.iconPending > 0}
        <span class="text-[10px] text-text-tertiary tabular-nums anim-fade-in">{store.iconPending} pending</span>
      {/if}
      <button
        class="ml-auto inline-flex items-center gap-1 text-[10px] text-danger/60 transition-colors hover:text-danger"
        onclick={() => store.openModal({
          open: true,
          title: 'Delete folder',
          type: 'confirm',
          message: `Delete "${store.selectedNode?.title}" and everything inside it?`,
          onConfirm: () => { if (store.selectedId) store.deleteNode(store.selectedId); store.closeModal(); },
        })}
      >
        <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
        delete
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div class="border-b border-border px-4 py-3 anim-fade-in">
        <div class="mb-2 flex items-center gap-1.5">
          <svg class="h-3 w-3 text-text-tertiary" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 006.364 6.364l1.757-1.757" />
          </svg>
          <span class="text-[10px] uppercase tracking-wider text-text-tertiary">add bookmark</span>
        </div>
        <AddBookmarkForm {store} />
      </div>

      <div class="px-4 py-3 anim-fade-in" style="animation-delay: 50ms">
        <div class="mb-2 flex items-center gap-1.5">
          <svg class="h-3 w-3 text-text-tertiary" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <span class="text-[10px] uppercase tracking-wider text-text-tertiary">contents</span>
          {#if childCount > 0}
            <span class="text-[10px] text-text-tertiary tabular-nums">{childCount}</span>
          {/if}
          <div class="ml-auto flex items-center gap-1">
            {#if showSubfolderInput}
              <div class="flex items-center gap-1 anim-fade-in" transition:fade={{ duration: 100 }}>
                <!-- svelte-ignore a11y_autofocus -->
                <input
                  type="text"
                  bind:value={subfolderName}
                  onkeydown={handleSubfolderKeydown}
                  placeholder="folder name"
                  autofocus
                  class="w-28 border-b border-border bg-transparent py-0.5 text-[11px] text-text outline-none transition-colors placeholder:text-text-tertiary/40 focus:border-accent"
                />
                <button class="text-[10px] text-accent transition-colors hover:text-accent-hover" onclick={handleAddSubfolder}>add</button>
                <button class="text-[10px] text-text-tertiary transition-colors hover:text-text" onclick={() => { showSubfolderInput = false; subfolderName = ''; }}>esc</button>
              </div>
            {:else}
              <button
                class="inline-flex items-center gap-1 text-[10px] text-text-tertiary transition-colors hover:text-text"
                onclick={() => (showSubfolderInput = true)}
              >
                <svg class="h-2.5 w-2.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                folder
              </button>
            {/if}
          </div>
        </div>
        <FolderContents {store} />
      </div>

      <div class="border-t border-border px-4 py-3 anim-fade-in" style="animation-delay: 100ms">
        <button
          class="flex w-full items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-tertiary transition-colors hover:text-text-secondary"
          onclick={() => (showBulk = !showBulk)}
        >
          <span class="inline-block text-[10px] transition-transform duration-150 {showBulk ? 'rotate-90' : ''}">&#9656;</span>
          <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          bulk import
        </button>
        {#if showBulk}
          <div class="mt-3 anim-fade-in-up">
            <BulkAddForm {store} />
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
