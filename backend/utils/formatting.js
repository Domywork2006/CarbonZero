/**
 * @fileoverview Formatting helpers shared across TerraSense route handlers.
 * Eliminates repeated rounding logic and unsafe JSON parsing.
 */

'use strict';

/**
 * Round a number to a given number of decimal places.
 *
 * @param {number} value    - The raw number to round.
 * @param {number} [decimals=1] - Number of decimal places (default 1).
 * @returns {number} The rounded value, or 0 if value is not finite.
 */
function round(value, decimals = 1) {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Round all CO2 emission fields on a calculation row in one call.
 * Works with both database rows and plain objects that contain CO2 fields.
 *
 * @param {Object} row - Object containing raw co2_* fields from the database.
 * @param {number} [row.co2_transport]
 * @param {number} [row.co2_energy]
 * @param {number} [row.co2_diet]
 * @param {number} [row.co2_waste]
 * @param {number} [row.co2_water]
 * @param {number} [row.co2_purchases]
 * @param {number} [row.co2_total]
 * @returns {Object} Shallow copy of row with all CO2 fields rounded.
 */
function roundEmissions(row) {
  return {
    ...row,
    co2_transport: round(row.co2_transport ?? 0, 1),
    co2_energy:    round(row.co2_energy    ?? 0, 1),
    co2_diet:      round(row.co2_diet      ?? 0, 1),
    co2_waste:     round(row.co2_waste     ?? 0, 1),
    co2_water:     round(row.co2_water     ?? 0, 2), // Smaller unit — keep extra precision
    co2_purchases: round(row.co2_purchases ?? 0, 1),
    co2_total:     round(row.co2_total     ?? 0, 1)
  };
}

/**
 * Safely parse a JSON string, returning a default value on failure.
 * Replaces the try/catch pattern duplicated in auth.js for user interests.
 *
 * @param {string|null|undefined} jsonString - The raw JSON string to parse.
 * @param {*} [defaultValue=[]] - Fallback value when parsing fails or input is empty.
 * @returns {*} Parsed value, or defaultValue if parsing fails.
 */
function parseJSON(jsonString, defaultValue = []) {
  if (!jsonString) return defaultValue;
  try {
    const parsed = JSON.parse(jsonString);
    return parsed ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

module.exports = { round, roundEmissions, parseJSON };
