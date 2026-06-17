<!-- Displays the folder path breadcrumb with clickable segments for navigation. -->
<script lang="ts">
  import type { Store } from '../../stores/bookmarks.svelte';

  let { store }: { store: Store } = $props();

  // Selects the folder for a breadcrumb segment.
  function handleClick(id: string) {
    store.selectNode(id);
  }
</script>

<nav class="flex flex-wrap items-center gap-0.5 text-[12px]" aria-label="Folder path">
  {#each store.breadcrumb as segment, i (segment.id)}
    {#if i > 0}
      <span class="text-text-tertiary/50">/</span>
    {/if}
    {#if i === store.breadcrumb.length - 1}
      <span class="text-text">{segment.title}</span>
    {:else}
      <button
        class="text-text-tertiary transition-colors hover:text-text"
        onclick={() => handleClick(segment.id)}
      >{segment.title}</button>
    {/if}
  {/each}
</nav>
