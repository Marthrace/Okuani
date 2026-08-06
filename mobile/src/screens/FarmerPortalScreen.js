import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Select from '../components/Select';
import SearchableSelect from '../components/SearchableSelect';
import { useProfile } from '../hooks/useProfile';
import { buildApiUrl } from '../utils/api';
import { pickImageAsync } from '../utils/imagePicker';
import { CROPS, REGIONS, UNITS } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

export default function FarmerPortalScreen({
  localDb,
  setLocalDb,
  networkStatus,
  hasPendingChanges,
  addLog,
  syncData,
  onSwitchRole,
  ownerId,
  defaultName,
  auth,
  onViewProfile,
  onIdentityPress,
  unreadCount,
  onNotificationsPress,
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  // The hero is meant to bleed edge-to-edge behind the status bar (App.js
  // excludes the top safe-area edge for this screen specifically), so its
  // own top padding needs to account for that inset instead of relying on
  // the outer SafeAreaView to reserve — and separately color — that space.
  const insets = useSafeAreaInsets();
  const [farmerName, setFarmerName] = useState(defaultName || '');

  // The lazy useState initializer above only runs once at mount, so it never
  // picks up a later identity change — e.g. logging out and continuing as
  // guest left the previous account's name sitting in this field. Reset it
  // whenever the signed-in identity actually changes (not on every render,
  // and not while the user is just editing the field).
  useEffect(() => {
    setFarmerName(defaultName || '');
  }, [defaultName]);
  const [crop, setCrop] = useState(CROPS[0]);
  const [customCrop, setCustomCrop] = useState('');
  const [region, setRegion] = useState('');
  const [location, setLocation] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState(UNITS[0]);
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState('+233244123456');
  const [photoDataUri, setPhotoDataUri] = useState(null);
  // Which source (camera/library) is currently loading — not just a single
  // shared boolean, otherwise the Take Photo button (the first one checking
  // it) always renders the spinner even when Upload Photo was the one tapped.
  const [pickingSource, setPickingSource] = useState(null);
  const listRef = useRef(null);

  // The header greeting always shows the signed-in account's own name — it
  // must never react to the Farmer Name field below, which is a per-listing
  // value (a farmer may list under different farm names on different
  // listings) and is intentionally a completely separate piece of state.
  const headerName = (defaultName && defaultName.trim()) || 'Farmer';

  const myListings = localDb.listings.filter((l) => !l.deleted && l.owner_id === ownerId);

  const profileApi = useProfile(auth || {});
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    if (!auth?.token) return;
    profileApi
      .getContacts()
      .then(setContacts)
      .catch(() => setContacts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  const handleAddListing = () => {
    const finalCrop = crop === 'Others' ? customCrop.trim() : crop;
    const finalLocation = location.trim();

    if (!farmerName.trim() || !finalCrop || !qty || !price || !region || !finalLocation) {
      Alert.alert(
        'Missing details',
        crop === 'Others' && !finalCrop
          ? 'Type the crop name, or pick one from the list.'
          : !region
          ? 'Select a region.'
          : !finalLocation
          ? 'Enter the specific location/town.'
          : 'Please fill in all listing details.'
      );
      return;
    }

    const newListing = {
      id: 'list-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      farmer_name: farmerName,
      crop: finalCrop,
      quantity: parseFloat(qty),
      unit,
      price: parseFloat(price),
      region,
      location: finalLocation,
      phone,
      deleted: 0,
      updated_at: Date.now(),
      synced: false,
      owner_id: ownerId,
      image_base64: photoDataUri || null,
    };

    setLocalDb((prev) => ({ ...prev, listings: [newListing, ...prev.listings] }));
    setQty('');
    setPrice('');
    setPhotoDataUri(null);
    setCustomCrop('');
    addLog(`Added ${finalCrop} (${qty} ${unit}) to offline cache. Waiting for network to sync.`, 'info');

    if (networkStatus === 'online') {
      setTimeout(syncData, 500);
    }
  };

  const handlePickPhoto = async (source) => {
    setPickingSource(source);
    try {
      const result = await pickImageAsync({ source, aspect: [4, 3], quality: 0.5 });
      if (!result) return;
      if (result.error === 'permission-denied') {
        Alert.alert(
          'Permission needed',
          source === 'camera' ? 'Allow camera access to photograph your produce.' : 'Allow photo library access to choose a product photo.'
        );
        return;
      }
      if (result.error === 'too-large') {
        Alert.alert('Image too large', 'Please choose a photo under 5MB.');
        return;
      }
      setPhotoDataUri(result.dataUri);
    } finally {
      setPickingSource(null);
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

  const confirmDeleteListing = (listing) => {
    Alert.alert(
      'Delete this listing?',
      `Remove ${listing.crop} (${listing.quantity} ${listing.unit}) from your listings? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteListing(listing.id) },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      {/* Pinned above the scrollable list (not inside ListHeaderComponent),
          so navigation stays put and only "List New Produce" downward
          scrolls beneath it — matching where the user's finger actually
          starts a scroll gesture on the form/listings below. */}
      <View style={[styles.hero, { paddingTop: SPACING.xl + insets.top }]}>
        <View style={styles.heroBrandRow}>
          <Text style={styles.heroBrand}>OKUANI</Text>
          <View style={styles.heroIcons}>
            <Pressable style={styles.heroIconChip} onPress={onIdentityPress} hitSlop={6}>
              <Ionicons name={auth?.isGuest ? 'person-outline' : 'person'} size={14} color="#fff" />
            </Pressable>
            {onNotificationsPress && (
              <Pressable style={styles.heroIconChip} onPress={onNotificationsPress} hitSlop={6}>
                <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={14} color="#fff" />
                {unreadCount > 0 && (
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </Pressable>
            )}
            <View style={styles.heroIconChip}>
              <Ionicons
                name={networkStatus === 'online' ? 'wifi' : 'cloud-offline-outline'}
                size={14}
                color={networkStatus === 'online' ? '#fff' : '#FCA5A5'}
              />
            </View>
            <View style={styles.heroIconChip}>
              <Ionicons name={hasPendingChanges ? 'sync-outline' : 'checkmark-done'} size={14} color="#fff" />
            </View>
          </View>
        </View>

        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroGreeting}>Hello, {headerName.split(' ')[0]}</Text>
            <Text style={styles.heroSubtitle}>Manage your produce listings</Text>
          </View>
        </View>

        <View style={styles.heroCtaRow}>
          <Pressable
            style={styles.heroCtaPrimary}
            onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
          >
            <Text style={styles.heroCtaPrimaryText}>Add Listing</Text>
          </Pressable>
          <Pressable style={styles.heroCtaSecondary} onPress={onSwitchRole}>
            <Text style={styles.heroCtaSecondaryText}>Buyer View</Text>
            <Ionicons name="cart-outline" size={14} color="#fff" />
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.content}
        data={myListings}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <View style={styles.formCard}>
            <Text style={styles.formTitle}>List New Produce</Text>

            <Text style={styles.label}>Farmer Name</Text>
            <TextInput style={styles.input} placeholder="Your name" value={farmerName} onChangeText={setFarmerName} />
            <Text style={styles.hintText}>
              Defaults to your profile name — change it if this listing sells under a different
              farm/business name.
            </Text>

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="+233244123456"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.label}>Region</Text>
            <SearchableSelect
              selectedValue={region}
              onValueChange={setRegion}
              items={REGIONS}
              placeholder="Search regions…"
            />

            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Kumasi"
              value={location}
              onChangeText={setLocation}
            />
            <Text style={styles.hintText}>The specific town/area within the region above.</Text>

            <Text style={styles.label}>Crop Type</Text>
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

            <Text style={styles.label}>Product Photo (optional)</Text>
            {photoDataUri ? (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photoDataUri }} style={styles.photoPreview} />
                <Pressable style={styles.photoRemoveBtn} onPress={() => setPhotoDataUri(null)} hitSlop={8}>
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.photoBtnRow}>
                <Pressable style={styles.photoBtn} onPress={() => handlePickPhoto('camera')} disabled={Boolean(pickingSource)}>
                  {pickingSource === 'camera' ? (
                    <ActivityIndicator size="small" color={colors.refGreen} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={16} color={colors.refGreen} />
                      <Text style={styles.photoBtnText}>Take Photo</Text>
                    </>
                  )}
                </Pressable>
                <Pressable style={styles.photoBtn} onPress={() => handlePickPhoto('library')} disabled={Boolean(pickingSource)}>
                  {pickingSource === 'library' ? (
                    <ActivityIndicator size="small" color={colors.refGreen} />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={16} color={colors.refGreen} />
                      <Text style={styles.photoBtnText}>Upload Photo</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}

            <Pressable style={styles.primaryBtn} onPress={handleAddListing}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Add Listing</Text>
            </Pressable>
          </View>

          {contacts.length > 0 && (
            <View style={styles.contactsSection}>
              <Text style={styles.sectionTitle}>Buyers who contacted you</Text>
              <View style={styles.contactsList}>
                {contacts.map((c) => (
                  <Pressable key={c.id} style={styles.contactRow} onPress={() => onViewProfile?.(c.id)}>
                    {c.avatarUrl ? (
                      <Image source={{ uri: buildApiUrl(c.avatarUrl) }} style={styles.contactAvatar} />
                    ) : (
                      <View style={[styles.contactAvatar, styles.contactAvatarPlaceholder]}>
                        <Ionicons name="person" size={16} color={colors.refGreen} />
                      </View>
                    )}
                    <Text style={styles.contactName}>{c.name}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>My Crop Listings</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{myListings.length}</Text>
            </View>
          </View>
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No crops listed yet. Use the form above to add a listing.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          {item.image_path || item.image_base64 ? (
            <Image
              source={{ uri: item.image_path ? buildApiUrl(item.image_path) : item.image_base64 }}
              style={styles.rowIcon}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.rowIcon}>
              <Ionicons name="leaf-outline" size={20} color={colors.refGreen} />
            </View>
          )}
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{item.crop}</Text>
            <Text style={styles.rowSubtitle}>
              {item.quantity} {item.unit} · {item.location}{item.region ? `, ${item.region}` : ''}
            </Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.rowPrice}>GHS {item.price}</Text>
            {item.synced ? (
              <View style={[styles.statusPill, styles.statusPillSynced]}>
                <Ionicons name="checkmark" size={10} color="#fff" />
                <Text style={styles.statusPillText}>Added</Text>
              </View>
            ) : (
              <View style={[styles.statusPill, styles.statusPillPending]}>
                <Ionicons name="time-outline" size={10} color="#fff" />
                <Text style={styles.statusPillText}>Pending</Text>
              </View>
            )}
            <Pressable onPress={() => confirmDeleteListing(item)} hitSlop={8} style={styles.rowDelete}>
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
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
  list: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32 },
  hero: {
    backgroundColor: colors.refGreen,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    marginBottom: SPACING.lg,
    gap: SPACING.lg,
  },
  heroBrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  heroBrand: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: 1.5 },
  heroIcons: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  heroIconChip: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroGreeting: { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroSubtitle: { fontSize: 12, color: '#CFE3D6', marginTop: 2 },
  heroCtaRow: { flexDirection: 'row', gap: 10 },
  heroCtaPrimary: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
  },
  heroCtaPrimaryText: { color: colors.refGreen, fontWeight: '800', fontSize: 13 },
  heroCtaSecondary: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
  },
  heroCtaSecondaryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: 4,
    ...SHADOW.card,
  },
  formTitle: {
    fontWeight: '800',
    fontSize: 14,
    marginBottom: SPACING.sm,
    color: colors.text,
  },
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
  hintText: { fontSize: 10, color: colors.textMuted, marginTop: 3 },
  customFieldInput: { marginTop: 6 },
  rowGrid: { flexDirection: 'row', gap: 10 },
  flexItem: { flex: 1 },
  photoBtnRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
  },
  photoBtnText: { fontSize: 12, fontWeight: '700', color: colors.refGreen },
  photoPreviewWrap: { marginTop: 2 },
  photoPreview: { width: '100%', height: 140, borderRadius: RADIUS.md },
  photoRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  countPill: {
    backgroundColor: colors.refSage,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countPillText: { fontSize: 11, fontWeight: '800', color: colors.refGreen },
  contactsSection: { marginHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  contactsList: {
    backgroundColor: colors.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactAvatar: { width: 34, height: 34, borderRadius: 17 },
  contactAvatarPlaceholder: { backgroundColor: colors.refSage, alignItems: 'center', justifyContent: 'center' },
  contactName: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '700' },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl + 4,
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
  },
  emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    backgroundColor: colors.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm + 2,
    ...SHADOW.card,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: colors.refSage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  rowSubtitle: { fontSize: 11, color: colors.textMuted },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowPrice: { fontSize: 13, fontWeight: '800', color: colors.refGreen },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusPillSynced: { backgroundColor: colors.success },
  statusPillPending: { backgroundColor: colors.warning },
  statusPillText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  rowDelete: { marginTop: 2 },
});
