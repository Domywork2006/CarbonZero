const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/database');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_carbon_zero_token_key_123!';

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', (req, res) => {
  const { name, email, password, location, reduction_target, interests } = req.body;

  // Simple validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Please enter all required fields' });
  }

  // Check if user exists
  db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (row) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    bcrypt.genSalt(10, (err, salt) => {
      if (err) return res.status(500).json({ error: 'Hashing error' });
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Hashing error' });

        const interestsStr = interests ? JSON.stringify(interests) : JSON.stringify([]);
        const target = reduction_target !== undefined ? parseFloat(reduction_target) : 20.0;

        db.run(
          `INSERT INTO users (name, email, password, location, reduction_target, interests, points, streak) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [name, email, hash, location || '', target, interestsStr, 0, 0],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Error saving user' });
            }

            const userId = this.lastID;

            // Create JWT token
            jwt.sign(
              { id: userId, email },
              JWT_SECRET,
              { expiresIn: '30d' },
              (err, token) => {
                if (err) return res.status(500).json({ error: 'Token generation error' });
                res.status(201).json({
                  token,
                  user: {
                    id: userId,
                    name,
                    email,
                    location: location || '',
                    reduction_target: target,
                    interests: interests || [],
                    points: 0,
                    streak: 0,
                    last_calculated_date: null
                  }
                });
              }
            );
          }
        );
      });
    });
  });
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter all required fields' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Compare passwords
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).json({ error: 'Crypt comparison error' });
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Create JWT token
      jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' },
        (err, token) => {
          if (err) return res.status(500).json({ error: 'Token generation error' });
          
          let parsedInterests = [];
          try {
            parsedInterests = JSON.parse(user.interests || '[]');
          } catch(e) {
            parsedInterests = [];
          }

          res.json({
            token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              location: user.location,
              reduction_target: user.reduction_target,
              interests: parsedInterests,
              points: user.points,
              streak: user.streak || 0,
              last_calculated_date: user.last_calculated_date || null
            }
          });
        }
      );
    });
  });
});

// @route   GET api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, (req, res) => {
  db.get('SELECT id, name, email, location, reduction_target, interests, points, streak, last_calculated_date, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let parsedInterests = [];
    try {
      parsedInterests = JSON.parse(user.interests || '[]');
    } catch(e) {
      parsedInterests = [];
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      location: user.location,
      reduction_target: user.reduction_target,
      interests: parsedInterests,
      points: user.points,
      streak: user.streak || 0,
      last_calculated_date: user.last_calculated_date || null,
      created_at: user.created_at
    });
  });
});

// @route   PUT api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, (req, res) => {
  const { name, location, reduction_target, interests } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const interestsStr = interests ? JSON.stringify(interests) : JSON.stringify([]);
  const target = reduction_target !== undefined ? parseFloat(reduction_target) : 20.0;

  db.run(
    `UPDATE users SET name = ?, location = ?, reduction_target = ?, interests = ? WHERE id = ?`,
    [name, location || '', target, interestsStr, req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database update failed' });
      }
      
      db.get('SELECT points, streak, last_calculated_date FROM users WHERE id = ?', [req.user.id], (err, row) => {
        res.json({
          id: req.user.id,
          name,
          email: req.user.email,
          location: location || '',
          reduction_target: target,
          interests: interests || [],
          points: row ? row.points : 0,
          streak: row ? row.streak : 0,
          last_calculated_date: row ? row.last_calculated_date : null
        });
      });
    }
  );
});

module.exports = router;
