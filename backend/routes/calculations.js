'use strict';

/**
 * @fileoverview Carbon footprint calculation routes for TerraSense.
 * Handles submitting new calculations, fetching history, and generating summaries.
 *
 * Refactored: callback hell → async/await, magic numbers → constants,
 * duplicated rounding → roundEmissions(), N+1 badge query → COUNT(*).
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { dbGet, dbRun, dbAll } = require('../utils/db');
const { calculateCarbonFootprint } = require('../utils/calculator');
const { roundEmissions, round } = require('../utils/formatting');
const { validateCalculationInput } = require('../utils/validators');
const {
  POINTS_REWARDS,
  EMISSION_SCORE_DIVISOR,
  PREDICTED_REDUCTION_RATE,
  STREAK_MAX_GAP_DAYS,
  NATIONAL_AVERAGES,
  BADGE_KEYS,
  GREEN_GUARDIAN_THRESHOLD,
  SUSTAINABILITY_CHAMPION_THRESHOLD
} = require('../utils/constants');

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

/**
 * Award a badge to a user if they do not already hold it.
 * Automatically grants POINTS_REWARDS.BADGE points on first award.
 *
 * @param {number} userId   - The user's database ID.
 * @param {string} badgeKey - One of the BADGE_KEYS enum values.
 * @returns {Promise<boolean>} true if the badge was newly awarded, false if already held.
 */
async function awardBadgeAsync(userId, badgeKey) {
  const existing = await dbGet(
    'SELECT id FROM badges WHERE user_id = ? AND badge_key = ?',
    [userId, badgeKey]
  );
  if (existing) return false; // Already awarded

  await dbRun(
    'INSERT INTO badges (user_id, badge_key) VALUES (?, ?)',
    [userId, badgeKey]
  );
  // Fire-and-forget points update — non-critical
  dbRun('UPDATE users SET points = points + ? WHERE id = ?', [POINTS_REWARDS.BADGE, userId]);
  return true;
}

/**
 * Update a user's monthly streak based on the current calculation date.
 *
 * @param {number} userId          - The user's database ID.
 * @param {string} calculationDate - ISO date string (YYYY-MM-DD).
 * @returns {Promise<number>} The new streak value.
 */
