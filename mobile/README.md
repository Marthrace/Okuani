# OKUANI Mobile (Expo)

The mobile app described in the project proposal (see [../docs](../docs)): farmer/buyer portals, a
market price dashboard, in-app messaging, and offline-first sync against the `../backend` API — all
cached on-device with AsyncStorage so the app stays usable without a live connection, per the
proposal's core offline-first requirement. The proposal scoped this as Android-only, but it's built
entirely on cross-platform Expo APIs (Picker, AsyncStorage, NetInfo, SVG, safe-area-context), so it
runs on both Android and iOS.

## Run

```bash
npm install
cp .env.example .env   # then set EXPO_PUBLIC_API_BASE_URL to your backend's LAN IP for device testing
npm start
```

Open in Expo Go on an Android or iOS device, press `a` for the Android emulator, or `i` for the iOS
simulator (macOS + Xcode only — the iOS simulator isn't available from Windows/Linux, so iOS testing
without a Mac means using Expo Go on a physical iPhone). `localhost` only works for a browser
preview or an emulator with port forwarding — a physical device needs your machine's LAN IP (e.g.
`http://192.168.1.71:5000`).

Bundle identifiers for store builds are set in `app.json` (`com.okuani.mobile` for both
`ios.bundleIdentifier` and `android.package`) — placeholders, change them before submitting to
either store.

## Structure

```
mobile/
├── App.js                     # Screen router, header, bottom nav, SMS-alert banner
└── src/
    ├── context/
    │   └── ThemeContext.js      # Light/dark palette + useTheme() hook, persisted via AsyncStorage
    ├── hooks/
    │   ├── useNetworkStatus.js  # NetInfo connectivity + manual "simulate offline" demo toggle
    │   └── useOfflineDb.js      # AsyncStorage-backed local DB, sync engine, conflict resolution
    ├── screens/
    │   ├── WelcomeScreen.js
    │   ├── FarmerPortalScreen.js   # Create/manage listings
    │   ├── BuyerPortalScreen.js    # Search/filter listings, start a chat
    │   ├── PriceDashboardScreen.js # Regional price feeds + SVG trend chart
    │   ├── ChatScreen.js           # Farmer↔buyer messaging
    │   └── SettingsScreen.js       # Light/dark theme toggle + sync console (network toggle, force
    │                               # sync, DB reset, sync log) — for demos/defense
    ├── components/               # Header, BottomNav, ListingCard
    └── utils/                    # api.js (backend base URL), constants.js (color palettes, options)
```

## Demonstrating offline-first behaviour

The **Settings** tab (center button in the bottom nav) has a **Simulate Offline** switch (independent
of your actual network) so you can:
1. Add a listing or send a message while the switch is on ("offline" mode) — it's queued locally with a **Sync Queue** badge.
2. Flip the switch back off — sync fires automatically and the badge turns into **Synced**.

This mirrors the `../simulator`'s network-toggle demo but runs on-device. The same Settings screen
also has an Appearance section for switching the app between light and dark mode.
