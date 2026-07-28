const express = require('express');
const { getDb } = require('../db');
const { advanceWinner } = require('../logic/bracket');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/:id', (req, res) => {
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
  res.json(match);
});

router.put('/:id/character', authRequired, (req, res) => {
  const { character, player } = req.body;
  if (!character) return res.status(400).json({ error: 'character requerido' });
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Partida no encontrada' });
  const col = player === 2 ? 'character2' : 'character1';
  db.prepare(`UPDATE matches SET ${col} = ? WHERE id = ?`).run(character, req.params.id);
  const io = req.app.get('io');
  if (io) io.to(`match:${req.params.id}`).emit('stage:updated', { matchId: req.params.id });
  const updated = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  res.json({ success: true, match: updated });
});

router.put('/:id/result', (req, res) => {
  const db = getDb();
  const { winner_id, player1_score, player2_score } = req.body;

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
  if (match.status === 'bye') return res.status(400).json({ error: 'No se puede cambiar el resultado de un bye' });

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(match.tournament_id);

  let actualWinnerId = winner_id;
  if (player1_score !== undefined && player2_score !== undefined) {
    actualWinnerId = player1_score > player2_score ? match.player1_id : match.player2_id;
  }

  db.prepare(`
    UPDATE matches
    SET winner_id = ?, player1_score = ?, player2_score = ?, status = 'completed'
    WHERE id = ?
  `).run(actualWinnerId, player1_score || 0, player2_score || 0, req.params.id);

  const allMatches = db.prepare('SELECT * FROM matches WHERE tournament_id = ?').all(match.tournament_id);
  advanceWinner(allMatches, req.params.id, actualWinnerId);

  const updateNext = db.prepare(`
    UPDATE matches
    SET player1_id = ?, player2_id = ?, status = CASE WHEN player1_id IS NOT NULL AND player2_id IS NOT NULL THEN 'in_progress' ELSE status END
    WHERE id = ?
  `);

  const nextMatch = allMatches.find(m => m.id === match.next_match_id);
  if (nextMatch) {
    updateNext.run(nextMatch.player1_id, nextMatch.player2_id, nextMatch.id);
  }

  if (match.bracket_type === 'winners' && tournament.elimination_type === 'double') {
    const wbRounds = Math.log2(tournament.bracket_size);
    const lbRounds = 2 * (wbRounds - 1);

    if (match.round < wbRounds) {
      const loserId = actualWinnerId === match.player1_id ? match.player2_id : match.player1_id;
      if (loserId) {
        let lbRound, lbPosition;

        if (match.round === 1) {
          lbRound = 1;
          lbPosition = Math.ceil(match.position / 2);
        } else {
          lbRound = 2 * (match.round - 1);
          lbPosition = match.position;
        }

        const lbMatch = allMatches.find(m => m.bracket_type === 'losers' && m.round === lbRound && m.position === lbPosition);
        if (lbMatch) {
          if (!lbMatch.player1_id) {
            db.prepare('UPDATE matches SET player1_id = ?, status = CASE WHEN player2_id IS NOT NULL THEN ? ELSE status END WHERE id = ?')
              .run(loserId, 'in_progress', lbMatch.id);
          } else {
            db.prepare('UPDATE matches SET player2_id = ?, status = ? WHERE id = ?')
              .run(loserId, 'in_progress', lbMatch.id);
          }
        }
      }
    }
  }

  if (match.bracket_type === 'grand_final' && tournament.elimination_type === 'double') {
    const wbFinal = allMatches.find(m => m.bracket_type === 'winners' && m.round === Math.log2(tournament.bracket_size));
    const isWBChampion = wbFinal && wbFinal.winner_id === actualWinnerId;

    if (!isWBChampion && !match.is_reset) {
      const resetMatch = {
        id: require('uuid').v4(),
        tournament_id: match.tournament_id,
        bracket_type: 'grand_final',
        round: 2,
        position: 1,
        player1_id: wbFinal ? wbFinal.winner_id : match.player1_id,
        player2_id: actualWinnerId,
        player1_score: 0,
        player2_score: 0,
        winner_id: null,
        status: 'in_progress',
        next_match_id: null,
        next_slot: null,
        is_reset: 1
      };

      db.prepare(`
        INSERT INTO matches (id, tournament_id, bracket_type, round, position, player1_id, player2_id, player1_score, player2_score, winner_id, status, next_match_id, next_slot, is_reset)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(resetMatch.id, resetMatch.tournament_id, resetMatch.bracket_type, resetMatch.round, resetMatch.position, resetMatch.player1_id, resetMatch.player2_id, resetMatch.player1_score, resetMatch.player2_score, resetMatch.winner_id, resetMatch.status, resetMatch.next_match_id, resetMatch.next_slot, resetMatch.is_reset);
    }

    if ((match.is_reset || isWBChampion) && match.status === 'pending') {
      db.prepare("UPDATE tournaments SET status = 'completed' WHERE id = ?").run(match.tournament_id);
      db.prepare('DELETE FROM chat_messages WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = ?)').run(match.tournament_id);
    }
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`tournament:${match.tournament_id}`).emit('match:updated', {
      tournamentId: match.tournament_id,
      matchId: req.params.id
    });
  }

  res.json({ success: true });
});

router.put('/:id/undo', (req, res) => {
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

  const previousWinner = match.winner_id;

  db.prepare(`
    UPDATE matches
    SET winner_id = NULL, player1_score = 0, player2_score = 0, status = 'in_progress'
    WHERE id = ?
  `).run(req.params.id);

  if (match.next_match_id) {
    const nextMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(match.next_match_id);
    if (nextMatch) {
      if (nextMatch.player1_id === previousWinner) {
        db.prepare('UPDATE matches SET player1_id = NULL, status = ? WHERE id = ?').run('pending', nextMatch.id);
      } else if (nextMatch.player2_id === previousWinner) {
        db.prepare('UPDATE matches SET player2_id = NULL, status = ? WHERE id = ?').run('pending', nextMatch.id);
      }
    }
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`tournament:${match.tournament_id}`).emit('match:updated', {
      tournamentId: match.tournament_id,
      matchId: req.params.id
    });
  }

  res.json({ success: true });
});

router.put('/:id/score', (req, res) => {
  const db = getDb();
  const { player } = req.body;

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
  if (match.status === 'bye') return res.status(400).json({ error: 'No se puede modificar un bye' });
  if (!match.player1_id || !match.player2_id) return res.status(400).json({ error: 'El partido aún no tiene ambos jugadores' });

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(match.tournament_id);
  const formats = db.prepare('SELECT * FROM tournament_formats WHERE tournament_id = ?').all(match.tournament_id);

  let phaseKey = '';
  if (match.bracket_type === 'winners') {
    const wbRounds = Math.log2(tournament.bracket_size);
    if (match.round === wbRounds) phaseKey = 'winners_f';
    else if (match.round === wbRounds - 1) phaseKey = 'winners_sf';
    else if (match.round === wbRounds - 2) phaseKey = 'winners_qf';
    else phaseKey = 'winners_r1';
  } else if (match.bracket_type === 'losers') {
    phaseKey = 'losers_r1';
  } else if (match.bracket_type === 'grand_final') {
    phaseKey = 'grand_final';
  }

  const formatEntry = formats.find(f => f.phase === phaseKey);
  const format = formatEntry ? formatEntry.format : tournament.tournament_type || 'Bo3';

  let winsNeeded;
  if (format === 'Bo1') winsNeeded = 1;
  else if (format === 'Bo3') winsNeeded = 2;
  else if (format === 'Bo5') winsNeeded = 3;
  else winsNeeded = 2;

  let newP1 = match.player1_score;
  let newP2 = match.player2_score;

  if (player === 1) newP1++;
  else if (player === 2) newP2++;
  else return res.status(400).json({ error: 'Jugador inválido. Usa 1 o 2.' });

  if (newP1 > winsNeeded || newP2 > winsNeeded) {
    return res.status(400).json({ error: `Score máximo para ${format} es ${winsNeeded}-${winsNeeded}` });
  }

  let winnerId = null;
  let isFinished = false;

  if (newP1 === winsNeeded) {
    winnerId = match.player1_id;
    isFinished = true;
  } else if (newP2 === winsNeeded) {
    winnerId = match.player2_id;
    isFinished = true;
  }

  if (isFinished) {
    db.prepare(`
      UPDATE matches SET winner_id = ?, player1_score = ?, player2_score = ?, status = 'completed' WHERE id = ?
    `).run(winnerId, newP1, newP2, match.id);

    const allMatches = db.prepare('SELECT * FROM matches WHERE tournament_id = ?').all(match.tournament_id);
    advanceWinner(allMatches, match.id, winnerId);

    const nextMatch = allMatches.find(m => m.id === match.next_match_id);
    if (nextMatch) {
      db.prepare(`
        UPDATE matches SET player1_id = ?, player2_id = ?, status = CASE WHEN player1_id IS NOT NULL AND player2_id IS NOT NULL THEN 'in_progress' ELSE status END WHERE id = ?
      `).run(nextMatch.player1_id, nextMatch.player2_id, nextMatch.id);
    }

    if (match.bracket_type === 'winners' && tournament.elimination_type === 'double') {
      const wbRounds = Math.log2(tournament.bracket_size);
      if (match.round < wbRounds) {
        const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
        if (loserId) {
          let lbRound, lbPosition;
          if (match.round === 1) {
            lbRound = 1;
            lbPosition = Math.ceil(match.position / 2);
          } else {
            lbRound = 2 * (match.round - 1);
            lbPosition = match.position;
          }
          const lbMatch = allMatches.find(m => m.bracket_type === 'losers' && m.round === lbRound && m.position === lbPosition);
          if (lbMatch) {
            if (!lbMatch.player1_id) {
              db.prepare('UPDATE matches SET player1_id = ?, status = CASE WHEN player2_id IS NOT NULL THEN ? ELSE status END WHERE id = ?')
                .run(loserId, 'in_progress', lbMatch.id);
            } else {
              db.prepare('UPDATE matches SET player2_id = ?, status = ? WHERE id = ?')
                .run(loserId, 'in_progress', lbMatch.id);
            }
          }
        }
      }
    }

    if (match.bracket_type === 'grand_final' && tournament.elimination_type === 'double') {
      const wbFinal = allMatches.find(m => m.bracket_type === 'winners' && m.round === Math.log2(tournament.bracket_size));
      const isWBChampion = wbFinal && wbFinal.winner_id === winnerId;

      if (!isWBChampion && !match.is_reset) {
        db.prepare(`
          INSERT INTO matches (id, tournament_id, bracket_type, round, position, player1_id, player2_id, player1_score, player2_score, winner_id, status, next_match_id, next_slot, is_reset)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          require('uuid').v4(), match.tournament_id, 'grand_final', 2, 1,
          wbFinal ? wbFinal.winner_id : match.player1_id, winnerId,
          0, 0, null, 'in_progress', null, null, 1
        );
      }

      if ((match.is_reset || isWBChampion) && match.status !== 'completed') {
        db.prepare("UPDATE tournaments SET status = 'completed' WHERE id = ?").run(match.tournament_id);
        db.prepare('DELETE FROM chat_messages WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = ?)').run(match.tournament_id);
      }
    }
  } else {
    db.prepare(`
      UPDATE matches SET player1_score = ?, player2_score = ? WHERE id = ?
    `).run(newP1, newP2, match.id);
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`tournament:${match.tournament_id}`).emit('match:updated', {
      tournamentId: match.tournament_id,
      matchId: match.id
    });
  }

  res.json({
    success: true,
    player1_score: newP1,
    player2_score: newP2,
    finished: isFinished,
    winner_id: winnerId
  });
});

