const express = require('express');
const router = express.Router();
const db = require('../models/database');
const auth = require('../middleware/auth');

// Master badges catalog
const BADGES_CATALOG = {
  first_step: {
    key: 'first_step',
    name: 'First Step',
    description: 'Submitted your first carbon footprint calculation!',
    icon: 'Compass',
    color: '#3B82F6' // Blue
  },
  green_guardian: {
    key: 'green_guardian',
    name: 'Green Guardian',
    description: 'Reduced monthly carbon footprint by 50% or more compared to your baseline.',
    icon: 'Shield',
    color: '#10B981' // Green
  },
  sustainability_champion: {
    key: 'sustainability_champion',
    name: 'Sustainability Champion',
    description: 'Reduced monthly carbon footprint by 75% or more compared to your baseline.',
    icon: 'Award',
    color: '#8B5CF6' // Purple
  },
  eco_scholar: {
    key: 'eco_scholar',
    name: 'Eco Scholar',
    description: 'Read all available educational articles to expand your sustainability knowledge.',
    icon: 'BookOpen',
    color: '#F59E0B' // Amber
  },
  habit_changer: {
    key: 'habit_changer',
    name: 'Habit Changer',
    description: 'Adopted at least 3 reduction recommendations.',
    icon: 'Sparkles',
    color: '#EC4899' // Pink
  }
};

// @route   GET api/leaderboard
// @desc    Get global leaderboard ranked by reduction % and points
// @access  Public
router.get('/', (req, res) => {
  // Query all users and their calculations
  db.all('SELECT id, name, location, points FROM users', [], (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (users.length === 0) {
      return res.json([]);
    }

    // Query all calculations to determine reduction percentages
    db.all('SELECT user_id, co2_total, date FROM calculations ORDER BY date ASC', [], (err, calcs) => {
      if (err) {
        return res.status(500).json({ error: 'Database query failed' });
      }

      // Group calculations by user
      const userCalcsMap = {};
      calcs.forEach(c => {
        if (!userCalcsMap[c.user_id]) {
          userCalcsMap[c.user_id] = [];
        }
        userCalcsMap[c.user_id].push(c);
      });

      // Query all user badges
      db.all('SELECT user_id, badge_key FROM badges', [], (err, badges) => {
        if (err) {
          return res.status(500).json({ error: 'Database query failed' });
        }

        const userBadgesMap = {};
        badges.forEach(b => {
          if (!userBadgesMap[b.user_id]) {
            userBadgesMap[b.user_id] = [];
          }
          userBadgesMap[b.user_id].push(b.badge_key);
        });

        // Compute leaderboard scores
        const leaderboard = users.map(user => {
          const userCalcs = userCalcsMap[user.id] || [];
          let reductionPercent = 0;
          let currentCO2 = 0;

          if (userCalcs.length > 0) {
            const baseline = userCalcs[0].co2_total;
            const current = userCalcs[userCalcs.length - 1].co2_total;
            currentCO2 = Math.round(current * 10) / 10;
            
            if (userCalcs.length > 1 && baseline > 0) {
              reductionPercent = ((baseline - current) / baseline) * 100;
            }
          }

          return {
            id: user.id,
            name: user.name,
            location: user.location || 'Earth',
            points: user.points,
            currentCO2,
            reductionPercent: Math.round(reductionPercent * 10) / 10,
            badges: userBadgesMap[user.id] || []
          };
        });

        // Sort: 1) Reduction percentage (descending), 2) Points (descending)
        leaderboard.sort((a, b) => {
          if (b.reductionPercent !== a.reductionPercent) {
            return b.reductionPercent - a.reductionPercent;
          }
          return b.points - a.points;
        });

        // Add Rank
        const rankedLeaderboard = leaderboard.map((entry, index) => ({
          ...entry,
          rank: index + 1
        }));

        res.json(rankedLeaderboard);
      });
    });
  });
});

