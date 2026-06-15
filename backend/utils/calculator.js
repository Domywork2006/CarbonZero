/**
 * Calculate carbon emissions in kg CO2e based on monthly inputs for TerraSense
 * @param {Object} inputs 
 * @returns {Object} CO2 equivalent values per category and total
 */
function calculateCarbonFootprint(inputs) {
  const {
    car_miles = 0,
    bus_miles = 0,
    train_miles = 0,
    flight_miles = 0,
    bike_miles = 0,
    electricity_kwh = 0,
    gas_kwh = 0,
    heating_kwh = 0,
    veg_meals = 0,
    meat_meals = 0,
    vegan_meals = 0,
    waste_kg = 0,
    water_liters = 0,
    clothing_items = 0,
    electronics_items = 0,
    shipping_packages = 0
  } = inputs;

  // 1. Transportation
  const co2_transport = 
    (parseFloat(car_miles) * 0.18) + 
    (parseFloat(bus_miles) * 0.08) + 
    (parseFloat(train_miles) * 0.04) + 
    (parseFloat(flight_miles) * 0.20) + 
    (parseFloat(bike_miles) * 0.00);

  // 2. Home Energy
  const co2_energy = 
    (parseFloat(electricity_kwh) * 0.40) + 
    (parseFloat(gas_kwh) * 0.20) + 
    (parseFloat(heating_kwh) * 0.25);

  // 3. Diet (Scale weekly meals to monthly using 4.33 average weeks/month)
  const co2_diet = 
    ((parseFloat(veg_meals) * 0.6) + 
     (parseFloat(meat_meals) * 2.5) + 
     (parseFloat(vegan_meals) * 0.3)) * 4.33;

  // 4. Waste (0.5 kg CO2e per kg)
  const co2_waste = parseFloat(waste_kg) * 0.5;

  // 5. Water (0.0003 kg CO2e per liter)
  const co2_water = parseFloat(water_liters) * 0.0003;

  // 6. Purchases
  const co2_purchases = 
    (parseInt(clothing_items) * 10.0) + 
    (parseInt(electronics_items) * 80.0) + 
    (parseInt(shipping_packages) * 1.5);

  const co2_total = co2_transport + co2_energy + co2_diet + co2_waste + co2_water + co2_purchases;

  return {
    co2_transport: Math.round(co2_transport * 10) / 10,
    co2_energy: Math.round(co2_energy * 10) / 10,
    co2_diet: Math.round(co2_diet * 10) / 10,
    co2_waste: Math.round(co2_waste * 10) / 10,
    co2_water: Math.round(co2_water * 100) / 100, // Keep decimal precision for small water impacts
    co2_purchases: Math.round(co2_purchases * 10) / 10,
    co2_total: Math.round(co2_total * 10) / 10
  };
}

module.exports = {
  calculateCarbonFootprint
};
