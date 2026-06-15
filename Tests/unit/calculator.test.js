const test = require('node:test');
const assert = require('node:assert');
const { calculateCarbonFootprint } = require('../../Backend/utils/calculator');

test('TerraSense Carbon Calculator Unit Tests', async (t) => {
  
  await t.test('returns all zeroes when inputs are missing or zero', () => {
    const result = calculateCarbonFootprint({});
    assert.strictEqual(result.co2_transport, 0);
    assert.strictEqual(result.co2_energy, 0);
    assert.strictEqual(result.co2_diet, 0);
    assert.strictEqual(result.co2_waste, 0);
    assert.strictEqual(result.co2_water, 0);
    assert.strictEqual(result.co2_purchases, 0);
    assert.strictEqual(result.co2_total, 0);
  });

  await t.test('calculates transportation carbon correctly (including train)', () => {
    // 100 car miles * 0.18 = 18
    // 50 bus miles * 0.08 = 4
    // 50 train miles * 0.04 = 2
    // 200 flight miles * 0.20 = 40
    // Total transport = 18 + 4 + 2 + 40 = 64 kg
    const result = calculateCarbonFootprint({
      car_miles: 100,
      bus_miles: 50,
      train_miles: 50,
      flight_miles: 200,
      bike_miles: 10
    });
    
    assert.strictEqual(result.co2_transport, 64);
    assert.strictEqual(result.co2_total, 64);
  });

  await t.test('calculates home energy utilities correctly', () => {
    // 100 electricity kWh * 0.40 = 40
    // 50 gas kWh * 0.20 = 10
    // 10 heating kWh * 0.25 = 2.5
    // Total energy = 40 + 10 + 2.5 = 52.5 kg
    const result = calculateCarbonFootprint({
      electricity_kwh: 100,
      gas_kwh: 50,
      heating_kwh: 10
    });

    assert.strictEqual(result.co2_energy, 52.5);
    assert.strictEqual(result.co2_total, 52.5);
  });

  await t.test('calculates diet carbon correctly with weekly-to-monthly scaling', () => {
    // 7 veg meals * 0.6 = 4.2
    // 7 meat meals * 2.5 = 17.5
    // 7 vegan meals * 0.3 = 2.1
    // Total meals per week = 4.2 + 17.5 + 2.1 = 23.8
    // Scaled to monthly (x 4.33) = 23.8 * 4.33 = 103.054 -> round to 103.1 kg
    const result = calculateCarbonFootprint({
      veg_meals: 7,
      meat_meals: 7,
      vegan_meals: 7
    });

    assert.strictEqual(result.co2_diet, 103.1);
    assert.strictEqual(result.co2_total, 103.1);
  });

  await t.test('calculates waste and water consumption footprint correctly', () => {
    // 40 kg waste * 0.5 = 20 kg CO2e
    // 10000 liters water * 0.0003 = 3 kg CO2e
    // Total = 23 kg
    const result = calculateCarbonFootprint({
      waste_kg: 40,
      water_liters: 10000
    });

    assert.strictEqual(result.co2_waste, 20);
    assert.strictEqual(result.co2_water, 3);
    assert.strictEqual(result.co2_total, 23);
  });

  await t.test('calculates purchases carbon correctly', () => {
    // 3 clothing items * 10 = 30
    // 1 electronics * 80 = 80
    // 5 shipping packages * 1.5 = 7.5
    // Total purchases = 30 + 80 + 7.5 = 117.5 kg
    const result = calculateCarbonFootprint({
      clothing_items: 3,
      electronics_items: 1,
      shipping_packages: 5
    });

    assert.strictEqual(result.co2_purchases, 117.5);
    assert.strictEqual(result.co2_total, 117.5);
  });

  await t.test('calculates full footprint correctly when all categories are filled', () => {
    const result = calculateCarbonFootprint({
      car_miles: 150, // 27 kg
      electricity_kwh: 200, // 80 kg
      meat_meals: 10, // 10 * 2.5 * 4.33 = 108.25 kg
      waste_kg: 30, // 15 kg
      water_liters: 5000, // 1.5 kg
      clothing_items: 2 // 20 kg
      // Total = 27 + 80 + 108.25 + 15 + 1.5 + 20 = 251.75 -> round to 251.8 kg
    });

    assert.strictEqual(result.co2_transport, 27);
    assert.strictEqual(result.co2_energy, 80);
    assert.strictEqual(result.co2_diet, 108.3);
    assert.strictEqual(result.co2_waste, 15);
    assert.strictEqual(result.co2_water, 1.5);
    assert.strictEqual(result.co2_purchases, 20);
    assert.strictEqual(result.co2_total, 251.8);
  });
});
