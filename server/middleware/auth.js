const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'torneos-app-dev-secret';

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function authOptional(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.sign(jwt.verify(header.split(' ')[1], JWT_SECRET), JWT_SECRET);
      req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    } catch {}
  }
  next();
}

module.exports = { authRequired, authOptional, JWT_SECRET };