async function updateStreakAsync(userId, calculationDate) {
  const userRow = await dbGet(
    'SELECT streak, last_calculated_date FROM users WHERE id = ?',
    [userId]
  );

  const currentStreak = userRow?.streak ?? 0;
  const lastDateStr = userRow?.last_calculated_date ?? null;
  let nextStreak = 1;

  if (lastDateStr) {
    const lastDate = new Date(lastDateStr);
    const currentDate = new Date(calculationDate);
    const diffDays = Math.ceil(Math.abs(currentDate - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      nextStreak = currentStreak || 1; // Same day — keep current
    } else if (diffDays <= STREAK_MAX_GAP_DAYS) {
      nextStreak = currentStreak + 1;  // Within the window — increment
    }
    // else diffDays > STREAK_MAX_GAP_DAYS — streak broken, reset to 1
  }

  await dbRun(
    'UPDATE users SET points = points + ?, streak = ?, last_calculated_date = ? WHERE id = ?',
    [POINTS_REWARDS.CALCULATION, nextStreak, calculationDate, userId]
  );

  return nextStreak;
}

/**
 * Determine which reduction badges a user has earned based on their calculation history.
 *
 * @param {Array<{co2_total: number}>} calculations - All user calculations ordered by date ASC.
 * @param {number} currentCO2 - The co2_total from the newest calculation.
 * @returns {Promise<string[]>} Array of newly awarded badge keys.
 */
async function determineBadgesAsync(userId, calculations, currentCO2) {
  const newlyAwardedBadges = [];

  // first_step — awarded for any calculation submitted
  const awardedFirstStep = await awardBadgeAsync(userId, BADGE_KEYS.FIRST_STEP);
  if (awardedFirstStep) newlyAwardedBadges.push(BADGE_KEYS.FIRST_STEP);

  if (calculations.length > 1) {
    const baselineCO2 = calculations[0].co2_total;
    const reductionPercent = baselineCO2 > 0
      ? ((baselineCO2 - currentCO2) / baselineCO2) * 100
      : 0;

    if (reductionPercent >= GREEN_GUARDIAN_THRESHOLD) {
      const awardedGG = await awardBadgeAsync(userId, BADGE_KEYS.GREEN_GUARDIAN);
      if (awardedGG) newlyAwardedBadges.push(BADGE_KEYS.GREEN_GUARDIAN);
    }

    if (reductionPercent >= SUSTAINABILITY_CHAMPION_THRESHOLD) {
      const awardedSC = await awardBadgeAsync(userId, BADGE_KEYS.SUSTAINABILITY_CHAMPION);
      if (awardedSC) newlyAwardedBadges.push(BADGE_KEYS.SUSTAINABILITY_CHAMPION);
    }
  }

  return newlyAwardedBadges;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * @route  POST /api/calculations
 * @desc   Submit a new monthly carbon footprint calculation.
 * @access Private
 */
router.post('/', auth, asyncHandler(async (req, res) => {
  const {
    car_miles = 0, bus_miles = 0, train_miles = 0, flight_miles = 0, bike_miles = 0,
    electricity_kwh = 0, gas_kwh = 0, heating_kwh = 0,
    veg_meals = 0, meat_meals = 0, vegan_meals = 0,
    waste_kg = 0, water_liters = 0,
    clothing_items = 0, electronics_items = 0, shipping_packages = 0,
    date
  } = req.body;

  // 1. Validate inputs
  const validationError = validateCalculationInput(req.body);
  if (validationError) throw new AppError(validationError, 400);

  // 2. Calculate CO2 equivalent values
  const emissions = calculateCarbonFootprint({
    car_miles, bus_miles, train_miles, flight_miles, bike_miles,
    electricity_kwh, gas_kwh, heating_kwh,
    veg_meals, meat_meals, vegan_meals,
    waste_kg, water_liters,
    clothing_items, electronics_items, shipping_packages
  });

  const {
    co2_transport, co2_energy, co2_diet,
    co2_waste, co2_water, co2_purchases, co2_total
  } = emissions;

  const calculationDate = date || new Date().toISOString().split('T')[0];

  // 3. Persist calculation
  const { lastID: calculationId } = await dbRun(
    `INSERT INTO calculations (
      user_id, date, car_miles, bus_miles, train_miles, flight_miles, bike_miles,
      electricity_kwh, gas_kwh, heating_kwh, veg_meals, meat_meals, vegan_meals,
      waste_kg, water_liters, clothing_items, electronics_items, shipping_packages,
      co2_transport, co2_energy, co2_diet, co2_waste, co2_water, co2_purchases, co2_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id, calculationDate,
      car_miles, bus_miles, train_miles, flight_miles, bike_miles,
      electricity_kwh, gas_kwh, heating_kwh,
      veg_meals, meat_meals, vegan_meals,
      waste_kg, water_liters, clothing_items, electronics_items, shipping_packages,
      co2_transport, co2_energy, co2_diet, co2_waste, co2_water, co2_purchases, co2_total
    ]
  );

  // 4. Update streak (fire-and-forget — does not block response)
  updateStreakAsync(req.user.id, calculationDate).catch(() => {});

  // 5. Badge checks — use COUNT(*) to avoid loading all rows just for existence check
  const { count: calculationCount } = await dbGet(
    'SELECT COUNT(*) as count FROM calculations WHERE user_id = ?',
    [req.user.id]
  );

  let newlyAwardedBadges = [];
  if (calculationCount > 0) {
    const allCalculations = await dbAll(
      'SELECT co2_total FROM calculations WHERE user_id = ? ORDER BY date ASC',
      [req.user.id]
    );
    newlyAwardedBadges = await determineBadgesAsync(req.user.id, allCalculations, co2_total);
  }

  res.status(201).json({
    id: calculationId,
    date: calculationDate,
    ...roundEmissions(emissions),
    newlyAwardedBadges
  });
}));

/**
 * @route  GET /api/calculations/history
 * @desc   Get all calculations for the authenticated user, newest first.
 * @access Private
 */
router.get('/history', auth, asyncHandler(async (req, res) => {
  const rows = await dbAll(
    'SELECT * FROM calculations WHERE user_id = ? ORDER BY date DESC',
    [req.user.id]
  );
  res.json(rows.map(roundEmissions));
}));

/**
 * @route  GET /api/calculations/summary
 * @desc   Get emissions summary, trend data, prediction, and national comparisons.
 * @access Private
 */
router.get('/summary', auth, asyncHandler(async (req, res) => {
  const rows = await dbAll(
    'SELECT * FROM calculations WHERE user_id = ? ORDER BY date ASC',
    [req.user.id]
  );

  if (rows.length === 0) {
    return res.json({ hasData: false, message: 'No calculation data available yet.' });
  }

  const latest = rows[rows.length - 1];
  const baseline = rows[0];

  const reductionPercent = baseline.co2_total > 0
    ? ((baseline.co2_total - latest.co2_total) / baseline.co2_total) * 100
    : 0;

  // 0-100 sustainability score
  const score = Math.max(
    0,
    Math.min(100, Math.round(100 - (latest.co2_total / EMISSION_SCORE_DIVISOR)))
  );

  // Category breakdown for the latest calculation
  const categories = {
    transport: round(latest.co2_transport, 1),
    energy:    round(latest.co2_energy,    1),
    diet:      round(latest.co2_diet,      1),
    waste:     round(latest.co2_waste  ?? 0, 1),
    water:     round(latest.co2_water  ?? 0, 2),
    purchases: round(latest.co2_purchases, 1)
  };

  // Last 6 entries for the trend chart
  const trend = rows.slice(-6).map(r => ({
    date:      r.date,
    total:     round(r.co2_total,       1),
    transport: round(r.co2_transport,   1),
    energy:    round(r.co2_energy,      1),
    diet:      round(r.co2_diet,        1),
    waste:     round(r.co2_waste  ?? 0, 1),
    water:     round(r.co2_water  ?? 0, 2),
    purchases: round(r.co2_purchases,   1)
  }));

  // Linear prediction for next month
  let predictedNextMonth = round(latest.co2_total * PREDICTED_REDUCTION_RATE, 1);
  if (rows.length >= 2) {
    const secondLatest = rows[rows.length - 2];
    const trend_diff = latest.co2_total - secondLatest.co2_total;
    predictedNextMonth = Math.max(0, round(latest.co2_total + trend_diff, 1));
  }

  res.json({
    hasData: true,
    latest: {
      date:  latest.date,
      total: round(latest.co2_total, 1),
      categories
    },
    baseline: {
      date:  baseline.date,
      total: round(baseline.co2_total, 1)
    },
    reductionPercent: round(reductionPercent, 1),
    score,
    trend,
    prediction: {
      predictedNextMonth,
      status: predictedNextMonth < latest.co2_total ? 'decreasing' : 'increasing'
    },
    nationalAverages: NATIONAL_AVERAGES
  });
}));

module.exports = router;
