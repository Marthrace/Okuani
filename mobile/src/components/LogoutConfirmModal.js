import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PasswordInput from './PasswordInput';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

export default function LogoutConfirmModal({ visible, auth, onConfirmed, onCancel }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCancel = () => {
    setPassword('');
    setError('');
    onCancel();
  };

  const handleConfirm = async () => {
    setError('');
    if (!password) {
      setError('Enter your password to confirm.');
      return;
    }
    setLoading(true);
    try {
      await auth.verifyPassword(password);
      setPassword('');
      await onConfirmed();
    } catch (e) {
      setError(e.message || 'Incorrect password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <View style={styles.iconBadge}>
            <Ionicons name="log-out-outline" size={26} color={colors.danger} />
          </View>
          <Text style={styles.title}>Log out?</Text>
          <Text style={styles.subtitle}>Re-enter your password to confirm and end this session.</Text>

          <PasswordInput
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={styles.confirmBtn} onPress={handleConfirm} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Log Out</Text>}
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={handleCancel} disabled={loading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: '#FCE9E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 17, marginBottom: 10 },
  input: { width: '100%' },
  errorText: { color: colors.danger, fontSize: 11, fontWeight: '600', marginTop: 8 },
  confirmBtn: {
    width: '100%',
    backgroundColor: colors.danger,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md + 1,
    alignItems: 'center',
    marginTop: 14,
  },
  confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  cancelBtn: { paddingVertical: 10 },
  cancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
});
