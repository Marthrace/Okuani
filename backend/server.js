
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const createAuthRouter = require('./routes/auth');
const createProfilesRouter = require('./routes/profiles');

const app = express();
const PORT = Number(process.env.PORT || 5000);

const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '8mb' })); // profile photos are base64 JSON payloads, well over the 100kb default
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

  // Profile fields, added the same way for the same reason (users predates profiles).
  await ensureColumn(db, 'users', 'headline', 'TEXT');
  await ensureColumn(db, 'users', 'about', 'TEXT');
  await ensureColumn(db, 'users', 'avatar_path', 'TEXT');
  await ensureColumn(db, 'users', 'cover_path', 'TEXT');
  await ensureColumn(db, 'users', 'phone_verified', 'INTEGER DEFAULT 0');
  await ensureColumn(db, 'users', 'id_verified', 'INTEGER DEFAULT 0');
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
    const prices = [
      { market_name: 'Makola Market', region: 'Greater Accra', crop: 'White Maize', price_per_kg: 8.50, date: '2026-07-20', source: 'Esoko Ghana' },
      { market_name: 'Makola Market', region: 'Greater Accra', crop: 'Yam (Pona)', price_per_kg: 12.00, date: '2026-07-20', source: 'Esoko Ghana' },
      { market_name: 'Makola Market', region: 'Greater Accra', crop: 'Cassava', price_per_kg: 4.50, date: '2026-07-20', source: 'Esoko Ghana' },
      
      { market_name: 'Central Market', region: 'Ashanti', crop: 'White Maize', price_per_kg: 7.80, date: '2026-07-20', source: 'Esoko Ghana' },
      { market_name: 'Central Market', region: 'Ashanti', crop: 'Yam (Pona)', price_per_kg: 10.50, date: '2026-07-20', source: 'Esoko Ghana' },
      { market_name: 'Central Market', region: 'Ashanti', crop: 'Plantain (Apem)', price_per_kg: 9.00, date: '2026-07-20', source: 'Esoko Ghana' },
      
      { market_name: 'Techiman Market', region: 'Bono East', crop: 'White Maize', price_per_kg: 6.20, date: '2026-07-20', source: 'MoFA' },
      { market_name: 'Techiman Market', region: 'Bono East', crop: 'Yam (Pona)', price_per_kg: 8.00, date: '2026-07-20', source: 'MoFA' },
      { market_name: 'Techiman Market', region: 'Bono East', crop: 'Cassava', price_per_kg: 3.20, date: '2026-07-20', source: 'MoFA' },
      { market_name: 'Techiman Market', region: 'Bono East', crop: 'Plantain (Apem)', price_per_kg: 7.50, date: '2026-07-20', source: 'MoFA' },
      
      { market_name: 'Tamale Central Market', region: 'Northern', crop: 'White Maize', price_per_kg: 6.80, date: '2026-07-20', source: 'MoFA' },
      { market_name: 'Tamale Central Market', region: 'Northern', crop: 'Yam (Pona)', price_per_kg: 9.00, date: '2026-07-20', source: 'MoFA' },
      { market_name: 'Tamale Central Market', region: 'Northern', crop: 'Rice (Local)', price_per_kg: 11.50, date: '2026-07-20', source: 'MoFA' }
    ];

    for (const p of prices) {
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
app.get('/api/prices', async (req, res) => {
  try {
    const prices = await db.all('SELECT * FROM market_prices ORDER BY crop, price_per_kg ASC');
    res.json(prices);
  } catch (err) {
    res.status(500).json({ error: 'Database error fetching prices: ' + err.message });
  }
});

app.post('/api/prices/report', async (req, res) => {
  const { market_name, region, crop, price_per_kg, source } = req.body;
  if (!market_name || !region || !crop || !price_per_kg) {
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
app.get('/api/db-state', async (req, res) => {
  try {
    const listings = await db.all('SELECT * FROM listings');
    const messages = await db.all('SELECT * FROM messages ORDER BY timestamp ASC');
    const prices = await db.all('SELECT * FROM market_prices');
    res.json({ listings, messages, prices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset database endpoint (convenient for demonstrations)
app.post('/api/db-reset', async (req, res) => {
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

  try {
    await db.run('BEGIN TRANSACTION');

    // 1. Process client listings changes
    if (changes.listings && changes.listings.length > 0) {
      for (const clientListing of changes.listings) {
        const serverListing = await db.get('SELECT * FROM listings WHERE id = ?', [clientListing.id]);

        if (serverListing) {
          // Conflict Resolution: Check timestamp
          if (clientListing.updated_at > serverListing.updated_at) {
            logs.push(`Listing ID ${clientListing.id} updated: Client changes merged (client: ${clientListing.updated_at} > server: ${serverListing.updated_at})`);
            await db.run(
              `UPDATE listings SET
                farmer_name = ?, crop = ?, quantity = ?, unit = ?, price = ?, location = ?, phone = ?, deleted = ?, updated_at = ?, owner_id = ?
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
                clientListing.owner_id || null,
                clientListing.id
              ]
            );
          } else {
            logs.push(`Listing ID ${clientListing.id} conflict: Ignored client changes (server: ${serverListing.updated_at} >= client: ${clientListing.updated_at})`);
          }
        } else {
          logs.push(`Listing ID ${clientListing.id} created: Inserted client-side record`);
          await db.run(
            `INSERT INTO listings (id, farmer_name, crop, quantity, unit, price, location, phone, deleted, updated_at, owner_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
              clientListing.owner_id || null
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
          logs.push(`Message ID ${clientMsg.id} synchronized`);
          await db.run(
            `INSERT INTO messages (id, sender_id, receiver_id, content, timestamp, owner_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              clientMsg.id,
              clientMsg.sender_id,
              clientMsg.receiver_id,
              clientMsg.content,
              clientMsg.timestamp,
              clientMsg.owner_id || null
            ]
          );
        }
      }
    }

    await db.run('COMMIT');

    // 3. Gather server updates that happened since lastSync
    // We select updates > lastSync, excluding updates that were just pushed by this client to avoid echoing.
    // However, to keep it simple, we retrieve all database updates since lastSync.
    // The client will merge them and overwrite matching IDs if client timestamp is older.
    const updatedListings = await db.all('SELECT * FROM listings WHERE updated_at > ?', [lastSync]);
    const newMessages = ownerId
      ? await db.all(
          'SELECT * FROM messages WHERE timestamp > ? AND (owner_id = ? OR sender_id = ? OR receiver_id = ?)',
          [lastSync, ownerId, ownerId, ownerId]
        )
      : await db.all('SELECT * FROM messages WHERE timestamp > ?', [lastSync]);

    res.json({
      serverTime,
      changes: {
        listings: updatedListings,
        messages: newMessages
      },
      logs
    });
  } catch (err) {
    await db.run('ROLLBACK');
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
