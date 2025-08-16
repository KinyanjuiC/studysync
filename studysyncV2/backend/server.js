require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const redis = require('redis');
const multer = require('multer');
const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: 'http://localhost' } });
app.use(cors({ origin: 'http://localhost' }));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  skip: (req) => process.env.NODE_ENV === 'development',
});
app.use(limiter);

// Redis
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(err => console.error('Redis connection error:', err));

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: '-c search_path=public'
});
pool.on('error', (err) => console.error('Database connection error:', err));

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection test failed:', err.message);
    return;
  }
  console.log('Database connected successfully');
  release();
});

// Multer for file upload
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Validation schemas
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  age: Joi.number().integer().min(16).max(100).allow(null),
  academic_level: Joi.string().valid('Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate').allow(null),
  field_of_study: Joi.string().max(100).allow(null),
  learning_style: Joi.string().max(100).allow(null),
  schedule: Joi.object().allow(null)
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.error('No token provided');
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Token verification failed:', err.message);
      return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }
    req.user = user;
    next();
  });
};

// User Profile
app.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT email, age, academic_level, field_of_study, learning_style, schedule FROM public.users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('User fetch error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// Register
app.post('/register', async (req, res) => {
  const { error } = userSchema.validate(req.body);
  if (error) {
    console.error('Validation error:', error.details[0].message);
    return res.status(400).json({ error: error.details[0].message });
  }

  const { email, password, age, academic_level, field_of_study, learning_style, schedule } = req.body;
  const sanitizedEmail = sanitizeHtml(email);
  
  try {
    const existingUser = await pool.query('SELECT * FROM public.users WHERE email = $1', [sanitizedEmail]);
    if (existingUser.rows.length > 0) {
      console.error('Email already exists:', sanitizedEmail);
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const scheduleJson = schedule ? JSON.stringify(schedule) : null;
    
    const result = await pool.query(
      'INSERT INTO public.users (email, password, age, academic_level, field_of_study, learning_style, schedule) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [sanitizedEmail, hashedPassword, age || null, academic_level || null, field_of_study || null, learning_style || null, scheduleJson]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const sanitizedEmail = sanitizeHtml(email);
  try {
    const user = await pool.query('SELECT * FROM public.users WHERE email = $1', [sanitizedEmail]);
    if (!user.rows[0] || !await bcrypt.compare(password, user.rows[0].password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Matches
app.get('/match', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await pool.query('SELECT * FROM public.users WHERE id = $1', [userId]);
    if (!user.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const allUsers = await pool.query('SELECT * FROM public.users WHERE id != $1', [userId]);
    const matches = allUsers.rows.map(u => ({
      email: u.email,
      field_of_study: u.field_of_study,
      compatibility: Math.random() * 0.5 + 0.5,
      roomId: `room-${userId}-${u.id}`
    })).filter(m => m.compatibility > 0.5);

    res.json({ matches });
  } catch (err) {
    console.error('Match error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// Progress
app.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await pool.query(
      'SELECT room_id, hours_spent, messages_sent, notes_shared, files_uploaded, poll_votes, last_updated FROM public.study_sessions WHERE user_id = $1',
      [userId]
    );
    const achievements = await pool.query('SELECT * FROM public.achievements WHERE user_id = $1', [userId]);

    const progress = sessions.rows.map(s => ({
      room_id: s.room_id,
      hours_spent: parseFloat(s.hours_spent.toFixed(2)),
      messages_sent: s.messages_sent,
      notes_shared: s.notes_shared,
      files_uploaded: s.files_uploaded,
      poll_votes: s.poll_votes,
      last_updated: s.last_updated,
      badge: achievements.rows.find(a => a.id === s.id)?.badge || null
    }));

    res.json({ progress });
  } catch (err) {
    console.error('Progress error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// Session Data
app.post('/session/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { user_id, hours_spent, messages_sent, notes_shared, files_uploaded, poll_votes } = req.body;
    await pool.query(
      `INSERT INTO public.study_sessions (user_id, room_id, hours_spent, messages_sent, notes_shared, files_uploaded, poll_votes, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, room_id) DO UPDATE
       SET hours_spent = EXCLUDED.hours_spent,
           messages_sent = EXCLUDED.messages_sent,
           notes_shared = EXCLUDED.notes_shared,
           files_uploaded = EXCLUDED.files_uploaded,
           poll_votes = EXCLUDED.poll_votes,
           last_updated = CURRENT_TIMESTAMP`,
      [user_id, roomId, hours_spent, messages_sent, notes_shared, files_uploaded, poll_votes]
    );
    res.json({ message: 'Session data saved' });
  } catch (err) {
    console.error('Session save error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// File Upload
app.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { originalname, filename } = req.file;
    await pool.query(
      'INSERT INTO public.files (user_id, filename, original_name) VALUES ($1, $2, $3) RETURNING id',
      [userId, filename, originalname]
    );
    res.json({ message: 'File uploaded successfully' });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// File List
app.get('/files', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query('SELECT id, filename, original_name FROM public.files WHERE user_id = $1', [userId]);
    res.json({ files: result.rows });
  } catch (err) {
    console.error('File list error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// File Download
app.get('/download/:filename', authenticateToken, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Admin Stats
app.get('/admin/stats', authenticateToken, async (req, res) => {
  try {
    const stats = {
      totalUsers: (await pool.query('SELECT COUNT(*) FROM public.users')).rows[0].count,
      totalSessions: (await pool.query('SELECT COUNT(*) FROM public.study_sessions')).rows[0].count,
      isolationRate: 0.73,
      aiInterest: 0.89,
      wtp: 15.40
    };
    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// Study Room Content
app.get('/room/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const result = await pool.query('SELECT chat, notes, whiteboard FROM public.study_rooms WHERE room_id = $1', [roomId]);
    if (result.rows.length === 0) {
      return res.json({ chat: [], notes: '', whiteboard: [] });
    }
    const { chat, notes, whiteboard } = result.rows[0];
    res.json({
      chat: Array.isArray(chat) ? chat : [],
      notes: typeof notes === 'string' ? notes : '',
      whiteboard: Array.isArray(whiteboard) ? whiteboard : []
    });
  } catch (err) {
    console.error('Room content error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

app.post('/room/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { chat, notes, whiteboard } = req.body;
    await pool.query(
      'INSERT INTO public.study_rooms (room_id, chat, notes, whiteboard) VALUES ($1, $2, $3, $4) ON CONFLICT (room_id) DO UPDATE SET chat = $2, notes = $3, whiteboard = $4',
      [
        roomId,
        Array.isArray(chat) ? chat : [],
        typeof notes === 'string' ? notes : '',
        Array.isArray(whiteboard) ? whiteboard : []
      ]
    );
    res.json({ message: 'Room content saved' });
  } catch (err) {
    console.error('Save room content error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// Socket.io for study rooms
io.on('connection', (socket) => {
  socket.on('join-room', async (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', socket.id);
    socket.to(roomId).emit('chat-message', `User ${socket.id.slice(0, 8)} joined the room`);
    await redisClient.sAdd(`room:${roomId}:participants`, socket.id);
  });

  socket.on('chat-message', (roomId, message) => {
    const sanitizedMessage = sanitizeHtml(message);
    io.to(roomId).emit('chat-message', sanitizedMessage);
  });

  socket.on('typing', (roomId, userId) => {
    socket.to(roomId).emit('typing', userId);
  });

  socket.on('share-screen', (roomId, message) => {
    socket.to(roomId).emit('share-screen', message);
  });

  socket.on('draw', (roomId, data) => {
    io.to(roomId).emit('draw', data);
  });

  socket.on('shared-notes', (roomId, notes) => {
    io.to(roomId).emit('shared-notes', notes);
  });

  socket.on('file-uploaded', (roomId, filename, userId) => {
    io.to(roomId).emit('file-uploaded', filename, userId);
  });

  socket.on('poll-created', (roomId) => {
    io.to(roomId).emit('poll-created');
  });

  socket.on('poll-vote', (roomId, voteType) => {
    io.to(roomId).emit('poll-vote', voteType);
  });

  socket.on('disconnect', async () => {
    const rooms = Array.from(socket.rooms);
    for (const roomId of rooms) {
      if (roomId !== socket.id) {
        socket.to(roomId).emit('user-disconnected', socket.id);
        await redisClient.sRem(`room:${roomId}:participants`, socket.id);
      }
    }
  });
});

server.listen(3001, () => console.log('Backend running on port 3001'));