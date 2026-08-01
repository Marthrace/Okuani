import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import AuthTabsLayout from '../components/AuthTabsLayout';
import PasswordInput from '../components/PasswordInput';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../utils/theme';

export default function SignUpScreen({ auth, onSuccess, onNavigateLogin, onContinueGuest, onBack }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!name.trim() || !password) {
      setError('Name and password are required.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError('Provide an email or phone number.');
      return;
    }

    setLoading(true);
    try {
      await auth.signUp({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
      });
      onSuccess();
    } catch (e) {
      setError(e.message || 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthTabsLayout
      activeTab="signup"
      onChangeTab={(tab) => tab === 'login' && onNavigateLogin()}
      onBack={onBack}
      footer={
        <>
          <Pressable onPress={onContinueGuest} hitSlop={8}>
            <Text style={styles.linkTextMuted}>Continue as Guest</Text>
          </Pressable>
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text style={styles.footerLink} onPress={onNavigateLogin}>
              Log in
            </Text>
          </Text>
        </>
      }
    >
      <Text style={styles.label}>Full Name</Text>
      <TextInput style={styles.input} placeholder="e.g. Kwame Boateng" value={name} onChangeText={setName} />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        placeholder="+233244123456"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <Text style={styles.label}>Password</Text>
      <PasswordInput placeholder="At least 6 characters" value={password} onChangeText={setPassword} />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
  errorText: { color: colors.danger, fontSize: 11, marginTop: SPACING.sm + 2, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: colors.refGreen,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  linkTextMuted: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  footerText: { fontSize: 12, color: colors.textMuted },
  footerLink: { color: colors.refGreen, fontWeight: '700' },
});
