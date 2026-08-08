import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../utils/theme';

// Neither the identity pill (own profile/avatar shortcut) nor the three-bar
// menu live here — both are centralized on the Profile screen (BottomNav's
// Profile tab is the one dedicated entry point to it), so this header, shown
// on nearly every other screen, doesn't repeat them.
export default function Header({ networkStatus, hasPendingChanges, unreadCount, onNotificationsPress, onToggleOffline }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>OKUANI</Text>
      </View>
      <View style={styles.icons}>
        {onNotificationsPress && (
          <Pressable style={styles.iconChip} onPress={onNotificationsPress} hitSlop={6}>
            <Ionicons
              name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
              size={16}
              color={colors.primaryLight}
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>
        )}
        {/* Doubles as the "Simulate Offline Mode" toggle — tapping it flips
            simulateOffline (see useNetworkStatus.js), so the demo control
            lives right where its own status icon already is, reachable
            without dev tools or emulator airplane mode. */}
        <Pressable
          style={styles.iconChip}
          onPress={onToggleOffline}
          disabled={!onToggleOffline}
          hitSlop={6}
          accessibilityRole="switch"
          accessibilityLabel="Simulate offline mode"
          accessibilityState={{ checked: networkStatus === 'offline' }}
        >
          <Ionicons
            name={networkStatus === 'online' ? 'wifi' : 'cloud-offline-outline'}
            size={16}
            color={networkStatus === 'online' ? colors.primaryLight : '#FCA5A5'}
          />
        </Pressable>
        <View style={styles.iconChip}>
          <Ionicons
            name={hasPendingChanges ? 'sync-outline' : 'checkmark-done'}
            size={16}
            color={hasPendingChanges ? colors.accent : colors.primaryLight}
          />
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.forestDark,
    // Same shape as FarmerPortalScreen's hero (List New Produce) — matching
    // padding proportions and radius, and no drop shadow (hero has none;
    // this header's old heavy SHADOW.raised blurred/softened the curve
    // enough that the rounded bottom edge barely read as rounded at all).
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  brand: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
