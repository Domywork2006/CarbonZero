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
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
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
