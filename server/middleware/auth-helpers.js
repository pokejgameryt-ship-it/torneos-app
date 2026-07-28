const { getDb } = require('../db');

function isMatchParticipant(matchId, userId) {
  const db = getDb();
  const match = db.prepare('SELECT player1_id, player2_id FROM matches WHERE id = ?').get(matchId);
  if (!match) return false;
  const p1User = match.player1_id ? db.prepare('SELECT user_id FROM participants WHERE id = ?').get(match.player1_id) : null;
  const p2User = match.player2_id ? db.prepare('SELECT user_id FROM participants WHERE id = ?').get(match.player2_id) : null;
  return (p1User && p1User.user_id === userId) || (p2User && p2User.user_id === userId);
}

function getMatchPlayerNum(matchId, userId) {
  const db = getDb();
  const match = db.prepare('SELECT player1_id, player2_id FROM matches WHERE id = ?').get(matchId);
  if (!match) return 0;
  const p1User = match.player1_id ? db.prepare('SELECT user_id FROM participants WHERE id = ?').get(match.player1_id) : null;
  if (p1User && p1User.user_id === userId) return 1;
  const p2User = match.player2_id ? db.prepare('SELECT user_id FROM participants WHERE id = ?').get(match.player2_id) : null;
  if (p2User && p2User.user_id === userId) return 2;
  return 0;
}

function isTournamentCreator(tournamentId, userId) {
  const db = getDb();
  const tournament = db.prepare('SELECT creator_id FROM tournaments WHERE id = ?').get(tournamentId);
  return tournament && tournament.creator_id === userId;
}

module.exports = { isMatchParticipant, getMatchPlayerNum, isTournamentCreator };
