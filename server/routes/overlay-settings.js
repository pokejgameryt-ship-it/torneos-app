const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

const DEFAULTS = {
  style: 'esports-gold',
  pc: '#d4af37',
  pc2: '#f5d77a',
  font: 'Impact',
  shape: 'rect',
  score_shape: 'square',
  show_phase: 1,
  show_format: 1,
  show_tournament: 1,
  show_flags: 0,
  show_logo: 0,
  show_sponsor: 0,
  show_score: 1,
  custom_colors: 0,
  overlay_shape: 'rect',
  visual_effect: 'none',
  visual_effect_side: 'interior',
  logo: '',
  sponsor: ''
};

const COLUMNS = [
  'style', 'pc', 'pc2', 'font', 'shape', 'score_shape',
  'show_phase', 'show_format', 'show_tournament', 'show_flags',
  'show_logo', 'show_sponsor', 'show_score', 'custom_colors',
  'overlay_shape', 'visual_effect', 'visual_effect_side', 'logo', 'sponsor'
];

const BOOL_KEYS = new Set(['custom_colors', 'show_phase', 'show_format', 'show_tournament', 'show_flags', 'show_logo', 'show_sponsor', 'show_score']);

function ensureRow(db, tournamentId) {
  let row = db.prepare('SELECT * FROM overlay_settings WHERE tournament_id = ?').get(tournamentId);
  if (!row) {
    db.prepare(`
      INSERT INTO overlay_settings (tournament_id, ${COLUMNS.join(', ')})
      VALUES (?, ${COLUMNS.map(() => '?').join(', ')})
    `).run(tournamentId, ...COLUMNS.map(k => DEFAULTS[k]));
    row = db.prepare('SELECT * FROM overlay_settings WHERE tournament_id = ?').get(tournamentId);
  }
  return row;
}

function patchRow(db, tournamentId, incoming, existing) {
  const vals = {};
  for (const k of COLUMNS) {
    if (BOOL_KEYS.has(k)) {
      vals[k] = incoming[k] !== undefined ? (incoming[k] ? 1 : 0) : existing[k];
    } else {
      vals[k] = incoming[k] !== undefined ? incoming[k] : existing[k];
    }
  }
  db.prepare(`
    UPDATE overlay_settings SET
      style = ?, pc = ?, pc2 = ?, font = ?, shape = ?, score_shape = ?,
      show_phase = ?, show_format = ?, show_tournament = ?, show_flags = ?,
      show_logo = ?, show_sponsor = ?, show_score = ?, custom_colors = ?,
      overlay_shape = ?, visual_effect = ?, visual_effect_side = ?, logo = ?, sponsor = ?
    WHERE tournament_id = ?
  `).run(
    vals.style, vals.pc, vals.pc2, vals.font, vals.shape, vals.score_shape,
    vals.show_phase, vals.show_format, vals.show_tournament, vals.show_flags,
    vals.show_logo, vals.show_sponsor, vals.show_score, vals.custom_colors,
    vals.overlay_shape, vals.visual_effect, vals.visual_effect_side, vals.logo, vals.sponsor, tournamentId
  );
}

router.get('/:tournamentId', (req, res) => {
  const db = getDb();
  const row = ensureRow(db, req.params.tournamentId);
  res.json(row);
});

router.put('/:tournamentId', (req, res) => {
  const db = getDb();
  const existing = ensureRow(db, req.params.tournamentId);
  patchRow(db, req.params.tournamentId, req.body, existing);

  const io = req.app.get('io');
  if (io) {
    io.to(`tournament:${req.params.tournamentId}`).emit('overlay:updated', {
      tournamentId: req.params.tournamentId
    });
  }

  res.json({ success: true });
});

router.post('/:tournamentId/reset', (req, res) => {
  const db = getDb();
  ensureRow(db, req.params.tournamentId);

  const vals = {};
  for (const k of COLUMNS) {
    vals[k] = DEFAULTS[k];
  }
  db.prepare(`
    UPDATE overlay_settings SET
      style = ?, pc = ?, pc2 = ?, font = ?, shape = ?, score_shape = ?,
      show_phase = ?, show_format = ?, show_tournament = ?, show_flags = ?,
      show_logo = ?, show_sponsor = ?, show_score = ?, custom_colors = ?,
      overlay_shape = ?, visual_effect = ?, visual_effect_side = ?, logo = ?, sponsor = ?
    WHERE tournament_id = ?
  `).run(
    vals.style, vals.pc, vals.pc2, vals.font, vals.shape, vals.score_shape,
    vals.show_phase, vals.show_format, vals.show_tournament, vals.show_flags,
    vals.show_logo, vals.show_sponsor, vals.show_score, vals.custom_colors,
    vals.overlay_shape, vals.visual_effect, vals.visual_effect_side, vals.logo, vals.sponsor, req.params.tournamentId
  );

  const io = req.app.get('io');
  if (io) {
    io.to(`tournament:${req.params.tournamentId}`).emit('overlay:updated', {
      tournamentId: req.params.tournamentId
    });
  }

  const row = db.prepare('SELECT * FROM overlay_settings WHERE tournament_id = ?').get(req.params.tournamentId);
  res.json(row);
});

module.exports = router;
