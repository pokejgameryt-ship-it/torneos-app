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

function getAvailableStages(picks, mode) {
  const banned = picks.filter(p => p.action === 'ban').map(p => p.stage);
  return STAGES.filter(s => !banned.includes(s.id));
}

function getLoserId(match) {
  if (!match.winner_id) return null;
  return match.winner_id === match.player1_id ? match.player2_id : match.player1_id;
}

function getCurrentPhase(picks, match, mode) {
  if (mode === 'gentleman') return { phase: 'gentleman', currentTurn: null };

  const banCount = picks.filter(p => p.action === 'ban').length;
  const pickCount = picks.filter(p => p.action === 'pick').length;
  const totalActions = banCount + pickCount;

  if (totalActions < 3) {
    if (totalActions === 0) return { phase: 'initial_ban', currentTurn: match.player1_id, banNumber: 1 };
    if (totalActions === 1) return { phase: 'initial_ban', currentTurn: match.player2_id, banNumber: 2 };
    return { phase: 'initial_pick', currentTurn: match.player2_id };
  }

  const loserId = getLoserId(match);
  if (banCount <= pickCount) {
    return { phase: 'counterpick_ban', currentTurn: match.winner_id };
  }
  return { phase: 'counterpick_pick', currentTurn: loserId || match.player1_id };
}

function initMatchStageMode(db, matchId, mode) {
  const existing = db.prepare('SELECT * FROM match_stage_mode WHERE match_id = ?').get(matchId);
  if (!existing) {
    db.prepare('INSERT INTO match_stage_mode (match_id, mode) VALUES (?, ?)').run(matchId, mode);
  }
}

function resetStagePicks(db, matchId) {
  db.prepare('DELETE FROM stage_picks WHERE match_id = ?').run(matchId);
  db.prepare('DELETE FROM match_stage_mode WHERE match_id = ?').run(matchId);
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

function performStageAction(db, matchId, userId, stageId, action) {
  const mode = db.prepare('SELECT * FROM match_stage_mode WHERE match_id = ?').get(matchId);
  if (!mode) return { error: 'Modo de stage no encontrado' };

  const bothAgreed = mode.agreed_by_p1 && mode.agreed_by_p2;
  if (mode.mode === 'gentleman' && !bothAgreed) {
    return { error: 'Ambos jugadores deben aceptar Gentleman' };
  }

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  const picks = db.prepare('SELECT * FROM stage_picks WHERE match_id = ? ORDER BY created_at ASC').all(matchId);
  const available = getAvailableStages(picks, mode.mode);

  if (!available.find(s => s.id === stageId)) {
    return { error: 'Escenario no disponible' };
  }

  const phaseInfo = getCurrentPhase(picks, match, mode.mode);
  const phase = mode.mode === 'gentleman' ? 'gentleman' : phaseInfo.phase;

  const myParticipant = db.prepare(`
    SELECT id FROM participants WHERE id IN (?, ?) AND user_id = ?
  `).get(match.player1_id, match.player2_id, userId);
  if (!myParticipant) return { error: 'No eres participante de esta partida' };

  if (phaseInfo.currentTurn && phaseInfo.currentTurn !== myParticipant.id && mode.mode !== 'gentleman') {
    return { error: 'No es tu turno para elegir escenario' };
  }

  const actualAction = mode.mode === 'gentleman' ? 'pick' : action;

  const id = require('uuid').v4();
  db.prepare('INSERT INTO stage_picks (id, match_id, user_id, stage, action, phase) VALUES (?, ?, ?, ?, ?, ?)').run(id, matchId, userId, stageId, actualAction, phase);

  return db.prepare('SELECT * FROM stage_picks WHERE match_id = ? ORDER BY created_at ASC').all(matchId);
}

module.exports = { STAGES, STARTER_STAGES, getStageState, getAvailableStages, getCurrentPhase, initMatchStageMode, resetStagePicks, setGentleman, performStageAction };
