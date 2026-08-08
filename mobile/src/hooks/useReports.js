import { useCallback } from 'react';
import { postJson } from '../utils/api';

/**
 * Thin API wrapper for the Report endpoint (backend/routes/reports.js).
 */
export function useReports(auth) {
  const submitReport = useCallback(
    ({ reportedUsername, reason, details, contact }) =>
      postJson('/api/reports', { reportedUsername, reason, details, contact }, auth.token),
    [auth.token]
  );

  return { submitReport };
}
