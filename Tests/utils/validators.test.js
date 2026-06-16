'use strict';

/**
 * Unit tests for backend/utils/validators.js
 * Tests: validateRegistration(), validateLogin(), validateCalculationInput()
 *
 * Run with: node --test tests/utils/validators.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateRegistration,
  validateLogin,
  validateCalculationInput
} = require('../../Backend/utils/validators');

// ---------------------------------------------------------------------------
// validateRegistration()
// ---------------------------------------------------------------------------
describe('validateRegistration()', () => {
  const valid = { name: 'Alice', email: 'alice@example.com', password: 'secure1' };

  it('returns null for valid registration data', () => {
    assert.equal(validateRegistration(valid), null);
  });

  it('rejects missing name', () => {
    assert.ok(validateRegistration({ ...valid, name: '' }));
    assert.ok(validateRegistration({ ...valid, name: '   ' }));
    assert.ok(validateRegistration({ email: valid.email, password: valid.password }));
  });

  it('rejects invalid email format', () => {
    assert.ok(validateRegistration({ ...valid, email: 'not-an-email' }));
    assert.ok(validateRegistration({ ...valid, email: 'missing@' }));
    assert.ok(validateRegistration({ ...valid, email: '@nodomain' }));
  });

  it('rejects missing email', () => {
    assert.ok(validateRegistration({ name: valid.name, password: valid.password }));
  });

  it('rejects password shorter than 6 characters', () => {
    assert.ok(validateRegistration({ ...valid, password: '12345' }));
  });

  it('accepts password of exactly 6 characters', () => {
    assert.equal(validateRegistration({ ...valid, password: '123456' }), null);
  });

  it('rejects missing password', () => {
    assert.ok(validateRegistration({ name: valid.name, email: valid.email }));
  });

  it('returns a string error message (not a boolean)', () => {
    const result = validateRegistration({ name: '', email: valid.email, password: valid.password });
    assert.equal(typeof result, 'string');
  });
});

// ---------------------------------------------------------------------------
// validateLogin()
// ---------------------------------------------------------------------------
describe('validateLogin()', () => {
  const valid = { email: 'user@example.com', password: 'secret' };

  it('returns null for valid login data', () => {
    assert.equal(validateLogin(valid), null);
  });

  it('rejects missing email', () => {
    assert.ok(validateLogin({ password: valid.password }));
    assert.ok(validateLogin({ email: '', password: valid.password }));
  });

  it('rejects missing password', () => {
    assert.ok(validateLogin({ email: valid.email }));
    assert.ok(validateLogin({ email: valid.email, password: '' }));
  });

  it('returns a string error message', () => {
    const result = validateLogin({ email: '', password: '' });
    assert.equal(typeof result, 'string');
  });
});

// ---------------------------------------------------------------------------
// validateCalculationInput()
// ---------------------------------------------------------------------------
describe('validateCalculationInput()', () => {
  it('returns null for an empty object (all fields optional)', () => {
    assert.equal(validateCalculationInput({}), null);
  });

  it('returns null when all provided values are non-negative numbers', () => {
    assert.equal(validateCalculationInput({
      car_miles: 100, electricity_kwh: 250, meat_meals: 7
    }), null);
  });

  it('returns null for zero values', () => {
    assert.equal(validateCalculationInput({ car_miles: 0, electricity_kwh: 0 }), null);
  });

  it('rejects negative numbers', () => {
    assert.ok(validateCalculationInput({ car_miles: -1 }));
    assert.ok(validateCalculationInput({ electricity_kwh: -0.1 }));
    assert.ok(validateCalculationInput({ meat_meals: -5 }));
  });

  it('rejects non-numeric strings', () => {
    assert.ok(validateCalculationInput({ car_miles: 'abc' }));
    assert.ok(validateCalculationInput({ electricity_kwh: 'one hundred' }));
  });

  it('allows omitted (undefined) fields', () => {
    assert.equal(validateCalculationInput({ car_miles: undefined }), null);
  });

  it('allows empty string (treated as omitted)', () => {
    assert.equal(validateCalculationInput({ car_miles: '' }), null);
  });

  it('returns a descriptive string error mentioning the field name', () => {
    const result = validateCalculationInput({ car_miles: -10 });
    assert.equal(typeof result, 'string');
    assert.ok(result.includes('car_miles'));
  });
});
