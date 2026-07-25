import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ListingCard from '../components/ListingCard';
import Select from '../components/Select';
import { COLORS, CROPS, LOCATIONS, UNITS } from '../utils/constants';

export default function FarmerPortalScreen({ localDb, setLocalDb, networkStatus, addLog, syncData, onSwitchRole }) {
  const [farmerName] = useState('Kwame Boateng');
  const [crop, setCrop] = useState(CROPS[0]);
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState(UNITS[0]);
  const [price, setPrice] = useState('');
  const [phone] = useState('+233244123456');

  const myListings = localDb.listings.filter((l) => !l.deleted && l.farmer_name === farmerName);

  const handleAddListing = () => {
    if (!crop || !qty || !price || !location) {
      Alert.alert('Missing details', 'Please fill in all listing details.');
      return;
    }

    const newListing = {
      id: 'list-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      farmer_name: farmerName,
      crop,
      quantity: parseFloat(qty),
      unit,
      price: parseFloat(price),
      location,
      phone,
      deleted: 0,
      updated_at: Date.now(),
      synced: false,
    };

    setLocalDb((prev) => ({ ...prev, listings: [newListing, ...prev.listings] }));
    setQty('');
    setPrice('');
    addLog(`Added ${crop} (${qty} ${unit}) to offline cache. Waiting for network to sync.`, 'info');

    if (networkStatus === 'online') {
      setTimeout(syncData, 500);
    }
  };

  const handleDeleteListing = (id) => {
    setLocalDb((prev) => ({
      ...prev,
      listings: prev.listings.map((l) =>
        l.id === id ? { ...l, deleted: 1, updated_at: Date.now(), synced: false } : l
      ),
    }));
    addLog(`Marked listing ${id} as deleted in local cache. Sync pending.`, 'warning');
    if (networkStatus === 'online') {
      setTimeout(syncData, 500);
    }
  };

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={myListings}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          <View style={styles.headerRow}>
            <Text style={styles.screenTitle}>Farmer Portal</Text>
            <Pressable style={styles.outlineBtn} onPress={onSwitchRole}>
              <Text style={styles.outlineBtnText}>Switch Role</Text>
            </Pressable>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>List New Produce</Text>

            <Text style={styles.label}>Crop Type</Text>
            <Select selectedValue={crop} onValueChange={setCrop} items={CROPS} />

            <Text style={styles.label}>Location</Text>
            <Select selectedValue={location} onValueChange={setLocation} items={LOCATIONS} />

            <View style={styles.rowGrid}>
              <View style={styles.flexItem}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 50"
                  keyboardType="numeric"
                  value={qty}
                  onChangeText={setQty}
                />
              </View>
              <View style={styles.flexItem}>
                <Text style={styles.label}>Unit</Text>
                <Select selectedValue={unit} onValueChange={setUnit} items={UNITS} />
              </View>
            </View>

            <Text style={styles.label}>Price per unit (GHS)</Text>
            <TextInput
              style={styles.input}
              placeholder="GHS 350.00"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />

            <Pressable style={styles.primaryBtn} onPress={handleAddListing}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Add Listing</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>My Crop Listings ({myListings.length})</Text>
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No crops listed yet. Use the form above to add a listing.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <ListingCard
          listing={item}
          footer={
            <View style={styles.footerRow}>
              {item.synced ? (
                <View style={styles.statusRow}>
                  <Ionicons name="checkmark-done" size={12} color={COLORS.success} />
                  <Text style={styles.syncedText}>Synced</Text>
                </View>
              ) : (
                <View style={styles.statusRow}>
                  <Ionicons name="cloud-offline-outline" size={12} color={COLORS.warning} />
                  <Text style={styles.pendingText}>Sync Queue</Text>
                </View>
              )}
              <Pressable onPress={() => handleDeleteListing(item.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
              </Pressable>
            </View>
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
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: {
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
    color: COLORS.text,
  },
  label: { fontSize: 11, color: COLORS.textMuted, marginTop: 8, marginBottom: 3, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.text,
  },
  rowGrid: { flexDirection: 'row', gap: 10 },
  flexItem: { flex: 1 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 12,
    marginTop: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
  footerRow: { alignItems: 'flex-end', gap: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  syncedText: { fontSize: 10, color: COLORS.success, fontWeight: '700' },
  pendingText: { fontSize: 10, color: COLORS.warning, fontWeight: '700' },
});
