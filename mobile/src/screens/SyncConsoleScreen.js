import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

export default function SyncConsoleScreen({
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
}) {
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
          <Text style={styles.screenTitle}>Sync & Defense Console</Text>
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
                  color={networkStatus === 'online' ? COLORS.success : COLORS.danger}
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
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={simulateOffline ? COLORS.primary : '#fff'}
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
              <Pressable style={styles.dangerBtn} onPress={confirmReset}>
                <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                <Text style={styles.dangerBtnText}>Clear DBs</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.inlineRow}>
                <Ionicons name="server-outline" size={16} color={COLORS.success} />
                <Text style={styles.cardLabel}>Server Database Monitor</Text>
              </View>
              <Text style={[styles.serverStatus, { color: serverOnline ? COLORS.success : COLORS.danger }]}>
                {serverOnline ? 'Connected' : 'Offline'}
              </Text>
            </View>
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
          </View>

          <Text style={styles.sectionTitle}>Sync Engine Live Telemetry</Text>
        </>
      }
      ListEmptyComponent={<Text style={styles.emptyText}>No sync activity yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.logRow}>
          <Text style={styles.logTime}>{item.time}</Text>
          <Text style={[styles.logText, logColor(item.type)]}>{item.text}</Text>
        </View>
      )}
    />
  );
}

function logColor(type) {
  if (type === 'success') return { color: COLORS.success };
  if (type === 'warning') return { color: COLORS.warning };
  if (type === 'error') return { color: COLORS.danger };
  return { color: COLORS.text };
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  screenTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  screenSubtitle: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginBottom: 14 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardLabel: { fontWeight: '700', fontSize: 13, color: COLORS.text },
  deviceStatus: { fontSize: 10, color: COLORS.textMuted },
  toggleLabel: { fontSize: 12, color: COLORS.text, flex: 1 },
  btnRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 10,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dangerBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: 12 },
  serverStatus: { fontSize: 10, fontWeight: '700' },
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 16, paddingVertical: 10, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  statLbl: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', padding: 20 },
  logRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logTime: { fontSize: 10, color: COLORS.textMuted, width: 64 },
  logText: { fontSize: 11, flex: 1, lineHeight: 15 },
});
