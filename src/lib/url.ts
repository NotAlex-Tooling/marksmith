// URL parsing and normalization helpers shared across the app.

// Returns the hostname for a URL, or an empty string when it cannot be parsed.
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// Returns true when the string is a valid http or https URL.
export function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Adds an https:// scheme to bare hosts and leaves other input unchanged.
export function normalizeUrl(input: string): string {
  const s = input.trim();
  if (!s) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
  if (/^\/\//.test(s)) return 'https:' + s;
  if (!/\s/.test(s) && (/\./.test(s) || /^localhost([:/]|$)/i.test(s))) {
    return 'https://' + s;
  }
  return s;
}
