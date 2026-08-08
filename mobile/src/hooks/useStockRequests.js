import { useCallback } from 'react';
import { getJson, patchJson, postJson } from '../utils/api';

/**
 * Thin API wrapper for the buyer demand board (backend/routes/stockRequests.js).
 * Stateless, same shape as useProfile — screens own whatever list they're
 * currently displaying (the public board vs. "my requests") rather than this
 * hook caching a single canonical list.
 */
export function useStockRequests(auth) {
  const listBoard = useCallback((filters = {}) => {
    const params = new URLSearchParams();
    if (filters.crop) params.set('crop', filters.crop);
    if (filters.region) params.set('region', filters.region);
    const qs = params.toString();
    return getJson(`/api/stock-requests${qs ? `?${qs}` : ''}`);
  }, []);

  const listMine = useCallback(() => getJson('/api/stock-requests/mine', auth.token), [auth.token]);

  const createRequest = useCallback(
    (fields) => postJson('/api/stock-requests', fields, auth.token),
    [auth.token]
  );

  const updateRequest = useCallback(
    (id, fields) => patchJson(`/api/stock-requests/${id}`, fields, auth.token),
    [auth.token]
  );

  const closeRequest = useCallback((id) => postJson(`/api/stock-requests/${id}/close`, {}, auth.token), [auth.token]);
  const fulfillRequest = useCallback((id) => postJson(`/api/stock-requests/${id}/fulfill`, {}, auth.token), [auth.token]);

  const respondToRequest = useCallback(
    (id) => postJson(`/api/stock-requests/${id}/respond`, {}, auth.token),
    [auth.token]
  );

  const getResponses = useCallback(
    (id) => getJson(`/api/stock-requests/${id}/responses`, auth.token),
    [auth.token]
  );

  return {
    listBoard,
    listMine,
    createRequest,
    updateRequest,
    closeRequest,
    fulfillRequest,
    respondToRequest,
    getResponses,
  };
}
