'use strict';

/**
 * @fileoverview Authentication routes for TerraSense.
 * Handles user registration, login, profile retrieval, and profile updates.
 *
 * Refactored: nested callbacks → async/await (bcrypt.promises + util.promisify),
 * duplicate JSON parsing → parseJSON(), added input validation.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const auth = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { dbGet, dbRun } = require('../utils/db');
const { parseJSON } = require('../utils/formatting');
const { validateRegistration, validateLogin } = require('../utils/validators');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_carbon_zero_token_key_123!';
const JWT_EXPIRES_IN = '30d';
const BCRYPT_SALT_ROUNDS = 10;

// Promisified jwt.sign for use with async/await
const jwtSign = promisify(jwt.sign);

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

/**
 * Build a safe public user object from a database user row.
 * Ensures interests is always an array, streak is always a number.
 *
 * @param {Object} userRow - Raw user row from the database.
 * @returns {Object} Public user object safe to include in API responses.
 */
function formatUserResponse(userRow) {
  return {
    id:                   userRow.id,
    name:                 userRow.name,
    email:                userRow.email,
    location:             userRow.location || '',
    reduction_target:     userRow.reduction_target,
    interests:            parseJSON(userRow.interests, []),
    points:               userRow.points || 0,
    streak:               userRow.streak || 0,
    last_calculated_date: userRow.last_calculated_date || null,
    created_at:           userRow.created_at
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * @route  POST /api/auth/register
 * @desc   Register a new user account and return a JWT token.
 * @access Public
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, location, reduction_target, interests } = req.body;

  // 1. Validate input
  const validationError = validateRegistration({ name, email, password });
  if (validationError) throw new AppError(validationError, 400);

  // 2. Check for duplicate email
  const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email.trim()]);
  if (existingUser) throw new AppError('An account with this email already exists', 400);

  // 3. Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // 4. Persist new user
  const interestsJson = JSON.stringify(Array.isArray(interests) ? interests : []);
  const reductionTarget = reduction_target !== undefined ? parseFloat(reduction_target) : 20.0;

  const { lastID: userId } = await dbRun(
    `INSERT INTO users
      (name, email, password, location, reduction_target, interests, points, streak)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
    [name.trim(), email.trim(), passwordHash, location || '', reductionTarget, interestsJson]
  );

  // 5. Issue JWT
  const token = await jwtSign({ id: userId, email: email.trim() }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });

  res.status(201).json({
    token,
    user: {
      id:                   userId,
      name:                 name.trim(),
      email:                email.trim(),
      location:             location || '',
      reduction_target:     reductionTarget,
      interests:            Array.isArray(interests) ? interests : [],
      points:               0,
      streak:               0,
      last_calculated_date: null
    }
  });
}));

/**
 * @route  POST /api/auth/login
 * @desc   Authenticate a user with email + password and return a JWT token.
 * @access Public
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 1. Validate input
  const validationError = validateLogin({ email, password });
  if (validationError) throw new AppError(validationError, 400);

  // 2. Look up user — use vague error to avoid email enumeration
  const user = await dbGet('SELECT * FROM users WHERE email = ?', [email.trim()]);
  if (!user) throw new AppError('Invalid credentials', 400);

  // 3. Verify password
  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) throw new AppError('Invalid credentials', 400);

  // 4. Issue JWT
  const token = await jwtSign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({ token, user: formatUserResponse(user) });
}));

/**
 * @route  GET /api/auth/me
 * @desc   Return the currently authenticated user's profile.
 * @access Private
 */
router.get('/me', auth, asyncHandler(async (req, res) => {
  const user = await dbGet(
    `SELECT id, name, email, location, reduction_target, interests,
            points, streak, last_calculated_date, created_at
     FROM users WHERE id = ?`,
    [req.user.id]
  );
  if (!user) throw new AppError('User not found', 404);

  res.json(formatUserResponse(user));
}));

/**
 * @route  PUT /api/auth/profile
 * @desc   Update the authenticated user's profile settings.
 * @access Private
 */
router.put('/profile', auth, asyncHandler(async (req, res) => {
  const { name, location, reduction_target, interests } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new AppError('Name is required', 400);
  }

  const interestsJson = JSON.stringify(Array.isArray(interests) ? interests : []);
  const reductionTarget = reduction_target !== undefined ? parseFloat(reduction_target) : 20.0;

  await dbRun(
    'UPDATE users SET name = ?, location = ?, reduction_target = ?, interests = ? WHERE id = ?',
    [name.trim(), location || '', reductionTarget, interestsJson, req.user.id]
  );

  // Fetch updated row to return accurate points/streak
  const updatedUser = await dbGet(
    'SELECT points, streak, last_calculated_date FROM users WHERE id = ?',
    [req.user.id]
  );

  res.json({
    id:                   req.user.id,
    name:                 name.trim(),
    email:                req.user.email,
    location:             location || '',
    reduction_target:     reductionTarget,
    interests:            Array.isArray(interests) ? interests : [],
    points:               updatedUser?.points  ?? 0,
    streak:               updatedUser?.streak  ?? 0,
    last_calculated_date: updatedUser?.last_calculated_date ?? null
  });
}));

module.exports = router;
