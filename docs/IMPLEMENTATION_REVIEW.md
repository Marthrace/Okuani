# OKUANI — Implementation Review (Proposal vs. Code, as of 2026-08-05)

This is an honest audit: every claim below was checked directly against the code in this repo (not
against `README.md`'s or `PROJECT_SUMMARY.md`'s own descriptions of itself), with file/line
references so it can be re-verified. See [`PROPOSAL_DOCUMENTATION.md`](PROPOSAL_DOCUMENTATION.md)
for the full detailed spec this is being checked against.

**Overall status: the core deliverable is substantially complete.** All seven proposal objectives
have working implementations. One real regression was found during this review (the mobile app's
offline-demo console had been deleted) and has been fixed as part of this pass. The remaining gaps
are the ones the project already knowingly deferred (server DB engine, on-device DB engine, live
SMS/USSD) — none of which block a defense, all of which are pre-existing documented deviations.

## 1. Objective-by-Objective Status

| # | Objective | Status | Evidence |
|---|---|---|---|
| 1 | Farmer produce listings (crop/qty/location/price/availability) | ✅ Done | `mobile/src/screens/FarmerPortalScreen.js`; `POST/GET` handled through `/api/sync` and `/api/listings` (`backend/server.js:489,525`) |
| 2 | Buyer search/filter by crop, location, price range, quantity | ✅ Done | `mobile/src/screens/BuyerPortalScreen.js:14-27` — text search + location filter + (as of this session) min/max price and min-quantity filters |
| 3 | Market price dashboard with regional/market trends | ✅ Done | `GET /api/prices`, `/api/prices/summary`, `/api/prices/history` (`backend/server.js:328-468`); `PriceDashboardScreen.js`, `ProductPriceTrendScreen.js` |
| 4 | In-app messaging between farmers and buyers | ✅ Done | `ChatScreen.js`, `ConversationsScreen.js`; messages table + ownership/participant checks in `/api/sync` (`backend/server.js:641-674`) |
| 5 | Offline-first: cache + auto-sync on reconnect | ✅ Done | `mobile/src/hooks/useOfflineDb.js` — AsyncStorage cache, auto-`syncData()` on the offline→online transition (`useOfflineDb.js:218-228`) |
| 6 | Simulated offline mode, reachable for testing/defense | ⚠️ Was broken, now fixed | See §2 below |
| 7 | *(Stretch)* SMS/USSD channel | ✅ Done (simulated, as the proposal allows) | `POST /api/ussd` (`backend/server.js:711-785`); `simulator/src/components/RetroUSSDSimulator.jsx` |

## 2. Regression Found & Fixed This Session: Objective #6

**Finding:** `mobile/`'s entire "Sync & Defense Console" — the Simulate-Offline switch, the
force-sync button, the server database monitor, the live sync-log telemetry, and the reset-all
button — had been deleted along with `SettingsScreen.js` and its Bottom Nav tab in the working
changes present at session start (only its theme-toggle sub-feature was preserved, folded into
`ProfileScreen.js`). `App.js` no longer even destructured `simulateOffline`/`setSimulateOffline`/
`deviceOnline` from `useNetworkStatus()`, so there was **no way left in the mobile app UI** to force
offline mode — only the (still-passive) network icon in the header, which just displays real device
connectivity and can't be overridden.

This is significant because objective #6 and Expected Outcome #4 in the proposal specifically call
for this toggle to exist *in the app*, explicitly for use "during testing and the final project
defense." Losing it from `mobile/` is a real gap against the proposal — the browser `simulator/`
still had its own equivalent panel, but `mobile/` is the actual scoped deliverable per `README.md`
§"How this maps to the proposal", not the simulator.

**Fix applied:** restored the full console as a new "Sync & Defense Console" card in
`ProfileScreen.js` (visible only on your own profile, alongside the existing Appearance/theme
card), wired back through `App.js`:

- [`mobile/App.js`](../mobile/App.js) — re-destructures `deviceOnline`, `simulateOffline`,
  `setSimulateOffline` from `useNetworkStatus()`; passes them plus `serverDbState`, `serverOnline`,
  `syncLogs`, `isSyncing`, `syncData`, `handleResetAll`, `isGuest`, `onLoginPress` into
  `ProfileScreen`.
- [`mobile/src/screens/ProfileScreen.js`](../mobile/src/screens/ProfileScreen.js) — new card with:
  network status + device radio state, the Simulate Offline `Switch`, a "Force Trigger Sync" button,
  a guest-gated "Clear DBs" reset button, the server DB monitor (listing/message/price counts, only
  for logged-in users since it exposes message content), and the last 12 sync-log entries with
  color-coded severity.

