import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../utils/api';

const LOCAL_DB_KEY = 'okuani_local_db';
const LAST_SYNC_KEY = 'okuani_last_sync';
const EMPTY_DB = { listings: [], messages: [], prices: [] };

/**
 * On-device offline-first data store. Mirrors the sync/conflict-resolution
 * behaviour of the browser simulator (simulator/src/App.jsx), but persists
 * to AsyncStorage instead of localStorage as the on-device cache, and syncs
 * against the same backend /api/sync endpoint.
 */
export function useOfflineDb(networkStatus, ownerId) {
  const [localDb, setLocalDb] = useState(EMPTY_DB);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [serverDbState, setServerDbState] = useState(EMPTY_DB);
  const [serverOnline, setServerOnline] = useState(false);

  const addLog = useCallback((message, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setSyncLogs((prev) => [{ time, text: message, type }, ...prev].slice(0, 100));
  }, []);

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedDb, savedSync] = await Promise.all([
          AsyncStorage.getItem(LOCAL_DB_KEY),
          AsyncStorage.getItem(LAST_SYNC_KEY),
        ]);
        if (savedDb) setLocalDb(JSON.parse(savedDb));
        if (savedSync) setLastSyncTime(parseInt(savedSync, 10) || 0);
      } catch (e) {
        addLog('Failed to read local offline cache, starting empty.', 'error');
      } finally {
        setHydrated(true);
      }
    })();
  }, [addLog]);

  // Persist localDb / lastSyncTime whenever they change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(LOCAL_DB_KEY, JSON.stringify(localDb)).catch(() => {});
  }, [localDb, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(LAST_SYNC_KEY, String(lastSyncTime)).catch(() => {});
  }, [lastSyncTime, hydrated]);

  const fetchServerDb = useCallback(async () => {
    if (networkStatus === 'offline') {
      setServerOnline(false);
      return;
    }
    try {
      const res = await fetch(buildApiUrl('/api/db-state'));
      if (res.ok) {
        setServerDbState(await res.json());
        setServerOnline(true);
      } else {
        setServerOnline(false);
      }
    } catch (e) {
      setServerOnline(false);
    }
  }, [networkStatus]);

  useEffect(() => {
    fetchServerDb();
    const interval = setInterval(fetchServerDb, 5000);
    return () => clearInterval(interval);
  }, [fetchServerDb]);

  const cachePricesLocally = useCallback(async () => {
    if (networkStatus === 'offline') return;
    try {
      const res = await fetch(buildApiUrl('/api/prices'));
      if (res.ok) {
        const data = await res.json();
        setLocalDb((prev) => ({ ...prev, prices: data }));
        addLog(`Cached ${data.length} market price entries from server to local storage`, 'success');
      }
    } catch (e) {
      addLog('Failed to pre-fetch price dashboard. Offline cache will be used.', 'warning');
    }
  }, [networkStatus, addLog]);

  // Keep latest localDb/lastSyncTime in refs so syncData doesn't need to be
  // redefined (and re-fired) every time a listing/message is queued locally.
  const localDbRef = useRef(localDb);
  localDbRef.current = localDb;
  const lastSyncRef = useRef(lastSyncTime);
  lastSyncRef.current = lastSyncTime;

  const syncData = useCallback(async () => {
    if (networkStatus === 'offline') {
      addLog('Synchronization aborted: Device is in OFFLINE mode.', 'error');
      return;
    }
    setIsSyncing(true);
    addLog('Beginning local database synchronization...', 'info');

    const currentDb = localDbRef.current;
    const unsyncedListings = currentDb.listings.filter((l) => !l.synced);
    const unsyncedMessages = currentDb.messages.filter((m) => !m.synced);

    addLog(
      `Scanning local outbox: ${unsyncedListings.length} listing(s), ${unsyncedMessages.length} message(s) queued.`,
      'info'
    );

    try {
      const response = await fetch(buildApiUrl('/api/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastSync: lastSyncRef.current,
          ownerId,
          changes: { listings: unsyncedListings, messages: unsyncedMessages },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const { serverTime, changes, logs: serverLogs } = await response.json();

      if (serverLogs && serverLogs.length > 0) {
        serverLogs.forEach((log) => addLog(log, 'warning'));
      }

      let receivedNewMessage = false;

      setLocalDb((prev) => {
        let updatedListings = prev.listings.map((item) =>
          unsyncedListings.some((ul) => ul.id === item.id) ? { ...item, synced: true } : item
        );

        if (changes.listings && changes.listings.length > 0) {
          changes.listings.forEach((serverItem) => {
            const localIndex = updatedListings.findIndex((li) => li.id === serverItem.id);
            if (localIndex > -1) {
              const localItem = updatedListings[localIndex];
              if (!localItem.synced) {
                if (localItem.updated_at >= serverItem.updated_at) {
                  addLog(`Sync merge conflict for listing ${serverItem.crop}: keeping local version (newer).`, 'warning');
                } else {
                  updatedListings[localIndex] = { ...serverItem, synced: true };
                  addLog(`Sync merge conflict for listing ${serverItem.crop}: server version overwrote local (older local).`, 'warning');
                }
              } else {
                updatedListings[localIndex] = { ...serverItem, synced: true };
              }
            } else {
              updatedListings.push({ ...serverItem, synced: true });
            }
          });
        }

        let updatedMessages = prev.messages.map((msg) =>
          unsyncedMessages.some((um) => um.id === msg.id) ? { ...msg, synced: true } : msg
        );

        if (changes.messages && changes.messages.length > 0) {
          changes.messages.forEach((serverMsg) => {
            const exists = updatedMessages.some((um) => um.id === serverMsg.id);
            if (!exists) {
              updatedMessages.push({ ...serverMsg, synced: true });
              receivedNewMessage = true;
            }
          });
        }

        return { ...prev, listings: updatedListings, messages: updatedMessages };
      });

      setLastSyncTime(serverTime);
      addLog(`Sync successful. Database synchronized with server at ${new Date(serverTime).toLocaleTimeString()}`, 'success');
      fetchServerDb();

      return { receivedNewMessage };
    } catch (err) {
      addLog('Sync failed: Backend unreachable. Changes kept in offline queue.', 'error');
      return { receivedNewMessage: false };
    } finally {
      setIsSyncing(false);
    }
  }, [networkStatus, addLog, fetchServerDb, ownerId]);

  // Auto-sync whenever the effective network status flips to online (including
  // the initial hydrate, so anything queued from a previous offline session pushes).
  const prevNetworkStatus = useRef(null);
  useEffect(() => {
    if (!hydrated) return;
    if (networkStatus === 'online' && prevNetworkStatus.current !== 'online') {
      syncData();
    }
    prevNetworkStatus.current = networkStatus;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkStatus, hydrated]);

  useEffect(() => {
    if (hydrated && networkStatus === 'online') {
      cachePricesLocally();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const handleResetAll = useCallback(async () => {
    await AsyncStorage.multiRemove([LOCAL_DB_KEY, LAST_SYNC_KEY]);
    setLocalDb(EMPTY_DB);
    setLastSyncTime(0);
    setSyncLogs([]);
    addLog('Local device database wiped clean.', 'info');

    if (networkStatus === 'online') {
      try {
        const res = await fetch(buildApiUrl('/api/db-reset'), { method: 'POST' });
        if (res.ok) {
          addLog('Server database successfully reset and re-seeded.', 'success');
          fetchServerDb();
          cachePricesLocally();
        }
      } catch (e) {
        addLog('Failed to reach backend to reset server DB.', 'error');
      }
    }
  }, [networkStatus, addLog, fetchServerDb, cachePricesLocally]);

  return {
    hydrated,
    localDb,
    setLocalDb,
    lastSyncTime,
    syncLogs,
    addLog,
    isSyncing,
    syncData,
    serverDbState,
    serverOnline,
    fetchServerDb,
    handleResetAll,
  };
}
