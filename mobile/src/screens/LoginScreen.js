import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AuthTabsLayout from '../components/AuthTabsLayout';
import PasswordInput from '../components/PasswordInput';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../utils/theme';

export default function LoginScreen({ auth, onSuccess, onNavigateSignUp, onNavigateForgot, onContinueGuest, onBack }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!identifier.trim() || !password) {
      setError('Enter your email/phone and password.');
      return;
    }

    setLoading(true);
    try {
      await auth.login({ identifier: identifier.trim(), password });
      onSuccess();
    } catch (e) {
      setError(e.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthTabsLayout
      activeTab="login"
      onChangeTab={(tab) => tab === 'signup' && onNavigateSignUp()}
      onBack={onBack}
      footer={
        <>
          <Pressable onPress={onContinueGuest} hitSlop={8}>
            <Text style={styles.linkTextMuted}>Continue as Guest</Text>
          </Pressable>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text style={styles.footerLink} onPress={onNavigateSignUp}>
              Sign up
            </Text>
          </Text>
        </>
      }
    >
      <Text style={styles.label}>Your Email</Text>
      <TextInput
        style={styles.input}
        placeholder="you@example.com or +233244123456"
        autoCapitalize="none"
        value={identifier}
        onChangeText={setIdentifier}
      />

      <Text style={styles.label}>Password</Text>
      <PasswordInput placeholder="••••••••••" value={password} onChangeText={setPassword} />

      <View style={styles.subRow}>
        <Text style={styles.errorText}>{error || ' '}</Text>
        <Pressable onPress={onNavigateForgot} hitSlop={8}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>
      </View>

      <Pressable style={styles.primaryBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Continue</Text>}
      </Pressable>
    </AuthTabsLayout>
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
    paddingVertical: SPACING.sm + 4,
    fontSize: 13,
    color: colors.text,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm + 2,
  },
  errorText: { color: colors.danger, fontSize: 11, fontWeight: '600', flex: 1 },
  primaryBtn: {
    backgroundColor: colors.refGreen,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  linkText: { color: colors.refGreen, fontSize: 12, fontWeight: '700' },
  linkTextMuted: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  footerText: { fontSize: 12, color: colors.textMuted },
  footerLink: { color: colors.refGreen, fontWeight: '700' },
});
