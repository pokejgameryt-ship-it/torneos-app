const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY created_at DESC').all();
  res.json(tournaments);
});

router.get('/my/registrations', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.json([]);
  try {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const participations = db.prepare(`
      SELECT t.*, p.seed, p.flag as participant_flag, p.name as participant_name
      FROM participants p JOIN tournaments t ON p.tournament_id = t.id
      WHERE p.user_id = ? ORDER BY t.created_at DESC
    `).all(decoded.id);
    res.json(participations);
  } catch { res.json([]); }
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  const participants = db.prepare('SELECT * FROM participants WHERE tournament_id = ? ORDER BY seed').all(req.params.id);
  const formats = db.prepare('SELECT * FROM tournament_formats WHERE tournament_id = ?').all(req.params.id);

  res.json({ ...tournament, participants, formats });
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, game, tournament_type, elimination_type, bracket_size, is_public, password, formats, sequential_matches, game_type, open_team_sheets, format_mode, allow_gentleman, requirements, description, banner, start_date, start_time, timezone } = req.body;

  let creator_id = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('../middleware/auth');
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      creator_id = decoded.id;
    } catch {}
  }
  if (!creator_id) return res.status(401).json({ error: 'Debes iniciar sesión para crear un torneo' });

  const id = uuidv4();
  const bracketSize = bracket_size || 8;

  db.prepare(`
    INSERT INTO tournaments (id, name, game, tournament_type, elimination_type, bracket_size, is_public, password, sequential_matches, creator_id, game_type, open_team_sheets, format_mode, allow_gentleman, requirements, description, banner, start_date, start_time, timezone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, game || '', tournament_type || '1v1', elimination_type || 'single', bracketSize, is_public !== false ? 1 : 0, password || null, sequential_matches ? 1 : 0, creator_id || null, game_type || 'other', open_team_sheets ? 1 : 0, format_mode || 'singles', allow_gentleman !== false ? 1 : 0, JSON.stringify(requirements || []), description || '', banner || '', start_date || '', start_time || '', timezone || 'UTC');

  if (formats && Array.isArray(formats)) {
    const insertFormat = db.prepare('INSERT INTO tournament_formats (id, tournament_id, phase, format) VALUES (?, ?, ?, ?)');
    for (const f of formats) {
      insertFormat.run(uuidv4(), id, f.phase, f.format);
    }
  }

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
  res.status(201).json(tournament);
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, game, tournament_type, elimination_type, bracket_size, is_public, password, status, description, banner, start_date, start_time, timezone } = req.body;

  const existing = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Torneo no encontrado' });

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('../middleware/auth');
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      if (existing.creator_id && existing.creator_id !== decoded.id) {
        return res.status(403).json({ error: 'Solo el creador puede editar este torneo' });
      }
    } catch {}
  } else if (existing.creator_id) {
    return res.status(403).json({ error: 'Debes estar logueado para editar' });
  }

  db.prepare(`
    UPDATE tournaments
    SET name = ?, game = ?, tournament_type = ?, elimination_type = ?, bracket_size = ?, is_public = ?, password = ?, status = ?, description = ?, banner = ?, start_date = ?, start_time = ?, timezone = ?
    WHERE id = ?
  `).run(
    name || existing.name,
    game !== undefined ? game : existing.game,
    tournament_type || existing.tournament_type,
    elimination_type || existing.elimination_type,
    bracket_size || existing.bracket_size,
    is_public !== undefined ? (is_public ? 1 : 0) : existing.is_public,
    password !== undefined ? password : existing.password,
    status || existing.status,
    description !== undefined ? description : existing.description,
    banner !== undefined ? banner : existing.banner,
    start_date !== undefined ? start_date : existing.start_date,
    start_time !== undefined ? start_time : existing.start_time,
    timezone || existing.timezone,
    req.params.id
  );

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  res.json(tournament);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Torneo no encontrado' });

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('../middleware/auth');
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      if (existing.creator_id && existing.creator_id !== decoded.id) {
        return res.status(403).json({ error: 'Solo el creador puede eliminar este torneo' });
      }
    } catch {}
  } else if (existing.creator_id) {
    return res.status(403).json({ error: 'Debes estar logueado para eliminar' });
  }

  db.prepare('DELETE FROM tournaments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/participants', (req, res) => {
  const db = getDb();
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('../middleware/auth');
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      userId = decoded.id;
    } catch {}
  }
  if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión para inscribirte' });

  const alreadyRegistered = db.prepare('SELECT id FROM participants WHERE tournament_id = ? AND user_id = ?').get(req.params.id, userId);
  if (alreadyRegistered) {
    return res.status(400).json({ error: 'Ya estás inscrito en este torneo' });
  }

  const existing = db.prepare('SELECT COUNT(*) as count FROM participants WHERE tournament_id = ?').get(req.params.id);
  if (existing.count >= tournament.bracket_size) {
    return res.status(400).json({ error: 'El torneo está lleno (' + tournament.bracket_size + ' participantes máximos)' });
  }

  const participantId = uuidv4();
  const seed = existing.count + 1;
  const name = req.body.name || '';
  const flag = req.body.flag || '';

  db.prepare('INSERT INTO participants (id, tournament_id, name, seed, flag, user_id) VALUES (?, ?, ?, ?, ?, ?)').run(participantId, req.params.id, name, seed, flag, userId);

  const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId);
  res.status(201).json(participant);
});

router.post('/:id/participants/bulk', (req, res) => {
  const db = getDb();
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  const existing = db.prepare('SELECT COUNT(*) as count FROM participants WHERE tournament_id = ?').get(req.params.id);
  const requestedCount = Array.isArray(req.body.names) ? req.body.names.length : 0;
  if (existing.count + requestedCount > tournament.bracket_size) {
    return res.status(400).json({ error: `No caben ${requestedCount} participantes. Quedan ${tournament.bracket_size - existing.count} huecos de ${tournament.bracket_size}` });
  }

  const insertParticipant = db.prepare('INSERT INTO participants (id, tournament_id, name, seed, flag) VALUES (?, ?, ?, ?, ?)');
  const participants = [];

  const insertMany = db.transaction((items) => {
    let seed = existing.count + 1;
    for (const item of items) {
      const id = uuidv4();
      const name = typeof item === 'string' ? item : item.name;
      const flag = typeof item === 'object' ? (item.flag || '') : '';
      insertParticipant.run(id, req.params.id, name, seed, flag);
      participants.push({ id, tournament_id: req.params.id, name, seed, flag });
      seed++;
    }
  });

  insertMany(req.body.names);
  res.status(201).json(participants);
});

router.delete('/:id/participants/:pid', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM participants WHERE id = ? AND tournament_id = ?').run(req.params.pid, req.params.id);
  res.json({ success: true });
});

router.put('/:id/participants/:pid', (req, res) => {
  const db = getDb();
  const { name, flag } = req.body;
  const existing = db.prepare('SELECT * FROM participants WHERE id = ? AND tournament_id = ?').get(req.params.pid, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Participante no encontrado' });

  db.prepare('UPDATE participants SET name = ?, flag = ? WHERE id = ?').run(
    name || existing.name,
    flag !== undefined ? flag : existing.flag,
    req.params.pid
  );

  const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(req.params.pid);
  res.json(participant);
});

router.post('/:id/generate-bracket', (req, res) => {
  const db = getDb();
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  const participants = db.prepare('SELECT * FROM participants WHERE tournament_id = ? ORDER BY seed').all(req.params.id);
  if (participants.length < 2) return res.status(400).json({ error: 'Se necesitan al menos 2 participantes' });

  db.prepare('DELETE FROM matches WHERE tournament_id = ?').run(req.params.id);

  const { generateSingleElimination, generateDoubleElimination } = require('../logic/bracket');
  const bracket = tournament.elimination_type === 'double'
    ? generateDoubleElimination(participants)
    : generateSingleElimination(participants);

  const insertMatch = db.prepare(`
    INSERT INTO matches (id, tournament_id, bracket_type, round, position, player1_id, player2_id, player1_score, player2_score, winner_id, status, next_match_id, next_slot, is_reset, match_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.pragma('foreign_keys = OFF');

  const insertAll = db.transaction((matches) => {
    for (const m of matches) {
      insertMatch.run(
        m.id, req.params.id, m.bracket_type, m.round, m.position,
        m.player1_id, m.player2_id, m.player1_score, m.player2_score,
        m.winner_id, m.status, m.next_match_id, m.next_slot, m.is_reset, m.match_order
      );
    }
  });

  insertAll(bracket.matches);

  db.pragma('foreign_keys = ON');

  db.prepare("UPDATE tournaments SET status = 'active', current_match_order = 1 WHERE id = ?").run(req.params.id);

  if (tournament.sequential_matches) {
    db.prepare("UPDATE matches SET status = 'pending' WHERE tournament_id = ? AND status = 'in_progress' AND match_order > 1").run(req.params.id);
  }

  res.json({ success: true, metadata: bracket.metadata });
});

