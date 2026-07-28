const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

router.get('/tournaments', (req, res) => {
  const { q, game, status } = req.query;
  const db = getDb();
  let query = `SELECT id, name, game, tournament_type, elimination_type, bracket_size, status, game_type, is_public, requirements, created_at FROM tournaments WHERE is_public = 1`;
  const params = [];
  if (q && q.trim()) { query += ` AND name LIKE ?`; params.push(`%${q.trim()}%`); }
  if (game && game.trim()) { query += ` AND (game LIKE ? OR game_type = ?)`; params.push(`%${game.trim()}%`, game.trim()); }
  if (status && status.trim()) { query += ` AND status = ?`; params.push(status.trim()); }
  query += ` ORDER BY created_at DESC LIMIT 50`;
  const tournaments = db.prepare(query).all(...params);
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM participants WHERE tournament_id = ?');
  res.json(tournaments.map(t => ({ ...t, registered: countStmt.get(t.id).count })));
});

router.get('/users', (req, res) => {
  const { q } = req.query;
  const db = getDb();
  if (!q || !q.trim()) return res.json([]);
  const users = db.prepare(`
    SELECT id, nickname, display_name, avatar, country, continent, games 
    FROM users WHERE nickname LIKE ? OR display_name LIKE ? LIMIT 20
  `).all(`%${q.trim()}%`, `%${q.trim()}%`);
  res.json(users);
});

module.exports = router;
