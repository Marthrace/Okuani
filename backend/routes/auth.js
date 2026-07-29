const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const requireAuth = require('../middleware/requireAuth');

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const RESET_CODE_TTL_MS = 1000 * 60 * 5; // 5 minutes

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

async function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.run(
    `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
    [token, userId, Date.now(), Date.now() + SESSION_TTL_MS]
  );
  return token;
}

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone };
}

module.exports = function createAuthRouter(getDb) {
  const router = express.Router();

  router.post('/signup', async (req, res) => {
    const db = getDb();
    const { name, email, phone, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }
    if (!email && !phone) {
      return res.status(400).json({ error: 'Provide an email or phone number' });
    }

    try {
      const existing = await db.get(
        `SELECT id FROM users WHERE (email IS NOT NULL AND email = ?) OR (phone IS NOT NULL AND phone = ?)`,
        [email || null, phone || null]
      );
      if (existing) {
        return res.status(409).json({ error: 'Email or phone already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const id = makeId('user');
      await db.run(
        `INSERT INTO users (id, name, email, phone, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, name, email || null, phone || null, passwordHash, Date.now()]
      );

      const token = await createSession(db, id);
      res.status(201).json({ token, user: { id, name, email: email || null, phone: phone || null } });
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  router.post('/login', async (req, res) => {
    const db = getDb();
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    try {
      const user = await db.get('SELECT * FROM users WHERE email = ? OR phone = ?', [identifier, identifier]);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = await createSession(db, user.id);
      res.json({ token, user: toPublicUser(user) });
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  router.post('/forgot-password/request', async (req, res) => {
    const db = getDb();
    const { identifier, channel } = req.body;

    if (!identifier || !['sms', 'email'].includes(channel)) {
      return res.status(400).json({ error: 'Provide an identifier and a channel of sms or email' });
    }

    try {
      const user = await db.get('SELECT * FROM users WHERE email = ? OR phone = ?', [identifier, identifier]);
      if (!user) {
        return res.status(404).json({ error: 'No account found for that identifier' });
      }

      const code = String(crypto.randomInt(100000, 1000000));
      const id = makeId('reset');
      const expiresAt = Date.now() + RESET_CODE_TTL_MS;
      const destination = channel === 'sms' ? user.phone || identifier : user.email || identifier;

      await db.run(
        `INSERT INTO password_resets (id, user_id, code, channel, destination, expires_at, consumed, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [id, user.id, code, channel, destination, expiresAt, Date.now()]
      );

      // Simulated delivery — this project has no real SMS/email provider wired
      // up, matching the existing mock /api/ussd "fake telco" precedent.
      console.log(`[SIMULATED ${channel.toUpperCase()}] -> ${destination}: Your OKUANI verification code is ${code} (expires in 5 min)`);

      res.json({ resetId: id, expiresAt, channel, destination, devCode: code });
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  router.post('/forgot-password/verify', async (req, res) => {
    const db = getDb();
    const { resetId, code } = req.body;

    if (!resetId || !code) {
      return res.status(400).json({ error: 'resetId and code are required' });
    }

    try {
      const reset = await db.get('SELECT * FROM password_resets WHERE id = ?', [resetId]);
      if (!reset || reset.consumed || reset.expires_at < Date.now() || reset.code !== String(code)) {
        return res.status(400).json({ error: 'Invalid or expired code' });
      }

      const resetToken = crypto.randomBytes(24).toString('hex');
      await db.run('UPDATE password_resets SET reset_token = ? WHERE id = ?', [resetToken, resetId]);
      res.json({ resetToken });
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  router.post('/reset-password', async (req, res) => {
    const db = getDb();
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'resetToken and newPassword are required' });
    }

    try {
      const reset = await db.get('SELECT * FROM password_resets WHERE reset_token = ?', [resetToken]);
      if (!reset || reset.consumed || reset.expires_at < Date.now()) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, reset.user_id]);
      await db.run('UPDATE password_resets SET consumed = 1 WHERE id = ?', [reset.id]);

      const user = await db.get('SELECT * FROM users WHERE id = ?', [reset.user_id]);
      const token = await createSession(db, user.id);
      res.json({ token, user: toPublicUser(user) });
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  router.post('/verify-password', requireAuth(getDb), async (req, res) => {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    try {
      const valid = await bcrypt.compare(password, req.user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
      res.json({ valid: true });
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  router.post('/logout', requireAuth(getDb), async (req, res) => {
    const db = getDb();
    const token = req.headers.authorization.slice(7);

    try {
      await db.run('DELETE FROM sessions WHERE token = ?', [token]);
      res.json({ loggedOut: true });
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  router.post('/merge', requireAuth(getDb), async (req, res) => {
    const db = getDb();
    const { guestId } = req.body;

    if (!guestId) {
      return res.status(400).json({ error: 'guestId is required' });
    }

    try {
      const listingsResult = await db.run('UPDATE listings SET owner_id = ? WHERE owner_id = ?', [
        req.user.id,
        guestId,
      ]);
      const messagesResult = await db.run(
        `UPDATE messages SET
           owner_id = ?,
           sender_id = CASE WHEN sender_id = ? THEN ? ELSE sender_id END,
           receiver_id = CASE WHEN receiver_id = ? THEN ? ELSE receiver_id END
         WHERE owner_id = ?`,
        [req.user.id, guestId, req.user.id, guestId, req.user.id, guestId]
      );

      res.json({
        mergedListings: listingsResult.changes || 0,
        mergedMessages: messagesResult.changes || 0,
      });
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  return router;
};
