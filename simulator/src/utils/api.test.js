import { describe, it, expect } from 'vitest';
import { buildApiUrl } from './api';

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
