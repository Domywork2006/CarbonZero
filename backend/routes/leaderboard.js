'use strict';

/**
 * @fileoverview Leaderboard and badge routes for TerraSense.
 * Ranks users by carbon reduction percentage and points.
 * Manages dynamic badge awarding and weekly challenge claims.
 *
 * Refactored: 3-level nested callbacks → async/await, magic numbers → constants.
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { dbGet, dbRun, dbAll } = require('../utils/db');
const { round } = require('../utils/formatting');
const {
  POINTS_REWARDS,
  BADGE_KEYS,
  HABIT_CHANGER_THRESHOLD,
  VALID_CHALLENGE_KEYS,
  CHALLENGE_REDUCTION_THRESHOLD
} = require('../utils/constants');

// ---------------------------------------------------------------------------
// Badges Catalog
// ---------------------------------------------------------------------------

/**
 * Complete definition of all badges available in TerraSense.
 * @type {Object.<string, {key: string, name: string, description: string, icon: string, color: string}>}
 */
const BADGES_CATALOG = {
  [BADGE_KEYS.FIRST_STEP]: {
    key: BADGE_KEYS.FIRST_STEP,
    name: 'First Step',
    description: 'Submitted your first carbon footprint calculation!',
    icon: 'Compass',
    color: '#3B82F6'
  },
  [BADGE_KEYS.GREEN_GUARDIAN]: {
    key: BADGE_KEYS.GREEN_GUARDIAN,
    name: 'Green Guardian',
    description: 'Reduced monthly carbon footprint by 50% or more compared to your baseline.',
    icon: 'Shield',
    color: '#10B981'
  },
  [BADGE_KEYS.SUSTAINABILITY_CHAMPION]: {
    key: BADGE_KEYS.SUSTAINABILITY_CHAMPION,
    name: 'Sustainability Champion',
    description: 'Reduced monthly carbon footprint by 75% or more compared to your baseline.',
    icon: 'Award',
    color: '#8B5CF6'
  },
  [BADGE_KEYS.ECO_SCHOLAR]: {
    key: BADGE_KEYS.ECO_SCHOLAR,
    name: 'Eco Scholar',
    description: 'Read all available educational articles to expand your sustainability knowledge.',
    icon: 'BookOpen',
    color: '#F59E0B'
  },
  [BADGE_KEYS.HABIT_CHANGER]: {
    key: BADGE_KEYS.HABIT_CHANGER,
    name: 'Habit Changer',
    description: `Adopted at least ${HABIT_CHANGER_THRESHOLD} reduction recommendations.`,
    icon: 'Sparkles',
    color: '#EC4899'
  }
};

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

/**
 * Award a badge if not already held and grant badge points.
 * Idempotent — calling twice for the same user/key is safe.
 *
 * @param {number} userId   - User database ID.
 * @param {string} badgeKey - One of the BADGE_KEYS enum values.
 * @returns {Promise<void>}
 */
async function awardBadgeIfNew(userId, badgeKey) {
  const existing = await dbGet(
    'SELECT id FROM badges WHERE user_id = ? AND badge_key = ?',
    [userId, badgeKey]
  );
  if (existing) return;

  await dbRun('INSERT INTO badges (user_id, badge_key) VALUES (?, ?)', [userId, badgeKey]);
  await dbRun('UPDATE users SET points = points + ? WHERE id = ?', [POINTS_REWARDS.BADGE, userId]);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * @route  GET /api/leaderboard
 * @desc   Global leaderboard ranked by reduction % then points.
 * @access Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const users = await dbAll('SELECT id, name, location, points FROM users', []);
  if (users.length === 0) return res.json([]);

  // Fetch all calculations and badges in two queries instead of N queries
  const allCalculations = await dbAll(
    'SELECT user_id, co2_total, date FROM calculations ORDER BY date ASC',
    []
  );
  const allBadges = await dbAll('SELECT user_id, badge_key FROM badges', []);

  // Group calculations by user_id
  const calculationsByUser = {};
  allCalculations.forEach(calculation => {
    if (!calculationsByUser[calculation.user_id]) {
      calculationsByUser[calculation.user_id] = [];
    }
    calculationsByUser[calculation.user_id].push(calculation);
  });

  // Group badges by user_id
  const badgesByUser = {};
  allBadges.forEach(badge => {
    if (!badgesByUser[badge.user_id]) badgesByUser[badge.user_id] = [];
    badgesByUser[badge.user_id].push(badge.badge_key);
  });

  // Compute leaderboard entry per user
  const leaderboard = users.map(user => {
    const userCalculations = calculationsByUser[user.id] || [];
    let reductionPercent = 0;
    let currentCO2 = 0;

    if (userCalculations.length > 0) {
      const baselineCO2 = userCalculations[0].co2_total;
      const latestCO2 = userCalculations[userCalculations.length - 1].co2_total;
      currentCO2 = round(latestCO2, 1);

      if (userCalculations.length > 1 && baselineCO2 > 0) {
        reductionPercent = ((baselineCO2 - latestCO2) / baselineCO2) * 100;
      }
    }

    return {
      id:               user.id,
      name:             user.name,
      location:         user.location || 'Earth',
      points:           user.points,
      currentCO2,
      reductionPercent: round(reductionPercent, 1),
      badges:           badgesByUser[user.id] || []
    };
  });

  // Sort: reduction % descending, then points descending
  leaderboard.sort((a, b) => {
    if (b.reductionPercent !== a.reductionPercent) {
      return b.reductionPercent - a.reductionPercent;
    }
    return b.points - a.points;
  });

  // Attach rank numbers
  const rankedLeaderboard = leaderboard.map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));

  res.json(rankedLeaderboard);
}));

