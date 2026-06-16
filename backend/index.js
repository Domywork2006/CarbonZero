'use strict';

/**
 * @fileoverview TerraSense Express API entry point.
 * Sets up middleware, routes, CORS, and centralised error handling.
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialise the database connection (indexes and seed data run on startup)
require('./models/database');

const authRoutes          = require('./routes/auth');
const calculationRoutes   = require('./routes/calculations');
const recommendationRoutes = require('./routes/recommendations');
const leaderboardRoutes   = require('./routes/leaderboard');
const educationalRoutes   = require('./routes/educational');
const { errorMiddleware } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------------------------
// CORS Configuration
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://carbon-zero-brown.vercel.app',
  ...(process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, server-to-server, mobile apps)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Explicit preflight handler for all routes
app.options('*', cors());

// ---------------------------------------------------------------------------
// Body Parsing
// ---------------------------------------------------------------------------
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/auth',            authRoutes);
app.use('/api/calculations',    calculationRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/leaderboard',     leaderboardRoutes);
app.use('/api/educational',     educationalRoutes);

app.get('/', (_req, res) => {
  res.json({ message: 'Welcome to TerraSense API!', version: '2.0.0' });
});

// ---------------------------------------------------------------------------
// Centralised Error Handling (MUST be last)
// ---------------------------------------------------------------------------
app.use(errorMiddleware);

// ---------------------------------------------------------------------------
// Server Start
// ---------------------------------------------------------------------------
module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`TerraSense API running on port ${PORT}`);
    }
  });
}
