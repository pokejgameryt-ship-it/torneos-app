const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authRequired, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, nickname, password } = req.body;
  if (!email || !nickname || !password) {
    return res.status(400).json({ error: 'Email, nickname y contraseña requeridos' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
  }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR nickname = ?').get(email, nickname);
  if (existing) {
    return res.status(400).json({ error: 'Email o nickname ya existen' });
  }
  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id, email, nickname, password_hash) VALUES (?, ?, ?, ?)').run(id, email, nickname, password_hash);
  const token = jwt.sign({ id, email, nickname }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id, email, nickname } });
});

router.post('/login', (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Email/nickname y contraseña requeridos' });
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ? OR nickname = ?').get(login, login);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, nickname: user.nickname }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, nickname: user.nickname } });
});

router.get('/me', authRequired, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, nickname, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

router.put('/me', authRequired, (req, res) => {
  const { nickname } = req.body;
  const db = getDb();
  if (nickname) {
    const existing = db.prepare('SELECT id FROM users WHERE nickname = ? AND id != ?').get(nickname, req.user.id);
    if (existing) return res.status(400).json({ error: 'Nickname ya en uso' });
    db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname, req.user.id);
  }
  const user = db.prepare('SELECT id, email, nickname, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;
