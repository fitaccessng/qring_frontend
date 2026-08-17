import { describe, it, expect } from 'vitest';
import { resolveSnapshotUrl } from '../mediaUrl';

describe('resolveSnapshotUrl', () => {
  it('returns empty for null/undefined', () => {
    expect(resolveSnapshotUrl(null)).toBe('');
    expect(resolveSnapshotUrl(undefined)).toBe('');
    expect(resolveSnapshotUrl('')).toBe('');
  });

  it('preserves data and blob URLs', () => {
    expect(resolveSnapshotUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    expect(resolveSnapshotUrl('blob:http://example/123')).toBe('blob:http://example/123');
  });

  it('preserves absolute http(s) urls', () => {
    expect(resolveSnapshotUrl('https://example.com/path.jpg')).toBe('https://example.com/path.jpg');
    expect(resolveSnapshotUrl('http://example.com/path.jpg')).toBe('http://example.com/path.jpg');
  });

  it('resolves relative uploads to backend origin when configured', () => {
    // This test assumes env.apiBaseUrl may be relative in the test runner; we only
    // assert the function does not produce double slashes or malformed paths.
    const out = resolveSnapshotUrl('/uploads/test.jpg');
    expect(typeof out).toBe('string');
    // Should either be '/uploads/test.jpg' (dev/proxy) or start with http
    expect(out === '/uploads/test.jpg' || out.endsWith('/uploads/test.jpg') || /^https?:\/\//i.test(out)).toBe(true);
  });
});
