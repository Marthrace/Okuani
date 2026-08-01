import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS } from '../utils/theme';

// Side icons flank a floating circular action button, mirroring the
// reference nav (home / list ... [center action] ... cart / profile)
// instead of the previous 5-in-a-row labeled-pill layout.
const SIDE_TABS = [
  { key: 'farmer', icon: 'home-outline', iconActive: 'home' },
  { key: 'prices', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  { key: 'buyer', icon: 'cart-outline', iconActive: 'cart' },
  { key: 'profile', icon: 'person-outline', iconActive: 'person' },
];
const CENTER_TAB = { key: 'settings', icon: 'settings-outline' };

export default function BottomNav({ screen, onNavigate }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const leftTabs = SIDE_TABS.slice(0, 2);
  const rightTabs = SIDE_TABS.slice(2);

  return (
    <View style={[styles.nav, { paddingBottom: 10 + insets.bottom }]}>
      <View style={styles.row}>
        {leftTabs.map((tab) => (
          <NavIcon key={tab.key} tab={tab} active={screen === tab.key} onNavigate={onNavigate} colors={colors} />
        ))}
        <View style={styles.centerSpacer} />
        {rightTabs.map((tab) => (
          <NavIcon key={tab.key} tab={tab} active={screen === tab.key} onNavigate={onNavigate} colors={colors} />
        ))}
      </View>

      <Pressable
        style={[styles.centerBtn, { bottom: 18 + insets.bottom }]}
        onPress={() => onNavigate(CENTER_TAB.key)}
        hitSlop={6}
      >
        <Ionicons name={CENTER_TAB.icon} size={22} color="#fff" />
      </Pressable>
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
    centerSpacer: {
      width: 56,
    },
    centerBtn: {
      position: 'absolute',
      alignSelf: 'center',
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.refGreen,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: colors.card,
      shadowColor: '#0F2A1C',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 10,
    },
  });
