import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

export default function ListingCard({ listing, footer }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.crop}>{listing.crop}</Text>
        <Text style={styles.qty}>{listing.quantity} {listing.unit}</Text>
      </View>

      <View style={styles.details}>
        <View style={styles.inlineRow}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
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

const getStyles = (colors) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  crop: {
    fontWeight: '800',
    fontSize: 15,
    color: colors.text,
  },
  qty: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  details: {
    gap: 4,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  bold: {
    fontWeight: '700',
    color: colors.text,
  },
  priceLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  price: {
    fontWeight: '800',
    fontSize: 16,
    color: colors.primaryDark,
  },
});
