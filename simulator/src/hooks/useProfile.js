import { useCallback } from 'react';
import { getJson, patchJson, postJson } from '../utils/api';

/**
 * Thin API wrapper for the profile endpoints (backend/routes/profiles.js).
 * Mirrors mobile/src/hooks/useProfile.js. Stateless — ProfileScreen/
 * PublicProfilePage own whatever profile they're currently displaying.
 */
export function useProfile(auth) {
  const getProfile = useCallback((userId) => getJson(`/api/profiles/${userId}`), []);
  const getReviews = useCallback((userId) => getJson(`/api/profiles/${userId}/reviews`), []);

  const updateProfile = useCallback(
    (fields) => patchJson('/api/profiles/me', fields, auth?.token),
    [auth?.token]
  );

  const uploadPhoto = useCallback(
    (slot, imageBase64) => postJson('/api/profiles/me/photo', { slot, imageBase64 }, auth?.token),
    [auth?.token]
  );

  const requestPhoneVerification = useCallback(
    () => postJson('/api/profiles/me/verify-phone/request', {}, auth?.token),
    [auth?.token]
  );

  const confirmPhoneVerification = useCallback(
    (verificationId, code) => postJson('/api/profiles/me/verify-phone/confirm', { verificationId, code }, auth?.token),
    [auth?.token]
  );

  const verifyId = useCallback(() => postJson('/api/profiles/me/verify-id', {}, auth?.token), [auth?.token]);

  const submitReview = useCallback(
    (userId, { rating, comment }) => postJson(`/api/profiles/${userId}/reviews`, { rating, comment }, auth?.token),
    [auth?.token]
  );

  const getContacts = useCallback(() => getJson('/api/profiles/me/contacts', auth?.token), [auth?.token]);

  return {
    getProfile,
    getReviews,
    updateProfile,
    uploadPhoto,
    requestPhoneVerification,
    confirmPhoneVerification,
    verifyId,
    submitReview,
    getContacts,
  };
}