/**
 * @route  GET /api/leaderboard/badges
 * @desc   Return all badges with unlock status for the authenticated user.
 *         Dynamically awards habit_changer and eco_scholar if thresholds are met.
 * @access Private
 */
router.get('/badges', auth, asyncHandler(async (req, res) => {
  // 1. Check thresholds in parallel
  const [adoptedCountRow, readCountRow, totalArticlesRow] = await Promise.all([
    dbGet(
      'SELECT COUNT(*) as count FROM adopted_tips WHERE user_id = ? AND status = ?',
      [req.user.id, 'adopted']
    ),
    dbGet('SELECT COUNT(*) as count FROM read_articles WHERE user_id = ?', [req.user.id]),
    dbGet('SELECT COUNT(*) as count FROM articles', [])
  ]);

  const adoptedCount  = adoptedCountRow?.count  ?? 0;
  const readCount     = readCountRow?.count      ?? 0;
  const totalArticles = totalArticlesRow?.count  ?? 5;

  // 2. Award dynamic badges if thresholds met
  const awardTasks = [];
  if (adoptedCount >= HABIT_CHANGER_THRESHOLD) {
    awardTasks.push(awardBadgeIfNew(req.user.id, BADGE_KEYS.HABIT_CHANGER));
  }
  if (totalArticles > 0 && readCount >= totalArticles) {
    awardTasks.push(awardBadgeIfNew(req.user.id, BADGE_KEYS.ECO_SCHOLAR));
  }
  await Promise.all(awardTasks);

  // 3. Fetch all user badges
  const userBadgeRows = await dbAll(
    'SELECT badge_key, awarded_at FROM badges WHERE user_id = ?',
    [req.user.id]
  );

  const unlockedMap = {};
  userBadgeRows.forEach(row => { unlockedMap[row.badge_key] = row.awarded_at; });

  const badgesList = Object.keys(BADGES_CATALOG).map(key => ({
    ...BADGES_CATALOG[key],
    unlocked:   !!unlockedMap[key],
    awarded_at: unlockedMap[key] || null
  }));

  res.json(badgesList);
}));

/**
 * @route  POST /api/leaderboard/claim-challenge
 * @desc   Claim points for completing a weekly sustainability challenge.
 * @access Private
 */
router.post('/claim-challenge', auth, asyncHandler(async (req, res) => {
  const { challenge_key } = req.body;

  if (!VALID_CHALLENGE_KEYS.includes(challenge_key)) {
    throw new AppError('Invalid challenge key', 400);
  }

  if (challenge_key === 'reduce_10') {
    // Verify the user actually achieved a 10% reduction
    const calculations = await dbAll(
      'SELECT co2_total FROM calculations WHERE user_id = ? ORDER BY date ASC',
      [req.user.id]
    );

    if (calculations.length < 2) {
      throw new AppError(
        'You need at least 2 calculations to verify a 10% reduction vs baseline!',
        400
      );
    }

    const baselineCO2 = calculations[0].co2_total;
    const latestCO2   = calculations[calculations.length - 1].co2_total;
    const reductionPercent = ((baselineCO2 - latestCO2) / baselineCO2) * 100;

    if (reductionPercent < CHALLENGE_REDUCTION_THRESHOLD) {
      throw new AppError(
        `Your current reduction is only ${round(reductionPercent, 1)}%. You need at least ${CHALLENGE_REDUCTION_THRESHOLD}% to claim points.`,
        400
      );
    }

    await dbRun(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [POINTS_REWARDS.CHALLENGE_REDUCTION, req.user.id]
    );

    return res.json({
      message: `Weekly challenge completed! +${POINTS_REWARDS.CHALLENGE_REDUCTION} Points added to your account.`,
      pointsEarned: POINTS_REWARDS.CHALLENGE_REDUCTION
    });
  }

  // Behaviour-based challenges — award directly
  await dbRun(
    'UPDATE users SET points = points + ? WHERE id = ?',
    [POINTS_REWARDS.CHALLENGE_BEHAVIOR, req.user.id]
  );

  res.json({
    message: `Challenge claimed successfully! +${POINTS_REWARDS.CHALLENGE_BEHAVIOR} Points added to your account.`,
    pointsEarned: POINTS_REWARDS.CHALLENGE_BEHAVIOR
  });
}));

module.exports = router;
