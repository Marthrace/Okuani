import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Select from '../components/Select';
import { buildApiUrl } from '../utils/api';
import { LOCATIONS } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

const LOCATION_OPTIONS = [{ label: 'All Regions', value: 'All' }, ...LOCATIONS];

export default function BuyerPortalScreen({ localDb, onSwitchRole, onMessageFarmer, onViewProfile }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('All');

  const activeListings = localDb.listings.filter((l) => !l.deleted);
  const filteredListings = activeListings.filter((l) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = l.crop.toLowerCase().includes(q) || l.farmer_name.toLowerCase().includes(q);
    const matchesLocation = filterLocation === 'All' || l.location === filterLocation;
    return matchesSearch && matchesLocation;
  });

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={filteredListings}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.columnWrapper}
      ListHeaderComponent={
        <>
          <View style={styles.headerRow}>
            <Text style={styles.screenTitle}>Marketplace</Text>
            <Pressable style={styles.outlineBtn} onPress={onSwitchRole}>
              <Text style={styles.outlineBtnText}>Farmer View</Text>
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search crop or farmer..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.filterRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.filterLabel}>Region:</Text>
            <View style={styles.pickerFlex}>
              <Select selectedValue={filterLocation} onValueChange={setFilterLocation} items={LOCATION_OPTIONS} />
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Available Produce</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{filteredListings.length}</Text>
            </View>
          </View>
        </>
      }
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
          <Text style={styles.cardSubtitle} numberOfLines={1}>{item.location}</Text>
          <Text style={styles.cardPrice}>GHS {item.price}<Text style={styles.cardUnit}> /{item.unit}</Text></Text>

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
  screenTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.refGreen,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  outlineBtnText: { fontSize: 11, color: colors.refGreen, fontWeight: '700' },
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
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.md + 2 },
  filterLabel: { fontSize: 12, color: colors.textMuted },
  pickerFlex: { flex: 1 },
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
