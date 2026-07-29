const STAGES = [
  { id: 'battlefield', name: 'Battlefield' },
  { id: 'final-destination', name: 'Final Destination' },
  { id: 'small-battlefield', name: 'Small Battlefield' },
  { id: 'smashville', name: 'Smashville' },
  { id: 'town-and-city', name: 'Town & City' },
  { id: 'pokemon-stadium-2', name: 'Pokémon Stadium 2' },
  { id: 'kalos-pokemon-league', name: 'Kalos Pokémon League' },
  { id: 'hollow-bastion', name: 'Hollow Bastion' },
  { id: 'yoshi-s-story', name: "Yoshi's Story" },
];

const STARTER_STAGES = ['battlefield', 'final-destination', 'small-battlefield', 'smashville', 'town-and-city', 'pokemon-stadium-2'];

function getStageState(db, matchId) {
  const mode = db.prepare('SELECT * FROM match_stage_mode WHERE match_id = ?').get(matchId);
  const picks = db.prepare('SELECT * FROM stage_picks WHERE match_id = ? ORDER BY created_at ASC').all(matchId);
  return { mode, picks };
}

function getAvailableStages(picks) {
  const banned = picks.filter(p => p.action === 'ban').map(p => p.stage);
  return STAGES.filter(s => !banned.includes(s.id));
}

function getLoserId(match) {
  if (!match.winner_id) return null;
  return match.winner_id === match.player1_id ? match.player2_id : match.player1_id;
}

function getCurrentPhase(picks, match, modeRow) {
  if (!modeRow) return { phase: 'ban', currentTurn: match.player1_id, bansNeeded: 3, bannedSoFar: 0, gameNumber: 1 };

  const mode = modeRow.mode;
  const gameNumber = modeRow.game_number || 1;
  const rpsWinnerId = modeRow.rps_winner_id;

  if (mode === 'gentleman') return { phase: 'gentleman', currentTurn: null };

  const gamePicks = picks.filter(p => (p.game_number || 1) === gameNumber);
  const gameBans = gamePicks.filter(p => p.action === 'ban');
  const gamePicksOnly = gamePicks.filter(p => p.action === 'pick');

  const isGame1 = gameNumber === 1;

  if (isGame1) {
    const bansByWinner = gameBans.filter(p => p.user_id === rpsWinnerId).length;
    const bansByLoser = gameBans.filter(p => p.user_id !== rpsWinnerId).length;
    const totalBans = bansByWinner + bansByLoser;

    if (bansByWinner < 3) {
      return {
        phase: 'ban',
        currentTurn: rpsWinnerId,
        bansNeeded: 3,
        bannedSoFar: bansByWinner,
        gameNumber,
        banGroup: 'winner'
      };
    }
    if (bansByLoser < 4) {
      const loserId = rpsWinnerId === match.player1_id ? match.player2_id : match.player1_id;
      return {
        phase: 'ban',
        currentTurn: loserId,
        bansNeeded: 4,
        bannedSoFar: bansByLoser,
        gameNumber,
        banGroup: 'loser'
      };
    }
    if (gamePicksOnly.length === 0) {
      return {
        phase: 'pick',
        currentTurn: rpsWinnerId,
        gameNumber,
        pickNumber: 1
      };
    }
  } else {
    const lastPick = gamePicksOnly[0];
    const previousWinner = modeRow.last_winner_id || match.winner_id;
    const previousLoser = previousWinner === match.player1_id ? match.player2_id : match.player1_id;

    const bansSinceLastPick = gameBans.filter(p => p.created_at > (lastPick?.created_at || '')).length;

    if (bansSinceLastPick < 3) {
      return {
        phase: 'ban',
        currentTurn: previousWinner,
        bansNeeded: 3,
        bannedSoFar: bansSinceLastPick,
        gameNumber,
        banGroup: 'winner'
      };
    }
    if (gamePicksOnly.length === 0) {
      return {
        phase: 'pick',
        currentTurn: previousLoser,
        gameNumber,
        pickNumber: 1
      };
    }
  }

  return { phase: 'done', gameNumber };
}

function initMatchStageMode(db, matchId, mode, rpsWinnerId) {
  const existing = db.prepare('SELECT * FROM match_stage_mode WHERE match_id = ?').get(matchId);
  if (!existing) {
    db.prepare('INSERT INTO match_stage_mode (match_id, mode, game_number, rps_winner_id) VALUES (?, ?, 1, ?)').run(matchId, mode, rpsWinnerId || null);
  } else if (rpsWinnerId && !existing.rps_winner_id) {
    db.prepare('UPDATE match_stage_mode SET rps_winner_id = ? WHERE match_id = ?').run(rpsWinnerId, matchId);
  }
}

