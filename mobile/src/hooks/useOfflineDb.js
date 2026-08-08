import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../utils/api';
import { priceReportId } from '../utils/constants';

const LOCAL_DB_KEY = 'okuani_local_db';
const LAST_SYNC_KEY = 'okuani_last_sync';
const EMPTY_DB = {
  listings: [],
  messages: [],
  prices: [],
  priceSummary: [],
  priceSummaryFetchedAt: null,
  priceReports: [],
};
const RETRY_BASE_MS = 3000;
const RETRY_MAX_MS = 30000;

/**
 * On-device offline-first data store. Mirrors the sync/conflict-resolution
 * behaviour of the browser simulator (simulator/src/App.jsx), but persists
 * to AsyncStorage instead of localStorage as the on-device cache, and syncs
 * against the same backend /api/sync endpoint.
 *
 * Three kinds of records get queued locally with `synced: false` and pushed
 * on reconnect: listings, messages, and price reports (a farmer submitting/
 * editing a market price — see priceReportId()). Each carries its own id,
 * payload, and updated_at timestamp, which doubles as the pending-sync queue
 * (per Simulated Offline Mode / project proposal §5.3) — there's no separate
 * client-side SQL table for this since the app's local storage layer is
 * AsyncStorage, not SQLite (only the backend uses SQLite).
 */
