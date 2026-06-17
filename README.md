<div align="center">

<img src="public/logo.png" alt="Marksmith logo" width="120" height="120" />

# Marksmith

A client-side bookmark manager for building, organizing, and exporting browser bookmarks.

</div>

## Overview

Marksmith turns a messy pile of bookmarks into a tidy, drag-and-drop tree. Everything runs in your browser (nothing is sent to a server) and you can import and export the standard Netscape HTML format that Chrome, Firefox, Safari, and Edge all understand.

## Features

- Nested folders and bookmarks with inline title/URL editing
- Click a bookmark to open it in a new tab
- Automatic saving to `localStorage`, restored on reload
- Drag to reorder, plus an accessible "move to…" folder picker
- Multi-select to move or delete many items at once
- Duplicate detection and one-click dedupe
- Dead-link checking for reachability
- Sort a folder by name, URL, or date, and flatten nested folders
- Bulk add (`url`, `url, title`, `url<tab>title`, or `title url`)
- Favicon fetching, cached once per domain
- Import/export Netscape HTML, plus a lossless JSON backup that keeps icons
- Global search by title and URL
- Light and dark themes, remembered between visits
- Undo/redo with up to 50 steps
- Installable PWA that loads offline

## How to Use

Marksmith opens to a folder tree on the left and an editor on the right. Select a folder to view its contents, then add bookmarks one at a time or in bulk, create subfolders, drag to reorder, and export the result as an HTML file any browser can import.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `Ctrl + F` | Focus search |
| `/` | Focus search (when not typing) |
| `Escape` | Close modal or clear search |

On macOS, use `Cmd` instead of `Ctrl`.

## Notes

- All data lives in the browser; use the JSON export for a portable backup.
- The tree and icons are stored under separate keys, so an icon-storage hiccup never costs you your bookmarks.
- Dead-link checking runs from the browser, so for cross-origin links it can only reliably detect hard network failures. A live page that returns a 404 may still look reachable, so treat results as a hint.
- Dragging between folders in the tree works, but the "move to…" picker is the most reliable and keyboard-accessible way to move items.
