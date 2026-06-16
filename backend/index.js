const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./models/database');

const authRoutes = require('./routes/auth');
const calculationRoutes = require('./routes/calculations');
const recommendationRoutes = require('./routes/recommendations');
const leaderboardRoutes = require('./routes/leaderboard');
const educationalRoutes = require('./routes/educational');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://carbon-zero-brown.vercel.app',  // Vercel production frontend
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests for all routes
app.options('*', cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/calculations', calculationRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/educational', educationalRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to TerraSense API!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server!' });
});

// Export app for testing
module.exports = app;

if (require.main === module) {
  // Start Server
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
