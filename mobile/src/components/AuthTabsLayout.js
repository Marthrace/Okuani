import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../utils/theme';

// Login/SignUp-only layout: white background, centered circular logo, and a
// Log in / Sign up tab switcher — distinct from the dark-hero AuthLayout
// used by the forgot/verify/reset password screens.
// Logo/tab-switcher stay in a fixed header above the ScrollView (rather than
// scrolling with the form) so they can't get dragged up toward the keyboard
// when a field is focused — only the form/footer content scrolls.
export default function AuthTabsLayout({ activeTab, onChangeTab, onBack, children, footer }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets);
  return (
    <View style={styles.root}>
      {onBack && (
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={16} color={colors.text} />
        </Pressable>
      )}

      <View style={styles.logoWrap}>
        <View style={styles.logoBadge}>
          <Ionicons name="leaf" size={30} color={colors.refGreen} />
        </View>
        <Text style={styles.logoText}>OKUANI</Text>
        <Text style={styles.logoTagline}>Farmer to Buyer, Direct</Text>
      </View>

      <View style={styles.tabRow}>
        <Pressable style={styles.tab} onPress={() => onChangeTab('login')} hitSlop={6}>
          <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>Log in</Text>
          {activeTab === 'login' && <View style={styles.tabUnderline} />}
        </Pressable>
        <Pressable style={styles.tab} onPress={() => onChangeTab('signup')} hitSlop={6}>
          <Text style={[styles.tabText, activeTab === 'signup' && styles.tabTextActive]}>Sign up</Text>
          {activeTab === 'signup' && <View style={styles.tabUnderline} />}
        </Pressable>
      </View>

      <ScrollView style={styles.scrollFlex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, insets) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: SPACING.xl + 2, paddingTop: 20 },
  scrollFlex: { flex: 1 },
  // No BottomNav sits below this screen, so this is the only thing padding
  // for the bottom safe area (home indicator / Android gesture bar) —
  // additive to the existing spacing, not a replacement of it.
  scrollContent: { paddingBottom: SPACING.xxl + 4 + insets.bottom, flexGrow: 1 },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  logoWrap: { alignItems: 'center', marginBottom: SPACING.xl, gap: 2 },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.refSage,
    borderWidth: 2,
    borderColor: colors.refSageBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoText: { fontSize: 17, fontWeight: '800', color: colors.refGreen, letterSpacing: 1 },
  logoTagline: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xxl,
    marginBottom: SPACING.xl,
  },
  tab: { alignItems: 'center', gap: 6, paddingBottom: 4 },
  tabText: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
  tabTextActive: { color: colors.refGreen },
  tabUnderline: { height: 2, width: 28, borderRadius: 1, backgroundColor: colors.refGreen },
  form: { gap: 4 },
  footer: { marginTop: SPACING.xl, alignItems: 'center', gap: 14 },
});
