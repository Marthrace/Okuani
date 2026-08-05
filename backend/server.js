
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const createAuthRouter = require('./routes/auth');
const createProfilesRouter = require('./routes/profiles');
const requireAuth = require('./middleware/requireAuth');
const { saveImageFile, deleteImageFile } = require('./utils/imageUpload');

const app = express();
const PORT = Number(process.env.PORT || 5000);

const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
// Profile/ID photos and queued listing images are all base64 JSON payloads,
// well over the 100kb default — a sync batch can carry several at once.
app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(uploadsDir));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'okuani-backend' });
});

let db;
let server;

app.use('/api/auth', createAuthRouter(() => db));
app.use('/api/profiles', createProfilesRouter(() => db, uploadsDir));

async function ensureColumn(db, table, column, ddlType) {
  const cols = await db.all(`PRAGMA table_info(${table})`);
  if (!cols.some((c) => c.name === column)) {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddlType}`);
  }
}

// Deterministic PRNG (mulberry32) seeded from a string, so re-seeding the DB
// (via /api/db-reset) regenerates the same-looking history every time rather
// than a different random series on every restart.
function seedFromString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// Backfills a trailing year of price points for one seeded market+crop
// combo, as a random walk (with mild drift) that lands exactly on the known
// "today" price so the live/current value matches what's already seeded.
function generatePriceHistory(seedRow, { days = 365, intervalDays = 3 } = {}) {
  const rand = seedFromString(`${seedRow.market_name}|${seedRow.crop}`);
  const today = new Date(seedRow.date + 'T00:00:00Z');
  const stepCount = Math.floor(days / intervalDays);
  const minPrice = seedRow.price_per_kg * 0.65;
  const maxPrice = seedRow.price_per_kg * 1.35;

  // Walk forward from `stepCount` intervals ago up to today, then rescale so
  // the final point equals seedRow.price_per_kg exactly.
  const walk = [seedRow.price_per_kg];
  let price = seedRow.price_per_kg;
  for (let i = 1; i <= stepCount; i++) {
    const pctSwing = (rand() - 0.5) * 0.08; // up to +/-4% per step
    price = Math.min(maxPrice, Math.max(minPrice, price * (1 + pctSwing)));
    walk.push(price);
  }
  walk.reverse(); // walk[0] is `stepCount` intervals ago, walk[last] is today
  walk[walk.length - 1] = seedRow.price_per_kg;

  const rows = [];
  for (let i = 0; i < walk.length; i++) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - (walk.length - 1 - i) * intervalDays);
    rows.push({
      market_name: seedRow.market_name,
      region: seedRow.region,
      crop: seedRow.crop,
      price_per_kg: Math.round(walk[i] * 100) / 100,
      date: date.toISOString().split('T')[0],
      source: seedRow.source,
    });
  }
  return rows;
}

async function initDb() {
  const dbPath = path.join(__dirname, 'database.sqlite');
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create listings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      farmer_name TEXT,
      crop TEXT,
      quantity REAL,
      unit TEXT,
      price REAL,
      location TEXT,
      phone TEXT,
      deleted INTEGER DEFAULT 0,
      updated_at INTEGER
    )
  `);

  // Create messages table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT,
      receiver_id TEXT,
      content TEXT,
      timestamp INTEGER
    )
  `);

  // Create market prices table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS market_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_name TEXT,
      region TEXT,
      crop TEXT,
      price_per_kg REAL,
      date TEXT,
      source TEXT
    )
  `);

  // Create users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER,
      CHECK (email IS NOT NULL OR phone IS NOT NULL)
    )
  `);

  // Create sessions table (opaque bearer tokens)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER,
      expires_at INTEGER
    )
  `);

  // Create password_resets table (simulated SMS/email verification codes)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      channel TEXT,
      destination TEXT,
      reset_token TEXT,
      expires_at INTEGER,
      consumed INTEGER DEFAULT 0,
      created_at INTEGER
    )
  `);

  // owner_id attributes listings/messages to a guest id or a signed-up user id.
  // Added via ALTER TABLE (not part of the CREATE TABLE above) since these
  // tables predate auth; ensureColumn keeps this safe to re-run on restart.
  await ensureColumn(db, 'listings', 'owner_id', 'TEXT');
  await ensureColumn(db, 'messages', 'owner_id', 'TEXT');

  // Product photo, added the same additive way. Populated by /api/sync when a
  // queued listing carries an image_base64 payload (see the sync handler below).
  await ensureColumn(db, 'listings', 'image_path', 'TEXT');

  // Read/unread tracking for the seller notification badge. Only ever flipped
  // 0 -> 1 by the receiving party (see the sync handler below).
  await ensureColumn(db, 'messages', 'read', 'INTEGER DEFAULT 0');

  // Profile fields, added the same way for the same reason (users predates profiles).
  await ensureColumn(db, 'users', 'headline', 'TEXT');
  await ensureColumn(db, 'users', 'about', 'TEXT');
  await ensureColumn(db, 'users', 'avatar_path', 'TEXT');
  await ensureColumn(db, 'users', 'cover_path', 'TEXT');
  await ensureColumn(db, 'users', 'phone_verified', 'INTEGER DEFAULT 0');
  await ensureColumn(db, 'users', 'id_verified', 'INTEGER DEFAULT 0');
  await ensureColumn(db, 'users', 'id_photo_path', 'TEXT');
  await ensureColumn(db, 'users', 'location', 'TEXT');
  await ensureColumn(db, 'users', 'role', 'TEXT');

  // Reviews: one editable review per reviewer/target pair.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      target_user_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      UNIQUE(target_user_id, reviewer_id)
    )
  `);

  // Phone verification codes (profile trust badge) — a dedicated table rather
  // than reusing password_resets, since this is for an already-logged-in user
  // verifying their own phone, not an anonymous identifier lookup.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS phone_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at INTEGER,
      consumed INTEGER DEFAULT 0,
      created_at INTEGER
    )
  `);

  // Seed market prices if empty
  const count = await db.get('SELECT COUNT(*) as count FROM market_prices');
  if (count.count === 0) {
    console.log('Seeding initial market price data...');
    // Anchor the seed's "current" price on today's real date (not a fixed
    // string) so the 7D/30D/etc. period filters always have data ending at
    // "now", however far in the future the server happens to run.
    const todayStr = new Date().toISOString().split('T')[0];
    const prices = [
      { market_name: 'Makola Market', region: 'Greater Accra', crop: 'White Maize', price_per_kg: 8.50, date: todayStr, source: 'Esoko Ghana' },
      { market_name: 'Makola Market', region: 'Greater Accra', crop: 'Yam (Pona)', price_per_kg: 12.00, date: todayStr, source: 'Esoko Ghana' },
      { market_name: 'Makola Market', region: 'Greater Accra', crop: 'Cassava', price_per_kg: 4.50, date: todayStr, source: 'Esoko Ghana' },

      { market_name: 'Central Market', region: 'Ashanti', crop: 'White Maize', price_per_kg: 7.80, date: todayStr, source: 'Esoko Ghana' },
      { market_name: 'Central Market', region: 'Ashanti', crop: 'Yam (Pona)', price_per_kg: 10.50, date: todayStr, source: 'Esoko Ghana' },
      { market_name: 'Central Market', region: 'Ashanti', crop: 'Plantain (Apem)', price_per_kg: 9.00, date: todayStr, source: 'Esoko Ghana' },

      { market_name: 'Techiman Market', region: 'Bono East', crop: 'White Maize', price_per_kg: 6.20, date: todayStr, source: 'MoFA' },
      { market_name: 'Techiman Market', region: 'Bono East', crop: 'Yam (Pona)', price_per_kg: 8.00, date: todayStr, source: 'MoFA' },
      { market_name: 'Techiman Market', region: 'Bono East', crop: 'Cassava', price_per_kg: 3.20, date: todayStr, source: 'MoFA' },
      { market_name: 'Techiman Market', region: 'Bono East', crop: 'Plantain (Apem)', price_per_kg: 7.50, date: todayStr, source: 'MoFA' },

      { market_name: 'Tamale Central Market', region: 'Northern', crop: 'White Maize', price_per_kg: 6.80, date: todayStr, source: 'MoFA' },
      { market_name: 'Tamale Central Market', region: 'Northern', crop: 'Yam (Pona)', price_per_kg: 9.00, date: todayStr, source: 'MoFA' },
      { market_name: 'Tamale Central Market', region: 'Northern', crop: 'Rice (Local)', price_per_kg: 11.50, date: todayStr, source: 'MoFA' }
    ];

    // Each seed row above is treated as *today's* price. To power the Market
    // Dashboard's price-trend charts (7D/30D/3M/6M/1Y) we also backfill a
    // trailing year of history per market+crop as a seeded random walk that
    // lands exactly on the known base price today — so trend charts have
    // real DB rows to read instead of the frontend faking a series.
    const historyRows = [];
    for (const p of prices) {
      historyRows.push(...generatePriceHistory(p));
    }

    for (const p of historyRows) {
      await db.run(
        `INSERT INTO market_prices (market_name, region, crop, price_per_kg, date, source)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [p.market_name, p.region, p.crop, p.price_per_kg, p.date, p.source]
      );
    }

    // Seed default listings
    await db.run(
      `INSERT OR IGNORE INTO listings (id, farmer_name, crop, quantity, unit, price, location, phone, deleted, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      ['listing-1', 'Kwame Boateng', 'White Maize', 50, 'Bags', 350.00, 'Techiman', '+233244123456', Date.now()]
    );
    await db.run(
      `INSERT OR IGNORE INTO listings (id, farmer_name, crop, quantity, unit, price, location, phone, deleted, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      ['listing-2', 'Abena Mensah', 'Yam (Pona)', 200, 'Tubers', 15.00, 'Kumasi', '+233201987654', Date.now()]
    );
  }
}

