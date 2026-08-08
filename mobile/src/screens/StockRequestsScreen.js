import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Select from '../components/Select';
import SearchableSelect from '../components/SearchableSelect';
import { useStockRequests } from '../hooks/useStockRequests';
import { CROPS, REGIONS, UNITS, quantityUnit } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

const STATUS_META = {
  ACTIVE: { label: 'Active', styleKey: 'statusPillActive' },
  FULFILLED: { label: 'Fulfilled', styleKey: 'statusPillFulfilled' },
  CLOSED: { label: 'Closed', styleKey: 'statusPillClosed' },
};

function formatRequiredBy(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

// Accepts "YYYY-MM-DD" (the format the hint text below the field asks for)
// and returns a UTC midnight timestamp, or null for empty/unparseable input
// — there's no native date picker in this project yet (see FarmerPortalScreen
// for the same plain-text-input precedent with Location), so this stays a
// simple parse rather than pulling in a new dependency for one field.
function parseRequiredByInput(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(`${trimmed}T00:00:00Z`);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export default function StockRequestsScreen({ auth, onBack, isGuest, onLoginPress }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const api = useStockRequests(auth);

  const [crop, setCrop] = useState(CROPS[0]);
  const [customCrop, setCustomCrop] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState(UNITS[0]);
  const [region, setRegion] = useState('');
  const [location, setLocation] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [description, setDescription] = useState('');
  const [requiredBy, setRequiredBy] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadMine = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await api.listMine();
      setMyRequests(rows);
    } catch (e) {
      // Leave the previous list in place rather than clearing it on a
      // transient network error — matches how other screens in this app
      // degrade (e.g. useProfile's contacts fetch).
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  const handlePost = async () => {
    const finalCrop = crop === 'Others' ? customCrop.trim() : crop;
    const finalLocation = location.trim();
    const parsedRequiredBy = parseRequiredByInput(requiredBy);

    if (!finalCrop || !quantity || !unit || !region || !finalLocation) {
      Alert.alert(
        'Missing details',
        crop === 'Others' && !finalCrop
          ? 'Type the crop name, or pick one from the list.'
          : !region
          ? 'Select a region.'
          : !finalLocation
          ? 'Enter the specific location/town.'
          : 'Please fill in the product, quantity, unit, region, and location.'
      );
      return;
    }
    if (parsedRequiredBy === undefined) {
      Alert.alert('Invalid date', 'Enter the required-by date as YYYY-MM-DD, or leave it blank.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createRequest({
        crop: finalCrop,
        quantity: parseFloat(quantity),
        unit,
        region,
        location: finalLocation,
        targetPrice: targetPrice ? parseFloat(targetPrice) : null,
        description: description.trim() || null,
        requiredBy: parsedRequiredBy,
      });
      setQuantity('');
      setCustomCrop('');
      setTargetPrice('');
      setDescription('');
      setRequiredBy('');
      await loadMine();
    } catch (e) {
      Alert.alert('Could not post request', e.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (request) => {
    Alert.alert('Close this request?', `Stop showing "${request.crop}" to sellers? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close Request',
        style: 'destructive',
        onPress: async () => {
          setBusyId(request.id);
          try {
            await api.closeRequest(request.id);
            await loadMine();
          } catch (e) {
            Alert.alert('Could not close request', e.message || 'Please try again.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const handleFulfill = (request) => {
    Alert.alert('Mark as fulfilled?', `Mark "${request.crop}" as fulfilled? It will stop showing to sellers.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Fulfilled',
        onPress: async () => {
          setBusyId(request.id);
          try {
            await api.fulfillRequest(request.id);
            await loadMine();
          } catch (e) {
            Alert.alert('Could not update request', e.message || 'Please try again.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={myRequests}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          <View style={styles.headerRow}>
            <Pressable onPress={onBack} hitSlop={8}>
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Stock Requests</Text>
            <View style={{ width: 20 }} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Request Stock</Text>
            <Text style={styles.formSubtitle}>
              Post what you're looking to buy — sellers with matching stock can respond.
            </Text>

            <Text style={styles.label}>Product / Crop</Text>
            <Select selectedValue={crop} onValueChange={setCrop} items={CROPS} />
            {crop === 'Others' && (
              <TextInput
                style={[styles.input, styles.customFieldInput]}
                placeholder="Type the crop name"
                value={customCrop}
                onChangeText={setCustomCrop}
              />
            )}

            <View style={styles.rowGrid}>
              <View style={styles.flexItem}>
                <Text style={styles.label}>Quantity Required</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 500"
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={styles.flexItem}>
                <Text style={styles.label}>Unit</Text>
                <Select selectedValue={unit} onValueChange={setUnit} items={UNITS} />
              </View>
            </View>

            <Text style={styles.label}>Preferred Region</Text>
            <SearchableSelect selectedValue={region} onValueChange={setRegion} items={REGIONS} placeholder="Search regions…" />

            <Text style={styles.label}>Preferred Location</Text>
            <TextInput style={styles.input} placeholder="e.g. Kumasi" value={location} onChangeText={setLocation} />

            <Text style={styles.label}>Target Price per unit (GHS, optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 8.00"
              keyboardType="numeric"
              value={targetPrice}
              onChangeText={setTargetPrice}
            />

            <Text style={styles.label}>Required By (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={requiredBy}
              onChangeText={setRequiredBy}
            />

            <Text style={styles.label}>Additional requirements/description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Good quality, fresh tomatoes"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {isGuest ? (
              <Pressable onPress={onLoginPress} style={styles.guestNotice}>
                <Text style={styles.guestNoticeText}>Log in to post a stock request.</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryBtn} onPress={handlePost} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="megaphone-outline" size={16} color="#fff" />
                    <Text style={styles.primaryBtnText}>Post Stock Request</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>My Requests</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{myRequests.length}</Text>
            </View>
          </View>
        </>
      }
      ListEmptyComponent={
        isGuest ? (
          <Pressable onPress={onLoginPress} style={styles.emptyCard}>
            <Text style={styles.emptyText}>Log in to see and manage your stock requests.</Text>
          </Pressable>
        ) : loading ? (
          <ActivityIndicator style={{ marginTop: SPACING.lg }} color={colors.refGreen} />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No stock requests yet. Use the form above to post one.</Text>
          </View>
        )
      }
      renderItem={({ item }) => {
        const statusMeta = STATUS_META[item.status] || STATUS_META.ACTIVE;
        const requiredByLabel = formatRequiredBy(item.requiredBy);
        return (
          <View style={styles.row}>
            <View style={styles.rowTopLine}>
              <Text style={styles.rowTitle}>
                {item.crop} — {item.quantity} {quantityUnit(item.unit, item.quantity)}
              </Text>
              <View style={[styles.statusPill, styles[statusMeta.styleKey]]}>
                <Text style={styles.statusPillText}>{statusMeta.label}</Text>
              </View>
            </View>
            <Text style={styles.rowSubtitle}>
              {item.location}
              {item.region ? `, ${item.region}` : ''}
              {item.targetPrice ? ` · Target GHS ${item.targetPrice}/${item.unit}` : ''}
            </Text>
            {requiredByLabel && <Text style={styles.rowMeta}>Needed by {requiredByLabel}</Text>}
            {item.description ? <Text style={styles.rowDescription}>{item.description}</Text> : null}
            <Text style={styles.rowMeta}>
              {item.responseCount || 0} seller{item.responseCount === 1 ? '' : 's'} responded
            </Text>

            {item.status === 'ACTIVE' && (
              <View style={styles.rowActions}>
                <Pressable
                  style={styles.rowActionBtn}
                  onPress={() => handleFulfill(item)}
                  disabled={busyId === item.id}
                >
                  <Ionicons name="checkmark-circle-outline" size={14} color={colors.refGreen} />
                  <Text style={styles.rowActionText}>Mark Fulfilled</Text>
                </Pressable>
                <Pressable
                  style={styles.rowActionBtn}
                  onPress={() => handleClose(item)}
                  disabled={busyId === item.id}
                >
                  <Ionicons name="close-circle-outline" size={14} color={colors.danger} />
                  <Text style={[styles.rowActionText, { color: colors.danger }]}>Close</Text>
                </Pressable>
              </View>
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
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md + 2,
    },
    headerTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    formCard: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      marginBottom: SPACING.lg,
      gap: 4,
      ...SHADOW.card,
    },
    formTitle: { fontWeight: '800', fontSize: 14, color: colors.text },
    formSubtitle: { fontSize: 11, color: colors.textMuted, marginBottom: SPACING.sm, marginTop: 2 },
    label: { fontSize: 11, color: colors.textMuted, marginTop: SPACING.sm, marginBottom: 4, fontWeight: '600' },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm + 1,
      fontSize: 13,
      color: colors.text,
    },
    textArea: { minHeight: 64, textAlignVertical: 'top' },
    customFieldInput: { marginTop: 6 },
    rowGrid: { flexDirection: 'row', gap: 10 },
    flexItem: { flex: 1 },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.refGreen,
      borderRadius: RADIUS.pill,
      paddingVertical: SPACING.md,
      marginTop: SPACING.md,
    },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    guestNotice: {
      alignItems: 'center',
      paddingVertical: SPACING.md,
      marginTop: SPACING.md,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    guestNoticeText: { fontSize: 12, fontWeight: '700', color: colors.refGreen },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
    countPill: {
      backgroundColor: colors.refSage,
      borderRadius: RADIUS.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    countPillText: { fontSize: 11, fontWeight: '800', color: colors.refGreen },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      padding: SPACING.xl + 4,
      alignItems: 'center',
    },
    emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
    row: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      marginBottom: SPACING.sm + 2,
      gap: 4,
      ...SHADOW.card,
    },
    rowTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    rowTitle: { fontSize: 13, fontWeight: '800', color: colors.text, flex: 1 },
    rowSubtitle: { fontSize: 11, color: colors.textMuted },
    rowMeta: { fontSize: 10, color: colors.textMuted },
    rowDescription: { fontSize: 11, color: colors.text, marginTop: 2 },
    rowActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
    rowActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rowActionText: { fontSize: 11, fontWeight: '700', color: colors.refGreen },
    statusPill: { borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
    statusPillActive: { backgroundColor: colors.success },
    statusPillFulfilled: { backgroundColor: colors.refGreen },
    statusPillClosed: { backgroundColor: colors.textMuted },
    statusPillText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  });
