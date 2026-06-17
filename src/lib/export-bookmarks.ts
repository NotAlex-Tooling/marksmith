// Exports the bookmark tree to Netscape bookmark HTML format.

import type { Folder } from './types';
import { hostOf } from './url';

// Escapes a string for safe inclusion in HTML attributes and content.
function esc(s: string | null | undefined): string {
  s = s == null ? '' : '' + s;
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Generates a Netscape bookmark HTML file, resolving icons via getIcon.
export function exportNetscapeHTML(
  roots: Folder[],
  getIcon: (host: string) => string | null = () => null,
): string {
  const head = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;
  const ctx = { toolbarUsed: false };
  const body = roots.map((r) => renderExportFolder(r, getIcon, ctx)).join('');
  const tail = `</DL><p>`;
  return head + body + tail;
}

// Recursively renders a folder and its children as Netscape bookmark HTML.
function renderExportFolder(
  folder: Folder,
  getIcon: (host: string) => string | null,
  ctx: { toolbarUsed: boolean },
): string {
  const isToolbar = !!folder.personalToolbarFolder && !ctx.toolbarUsed;
  if (isToolbar) ctx.toolbarUsed = true;

  const attrs = [
    `ADD_DATE="${folder.addDate}"`,
    `LAST_MODIFIED="${folder.lastModified || folder.addDate}"`,
    isToolbar ? 'PERSONAL_TOOLBAR_FOLDER="true"' : '',
  ]
    .filter(Boolean)
    .join(' ');

  let html = `    <DT><H3 ${attrs}>${esc(folder.title)}</H3>\n    <DL><p>\n`;
  for (const ch of folder.children) {
    if (ch.type === 'folder') {
      html += renderExportFolder(ch, getIcon, ctx);
    } else {
      const attrsA = [`HREF="${esc(ch.href)}"`, `ADD_DATE="${ch.addDate}"`];
      const icon = getIcon(hostOf(ch.href));
      if (icon) attrsA.push(`ICON="${icon}"`);
      html += `        <DT><A ${attrsA.join(' ')}>${esc(ch.title || ch.href)}</A>\n`;
    }
  }
  html += `    </DL><p>\n`;
  return html;
}
