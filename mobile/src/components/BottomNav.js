import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const TABS = [
  { key: 'farmer', label: 'Farmer', icon: 'person-outline' },
  { key: 'buyer', label: 'Buyer', icon: 'storefront-outline' },
  { key: 'prices', label: 'Prices', icon: 'trending-up-outline' },
  { key: 'sync', label: 'Sync', icon: 'settings-outline' },
];

export default function BottomNav({ screen, onNavigate }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { paddingBottom: 10 + insets.bottom }]}>
      {TABS.map((tab) => {
        const active = screen === tab.key;
        return (
          <Pressable key={tab.key} style={styles.item} onPress={() => onNavigate(tab.key)}>
            <View style={[styles.iconPill, active && styles.iconPillActive]}>
              <Ionicons name={tab.icon} size={18} color={active ? '#fff' : COLORS.textMuted} />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iconPill: {
    width: 36,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: COLORS.primary,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  labelActive: {
    color: COLORS.primary,
  },
});