// REST endpoints

// Trend/period helpers shared by /api/prices/summary and /api/prices/history.
const PERIOD_DAYS = { '7d': 7, '30d': 30, '3m': 90, '6m': 180, '1y': 365 };

// `change` is an optional fallback for when the previous price was 0 — the
// percentage is mathematically undefined there, but the direction (free ->
// priced) is still real and shouldn't be reported as "stable" just because
// percentChange came back null.
function classifyTrend(percentChange, change) {
  if (percentChange == null) {
    if (change == null || change === 0) return 'stable';
    return change > 0 ? 'up' : 'down';
  }
  if (percentChange > 1) return 'up';
  if (percentChange < -1) return 'down';
  return 'stable';
}

// Only the most recent recorded price per (crop, market_name, region) — the
// market_prices table now holds a full trailing-year history per combo, so
// callers that just want "today's price list" (this endpoint, and the
// Regional Price Feeds UI it feeds) must not see every historical row.
app.get('/api/prices', async (req, res) => {
  try {
    const prices = await db.all(`
      SELECT mp.* FROM market_prices mp
      INNER JOIN (
        SELECT crop, market_name, MAX(date) as max_date
        FROM market_prices
        GROUP BY crop, market_name
      ) latest
        ON mp.crop = latest.crop
       AND mp.market_name = latest.market_name
       AND mp.date = latest.max_date
      ORDER BY mp.crop, mp.price_per_kg ASC
    `);
    res.json(prices);
  } catch (err) {
    res.status(500).json({ error: 'Database error fetching prices: ' + err.message });
  }
});

