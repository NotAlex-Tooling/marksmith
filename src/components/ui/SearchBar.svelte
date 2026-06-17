<!-- Search input with a debounced, keyboard-navigable listbox of results. -->
<script lang="ts">
  import { slide } from 'svelte/transition';
  import { debounce } from '../../lib/persist';
  import type { Store } from '../../stores/bookmarks.svelte';

  let { store }: { store: Store } = $props();

  let inputValue = $state(store.searchQuery);
  let showResults = $state(false);
  let selectedIndex = $state(-1);

  // Debounced setter for the search query.
  const pushQuery = debounce((q: string) => store.setSearchQuery(q), 120);

  // Updates the query and result visibility as the user types.
  function handleInput(e: Event) {
    inputValue = (e.target as HTMLInputElement).value;
    pushQuery(inputValue);
    showResults = inputValue.length > 0;
    selectedIndex = -1;
  }

  // Handles arrow, Enter, and Escape navigation.
  function handleKeydown(e: KeyboardEvent) {
    if (!showResults || store.searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, store.searchResults.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(selectedIndex);
    } else if (e.key === 'Escape') {
      showResults = false;
      inputValue = '';
      store.setSearchQuery('');
    }
  }

  // Reveals the chosen result and closes the dropdown.
  function handleSelect(index: number) {
    const result = store.searchResults[index];
    if (!result) return;
    store.revealNode(result.node.id);
    showResults = false;
    inputValue = '';
    store.setSearchQuery('');
  }

  // Hides results shortly after losing focus.
  function handleBlur() {
    setTimeout(() => (showResults = false), 200);
  }
</script>

<div class="relative w-full">
  <div class="relative">
    <span class="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[10px] text-text-tertiary">/</span>
    <input
      id="search-input"
      type="text"
      role="combobox"
      aria-expanded={showResults && store.searchResults.length > 0}
      aria-controls="search-results"
      aria-autocomplete="list"
      aria-activedescendant={selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined}
      value={inputValue}
      oninput={handleInput}
      onkeydown={handleKeydown}
      onblur={handleBlur}
      onfocus={() => { if (inputValue) showResults = true; }}
      placeholder="search (ctrl+f)"
      class="w-full border border-border bg-transparent py-1 pr-2 pl-6 text-[11px] text-text outline-none transition-colors placeholder:text-text-tertiary/40 focus:border-accent"
    />
  </div>

  {#if showResults && store.searchResults.length > 0}
    <ul
      id="search-results"
      role="listbox"
      aria-label="Search results"
      class="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 list-none overflow-auto border border-border bg-surface p-0 shadow-xl"
      transition:slide={{ duration: 120 }}
    >
      {#each store.searchResults.slice(0, 20) as result, i (result.node.id)}
        <li role="presentation">
          <button
            id="search-result-{i}"
            role="option"
            aria-selected={i === selectedIndex}
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] transition-colors
              {i === selectedIndex ? 'bg-surface-2 text-text' : 'text-text-secondary hover:bg-surface-2'}"
            onmousedown={(e) => { e.preventDefault(); handleSelect(i); }}
          >
            <span class="flex-shrink-0 {result.node.type === 'folder' ? 'text-accent' : 'text-text-tertiary'}">
              {#if result.node.type === 'folder'}
                <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              {:else}
                <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 006.364 6.364l1.757-1.757" />
                </svg>
              {/if}
            </span>
            <div class="min-w-0 flex-1">
              <div class="truncate text-text">{result.node.title}</div>
              {#if result.path.length > 0}
                <div class="truncate text-[10px] text-text-tertiary">{result.path.join(' / ')}</div>
              {/if}
            </div>
            <span class="text-[10px] text-text-tertiary">
              {result.node.type === 'folder' ? 'dir' : 'link'}
            </span>
          </button>
        </li>
      {/each}
      {#if store.searchResults.length > 20}
        <li class="border-t border-border px-3 py-1.5 text-[10px] text-text-tertiary">
          +{store.searchResults.length - 20} more
        </li>
      {/if}
    </ul>
  {:else if showResults && inputValue.length > 0}
    <div class="absolute top-full right-0 left-0 z-50 mt-1 border border-border bg-surface px-3 py-2 text-center text-[11px] text-text-tertiary shadow-xl" transition:slide={{ duration: 120 }}>
      no results
    </div>
  {/if}
</div>
