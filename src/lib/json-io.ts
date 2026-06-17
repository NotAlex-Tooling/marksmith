// Lossless JSON export and import of folders, bookmarks, and the icon cache.

import type { Folder, TreeNode } from './types';
import { STATE_VERSION } from './persist';

export interface MarksmithFile {
  app: 'marksmith';
  version: number;
  exportedAt: string;
  roots: Folder[];
  icons: Record<string, string>;
}

// Serializes the tree and icon cache to a formatted JSON string.
export function exportJSON(roots: Folder[], icons: Record<string, string>): string {
  const file: MarksmithFile = {
    app: 'marksmith',
    version: STATE_VERSION,
    exportedAt: new Date().toISOString(),
    roots,
    icons,
  };
  return JSON.stringify(file, null, 2);
}

// Parses a Marksmith JSON export, throwing a descriptive error on bad input.
export function parseJSON(text: string): { roots: TreeNode[]; icons: Record<string, string> } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Not valid JSON');
  }
  const file = data as Partial<MarksmithFile>;
  if (!file || file.app !== 'marksmith' || !Array.isArray(file.roots)) {
    throw new Error('Not a Marksmith JSON export');
  }
  return {
    roots: file.roots as TreeNode[],
    icons: file.icons && typeof file.icons === 'object' ? file.icons : {},
  };
}
