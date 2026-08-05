import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

const THEME_OPTIONS = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function SettingsScreen({
  networkStatus,
  simulateOffline,
  setSimulateOffline,
  deviceOnline,
  serverDbState,
  serverOnline,
  syncLogs,
  isSyncing,
  syncData,
  handleResetAll,
  isGuest,
  onLoginPress,
}) {
  const { colors, mode, setMode } = useTheme();
  const styles = getStyles(colors);

  const confirmReset = () => {
    Alert.alert(
      'Clear all data?',
      'This wipes the on-device offline cache and, if online, resets the server database. Intended for demos/testing only.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: handleResetAll },
      ]
    );
  };

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={syncLogs}
      keyExtractor={(_, i) => String(i)}
      ListHeaderComponent={
        <>
          <Text style={styles.screenTitle}>Settings</Text>

          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.card}>
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((opt) => {
                const active = mode === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={[styles.themeOption, active && styles.themeOptionActive]}
                    onPress={() => setMode(opt.key)}
                  >
                    <Ionicons name={opt.icon} size={18} color={active ? '#fff' : colors.textMuted} />
                    <Text style={[styles.themeOptionText, active && styles.themeOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Sync & Defense Console</Text>
          <Text style={styles.screenSubtitle}>
            Toggle network connectivity to test the offline-first design. Add listings or send
            messages while Offline, then switch back Online to watch auto-sync run.
          </Text>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.inlineRow}>
                <Ionicons
                  name={networkStatus === 'online' ? 'wifi' : 'cloud-offline-outline'}
                  size={16}
                  color={networkStatus === 'online' ? colors.success : colors.danger}
                />
                <Text style={styles.cardLabel}>
                  {networkStatus === 'online' ? 'Network Connected' : 'Network Interrupted'}
                </Text>
              </View>
              <Text style={styles.deviceStatus}>
                Device radio: {deviceOnline ? 'online' : 'offline'}
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.toggleLabel}>Simulate Offline (demo toggle)</Text>
              <Switch
                value={simulateOffline}
                onValueChange={setSimulateOffline}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={simulateOffline ? colors.primary : '#fff'}
              />
            </View>

            <View style={styles.btnRow}>
              <Pressable
                style={[styles.primaryBtn, (isSyncing || networkStatus === 'offline') && styles.btnDisabled]}
                onPress={syncData}
                disabled={isSyncing || networkStatus === 'offline'}
              >
                <Ionicons name="sync-outline" size={14} color="#fff" />
                <Text style={styles.primaryBtnText}>Force Trigger Sync</Text>
              </Pressable>
              <Pressable
                style={[styles.dangerBtn, isGuest && styles.btnDisabled]}
                onPress={confirmReset}
                disabled={isGuest}
              >
                <Ionicons name="trash-outline" size={14} color={colors.danger} />
                <Text style={styles.dangerBtnText}>Clear DBs</Text>
              </Pressable>
            </View>
            {isGuest && (
              <Text style={styles.guestNote}>Log in to reset the shared server database.</Text>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.inlineRow}>
                <Ionicons name="server-outline" size={16} color={colors.success} />
                <Text style={styles.cardLabel}>Server Database Monitor</Text>
              </View>
              <Text style={[styles.serverStatus, { color: serverOnline ? colors.success : colors.danger }]}>
                {serverOnline ? 'Connected' : 'Offline'}
              </Text>
            </View>
            {isGuest ? (
              <Pressable onPress={onLoginPress}>
                <Text style={styles.guestNote}>
                  Log in to view the server database monitor (it shows private message content, so it now requires an authenticated session).
                </Text>
              </Pressable>
            ) : (
              <View style={styles.statRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statNum}>{serverDbState.listings.filter((l) => !l.deleted).length}</Text>
                  <Text style={styles.statLbl}>Listings</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNum}>{serverDbState.messages.length}</Text>
                  <Text style={styles.statLbl}>Messages</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNum}>{serverDbState.prices.length}</Text>
                  <Text style={styles.statLbl}>Price Feeds</Text>
                </View>
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Sync Engine Live Telemetry</Text>
        </>
      }
      ListEmptyComponent={<Text style={styles.emptyText}>No sync activity yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.logRow}>
          <Text style={styles.logTime}>{item.time}</Text>
          <Text style={[styles.logText, logColor(colors, item.type)]}>{item.text}</Text>
        </View>
      )}
    />
  );
}

function logColor(colors, type) {
  if (type === 'success') return { color: colors.success };
  if (type === 'warning') return { color: colors.warning };
  if (type === 'error') return { color: colors.danger };
  return { color: colors.text };
}

const getStyles = (colors) =>
  StyleSheet.create({
    list: { flex: 1, backgroundColor: colors.bg },
    content: { padding: SPACING.lg, paddingBottom: 32 },
    screenTitle: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: SPACING.md },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: SPACING.sm },
    screenSubtitle: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginBottom: SPACING.md },
    card: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      marginBottom: SPACING.md + 2,
      gap: SPACING.md,
      ...SHADOW.card,
    },
    themeRow: { flexDirection: 'row', gap: 10 },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.pill,
      paddingVertical: SPACING.sm + 4,
    },
    themeOptionActive: { backgroundColor: colors.refGreen, borderColor: colors.refGreen },
    themeOptionText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    themeOptionTextActive: { color: '#fff' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardLabel: { fontWeight: '800', fontSize: 13, color: colors.text },
    deviceStatus: { fontSize: 10, color: colors.textMuted },
    toggleLabel: { fontSize: 12, color: colors.text, flex: 1 },
    btnRow: { flexDirection: 'row', gap: 10 },
    primaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      borderRadius: RADIUS.pill,
      paddingVertical: SPACING.sm + 2,
    },
    btnDisabled: { opacity: 0.5 },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    dangerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: RADIUS.pill,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm + 2,
    },
    dangerBtnText: { color: colors.danger, fontWeight: '700', fontSize: 12 },
    guestNote: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
    serverStatus: { fontSize: 10, fontWeight: '700' },
    statRow: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1, backgroundColor: colors.primarySoft, borderRadius: RADIUS.md, paddingVertical: SPACING.sm + 2, alignItems: 'center' },
    statNum: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
    statLbl: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
    emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', padding: 20 },
    logRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    logTime: { fontSize: 10, color: colors.textMuted, width: 64 },
    logText: { fontSize: 11, flex: 1, lineHeight: 15 },
  });