export function useOfflineDb(networkStatus, ownerId, authToken) {
  const [localDb, setLocalDb] = useState(EMPTY_DB);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  // { current, total } while a sync is in progress — total is the queue size
  // captured at the start of this sync run, current counts up as each queued
  // change is individually pushed, so the UI can show "Syncing N of M...".
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

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
        // Spread over EMPTY_DB (not just JSON.parse(savedDb) directly) so a
        // cache saved before priceReports existed still gets a valid [] for
        // it, instead of undefined breaking every .filter()/.map() below.
        if (savedDb) setLocalDb({ ...EMPTY_DB, ...JSON.parse(savedDb) });
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

    // Trend-annotated (current/previous/change/%/trend) rows for the Market
    // Dashboard overview cards — cached the same offline-first way as `prices`.
    try {
      const res = await fetch(buildApiUrl('/api/prices/summary'));
      if (res.ok) {
        const data = await res.json();
        setLocalDb((prev) => ({ ...prev, priceSummary: data, priceSummaryFetchedAt: Date.now() }));
      }
    } catch (e) {
      addLog('Failed to pre-fetch price trend summary. Offline cache will be used.', 'warning');
    }
  }, [networkStatus, addLog]);

  // Keep latest localDb/lastSyncTime in refs so syncData doesn't need to be
  // redefined (and re-fired) every time a listing/message/price report is
  // queued locally.
  const localDbRef = useRef(localDb);
  localDbRef.current = localDb;
  const lastSyncRef = useRef(lastSyncTime);
  lastSyncRef.current = lastSyncTime;

  // Retry-with-backoff bookkeeping for a sync that failed because the
  // backend was unreachable (not because the device is intentionally
  // offline) — never silently drops the queue, it just waits and tries
  // again, doubling the wait each consecutive failure up to RETRY_MAX_MS.
  const retryTimerRef = useRef(null);
  const retryDelayRef = useRef(RETRY_BASE_MS);
  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);
  useEffect(() => clearRetryTimer, [clearRetryTimer]);

  // Merges one /api/sync response into localDb: marks the just-pushed record
  // synced, and applies the same last-write-wins conflict rule (by
  // updated_at) the server already applied, for whatever server-side changes
  // came back — mirrored per record kind (listings/messages/priceReports).
  const applyServerChanges = useCallback(
    (pushedType, pushedItem, changes, onNewMessage) => {
      setLocalDb((prev) => {
        let updatedListings = prev.listings;
        let updatedMessages = prev.messages;
        let updatedPriceReports = prev.priceReports || [];

        if (pushedType === 'listings' && pushedItem) {
          updatedListings = updatedListings.map((l) => (l.id === pushedItem.id ? { ...l, synced: true } : l));
        } else if (pushedType === 'messages' && pushedItem) {
          updatedMessages = updatedMessages.map((m) => (m.id === pushedItem.id ? { ...m, synced: true } : m));
        } else if (pushedType === 'priceReports' && pushedItem) {
          updatedPriceReports = updatedPriceReports.map((p) => (p.id === pushedItem.id ? { ...p, synced: true } : p));
        }

        if (changes?.listings?.length > 0) {
          updatedListings = [...updatedListings];
          changes.listings.forEach((serverItem) => {
            const idx = updatedListings.findIndex((li) => li.id === serverItem.id);
            if (idx > -1) {
              const localItem = updatedListings[idx];
              if (!localItem.synced) {
                if (localItem.updated_at >= serverItem.updated_at) {
                  addLog(`Sync merge conflict for listing ${serverItem.crop}: keeping local version (newer).`, 'warning');
                } else {
                  updatedListings[idx] = { ...serverItem, synced: true };
                  addLog(`Sync merge conflict for listing ${serverItem.crop}: server version overwrote local (older local).`, 'warning');
                }
              } else {
                updatedListings[idx] = { ...serverItem, synced: true };
              }
            } else {
              updatedListings.push({ ...serverItem, synced: true });
            }
          });
        }

        if (changes?.messages?.length > 0) {
          updatedMessages = [...updatedMessages];
          changes.messages.forEach((serverMsg) => {
            const exists = updatedMessages.some((um) => um.id === serverMsg.id);
            if (!exists) {
              updatedMessages.push({ ...serverMsg, synced: true });
              onNewMessage?.();
            }
          });
        }

        if (changes?.priceReports?.length > 0) {
          updatedPriceReports = [...updatedPriceReports];
          changes.priceReports.forEach((serverReport) => {
            const idx = updatedPriceReports.findIndex((pr) => pr.id === serverReport.id);
            const label = `${serverReport.crop} @ ${serverReport.market_name}`;
            if (idx > -1) {
              const localItem = updatedPriceReports[idx];
              if (!localItem.synced) {
                if (localItem.updated_at >= serverReport.updated_at) {
                  addLog(`Sync merge conflict for price report (${label}): keeping local version (newer).`, 'warning');
                } else {
                  updatedPriceReports[idx] = { ...serverReport, synced: true };
                  addLog(`Sync merge conflict for price report (${label}): server version overwrote local (older local).`, 'warning');
                }
              } else {
                updatedPriceReports[idx] = { ...serverReport, synced: true };
              }
            } else {
              updatedPriceReports.push({ ...serverReport, synced: true });
            }
          });
        }

        return { ...prev, listings: updatedListings, messages: updatedMessages, priceReports: updatedPriceReports };
      });
    },
    [addLog]
  );

  const syncData = useCallback(async () => {
    if (networkStatus === 'offline') {
      addLog('Synchronization aborted: Device is in OFFLINE mode.', 'error');
      return;
    }
    clearRetryTimer();
    setIsSyncing(true);
    addLog('Beginning local database synchronization...', 'info');

    const currentDb = localDbRef.current;
    // The pending-sync queue: every locally-created/edited record not yet
    // confirmed by the server, processed in the order it was queued.
    const queue = [
      ...currentDb.listings.filter((l) => !l.synced).map((item) => ({ type: 'listings', item })),
      ...currentDb.messages.filter((m) => !m.synced).map((item) => ({ type: 'messages', item })),
      ...(currentDb.priceReports || []).filter((p) => !p.synced).map((item) => ({ type: 'priceReports', item })),
    ];
    const total = queue.length;
    setSyncProgress({ current: 0, total });
    addLog(
      total > 0 ? `Scanning local outbox: ${total} change(s) queued for sync.` : 'Outbox empty — checking for remote updates...',
      'info'
    );

    const syncHeaders = { 'Content-Type': 'application/json' };
    if (authToken) syncHeaders.Authorization = `Bearer ${authToken}`;

    let receivedNewMessage = false;
    let pushedCount = 0;

    try {
      // One request per queued change (rather than one big batch) so
      // progress can be shown per item, and so a failure partway through
      // only leaves the un-pushed remainder in the queue, not everything.
      for (let i = 0; i < queue.length; i++) {
        const { type, item } = queue[i];
        setSyncProgress({ current: i + 1, total });
        addLog(`Syncing ${i + 1} of ${total} change(s)...`, 'info');

        const response = await fetch(buildApiUrl('/api/sync'), {
          method: 'POST',
          headers: syncHeaders,
          body: JSON.stringify({
            lastSync: lastSyncRef.current,
            ownerId,
            changes: { [type]: [item] },
          }),
        });

        if (!response.ok) throw new Error(`Server returned HTTP ${response.status}`);

        const { serverTime, changes, logs: serverLogs } = await response.json();
        if (serverLogs && serverLogs.length > 0) serverLogs.forEach((log) => addLog(log, 'warning'));

        applyServerChanges(type, item, changes, () => {
          receivedNewMessage = true;
        });
        lastSyncRef.current = serverTime;
        setLastSyncTime(serverTime);
        pushedCount++;
      }

      // Nothing of our own to push this round — still pull whatever changed
      // remotely (another device's synced listing/message/price report)
      // since our last sync.
      if (total === 0) {
        const response = await fetch(buildApiUrl('/api/sync'), {
          method: 'POST',
          headers: syncHeaders,
          body: JSON.stringify({ lastSync: lastSyncRef.current, ownerId, changes: {} }),
        });
        if (response.ok) {
          const { serverTime, changes } = await response.json();
          applyServerChanges(null, null, changes, () => {
            receivedNewMessage = true;
          });
          lastSyncRef.current = serverTime;
          setLastSyncTime(serverTime);
        }
      }

      retryDelayRef.current = RETRY_BASE_MS;
      addLog(
        total > 0 ? `Sync complete — all ${total} change(s) synced.` : 'Sync complete — already up to date.',
        'success'
      );
      return { receivedNewMessage };
    } catch (err) {
      const remaining = total - pushedCount;
      addLog(
        `Sync failed after ${pushedCount} of ${total} change(s): backend unreachable. ${remaining} change(s) remain queued — nothing was dropped.`,
        'error'
      );
      // Only auto-retry if the device thinks it's online (a real transient
      // backend failure) — if the user has since flipped to Simulated
      // Offline, the normal "resume on reconnect" effect below handles it,
      // so retrying here on a timer would just be wasted/duplicate work.
      if (networkStatus === 'online') {
        const delay = retryDelayRef.current;
        addLog(`Will retry automatically in ${Math.round(delay / 1000)}s.`, 'warning');
        retryTimerRef.current = setTimeout(() => {
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, RETRY_MAX_MS);
          syncData();
        }, delay);
      }
      return { receivedNewMessage };
    } finally {
      setIsSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkStatus, addLog, ownerId, authToken, applyServerChanges, clearRetryTimer]);

  // Auto-sync whenever the effective network status flips to online (including
  // the initial hydrate, so anything queued from a previous offline session pushes).
  const prevNetworkStatus = useRef(null);
  useEffect(() => {
    if (!hydrated) return;
    if (networkStatus === 'online' && prevNetworkStatus.current !== 'online') {
      syncData();
    }
    if (networkStatus === 'offline') {
      // Toggling (back) into Simulated Offline Mode mid-backoff should stop
      // the pending auto-retry — it'll resync for real via the branch above
      // the moment the device goes back online.
      clearRetryTimer();
    }
    prevNetworkStatus.current = networkStatus;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkStatus, hydrated]);

  // Re-fetch prices whenever the device is (re)connected, not just once at
  // hydration — previously this only listed `hydrated` as a dependency, so
  // going online later (after hydrating offline) never refreshed prices.
  useEffect(() => {
    if (hydrated && networkStatus === 'online') {
      cachePricesLocally();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, networkStatus]);

  // Queues a farmer's market price submission/edit locally (Simulated
  // Offline Mode action #3) — succeeds instantly and offline, same as adding
  // a listing or sending a message. Keyed by priceReportId(market/region/crop)
  // rather than a random id, so editing "the same price" twice (including
  // from two different devices sharing this account) overwrites the queued
  // entry locally and collides deterministically on sync, instead of
  // silently creating two unrelated rows.
  const submitPriceReport = useCallback(
    ({ market_name, region, crop, price_per_kg, source }) => {
      const id = priceReportId(market_name, region, crop);
      const report = {
        id,
        market_name,
        region,
        crop,
        price_per_kg: parseFloat(price_per_kg),
        source: source || 'Farmer Report',
        owner_id: ownerId,
        updated_at: Date.now(),
        synced: false,
      };

      setLocalDb((prev) => {
        const existing = prev.priceReports || [];
        const idx = existing.findIndex((p) => p.id === id);
        const priceReports =
          idx > -1 ? existing.map((p, i) => (i === idx ? report : p)) : [report, ...existing];
        return { ...prev, priceReports };
      });
      addLog(
        `Queued price update for ${crop} at ${market_name} (GHS ${report.price_per_kg}/kg) to offline cache. Waiting for network to sync.`,
        'info'
      );

      if (networkStatus === 'online') {
        setTimeout(syncData, 500);
      }
      return id;
    },
    [ownerId, networkStatus, addLog, syncData]
  );

  const handleResetAll = useCallback(async () => {
    await AsyncStorage.multiRemove([LOCAL_DB_KEY, LAST_SYNC_KEY]);
    setLocalDb(EMPTY_DB);
    setLastSyncTime(0);
    setSyncLogs([]);
    addLog('Local device database wiped clean.', 'info');

    // Requires a logged-in session now — db-reset would otherwise let any
    // anonymous caller wipe the shared demo database.
    if (networkStatus === 'online') {
      if (!authToken) {
        addLog('Log in to reset the shared server database.', 'warning');
        return;
      }
      try {
        const res = await fetch(buildApiUrl('/api/db-reset'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          addLog('Server database successfully reset and re-seeded.', 'success');
          cachePricesLocally();
        } else {
          addLog('Server rejected the reset request.', 'error');
        }
      } catch (e) {
        addLog('Failed to reach backend to reset server DB.', 'error');
      }
    }
  }, [networkStatus, addLog, cachePricesLocally, authToken]);

  return {
    hydrated,
    localDb,
    setLocalDb,
    lastSyncTime,
    syncLogs,
    addLog,
    isSyncing,
    syncProgress,
    syncData,
    submitPriceReport,
    handleResetAll,
  };
}