This was chosen over restoring a dedicated Settings tab because the rest of the settings
consolidation (folding theme into Profile, removing the Settings bottom-nav tab) was clearly an
intentional simplification already in progress — re-adding a whole tab would fight that direction.
Putting it on Profile keeps it reachable from the bottom nav on every screen without adding a tab.

**Residual risk:** this is exactly the kind of feature that can regress silently again because it's
easy to mistake for "just a settings screen" during a UI cleanup. Recommend explicitly calling it
out in any future settings/profile refactor, and/or adding a Detox/E2E smoke test that asserts the
Simulate Offline switch is reachable from Profile — not currently present (see backlog, §5).

## 3. Known, Already-Documented Deviations (unchanged by this review)

These were already called out in `README.md` and `PROJECT_SUMMARY.md`, and remain accurate:

| Deviation | Proposal called for | What exists | Verdict |
|---|---|---|---|
| Server database engine | PostgreSQL or MySQL (§5.2) | SQLite (`backend/server.js:108-113`) | Acceptable prototype simplification; flagged as pre-production work |
| On-device storage engine | SQLite via WatermelonDB/Realm (§5.2) | AsyncStorage, JSON blob (`useOfflineDb.js:5-7`) | Functionally equivalent for this prototype's read/write/sync needs; a real embedded DB would matter at much larger local datasets |
| SMS/USSD | Africa's Talking live integration (§5.2, stretch) | Simulated dial-string state machine, no telco (`backend/server.js:711`) | Matches the proposal's own allowance for a simulated mode; explicitly labelled as simulated everywhere |
| Hosting/deployment | Render/Railway/university server (§5.2, §8) | Runs locally only | Not yet attempted; low risk for a defense demo, real gap for "production-ready" claim |

## 4. Things Found Working Better Than the Proposal Required

Not gaps — noted because they're easy to undervalue when just checking boxes against the original
scope:

- **Auth system**: full signup/login/guest/forgot-password/reset flow with bcrypt hashing and
  session tokens — the proposal doesn't require accounts at all (listings could have been anonymous
  end-to-end), but having them enables per-user profiles, ownership enforcement, and reviews.
- **Profiles, reviews, verification badges**: not in the original proposal's specific objectives,
  but directly supports the "fair pricing / trust" theme in §7 (Significance).
- **Ownership/authorization hardening in `/api/sync`**: guards against cross-user listing/message
  tampering and guest-id impersonation (`backend/server.js:542-555, 566-571, 645-652`) — this is
  security work beyond what a BSc prototype is typically expected to include.
- **Crowd-sourced price history backfill**: `generatePriceHistory()` seeds a full trailing year of
  realistic price movement per market/crop (`backend/server.js:70-106`), not just a flat "today's
  price" — this is what makes the trend charts (objective #3) show something meaningful out of the
  box instead of a single flat point.

## 5. Prioritized Backlog (suggested next work)

1. **~~Restore the mobile Simulate-Offline console~~** — done this session (§2).
2. **UAT script** — proposal §5.5 calls for role-play testing with a small group; no structured
   script/checklist exists yet. Low effort, meaningful for the written case-study deliverable.
3. **Written case-study / impact analysis** — proposal's Expected Outcomes list "a written
   analysis/case study discussing the app's potential impact on rural farmer income and market
   efficiency." Not started; this is a writing deliverable, not a code one.
4. **Postgres/MySQL swap for `backend/`** — only worth doing if the project needs to demonstrate
   production-readiness beyond the defense; SQLite is fine for the prototype's actual data volumes.
5. **A more resilient mobile↔backend network config** — `mobile/.env`'s LAN/hotspot IP has to be
   hand-edited every time the dev machine's network changes (see `PROPOSAL_DOCUMENTATION.md` §13
   risk register); consider documenting `ipconfig`/`ifconfig` lookup steps in `mobile/README.md`
   directly, since this has already caused a real "can't log in" support question during this
   project.
6. **E2E smoke test for the defense console** — guard against the exact class of regression found
   in §2 happening again silently.

## 6. Files Reviewed

`backend/server.js`, `backend/routes/auth.js`, `backend/routes/profiles.js`,
`mobile/App.js`, `mobile/src/hooks/useOfflineDb.js`, `mobile/src/hooks/useNetworkStatus.js`,
`mobile/src/components/Header.js`, `mobile/src/screens/ProfileScreen.js`,
`mobile/src/screens/BuyerPortalScreen.js`, `mobile/src/screens/LoginScreen.js`,
`mobile/src/components/BottomNav.js`, `README.md`, `PROJECT_SUMMARY.md`,
`docs/proposal_extracted.txt`, plus a prior version of `mobile/src/screens/SettingsScreen.js`
recovered from git history (commit `6919fea`) for comparison.
