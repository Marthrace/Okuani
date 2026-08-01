import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

// The identity pill (own profile/avatar shortcut) that used to live here was
// removed: BottomNav's Profile tab is already the one dedicated entry point
// to the Profile screen, and having a second avatar-style button in this
// header (shown on nearly every screen) created a confusing duplicate.
export default function Header({ networkStatus, hasPendingChanges, unreadCount, onNotificationsPress }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>OKUANI</Text>
        <Text style={styles.tagline}>OFFLINE-FIRST</Text>
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
        <View style={styles.iconChip}>
          <Ionicons
            name={networkStatus === 'online' ? 'wifi' : 'cloud-offline-outline'}
            size={16}
            color={networkStatus === 'online' ? colors.primaryLight : '#FCA5A5'}
          />
        </View>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    ...SHADOW.raised,
  },
  brand: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  tagline: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
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
