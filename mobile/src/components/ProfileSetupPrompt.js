import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

export default function ProfileSetupPrompt({ visible, onComplete, onSkip }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconBadge}>
            <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Complete your profile</Text>
          <Text style={styles.subtitle}>
            Add a photo, headline, and about section so buyers and farmers know who they're dealing
            with. You can always finish this later.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={onComplete}>
            <Text style={styles.primaryBtnText}>Complete Now</Text>
          </Pressable>
          <Pressable style={styles.skipBtn} onPress={onSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18,32,26,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: 6,
    ...SHADOW.raised,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 17, marginBottom: 10 },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md + 1,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  skipBtn: { paddingVertical: 10 },
  skipText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
});
