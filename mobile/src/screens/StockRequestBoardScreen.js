import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStockRequests } from '../hooks/useStockRequests';
import { matchRequestAgainstListings } from '../utils/stockRequestMatch';
import { quantityUnit } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

function formatRequiredBy(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

const MATCH_META = {
  full: { label: 'Can potentially supply', icon: 'checkmark-circle', colorKey: 'success' },
  partial: { label: 'Partial supply', icon: 'alert-circle', colorKey: 'warning' },
};

export default function StockRequestBoardScreen({ auth, localDb, ownerId, onBack, onSupply, isGuest, onLoginPress }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const api = useStockRequests(auth);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);
  const [respondedIds, setRespondedIds] = useState(new Set());
  const [error, setError] = useState('');

  const myListings = (localDb?.listings || []).filter((l) => !l.deleted && l.owner_id === ownerId);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await api.listBoard();
      setRequests(rows);
    } catch (e) {
      setError(e.message || 'Could not load buyer requests.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSupply = async (request) => {
    setRespondingId(request.id);
    try {
      const result = await api.respondToRequest(request.id);
      setRespondedIds((prev) => new Set(prev).add(request.id));
      onSupply?.(request, result);
    } catch (e) {
      setError(e.message || 'Could not respond to this request.');
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={requests}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Buyer Requests</Text>
            <Text style={styles.headerSubtitle}>Produce buyers are currently looking for</Text>
          </View>
          <View style={{ width: 20 }} />
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator style={{ marginTop: SPACING.lg }} color={colors.refGreen} />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{error || 'No active buyer requests right now.'}</Text>
          </View>
        )
      }
      renderItem={({ item }) => {
        const match = matchRequestAgainstListings(item, myListings);
        const matchMeta = match ? MATCH_META[match.type] : null;
        const requiredByLabel = formatRequiredBy(item.requiredBy);
        const isOwnRequest = item.buyerId === ownerId;
        const alreadyResponded = respondedIds.has(item.id);

        return (
          <View style={styles.card}>
            <View style={styles.cardTopLine}>
              <Text style={styles.cardTitle}>
                {item.crop} — {item.quantity} {quantityUnit(item.unit, item.quantity)}
              </Text>
              {matchMeta && (
                <View style={[styles.matchPill, { backgroundColor: colors[matchMeta.colorKey] }]}>
                  <Ionicons name={matchMeta.icon} size={10} color="#fff" />
                  <Text style={styles.matchPillText}>{matchMeta.label}</Text>
                </View>
              )}
            </View>

            <View style={styles.cardDetailRow}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={styles.cardDetailText}>
                {item.location}
                {item.region ? `, ${item.region}` : ''}
              </Text>
            </View>
            {item.targetPrice != null && (
              <View style={styles.cardDetailRow}>
                <Ionicons name="cash-outline" size={12} color={colors.textMuted} />
                <Text style={styles.cardDetailText}>Target: GHS {item.targetPrice}/{item.unit}</Text>
              </View>
            )}
            {requiredByLabel && (
              <View style={styles.cardDetailRow}>
                <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                <Text style={styles.cardDetailText}>Needed by {requiredByLabel}</Text>
              </View>
            )}
            {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}
            <Text style={styles.cardBuyer}>
              Buyer needs {item.quantity} {quantityUnit(item.unit, item.quantity)} of {item.crop}
              {item.buyerName ? ` · Posted by ${item.buyerName}` : ''}
            </Text>

            {isOwnRequest ? (
              <View style={styles.ownRequestBadge}>
                <Text style={styles.ownRequestText}>This is your own request</Text>
              </View>
            ) : isGuest ? (
              <Pressable style={styles.guestNotice} onPress={onLoginPress}>
                <Text style={styles.guestNoticeText}>Log in to respond to this request</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.supplyBtn, alreadyResponded && styles.supplyBtnDone]}
                onPress={() => handleSupply(item)}
                disabled={respondingId === item.id || alreadyResponded}
              >
                {respondingId === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name={alreadyResponded ? 'checkmark' : 'hand-left-outline'} size={14} color="#fff" />
                    <Text style={styles.supplyBtnText}>
                      {alreadyResponded ? 'Responded — Chat with Buyer' : 'I Can Supply This'}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        );
      }}
    />
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    list: { flex: 1, backgroundColor: colors.bg },
    content: { padding: SPACING.lg, paddingBottom: 32 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.md + 2,
    },
    headerTitleWrap: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    headerSubtitle: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      padding: SPACING.xl + 4,
      alignItems: 'center',
    },
    emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
    card: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      marginBottom: SPACING.sm + 2,
      gap: 4,
      ...SHADOW.card,
    },
    cardTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    cardTitle: { fontSize: 13, fontWeight: '800', color: colors.text, flex: 1 },
    matchPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      borderRadius: RADIUS.pill,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    matchPillText: { fontSize: 9, fontWeight: '800', color: '#fff' },
    cardDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardDetailText: { fontSize: 11, color: colors.textMuted },
    cardDescription: { fontSize: 11, color: colors.text, marginTop: 2 },
    cardBuyer: { fontSize: 10, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 },
    supplyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.refGreen,
      borderRadius: RADIUS.pill,
      paddingVertical: SPACING.sm + 2,
      marginTop: SPACING.sm,
    },
    supplyBtnDone: { backgroundColor: colors.primary },
    supplyBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    ownRequestBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.refSage,
      borderRadius: RADIUS.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: SPACING.sm,
    },
    ownRequestText: { fontSize: 10, fontWeight: '700', color: colors.refGreen },
    guestNotice: {
      alignItems: 'center',
      paddingVertical: SPACING.sm + 2,
      marginTop: SPACING.sm,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    guestNoticeText: { fontSize: 11, fontWeight: '700', color: colors.refGreen },
  });
