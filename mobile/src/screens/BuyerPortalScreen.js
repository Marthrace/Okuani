import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Select from '../components/Select';
import { buildApiUrl } from '../utils/api';
import { REGIONS, quantityUnit, singularUnit } from '../utils/constants';
import { normalizeCrop, normalizeLocation } from '../utils/normalize';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

const REGION_OPTIONS = [{ label: 'All Regions', value: 'All' }, ...REGIONS];

export default function BuyerPortalScreen({ localDb, onSwitchRole, onMessageFarmer, onViewProfile, onRequestStock }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState('All');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minQuantity, setMinQuantity] = useState('');

  const minPriceNum = parseFloat(minPrice);
  const maxPriceNum = parseFloat(maxPrice);
  const minQuantityNum = parseFloat(minQuantity);
  const hasMoreFiltersApplied = minPrice !== '' || maxPrice !== '' || minQuantity !== '';

  const activeListings = localDb.listings.filter((l) => !l.deleted);
  const filteredListings = activeListings.filter((l) => {
    const cropQuery = normalizeCrop(searchQuery);
    const locationQuery = normalizeLocation(searchQuery);
    // Crop and location matching both go through the same normalized keys
    // used everywhere else (stock analysis, trends, ...) so casing/
    // whitespace never causes a real match to be missed; farmer name search
    // stays a plain case-insensitive substring check since it isn't an
    // analytics key.
    const matchesSearch =
      normalizeCrop(l.crop).includes(cropQuery) ||
      normalizeLocation(l.location).includes(locationQuery) ||
      l.farmer_name.toLowerCase().includes(searchQuery.toLowerCase());
    // Region is a fixed, predefined vocabulary selected from a dropdown on
    // both ends, so an exact match is correct — no normalization needed.
    // Older listings synced before the Region field existed have
    // region: null and are simply excluded once a specific region is
    // picked (see item 8, backward compatibility).
    const matchesRegion = filterRegion === 'All' || l.region === filterRegion;
    const matchesMinPrice = Number.isNaN(minPriceNum) || l.price >= minPriceNum;
    const matchesMaxPrice = Number.isNaN(maxPriceNum) || l.price <= maxPriceNum;
    const matchesQuantity = Number.isNaN(minQuantityNum) || l.quantity >= minQuantityNum;
    return matchesSearch && matchesRegion && matchesMinPrice && matchesMaxPrice && matchesQuantity;
  });

  return (
    <View style={styles.screen}>
      {/* Pinned above the scrollable grid (not inside ListHeaderComponent),
          so navigation stays put and only "Available Produce" downward
          scrolls beneath it. */}
      <View style={styles.fixedHeader}>
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Marketplace</Text>
          <Pressable style={styles.outlineBtn} onPress={onSwitchRole}>
            <Text style={styles.outlineBtnText}>Farmer View</Text>
          </Pressable>
        </View>

        {onRequestStock && (
          <Pressable style={styles.requestStockBtn} onPress={onRequestStock}>
            <Ionicons name="megaphone-outline" size={15} color="#fff" />
            <Text style={styles.requestStockBtnText}>Request Stock</Text>
            <Text style={styles.requestStockBtnSubtext}>— tell sellers what you need</Text>
          </Pressable>
        )}

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search crop, farmer, or location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.filterLabel}>Region:</Text>
          <View style={styles.pickerFlex}>
            <Select selectedValue={filterRegion} onValueChange={setFilterRegion} items={REGION_OPTIONS} />
          </View>
        </View>

        <Pressable style={styles.moreFiltersToggle} onPress={() => setShowMoreFilters((v) => !v)}>
          <Ionicons name="options-outline" size={14} color={colors.refGreen} />
          <Text style={styles.moreFiltersToggleText}>
            {showMoreFilters ? 'Hide price & quantity filters' : 'Price & quantity filters'}
          </Text>
          {hasMoreFiltersApplied && <View style={styles.filterActiveDot} />}
          <Ionicons
            name={showMoreFilters ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.textMuted}
          />
        </Pressable>

        {showMoreFilters && (
          <View style={styles.moreFiltersPanel}>
            <Text style={styles.filterLabel}>Price range (GHS)</Text>
            <View style={styles.rangeRow}>
              <TextInput
                style={[styles.rangeInput, styles.flexItem]}
                placeholder="Min"
                keyboardType="numeric"
                value={minPrice}
                onChangeText={setMinPrice}
              />
              <Text style={styles.rangeDash}>–</Text>
              <TextInput
                style={[styles.rangeInput, styles.flexItem]}
                placeholder="Max"
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={setMaxPrice}
              />
            </View>
            <Text style={[styles.filterLabel, styles.minQtyLabel]}>Minimum quantity available</Text>
            <TextInput
              style={styles.rangeInput}
              placeholder="e.g. 50"
              keyboardType="numeric"
              value={minQuantity}
              onChangeText={setMinQuantity}
            />
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Available Produce</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{filteredListings.length}</Text>
          </View>
        </View>
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={filteredListings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No crops found matching criteria.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          {item.image_path ? (
            <Image source={{ uri: buildApiUrl(item.image_path) }} style={styles.cardIcon} resizeMode="cover" />
          ) : (
            <View style={styles.cardIcon}>
              <Ionicons name="leaf-outline" size={26} color={colors.refGreen} />
            </View>
          )}
          <Text style={styles.cardTitle} numberOfLines={1}>{item.crop}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {item.location}{item.region ? `, ${item.region}` : ''}
          </Text>
          <Text style={styles.cardPrice}>GHS {item.price}<Text style={styles.cardUnit}> /{singularUnit(item.unit)}</Text></Text>
          {item.quantity > 0 ? (
            <Text style={styles.cardAvailability} numberOfLines={1}>
              Available: {item.quantity} {quantityUnit(item.unit, item.quantity)}
            </Text>
          ) : (
            <Text style={styles.cardOutOfStock}>Out of stock</Text>
          )}

          <View style={styles.cardActions}>
            {item.owner_id && onViewProfile && (
              <Pressable style={styles.profileBtn} onPress={() => onViewProfile(item.owner_id)}>
                <Ionicons name="person-circle-outline" size={16} color={colors.refGreen} />
              </Pressable>
            )}
            <Pressable style={styles.chatBtn} onPress={() => onMessageFarmer(item)}>
              <Ionicons name="send" size={12} color="#fff" />
              <Text style={styles.chatBtnText}>Chat</Text>
            </Pressable>
          </View>
        </View>
      )}
      />
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  fixedHeader: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, backgroundColor: colors.bg },
  list: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md + 2,
  },
  screenTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.refGreen,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  outlineBtnText: { fontSize: 11, color: colors.refGreen, fontWeight: '700' },
  requestStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.refGreen,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    marginBottom: SPACING.sm + 2,
  },
  requestStockBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  requestStockBtnSubtext: { color: '#CFE3D6', fontSize: 10, flexShrink: 1 },
  searchWrap: { position: 'relative', justifyContent: 'center', marginBottom: SPACING.sm },
  searchIcon: { position: 'absolute', left: SPACING.md - 2, zIndex: 1 },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.sm + 1,
    paddingLeft: 34,
    paddingRight: SPACING.md,
    fontSize: 13,
    backgroundColor: colors.card,
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm + 2 },
  filterLabel: { fontSize: 12, color: colors.textMuted },
  pickerFlex: { flex: 1 },
  moreFiltersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.xs + 2,
    marginBottom: SPACING.sm,
  },
  moreFiltersToggleText: { fontSize: 12, color: colors.refGreen, fontWeight: '700', flex: 1 },
  filterActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.refGreen,
  },
  moreFiltersPanel: {
    backgroundColor: colors.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.md,
    gap: 6,
    marginBottom: SPACING.md + 2,
  },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rangeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 1,
    fontSize: 13,
    color: colors.text,
  },
  flexItem: { flex: 1 },
  rangeDash: { color: colors.textMuted, fontSize: 13 },
  minQtyLabel: { marginTop: 4 },
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
  columnWrapper: { justifyContent: 'space-between' },
  card: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  cardIcon: {
    width: '100%',
    height: 64,
    borderRadius: RADIUS.md,
    backgroundColor: colors.refSage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  cardSubtitle: { fontSize: 10, color: colors.textMuted, marginTop: 1, marginBottom: 4 },
  cardPrice: { fontSize: 13, fontWeight: '800', color: colors.refGreen },
  cardUnit: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
  cardAvailability: { fontSize: 10, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  cardOutOfStock: { fontSize: 10, fontWeight: '800', color: colors.danger, marginTop: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  profileBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.refGreen,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.sm - 1,
  },
  chatBtnText: { color: '#fff', fontWeight: '700', fontSize: 11 },
});
