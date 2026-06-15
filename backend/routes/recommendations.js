const express = require('express');
const router = express.Router();
const db = require('../models/database');
const auth = require('../middleware/auth');

// Master tips database
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
    description: 'Avoid manufacturing emissions—which make up 80% of a smart device’s lifecycle footprint—by replacing batteries or screens.'
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

// @route   GET api/recommendations
// @desc    Get user-specific carbon reduction tips based on highest categories
// @access  Private
router.get('/', auth, (req, res) => {
  // 1. Get latest calculation
  db.get('SELECT * FROM calculations WHERE user_id = ? ORDER BY date DESC LIMIT 1', [req.user.id], (err, calc) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed' });
    }

    // Default sorting if no calculations exist yet
    let categoriesSorted = ['Energy', 'Transport', 'Diet', 'Purchases'];

    if (calc) {
      const catScores = [
        { name: 'Transport', val: calc.co2_transport },
        { name: 'Energy', val: calc.co2_energy },
        { name: 'Diet', val: calc.co2_diet },
        { name: 'Purchases', val: calc.co2_purchases }
      ];
      // Sort descending by emission values
      catScores.sort((a, b) => b.val - a.val);
      categoriesSorted = catScores.map(c => c.name);
    }

    // 2. Fetch user's adopted tips status
    db.all('SELECT tip_id, status FROM adopted_tips WHERE user_id = ?', [req.user.id], (err, adoptedRows) => {
      if (err) {
        return res.status(500).json({ error: 'Database query failed' });
      }

      const statusMap = {};
      adoptedRows.forEach(row => {
        statusMap[row.tip_id] = row.status;
      });

      // 3. Filter and select tips:
      // We will select:
      // - 3 tips from the highest-impact category
      // - 2 tips from the second-highest-impact category
      // - 1 tip from each other category
      // ensuring we provide a total of 7 personalized tips.
      const selectedTips = [];
      const primaryCat = categoriesSorted[0];
      const secondaryCat = categoriesSorted[1];
      const tertiaryCat = categoriesSorted[2];
      const quaternaryCat = categoriesSorted[3];

      const getTipsForCat = (cat, limit) => {
        return ALL_TIPS.filter(t => t.category === cat).slice(0, limit);
      };

      selectedTips.push(...getTipsForCat(primaryCat, 3));
      selectedTips.push(...getTipsForCat(secondaryCat, 2));
      selectedTips.push(...getTipsForCat(tertiaryCat, 1));
      selectedTips.push(...getTipsForCat(quaternaryCat, 1));

      // Map with current user status
      const formattedTips = selectedTips.map(tip => ({
        ...tip,
        status: statusMap[tip.id] || 'none' // 'none', 'in_progress', 'adopted'
      }));

      res.json(formattedTips);
    });
  });
});

// @route   POST api/recommendations/adopt
// @desc    Adopt or mark a reduction tip in progress
// @access  Private
router.post('/adopt', auth, (req, res) => {
  const { tip_id, status } = req.body;

  if (!tip_id || !['in_progress', 'adopted', 'none'].includes(status)) {
    return res.status(400).json({ error: 'Invalid tip_id or status value' });
  }

  // Find tip to see details (e.g. savings)
  const tip = ALL_TIPS.find(t => t.id === tip_id);
  if (!tip) {
    return res.status(404).json({ error: 'Tip not found' });
  }

  // Check if tip has already been marked as adopted
  db.get('SELECT status FROM adopted_tips WHERE user_id = ? AND tip_id = ?', [req.user.id, tip_id], (err, existingRow) => {
    if (err) {
      return res.status(500).json({ error: 'Database check failed' });
    }

    if (status === 'none') {
      // Remove adoption status
      db.run('DELETE FROM adopted_tips WHERE user_id = ? AND tip_id = ?', [req.user.id, tip_id], function (err) {
        if (err) return res.status(500).json({ error: 'Database delete failed' });
        return res.json({ message: 'Tip status cleared', tip_id, status: 'none' });
      });
      return;
    }

    const alreadyAdopted = existingRow && existingRow.status === 'adopted';

    // Update or Insert tip status
    db.run(
      `INSERT INTO adopted_tips (user_id, tip_id, status) VALUES (?, ?, ?)
       ON CONFLICT(user_id, tip_id) DO UPDATE SET status=excluded.status`,
      [req.user.id, tip_id, status],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database save failed: ' + err.message });
        }

        // If status is changed to 'adopted' and it wasn't adopted before, award 100 points!
        if (status === 'adopted' && !alreadyAdopted) {
          db.run('UPDATE users SET points = points + 100 WHERE id = ?', [req.user.id], (err) => {
            if (err) console.error('Failed to award adoption points:', err.message);
            res.json({
              message: 'Tip successfully adopted! +100 Points earned!',
              tip_id,
              status,
              pointsEarned: 100
            });
          });
        } else {
          res.json({
            message: 'Tip status updated to ' + status,
            tip_id,
            status,
            pointsEarned: 0
          });
        }
      }
    );
  });
});

module.exports = router;
