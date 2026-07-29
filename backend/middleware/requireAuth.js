function requireAuth(getDb) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    try {
      const db = getDb();
      const session = await db.get('SELECT * FROM sessions WHERE token = ?', [token]);
      if (!session || session.expires_at < Date.now()) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
      const user = await db.get('SELECT * FROM users WHERE id = ?', [session.user_id]);
      if (!user) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
      req.user = user;
      next();
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  };
}

module.exports = requireAuth;