router.post('/:id/next-match', (req, res) => {
  const db = getDb();
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  const currentOrder = tournament.current_match_order || 0;

  if (currentOrder > 0) {
    const currentMatch = db.prepare(
      'SELECT * FROM matches WHERE tournament_id = ? AND match_order = ?'
    ).get(req.params.id, currentOrder);
    if (currentMatch && currentMatch.status !== 'completed' && currentMatch.status !== 'bye') {
      return res.status(400).json({ error: 'El combate actual aún no ha terminado' });
    }
  }

  let nextMatch = db.prepare(
    'SELECT * FROM matches WHERE tournament_id = ? AND match_order > ? AND status = ? ORDER BY match_order ASC LIMIT 1'
  ).get(req.params.id, currentOrder, 'in_progress');

  if (!nextMatch) {
    const anyPending = db.prepare(
      'SELECT * FROM matches WHERE tournament_id = ? AND match_order > ? AND status != ? AND status != ? ORDER BY match_order ASC LIMIT 1'
    ).get(req.params.id, currentOrder, 'completed', 'bye');

    if (!anyPending) {
      db.prepare("UPDATE tournaments SET status = 'completed' WHERE id = ?").run(req.params.id);
      db.prepare('DELETE FROM chat_messages WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = ?)').run(req.params.id);
      return res.json({ success: true, finished: true, message: 'Torneo finalizado' });
    }

    if (tournament.sequential_matches) {
      db.prepare("UPDATE matches SET status = 'in_progress' WHERE id = ?").run(anyPending.id);
    }

    db.prepare('UPDATE tournaments SET current_match_order = ? WHERE id = ?').run(anyPending.match_order, req.params.id);
    return res.json({ success: true, match_order: anyPending.match_order, match_id: anyPending.id });
  }

  if (tournament.sequential_matches && nextMatch.status !== 'in_progress') {
    db.prepare("UPDATE matches SET status = 'in_progress' WHERE id = ?").run(nextMatch.id);
  }

  db.prepare('UPDATE tournaments SET current_match_order = ? WHERE id = ?').run(nextMatch.match_order, req.params.id);

  const io = req.app.get('io');
  if (io) {
    io.to(`tournament:${req.params.id}`).emit('match:updated', {
      tournamentId: req.params.id,
      matchId: nextMatch.id
    });
  }

  res.json({ success: true, match_order: nextMatch.match_order, match_id: nextMatch.id });
});

