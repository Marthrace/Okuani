import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const FALLBACK_STATS = { avg: 7.33, markets: 4, crops: 5, highest: 8.5, bars: [6.2, 7.8, 6.8, 8.5, 7.2, 6.9] };

function usePriceStats(prices) {
  if (!prices || prices.length === 0) return FALLBACK_STATS;

  const headlineCrop = prices.some((p) => p.crop === 'White Maize') ? 'White Maize' : prices[0].crop;
  const entries = prices.filter((p) => p.crop === headlineCrop);
  const values = entries.map((p) => p.price_per_kg);

  return {
    avg: values.reduce((sum, v) => sum + v, 0) / values.length,
    markets: new Set(prices.map((p) => p.market_name)).size,
    crops: new Set(prices.map((p) => p.crop)).size,
    highest: Math.max(...values),
    bars: prices.slice(0, 6).map((p) => p.price_per_kg),
  };
}

export default function WelcomeScreen({ onSelectRole, prices }) {
  const stats = usePriceStats(prices);
  const maxBar = Math.max(...stats.bars, 1);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[COLORS.forestDark, COLORS.forestDarker]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} bounces={false}>
      <View style={styles.logoRow}>
        <View style={styles.logoBadge}>
          <Ionicons name="leaf" size={20} color={COLORS.forestDark} />
        </View>
        <Text style={styles.logoText}>OKUANI</Text>
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>WELCOME TO OKUANI</Text>
      </View>

      <Text style={styles.title}>
        Direct Trade & Fair{'\n'}Prices for{' '}
        <Text style={styles.titleHighlight}>Farmers</Text>
      </Text>

      <Text style={styles.subtitle}>
        Connecting smallholder farmers to buyers and real-time market prices —
        built offline-first for rural Ghana.
      </Text>

      <View style={styles.pulseCard}>
        <View style={styles.pulseHeaderRow}>
          <View style={styles.inlineRow}>
            <Ionicons name="location" size={13} color={COLORS.primary} />
            <Text style={styles.pulseTitle}>Regional Market Pulse</Text>
          </View>
          <Text style={styles.pulseTag}>{prices?.length ? 'Live' : 'Cached'}</Text>
        </View>

        <View style={styles.pulseHeroRow}>
          <Text style={styles.pulseBig}>GHS {stats.avg.toFixed(2)}</Text>
          <Text style={styles.pulseBigUnit}>/ kg avg</Text>
        </View>

        <View style={styles.statGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statCellLabel}>Markets</Text>
            <Text style={styles.statCellValue}>{stats.markets}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statCellLabel}>Crops</Text>
            <Text style={styles.statCellValue}>{stats.crops}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statCellLabel}>Highest</Text>
            <Text style={styles.statCellValue}>{stats.highest.toFixed(1)}</Text>
          </View>
        </View>

        <View style={styles.barRow}>
          {stats.bars.map((v, i) => (
            <View key={i} style={styles.barTrack}>
              <View style={[styles.barFill, { height: `${Math.max(18, (v / maxBar) * 100)}%` }]} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.ctaRow}>
        <Pressable style={styles.ctaPrimary} onPress={() => onSelectRole('farmer')}>
          <Text style={styles.ctaPrimaryText}>Farmer Portal</Text>
          <Ionicons name="arrow-forward" size={16} color={COLORS.forestDark} />
        </Pressable>
        <Pressable style={styles.ctaSecondary} onPress={() => onSelectRole('buyer')}>
          <Text style={styles.ctaSecondaryText}>Buyer Marketplace</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.roleCards}>
        <View style={styles.roleCard}>
          <View style={styles.roleIcon}>
            <Ionicons name="person-outline" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.roleCardTitle}>List produce</Text>
          <Text style={styles.roleCardDesc}>Add crops & manage listings, even offline</Text>
        </View>
        <View style={styles.roleCard}>
          <View style={styles.roleIcon}>
            <Ionicons name="trending-up-outline" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.roleCardTitle}>Track prices</Text>
          <Text style={styles.roleCardDesc}>Compare regional market rates</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.avatarStack}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.avatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 4 - i }]} />
          ))}
        </View>
        <Text style={styles.footerText}>
          <Text style={styles.footerNum}>1K+ </Text>
          Farmers & Buyers on OKUANI
        </Text>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.forestDark },
  scroll: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 22 },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 1 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: COLORS.forestDark, letterSpacing: 0.5 },
  title: { fontSize: 30, fontWeight: '800', color: '#fff', lineHeight: 36, marginBottom: 12 },
  titleHighlight: { color: COLORS.accent },
  subtitle: { fontSize: 13, color: '#CFE3D6', lineHeight: 19, marginBottom: 18 },
  pulseCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  pulseHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pulseTitle: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  pulseTag: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  pulseHeroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  pulseBig: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  pulseBigUnit: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  statGrid: { flexDirection: 'row', gap: 8 },
  statCell: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  statCellLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  statCellValue: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  barRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 36, marginTop: 2 },
  barTrack: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  barFill: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 4, minHeight: 6 },
  ctaRow: { gap: 10, marginBottom: 20 },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingVertical: 14,
  },
  ctaPrimaryText: { color: COLORS.forestDark, fontWeight: '800', fontSize: 14 },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 999,
    paddingVertical: 14,
  },
  ctaSecondaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  roleCards: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  roleCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  roleIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  roleCardTitle: { fontWeight: '700', fontSize: 13, color: COLORS.text },
  roleCardDesc: { fontSize: 11, color: COLORS.textMuted, lineHeight: 15 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 'auto' },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#5B8F72',
    borderWidth: 2,
    borderColor: COLORS.forestDark,
  },
  footerText: { color: '#CFE3D6', fontSize: 12 },
  footerNum: { color: COLORS.accent, fontWeight: '800' },
});
