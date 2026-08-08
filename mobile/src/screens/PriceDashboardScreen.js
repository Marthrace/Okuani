import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';
import { computeStockAnalysis } from '../utils/stock';
import { CROPS, REGIONS } from '../utils/constants';
import Select from '../components/Select';

const FALLBACK_PRICES = [
  { market_name: 'Makola Market', region: 'Greater Accra', crop: 'White Maize', price_per_kg: 8.5 },
  { market_name: 'Central Market', region: 'Ashanti', crop: 'White Maize', price_per_kg: 7.8 },
  { market_name: 'Techiman Market', region: 'Bono East', crop: 'White Maize', price_per_kg: 6.2 },
  { market_name: 'Tamale Market', region: 'Northern', crop: 'White Maize', price_per_kg: 6.8 },
];

function trendMeta(trend) {
  if (trend === 'up') return { icon: 'trending-up', colorKey: 'success' };
  if (trend === 'down') return { icon: 'trending-down', colorKey: 'danger' };
  return { icon: 'remove', colorKey: 'textMuted' };
}

function TrendBadge({ trend, percentChange, colors }) {
  const { icon, colorKey } = trendMeta(trend);
  const color = colors[colorKey];
  return (
    <View style={styles.trendBadge}>
      <Ionicons name={icon} size={11} color={color} />
      <Text style={[styles.trendBadgeText, { color }]}>
        {percentChange != null ? `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%` : 'New'}
      </Text>
    </View>
  );
}

// Derives everything "Best Prices Today" needs from the already-fetched
// per crop+market summary rows — no dedicated backend endpoint, since this
// is all a client-side aggregation over GET /api/prices/summary.
function buildBestPrices(summaryRows) {
  const byCrop = summaryRows.reduce((acc, row) => {
    if (!acc[row.crop]) acc[row.crop] = [];
    acc[row.crop].push(row);
    return acc;
  }, {});

  const perCrop = Object.keys(byCrop).map((crop) => {
    const ranked = [...byCrop[crop]].sort((a, b) => a.current - b.current);
    const cheapest = ranked[0];
    const highest = ranked[ranked.length - 1];
    return { crop, ranked, cheapest, highest, difference: highest.current - cheapest.current };
  });

  const bars = perCrop
    .map((c) => ({ crop: c.crop, price: c.cheapest.current, market_name: c.cheapest.market_name, region: c.cheapest.region }))
    .sort((a, b) => a.price - b.price);

  const lowestOverall = bars[0] || null;
  const largestDifference = perCrop.reduce(
    (max, c) => (!max || c.difference > max.difference ? c : max),
    null
  );

  return { perCrop, bars, lowestOverall, largestDifference };
}

function formatLastUpdated(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return isToday ? `Today, ${time}` : `${date.toLocaleDateString()}, ${time}`;
}

// Each summary stat gets its own accent color + icon (matching a reference
// dashboard's color-coded metric cards) so the four are visually distinct
// at a glance instead of four identical white tiles.
const STAT_TILE_META = {
  lowest: { icon: 'pricetag', bg: 'primarySoft', fg: 'primaryDark' },
  affordable: { icon: 'star', bg: 'accentSoft', fg: 'warning' },
  difference: { icon: 'trending-up', bg: 'infoSoft', fg: 'info' },
  updated: { icon: 'time', bg: 'violetSoft', fg: 'violet' },
};