function resetStagePicks(db, matchId) {
  const lastPick = db.prepare('SELECT user_id FROM stage_picks WHERE match_id = ? AND action = ? ORDER BY created_at DESC LIMIT 1').get(matchId, 'pick');
  const lastWinnerId = lastPick ? lastPick.user_id : null;
  db.prepare('DELETE FROM stage_picks WHERE match_id = ?').run(matchId);
  db.prepare('UPDATE match_stage_mode SET game_number = game_number + 1, last_winner_id = ? WHERE match_id = ?').run(lastWinnerId, matchId);
}

function setGentleman(db, matchId, userId, agreed) {
  const mode = db.prepare('SELECT * FROM match_stage_mode WHERE match_id = ?').get(matchId);
  if (!mode) return { error: 'Modo de stage no encontrado' };
  if (mode.mode !== 'gentleman' && !agreed) return { error: 'Gentleman no está habilitado para esta partida' };

  const match = db.prepare('SELECT player1_id, player2_id FROM matches WHERE id = ?').get(matchId);
  const myParticipant = db.prepare('SELECT id FROM participants WHERE id IN (?, ?) AND user_id = ?').get(match.player1_id, match.player2_id, userId);
  if (!myParticipant) return { error: 'No eres participante de esta partida' };

  const myPlayerNum = myParticipant.id === match.player1_id ? 1 : 2;
  const myAgreedField = myPlayerNum === 1 ? 'agreed_by_p1' : 'agreed_by_p2';

  if (mode[myAgreedField] === userId) return { mode };

  if (agreed) {
    db.prepare(`UPDATE match_stage_mode SET ${myAgreedField} = ? WHERE match_id = ?`).run(userId, matchId);
  } else {
    db.prepare(`UPDATE match_stage_mode SET ${myAgreedField} = 0 WHERE match_id = ?`).run(matchId);
  }

  return db.prepare('SELECT * FROM match_stage_mode WHERE match_id = ?').get(matchId);
}

function performStageAction(db, matchId, userId, stageIds, action) {
  const modeRow = db.prepare('SELECT * FROM match_stage_mode WHERE match_id = ?').get(matchId);
  if (!modeRow) return { error: 'Modo de stage no encontrado' };

  const bothAgreed = modeRow.agreed_by_p1 && modeRow.agreed_by_p2;
  if (modeRow.mode === 'gentleman' && !bothAgreed) {
    return { error: 'Ambos jugadores deben aceptar Gentleman' };
  }

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  const allPicks = db.prepare('SELECT * FROM stage_picks WHERE match_id = ? ORDER BY created_at ASC').all(matchId);
  const available = getAvailableStages(allPicks);

  const phaseInfo = getCurrentPhase(allPicks, match, modeRow);

  const myParticipant = db.prepare(`
    SELECT id FROM participants WHERE id IN (?, ?) AND user_id = ?
  `).get(match.player1_id, match.player2_id, userId);
  if (!myParticipant) return { error: 'No eres participante de esta partida' };

  if (modeRow.mode !== 'gentleman' && phaseInfo.currentTurn && phaseInfo.currentTurn !== myParticipant.id) {
    return { error: 'No es tu turno para elegir escenario' };
  }

  const ids = Array.isArray(stageIds) ? stageIds : [stageIds];

  if (action === 'ban') {
    const remaining = phaseInfo.bansNeeded - phaseInfo.bannedSoFar;
    if (ids.length !== remaining) {
      return { error: `Debes bane exactamente ${remaining} escenario(s)` };
    }
    for (const sid of ids) {
      if (!available.find(s => s.id === sid)) {
        return { error: `Escenario ${sid} no disponible` };
      }
    }
  } else {
    if (ids.length !== 1) return { error: 'Solo puedes elegir 1 escenario' };
    if (!available.find(s => s.id === ids[0])) {
      return { error: 'Escenario no disponible' };
    }
  }

  if (modeRow.mode === 'gentleman') action = 'pick';

  const insertPicks = db.transaction(() => {
    for (const sid of ids) {
      const id = require('uuid').v4();
      db.prepare('INSERT INTO stage_picks (id, match_id, user_id, stage, action, phase, game_number) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        id, matchId, userId, sid, action, phaseInfo.phase, phaseInfo.gameNumber
      );
    }
  });
  insertPicks();

  return { success: true };
}

module.exports = { STAGES, STARTER_STAGES, getStageState, getAvailableStages, getCurrentPhase, initMatchStageMode, resetStagePicks, setGentleman, performStageAction };
