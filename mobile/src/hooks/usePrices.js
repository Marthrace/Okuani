import { useCallback } from 'react';
import { getJson } from '../utils/api';

/**
 * Thin API wrapper for the market price endpoints (backend/server.js
 * GET /api/prices/summary, GET /api/prices/history). Mirrors useProfile.js
 * and simulator/src/hooks/useMarketPrices.js.
 */
export function usePrices() {
  const getSummary = useCallback(() => getJson('/api/prices/summary'), []);

  const getHistory = useCallback(({ crop, marketName, period }) => {
    const params = new URLSearchParams({ crop, period });
    if (marketName) params.set('market_name', marketName);
    return getJson(`/api/prices/history?${params.toString()}`);
  }, []);

  return { getSummary, getHistory };
}
