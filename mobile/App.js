import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import Header from './src/components/Header';
import BottomNav from './src/components/BottomNav';
import WelcomeScreen from './src/screens/WelcomeScreen';
import FarmerPortalScreen from './src/screens/FarmerPortalScreen';
import BuyerPortalScreen from './src/screens/BuyerPortalScreen';
import PriceDashboardScreen from './src/screens/PriceDashboardScreen';
import ChatScreen from './src/screens/ChatScreen';
import SyncConsoleScreen from './src/screens/SyncConsoleScreen';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import { useOfflineDb } from './src/hooks/useOfflineDb';
import { COLORS } from './src/utils/constants';

export default function App() {
  const { networkStatus, deviceOnline, simulateOffline, setSimulateOffline } = useNetworkStatus();
  const db = useOfflineDb(networkStatus);

  const [screen, setScreen] = useState('welcome');
  const [chatRecipient, setChatRecipient] = useState(null);
  const [smsAlert, setSmsAlert] = useState(null);

  const handleSelectRole = (role) => {
    setScreen(role);
  };

  const handleMessageFarmer = (listing) => {
    setChatRecipient(listing);
    setScreen('chat');
  };

  const wrappedSyncData = async () => {
    const result = await db.syncData();
    if (result?.receivedNewMessage && screen !== 'chat') {
      setSmsAlert('New buyer message received — check the Chat screen.');
    }
  };

  const hasPendingChanges =
    db.localDb.listings.some((l) => !l.synced) || db.localDb.messages.some((m) => !m.synced);

  const renderScreen = () => {
    switch (screen) {
      case 'welcome':
        return <WelcomeScreen onSelectRole={handleSelectRole} prices={db.localDb.prices} />;
      case 'farmer':
        return (
          <FarmerPortalScreen
            localDb={db.localDb}
            setLocalDb={db.setLocalDb}
            networkStatus={networkStatus}
            addLog={db.addLog}
            syncData={wrappedSyncData}
            onSwitchRole={() => setScreen('welcome')}
          />
        );
      case 'buyer':
        return (
          <BuyerPortalScreen
            localDb={db.localDb}
            onSwitchRole={() => setScreen('welcome')}
            onMessageFarmer={handleMessageFarmer}
          />
        );
      case 'prices':
        return <PriceDashboardScreen localDb={db.localDb} />;
      case 'chat':
        return (
          <ChatScreen
            localDb={db.localDb}
            setLocalDb={db.setLocalDb}
            chatRecipient={chatRecipient}
            networkStatus={networkStatus}
            addLog={db.addLog}
            syncData={wrappedSyncData}
            onBack={() => setScreen('buyer')}
          />
        );
      case 'sync':
        return (
          <SyncConsoleScreen
            networkStatus={networkStatus}
            deviceOnline={deviceOnline}
            simulateOffline={simulateOffline}
            setSimulateOffline={setSimulateOffline}
            serverDbState={db.serverDbState}
            serverOnline={db.serverOnline}
            syncLogs={db.syncLogs}
            isSyncing={db.isSyncing}
            syncData={wrappedSyncData}
            handleResetAll={db.handleResetAll}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        {screen !== 'welcome' && (
          <Header networkStatus={networkStatus} hasPendingChanges={hasPendingChanges} />
        )}

        {smsAlert && (
          <View style={styles.smsBanner}>
            <View style={styles.smsBannerRow}>
              <Ionicons name="notifications-outline" size={14} color="#fff" />
              <Text style={styles.smsBannerText}>{smsAlert}</Text>
            </View>
            <Pressable onPress={() => setSmsAlert(null)}>
              <Text style={styles.smsDismiss}>Dismiss</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.body}>{db.hydrated ? renderScreen() : null}</View>

        {screen !== 'welcome' && <BottomNav screen={screen} onNavigate={setScreen} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  body: { flex: 1 },
  smsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  smsBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  smsBannerText: { color: '#fff', fontSize: 11, flex: 1 },
  smsDismiss: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
