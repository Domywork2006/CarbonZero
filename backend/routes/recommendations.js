'use strict';

/**
 * @fileoverview AI recommendations routes for TerraSense.
 * Surfaces personalised reduction tips based on the user's highest emission categories.
 * Handles tip adoption and points rewards.
 *
 * Refactored: nested callbacks → async/await, magic numbers → constants.
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { dbGet, dbRun, dbAll } = require('../utils/db');
const { POINTS_REWARDS, RECOMMENDATION_TIPS_COUNT } = require('../utils/constants');

// ---------------------------------------------------------------------------
// Tips Database
// ---------------------------------------------------------------------------

/** @type {Array<{id: string, title: string, category: string, savings: number, difficulty: string, timeline: string, description: string}>} */
const ALL_TIPS = [
  // Transport Tips
  {
    id: 'trans_carpool',
    title: 'Carpool or use public transit twice a week',
    category: 'Transport',
    savings: 50,
    difficulty: 'Medium',
    timeline: '1 week',
    description: 'Sharing rides or utilizing buses/trains for your commute twice a week significantly reduces fuel combustion emissions.'
  },
  {
    id: 'trans_ev',
    title: 'Transition to an EV or hybrid vehicle',
    category: 'Transport',
    savings: 200,
    difficulty: 'Hard',
    timeline: '6 months',
    description: 'Replacing a gas vehicle with an electric or hybrid alternative can eliminate tailpipe emissions entirely if powered by clean electricity.'
  },
  {
    id: 'trans_bike',
    title: 'Bike or walk for short trips under 2 miles',
    category: 'Transport',
    savings: 25,
    difficulty: 'Easy',
    timeline: '2 days',
    description: 'For close distances, active transit is zero-carbon and has added cardiovascular health benefits.'
  },
  {
    id: 'trans_maintenance',
    title: 'Perform regular car maintenance',
    category: 'Transport',
    savings: 12,
    difficulty: 'Easy',
    timeline: '1 day',
    description: 'Keeping tires properly inflated, changing filters, and regular oil service improves fuel efficiency by 3-4%.'
  },
  {
    id: 'trans_train',
    title: 'Take the train instead of short-haul flights',
    category: 'Transport',
    savings: 120,
    difficulty: 'Medium',
    timeline: '1 month',
    description: 'High-speed trains emit up to 90% less carbon than equivalent regional flights.'
  },
  // Energy Tips
  {
    id: 'energy_renew',
    title: 'Switch to a 100% renewable electricity plan',
    category: 'Energy',
    savings: 150,
    difficulty: 'Easy',
    timeline: '1 week',
    description: 'Contact your utility provider or switch retail suppliers to choose a green tariff sourced from solar, wind, or hydro.'
  },
  {
    id: 'energy_thermostat',
    title: 'Install a smart/programmable thermostat',
    category: 'Energy',
    savings: 45,
    difficulty: 'Medium',
    timeline: '1 week',
    description: 'Smart thermostats automatically lower heating/cooling when you are out or asleep, saving around 10% on energy bills.'
  },
  {
    id: 'energy_vampire',
    title: 'Unplug standby electronics using smart strips',
    category: 'Energy',
    savings: 10,
    difficulty: 'Easy',
    timeline: '1 day',
    description: 'Devices draw power even when turned off. Use smart power strips that shut off electricity to idle peripherals.'
  },
  {
    id: 'energy_led',
    title: 'Replace lightbulbs with energy-efficient LEDs',
    category: 'Energy',
    savings: 20,
    difficulty: 'Easy',
    timeline: '2 days',
    description: 'LEDs use 75% less energy and last up to 25 times longer than incandescent bulbs.'
  },
  {
    id: 'energy_temp',
    title: 'Wash clothes in cold water & air-dry',
    category: 'Energy',
    savings: 15,
    difficulty: 'Easy',
    timeline: '1 day',
    description: 'Heating water accounts for 90% of the energy needed for washing clothes. Air-drying bypasses the energy-heavy dryer entirely.'
  },
  // Diet Tips
  {
    id: 'diet_meatless',
    title: 'Adopt Meatless Mondays',
    category: 'Diet',
    savings: 30,
    difficulty: 'Easy',
    timeline: '1 week',
    description: 'Swapping meat for plant proteins just one day a week saves significant agricultural water and greenhouse gases.'
  },
  {
    id: 'diet_veg',
    title: 'Transition to a fully vegetarian diet',
    category: 'Diet',
    savings: 120,
    difficulty: 'Medium',
    timeline: '1 month',
    description: 'Eliminating meat from your diet cuts your food-related carbon emissions by nearly half.'
  },
  {
    id: 'diet_vegan',
    title: 'Transition to a fully vegan diet',
    category: 'Diet',
    savings: 180,
    difficulty: 'Hard',
    timeline: '2 months',
    description: 'A plant-based diet eliminates emissions from enteric fermentation and feed production, reducing food emissions by 70%.'
  },
  {
    id: 'diet_waste',
    title: 'Reduce food waste with meal planning',
    category: 'Diet',
    savings: 15,
    difficulty: 'Easy',
    timeline: '3 days',
    description: 'Food rotting in landfills creates methane, a potent greenhouse gas. Plan meals and freeze leftovers to waste less.'
  },
  {
    id: 'diet_local',
    title: 'Buy local and seasonal produce',
    category: 'Diet',
    savings: 10,
    difficulty: 'Easy',
    timeline: '1 week',
    description: 'Reduces food miles (transport emissions) and support farms that use open-field growing rather than heated glasshouses.'
  },
  // Purchases Tips
  {
    id: 'purch_thrift',
    title: 'Buy clothing secondhand or thrifted',
    category: 'Purchases',
    savings: 20,
    difficulty: 'Easy',
    timeline: '1 week',
    description: 'Extending the life of clothes reduces the need for resource-intensive textile fabrication.'
  },
  {
    id: 'purch_repair',
    title: 'Repair electronics instead of replacing them',
    category: 'Purchases',
    savings: 60,
    difficulty: 'Medium',
    timeline: '1 month',
    description: 'Avoid manufacturing emissions—which make up 80% of a smart device\'s lifecycle footprint—by replacing batteries or screens.'
  },
  {
    id: 'purch_consolidate',
    title: 'Consolidate online shipping orders',
    category: 'Purchases',
    savings: 5,
    difficulty: 'Easy',
    timeline: '1 day',
    description: 'Requesting items in a single package reduces cardboard waste and reduces delivery truck fuel burn.'
  },
  {
    id: 'purch_minimal',
    title: 'Implement the 30-day purchase waiting rule',
    category: 'Purchases',
    savings: 35,
    difficulty: 'Medium',
    timeline: '1 month',
    description: 'Wait 30 days before buying non-essential items. This prevents impulse shopping and reduces material waste.'
  }
];

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

