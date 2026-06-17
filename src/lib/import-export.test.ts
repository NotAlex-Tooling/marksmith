// Tests for Netscape HTML import and export round-tripping.
import { describe, it, expect } from 'vitest';
import { parseNetscapeHTML } from './import-bookmarks';
import { exportNetscapeHTML } from './export-bookmarks';
import { countStats } from './tree-utils';
import type { Folder } from './types';

const ICON = 'data:image/png;base64,AAAA';

const SAMPLE = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><H3>Reading</H3>
  <DL><p>
    <DT><A HREF="https://example.com" ICON="${ICON}">Example</A>
    <DT><A HREF="https://test.org">Test Org</A>
  </DL><p>
</DL><p>`;

describe('parseNetscapeHTML', () => {
  it('parses folders, bookmarks and inline icons', () => {
    const { roots, icons } = parseNetscapeHTML(SAMPLE);
    expect(roots).toHaveLength(1);
    const folder = roots[0] as Folder;
    expect(folder.title).toBe('Reading');
    expect(folder.children.map((c) => c.title)).toEqual(['Example', 'Test Org']);
    expect(folder.children[0]).toMatchObject({ type: 'bookmark', href: 'https://example.com' });
    expect(icons['example.com']).toBe(ICON);
    expect('iconData' in folder.children[0]).toBe(false);
  });
});

describe('exportNetscapeHTML', () => {
  it('emits titles, hrefs and resolved icons', () => {
    const { roots, icons } = parseNetscapeHTML(SAMPLE);
    const html = exportNetscapeHTML(roots as Folder[], (host) => icons[host] ?? null);
    expect(html).toContain('<H3>Reading</H3>');
    expect(html).toContain('HREF="https://example.com"');
    expect(html).toContain('Example');
    expect(html).toContain(`ICON="${ICON}"`);
  });

  it('round-trips without losing bookmarks', () => {
    const first = parseNetscapeHTML(SAMPLE);
    const html = exportNetscapeHTML(first.roots as Folder[], (host) => first.icons[host] ?? null);
    const second = parseNetscapeHTML(html);
    expect(countStats(second.roots as Folder[])).toEqual(countStats(first.roots as Folder[]));
    expect(second.icons['example.com']).toBe(ICON);
  });
});
