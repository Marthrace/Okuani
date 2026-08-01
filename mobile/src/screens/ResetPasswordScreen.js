import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../utils/theme';

export default function ResetPasswordScreen({ auth, resetContext, onSuccess, onBack }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await auth.resetPassword({ resetToken: resetContext.resetToken, newPassword });
      onSuccess();
    } catch (e) {
      setError(e.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Set a new password" subtitle="You'll be logged in automatically once it's set." onBack={onBack}>
      <Text style={styles.label}>New Password</Text>
      <PasswordInput placeholder="At least 6 characters" value={newPassword} onChangeText={setNewPassword} />

      <Text style={styles.label}>Confirm Password</Text>
      <PasswordInput placeholder="Re-enter password" value={confirmPassword} onChangeText={setConfirmPassword} />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable style={styles.primaryBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Reset Password</Text>}
      </Pressable>
    </AuthLayout>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
  label: { fontSize: 11, color: colors.textMuted, marginTop: SPACING.sm + 2, marginBottom: 4, fontWeight: '600' },
  errorText: { color: colors.danger, fontSize: 11, marginTop: SPACING.sm + 2, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
