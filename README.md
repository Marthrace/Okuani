# OKUANI - Offline-First Agricultural Marketplace & Price Dashboard

OKUANI is a BSc. Computer Science project (KNUST, Department of Computer Science) connecting
smallholder farmers to buyers and market price information in low-connectivity regions of Ghana.
The full proposal is in [docs/OKUANI_Project_Proposal (1).docx](docs/OKUANI_Project_Proposal%20%281%29.docx).

The solution is designed around an **offline-first** experience so that critical agricultural
workflows (listing produce, browsing prices, messaging) remain usable even when the network is
intermittent, per the proposal's core technical requirement.

---

## Project Structure

```
okuani/
├── docs/
│   ├── OKUANI_Project_Proposal (1).docx   # Original project proposal (objectives, methodology, architecture)
│   └── extract_proposal_text.py            # Helper script to dump the proposal's text for reference
├── backend/
│   ├── database.sqlite      # Server-side database (see "Deviations from the proposal" below)
│   ├── package.json         # Node.js backend dependencies
│   └── server.js            # Express API, sync endpoint, and USSD handler
├── mobile/                  # ★ The actual deliverable described in the proposal (§5.2, §6)
│   ├── App.js                # Expo/React Native entry point — screen router, header, nav
│   ├── src/
│   │   ├── hooks/             # useOfflineDb (AsyncStorage + sync engine), useNetworkStatus
│   │   ├── screens/           # Welcome, Farmer, Buyer, Prices, Chat, Sync console
│   │   ├── components/        # Header, BottomNav, ListingCard
│   │   └── utils/              # api.js, constants.js
│   ├── app.json
│   └── package.json
├── simulator/                # Browser-based demo harness, NOT the mobile deliverable
│   ├── package.json
│   ├── index.html
│   ├── public/                # PWA assets, manifest, and service worker
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            # Coordinates the simulated phone, sync engine, and DB inspector
│       ├── components/        # MobileApp (farmer/buyer portals + price dashboard), SyncEngineInspector, RetroUSSDSimulator
│       └── utils/             # Shared API helpers and tests
└── README.md
```

### How this maps to the proposal

The proposal's System Architecture (§5.2) calls for a **React Native (Expo) Android app** as the
product, talking to a **Node/Express backend** over a sync API, with **on-device offline storage**.

- **`mobile/`** is that app. It implements the farmer/buyer portals, a price dashboard, in-app
  messaging, and offline-first sync against the backend's `/api/sync` endpoint, with listings/
  messages/prices cached on-device via AsyncStorage and a manual "Simulate Offline" toggle (§3.2
  item 6) for testing and defense demos. See [mobile/README.md](mobile/README.md) for details.
  Note: the proposal (§5.2) scoped this as Android-only ("the widest reach among smartphone users
  in rural Ghana"); the app is built with only cross-platform Expo APIs and also runs on iOS —
  useful for development/demo on whatever device is on hand, but the target user base is still
  assumed to be Android per the proposal's rationale.
- **`backend/`** matches the proposal closely: Express REST API, a `/api/sync` endpoint with
  timestamp-based conflict resolution, and a `/api/ussd` endpoint for the SMS/USSD stretch goal
  (§3.2 item 7, §5.2).
- **`simulator/`** is a browser-based demonstration tool, not the mobile app itself. It renders a
  virtual smartphone alongside a sync engine inspector and a retro USSD dialer (`*412#`) inside a
  developer control panel, so the offline-first sync behaviour and USSD flow described in §5.3 can
  be demonstrated live without needing a real Android device. Its feature set mirrors `mobile/`'s
  farmer/buyer/price screens but adds the always-visible server DB monitor and log console that a
  phone screen doesn't have room for.

### Deviations from the proposal

- The proposal's §5.2 specifies **PostgreSQL or MySQL** for the server-side authoritative database,
  with SQLite reserved for on-device storage. This prototype uses **SQLite on the backend** as well,
  for simplicity during development — swap `backend/server.js`'s `sqlite`/`sqlite3` usage for a
  Postgres/MySQL driver before treating this as production-ready.
- SMS/USSD is implemented as an **in-app/browser simulator** (`simulator/src/components/RetroUSSDSimulator.jsx`
  and `backend`'s `/api/ussd` route) rather than a live Africa's Talking integration — consistent
  with the proposal's suggestion (§5.3) to use a simulated mode for testing and defense, but it is
  not wired up to a real telco/SMS gateway. The USSD dialer only exists in `simulator/`, not
  `mobile/`, since `*412#` USSD codes are dialed from a phone's native dialer, not from within an app.

---

## Installation & Setup

Ensure you have [Node.js](https://nodejs.org/) installed.

### 1. Start the Backend Server
```bash
cd backend
npm install
npm start
```
The server will run at http://localhost:5000 and expose a health endpoint at http://localhost:5000/health.

### 2. Start the Browser Simulator
```bash
cd simulator
npm install
npm run dev
```
The simulator will run at http://localhost:3000.

### 3. Run the Mobile App (Expo)
```bash
cd mobile
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_BASE_URL to your backend's LAN IP for device testing
npm start
```
Then open the app in Expo Go on an Android device/emulator, or press `a` for the Android emulator.
`localhost` only resolves for a browser preview or an emulator with port forwarding — a physical
device needs your machine's LAN IP (e.g. `http://192.168.1.71:5000`).

### 4. Run Tests
```bash
cd simulator
npm test
```

---

## Project Defense Demonstration Scenarios

To prove the **Offline-First Synchronization** core technical claim using the simulator:
1. Open the browser to `http://localhost:3000`. Ensure the network toggle on the right says **Online**.
2. Go to the app, choose the **Farmer Portal**, and add a listing (e.g., `100 bags of Maize in Techiman`). Notice it appears in the list and immediately gets a green **Synced** checkmark.
3. On the developer console, click **Simulate Offline**. The app network indicator will switch to offline.
4. Add another listing (e.g., `20 tubers of Yam in Kumasi`).
5. Notice that it saves successfully to local cache and displays a red **Sync Queue** badge. Inspect the **SQLite Server Database Monitor** on the right—the new Yam listing is **not** on the server.
6. Toggle the link back to **Connect Online**.
7. Watch the **Sync Engine Live Telemetry** logs print the upload steps. The Yam listing's status will change to a green **Synced** indicator, and it will instantly appear in the SQLite Monitor database.
