// Parses pasted multi-line text into bookmark candidates, detecting the URL
// token so URLs containing commas survive intact.

import { normalizeUrl, isHttpUrl } from './url';

export interface BulkLine {
  url: string;
  title: string;
}

// Strips trailing sentence punctuation that often clings to a pasted URL.
function trimPunct(s: string): string {
  return s.replace(/[),.;]+$/, '');
}

// Returns true when a token resolves to a usable http(s) URL.
function looksLikeUrl(token: string): boolean {
  const t = trimPunct(token);
  return !!t && isHttpUrl(normalizeUrl(t));
}

// Parses one line into a {url, title} candidate, or null when no URL is present.
export function parseBulkLine(line: string): BulkLine | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const tokens = trimmed.split(/\s+/);
  const urlIdx = tokens.findIndex(looksLikeUrl);

  if (urlIdx !== -1) {
    const url = normalizeUrl(trimPunct(tokens[urlIdx]));
    const title = tokens
      .filter((_, i) => i !== urlIdx)
      .join(' ')
      .replace(/^[\s,|\-–—]+|[\s,|\-–—]+$/g, '')
      .trim();
    return { url, title };
  }

  const comma = trimmed.indexOf(',');
  if (comma !== -1) {
    const left = trimmed.slice(0, comma).trim();
    const right = trimmed.slice(comma + 1).trim();
    if (isHttpUrl(normalizeUrl(left))) {
      return { url: normalizeUrl(left), title: right };
    }
  }

  return { url: normalizeUrl(trimmed), title: '' };
}

// Parses a block of text into candidates, one per non-empty line.
export function parseBulkText(text: string): BulkLine[] {
  return text
    .split('\n')
    .map(parseBulkLine)
    .filter((x): x is BulkLine => x !== null && x.url.length > 0);
}
