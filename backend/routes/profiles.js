const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');

const PHONE_CODE_TTL_MS = 1000 * 60 * 5; // 5 minutes
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB
const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    location: user.location,
    role: user.role,
    headline: user.headline,
    about: user.about,
    avatarUrl: user.avatar_path,
    coverUrl: user.cover_path,
    phoneVerified: !!user.phone_verified,
    idVerified: !!user.id_verified,
    memberSince: user.created_at,
  };
}

module.exports = function createProfilesRouter(getDb, uploadsDir) {
  const router = express.Router();

  router.get('/:userId', async (req, res) => {
    const db = getDb();
    try {
      const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.userId]);
      if (!user) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const listings = await db.all(
        'SELECT * FROM listings WHERE owner_id = ? AND deleted = 0 ORDER BY updated_at DESC',
        [user.id]
      );
      const reviews = await db.all(
        `SELECT r.id, r.rating, r.comment, r.created_at, r.reviewer_id, u.name as reviewer_name
         FROM reviews r JOIN users u ON u.id = r.reviewer_id
         WHERE r.target_user_id = ? ORDER BY r.created_at DESC`,
        [user.id]
      );
      const averageRating = reviews.length
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null;

      res.json({
        ...serializeUser(user),
        listings,
        reviews,
        averageRating,
        reviewCount: reviews.length,
      });
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  router.get('/:userId/reviews', async (req, res) => {
    const db = getDb();
    try {
      const reviews = await db.all(
        `SELECT r.id, r.rating, r.comment, r.created_at, r.reviewer_id, u.name as reviewer_name
         FROM reviews r JOIN users u ON u.id = r.reviewer_id
         WHERE r.target_user_id = ? ORDER BY r.created_at DESC`,
        [req.params.userId]
      );
      res.json(reviews);
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  router.post('/:userId/reviews', requireAuth(getDb), async (req, res) => {
    const db = getDb();
    const targetUserId = req.params.userId;
    const { rating, comment } = req.body;

    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'You cannot review your own profile' });
    }
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be an integer from 1 to 5' });
    }

    try {
      const target = await db.get('SELECT id FROM users WHERE id = ?', [targetUserId]);
      if (!target) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const contact = await db.get(
        `SELECT 1 FROM messages
         WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
         LIMIT 1`,
        [req.user.id, targetUserId, targetUserId, req.user.id]
      );
      if (!contact) {
        return res.status(403).json({ error: 'Message this seller before leaving a review' });
      }

      const existing = await db.get(
        'SELECT id FROM reviews WHERE target_user_id = ? AND reviewer_id = ?',
        [targetUserId, req.user.id]
      );
      const now = Date.now();
      if (existing) {
        await db.run('UPDATE reviews SET rating = ?, comment = ?, updated_at = ? WHERE id = ?', [
          ratingNum,
          comment || null,
          now,
          existing.id,
        ]);
      } else {
        await db.run(
          `INSERT INTO reviews (id, target_user_id, reviewer_id, rating, comment, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [makeId('review'), targetUserId, req.user.id, ratingNum, comment || null, now, now]
        );
      }

      res.status(existing ? 200 : 201).json({ saved: true });
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  router.patch('/me', requireAuth(getDb), async (req, res) => {
    const db = getDb();
    const allowed = ['name', 'headline', 'about', 'email', 'phone', 'location', 'role'];
    const updates = allowed.filter((k) => Object.prototype.hasOwnProperty.call(req.body, k));

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }
    if (updates.includes('name') && !String(req.body.name || '').trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }
    if (updates.includes('role') && !['buyer', 'seller'].includes(req.body.role)) {
      return res.status(400).json({ error: 'Role must be buyer or seller' });
    }

    try {
      if (updates.includes('email') && req.body.email) {
        const conflict = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [req.body.email, req.user.id]);
        if (conflict) return res.status(409).json({ error: 'Email already in use by another account' });
      }
      if (updates.includes('phone') && req.body.phone) {
        const conflict = await db.get('SELECT id FROM users WHERE phone = ? AND id != ?', [req.body.phone, req.user.id]);
        if (conflict) return res.status(409).json({ error: 'Phone already in use by another account' });
      }

      const setClause = updates.map((k) => `${k} = ?`).join(', ');
      const values = updates.map((k) => req.body[k]);
      await db.run(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, req.user.id]);
      const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
      res.json({ user: serializeUser(user) });
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  router.get('/me/contacts', requireAuth(getDb), async (req, res) => {
    const db = getDb();
    try {
      const contacts = await db.all(
        `SELECT DISTINCT u.id, u.name, u.avatar_path
         FROM messages m
         JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
         WHERE (m.sender_id = ? OR m.receiver_id = ?) AND u.id != ?`,
        [req.user.id, req.user.id, req.user.id, req.user.id]
      );
      res.json(contacts.map((c) => ({ id: c.id, name: c.name, avatarUrl: c.avatar_path })));
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  router.post('/me/photo', requireAuth(getDb), async (req, res) => {
    const db = getDb();
    const { slot, imageBase64 } = req.body;

    if (!['avatar', 'cover'].includes(slot)) {
      return res.status(400).json({ error: 'slot must be avatar or cover' });
    }
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }
    const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match || !MIME_EXT[match[1]]) {
      return res.status(400).json({ error: 'Unsupported image format' });
    }
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > MAX_PHOTO_BYTES) {
      return res.status(400).json({ error: 'Image is too large (max 5MB)' });
    }

    try {
      const column = slot === 'avatar' ? 'avatar_path' : 'cover_path';
      const previous = await db.get(`SELECT ${column} as path FROM users WHERE id = ?`, [req.user.id]);

      const filename = `${req.user.id}-${slot}-${Date.now()}.${MIME_EXT[match[1]]}`;
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);

      await db.run(`UPDATE users SET ${column} = ? WHERE id = ?`, [`/uploads/${filename}`, req.user.id]);

      if (previous?.path) {
        fs.unlink(path.join(uploadsDir, path.basename(previous.path)), () => {});
      }

      const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
      res.json({ user: serializeUser(user) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save photo: ' + err.message });
    }
  });

  router.post('/me/verify-phone/request', requireAuth(getDb), async (req, res) => {
    const db = getDb();
    if (!req.user.phone) {
      return res.status(404).json({ error: 'No phone number on file for this account' });
    }

    try {
      const code = String(crypto.randomInt(100000, 1000000));
      const id = makeId('phoneverify');
      const expiresAt = Date.now() + PHONE_CODE_TTL_MS;

      await db.run(
        `INSERT INTO phone_verifications (id, user_id, code, expires_at, consumed, created_at)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [id, req.user.id, code, expiresAt, Date.now()]
      );

      // Simulated delivery, same pattern as the forgot-password OTP — no real SMS provider wired up.
      console.log(`[SIMULATED SMS] -> ${req.user.phone}: Your OKUANI phone verification code is ${code} (expires in 5 min)`);

      res.json({ verificationId: id, expiresAt, devCode: code });
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  router.post('/me/verify-phone/confirm', requireAuth(getDb), async (req, res) => {
    const db = getDb();
    const { verificationId, code } = req.body;

    if (!verificationId || !code) {
      return res.status(400).json({ error: 'verificationId and code are required' });
    }

    try {
      const record = await db.get('SELECT * FROM phone_verifications WHERE id = ? AND user_id = ?', [
        verificationId,
        req.user.id,
      ]);
      if (!record || record.consumed || record.expires_at < Date.now() || record.code !== String(code)) {
        return res.status(400).json({ error: 'Invalid or expired code' });
      }

      await db.run('UPDATE phone_verifications SET consumed = 1 WHERE id = ?', [record.id]);
      await db.run('UPDATE users SET phone_verified = 1 WHERE id = ?', [req.user.id]);

      const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
      res.json({ user: serializeUser(user) });
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  router.post('/me/verify-id', requireAuth(getDb), async (req, res) => {
    const db = getDb();
    try {
      await db.run('UPDATE users SET id_verified = 1 WHERE id = ?', [req.user.id]);
      const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
      res.json({ user: serializeUser(user) });
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  return router;
};
