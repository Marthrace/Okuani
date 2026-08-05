import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS } from '../utils/theme';

const TABS = [
  { key: 'farmer', icon: 'home-outline', iconActive: 'home' },
  { key: 'prices', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  { key: 'buyer', icon: 'cart-outline', iconActive: 'cart' },
  { key: 'profile', icon: 'person-outline', iconActive: 'person' },
];

export default function BottomNav({ screen, onNavigate }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={[styles.nav, { paddingBottom: 10 + insets.bottom }]}>
      <View style={styles.row}>
        {TABS.map((tab) => (
          <NavIcon key={tab.key} tab={tab} active={screen === tab.key} onNavigate={onNavigate} colors={colors} />
        ))}
      </View>
    </View>
  );
}

function NavIcon({ tab, active, onNavigate, colors }) {
  const styles = getStyles(colors);
  return (
    <Pressable style={styles.item} onPress={() => onNavigate(tab.key)} hitSlop={8}>
      <Ionicons
        name={active ? tab.iconActive : tab.icon}
        size={22}
        color={active ? colors.refGreen : colors.textMuted}
      />
      {active && <View style={styles.activeDot} />}
    </Pressable>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    nav: {
      backgroundColor: colors.card,
      paddingTop: 14,
      borderTopLeftRadius: RADIUS.xl,
      borderTopRightRadius: RADIUS.xl,
      shadowColor: '#0F2A1C',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    item: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    activeDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.refGreen,
    },
  });
