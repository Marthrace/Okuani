# OKUANI Project Summary

## Overview
OKUANI is an offline-first agricultural marketplace prototype designed for rural environments where internet access may be intermittent. The project demonstrates how farmers can list produce, buyers can browse offers, and price information can remain accessible while offline. See [README.md](README.md) for how the `backend/`, `mobile/`, and `simulator/` folders map to the proposal in [docs/](docs/).

For the full technical specification (architecture diagrams, data model, API reference, sync
protocol) see [docs/PROPOSAL_DOCUMENTATION.md](docs/PROPOSAL_DOCUMENTATION.md). For an audited,
evidence-backed comparison of what's actually implemented vs. the proposal see
[docs/IMPLEMENTATION_REVIEW.md](docs/IMPLEMENTATION_REVIEW.md).

## What has been improved
- Built out `mobile/` into the proposal's actual deliverable: farmer/buyer portals, price
  dashboard, messaging, and offline-first sync (AsyncStorage cache + `/api/sync`), with a
  Simulate Offline toggle for defense demos
- Added a more professional simulator structure with shared API utilities
- Introduced automated simulator testing with Vitest
- Added PWA support and installable web app assets to the simulator
- Improved backend reliability with health checks and safer startup behavior
- Added environment configuration examples for easier setup
- Refreshed project documentation and run instructions

## Known gaps vs. the proposal
- The backend uses SQLite rather than the PostgreSQL/MySQL specified for the server-side database.
- SMS/USSD is a simulator + backend route, not a live Africa's Talking integration (see README).
- `mobile/`'s offline cache is AsyncStorage rather than the WatermelonDB/Realm/SQLite the proposal
  suggests — functionally equivalent for this prototype's offline-first read/write/sync behaviour,
  but worth swapping for a real on-device database before treating this as production-ready.

## How to run
### Backend
```bash
cd backend
npm install
npm start
```

### Simulator
```bash
cd simulator
npm install
npm run dev
```

### Mobile app (Expo)
```bash
cd mobile
npm install
npm start
```

### Tests
```bash
cd simulator
npm test
```
