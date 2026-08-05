import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildApiUrl, postJson } from './api';

describe('buildApiUrl', () => {
  it('returns the provided base URL when the path is already absolute', () => {
    expect(buildApiUrl('http://example.com/api/health', 'http://localhost:5000')).toBe('http://example.com/api/health');
  });

  it('joins a relative path to the configured API base URL', () => {
    expect(buildApiUrl('/api/prices', 'http://localhost:5000')).toBe('http://localhost:5000/api/prices');
  });

  it('normalizes a trailing slash in the base URL', () => {
    expect(buildApiUrl('health', 'http://localhost:5000/')).toBe('http://localhost:5000/health');
  });
});

describe('postJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves with the parsed JSON body on a successful response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'abc', user: { id: 'user-1' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await postJson('/api/auth/login', { identifier: 'a@b.com', password: 'pw' });

    expect(result).toEqual({ token: 'abc', user: { id: 'user-1' } });
    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('adds a Bearer Authorization header when a token is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await postJson('/api/auth/merge', { guestId: 'guest-1' }, 'tok-123');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer tok-123');
  });

  it('throws the parsed error message when the response is not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid credentials' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(postJson('/api/auth/login', {})).rejects.toThrow('Invalid credentials');
  });

  it('falls back to a generic message when the error body cannot be parsed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(postJson('/api/auth/login', {})).rejects.toThrow('Request failed with HTTP 500');
  });
});
