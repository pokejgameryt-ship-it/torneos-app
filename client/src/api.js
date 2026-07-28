export const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export const API_ORIGIN = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');

export const SOCKET_URL = API_ORIGIN;

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchTournaments() {
  const res = await fetch(`${API_BASE}/tournaments`);
  return res.json();
}

export async function fetchTournament(id) {
  const res = await fetch(`${API_BASE}/tournaments/${id}`);
  return res.json();
}

export async function createTournament(data, token) {
  const res = await fetch(`${API_BASE}/tournaments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function updateTournament(id, data) {
  const res = await fetch(`${API_BASE}/tournaments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteTournament(id) {
  const res = await fetch(`${API_BASE}/tournaments/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function addParticipant(tournamentId, name, flag) {
  const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, flag })
  });
  return res.json();
}

export async function addParticipantsBulk(tournamentId, names) {
  const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/participants/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names })
  });
  return res.json();
}

export async function removeParticipant(tournamentId, participantId) {
  const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/participants/${participantId}`, { method: 'DELETE' });
  return res.json();
}

export async function updateParticipant(tournamentId, participantId, data) {
  const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/participants/${participantId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function generateBracket(tournamentId) {
  const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/generate-bracket`, { method: 'POST' });
  return res.json();
}

export async function randomizeParticipants(tournamentId) {
  const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/randomize`, { method: 'POST' });
  return res.json();
}

export async function fetchBracket(tournamentId) {
  const res = await fetch(`${API_BASE}/bracket/${tournamentId}`);
  return res.json();
}

export async function setMatchResult(matchId, winnerId, player1Score, player2Score) {
  const res = await fetch(`${API_BASE}/matches/${matchId}/result`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ winner_id: winnerId, player1_score: player1Score, player2_score: player2Score })
  });
  return res.json();
}

export async function undoMatchResult(matchId) {
  const res = await fetch(`${API_BASE}/matches/${matchId}/undo`, { method: 'PUT' });
  return res.json();
}

export async function incrementScore(matchId, player) {
  const res = await fetch(`${API_BASE}/matches/${matchId}/score`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player })
  });
  return res.json();
}

export async function getOverlaySettings(tournamentId) {
  const res = await fetch(`${API_BASE}/overlay-settings/${tournamentId}`);
  return res.json();
}

export async function saveOverlaySettings(tournamentId, settings) {
  const res = await fetch(`${API_BASE}/overlay-settings/${tournamentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  return res.json();
}

export async function resetOverlaySettings(tournamentId) {
  const res = await fetch(`${API_BASE}/overlay-settings/${tournamentId}/reset`, { method: 'POST' });
  return res.json();
}

export async function getRegisterInfo(tournamentId) {
  const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/register-info`);
  return res.json();
}

export async function registerParticipant(tournamentId, name, flag) {
  const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, flag })
  });
  return res.json();
}

export async function nextMatch(tournamentId) {
  const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/next-match`, { method: 'POST' });
  return res.json();
}

export async function getChatMessages(matchId, token) {
  const res = await fetch(`${API_BASE}/matches/${matchId}/chat`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

export async function sendChatMessage(matchId, content, token) {
  const res = await fetch(`${API_BASE}/matches/${matchId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content })
  });
  return res.json();
}

export async function searchTournaments(q, game, status) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (game) params.set('game', game);
  if (status) params.set('status', status);
  const res = await fetch(`${API_BASE}/search/tournaments?${params}`);
  return res.json();
}

export async function searchUsers(q) {
  const res = await fetch(`${API_BASE}/search/users?q=${encodeURIComponent(q)}`);
  return res.json();
}

export async function getMyTournaments(token) {
  const res = await fetch(`${API_BASE}/tournaments/my/registrations`, { headers: authHeaders(token) });
  return res.json();
}

export async function getProfile(userId) {
  const res = await fetch(`${API_BASE}/profile/${userId}`);
  return res.json();
}

export async function getMyProfile(token) {
  const res = await fetch(`${API_BASE}/profile/me/full`, { headers: authHeaders(token) });
  return res.json();
}

export async function updateProfile(data, token) {
  const res = await fetch(`${API_BASE}/profile/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function changePassword(data, token) {
  const res = await fetch(`${API_BASE}/profile/me/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function changeNickname(nickname, token) {
  const res = await fetch(`${API_BASE}/profile/me/nickname`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ nickname })
  });
  return res.json();
}

export async function getDMConversations(token) {
  const res = await fetch(`${API_BASE}/dms/conversations`, { headers: authHeaders(token) });
  return res.json();
}

export async function getDMMessages(userId, token) {
  const res = await fetch(`${API_BASE}/dms/${userId}`, { headers: authHeaders(token) });
  return res.json();
}

export async function sendDM(userId, content, token) {
  const res = await fetch(`${API_BASE}/dms/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ content })
  });
  return res.json();
}

export async function registerForTournament(tournamentId, data, token) {
  const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function selectCharacter(matchId, character, player, token) {
  const res = await fetch(`${API_BASE}/matches/${matchId}/character`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ character, player })
  });
  return res.json();
}
