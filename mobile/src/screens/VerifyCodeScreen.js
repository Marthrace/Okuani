import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AuthLayout from '../components/AuthLayout';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../utils/theme';

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VerifyCodeScreen({ auth, resetContext, onVerified, onBack }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(0, Math.floor((resetContext.expiresAt - Date.now()) / 1000))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((resetContext.expiresAt - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [resetContext.expiresAt]);

  const handleSubmit = async () => {
    setError('');
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const result = await auth.verifyResetCode({ resetId: resetContext.resetId, code: code.trim() });
      onVerified(result.resetToken);
    } catch (e) {
      setError(e.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Enter verification code"
      subtitle={`Code sent via ${resetContext.channel === 'sms' ? 'SMS' : 'Email'} to ${resetContext.destination}.`}
      onBack={onBack}
    >
      <View style={styles.devCard}>
        <View style={styles.devHeaderRow}>
          <Ionicons name="construct-outline" size={13} color={colors.forestDark} />
          <Text style={styles.devTitle}>DEV MODE — Simulated {resetContext.channel === 'sms' ? 'SMS' : 'Email'}</Text>
        </View>
        <Text style={styles.devCode}>{resetContext.devCode.split('').join(' ')}</Text>
        <Text style={styles.devExpiry}>
          {secondsLeft > 0 ? `Expires in ${formatCountdown(secondsLeft)}` : 'Code expired — request a new one'}
        </Text>
      </View>

      <Text style={styles.label}>Verification Code</Text>
      <TextInput
        style={styles.input}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable style={styles.primaryBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify Code</Text>}
      </Pressable>
    </AuthLayout>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
  devCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: 6,
    gap: 4,
  },
  devHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  devTitle: { fontSize: 10, fontWeight: '800', color: colors.forestDark, letterSpacing: 0.3 },
  devCode: { fontSize: 22, fontWeight: '800', color: colors.forestDark, letterSpacing: 4, marginTop: 2 },
  devExpiry: { fontSize: 10, color: colors.forestDark, fontWeight: '600' },
  label: { fontSize: 11, color: colors.textMuted, marginTop: SPACING.md, marginBottom: 4, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 15,
    letterSpacing: 2,
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
