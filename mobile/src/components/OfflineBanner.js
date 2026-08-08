import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../utils/theme';

const TOAST_MS = 4000;
const SUCCESS_MS = 2500;

// A brief, clearly-readable toast (not a permanently glued bar) that appears
// on every screen — not just the dashboard — at the moments that actually
// matter: the instant Simulated Offline Mode switches on, for as long as a
// reconnect sync is actively running (its own natural "few seconds"), and a
// short confirmation flash once the pending-sync queue drains to zero. It
// stays out of the way the rest of the time; the small network icon in the
// Header/Farmer hero (tap to toggle) is the ongoing, unobtrusive indicator
// for as long as the device stays offline.
//
// Positioned as its own absolute overlay (like MarqueeBanner) using its own
// useSafeAreaInsets() rather than relying on the parent SafeAreaView's top
// edge — ProfileScreen/FarmerPortalScreen intentionally bleed their own
// content behind the status bar (see App.js's bleedTopScreen), which left an
// earlier in-flow version of this banner rendering above the status bar,
// overlapping the clock/signal icons, on those two screens.
export default function OfflineBanner({ networkStatus, isSyncing, syncProgress, hasPendingChanges }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();

  const [toast, setToast] = useState(null); // { text, mode } | null
  const hideTimerRef = useRef(null);
  const prevNetworkStatusRef = useRef(networkStatus);
  const wasSyncingRef = useRef(isSyncing);

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  // Just switched into offline (real or simulated) — announce it, then let
  // it clear itself after a few seconds.
  useEffect(() => {
    const wentOffline = prevNetworkStatusRef.current !== 'offline' && networkStatus === 'offline';
    prevNetworkStatusRef.current = networkStatus;
    if (wentOffline) {
      clearHideTimer();
      setToast({ mode: 'offline', text: 'Offline — changes will sync when reconnected' });
      hideTimerRef.current = setTimeout(() => setToast(null), TOAST_MS);
    }
  }, [networkStatus]);

  // Stay visible for the actual duration of a sync (own natural "few
  // seconds"), showing live progress; briefly confirm once it finishes.
  useEffect(() => {
    const wasSyncing = wasSyncingRef.current;
    wasSyncingRef.current = isSyncing;

    if (isSyncing) {
      clearHideTimer();
      setToast({
        mode: 'syncing',
        text:
          syncProgress?.total > 0
            ? `Syncing ${syncProgress.current} of ${syncProgress.total} changes...`
            : 'Syncing...',
      });
    } else if (wasSyncing) {
      clearHideTimer();
      if (!hasPendingChanges) {
        setToast({ mode: 'success', text: 'All changes synced ✓' });
        hideTimerRef.current = setTimeout(() => setToast(null), SUCCESS_MS);
      } else {
        setToast(null);
      }
    }
  }, [isSyncing, syncProgress, hasPendingChanges]);

  useEffect(() => clearHideTimer, []);

  if (!toast) return null;

  const isSuccess = toast.mode === 'success';

  return (
    <View style={[styles.overlay, { top: insets.top }]} pointerEvents="none">
      <View style={[styles.banner, isSuccess && { backgroundColor: colors.success }]}>
        <Ionicons
          name={isSuccess ? 'checkmark-done' : toast.mode === 'syncing' ? 'sync-outline' : 'cloud-offline-outline'}
          size={14}
          color="#fff"
        />
        <Text style={styles.text} numberOfLines={2}>
          {toast.text}
        </Text>
      </View>
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 60,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.warning,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.lg,
    },
    text: { color: '#fff', fontSize: 12, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  });