router.post('/:id/randomize', (req, res) => {
  const db = getDb();
  const participants = db.prepare('SELECT * FROM participants WHERE tournament_id = ?').all(req.params.id);

  const shuffled = [...participants].sort(() => Math.random() - 0.5);

  const updateSeed = db.prepare('UPDATE participants SET seed = ? WHERE id = ?');
  const updateAll = db.transaction((items) => {
    items.forEach((p, i) => {
      updateSeed.run(i + 1, p.id);
    });
  });

  updateAll(shuffled);

  const updated = db.prepare('SELECT * FROM participants WHERE tournament_id = ? ORDER BY seed').all(req.params.id);
  res.json(updated);
});

router.post('/:id/register', (req, res) => {
  const db = getDb();
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });
  if (tournament.status !== 'pending') return res.status(400).json({ error: 'El torneo ya ha comenzado' });

  const { name, flag } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const count = db.prepare('SELECT COUNT(*) as count FROM participants WHERE tournament_id = ?').get(req.params.id);
  if (count.count >= tournament.bracket_size) return res.status(400).json({ error: 'El torneo está lleno' });

  const existing = db.prepare('SELECT * FROM participants WHERE tournament_id = ? AND LOWER(name) = LOWER(?)').get(req.params.id, name.trim());
  if (existing) return res.status(400).json({ error: 'Ya hay un participante con ese nombre' });

  if (tournament.requirements) {
    try {
      const reqs = JSON.parse(tournament.requirements);
      if (reqs.length > 0 && flag) {
        const FLAGS_CONTINENT = { '🇪🇸':'EU','🇲🇽':'NA','🇦🇷':'SA','🇧🇷':'SA','🇺🇸':'NA','🇯🇵':'AS','🇰🇷':'AS','🇫🇷':'EU','🇩🇪':'EU','🇬🇧':'EU','🇮🇹':'EU','🇵🇹':'EU','🇨🇳':'AS','🇷🇺':'EU','🇦🇺':'OC','🇨🇦':'NA','🇳🇱':'EU','🇸🇪':'EU','🇨🇭':'EU','🇵🇱':'EU','🇹🇷':'EU','🇮🇳':'AS','🇹🇭':'AS','🇻🇳':'AS','🇮🇩':'AS','🇵🇭':'AS','🇲🇾':'AS','🇸🇬':'AS','🇳igeria':'AF','🇬🇭':'AF','🇿🇦':'AF','🇪🇬':'AF','🇲🇦':'AF','🇨🇴':'SA','🇨🇱':'SA','🇵🇪':'SA','🇪🇨':'SA','🇻🇪':'SA','🇩🇴':'NA','🇵🇷':'NA','🇨🇺':'NA' };
        const userContinent = FLAGS_CONTINENT[flag] || '';
        for (const r of reqs) {
          if (r.type === 'country' && flag !== r.value) return res.status(400).json({ error: `Este torneo requiere bandera: ${r.value}` });
          if (r.type === 'continent' && userContinent !== r.value) return res.status(400).json({ error: `Este torneo requiere continente: ${r.value}` });
        }
      }
    } catch {}
  }

  const id = uuidv4();
  const seed = count.count + 1;
  db.prepare('INSERT INTO participants (id, tournament_id, name, seed, flag) VALUES (?, ?, ?, ?, ?)').run(id, req.params.id, name.trim(), seed, flag || '');
  const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(id);
  res.status(201).json({ success: true, participant, remaining: tournament.bracket_size - seed });
});

router.get('/:id/register-info', (req, res) => {
  const db = getDb();
  const tournament = db.prepare('SELECT id, name, game, tournament_type, elimination_type, bracket_size, status FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  const count = db.prepare('SELECT COUNT(*) as count FROM participants WHERE tournament_id = ?').get(req.params.id);
  const participants = db.prepare('SELECT id, name, seed, flag FROM participants WHERE tournament_id = ? ORDER BY seed').all(req.params.id);

  res.json({
    ...tournament,
    registered: count.count,
    remaining: tournament.bracket_size - count.count,
    participants
  });
});

module.exports = router;
