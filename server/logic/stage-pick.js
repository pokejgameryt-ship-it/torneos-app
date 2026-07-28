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

function getStageState(db, matchId) {
  const mode = db.prepare('SELECT * FROM match_stage_mode WHERE match_id = ?').get(matchId);
  const picks = db.prepare('SELECT * FROM stage_picks WHERE match_id = ? ORDER BY created_at ASC').all(matchId);
  return { mode, picks };
}

function getAvailableStages(picks, mode) {
  let banned = picks.filter(p => p.action === 'ban').map(p => p.stage);
  if (mode === 'dsr') {
    const wonStages = picks.filter(p => p.action === 'pick').map(p => p.stage);
    banned = [...new Set([...banned, ...wonStages])];
  }
  return STAGES.filter(s => !banned.includes(s.id));
}

function getLoserId(match) {
  if (!match.winner_id) return null;
  return match.winner_id === match.player1_id ? match.player2_id : match.player1_id;
}

function getCurrentPhase(picks, match, mode) {
  if (mode === 'gentleman') return { phase: 'gentleman', currentTurn: null };

  const phaseCount = { initial_ban: 0, initial_pick: 0, counterpick_ban: 0, counterpick_pick: 0 };
  picks.forEach(p => phaseCount[p.phase] = (phaseCount[p.phase] || 0) + 1);

  const totalInitial = phaseCount.initial_ban + phaseCount.initial_pick;
  if (totalInitial < 3) {
    if (totalInitial === 0) return { phase: 'initial_ban', currentTurn: match.player1_id, banNumber: 1 };
    if (totalInitial === 1) return { phase: 'initial_ban', currentTurn: match.player2_id, banNumber: 2 };
    return { phase: 'initial_pick', currentTurn: match.player2_id };
  }

  const loserId = getLoserId(match);
  if (phaseCount.counterpick_ban <= phaseCount.counterpick_pick) {
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

function setGentleman(db, matchId, userId, agreed) {
  const mode = db.prepare('SELECT * FROM match_stage_mode WHERE match_id = ?').get(matchId);
  if (!mode) return { error: 'Modo de stage no encontrado' };
  if (mode.mode !== 'gentleman' && !agreed) return { error: 'Gentleman no está habilitado para esta partida' };

  if (userId === mode.agreed_by_p1 || userId === mode.agreed_by_p2) return { mode };

  if (agreed) {
    if (!mode.agreed_by_p1) {
      db.prepare('UPDATE match_stage_mode SET agreed_by_p1 = 1 WHERE match_id = ?').run(matchId);
    } else {
      db.prepare('UPDATE match_stage_mode SET agreed_by_p2 = 1 WHERE match_id = ?').run(matchId);
    }
  } else {
    if (!mode.agreed_by_p1) {
      db.prepare('UPDATE match_stage_mode SET agreed_by_p2 = 0 WHERE match_id = ?').run(matchId);
    } else {
      db.prepare('UPDATE match_stage_mode SET agreed_by_p1 = 0 WHERE match_id = ?').run(matchId);
    }
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
  const actualAction = mode.mode === 'gentleman' ? 'pick' : action;

  const id = require('uuid').v4();
  db.prepare('INSERT INTO stage_picks (id, match_id, user_id, stage, action, phase) VALUES (?, ?, ?, ?, ?, ?)').run(id, matchId, userId, stageId, actualAction, phase);

  return db.prepare('SELECT * FROM stage_picks WHERE match_id = ? ORDER BY created_at ASC').all(matchId);
}

module.exports = { STAGES, getStageState, getAvailableStages, getCurrentPhase, initMatchStageMode, setGentleman, performStageAction };
