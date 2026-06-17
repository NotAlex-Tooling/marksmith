// Tests for URL normalization and validation helpers.
import { describe, it, expect } from 'vitest';
import { normalizeUrl, hostOf, isHttpUrl } from './url';

describe('normalizeUrl', () => {
  it('adds https:// to bare domains', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl('sub.example.co.uk/path')).toBe('https://sub.example.co.uk/path');
  });
  it('leaves URLs that already have a scheme', () => {
    expect(normalizeUrl('https://x.com')).toBe('https://x.com');
    expect(normalizeUrl('http://x.com')).toBe('http://x.com');
    expect(normalizeUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
  });
  it('upgrades protocol-relative URLs', () => {
    expect(normalizeUrl('//x.com')).toBe('https://x.com');
  });
  it('handles localhost', () => {
    expect(normalizeUrl('localhost:3000')).toBe('https://localhost:3000');
  });
  it('leaves non-URL text untouched', () => {
    expect(normalizeUrl('just some words')).toBe('just some words');
  });
});

describe('hostOf', () => {
  it('returns the hostname', () => {
    expect(hostOf('https://a.b.com/x?y=1')).toBe('a.b.com');
  });
  it('returns empty string for invalid input', () => {
    expect(hostOf('not a url')).toBe('');
  });
});

describe('isHttpUrl', () => {
  it('accepts http and https', () => {
    expect(isHttpUrl('https://x.com')).toBe(true);
    expect(isHttpUrl('http://x.com')).toBe(true);
  });
  it('rejects other schemes and bare hosts', () => {
    expect(isHttpUrl('ftp://x.com')).toBe(false);
    expect(isHttpUrl('example.com')).toBe(false);
  });
});
