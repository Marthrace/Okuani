import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ListingCard from '../components/ListingCard';
import Select from '../components/Select';
import { COLORS, LOCATIONS } from '../utils/constants';

const LOCATION_OPTIONS = [{ label: 'All Regions', value: 'All' }, ...LOCATIONS];

export default function BuyerPortalScreen({ localDb, onSwitchRole, onMessageFarmer }) {
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
      ListHeaderComponent={
        <>
          <View style={styles.headerRow}>
            <Text style={styles.screenTitle}>Buyer Portal</Text>
            <Pressable style={styles.outlineBtn} onPress={onSwitchRole}>
              <Text style={styles.outlineBtnText}>Switch Role</Text>
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search crop or farmer..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.filterRow}>
            <Ionicons name="filter-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.filterLabel}>Location:</Text>
            <View style={styles.pickerFlex}>
              <Select selectedValue={filterLocation} onValueChange={setFilterLocation} items={LOCATION_OPTIONS} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Available Produce ({filteredListings.length})</Text>
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No crops found matching criteria.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <ListingCard
          listing={item}
          footer={
            <Pressable style={styles.chatBtn} onPress={() => onMessageFarmer(item)}>
              <Ionicons name="send" size={12} color="#fff" />
              <Text style={styles.chatBtnText}>Chat</Text>
            </Pressable>
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  screenTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  outlineBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  outlineBtnText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  searchWrap: { position: 'relative', justifyContent: 'center', marginBottom: 8 },
  searchIcon: { position: 'absolute', left: 10, zIndex: 1 },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 9,
    paddingLeft: 32,
    paddingRight: 10,
    fontSize: 13,
    backgroundColor: COLORS.card,
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  filterLabel: { fontSize: 12, color: COLORS.textMuted },
  pickerFlex: { flex: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chatBtnText: { color: '#fff', fontWeight: '700', fontSize: 11 },
});