// Latest vs. previous price, change amount/percentage, and trend direction
// per (crop, market_name, region) — powers the Market Dashboard overview cards.
app.get('/api/prices/summary', async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT * FROM market_prices ORDER BY crop, market_name, date DESC'
    );

    const groups = new Map();
    for (const row of rows) {
      const key = `${row.crop}|${row.market_name}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }

    const summary = [];
    for (const groupRows of groups.values()) {
      const [latest, previous] = groupRows;
      const change = previous ? latest.price_per_kg - previous.price_per_kg : null;
      const percentChange =
        previous && previous.price_per_kg
          ? (change / previous.price_per_kg) * 100
          : null;

      summary.push({
        crop: latest.crop,
        market_name: latest.market_name,
        region: latest.region,
        unit: 'kg',
        current: latest.price_per_kg,
        previous: previous ? previous.price_per_kg : null,
        recordedAt: latest.date,
        change: change != null ? Math.round(change * 100) / 100 : null,
        percentChange: percentChange != null ? Math.round(percentChange * 100) / 100 : null,
        trend: classifyTrend(percentChange, change),
      });
    }

    summary.sort((a, b) => a.crop.localeCompare(b.crop) || a.current - b.current);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Database error fetching price summary: ' + err.message });
  }
});

// Historical price series for one crop (+ optional market) over a period,
// for the Product Price Trend screen.
app.get('/api/prices/history', async (req, res) => {
  const { crop, period = '30d' } = req.query;
  let { market_name: marketName } = req.query;

  if (!crop) {
    return res.status(400).json({ error: 'crop is required' });
  }
  const periodDays = PERIOD_DAYS[period];
  if (!periodDays) {
    return res.status(400).json({ error: `Invalid period. Use one of: ${Object.keys(PERIOD_DAYS).join(', ')}` });
  }

  try {
    const marketRows = await db.all(
      'SELECT DISTINCT market_name, region FROM market_prices WHERE crop = ? ORDER BY market_name',
      [crop]
    );
    if (marketRows.length === 0) {
      return res.status(404).json({ error: `No price data found for crop "${crop}"` });
    }
    if (!marketName) {
      marketName = marketRows[0].market_name;
    } else if (!marketRows.some((m) => m.market_name === marketName)) {
      return res.status(404).json({ error: `No price data found for "${crop}" at market "${marketName}"` });
    }

    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - periodDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const points = await db.all(
      `SELECT price_per_kg, date FROM market_prices
       WHERE crop = ? AND market_name = ? AND date >= ?
       ORDER BY date ASC`,
      [crop, marketName, cutoffStr]
    );

    const allForMarket = await db.all(
      `SELECT price_per_kg, date FROM market_prices
       WHERE crop = ? AND market_name = ?
       ORDER BY date DESC`,
      [crop, marketName]
    );

    const current = allForMarket[0] ? allForMarket[0].price_per_kg : null;
    const previous = allForMarket[1] ? allForMarket[1].price_per_kg : null;
    const change = current != null && previous != null ? current - previous : null;
    const percentChange = change != null && previous ? (change / previous) * 100 : null;

    const prices = points.map((p) => p.price_per_kg);
    const highest = prices.length ? Math.max(...prices) : null;
    const lowest = prices.length ? Math.min(...prices) : null;
    const region = marketRows.find((m) => m.market_name === marketName)?.region || null;

    res.json({
      crop,
      market_name: marketName,
      region,
      unit: 'kg',
      period,
      points: points.map((p) => ({ date: p.date, price: p.price_per_kg })),
      current,
      previous,
      change: change != null ? Math.round(change * 100) / 100 : null,
      percentChange: percentChange != null ? Math.round(percentChange * 100) / 100 : null,
      trend: classifyTrend(percentChange, change),
      highest,
      lowest,
      availableMarkets: marketRows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error fetching price history: ' + err.message });
  }
});

app.post('/api/prices/report', async (req, res) => {
  const { market_name, region, crop, price_per_kg, source } = req.body;
  if (!market_name || !region || !crop || price_per_kg == null || Number.isNaN(Number(price_per_kg))) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const date = new Date().toISOString().split('T')[0];
    const result = await db.run(
      `INSERT INTO market_prices (market_name, region, crop, price_per_kg, date, source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [market_name, region, crop, parseFloat(price_per_kg), date, source || 'Agent Crowdsource']
    );
    const newPrice = await db.get('SELECT * FROM market_prices WHERE id = ?', [result.lastID]);
    res.status(201).json(newPrice);
  } catch (err) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

