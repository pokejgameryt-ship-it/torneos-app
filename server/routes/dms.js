const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authRequired } = require('../middleware/auth');
const router = express.Router();

router.get('/unread-count', authRequired, (req, res) => {
  const db = getDb();
  const result = db.prepare('SELECT COUNT(*) as count FROM direct_messages WHERE receiver_id = ? AND is_read = 0').get(req.user.id);
  res.json({ count: result.count });
});

router.get('/conversations', authRequired, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const conversations = db.prepare(`
    SELECT u.id as other_id, u.nickname, u.display_name, u.avatar,
      (SELECT content FROM direct_messages WHERE 
        ((sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?))
        ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM direct_messages WHERE 
        ((sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?))
        ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*) FROM direct_messages WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0) as unread_count
    FROM users u
    WHERE u.id IN (
      SELECT sender_id FROM direct_messages WHERE receiver_id = ?
      UNION
      SELECT receiver_id FROM direct_messages WHERE sender_id = ?
    )
    ORDER BY last_message_at DESC
  `).all(userId, userId, userId, userId, userId, userId, userId);
  res.json(conversations);
});

router.get('/:userId', authRequired, (req, res) => {
  const db = getDb();
  const messages = db.prepare(`
    SELECT dm.*, u.nickname as sender_nickname, u.display_name as sender_display_name
    FROM direct_messages dm JOIN users u ON dm.sender_id = u.id
    WHERE (dm.sender_id = ? AND dm.receiver_id = ?) OR (dm.sender_id = ? AND dm.receiver_id = ?)
    ORDER BY dm.created_at ASC
  `).all(req.user.id, req.params.userId, req.params.userId, req.user.id);
  db.prepare('UPDATE direct_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0').run(req.params.userId, req.user.id);
  const io = req.app.get('io');
  if (io) io.to(`dm:${req.user.id}`).emit('dm:read');
  res.json(messages);
});

router.post('/:userId', authRequired, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Mensaje requerido' });
  const db = getDb();
  const receiver = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!receiver) return res.status(404).json({ error: 'Usuario no encontrado' });
  const id = uuidv4();
  db.prepare('INSERT INTO direct_messages (id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)').run(id, req.user.id, req.params.userId, content.trim());
  const msg = db.prepare(`
    SELECT dm.*, u.nickname as sender_nickname, u.display_name as sender_display_name
    FROM direct_messages dm JOIN users u ON dm.sender_id = u.id WHERE dm.id = ?
  `).get(id);
  const io = req.app.get('io');
  if (io) {
    io.to(`dm:${req.params.userId}`).emit('dm:message', msg);
    io.to(`dm:${req.user.id}`).emit('dm:message', msg);
  }
  res.json(msg);
});

module.exports = router;
