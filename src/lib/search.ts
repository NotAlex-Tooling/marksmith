// Searches the bookmark tree by title and URL, case-insensitively.

import type { Folder, TreeNode } from './types';

export interface SearchResult {
  node: TreeNode;
  path: string[];
}

// Returns every node whose title or URL contains the query string.
export function searchTree(roots: Folder[], query: string): SearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  // Recursively matches a folder's children against the query.
  function walk(folder: Folder, path: string[]) {
    for (const child of folder.children) {
      const childPath = [...path, folder.title];
      if (child.type === 'bookmark') {
        if (child.title.toLowerCase().includes(q) || child.href.toLowerCase().includes(q)) {
          results.push({ node: child, path: childPath });
        }
      } else {
        if (child.title.toLowerCase().includes(q)) {
          results.push({ node: child, path: childPath });
        }
        walk(child, childPath);
      }
    }
  }

  for (const root of roots) {
    if (root.title.toLowerCase().includes(q)) {
      results.push({ node: root, path: [] });
    }
    walk(root, []);
  }

  return results;
}
