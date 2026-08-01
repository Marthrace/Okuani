import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { postJson } from '../utils/api';

const TOKEN_KEY = 'okuani_auth_token';
const USER_KEY = 'okuani_auth_user';
const GUEST_ID_KEY = 'okuani_guest_id';

function makeGuestId() {
  return 'guest-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

/**
 * Account/guest identity for the app. Mirrors useOfflineDb's
 * hydrate-from-AsyncStorage-on-mount shape. `setLocalDb` is threaded in so a
 * successful signup/login can immediately re-tag any guest-owned records
 * in memory (the same accounts the server just reassigned via /api/auth/merge).
 */
export function useAuth(setLocalDb) {
  const [hydrated, setHydrated] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [guestId, setGuestId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser, savedGuestId] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(GUEST_ID_KEY),
        ]);
        if (savedToken) setToken(savedToken);
        if (savedUser) setUser(JSON.parse(savedUser));
        if (savedGuestId) setGuestId(savedGuestId);
      } catch (e) {
        // Start with a clean identity if the cache is unreadable.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const ensureGuestId = useCallback(() => {
    if (guestId) return guestId;
    const id = makeGuestId();
    setGuestId(id);
    AsyncStorage.setItem(GUEST_ID_KEY, id).catch(() => {});
    return id;
  }, [guestId]);

  const persistSession = useCallback(async (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, nextToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser)),
    ]);
  }, []);

  const mergeGuestData = useCallback(
    async (nextToken, nextUser, guestIdOverride) => {
      const idToMerge = guestIdOverride ?? guestId;
      if (!idToMerge) return;
      try {
        await postJson('/api/auth/merge', { guestId: idToMerge }, nextToken);
        setLocalDb?.((prev) => ({
          ...prev,
          listings: prev.listings.map((l) =>
            l.owner_id === idToMerge ? { ...l, owner_id: nextUser.id } : l
          ),
          messages: prev.messages.map((m) =>
            m.owner_id === idToMerge
              ? {
                  ...m,
                  owner_id: nextUser.id,
                  sender_id: m.sender_id === idToMerge ? nextUser.id : m.sender_id,
                  receiver_id: m.receiver_id === idToMerge ? nextUser.id : m.receiver_id,
                }
              : m
          ),
        }));
        setGuestId(null);
        await AsyncStorage.removeItem(GUEST_ID_KEY);
      } catch (e) {
        // Keep the guest id so the next login/signup can retry the merge.
      }
    },
    [guestId, setLocalDb]
  );

  const signUp = useCallback(
    async ({ name, email, phone, password }) => {
      const result = await postJson('/api/auth/signup', { name, email, phone, password });
      await persistSession(result.token, result.user);
      await mergeGuestData(result.token, result.user);
      return result.user;
    },
    [persistSession, mergeGuestData]
  );

  const login = useCallback(
    async ({ identifier, password }) => {
      const result = await postJson('/api/auth/login', { identifier, password });
      await persistSession(result.token, result.user);
      await mergeGuestData(result.token, result.user);
      return result.user;
    },
    [persistSession, mergeGuestData]
  );

  const logout = useCallback(async () => {
    if (token) {
      // Best-effort: invalidate the session row server-side so the token
      // actually stops working, not just gets forgotten locally. Still clear
      // local state even if this fails (e.g. offline) — a user must always
      // be able to log out of their own device.
      try {
        await postJson('/api/auth/logout', {}, token);
      } catch (e) {
        // ignore
      }
    }
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }, [token]);

  const verifyPassword = useCallback(
    (password) => postJson('/api/auth/verify-password', { password }, token),
    [token]
  );

  const forgotPasswordRequest = useCallback(({ identifier, channel }) => {
    return postJson('/api/auth/forgot-password/request', { identifier, channel });
  }, []);

  const verifyResetCode = useCallback(({ resetId, code }) => {
    return postJson('/api/auth/forgot-password/verify', { resetId, code });
  }, []);

  const resetPassword = useCallback(
    async ({ resetToken, newPassword }) => {
      const result = await postJson('/api/auth/reset-password', { resetToken, newPassword });
      await persistSession(result.token, result.user);
      await mergeGuestData(result.token, result.user);
      return result.user;
    },
    [persistSession, mergeGuestData]
  );

  return {
    hydrated,
    token,
    user,
    guestId,
    isGuest: !user,
    ownerId: user?.id || guestId || null,
    ensureGuestId,
    signUp,
    login,
    logout,
    verifyPassword,
    forgotPasswordRequest,
    verifyResetCode,
    resetPassword,
    mergeGuestData,
  };
}