/**
 * Filter ALL_TIPS to a specific category and return up to `limit` results.
 *
 * @param {string} category - Tip category name (e.g. 'Transport').
 * @param {number} limit    - Maximum number of tips to return.
 * @returns {Array} Filtered tip objects.
 */
function getTipsForCategory(category, limit) {
  return ALL_TIPS.filter(tip => tip.category === category).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * @route  GET /api/recommendations
 * @desc   Return personalised reduction tips ranked by user's highest emission categories.
 * @access Private
 */
router.get('/', auth, asyncHandler(async (req, res) => {
  // 1. Get latest calculation to determine category rankings
  const latestCalculation = await dbGet(
    'SELECT * FROM calculations WHERE user_id = ? ORDER BY date DESC LIMIT 1',
    [req.user.id]
  );

  // Sort emission categories highest-first; fall back to a sensible default order
  let categoriesByEmission = ['Energy', 'Transport', 'Diet', 'Purchases'];
  if (latestCalculation) {
    categoriesByEmission = [
      { name: 'Transport', value: latestCalculation.co2_transport },
      { name: 'Energy',    value: latestCalculation.co2_energy    },
      { name: 'Diet',      value: latestCalculation.co2_diet      },
      { name: 'Purchases', value: latestCalculation.co2_purchases  }
    ]
      .sort((a, b) => b.value - a.value)
      .map(entry => entry.name);
  }

  // 2. Fetch adopted tip statuses for this user
  const adoptedRows = await dbAll(
    'SELECT tip_id, status FROM adopted_tips WHERE user_id = ?',
    [req.user.id]
  );

  const adoptionStatusMap = {};
  adoptedRows.forEach(row => { adoptionStatusMap[row.tip_id] = row.status; });

  // 3. Select tips: primary × 3, secondary × 2, tertiary × 1, quaternary × 1
  const [primaryCategory, secondaryCategory, tertiaryCategory, quaternaryCategory]
    = categoriesByEmission;

  const selectedTips = [
    ...getTipsForCategory(primaryCategory,   RECOMMENDATION_TIPS_COUNT.PRIMARY),
    ...getTipsForCategory(secondaryCategory, RECOMMENDATION_TIPS_COUNT.SECONDARY),
    ...getTipsForCategory(tertiaryCategory,  RECOMMENDATION_TIPS_COUNT.TERTIARY),
    ...getTipsForCategory(quaternaryCategory,RECOMMENDATION_TIPS_COUNT.QUATERNARY)
  ];

  // 4. Attach current adoption status to each tip
  const formattedTips = selectedTips.map(tip => ({
    ...tip,
    status: adoptionStatusMap[tip.id] || 'none'
  }));

  res.json(formattedTips);
}));

/**
 * @route  POST /api/recommendations/adopt
 * @desc   Mark a reduction tip as in_progress, adopted, or clear its status.
 * @access Private
 */
router.post('/adopt', auth, asyncHandler(async (req, res) => {
  const { tip_id, status } = req.body;
  const VALID_STATUSES = ['in_progress', 'adopted', 'none'];

  if (!tip_id || !VALID_STATUSES.includes(status)) {
    throw new AppError('Invalid tip_id or status value', 400);
  }

  const tip = ALL_TIPS.find(t => t.id === tip_id);
  if (!tip) throw new AppError('Tip not found', 404);

  // Handle status clearing
  if (status === 'none') {
    await dbRun(
      'DELETE FROM adopted_tips WHERE user_id = ? AND tip_id = ?',
      [req.user.id, tip_id]
    );
    return res.json({ message: 'Tip status cleared', tip_id, status: 'none' });
  }

  // Check current adoption state before upserting
  const existingRow = await dbGet(
    'SELECT status FROM adopted_tips WHERE user_id = ? AND tip_id = ?',
    [req.user.id, tip_id]
  );
  const wasAlreadyAdopted = existingRow?.status === 'adopted';

  // Upsert adoption record
  await dbRun(
    `INSERT INTO adopted_tips (user_id, tip_id, status) VALUES (?, ?, ?)
     ON CONFLICT(user_id, tip_id) DO UPDATE SET status=excluded.status`,
    [req.user.id, tip_id, status]
  );

  // Award points only on first adoption
  if (status === 'adopted' && !wasAlreadyAdopted) {
    await dbRun(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [POINTS_REWARDS.ADOPTION, req.user.id]
    );
    return res.json({
      message: `Tip successfully adopted! +${POINTS_REWARDS.ADOPTION} Points earned!`,
      tip_id,
      status,
      pointsEarned: POINTS_REWARDS.ADOPTION
    });
  }

  res.json({
    message: `Tip status updated to ${status}`,
    tip_id,
    status,
    pointsEarned: 0
  });
}));

module.exports = router;
