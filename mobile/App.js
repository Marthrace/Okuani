import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Header from './src/components/Header';
import BottomNav from './src/components/BottomNav';
import WelcomeScreen from './src/screens/WelcomeScreen';
import FarmerPortalScreen from './src/screens/FarmerPortalScreen';
import BuyerPortalScreen from './src/screens/BuyerPortalScreen';
import PriceDashboardScreen from './src/screens/PriceDashboardScreen';
import ProductPriceTrendScreen from './src/screens/ProductPriceTrendScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ConversationsScreen from './src/screens/ConversationsScreen';
import StockRequestsScreen from './src/screens/StockRequestsScreen';
import StockRequestBoardScreen from './src/screens/StockRequestBoardScreen';
import HelpScreen from './src/screens/HelpScreen';
import AboutScreen from './src/screens/AboutScreen';
import ReportUserScreen from './src/screens/ReportUserScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordRequestScreen from './src/screens/ForgotPasswordRequestScreen';
import VerifyCodeScreen from './src/screens/VerifyCodeScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import ProfileSetupPrompt from './src/components/ProfileSetupPrompt';
import MarqueeBanner from './src/components/MarqueeBanner';
import OfflineBanner from './src/components/OfflineBanner';
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
  // simulateOffline/setSimulateOffline power the "Simulate Offline Mode"
  // toggle (tap the network icon in the Header / Farmer hero) — see
  // useNetworkStatus.js. It's combined with real device connectivity into
  // one networkStatus, so every screen/hook downstream (useOfflineDb, the
  // API-layer fetch calls that all key off networkStatus) treats a manual
  // simulated-offline toggle exactly like a real connectivity loss.
  const { networkStatus, setSimulateOffline } = useNetworkStatus();
  const onToggleOffline = () => setSimulateOffline((v) => !v);
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
  // Prefills the chat input right after "I Can Supply This" — the seller
  // still reviews/edits/sends it themselves through the normal chat screen,
  // this just saves retyping the request's own crop/quantity.
  const [chatDraftMessage, setChatDraftMessage] = useState('');
  const [priceTrendParams, setPriceTrendParams] = useState(null);
  const [smsAlert, setSmsAlert] = useState(null);

  // Auto-dismiss the top marquee (welcome-back greeting, new-message notice)
  // after a few seconds — it's a transient notice, not something meant to
  // sit on screen until manually closed.
  useEffect(() => {
    if (!smsAlert) return;
    const timer = setTimeout(() => setSmsAlert(null), 4500);
    return () => clearTimeout(timer);
  }, [smsAlert]);
  const [resetContext, setResetContext] = useState(null);
  const [preAuthScreen, setPreAuthScreen] = useState('welcome');
  const [viewedProfileId, setViewedProfileId] = useState(null);
  const [preProfileScreen, setPreProfileScreen] = useState('welcome');
  const [profileSetupVisible, setProfileSetupVisible] = useState(false);
  const [preConversationsScreen, setPreConversationsScreen] = useState('welcome');
  // Shared "where did we come from" for all three three-bar-menu
  // destinations — they're reachable from wherever the menu itself is
  // rendered (Header, FarmerPortalScreen's hero), so unlike the other
  // preXScreen trackers above there's no single fixed origin to hardcode.
  const [preMenuScreen, setPreMenuScreen] = useState('welcome');

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

  const viewMenuScreen = (target) => {
    setPreMenuScreen(screen);
    setScreen(target);
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

  const handleProfileSetupComplete = () => {
    setProfileSetupVisible(false);
    viewProfile(auth.user.id);
  };

  const handleMessageFarmer = (listing) => {
    setChatRecipient(listing);
    setChatDraftMessage('');
    setScreen('chat');
  };

  // "I Can Supply This" on a buyer request — chatRecipient is shaped like a
  // listing (owner_id/farmer_name/phone) purely because that's what
  // ChatScreen already expects; there's no real "phone" for a buyer here
  // (same reasoning as ConversationsScreen's handleOpen — nothing to fake).
  const handleSupplyRequest = (request) => {
    setChatRecipient({
      owner_id: request.buyerId,
      farmer_name: request.buyerName || 'Buyer',
      phone: null,
    });
    setChatDraftMessage(
      `Hello, I can supply the ${request.quantity} ${request.unit} of ${request.crop} you requested.`
    );
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
    db.localDb.listings.some((l) => !l.synced) ||
    db.localDb.messages.some((m) => !m.synced) ||
    (db.localDb.priceReports || []).some((p) => !p.synced);
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
  // ProfileScreen's cover photo and FarmerPortalScreen's hero are both meant
  // to bleed full-width behind the status bar rather than starting below it
  // — exclude the top safe-area edge here specifically so each screen can
  // extend its own background into that space itself (they add insets.top
  // back in for their own icons/back button/hero content). Previously
  // FarmerPortalScreen relied on painting the safe-area strip a matching
  // green instead — two separately-colored blocks that only look seamless
  // if their colors and heights stay in exact sync, which is fragile (and,
  // per the screen recording that flagged this, drifted out of sync).
  // Bleeding is the same fix ProfileScreen already uses, so it can't drift.
  const bleedTopScreen = screen === 'profile' || screen === 'farmer';
  // The safe-area strip behind the status bar has no content of its own on
  // every other screen, so its color must exactly match whatever that
  // screen's own top edge uses — otherwise the two show up as visibly
  // different colors stacked on top of each other.
  const topSafeAreaColor = lightTopScreen ? colors.bg : colors.forestDark;

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
            onToggleOffline={onToggleOffline}
            addLog={db.addLog}
            syncData={wrappedSyncData}
            onSwitchRole={() => setScreen('buyer')}
            ownerId={auth.ownerId}
            defaultName={auth.user?.name}
            auth={auth}
            onViewProfile={viewProfile}
            unreadCount={unreadCount}
            onNotificationsPress={viewConversations}
            onViewStockBoard={() => setScreen('stock-board')}
          />
        );
      case 'buyer':
        return (
          <BuyerPortalScreen
            localDb={db.localDb}
            onSwitchRole={() => setScreen('farmer')}
            onMessageFarmer={handleMessageFarmer}
            onViewProfile={viewProfile}
            onRequestStock={() => setScreen('stock-requests')}
          />
        );
      case 'stock-requests':
        return (
          <StockRequestsScreen
            auth={auth}
            onBack={() => setScreen('buyer')}
            isGuest={auth.isGuest}
            onLoginPress={() => openAuthScreen('login')}
          />
        );
      case 'stock-board':
        return (
          <StockRequestBoardScreen
            auth={auth}
            localDb={db.localDb}
            ownerId={auth.ownerId}
            onBack={() => setScreen('farmer')}
            onSupply={handleSupplyRequest}
            isGuest={auth.isGuest}
            onLoginPress={() => openAuthScreen('login')}
          />
        );
      case 'help':
        return <HelpScreen onBack={() => setScreen(preMenuScreen)} />;
      case 'about':
        return <AboutScreen onBack={() => setScreen(preMenuScreen)} />;
      case 'report-user':
        return (
          <ReportUserScreen
            auth={auth}
            onBack={() => setScreen(preMenuScreen)}
            isGuest={auth.isGuest}
            onLoginPress={() => openAuthScreen('login')}
          />
        );
      case 'prices':
        return (
          <PriceDashboardScreen
            localDb={db.localDb}
            onViewTrend={handleViewPriceTrend}
            networkStatus={networkStatus}
            submitPriceReport={db.submitPriceReport}
          />
        );
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
            initialMessage={chatDraftMessage}
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
            isGuest={auth.isGuest}
            onLoginPress={() => openAuthScreen('login')}
            onHelp={() => viewMenuScreen('help')}
            onAbout={() => viewMenuScreen('about')}
            onReportUser={() => viewMenuScreen('report-user')}
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
      {/* A true sibling of SafeAreaView, not a child — its own absolute
          positioning is computed off its own useSafeAreaInsets() call, so
          it floats over whatever screen is showing without ever reserving
          layout space inside SafeAreaView's tree (mounting/unmounting it
          never shifts the Header, body, or BottomNav below). */}
      {smsAlert && <MarqueeBanner text={smsAlert} />}

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
            onToggleOffline={onToggleOffline}
          />
        )}

        {/* A brief toast (not glued to the screen) shown on every screen
            once logged in — see OfflineBanner.js for exactly when it
            appears/clears. Positions itself off its own safe-area insets,
            so unlike an in-flow element here it's never at the mercy of
            farmer/profile's bleedTopScreen SafeAreaView exclusion. */}
        {!chromeHidden && (
          <OfflineBanner
            networkStatus={networkStatus}
            isSyncing={db.isSyncing}
            syncProgress={db.syncProgress}
            hasPendingChanges={hasPendingChanges}
          />
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
  });
