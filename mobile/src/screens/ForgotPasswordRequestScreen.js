import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import Select from '../components/Select';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../utils/theme';

const CHANNELS = [
  { label: 'SMS', value: 'sms' },
  { label: 'Email', value: 'email' },
];

export default function ForgotPasswordRequestScreen({ auth, onCodeSent, onBack }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [identifier, setIdentifier] = useState('');
  const [channel, setChannel] = useState('sms');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!identifier.trim()) {
      setError('Enter the email or phone number on your account.');
      return;
    }

    setLoading(true);
    try {
      const result = await auth.forgotPasswordRequest({ identifier: identifier.trim(), channel });
      onCodeSent({ ...result, identifier: identifier.trim() });
    } catch (e) {
      setError(e.message || 'Could not send a verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Forgot password" subtitle="We'll send a 6-digit verification code to reset it." onBack={onBack}>
      <Text style={styles.label}>Email or Phone</Text>
      <TextInput
        style={styles.input}
        placeholder="you@example.com or +233244123456"
        autoCapitalize="none"
        value={identifier}
        onChangeText={setIdentifier}
      />

      <Text style={styles.label}>Send code via</Text>
      <Select selectedValue={channel} onValueChange={setChannel} items={CHANNELS} />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable style={styles.primaryBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send Code</Text>}
      </Pressable>
    </AuthLayout>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
  label: { fontSize: 11, color: colors.textMuted, marginTop: SPACING.sm + 2, marginBottom: 4, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 13,
    color: colors.text,
  },
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
