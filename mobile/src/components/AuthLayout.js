import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

export default function AuthLayout({ title, subtitle, onBack, children, footer }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets);
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.forestDark, colors.forestDarker]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.hero}
      >
        {onBack && (
          <Pressable style={styles.backBtn} onPress={onBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={16} color="#fff" />
          </Pressable>
        )}
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="leaf" size={16} color={colors.forestDark} />
          </View>
          <Text style={styles.logoText}>OKUANI</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, insets) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    paddingTop: 20,
    paddingHorizontal: SPACING.xl + 2,
    paddingBottom: SPACING.xxl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  title: { fontSize: 23, fontWeight: '800', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 12, color: '#CFE3D6', lineHeight: 17 },
  scroll: { flex: 1, marginTop: -18 },
  // No BottomNav sits below this screen, so this is the only thing padding
  // for the bottom safe area (home indicator / Android gesture bar) —
  // additive to the existing spacing, not a replacement of it.
  scrollContent: { paddingHorizontal: SPACING.xl + 2, paddingBottom: SPACING.xxl + 4 + insets.bottom },
  card: {
    backgroundColor: colors.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    gap: 4,
    ...SHADOW.card,
  },
  footer: { marginTop: SPACING.xl, alignItems: 'center', gap: 10 },
});
