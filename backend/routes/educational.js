const express = require('express');
const router = express.Router();
const db = require('../models/database');
const auth = require('../middleware/auth');

// @route   GET api/educational
// @desc    Get all educational articles with user read statuses
// @access  Private
router.get('/', auth, (req, res) => {
  db.all('SELECT * FROM articles', [], (err, articles) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed' });
    }

    db.all('SELECT article_id FROM read_articles WHERE user_id = ?', [req.user.id], (err, readRows) => {
      if (err) {
        return res.status(500).json({ error: 'Database query failed' });
      }

      const readSet = new Set(readRows.map(r => r.article_id));

      const formatted = articles.map(art => ({
        ...art,
        read: readSet.has(art.id)
      }));

      res.json(formatted);
    });
  });
});

// @route   POST api/educational/read
// @desc    Mark an article as read by user
// @access  Private
router.post('/read', auth, (req, res) => {
  const { article_id } = req.body;

  if (!article_id) {
    return res.status(400).json({ error: 'Article ID is required' });
  }

  // Check if already marked as read
  db.get('SELECT id FROM read_articles WHERE user_id = ? AND article_id = ?', [req.user.id, article_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (row) {
      return res.json({ message: 'Article already read', article_id, pointsEarned: 0 });
    }

    // Insert read record
    db.run('INSERT INTO read_articles (user_id, article_id) VALUES (?, ?)', [req.user.id, article_id], function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database save failed: ' + err.message });
      }

      // Award 25 points for reading an article
      db.run('UPDATE users SET points = points + 25 WHERE id = ?', [req.user.id], (err) => {
        if (err) console.error('Failed to award read points:', err.message);
        
        res.json({
          message: 'Article marked as read! +25 points earned.',
          article_id,
          pointsEarned: 25
        });
      });
    });
  });
});

module.exports = router;
