// Tests for tree creation, sorting, flattening, and dedupe helpers.
import { describe, it, expect } from 'vitest';
import {
  makeRoot,
  makeFolder,
  makeBookmark,
  removeNodeById,
  isSelfOrDescendant,
  sortChildren,
  flattenFolder,
  normalizeForCompare,
  findDuplicateGroups,
  dedupeTree,
  listFolders,
  countStats,
} from './tree-utils';
import type { Folder } from './types';

// Builds a small sample tree used across the tests.
function sample(): Folder {
  const root = makeRoot('root');
  const a = makeFolder('A');
  const sub = makeFolder('Sub');
  const b1 = makeBookmark('https://b.com', 'Banana');
  const b2 = makeBookmark('https://a.com', 'Apple');
  const b3 = makeBookmark('https://c.com', 'Cherry');
  sub.children.push(makeBookmark('https://d.com', 'Deep'));
  a.children.push(b1, b2, sub);
  root.children.push(a, b3);
  return root;
}

describe('normalizeForCompare', () => {
  it('lowercases host and strips trailing slash and hash', () => {
    expect(normalizeForCompare('https://A.com/')).toBe('https://a.com');
    expect(normalizeForCompare('https://a.com#frag')).toBe('https://a.com');
  });
});

describe('sortChildren', () => {
  it('keeps folders before bookmarks and sorts by title', () => {
    const root = sample();
    const sorted = sortChildren(root.children[0].type === 'folder' ? (root.children[0] as Folder).children : [], 'title', 'asc');
    expect(sorted[0].type).toBe('folder');
    const titles = sorted.filter((c) => c.type === 'bookmark').map((c) => c.title);
    expect(titles).toEqual(['Apple', 'Banana']);
  });
  it('reverses on desc', () => {
    const items = [makeBookmark('https://a.com', 'A'), makeBookmark('https://b.com', 'B')];
    const desc = sortChildren(items, 'title', 'desc');
    expect(desc.map((i) => i.title)).toEqual(['B', 'A']);
  });
});

describe('isSelfOrDescendant', () => {
  it('detects self and nested descendants', () => {
    const root = sample();
    const a = root.children[0] as Folder;
    const sub = a.children.find((c) => c.type === 'folder')!;
    expect(isSelfOrDescendant(a, a.id)).toBe(true);
    expect(isSelfOrDescendant(a, sub.id)).toBe(true);
    expect(isSelfOrDescendant(a, 'nope')).toBe(false);
  });
});

describe('removeNodeById', () => {
  it('removes a nested node and reports its parent', () => {
    const root = sample();
    const a = root.children[0] as Folder;
    const target = a.children[0];
    const result = removeNodeById([root], target.id);
    expect(result?.node.id).toBe(target.id);
    expect(result?.parent?.id).toBe(a.id);
    expect(a.children.find((c) => c.id === target.id)).toBeUndefined();
  });
});

describe('flattenFolder', () => {
  it('collapses nested bookmarks into one flat list', () => {
    const root = sample();
    const a = root.children[0] as Folder;
    const count = flattenFolder(a);
    expect(count).toBe(3);
    expect(a.children.every((c) => c.type === 'bookmark')).toBe(true);
  });
});

describe('duplicates', () => {
  it('finds and removes duplicate hrefs', () => {
    const root = makeRoot('root');
    root.children.push(
      makeBookmark('https://dup.com', 'one'),
      makeBookmark('https://dup.com/', 'two'),
      makeBookmark('https://unique.com', 'three'),
    );
    const groups = findDuplicateGroups([root]);
    expect(groups).toHaveLength(1);
    expect(groups[0].nodes).toHaveLength(2);

    const removed = dedupeTree([root]);
    expect(removed).toBe(1);
    expect(countStats([root]).bookmarks).toBe(2);
  });
});

describe('listFolders', () => {
  it('lists folders with depth', () => {
    const root = sample();
    const folders = listFolders([root]);
    expect(folders.map((f) => f.title)).toEqual(['root', 'A', 'Sub']);
    expect(folders.find((f) => f.title === 'Sub')?.depth).toBe(2);
  });
});

describe('countStats', () => {
  it('counts folders and bookmarks', () => {
    const stats = countStats([sample()]);
    expect(stats.folders).toBe(3);
    expect(stats.bookmarks).toBe(4);
  });
});
