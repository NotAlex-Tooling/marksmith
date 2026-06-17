<!-- Form for adding a single bookmark with URL, title, and optional favicon fetch. -->
<script lang="ts">
  import type { Store } from '../../stores/bookmarks.svelte';

  let { store }: { store: Store } = $props();
  let url = $state('');
  let title = $state('');
  let fetchIcon = $state(true);

  // Validates and adds the bookmark to the selected folder.
  function handleAdd() {
    if (!url.trim()) {
      store.addToast('Enter a URL to add', 'error');
      return;
    }
    if (!store.selectedId) return;
    store.addBookmark(store.selectedId, url.trim(), title.trim(), fetchIcon);
    url = '';
    title = '';
  }

  // Submits the form on Enter.
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleAdd();
  }
</script>

<div class="space-y-2">
  <div class="flex items-center gap-2">
    <input
      id="bm-url"
      type="text"
      bind:value={url}
      onkeydown={handleKeydown}
      placeholder="url or path..."
      class="flex-1 border-b border-border bg-transparent py-1 text-[12px] text-text outline-none transition-colors placeholder:text-text-tertiary/40 focus:border-accent"
    />
  </div>

  <div class="flex items-center gap-2">
    <input
      id="bm-title"
      type="text"
      bind:value={title}
      onkeydown={handleKeydown}
      placeholder="title (optional)"
      class="flex-1 border-b border-border bg-transparent py-1 text-[12px] text-text outline-none transition-colors placeholder:text-text-tertiary/40 focus:border-accent"
    />
  </div>

  <div class="flex items-center gap-3">
    <label class="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-text-tertiary">
      <input type="checkbox" bind:checked={fetchIcon} class="h-3 w-3 accent-accent" />
      fetch favicon
    </label>
    <button
      class="inline-flex items-center gap-1 text-[11px] text-accent transition-colors hover:text-accent-hover"
      onclick={handleAdd}
    >
      <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      add
    </button>
  </div>
</div>
