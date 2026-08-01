const DEFAULT_API_BASE = 'http://localhost:5000';
const DEFAULT_WEB_BASE = 'http://localhost:3000';

export function getApiBaseUrl() {
  return process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE;
}

// The browser simulator is this app's only "web" surface today, so a shared
// profile link points there. Swap EXPO_PUBLIC_WEB_BASE_URL to your machine's
// LAN IP for the link to open correctly from a physical device, same as
// EXPO_PUBLIC_API_BASE_URL already needs for the backend (see README).
export function getWebBaseUrl() {
  return process.env.EXPO_PUBLIC_WEB_BASE_URL || DEFAULT_WEB_BASE;
}

export function buildWebProfileUrl(userId) {
  const base = getWebBaseUrl().endsWith('/') ? getWebBaseUrl().slice(0, -1) : getWebBaseUrl();
  return `${base}/?profile=${encodeURIComponent(userId)}`;
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

export async function postJson(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with HTTP ${response.status}`);
  }
  return data;
}

export async function patchJson(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(buildApiUrl(path), {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with HTTP ${response.status}`);
  }
  return data;
}

export async function getJson(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(buildApiUrl(path), { headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with HTTP ${response.status}`);
  }
  return data;
}