// @route   GET api/leaderboard/badges
// @desc    Get user unlocked and locked badges status
// @access  Private
router.get('/badges', auth, (req, res) => {
  // Check if Habit Changer or Eco Scholar badges should be awarded dynamically
  // 1. Check adopted tips count
  db.get('SELECT COUNT(*) as count FROM adopted_tips WHERE user_id = ? AND status = ?', [req.user.id, 'adopted'], (err, adoptedCountRow) => {
    if (err) return res.status(500).json({ error: 'Database check failed' });
    const adoptedCount = adoptedCountRow ? adoptedCountRow.count : 0;

    // 2. Check total articles read
    db.get('SELECT COUNT(*) as count FROM read_articles WHERE user_id = ?', [req.user.id], (err, readCountRow) => {
      if (err) return res.status(500).json({ error: 'Database check failed' });
      const readCount = readCountRow ? readCountRow.count : 0;

      // Check total articles in system
      db.get('SELECT COUNT(*) as count FROM articles', [], (err, totalArticlesRow) => {
        if (err) return res.status(500).json({ error: 'Database check failed' });
        const totalArticles = totalArticlesRow ? totalArticlesRow.count : 5;

        // Perform dynamic inserts if thresholds met
        const awardPromises = [];

        if (adoptedCount >= 3) {
          awardPromises.push(new Promise((resolve) => {
            db.get('SELECT id FROM badges WHERE user_id = ? AND badge_key = ?', [req.user.id, 'habit_changer'], (err, row) => {
              if (!row) {
                db.run('INSERT INTO badges (user_id, badge_key) VALUES (?, ?)', [req.user.id, 'habit_changer'], () => {
                  db.run('UPDATE users SET points = points + 500 WHERE id = ?', [req.user.id], () => resolve());
                });
              } else resolve();
            });
          }));
        }

        if (readCount >= totalArticles && totalArticles > 0) {
          awardPromises.push(new Promise((resolve) => {
            db.get('SELECT id FROM badges WHERE user_id = ? AND badge_key = ?', [req.user.id, 'eco_scholar'], (err, row) => {
              if (!row) {
                db.run('INSERT INTO badges (user_id, badge_key) VALUES (?, ?)', [req.user.id, 'eco_scholar'], () => {
                  db.run('UPDATE users SET points = points + 500 WHERE id = ?', [req.user.id], () => resolve());
                });
              } else resolve();
            });
          }));
        }

        // Wait for checks and queries, then respond
        Promise.all(awardPromises).then(() => {
          db.all('SELECT badge_key, awarded_at FROM badges WHERE user_id = ?', [req.user.id], (err, rows) => {
            if (err) {
              return res.status(500).json({ error: 'Database query failed' });
            }

            const unlockedMap = {};
            rows.forEach(r => {
              unlockedMap[r.badge_key] = r.awarded_at;
            });

            const badgesList = Object.keys(BADGES_CATALOG).map(key => ({
              ...BADGES_CATALOG[key],
              unlocked: !!unlockedMap[key],
              awarded_at: unlockedMap[key] || null
            }));

            res.json(badgesList);
          });
        });
      });
    });
  });
});

// @route   POST api/leaderboard/claim-challenge
// @desc    Claim points for completing the weekly challenge
// @access  Private
router.post('/claim-challenge', auth, (req, res) => {
  const { challenge_key } = req.body;
  const validKeys = ['reduce_10', 'no_plastic', 'public_transport', 'energy_saving'];

  if (!validKeys.includes(challenge_key)) {
    return res.status(400).json({ error: 'Invalid challenge key' });
  }

  if (challenge_key === 'reduce_10') {
    // Verify user's calculations show a 10% reduction
    db.all('SELECT co2_total, date FROM calculations WHERE user_id = ? ORDER BY date ASC', [req.user.id], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database query failed' });
      
      if (!rows || rows.length < 2) {
        return res.status(400).json({ error: 'You need at least 2 calculations to verify a 10% reduction vs baseline!' });
      }

      const baseline = rows[0].co2_total;
      const current = rows[rows.length - 1].co2_total;
      const reductionPercent = ((baseline - current) / baseline) * 100;

      if (reductionPercent < 10) {
        return res.status(400).json({ error: `Your current reduction is only ${Math.round(reductionPercent * 10)/10}%. You need at least 10% to claim points.` });
      }

      // Award 200 points
      db.run('UPDATE users SET points = points + 200 WHERE id = ?', [req.user.id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update user points' });
        
        res.json({
          message: 'Weekly challenge completed! +200 Points added to your account.',
          pointsEarned: 200
        });
      });
    });
  } else {
    // For behavior-based challenges, award 150 points directly
    const pointsAwarded = 150;
    db.run('UPDATE users SET points = points + ? WHERE id = ?', [pointsAwarded, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: 'Failed to update user points' });
      
      res.json({
        message: `Challenge claimed successfully! +${pointsAwarded} Points added to your account.`,
        pointsEarned: pointsAwarded
      });
    });
  }
});

module.exports = router;
