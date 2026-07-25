const DEFAULT_API_BASE = 'http://localhost:5000';

export function getApiBaseUrl() {
  return process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE;
}

export function buildApiUrl(path, baseUrl = getApiBaseUrl()) {
  if (!path) return baseUrl;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  if (path.startsWith('/')) {
    return `${normalizedBase}${path}`;
  }

  return `${normalizedBase}/${path}`;
}