router.put('/:id/team-paste', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL requerida' });

  const validDomains = ['pokepast.es', 'pokepaste.com'];
  try {
    const parsed = new URL(url);
    if (!validDomains.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d))) {
      return res.status(400).json({ error: 'URL debe ser de pokepast.es o pokepaste.com' });
    }
  } catch {
    return res.status(400).json({ error: 'URL inválida' });
  }

  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Partida no encontrada' });

  db.prepare('UPDATE matches SET team_paste_url = ? WHERE id = ?').run(url, req.params.id);

  const io = req.app.get('io');
  if (io) {
    io.to(`tournament:${match.tournament_id}`).emit('match:updated', { tournamentId: match.tournament_id, matchId: match.id });
  }

  res.json({ success: true, team_paste_url: url });
});

router.get('/:id/stage-pick', (req, res) => {
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Partida no encontrada' });

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(match.tournament_id);
  const { getStageState, getAvailableStages, getCurrentPhase, STAGES } = require('../logic/stage-pick');

  const { mode, picks } = getStageState(db, req.params.id);
  if (!mode) {
    return res.json({ stages: STAGES, picks, mode: null, available: STAGES.map(s => s.id), currentPhase: null });
  }

  const available = getAvailableStages(picks, mode.mode);
  const currentPhase = getCurrentPhase(picks, match, mode.mode);

  res.json({
    stages: STAGES,
    picks,
    mode: mode.mode,
    agreed_by_p1: mode.agreed_by_p1,
    agreed_by_p2: mode.agreed_by_p2,
    available: available.map(s => s.id),
    currentPhase
  });
});

