import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Select from '../components/Select';
import { useReports } from '../hooks/useReports';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

const REASONS = [
  'Harassment or abusive behavior',
  'Scam/fraud',
  'Inappropriate content',
  'Fake/misleading profile',
  'Other',
];

const RETURN_DELAY_MS = 3000;

export default function ReportUserScreen({ auth, onBack, isGuest, onLoginPress }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const reportsApi = useReports(auth);

  const [reportedUsername, setReportedUsername] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Auto-return to Profile a few seconds after a successful submission, but
  // the confirmation screen's own button still lets the user leave
  // immediately rather than sit and wait for it.
  useEffect(() => {
    if (!submitted) return;
    const timer = setTimeout(onBack, RETURN_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  // Guards against a double-tap (or a slow response landing after the user
  // taps again) firing two submissions — submitting/submitted both block
  // handleSubmit below, on top of the button itself being disabled.
  const submitLockRef = useRef(false);

  const handleSubmit = async () => {
    if (submitLockRef.current || submitting || submitted) return;

    const finalUsername = reportedUsername.trim();
    if (!finalUsername) {
      Alert.alert('Missing username', "Enter the username of the user you're reporting.");
      return;
    }
    if (!reason) {
      Alert.alert('Missing reason', 'Select a reason for the report.');
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    try {
      await reportsApi.submitReport({
        reportedUsername: finalUsername,
        reason,
        details: details.trim() || null,
        contact: contact.trim() || null,
      });
      setSubmitted(true);
    } catch (e) {
      Alert.alert('Could not submit report', e.message || 'Please try again.');
      submitLockRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.center}>
        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
        <Text style={styles.confirmTitle}>Report submitted</Text>
        <Text style={styles.confirmText}>
          Thank you for the report. The team will review it and update you if further action is
          required.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={onBack}>
          <Text style={styles.primaryBtnText}>Back to Profile</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Report</Text>
        <View style={{ width: 20 }} />
      </View>

      {isGuest ? (
        <Pressable onPress={onLoginPress} style={styles.guestNotice}>
          <Text style={styles.guestNoticeText}>Log in to report a user.</Text>
        </Pressable>
      ) : (
        <View style={styles.formCard}>
          <Text style={styles.label}>Username of User Being Reported</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. johndoe123"
            autoCapitalize="none"
            value={reportedUsername}
            onChangeText={setReportedUsername}
          />
          <Text style={styles.hintText}>
            Type the username exactly as it's displayed on the other user's profile.
          </Text>

          <Text style={styles.label}>Reason for Report</Text>
          <Select selectedValue={reason} onValueChange={setReason} items={REASONS} />

          <Text style={styles.label}>Additional Details (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe what happened..."
            value={details}
            onChangeText={setDetails}
            multiline
          />

          <Text style={styles.label}>Email or Phone Number (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="So the team can follow up with you"
            autoCapitalize="none"
            keyboardType="email-address"
            value={contact}
            onChangeText={setContact}
          />
          <Text style={styles.hintText}>
            Kept private — never shared with the reported user.
          </Text>

          <Pressable style={styles.primaryBtn} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="flag-outline" size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>Submit Report</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: SPACING.lg, paddingBottom: 32 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: SPACING.xl },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    headerTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    label: { fontSize: 11, color: colors.textMuted, marginTop: SPACING.sm, marginBottom: 4, fontWeight: '600' },
    hintText: { fontSize: 10, color: colors.textMuted, marginTop: 3 },
    guestNotice: {
      alignItems: 'center',
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    guestNoticeText: { fontSize: 12, fontWeight: '700', color: colors.refGreen },
    formCard: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      gap: 4,
      ...SHADOW.card,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm + 1,
      fontSize: 13,
      color: colors.text,
    },
    textArea: { minHeight: 70, textAlignVertical: 'top' },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.refGreen,
      borderRadius: RADIUS.pill,
      paddingVertical: SPACING.md,
      marginTop: SPACING.md,
    },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    confirmTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: SPACING.sm },
    confirmText: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 17 },
  });
