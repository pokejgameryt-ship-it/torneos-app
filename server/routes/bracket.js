const express = require('express');
const { getDb } = require('../db');
const { getRoundName } = require('../logic/bracket');

const router = express.Router();

router.get('/:id', (req, res) => {
  const db = getDb();
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  const formats = db.prepare('SELECT * FROM tournament_formats WHERE tournament_id = ?').all(req.params.id);
  const matches = db.prepare('SELECT * FROM matches WHERE tournament_id = ? ORDER BY bracket_type, round, position').all(req.params.id);
  const participants = db.prepare('SELECT * FROM participants WHERE tournament_id = ?').all(req.params.id);

  const participantMap = {};
  participants.forEach(p => { participantMap[p.id] = p; });

  const wbRounds = Math.log2(tournament.bracket_size || 8);
  const lbRounds = 2 * (wbRounds - 1);

  const enrichedMatches = matches.map(m => ({
    ...m,
    round_name: getRoundName(m.bracket_type, m.round, wbRounds, lbRounds),
    player1: m.player1_id ? participantMap[m.player1_id] : null,
    player2: m.player2_id ? participantMap[m.player2_id] : null,
    winner: m.winner_id ? participantMap[m.winner_id] : null
  }));

  const winners = enrichedMatches.filter(m => m.bracket_type === 'winners');
  const losers = enrichedMatches.filter(m => m.bracket_type === 'losers');
  const grandFinal = enrichedMatches.filter(m => m.bracket_type === 'grand_final');

  res.json({
    tournament: { ...tournament, formats },
    bracket: {
      winners,
      losers,
      grandFinal
    },
    participants
  });
});

module.exports = router;
