import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

const FAQS = [
  {
    q: 'How do I list produce for sale?',
    a: 'Switch to the Farmer Portal (bottom nav or "Farmer View"), fill in the "List New Produce" form — crop, quantity, unit, region, location, and price — then tap Add Listing. It appears under "My Crop Listings" immediately and syncs to the server automatically once you\'re online.',
  },
  {
    q: 'How do I find produce to buy?',
    a: 'The Marketplace screen (Buyer View) lists everything currently for sale. Search by crop, farmer, or location, filter by region, or expand "Price & quantity filters" to narrow by price range or minimum quantity available.',
  },
  {
    q: 'What is "Request Stock"?',
    a: 'If you need a product that isn\'t currently listed, post a Stock Request (crop, quantity, region/location, target price) from the Marketplace screen. Sellers can browse open requests on their own "Buyer Requests" board and reach out if they can supply it.',
  },
  {
    q: 'How do I message a seller or buyer?',
    a: 'Tap Chat on any listing (or "I Can Supply This" on a buyer request) to open a conversation. All your active conversations are also available from the notification bell icon.',
  },
  {
    q: 'Does the app work without internet?',
    a: 'Yes — OKUANI is offline-first. Listings and messages you create while offline are queued locally and sync automatically the next time you\'re connected. The wifi/sync icons in the header show your current connection and sync status.',
  },
  {
    q: 'How do I check market prices?',
    a: 'The Market Dashboard shows today\'s best prices by product and region, plus historical price trends — tap any market row to see its full price history chart.',
  },
  {
    q: 'How do reviews and phone verification work?',
    a: 'After messaging someone, you can leave a rating and review on their profile. Verifying your phone number (from your own profile) adds a trust badge other users can see before dealing with you.',
  },
  {
    q: 'How do I report a problem with another user?',
    a: 'Open the ☰ menu and choose "Report". Enter their username exactly as shown on their profile, pick a reason, and add any details — you don\'t need to have messaged them first.',
  },
];

export default function HelpScreen({ onBack }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Help for Users</Text>
        <View style={{ width: 20 }} />
      </View>

      <Text style={styles.intro}>
        Quick answers to common questions about using OKUANI. If you run into something not
        covered here, message a seller/buyer directly or use Report (☰ menu) for account issues.
      </Text>

      {FAQS.map((item, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.question}>{item.q}</Text>
          <Text style={styles.answer}>{item.a}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: SPACING.lg, paddingBottom: 32, gap: SPACING.md },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    headerTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    intro: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginBottom: SPACING.xs },
    card: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      padding: SPACING.md + 2,
      gap: 6,
      ...SHADOW.card,
    },
    question: { fontSize: 13, fontWeight: '800', color: colors.text },
    answer: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  });
