const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authRequired } = require('../middleware/auth');
const { isMatchParticipant, isTournamentCreator } = require('../middleware/auth-helpers');

const router = express.Router();

router.get('/:matchId/chat', authRequired, (req, res) => {
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.matchId);
  if (!match) return res.status(404).json({ error: 'Partida no encontrada' });

  if (!isMatchParticipant(req.params.matchId, req.user.id) && !isTournamentCreator(match.tournament_id, req.user.id)) {
    return res.status(403).json({ error: 'No eres participante de esta partida' });
  }

  const messages = db.prepare(`
    SELECT cm.*, u.nickname
    FROM chat_messages cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.match_id = ?
    ORDER BY cm.created_at ASC
  `).all(req.params.matchId);

  res.json(messages);
});

router.post('/:matchId/chat', authRequired, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Mensaje requerido' });
  }

  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.matchId);
  if (!match) return res.status(404).json({ error: 'Partida no encontrada' });

  if (!isMatchParticipant(req.params.matchId, req.user.id)) {
    return res.status(403).json({ error: 'No eres participante de esta partida' });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO chat_messages (id, match_id, user_id, content) VALUES (?, ?, ?, ?)').run(id, req.params.matchId, req.user.id, content.trim());

  const msg = db.prepare(`
    SELECT cm.*, u.nickname
    FROM chat_messages cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.id = ?
  `).get(id);

  const io = req.app.get('io');
  if (io) {
    io.to(`match:${req.params.matchId}`).emit('chat:message', msg);
  }

  res.json(msg);
});

module.exports = router;
