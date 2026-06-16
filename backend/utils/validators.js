/**
 * @fileoverview Input validation helpers for TerraSense API endpoints.
 * Each function returns null on success or a descriptive error string on failure.
 */

'use strict';

/** Simple email format regular expression. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minimum allowed password length. */
const MIN_PASSWORD_LENGTH = 6;

/**
 * Validate user registration payload.
 *
 * @param {Object} data - Request body from POST /api/auth/register.
 * @param {string} data.name     - Required user display name.
 * @param {string} data.email    - Required email address.
 * @param {string} data.password - Required password (min 6 chars).
 * @returns {string|null} Error message string, or null if valid.
 */
function validateRegistration({ name, email, password } = {}) {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return 'Name is required';
  }
  if (!email || typeof email !== 'string') {
    return 'Email is required';
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return 'Please provide a valid email address';
  }
  if (!password || typeof password !== 'string') {
    return 'Password is required';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

/**
 * Validate user login payload.
 *
 * @param {Object} data - Request body from POST /api/auth/login.
 * @param {string} data.email    - Required email address.
 * @param {string} data.password - Required password.
 * @returns {string|null} Error message string, or null if valid.
 */
function validateLogin({ email, password } = {}) {
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    return 'Email is required';
  }
  if (!password || typeof password !== 'string' || password.length === 0) {
    return 'Password is required';
  }
  return null;
}

/**
 * Validate a carbon footprint calculation payload.
 * All numeric fields must be non-negative numbers.
 *
 * @param {Object} data - Request body from POST /api/calculations.
 * @returns {string|null} Error message string, or null if valid.
 */
function validateCalculationInput(data = {}) {
  const numericFields = [
    'car_miles', 'bus_miles', 'train_miles', 'flight_miles', 'bike_miles',
    'electricity_kwh', 'gas_kwh', 'heating_kwh',
    'veg_meals', 'meat_meals', 'vegan_meals',
    'waste_kg', 'water_liters',
    'clothing_items', 'electronics_items', 'shipping_packages'
  ];

  for (const field of numericFields) {
    const value = data[field];
    // Fields are optional (default to 0), but if provided they must be non-negative
    if (value !== undefined && value !== null && value !== '') {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) {
        return `Field '${field}' must be a non-negative number (got: ${value})`;
      }
    }
  }
  return null;
}

module.exports = { validateRegistration, validateLogin, validateCalculationInput };
