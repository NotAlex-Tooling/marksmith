// Parses Netscape bookmark HTML into a tree using the browser's HTML parser.

import type { TreeNode, Folder } from './types';
import { makeFolder, makeBookmark } from './tree-utils';
import { hostOf } from './url';

export interface ParseResult {
  roots: TreeNode[];
  icons: Record<string, string>;
}

// Parses bookmark HTML into top-level nodes plus inline favicons by host.
export function parseNetscapeHTML(src: string): ParseResult {
  const html = String(src || '');
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const roots: TreeNode[] = [];
  const icons: Record<string, string> = {};
  const topList = doc.querySelector('dl');
  if (topList) walkList(topList, roots, icons);
  return { roots, icons };
}

// Returns the first direct child element matching the given tag name.
function firstChildTag(el: Element, tag: string): Element | null {
  for (const child of el.children) {
    if (child.tagName === tag) return child;
  }
  return null;
}

// Walks a DL list, appending folders and bookmarks, handling both nesting styles.
function walkList(listEl: Element, out: TreeNode[], icons: Record<string, string>): void {
  let pendingFolder: Folder | null = null;

  for (const el of Array.from(listEl.children)) {
    const tag = el.tagName;

    if (tag === 'DT') {
      const h3 = firstChildTag(el, 'H3');
      const anchor = firstChildTag(el, 'A');

      if (h3) {
        const folder = makeFolder((h3.textContent || '').trim());
        const add = parseInt(h3.getAttribute('ADD_DATE') || '', 10);
        if (add) folder.addDate = add;
        const lm = parseInt(h3.getAttribute('LAST_MODIFIED') || '', 10);
        if (lm) folder.lastModified = lm;
        if (h3.hasAttribute('PERSONAL_TOOLBAR_FOLDER')) folder.personalToolbarFolder = true;
        out.push(folder);

        const innerDl = firstChildTag(el, 'DL');
        if (innerDl) {
          walkList(innerDl, folder.children, icons);
          pendingFolder = null;
        } else {
          pendingFolder = folder;
        }
      } else if (anchor) {
        const href = anchor.getAttribute('HREF');
        if (href) {
          const text = (anchor.textContent || '').trim();
          const bm = makeBookmark(href, text || href);
          const add = parseInt(anchor.getAttribute('ADD_DATE') || '', 10);
          if (add) bm.addDate = add;
          const icon = anchor.getAttribute('ICON');
          const host = hostOf(href);
          if (host && icon && icon.startsWith('data:image/')) icons[host] = icon;
          out.push(bm);
        }
        pendingFolder = null;
      }
    } else if (tag === 'DL') {
      if (pendingFolder) {
        walkList(el, pendingFolder.children, icons);
        pendingFolder = null;
      } else {
        walkList(el, out, icons);
      }
    }
  }
}
