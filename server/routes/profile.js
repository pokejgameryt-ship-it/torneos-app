const express = require('express');
const bcrypt = require('bcrypt');
const { getDb } = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/me/full', authRequired, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, nickname, display_name, bio, games, avatar, country, continent, default_nickname, default_flag, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

router.put('/me', authRequired, (req, res) => {
  const db = getDb();
  const { display_name, bio, games, avatar, country, continent, default_nickname, default_flag } = req.body;
  db.prepare(`
    UPDATE users SET 
      display_name = COALESCE(?, display_name),
      bio = COALESCE(?, bio),
      games = COALESCE(?, games),
      avatar = COALESCE(?, avatar),
      country = COALESCE(?, country),
      continent = COALESCE(?, continent),
      default_nickname = COALESCE(?, default_nickname),
      default_flag = COALESCE(?, default_flag)
    WHERE id = ?
  `).run(
    display_name !== undefined ? display_name : null,
    bio !== undefined ? bio : null,
    games !== undefined ? games : null,
    avatar !== undefined ? avatar : null,
    country !== undefined ? country : null,
    continent !== undefined ? continent : null,
    default_nickname !== undefined ? default_nickname : null,
    default_flag !== undefined ? default_flag : null,
    req.user.id
  );
  const user = db.prepare('SELECT id, email, nickname, display_name, bio, games, avatar, country, continent, default_nickname, default_flag, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

router.put('/me/password', authRequired, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Contraseña actual y nueva requeridas' });
  if (new_password.length < 4) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' });
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password_hash)) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

router.put('/me/nickname', authRequired, (req, res) => {
  const { nickname } = req.body;
  if (!nickname || !nickname.trim()) return res.status(400).json({ error: 'Nickname requerido' });
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE nickname = ? AND id != ?').get(nickname.trim(), req.user.id);
  if (existing) return res.status(400).json({ error: 'Nickname ya en uso' });
  db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname.trim(), req.user.id);
  const user = db.prepare('SELECT id, email, nickname, display_name, bio, games, avatar, country, continent, default_nickname, default_flag FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

router.get('/:userId', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, nickname, display_name, bio, games, avatar, country, continent, created_at FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  const participations = db.prepare(`
    SELECT p.tournament_id, t.name as tournament_name, t.status as tournament_status, t.bracket_size,
           (SELECT COUNT(*) FROM matches WHERE tournament_id = p.tournament_id AND status = 'completed' AND (player1_id = p.id OR player2_id = p.id)) as matches_played,
           (SELECT COUNT(*) FROM matches WHERE tournament_id = p.tournament_id AND status = 'completed' AND winner_id = p.id) as matches_won
    FROM participants p JOIN tournaments t ON p.tournament_id = t.id 
    WHERE p.user_id = ? ORDER BY t.created_at DESC
  `).all(req.params.userId);
  const stats = participations.map(p => {
    let placement = p.bracket_size;
    if (p.tournament_status === 'completed') {
      const better = db.prepare(`
        SELECT COUNT(DISTINCT p2.id) as cnt FROM participants p2 
        WHERE p2.tournament_id = ? AND p2.id != ? AND (
          SELECT COUNT(*) FROM matches WHERE tournament_id = ? AND status = 'completed' AND winner_id = p2.id
        ) > ?
      `).get(p.tournament_id, p.id, p.tournament_id, p.matches_won);
      placement = better.cnt + 1;
    }
    return { ...p, placement };
  });
  res.json({ ...user, stats });
});

module.exports = router;
