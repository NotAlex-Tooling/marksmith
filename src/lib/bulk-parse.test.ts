// Tests for parsing pasted text into bookmark candidates.
import { describe, it, expect } from 'vitest';
import { parseBulkLine, parseBulkText } from './bulk-parse';

describe('parseBulkLine', () => {
  it('parses a bare URL', () => {
    expect(parseBulkLine('https://example.com')).toEqual({ url: 'https://example.com', title: '' });
  });
  it('adds a scheme to a bare host', () => {
    expect(parseBulkLine('example.com')).toEqual({ url: 'https://example.com', title: '' });
  });
  it('parses "url title" separated by spaces', () => {
    expect(parseBulkLine('https://example.com My Site')).toEqual({
      url: 'https://example.com',
      title: 'My Site',
    });
  });
  it('parses "url, title"', () => {
    expect(parseBulkLine('https://example.com, My Site')).toEqual({
      url: 'https://example.com',
      title: 'My Site',
    });
  });
  it('parses "host,title" with no space', () => {
    expect(parseBulkLine('example.com,My Site')).toEqual({
      url: 'https://example.com',
      title: 'My Site',
    });
  });
  it('parses "title<tab>url"', () => {
    expect(parseBulkLine('Wikipedia\thttps://wiki.org')).toEqual({
      url: 'https://wiki.org',
      title: 'Wikipedia',
    });
  });
  it('keeps commas inside a URL when a space separates the title', () => {
    expect(parseBulkLine('https://x.com/?a=1,2 Title')).toEqual({
      url: 'https://x.com/?a=1,2',
      title: 'Title',
    });
  });
  it('returns null for empty lines', () => {
    expect(parseBulkLine('   ')).toBeNull();
  });
});

describe('parseBulkText', () => {
  it('parses multiple lines and skips blanks', () => {
    const out = parseBulkText('https://a.com\n\nb.com, B\n');
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual({ url: 'https://b.com', title: 'B' });
  });
});
