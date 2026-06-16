/**
 * @fileoverview Centralised constants for the TerraSense backend.
 * Replace all magic numbers in route files with these named exports.
 */

'use strict';

/**
 * Points awarded to users for various actions.
 * @enum {number}
 */
const POINTS_REWARDS = {
  /** Points for submitting a monthly carbon calculation */
  CALCULATION: 50,
  /** Points for unlocking any badge */
  BADGE: 500,
  /** Points for fully adopting a reduction tip */
  ADOPTION: 100,
  /** Points for reading an educational article */
  ARTICLE: 25,
  /** Points for completing the 10%-reduction weekly challenge */
  CHALLENGE_REDUCTION: 200,
  /** Points for completing a behaviour-based weekly challenge */
  CHALLENGE_BEHAVIOR: 150
};

/**
 * How many tips to surface per emission category in recommendations.
 * @enum {number}
 */
const RECOMMENDATION_TIPS_COUNT = {
  PRIMARY: 3,
  SECONDARY: 2,
  TERTIARY: 1,
  QUATERNARY: 1
};

/**
 * Monthly national average CO2e emissions in kg.
 * Used for the "compare to country" section in the summary endpoint.
 * @enum {number}
 */
const NATIONAL_AVERAGES = {
  US: 1333,
  UK: 708,
  India: 183,
  global: 400
};

/**
 * Divisor used to convert raw co2_total into a 0-100 sustainability score.
 * score = clamp(100 - co2_total / EMISSION_SCORE_DIVISOR, 0, 100)
 * @type {number}
 */
const EMISSION_SCORE_DIVISOR = 25;

/**
 * Default month-over-month reduction rate applied when predicting
 * next month's footprint and only one calculation exists.
 * @type {number}
 */
const PREDICTED_REDUCTION_RATE = 0.95;

/**
 * Maximum day gap between two calculations that still counts as an
 * unbroken monthly streak (35 days ≈ one calendar month + buffer).
 * @type {number}
 */
const STREAK_MAX_GAP_DAYS = 35;

/**
 * Valid string keys for user badges.
 * @enum {string}
 */
const BADGE_KEYS = {
  FIRST_STEP: 'first_step',
  GREEN_GUARDIAN: 'green_guardian',
  SUSTAINABILITY_CHAMPION: 'sustainability_champion',
  ECO_SCHOLAR: 'eco_scholar',
  HABIT_CHANGER: 'habit_changer'
};

/**
 * Minimum number of adopted tips required to earn the Habit Changer badge.
 * @type {number}
 */
const HABIT_CHANGER_THRESHOLD = 3;

/**
 * Minimum percentage reduction vs baseline required for the Green Guardian badge.
 * @type {number}
 */
const GREEN_GUARDIAN_THRESHOLD = 50;

/**
 * Minimum percentage reduction vs baseline required for the Sustainability Champion badge.
 * @type {number}
 */
const SUSTAINABILITY_CHAMPION_THRESHOLD = 75;

/**
 * Minimum percentage reduction vs baseline required to claim the reduce_10 challenge.
 * @type {number}
 */
const CHALLENGE_REDUCTION_THRESHOLD = 10;

/**
 * Valid weekly challenge keys accepted by the claim-challenge endpoint.
 * @type {string[]}
 */
const VALID_CHALLENGE_KEYS = ['reduce_10', 'no_plastic', 'public_transport', 'energy_saving'];

module.exports = {
  POINTS_REWARDS,
  RECOMMENDATION_TIPS_COUNT,
  NATIONAL_AVERAGES,
  EMISSION_SCORE_DIVISOR,
  PREDICTED_REDUCTION_RATE,
  STREAK_MAX_GAP_DAYS,
  BADGE_KEYS,
  HABIT_CHANGER_THRESHOLD,
  GREEN_GUARDIAN_THRESHOLD,
  SUSTAINABILITY_CHAMPION_THRESHOLD,
  CHALLENGE_REDUCTION_THRESHOLD,
  VALID_CHALLENGE_KEYS
};
