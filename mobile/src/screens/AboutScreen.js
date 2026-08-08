import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

const APP_VERSION = '1.0.0';

const FEATURES = [
  { icon: 'leaf-outline', text: 'List and browse crop produce directly between farmers and buyers' },
  { icon: 'megaphone-outline', text: 'Post stock requests so sellers can find and respond to real demand' },
  { icon: 'chatbubbles-outline', text: 'Message and negotiate directly, with no middleman' },
  { icon: 'stats-chart-outline', text: 'Regional market price feeds and historical price trends' },
  { icon: 'cloud-offline-outline', text: 'Offline-first — add listings or send messages without a connection, sync automatically once you\'re back online' },
  { icon: 'shield-checkmark-outline', text: 'Phone verification and buyer/seller reviews to build trust' },
];

export default function AboutScreen({ onBack }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>About OKUANI</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.brandCard}>
        <View style={styles.logoBadge}>
          <Ionicons name="leaf" size={28} color="#fff" />
        </View>
        <Text style={styles.brand}>OKUANI</Text>
        <Text style={styles.tagline}>Direct Agricultural Trade, Offline-First</Text>
        <Text style={styles.version}>Version {APP_VERSION}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Our Mission</Text>
        <Text style={styles.paragraph}>
          Farmers often depend on intermediaries who buy produce below fair market value, while
          buyers struggle to source produce consistently and at competitive prices. OKUANI connects
          farmers and buyers directly — with transparent pricing and no middleman — designed to work
          reliably even with unreliable connectivity in rural areas.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Core Features</Text>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name={f.icon} size={16} color={colors.refGreen} />
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>
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
    brandCard: {
      alignItems: 'center',
      backgroundColor: colors.refGreen,
      borderRadius: RADIUS.lg,
      paddingVertical: SPACING.xl,
      gap: 4,
      ...SHADOW.card,
    },
    logoBadge: {
      width: 56,
      height: 56,
      borderRadius: RADIUS.pill,
      backgroundColor: 'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.sm,
    },
    brand: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 1 },
    tagline: { fontSize: 12, color: '#CFE3D6', textAlign: 'center', paddingHorizontal: SPACING.xl },
    version: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: SPACING.sm },
    card: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      padding: SPACING.md + 2,
      gap: SPACING.sm,
      ...SHADOW.card,
    },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 2 },
    paragraph: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
    featureText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  });