function StatTile({ tileKey, label, value, colors, styles }) {
  const meta = STAT_TILE_META[tileKey];
  return (
    <View style={[styles.statTile, { backgroundColor: colors[meta.bg] }]}>
      <View style={[styles.statIconBadge, { backgroundColor: colors.card }]}>
        <Ionicons name={meta.icon} size={13} color={colors[meta.fg]} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function BestPriceBar({ bar, maxPrice, colors, styles }) {
  const widthPct = maxPrice > 0 ? Math.max(8, (bar.price / maxPrice) * 100) : 8;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{bar.crop}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${widthPct}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text style={styles.barValue}>GHS {bar.price.toFixed(2)}/kg</Text>
    </View>
  );
}

// Simulated Offline Mode action #3 (per the proposal's §5.3): submitting or
// editing a market price. Works identically online or offline — the form
// only ever calls submitPriceReport (useOfflineDb), which queues the
// change locally and pushes it once reconnected, same as adding a listing.
function ReportPriceModal({ visible, onClose, onSubmit }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [market_name, setMarketName] = useState('');
  const [region, setRegion] = useState(REGIONS[0]);
  const [crop, setCrop] = useState(CROPS[0]);
  const [price, setPrice] = useState('');

  const reset = () => {
    setMarketName('');
    setRegion(REGIONS[0]);
    setCrop(CROPS[0]);
    setPrice('');
  };

  const handleSubmit = () => {
    if (!market_name.trim() || !price || Number.isNaN(Number(price))) {
      Alert.alert('Missing details', 'Enter a market name and a valid price.');
      return;
    }
    onSubmit({ market_name: market_name.trim(), region, crop, price_per_kg: price });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Report a Price</Text>
          <Text style={styles.modalSubtitle}>
            Submit today's price for a market/crop. Works offline — it queues and syncs automatically once reconnected.
          </Text>

          <Text style={styles.label}>Crop</Text>
          <Select selectedValue={crop} onValueChange={setCrop} items={CROPS.filter((c) => c !== 'Others')} />

          <Text style={styles.label}>Market name</Text>
          <TextInput
            style={styles.input}
            value={market_name}
            onChangeText={setMarketName}
            placeholder="e.g. Techiman Market"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Region</Text>
          <Select selectedValue={region} onValueChange={setRegion} items={REGIONS} />

          <Text style={styles.label}>Price per kg (GHS)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />

          <Pressable style={styles.modalSubmitBtn} onPress={handleSubmit}>
            <Text style={styles.modalSubmitText}>Queue Price Update</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function PriceDashboardScreen({ localDb, onViewTrend, networkStatus, submitPriceReport }) {
  const { colors } = useTheme();
  const themedStyles = getStyles(colors);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const pendingPriceReports = (localDb.priceReports || []).filter((p) => !p.synced);

  // Trend-annotated rows (current/previous/change/%/trend), cached the same
  // offline-first way as localDb.prices. Falls back to plain current-price
  // rows (no trend data available yet) when nothing is cached.
  const displaySummary =
    localDb.priceSummary && localDb.priceSummary.length > 0
      ? localDb.priceSummary
      : (localDb.prices && localDb.prices.length > 0 ? localDb.prices : FALLBACK_PRICES).map((p) => ({
          crop: p.crop,
          market_name: p.market_name,
          region: p.region,
          unit: 'kg',
          current: p.price_per_kg,
          previous: null,
          change: null,
          percentChange: null,
          trend: 'stable',
        }));

  const cropGrouped = displaySummary.reduce((acc, curr) => {
    if (!acc[curr.crop]) acc[curr.crop] = [];
    acc[curr.crop].push(curr);
    return acc;
  }, {});

  const bestPrices = displaySummary.length > 0 ? buildBestPrices(displaySummary) : null;
  const maxBarPrice = bestPrices ? Math.max(...bestPrices.bars.map((b) => b.price)) : 0;

  // Total quantity currently listed per crop, across every active listing
  // this device knows about — grouped on the normalized crop key so
  // "Tomatoes" / "tomatoes" / "TOMATOES" contribute to one total rather
  // than showing up as separate rows.
  const stockRows = computeStockAnalysis(localDb.listings);

  return (
    <ScrollView style={themedStyles.list} contentContainerStyle={themedStyles.content}>
      <View style={themedStyles.headerRow}>
        <Text style={themedStyles.screenTitle}>Market Dashboard</Text>
        <Text style={themedStyles.cachedLabel}>Offline Cached</Text>
      </View>

      {submitPriceReport && (
        <Pressable style={themedStyles.reportPriceBtn} onPress={() => setReportModalVisible(true)}>
          <Ionicons name="add-circle" size={16} color={colors.primaryDark} />
          <Text style={themedStyles.reportPriceBtnText}>Report a Price</Text>
          {pendingPriceReports.length > 0 && (
            <View style={themedStyles.pendingBadge}>
              <Text style={themedStyles.pendingBadgeText}>
                {pendingPriceReports.length} pending sync
              </Text>
            </View>
          )}
        </Pressable>
      )}

      {bestPrices && (
        <View style={themedStyles.bestPricesSection}>
          <Text style={themedStyles.sectionTitle}>Best Prices Today</Text>
          <Text style={themedStyles.sectionSubtitle}>Lowest available market price by product — today</Text>

          <View style={themedStyles.chartCard}>
            {bestPrices.bars.map((bar) => (
              <BestPriceBar
                key={bar.crop}
                bar={bar}
                maxPrice={maxBarPrice}
                colors={colors}
                styles={themedStyles}
              />
            ))}
          </View>

          <View style={themedStyles.statGrid}>
            <StatTile
              tileKey="lowest"
              label="Today's Lowest Price"
              value={`GHS ${bestPrices.lowestOverall?.price.toFixed(2)}/kg`}
              colors={colors}
              styles={themedStyles}
            />
            <StatTile
              tileKey="affordable"
              label="Most Affordable Product"
              value={bestPrices.lowestOverall?.crop || '—'}
              colors={colors}
              styles={themedStyles}
            />
            <StatTile
              tileKey="difference"
              label="Largest Price Difference"
              value={
                bestPrices.largestDifference
                  ? `${bestPrices.largestDifference.crop} — GHS ${bestPrices.largestDifference.difference.toFixed(2)} difference`
                  : '—'
              }
              colors={colors}
              styles={themedStyles}
            />
            <StatTile
              tileKey="updated"
              label="Last Updated"
              value={formatLastUpdated(localDb.priceSummaryFetchedAt)}
              colors={colors}
              styles={themedStyles}
            />
          </View>
        </View>
      )}

      <View style={themedStyles.bestPricesSection}>
        <Text style={themedStyles.sectionTitle}>Stock Availability</Text>
        <Text style={themedStyles.sectionSubtitle}>
          Total quantity currently listed by product, across active listings
        </Text>
        {stockRows.length === 0 ? (
          <View style={themedStyles.emptyCard}>
            <Text style={themedStyles.emptyText}>No active listings yet.</Text>
          </View>
        ) : (
          <View style={themedStyles.chartCard}>
            {stockRows.map((row) => (
              <View key={`${row.cropKey}|${row.unit}`} style={themedStyles.stockRow}>
                <Text style={themedStyles.stockRowCrop} numberOfLines={1}>{row.displayCrop}</Text>
                <Text style={themedStyles.stockRowValue}>
                  Total Available Stock: {row.totalQuantity} {row.unitLabel}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Text style={themedStyles.sectionTitle}>Regional Price Feeds</Text>
      {Object.keys(cropGrouped).length === 0 ? (
        <View style={themedStyles.emptyCard}>
          <Text style={themedStyles.emptyText}>No price bulletins cached. Connect online to fetch latest feeds.</Text>
        </View>
      ) : (
        Object.keys(cropGrouped).map((cropName) => (
          <View key={cropName} style={themedStyles.priceCard}>
            <Text style={themedStyles.priceCardTitle}>{cropName}</Text>
            {cropGrouped[cropName].map((p, idx) => (
              <Pressable
                key={idx}
                style={themedStyles.priceRow}
                onPress={() => onViewTrend?.({ crop: p.crop, market_name: p.market_name, region: p.region })}
              >
                <Text style={themedStyles.priceRowLabel}>{p.market_name} ({p.region})</Text>
                <View style={themedStyles.priceRowRight}>
                  <Text style={themedStyles.priceRowValue}>GHS {Number(p.current).toFixed(2)}/kg</Text>
                  <TrendBadge trend={p.trend} percentChange={p.percentChange} colors={colors} />
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        ))
      )}

      <ReportPriceModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={(report) => {
          submitPriceReport?.(report);
          Alert.alert(
            networkStatus === 'offline' ? 'Queued offline' : 'Price submitted',
            networkStatus === 'offline'
              ? `Your price for ${report.crop} at ${report.market_name} is saved locally and will sync automatically once you're back online.`
              : `Your price for ${report.crop} at ${report.market_name} is syncing now.`
          );
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trendBadgeText: { fontSize: 10, fontWeight: '700' },
});

const getStyles = (colors) =>
  StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  content: { padding: SPACING.lg, paddingBottom: 32, gap: 4 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md + 2,
  },
  screenTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  cachedLabel: { fontSize: 10, color: colors.textMuted },
  reportPriceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  reportPriceBtnText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  pendingBadge: {
    backgroundColor: colors.warning,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  pendingBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: 6,
    ...SHADOW.raised,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  modalSubtitle: { fontSize: 11, color: colors.textMuted, marginBottom: SPACING.sm },
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: SPACING.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 1,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.card,
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.lg,
  },
  modalSubmitText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: SPACING.sm },
  bestPricesSection: { marginBottom: SPACING.lg },
  sectionSubtitle: { fontSize: 10, color: colors.textMuted, marginTop: -6, marginBottom: SPACING.sm },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md + 2,
    gap: 10,
    ...SHADOW.card,
  },
  barRow: { gap: 4 },
  barLabel: { fontSize: 11, fontWeight: '700', color: colors.text },
  barTrack: {
    height: 16,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: RADIUS.pill },
  barValue: { fontSize: 10, fontWeight: '700', color: colors.primaryDark, alignSelf: 'flex-end' },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  stockRowCrop: { fontSize: 12, fontWeight: '800', color: colors.text, flex: 1 },
  stockRowValue: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.sm + 2,
  },
  statTile: {
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    width: '48%',
    gap: 4,
  },
  statIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: { fontSize: 11, color: colors.text, fontWeight: '600' },
  emptyCard: { backgroundColor: colors.card, borderRadius: RADIUS.md, padding: SPACING.lg },
  emptyText: { color: colors.textMuted, fontSize: 12 },
  priceCard: {
    backgroundColor: colors.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md + 2,
    marginBottom: SPACING.md,
    gap: 6,
    ...SHADOW.card,
  },
  priceCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.sm,
    gap: 8,
  },
  priceRowLabel: { fontSize: 12, color: colors.text, fontWeight: '600', flex: 1 },
  priceRowRight: { alignItems: 'flex-end', gap: 2 },
  priceRowValue: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
});
