import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

export default function ListingCard({ listing, footer }) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.crop}>{listing.crop}</Text>
        <Text style={styles.qty}>{listing.quantity} {listing.unit}</Text>
      </View>

      <View style={styles.details}>
        <View style={styles.inlineRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.detailText}>{listing.location}</Text>
        </View>
        <Text style={styles.detailText}>Farmer: <Text style={styles.bold}>{listing.farmer_name}</Text></Text>
        <Text style={styles.detailText}>Phone: <Text style={styles.bold}>{listing.phone}</Text></Text>
      </View>

      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.priceLabel}>Price per unit</Text>
          <Text style={styles.price}>GHS {listing.price}</Text>
        </View>
        {footer}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  crop: {
    fontWeight: '700',
    fontSize: 14,
    color: COLORS.text,
  },
  qty: {
    fontSize: 11,
    color: COLORS.textMuted,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  details: {
    gap: 3,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.text,
  },
  priceLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  price: {
    fontWeight: '800',
    fontSize: 15,
    color: COLORS.primary,
  },
});
