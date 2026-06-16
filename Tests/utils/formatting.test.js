'use strict';

/**
 * Unit tests for backend/utils/formatting.js
 * Tests: round(), roundEmissions(), parseJSON()
 *
 * Run with: node --test tests/utils/formatting.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { round, roundEmissions, parseJSON } = require('../../Backend/utils/formatting');

// ---------------------------------------------------------------------------
// round()
// ---------------------------------------------------------------------------
describe('round()', () => {
  it('rounds to 1 decimal place by default', () => {
    assert.equal(round(1.234), 1.2);
    assert.equal(round(1.678), 1.7);
  });

  it('rounds to specified decimal places', () => {
    assert.equal(round(1.2345, 2), 1.23);
    assert.equal(round(1.2355, 2), 1.24);
    assert.equal(round(100, 0), 100);
  });

  it('handles zero', () => {
    assert.equal(round(0), 0);
    assert.equal(round(0.0), 0);
  });

  it('returns 0 for non-finite values', () => {
    assert.equal(round(NaN), 0);
    assert.equal(round(Infinity), 0);
    assert.equal(round(-Infinity), 0);
  });

  it('handles negative numbers correctly', () => {
    assert.equal(round(-1.25, 1), -1.2);
    // Note: JavaScript Math.round rounds -1.35 toward positive infinity → -1.3
    assert.equal(round(-1.35, 1), -1.3);
  });

  it('handles very large numbers', () => {
    assert.equal(round(999999.999, 1), 1000000);
  });
});

// ---------------------------------------------------------------------------
// roundEmissions()
// ---------------------------------------------------------------------------
describe('roundEmissions()', () => {
  const sampleRow = {
    id: 1,
    user_id: 42,
    date: '2025-01-01',
    co2_transport: 12.3456,
    co2_energy: 5.6789,
    co2_diet: 0.1234,
    co2_waste: 2.5678,
    co2_water:     0.345,   // larger sample so 2-decimal rounding is verifiable
    co2_purchases: 80.111,
    co2_total: 101.0277
  };

  it('rounds all CO2 fields on a database row', () => {
    const result = roundEmissions(sampleRow);
    assert.equal(result.co2_transport, 12.3);
    assert.equal(result.co2_energy,    5.7);
    assert.equal(result.co2_diet,      0.1);
    assert.equal(result.co2_waste,     2.6);
    assert.equal(result.co2_water,     0.35); // round(0.345, 2) = 0.35
    assert.equal(result.co2_purchases, 80.1);
    assert.equal(result.co2_total,     101.0);
  });

  it('preserves non-CO2 fields unchanged', () => {
    const result = roundEmissions(sampleRow);
    assert.equal(result.id, 1);
    assert.equal(result.user_id, 42);
    assert.equal(result.date, '2025-01-01');
  });

  it('does not mutate the original row', () => {
    const original = { ...sampleRow };
    roundEmissions(sampleRow);
    assert.deepEqual(sampleRow, original);
  });

  it('handles missing (undefined) CO2 fields gracefully', () => {
    const result = roundEmissions({ co2_total: 50 });
    assert.equal(result.co2_transport, 0);
    assert.equal(result.co2_water,     0);
    assert.equal(result.co2_total,     50);
  });

  it('handles null CO2 fields by treating them as 0', () => {
    const result = roundEmissions({ co2_transport: null, co2_total: 10 });
    assert.equal(result.co2_transport, 0);
  });
});

// ---------------------------------------------------------------------------
// parseJSON()
// ---------------------------------------------------------------------------
describe('parseJSON()', () => {
  it('parses a valid JSON array string', () => {
    assert.deepEqual(parseJSON('["energy","transport"]'), ['energy', 'transport']);
  });

  it('parses a valid JSON object string', () => {
    assert.deepEqual(parseJSON('{"key":"value"}'), { key: 'value' });
  });

  it('returns default value for null input', () => {
    assert.deepEqual(parseJSON(null), []);
    assert.deepEqual(parseJSON(null, {}), {});
  });

  it('returns default value for undefined input', () => {
    assert.deepEqual(parseJSON(undefined), []);
  });

  it('returns default value for empty string', () => {
    assert.deepEqual(parseJSON(''), []);
  });

  it('returns default value for malformed JSON', () => {
    assert.deepEqual(parseJSON('{bad json}'), []);
    assert.deepEqual(parseJSON('[unclosed'), []);
  });

  it('returns custom default value when parsing fails', () => {
    assert.deepEqual(parseJSON('invalid', { fallback: true }), { fallback: true });
  });
});
