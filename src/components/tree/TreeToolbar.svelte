<!-- Toolbar buttons for creating root folders and importing/exporting bookmarks. -->
<script lang="ts">
  import { parseNetscapeHTML } from '../../lib/import-bookmarks';
  import { exportNetscapeHTML } from '../../lib/export-bookmarks';
  import { exportJSON, parseJSON } from '../../lib/json-io';
  import type { Store } from '../../stores/bookmarks.svelte';

  let { store }: { store: Store } = $props();

  let fileInput: HTMLInputElement;

  // Opens the file picker.
  function handleImport() {
    fileInput.click();
  }

  // Triggers a download of the given contents.
  function download(contents: string, ext: string, mime: string) {
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fname = `bookmarks_${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())}_${pad(ts.getHours())}-${pad(ts.getMinutes())}.${ext}`;
    const blob = new Blob([contents], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  // Detects HTML or JSON and routes the import.
  async function onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    input.value = '';

    const looksJSON = file.name.toLowerCase().endsWith('.json') || text.trimStart().startsWith('{');
    if (looksJSON) {
      try {
        const parsed = parseJSON(text);
        store.importFromJSON(parsed);
      } catch (err) {
        store.addToast(err instanceof Error ? err.message : 'Could not read JSON file', 'error');
      }
      return;
    }

    if (text.includes('<title>Marksmith</title>')) {
      store.addToast('That looks like the app page, not an exported bookmarks file', 'error');
      return;
    }

    const { roots: importedRoots, icons } = parseNetscapeHTML(text);
    if (!importedRoots.length) {
      store.addToast('No bookmarks found in file', 'error');
      return;
    }

    store.openModal({
      open: true,
      title: 'Import bookmarks',
      type: 'importChoice',
      importedData: importedRoots,
      importedIcons: icons,
    });
  }

  // Exports the tree as Netscape HTML.
  function handleExportHTML() {
    download(exportNetscapeHTML(store.roots, store.getIconForHost), 'html', 'text/html');
    store.addToast('Exported HTML bookmarks file', 'success');
  }

  // Exports the tree and icons as JSON.
  function handleExportJSON() {
    download(exportJSON(store.roots, store.snapshotIcons()), 'json', 'application/json');
    store.addToast('Exported JSON backup', 'success');
  }

  // Opens the new root folder dialog.
  function handleNewRoot() {
    store.openModal({ open: true, title: 'New root folder', type: 'newRoot' });
  }
</script>

<div class="flex items-center gap-px">
  <button
    class="inline-flex items-center gap-0.5 px-2 py-1 text-[10px] text-text-tertiary transition-colors hover:text-text"
    onclick={handleNewRoot}
    title="Create new root folder"
  >
    <svg class="h-2.5 w-2.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
    new
  </button>
  <button
    class="inline-flex items-center gap-0.5 px-2 py-1 text-[10px] text-text-tertiary transition-colors hover:text-text"
    onclick={handleImport}
    title="Import bookmarks from an HTML or JSON file"
  >
    <svg class="h-2.5 w-2.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
    import
  </button>
  <input
    bind:this={fileInput}
    type="file"
    accept="text/html,.html,.htm,application/json,.json"
    class="hidden"
    onchange={onFileSelected}
  />
  <button
    class="inline-flex items-center gap-0.5 px-2 py-1 text-[10px] text-accent transition-colors hover:text-accent-hover"
    onclick={handleExportHTML}
    title="Export bookmarks as an HTML file"
  >
    <svg class="h-2.5 w-2.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 7.5l4.5-4.5m0 0l4.5 4.5M12 3v13.5" />
    </svg>
    export
  </button>
  <button
    class="inline-flex items-center gap-0.5 px-2 py-1 text-[10px] text-text-tertiary transition-colors hover:text-text"
    onclick={handleExportJSON}
    title="Export a lossless JSON backup (includes icons)"
  >
    json
  </button>
</div>
