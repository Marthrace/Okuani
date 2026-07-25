import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const FALLBACK_PRICES = [
  { market_name: 'Makola Market', region: 'Greater Accra', crop: 'White Maize', price_per_kg: 8.5 },
  { market_name: 'Central Market', region: 'Ashanti', crop: 'White Maize', price_per_kg: 7.8 },
  { market_name: 'Techiman Market', region: 'Bono East', crop: 'White Maize', price_per_kg: 6.2 },
  { market_name: 'Tamale Market', region: 'Northern', crop: 'White Maize', price_per_kg: 6.8 },
];

// Maize price trend across regions, fixed layout mirroring the simulator's chart.
const CHART_POINTS = [
  { x: 40, y: 90, label: '6.2' },
  { x: 110, y: 60, label: '7.8' },
  { x: 180, y: 80, label: '6.8' },
  { x: 250, y: 45, label: '8.5' },
];
const CHART_PATH = CHART_POINTS.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
const CHART_AREA = `${CHART_PATH} L 250 110 L 40 110 Z`;

export default function PriceDashboardScreen({ localDb }) {
  const displayPrices = localDb.prices && localDb.prices.length > 0 ? localDb.prices : FALLBACK_PRICES;

  const cropGrouped = displayPrices.reduce((acc, curr) => {
    if (!acc[curr.crop]) acc[curr.crop] = [];
    acc[curr.crop].push(curr);
    return acc;
  }, {});

  return (
    <ScrollView style={styles.list} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Market Dashboard</Text>
        <Text style={styles.cachedLabel}>Offline Cached</Text>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeaderRow}>
          <View style={styles.inlineRow}>
            <Ionicons name="trending-up-outline" size={12} color={COLORS.primary} />
            <Text style={styles.chartTitle}>White Maize Price / Kg (GHS)</Text>
          </View>
          <Text style={styles.chartSubtitle}>Bono → Ash → Northern → GA</Text>
        </View>

        <Svg width="100%" height={120} viewBox="0 0 300 120">
          <Line x1="20" y1="20" x2="290" y2="20" stroke="#f1f5f9" strokeWidth="1" />
          <Line x1="20" y1="50" x2="290" y2="50" stroke="#f1f5f9" strokeWidth="1" />
          <Line x1="20" y1="80" x2="290" y2="80" stroke="#f1f5f9" strokeWidth="1" />
          <Line x1="20" y1="110" x2="290" y2="110" stroke="#e2e8f0" strokeWidth="1" />

          <Path d={CHART_AREA} fill="rgba(31, 163, 74, 0.15)" />
          <Path d={CHART_PATH} fill="none" stroke={COLORS.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {CHART_POINTS.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r="4" fill={COLORS.primaryLight} stroke={COLORS.primaryDark} strokeWidth="1.5" />
          ))}
          {CHART_POINTS.map((p, i) => (
            <SvgText key={i} x={p.x - 8} y={p.y - 8} fontSize="8" fill={COLORS.textMuted} fontWeight="bold">
              {p.label}
            </SvgText>
          ))}
        </Svg>
      </View>

      <Text style={styles.sectionTitle}>Regional Price Feeds</Text>
      {Object.keys(cropGrouped).length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No price bulletins cached. Connect online to fetch latest feeds.</Text>
        </View>
      ) : (
        Object.keys(cropGrouped).map((cropName) => (
          <View key={cropName} style={styles.priceCard}>
            <Text style={styles.priceCardTitle}>{cropName}</Text>
            {cropGrouped[cropName].map((p, idx) => (
              <View key={idx} style={styles.priceRow}>
                <Text style={styles.priceRowLabel}>{p.market_name} ({p.region})</Text>
                <Text style={styles.priceRowValue}>GHS {Number(p.price_per_kg).toFixed(2)}/kg</Text>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 4 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  screenTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  cachedLabel: { fontSize: 10, color: COLORS.textMuted },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chartTitle: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  chartSubtitle: { fontSize: 9, color: COLORS.textMuted },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16 },
  emptyText: { color: COLORS.textMuted, fontSize: 12 },
  priceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 4,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  priceRowLabel: { fontSize: 12, color: COLORS.textMuted },
  priceRowValue: { fontSize: 12, fontWeight: '700', color: COLORS.text },
});
