const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { getDb, closeDb } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.set('io', io);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tournaments', require('./routes/tournaments'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/bracket', require('./routes/bracket'));
app.use('/api/overlay-settings', require('./routes/overlay-settings'));
app.use('/api', require('./routes/chat'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/search', require('./routes/search'));
app.use('/api/dms', require('./routes/dms'));

app.use('/overlays', express.static(path.join(__dirname, '..', 'overlays')));

app.get('/overlays/scoreboard/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'overlays', 'scoreboard', 'index.html'));
});

app.get('/overlays/bracket/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'overlays', 'bracket', 'index.html'));
});

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/overlays')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join:tournament', (tournamentId) => {
    socket.join(`tournament:${tournamentId}`);
  });

  socket.on('leave:tournament', (tournamentId) => {
    socket.leave(`tournament:${tournamentId}`);
  });

  socket.on('join:match', (matchId) => {
    socket.join(`match:${matchId}`);
  });

  socket.on('leave:match', (matchId) => {
    socket.leave(`match:${matchId}`);
  });

  socket.on('join:dm', (userId) => {
    socket.join(`dm:${userId}`);
  });

  socket.on('leave:dm', (userId) => {
    socket.leave(`dm:${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});
