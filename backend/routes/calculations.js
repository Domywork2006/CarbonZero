const express = require('express');
const router = express.Router();
const db = require('../models/database');
const auth = require('../middleware/auth');
const { calculateCarbonFootprint } = require('../utils/calculator');

// Helper to award badge if not already awarded
function awardBadge(userId, badgeKey, callback) {
  db.get('SELECT id FROM badges WHERE user_id = ? AND badge_key = ?', [userId, badgeKey], (err, row) => {
    if (err || row) {
      return callback(false); // Already awarded or error
    }
    db.run('INSERT INTO badges (user_id, badge_key) VALUES (?, ?)', [userId, badgeKey], function (err) {
      if (err) {
        return callback(false);
      }
      // Award points for earning a badge (500 points)
      db.run('UPDATE users SET points = points + 500 WHERE id = ?', [userId]);
      callback(true);
    });
  });
}

// @route   POST api/calculations
// @desc    Submit a new monthly carbon footprint calculation
// @access  Private
router.post('/', auth, (req, res) => {
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
    shipping_packages = 0,
    date // Optional, defaults to now
  } = req.body;

  // 1. Calculate CO2 equivalent values in kg
  const { 
    co2_transport, 
    co2_energy, 
    co2_diet, 
    co2_waste, 
    co2_water, 
    co2_purchases, 
    co2_total 
  } = calculateCarbonFootprint({
    car_miles, bus_miles, train_miles, flight_miles, bike_miles,
    electricity_kwh, gas_kwh, heating_kwh,
    veg_meals, meat_meals, vegan_meals,
    waste_kg, water_liters,
    clothing_items, electronics_items, shipping_packages
  });

  const calculationDate = date || new Date().toISOString().split('T')[0];

  // 2. Save calculation to database
  db.run(
    `INSERT INTO calculations (
      user_id, date, car_miles, bus_miles, train_miles, flight_miles, bike_miles,
      electricity_kwh, gas_kwh, heating_kwh, veg_meals, meat_meals, vegan_meals,
      waste_kg, water_liters, clothing_items, electronics_items, shipping_packages,
      co2_transport, co2_energy, co2_diet, co2_waste, co2_water, co2_purchases, co2_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id, calculationDate, car_miles, bus_miles, train_miles, flight_miles, bike_miles,
      electricity_kwh, gas_kwh, heating_kwh, veg_meals, meat_meals, vegan_meals,
      waste_kg, water_liters, clothing_items, electronics_items, shipping_packages,
      co2_transport, co2_energy, co2_diet, co2_waste, co2_water, co2_purchases, co2_total
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database save failed: ' + err.message });
      }

      const calculationId = this.lastID;

      // 3. Update User Streak and Last Calculated Date
      db.get('SELECT streak, last_calculated_date FROM users WHERE id = ?', [req.user.id], (err, userRow) => {
        let currentStreak = userRow ? userRow.streak : 0;
        let lastDateStr = userRow ? userRow.last_calculated_date : null;
        let nextStreak = 1;

        if (lastDateStr) {
          const lastDate = new Date(lastDateStr);
          const currentDate = new Date(calculationDate);
          const diffTime = Math.abs(currentDate - lastDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 35 && diffDays > 0) {
            nextStreak = currentStreak + 1;
          } else if (diffDays === 0) {
            nextStreak = currentStreak || 1; // Logged on same day, keep current
          } else {
            nextStreak = 1; // Streak broken
          }
        }

        db.run(
          'UPDATE users SET points = points + 50, streak = ?, last_calculated_date = ? WHERE id = ?',
          [nextStreak, calculationDate, req.user.id],
          (err) => {
            if (err) console.error('Failed to update user points and streak:', err.message);
          }
        );
      });

      // 4. Badge checks
      const newlyAwardedBadges = [];

      db.all('SELECT co2_total, date FROM calculations WHERE user_id = ? ORDER BY date ASC', [req.user.id], (err, rows) => {
        if (err || !rows || rows.length === 0) {
          return res.status(201).json({
            id: calculationId,
            co2_transport,
            co2_energy,
            co2_diet,
            co2_waste,
            co2_water,
            co2_purchases,
            co2_total,
            newlyAwardedBadges
          });
        }

        awardBadge(req.user.id, 'first_step', (awarded) => {
          if (awarded) newlyAwardedBadges.push('first_step');

          if (rows.length > 1) {
            const baseline = rows[0].co2_total;
            const current = co2_total;
            const reductionPercent = ((baseline - current) / baseline) * 100;

            if (reductionPercent >= 50) {
              awardBadge(req.user.id, 'green_guardian', (awardedGG) => {
                if (awardedGG) newlyAwardedBadges.push('green_guardian');

                if (reductionPercent >= 75) {
                  awardBadge(req.user.id, 'sustainability_champion', (awardedSC) => {
                    if (awardedSC) newlyAwardedBadges.push('sustainability_champion');
                    respond();
                  });
                } else {
                  respond();
                }
              });
            } else {
              respond();
            }
          } else {
            respond();
          }
        });

        function respond() {
          res.status(201).json({
            id: calculationId,
            date: calculationDate,
            co2_transport,
            co2_energy,
            co2_diet,
            co2_waste,
            co2_water,
            co2_purchases,
            co2_total,
            newlyAwardedBadges
          });
        }
      });
    }
  );
});

// @route   GET api/calculations/history
// @desc    Get all calculations for a user
// @access  Private
router.get('/history', auth, (req, res) => {
  db.all('SELECT * FROM calculations WHERE user_id = ? ORDER BY date DESC', [req.user.id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed' });
    }
    
    const formatted = rows.map(r => ({
      ...r,
      co2_transport: Math.round(r.co2_transport * 10) / 10,
      co2_energy: Math.round(r.co2_energy * 10) / 10,
      co2_diet: Math.round(r.co2_diet * 10) / 10,
      co2_waste: Math.round(r.co2_waste * 10) / 10,
      co2_water: Math.round(r.co2_water * 100) / 100,
      co2_purchases: Math.round(r.co2_purchases * 10) / 10,
      co2_total: Math.round(r.co2_total * 10) / 10
    }));

    res.json(formatted);
  });
});

// @route   GET api/calculations/summary
// @desc    Get emissions summary, trend, prediction, and national comparisons
// @access  Private
router.get('/summary', auth, (req, res) => {
  db.all('SELECT * FROM calculations WHERE user_id = ? ORDER BY date ASC', [req.user.id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (rows.length === 0) {
      return res.json({
        hasData: false,
        message: 'No calculation data available yet.'
      });
    }

    // Get current calculation (latest by date)
    const latest = rows[rows.length - 1];
    
    // Baseline is the earliest calculation
    const baseline = rows[0];

    // Calculate reduction vs baseline
    let reductionPercent = 0;
    if (baseline.co2_total > 0) {
      reductionPercent = ((baseline.co2_total - latest.co2_total) / baseline.co2_total) * 100;
    }

    // Score Dial (0-100 rating)
    const score = Math.max(0, Math.min(100, Math.round(100 - (latest.co2_total / 25))));

    // Category breakdown
    const categories = {
      transport: Math.round(latest.co2_transport * 10) / 10,
      energy: Math.round(latest.co2_energy * 10) / 10,
      diet: Math.round(latest.co2_diet * 10) / 10,
      waste: Math.round((latest.co2_waste || 0) * 10) / 10,
      water: Math.round((latest.co2_water || 0) * 100) / 100,
      purchases: Math.round(latest.co2_purchases * 10) / 10
    };

    // 90-day trend entries
    const trend = rows.slice(-6).map(r => ({
      date: r.date,
      total: Math.round(r.co2_total * 10) / 10,
      transport: Math.round(r.co2_transport * 10) / 10,
      energy: Math.round(r.co2_energy * 10) / 10,
      diet: Math.round(r.co2_diet * 10) / 10,
      waste: Math.round((r.co2_waste || 0) * 10) / 10,
      water: Math.round((r.co2_water || 0) * 100) / 100,
      purchases: Math.round(r.co2_purchases * 10) / 10
    }));

    // Footprint prediction based on historical usage (Linear projection)
    let predictedNextMonth = Math.round(latest.co2_total * 0.95 * 10) / 10; // Default: assuming 5% reduction goal
    
    if (rows.length >= 2) {
      const secondLatest = rows[rows.length - 2];
      const diff = latest.co2_total - secondLatest.co2_total;
      predictedNextMonth = Math.max(0, Math.round((latest.co2_total + diff) * 10) / 10);
    }

    // National average comparison data (monthly kg CO2e)
    const nationalAverages = {
      US: 1333,
      UK: 708,
      India: 183,
      global: 400
    };

    res.json({
      hasData: true,
      latest: {
        date: latest.date,
        total: Math.round(latest.co2_total * 10) / 10,
        categories
      },
      baseline: {
        date: baseline.date,
        total: Math.round(baseline.co2_total * 10) / 10
      },
      reductionPercent: Math.round(reductionPercent * 10) / 10,
      score,
      trend,
      prediction: {
        predictedNextMonth,
        status: predictedNextMonth < latest.co2_total ? 'decreasing' : 'increasing'
      },
      nationalAverages
    });
  });
});

module.exports = router;