app.get('/api/listings', async (req, res) => {
  try {
    const listings = await db.all('SELECT * FROM listings WHERE deleted = 0');
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// Database state inspector
app.get('/api/db-state', requireAuth(() => db), async (req, res) => {
  try {
    const listings = await db.all('SELECT * FROM listings');
    const messages = await db.all('SELECT * FROM messages ORDER BY timestamp ASC');
    const prices = await db.all('SELECT * FROM market_prices');
    res.json({ listings, messages, prices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset database endpoint (convenient for demonstrations) — requires a
// logged-in session so an anonymous caller can't wipe the shared demo DB.
app.post('/api/db-reset', requireAuth(() => db), async (req, res) => {
  try {
    await db.exec('DELETE FROM listings');
    await db.exec('DELETE FROM messages');
    await db.exec('DELETE FROM market_prices');
    await initDb();
    res.json({ message: 'Database reset and re-seeded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Offline-First Sync Endpoint
app.post('/api/sync', async (req, res) => {
  const { lastSync, changes, ownerId } = req.body;
  const serverTime = Date.now();
  const logs = [];

  if (lastSync === undefined || !changes) {
    return res.status(400).json({ error: 'Invalid sync payload structure' });
  }

  // Guests (client-generated "guest-..." ids, see mobile/simulator useAuth.js)
  // have no server account, so their claimed ownerId is trusted at face value
  // as a bearer capability, same as every other guest-scoped read in this app.
  // A claimed ownerId that looks like a real registered user (not
  // "guest-" prefixed) must be backed by a valid session for that same user —
  // otherwise any caller could read/write another user's listings and
  // messages just by naming their id (both are exposed via owner_id on the
  // public GET /api/listings).
  let effectiveOwnerId = null;
  if (ownerId) {
    if (String(ownerId).startsWith('guest-')) {
      effectiveOwnerId = ownerId;
    } else {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const session = token ? await db.get('SELECT * FROM sessions WHERE token = ?', [token]) : null;
      if (!session || session.expires_at < Date.now() || session.user_id !== ownerId) {
        return res.status(401).json({ error: 'ownerId does not match an authenticated session' });
      }
      effectiveOwnerId = ownerId;
    }
  }

  try {
    await db.run('BEGIN TRANSACTION');

    // 1. Process client listings changes
    if (changes.listings && changes.listings.length > 0) {
      for (const clientListing of changes.listings) {
        const serverListing = await db.get('SELECT * FROM listings WHERE id = ?', [clientListing.id]);

        // Only the listing's own owner (or nobody yet, for the two
        // legacy/ownerless seed listings) may modify an existing listing —
        // otherwise any caller could overwrite or soft-delete someone else's.
        if (serverListing && serverListing.owner_id && serverListing.owner_id !== effectiveOwnerId) {
          logs.push(`Listing ID ${clientListing.id} rejected: caller does not own this listing`);
          continue;
        }

        // A queued listing may carry a fresh photo as a base64 data URI
        // (image_base64) — decode+write it to a file here, same as the
        // profile avatar/cover pattern, rather than storing raw base64 in
        // SQL. Isolated in its own try/catch so one malformed image can't
        // ROLLBACK the whole sync batch of otherwise-valid listings/messages.
        let imagePath = serverListing ? serverListing.image_path : null;
        if (clientListing.image_base64) {
          try {
            if (serverListing?.image_path) {
              deleteImageFile(uploadsDir, serverListing.image_path);
            }
            imagePath = saveImageFile(uploadsDir, `listing-${clientListing.id}`, clientListing.image_base64);
          } catch (imgErr) {
            logs.push(`Listing ID ${clientListing.id} image rejected: ${imgErr.message}`);
            imagePath = serverListing ? serverListing.image_path : null;
          }
        }

        if (serverListing) {
          // Conflict Resolution: Check timestamp
          if (clientListing.updated_at > serverListing.updated_at) {
            logs.push(`Listing ID ${clientListing.id} updated: Client changes merged (client: ${clientListing.updated_at} > server: ${serverListing.updated_at})`);
            await db.run(
              `UPDATE listings SET
                farmer_name = ?, crop = ?, quantity = ?, unit = ?, price = ?, location = ?, phone = ?, deleted = ?, updated_at = ?, owner_id = ?, image_path = ?
               WHERE id = ?`,
              [
                clientListing.farmer_name,
                clientListing.crop,
                clientListing.quantity,
                clientListing.unit,
                clientListing.price,
                clientListing.location,
                clientListing.phone,
                clientListing.deleted ? 1 : 0,
                clientListing.updated_at,
                effectiveOwnerId,
                imagePath,
                clientListing.id
              ]
            );
          } else {
            logs.push(`Listing ID ${clientListing.id} conflict: Ignored client changes (server: ${serverListing.updated_at} >= client: ${clientListing.updated_at})`);
          }
        } else {
          logs.push(`Listing ID ${clientListing.id} created: Inserted client-side record`);
          await db.run(
            `INSERT INTO listings (id, farmer_name, crop, quantity, unit, price, location, phone, deleted, updated_at, owner_id, image_path)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              clientListing.id,
              clientListing.farmer_name,
              clientListing.crop,
              clientListing.quantity,
              clientListing.unit,
              clientListing.price,
              clientListing.location,
              clientListing.phone,
              clientListing.deleted ? 1 : 0,
              clientListing.updated_at,
              effectiveOwnerId,
              imagePath
            ]
          );
        }
      }
    }

    // 2. Process client messages changes
    if (changes.messages && changes.messages.length > 0) {
      for (const clientMsg of changes.messages) {
        const serverMsg = await db.get('SELECT * FROM messages WHERE id = ?', [clientMsg.id]);
        if (!serverMsg) {
          // A new message may only be pushed by one of its participants —
          // otherwise a caller could forge chat history for a conversation
          // they aren't part of.
          if (!effectiveOwnerId || (clientMsg.sender_id !== effectiveOwnerId && clientMsg.receiver_id !== effectiveOwnerId)) {
            logs.push(`Message ID ${clientMsg.id} rejected: caller is not a participant`);
            continue;
          }
          logs.push(`Message ID ${clientMsg.id} synchronized`);
          await db.run(
            `INSERT INTO messages (id, sender_id, receiver_id, content, timestamp, owner_id, read)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              clientMsg.id,
              clientMsg.sender_id,
              clientMsg.receiver_id,
              clientMsg.content,
              clientMsg.timestamp,
              effectiveOwnerId,
              clientMsg.read ? 1 : 0
            ]
          );
        } else if (clientMsg.read && !serverMsg.read && effectiveOwnerId && effectiveOwnerId === serverMsg.receiver_id) {
          // Only the receiving party may flip their own thread to read, and
          // only the read flag is ever touched for an existing message row.
          logs.push(`Message ID ${clientMsg.id} marked read`);
          await db.run('UPDATE messages SET read = 1 WHERE id = ?', [clientMsg.id]);
        }
      }
    }

    await db.run('COMMIT');

    // 3. Gather server updates that happened since lastSync
    // We select updates > lastSync, excluding updates that were just pushed by this client to avoid echoing.
    // However, to keep it simple, we retrieve all database updates since lastSync.
    // The client will merge them and overwrite matching IDs if client timestamp is older.
    const updatedListings = await db.all('SELECT * FROM listings WHERE updated_at > ?', [lastSync]);
    const newMessages = effectiveOwnerId
      ? await db.all(
          'SELECT * FROM messages WHERE timestamp > ? AND (owner_id = ? OR sender_id = ? OR receiver_id = ?)',
          [lastSync, effectiveOwnerId, effectiveOwnerId, effectiveOwnerId]
        )
      : [];

    res.json({
      serverTime,
      changes: {
        listings: updatedListings,
        messages: newMessages
      },
      logs
    });
  } catch (err) {
    try {
      await db.run('ROLLBACK');
    } catch (rollbackErr) {
      // Nothing to roll back if COMMIT already succeeded before this error
      // was thrown (e.g. one of the post-commit reads below it failed) —
      // swallow so this can never crash the whole process.
    }
    res.status(500).json({ error: 'Sync transaction failed: ' + err.message });
  }
});

// Run USSD dial simulation API (Optional backend routing if USSD simulation hits backend)
app.post('/api/ussd', async (req, res) => {
  const { text, phoneNumber } = req.body;
  // Format details: *412#
  // If text is '', show welcome menu.
  // If text is '1', show crop prices.
  // If text is '2', check my listing status.
  let response = '';
  
  if (!text) {
    response = `CON Welcome to Okuani Services
1. Check Market Prices
2. View Local Listings
3. Register Crop Sale`;
  } else if (text === '1') {
    try {
      const prices = await db.all('SELECT crop, AVG(price_per_kg) as avg_price FROM market_prices GROUP BY crop');
      response = `CON Select Crop for Avg Price:
` + prices.map((p, idx) => `${idx + 1}. ${p.crop} (GHS ${p.avg_price.toFixed(1)}/kg)`).join('\n');
    } catch (e) {
      response = `END System Error. Please try again.`;
    }
  } else if (text.startsWith('1*')) {
    const parts = text.split('*');
    const selectedIdx = parseInt(parts[1]) - 1;
    try {
      const cropsList = await db.all('SELECT DISTINCT crop FROM market_prices');
      const crop = cropsList[selectedIdx]?.crop;
      if (crop) {
        const cropPrices = await db.all('SELECT market_name, price_per_kg FROM market_prices WHERE crop = ?', [crop]);
        response = `END ${crop} prices per kg:
` + cropPrices.map(c => `${c.market_name}: GHS ${c.price_per_kg}`).join('\n');
      } else {
        response = `END Invalid selection.`;
      }
    } catch (e) {
      response = `END Error.`;
    }
  } else if (text === '2') {
    try {
      const count = await db.get('SELECT COUNT(*) as cnt FROM listings WHERE deleted = 0');
      response = `END Okuani currently has ${count.cnt} active produce listings online.
Visit the app to view and contact sellers.`;
    } catch (e) {
      response = `END Error.`;
    }
  } else if (text === '3') {
    response = `CON Enter Crop & Price:
Format: Crop*Qty*Price (e.g. Maize*10*350)`;
  } else if (text.startsWith('3*')) {
    const parts = text.split('*');
    if (parts.length === 4) {
      const cropName = parts[1];
      const qty = parseFloat(parts[2]);
      const priceVal = parseFloat(parts[3]);
      
      const id = 'ussd-' + Math.random().toString(36).substring(2, 9);
      try {
        await db.run(
          `INSERT INTO listings (id, farmer_name, crop, quantity, unit, price, location, phone, deleted, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
          [id, 'USSD Farmer', cropName, qty, 'Bags', priceVal, 'Regional', phoneNumber || '+2330000000', Date.now()]
        );
        response = `END Success! Your listing of ${qty} bags of ${cropName} for GHS ${priceVal} has been listed.`;
      } catch (err) {
        response = `END Listing registration failed. Try again.`;
      }
    } else {
      response = `END Invalid input format. Please follow Crop*Qty*Price`;
    }
  } else {
    response = `END Invalid option. Dial *412# to restart.`;
  }

  res.send(response);
});

// Run server
initDb().then(() => {
  server = app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` OKUANI BACKEND SERVER RUNNING ON PORT ${PORT} `);
    console.log(` DB SQLite initialized at backend/database.sqlite`);
    console.log(` API Endpoint: http://localhost:${PORT} `);
    console.log(` Health Check: http://localhost:${PORT}/health `);
    console.log(`==================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please stop the existing server and try again.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  server?.close(() => process.exit(0));
});
