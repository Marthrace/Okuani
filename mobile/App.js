import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Header from './src/components/Header';
import BottomNav from './src/components/BottomNav';
import WelcomeScreen from './src/screens/WelcomeScreen';
import FarmerPortalScreen from './src/screens/FarmerPortalScreen';
import BuyerPortalScreen from './src/screens/BuyerPortalScreen';
import PriceDashboardScreen from './src/screens/PriceDashboardScreen';
import ProductPriceTrendScreen from './src/screens/ProductPriceTrendScreen';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ConversationsScreen from './src/screens/ConversationsScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordRequestScreen from './src/screens/ForgotPasswordRequestScreen';
import VerifyCodeScreen from './src/screens/VerifyCodeScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import ProfileSetupPrompt from './src/components/ProfileSetupPrompt';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import { useOfflineDb } from './src/hooks/useOfflineDb';
import { useAuth } from './src/hooks/useAuth';
import { useKeyboardVisible } from './src/hooks/useKeyboardVisible';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const AUTH_SCREENS = ['signup', 'login', 'forgot-request', 'forgot-verify', 'forgot-reset'];
const PROFILE_PROMPT_KEY_PREFIX = 'okuani_profile_prompted_';

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { networkStatus, deviceOnline, simulateOffline, setSimulateOffline } = useNetworkStatus();
  // useOfflineDb needs auth.ownerId and useAuth needs db.setLocalDb (to re-tag
  // guest records on merge) — a ref breaks the circular hook dependency, same
  // "assign latest during render" pattern useOfflineDb already uses internally.
  const setLocalDbRef = useRef(null);
  const auth = useAuth((updater) => setLocalDbRef.current?.(updater));
  const db = useOfflineDb(networkStatus, auth.ownerId, auth.token);
  setLocalDbRef.current = db.setLocalDb;
  const keyboardVisible = useKeyboardVisible();

  const [screen, setScreen] = useState('login');
  const [chatRecipient, setChatRecipient] = useState(null);
  const [priceTrendParams, setPriceTrendParams] = useState(null);
  const [smsAlert, setSmsAlert] = useState(null);
  const [resetContext, setResetContext] = useState(null);
  const [preAuthScreen, setPreAuthScreen] = useState('welcome');
  const [viewedProfileId, setViewedProfileId] = useState(null);
  const [preProfileScreen, setPreProfileScreen] = useState('welcome');
  const [profileSetupVisible, setProfileSetupVisible] = useState(false);
  const [preConversationsScreen, setPreConversationsScreen] = useState('welcome');

  const openAuthScreen = (target) => {
    setPreAuthScreen(screen);
    setScreen(target);
  };

  const viewProfile = (userId) => {
    setPreProfileScreen(screen);
    setViewedProfileId(userId);
    setScreen('profile');
  };

  const viewConversations = () => {
    setPreConversationsScreen(screen);
    setScreen('conversations');
  };

  // BottomNav's Profile tab must always land on YOUR OWN profile — a raw
  // setScreen('profile') would keep showing whoever viewedProfileId was last
  // set to (e.g. a seller you visited from a listing). Guests have no
  // backend profile at all, so route them to login instead.
  const handleBottomNavigate = (key) => {
    if (key === 'profile') {
      if (auth.isGuest) {
        openAuthScreen('login');
      } else {
        viewProfile(auth.user.id);
      }
      return;
    }
    setScreen(key);
  };

  // Runs whenever a fresh account becomes signed-in (not on every render —
  // guarded by promptedUserRef), rather than reading auth.user synchronously
  // right after an async signUp()/login() call, which could race a stale closure.
  const promptedUserRef = useRef(null);
  useEffect(() => {
    const userId = auth.user?.id;
    if (!userId || promptedUserRef.current === userId) return;
    promptedUserRef.current = userId;
    (async () => {
      const key = PROFILE_PROMPT_KEY_PREFIX + userId;
      const alreadyPrompted = await AsyncStorage.getItem(key);
      if (!alreadyPrompted) {
        await AsyncStorage.setItem(key, '1');
        setProfileSetupVisible(true);
      }
    })();
  }, [auth.user?.id]);

  // Welcome no longer has its own Farmer/Buyer entry points (just the single
  // Continue button into the auth flow), so an auth flow entered FROM welcome
  // can no longer land back on welcome afterward — that would be a dead end
  // with no way into the app. Land on the Farmer/Home screen instead, same as
  // BottomNav's role tabs already do.
  const postAuthLandingScreen = () =>
    AUTH_SCREENS.includes(preAuthScreen) || preAuthScreen === 'welcome' ? 'farmer' : preAuthScreen;

  const handleAuthSuccess = () => {
    setSmsAlert(`Welcome, ${auth.user?.name || 'back'}!`);
    setScreen(postAuthLandingScreen());
  };

  const handleLogout = async () => {
    await auth.logout();
    setScreen('welcome');
  };

  const handleContinueAsGuest = async () => {
    // "Continue as Guest" must start with a genuinely clean identity — if a
    // real account was previously logged in on this device (its session
    // persisted in AsyncStorage from before), auth.user/token were still
    // sitting there unchanged, so the app kept showing that person's name
    // and details everywhere even though the user thought they'd gone
    // guest. Clear any existing session first.
    if (auth.user) {
      await auth.logout();
    }
    auth.ensureGuestId();
    setScreen(postAuthLandingScreen());
  };

  const handleCancelAuth = () => {
    setScreen(AUTH_SCREENS.includes(preAuthScreen) ? 'welcome' : preAuthScreen);
  };

  const handleIdentityPress = () => {
    if (auth.isGuest) {
      openAuthScreen('login');
    } else {
      viewProfile(auth.user.id);
    }
  };

  const handleProfileSetupComplete = () => {
    setProfileSetupVisible(false);
    viewProfile(auth.user.id);
  };

  const handleMessageFarmer = (listing) => {
    setChatRecipient(listing);
    setScreen('chat');
  };

  const handleViewPriceTrend = (params) => {
    setPriceTrendParams(params);
    setScreen('price-trend');
  };

  const wrappedSyncData = async () => {
    const result = await db.syncData();
    if (result?.receivedNewMessage && screen !== 'chat') {
      setSmsAlert('New buyer message received — check the Chat screen.');
    }
  };

  const hasPendingChanges =
    db.localDb.listings.some((l) => !l.synced) || db.localDb.messages.some((m) => !m.synced);
  const unreadCount = auth.ownerId
    ? db.localDb.messages.filter((m) => m.receiver_id === auth.ownerId && !m.read).length
    : 0;
  const chromeHidden = screen === 'welcome' || AUTH_SCREENS.includes(screen);
  // FarmerPortalScreen and ProfileScreen each render their own green hero/cover
  // panel with network/sync status folded in, so the generic Header would just
  // duplicate it as a second stacked green box on those two screens.
  const showTopHeader = !chromeHidden && screen !== 'farmer' && screen !== 'profile';
  // Every other screen has a dark hero/header starting right at the top (the
  // shared Header, FarmerPortalScreen/ProfileScreen's own hero, the Welcome
  // gradient, or AuthLayout's dark hero) — only Login/Sign Up (AuthTabsLayout)
  // have a plain light background right up to the status bar, so only those
  // two need dark status bar icons instead of the light ones used everywhere else.
  const lightTopScreen = screen === 'login' || screen === 'signup';
  // The safe-area strip behind the status bar has no content of its own, so
  // its color must exactly match whatever the screen's own top edge uses —
  // otherwise the two show up as visibly different shades of green stacked
  // on top of each other. FarmerPortalScreen's hero uses refGreen, not
  // forestDark like the shared Header/other heroes, so it needs its own case.
  const topSafeAreaColor = lightTopScreen ? colors.bg : screen === 'farmer' ? colors.refGreen : colors.forestDark;
  // ProfileScreen's cover photo is meant to bleed full-width behind the
  // status bar rather than starting below it — exclude the top safe-area
  // edge here specifically so ProfileScreen can extend into that space
  // itself (it adds insets.top back in for its own back button/icons).
  const bleedTopScreen = screen === 'profile';

  const renderScreen = () => {
    switch (screen) {
      case 'welcome':
        return (
          <WelcomeScreen
            prices={db.localDb.prices}
            onContinue={() => openAuthScreen('login')}
          />
        );
      case 'farmer':
        return (
          <FarmerPortalScreen
            localDb={db.localDb}
            setLocalDb={db.setLocalDb}
            networkStatus={networkStatus}
            hasPendingChanges={hasPendingChanges}
            addLog={db.addLog}
            syncData={wrappedSyncData}
            onSwitchRole={() => setScreen('buyer')}
            ownerId={auth.ownerId}
            defaultName={auth.user?.name}
            auth={auth}
            onViewProfile={viewProfile}
            onIdentityPress={handleIdentityPress}
            unreadCount={unreadCount}
            onNotificationsPress={viewConversations}
          />
        );
      case 'buyer':
        return (
          <BuyerPortalScreen
            localDb={db.localDb}
            onSwitchRole={() => setScreen('farmer')}
            onMessageFarmer={handleMessageFarmer}
            onViewProfile={viewProfile}
          />
        );
      case 'prices':
        return <PriceDashboardScreen localDb={db.localDb} onViewTrend={handleViewPriceTrend} />;
      case 'price-trend':
        return (
          <ProductPriceTrendScreen
            localDb={db.localDb}
            params={priceTrendParams}
            networkStatus={networkStatus}
            onBack={() => setScreen('prices')}
          />
        );
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
            ownerId={auth.ownerId}
            onViewProfile={viewProfile}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            auth={auth}
            profileUserId={viewedProfileId || auth.user?.id}
            onBack={() => setScreen(preProfileScreen)}
            onLogout={handleLogout}
            networkStatus={networkStatus}
            hasPendingChanges={hasPendingChanges}
          />
        );
      case 'conversations':
        return (
          <ConversationsScreen
            auth={auth}
            localDb={db.localDb}
            ownerId={auth.ownerId}
            onOpenChat={handleMessageFarmer}
            onBack={() => setScreen(preConversationsScreen)}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
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
            isGuest={auth.isGuest}
            onLoginPress={() => openAuthScreen('login')}
          />
        );
      case 'signup':
        return (
          <SignUpScreen
            auth={auth}
            onSuccess={handleAuthSuccess}
            onNavigateLogin={() => setScreen('login')}
            onContinueGuest={handleContinueAsGuest}
            onBack={handleCancelAuth}
          />
        );
      case 'login':
        return (
          <LoginScreen
            auth={auth}
            onSuccess={handleAuthSuccess}
            onNavigateSignUp={() => setScreen('signup')}
            onNavigateForgot={() => setScreen('forgot-request')}
            onContinueGuest={handleContinueAsGuest}
            onBack={handleCancelAuth}
          />
        );
      case 'forgot-request':
        return (
          <ForgotPasswordRequestScreen
            auth={auth}
            onCodeSent={(data) => {
              setResetContext(data);
              setScreen('forgot-verify');
            }}
            onBack={() => setScreen('login')}
          />
        );
      case 'forgot-verify':
        return (
          <VerifyCodeScreen
            auth={auth}
            resetContext={resetContext}
            onVerified={(resetToken) => {
              setResetContext((prev) => ({ ...prev, resetToken }));
              setScreen('forgot-reset');
            }}
            onBack={() => setScreen('forgot-request')}
          />
        );
      case 'forgot-reset':
        return (
          <ResetPasswordScreen
            auth={auth}
            resetContext={resetContext}
            onSuccess={handleAuthSuccess}
            onBack={() => setScreen('forgot-verify')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: topSafeAreaColor }]}
        edges={bleedTopScreen ? ['left', 'right'] : ['top', 'left', 'right']}
      >
        <StatusBar style={lightTopScreen ? 'dark' : 'light'} />
        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        {showTopHeader && (
          <Header
            networkStatus={networkStatus}
            hasPendingChanges={hasPendingChanges}
            unreadCount={unreadCount}
            onNotificationsPress={viewConversations}
          />
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

        <View style={styles.body}>{db.hydrated && auth.hydrated ? renderScreen() : null}</View>

        {!chromeHidden && !keyboardVisible && <BottomNav screen={screen} onNavigate={handleBottomNavigate} />}

        <ProfileSetupPrompt
          visible={profileSetupVisible}
          onComplete={handleProfileSetupComplete}
          onSkip={() => setProfileSetupVisible(false)}
        />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    keyboardWrap: { flex: 1 },
    body: { flex: 1 },
    smsBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    smsBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    smsBannerText: { color: '#fff', fontSize: 11, flex: 1 },
    smsDismiss: { color: '#fff', fontSize: 10, fontWeight: '700' },
  });