router.post('/:id/stage-pick', authRequired, (req, res) => {
  const { stageId, action } = req.body;
  if (!stageId) return res.status(400).json({ error: 'stageId requerido' });

  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Partida no encontrada' });

  if (match.player1_id !== req.user.id && match.player2_id !== req.user.id) {
    return res.status(403).json({ error: 'No eres participante de esta partida' });
  }

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(match.tournament_id);
  const { initMatchStageMode, performStageAction, getStageState, getAvailableStages, getCurrentPhase, STAGES } = require('../logic/stage-pick');

  initMatchStageMode(db, req.params.id, 'dsr');

  const result = performStageAction(db, req.params.id, req.user.id, stageId, action || 'pick');
  if (result.error) return res.status(400).json(result);

  const { mode, picks } = getStageState(db, req.params.id);
  const available = getAvailableStages(picks, mode.mode);
  const currentPhase = getCurrentPhase(picks, match, mode.mode);

  res.json({ success: true, picks: result, available: available.map(s => s.id), currentPhase, stages: STAGES });
});

router.post('/:id/stage-pick/gentleman', authRequired, (req, res) => {
  const { agreed } = req.body;

  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Partida no encontrada' });

  if (match.player1_id !== req.user.id && match.player2_id !== req.user.id) {
    return res.status(403).json({ error: 'No eres participante de esta partida' });
  }

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(match.tournament_id);
  if (!tournament.allow_gentleman) return res.status(400).json({ error: 'Gentleman no habilitado en este torneo' });

  const { initMatchStageMode, setGentleman, STAGES } = require('../logic/stage-pick');
  initMatchStageMode(db, req.params.id, 'gentleman');

  const result = setGentleman(db, req.params.id, req.user.id, agreed);
  if (result.error) return res.status(400).json(result);

  const io = req.app.get('io');
  if (io) {
    io.to(`match:${req.params.id}`).emit('stage:updated', { matchId: req.params.id });
  }

  res.json({ success: true, mode: result, stages: STAGES });
});

module.exports = router;
