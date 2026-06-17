<!-- Top header bar with stats, search, history, view controls, tools, theme, and reset. -->
<script lang="ts">
  import SearchBar from '../ui/SearchBar.svelte';
  import type { Store } from '../../stores/bookmarks.svelte';

  let { store }: { store: Store } = $props();
</script>

<header class="flex h-10 shrink-0 items-center gap-2.5 border-b border-border bg-surface px-3 anim-fade-in-down">
  <img src="/logo-28.png" alt="Marksmith" class="h-5 w-5" />
  <h1 class="text-xs font-bold tracking-tight whitespace-nowrap text-text">marksmith</h1>

  <span class="text-text-tertiary">/</span>

  <div class="hidden items-center gap-2 text-[11px] sm:flex">
    <span class="text-text-tertiary"><span class="text-text-secondary tabular-nums">{store.stats.folders}</span> dirs</span>
    <span class="text-text-tertiary"><span class="text-text-secondary tabular-nums">{store.stats.bookmarks}</span> links</span>
  </div>

  <div class="ml-auto max-w-xs flex-1">
    <SearchBar {store} />
  </div>

  <nav class="flex items-center gap-px">
    <button
      class="px-2 py-1 text-[11px] text-text-tertiary transition-colors hover:text-text disabled:opacity-25"
      onclick={() => store.undo()}
      disabled={!store.canUndo}
      title="Undo (Ctrl+Z)"
    >undo</button>
    <button
      class="px-2 py-1 text-[11px] text-text-tertiary transition-colors hover:text-text disabled:opacity-25"
      onclick={() => store.redo()}
      disabled={!store.canRedo}
      title="Redo (Ctrl+Shift+Z)"
    >redo</button>
    <span class="mx-1 text-border">|</span>
    <button
      class="hidden px-2 py-1 text-[11px] text-text-tertiary transition-colors hover:text-text sm:block"
      onclick={() => store.expandAll()}
      title="Expand all folders"
    >expand</button>
    <button
      class="hidden px-2 py-1 text-[11px] text-text-tertiary transition-colors hover:text-text sm:block"
      onclick={() => store.collapseAll()}
      title="Collapse all folders"
    >collapse</button>
    <button
      class="hidden px-2 py-1 text-[11px] transition-colors sm:block {store.showTreeBookmarks ? 'text-accent hover:text-accent-hover' : 'text-text-tertiary hover:text-text'}"
      onclick={() => store.toggleTreeBookmarks()}
      title="Show or hide bookmarks in the sidebar tree"
    >links</button>
    <span class="mx-1 hidden text-border sm:inline">|</span>
    <button
      class="hidden px-2 py-1 text-[11px] text-text-tertiary transition-colors hover:text-text md:block"
      onclick={() => store.openDuplicates()}
      title="Find duplicate bookmarks"
    >dups</button>
    <button
      class="hidden px-2 py-1 text-[11px] text-text-tertiary transition-colors hover:text-text md:block"
      onclick={() => store.runLinkCheck('all')}
      title="Check all links for reachability"
    >check</button>
    <span class="mx-1 text-border">|</span>
    <button
      class="px-2 py-1 text-[11px] text-text-tertiary transition-colors hover:text-text"
      onclick={() => store.toggleTheme()}
      title="Toggle light/dark theme"
      aria-label="Toggle theme"
    >{store.theme === 'dark' ? 'light' : 'dark'}</button>
    <span class="mx-1 text-border">|</span>
    <button
      class="px-2 py-1 text-[11px] text-danger/70 transition-colors hover:text-danger"
      onclick={() => store.openModal({ open: true, title: 'Reset everything', type: 'confirm', message: 'Clear all bookmarks and start fresh? This cannot be undone.', onConfirm: () => { store.reset(); store.closeModal(); } })}
    >reset</button>
  </nav>
</header>
