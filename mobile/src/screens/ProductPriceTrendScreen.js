import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { usePrices } from '../hooks/usePrices';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

const PERIODS = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
];

const CHART_WIDTH = 300;
const CHART_HEIGHT = 120;
const CHART_PAD = 24;

function formatGHS(value) {
  return typeof value === 'number' ? `GHS ${value.toFixed(2)}/kg` : '—';
}

function trendMeta(trend) {
  if (trend === 'up') return { icon: 'trending-up', colorKey: 'success' };
  if (trend === 'down') return { icon: 'trending-down', colorKey: 'danger' };
  return { icon: 'remove', colorKey: 'textMuted' };
}

function TrendBadge({ trend, percentChange, colors, size = 13 }) {
  const { icon, colorKey } = trendMeta(trend);
  const color = colors[colorKey];
  return (
    <View style={styles.trendBadge}>
      <Ionicons name={icon} size={size} color={color} />
      <Text style={[styles.trendBadgeText, { color, fontSize: size - 2 }]}>
        {percentChange != null ? `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%` : 'New'}
      </Text>
    </View>
  );
}

// Builds an SVG line-chart path/points from a real price series — replaces
// the old PriceDashboardScreen chart's hardcoded coordinates.
function PriceLineChart({ points, highest, lowest, colors }) {
  if (points.length < 2) return null;

  const prices = points.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  const usableWidth = CHART_WIDTH - CHART_PAD * 2;
  const usableHeight = CHART_HEIGHT - CHART_PAD;

  const coords = points.map((p, i) => ({
    x: CHART_PAD + (i / (points.length - 1)) * usableWidth,
    y: CHART_PAD - 10 + usableHeight - ((p.price - minPrice) / range) * usableHeight,
    price: p.price,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${CHART_HEIGHT} L ${coords[0].x.toFixed(1)} ${CHART_HEIGHT} Z`;

  return (
    <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
      <Line x1={CHART_PAD} y1={10} x2={CHART_WIDTH - 4} y2={10} stroke={colors.border} strokeWidth="1" />
      <Line x1={CHART_PAD} y1={CHART_HEIGHT / 2} x2={CHART_WIDTH - 4} y2={CHART_HEIGHT / 2} stroke={colors.border} strokeWidth="1" />
      <Line x1={CHART_PAD} y1={CHART_HEIGHT - 4} x2={CHART_WIDTH - 4} y2={CHART_HEIGHT - 4} stroke={colors.border} strokeWidth="1" />

      <Path d={areaPath} fill={colors.primarySoft} />
      <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {coords.map((c, i) => {
        const isHighest = points[i].price === highest;
        const isLowest = points[i].price === lowest;
        if (!isHighest && !isLowest) return null;
        return (
          <Circle
            key={i}
            cx={c.x}
            cy={c.y}
            r="3.5"
            fill={isHighest ? colors.success : colors.danger}
            stroke={colors.card}
            strokeWidth="1"
          />
        );
      })}

      <SvgText x={coords[0].x} y={CHART_HEIGHT - 8} fontSize="8" fill={colors.textMuted}>
        {points[0].date.slice(5)}
      </SvgText>
      <SvgText x={coords[coords.length - 1].x - 24} y={CHART_HEIGHT - 8} fontSize="8" fill={colors.textMuted}>
        {points[points.length - 1].date.slice(5)}
      </SvgText>
    </Svg>
  );
}

export default function ProductPriceTrendScreen({ localDb, params, networkStatus, onBack }) {
  const { colors } = useTheme();
  const themedStyles = getStyles(colors);
  const prices = usePrices();

  const [period, setPeriod] = useState('30d');
  const [activeParams, setActiveParams] = useState(params);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset the period back to 30D whenever a different product is opened.
  useEffect(() => {
    setActiveParams(params);
    setPeriod('30d');
  }, [params?.crop, params?.market_name]);

  useEffect(() => {
    if (!activeParams) return;
    if (networkStatus === 'offline') {
      setHistory(null);
      setError('offline');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    prices
      .getHistory({ crop: activeParams.crop, marketName: activeParams.market_name, period })
      .then((data) => {
        if (cancelled) return;
        setHistory(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load price history');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeParams, period, networkStatus]);

  if (!activeParams) {
    onBack?.();
    return null;
  }

  const trend = history?.trend || 'stable';
  const interpretation = history
    ? `${activeParams.crop} prices have ${
        trend === 'up' ? 'generally increased' : trend === 'down' ? 'generally decreased' : 'stayed relatively stable'
      } over the selected period.`
    : null;

  const cropSummaryRows = (localDb?.priceSummary || []).filter((row) => row.crop === activeParams.crop);
  const priceComparison =
    cropSummaryRows.length > 0
      ? (() => {
          const ranked = [...cropSummaryRows].sort((a, b) => a.current - b.current);
          const cheapest = ranked[0];
          const highest = ranked[ranked.length - 1];
          return { ranked, cheapest, highest, difference: highest.current - cheapest.current };
        })()
      : null;

  return (
    <ScrollView style={themedStyles.list} contentContainerStyle={themedStyles.content}>
      <View style={themedStyles.header}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <View>
          <Text style={themedStyles.cropName}>{activeParams.crop}</Text>
          <Text style={themedStyles.marketLabel}>
            {activeParams.market_name} ({activeParams.region})
          </Text>
        </View>
      </View>

      {priceComparison && priceComparison.ranked.length > 1 && (
        <View>
          <Text style={themedStyles.sectionTitle}>Current Price Comparison</Text>
          <View style={themedStyles.comparisonStatsRow}>
            <Text style={themedStyles.summaryStat}>
              Cheapest: <Text style={themedStyles.summaryStatValue}>{formatGHS(priceComparison.cheapest.current)}</Text>
            </Text>
            <Text style={themedStyles.summaryStat}>
              Highest: <Text style={themedStyles.summaryStatValue}>{formatGHS(priceComparison.highest.current)}</Text>
            </Text>
            <Text style={themedStyles.summaryStat}>
              Diff: <Text style={themedStyles.summaryStatValue}>GHS {priceComparison.difference.toFixed(2)}</Text>
            </Text>
          </View>
          <View style={themedStyles.comparisonCard}>
            {priceComparison.ranked.map((row, idx) => (
              <Pressable
                key={row.market_name}
                onPress={() => setActiveParams({ crop: activeParams.crop, market_name: row.market_name, region: row.region })}
                style={[
                  themedStyles.comparisonRow,
                  row.market_name === activeParams.market_name && themedStyles.comparisonRowActive,
                ]}
              >
                <Text style={themedStyles.comparisonRowLabel}>
                  {idx + 1}. {row.market_name} ({row.region})
                </Text>
                <View style={themedStyles.comparisonRowRight}>
                  <Text style={themedStyles.comparisonRowValue}>{formatGHS(row.current)}</Text>
                  {idx === 0 && (
                    <View style={themedStyles.bestPriceTag}>
                      <Text style={themedStyles.bestPriceTagText}>Best Price</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={themedStyles.periodRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setPeriod(p.key)}
            style={[themedStyles.periodPill, period === p.key && themedStyles.periodPillActive]}
          >
            <Text style={[themedStyles.periodPillText, period === p.key && themedStyles.periodPillTextActive]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {networkStatus === 'offline' ? (
        <View style={themedStyles.stateCard}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.textMuted} />
          <Text style={themedStyles.stateText}>Price history needs a connection. Reconnect to view trends.</Text>
        </View>
      ) : loading ? (
        <View style={themedStyles.stateCard}>
          <Text style={themedStyles.stateText}>Loading price history…</Text>
        </View>
      ) : error ? (
        <View style={themedStyles.stateCard}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={[themedStyles.stateText, { color: colors.danger }]}>
            Couldn't load price history. Please try again.
          </Text>
        </View>
      ) : !history?.points?.length ? (
        <View style={themedStyles.stateCard}>
          <Text style={themedStyles.stateText}>No price records for this period yet.</Text>
        </View>
      ) : (
        <>
          <View style={themedStyles.summaryCard}>
            <View style={themedStyles.summaryTopRow}>
              <Text style={themedStyles.currentPrice}>{formatGHS(history.current)}</Text>
              <TrendBadge trend={trend} percentChange={history.percentChange} colors={colors} />
            </View>
            <View style={themedStyles.summaryStatsRow}>
              <Text style={themedStyles.summaryStat}>
                Highest: <Text style={themedStyles.summaryStatValue}>{formatGHS(history.highest)}</Text>
              </Text>
              <Text style={themedStyles.summaryStat}>
                Lowest: <Text style={themedStyles.summaryStatValue}>{formatGHS(history.lowest)}</Text>
              </Text>
            </View>
            {interpretation && <Text style={themedStyles.interpretation}>{interpretation}</Text>}
          </View>

          <View style={themedStyles.chartCard}>
            <PriceLineChart points={history.points} highest={history.highest} lowest={history.lowest} colors={colors} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trendBadgeText: { fontWeight: '700' },
});

const getStyles = (colors) =>
  StyleSheet.create({
    list: { flex: 1, backgroundColor: colors.bg },
    content: { padding: SPACING.lg, paddingBottom: 32, gap: SPACING.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    cropName: { fontSize: 16, fontWeight: '800', color: colors.text },
    marketLabel: { fontSize: 10, color: colors.textMuted },
    periodRow: { flexDirection: 'row', gap: 6 },
    periodPill: {
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: RADIUS.pill,
    },
    periodPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    periodPillText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
    periodPillTextActive: { color: '#fff' },
    stateCard: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.md,
      padding: SPACING.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    stateText: { color: colors.textMuted, fontSize: 12, flex: 1 },
    summaryCard: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      padding: SPACING.md + 2,
      gap: 8,
      ...SHADOW.card,
    },
    summaryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    currentPrice: { fontSize: 20, fontWeight: '800', color: colors.primaryDark },
    summaryStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryStat: { fontSize: 11, color: colors.textMuted },
    summaryStatValue: { color: colors.text, fontWeight: '700' },
    interpretation: { fontSize: 11, color: colors.text, lineHeight: 16 },
    chartCard: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      ...SHADOW.card,
    },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 6 },
    comparisonStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    comparisonCard: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      padding: SPACING.sm,
      gap: 4,
      ...SHADOW.card,
    },
    comparisonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: RADIUS.sm,
      paddingHorizontal: SPACING.sm + 2,
      paddingVertical: SPACING.sm,
    },
    comparisonRowActive: { backgroundColor: colors.primarySoft },
    comparisonRowLabel: { fontSize: 12, fontWeight: '600', color: colors.text, flex: 1 },
    comparisonRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    comparisonRowValue: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
    bestPriceTag: {
      backgroundColor: colors.primarySoft,
      borderRadius: RADIUS.pill,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    bestPriceTagText: { fontSize: 9, fontWeight: '700', color: colors.success },
  });
