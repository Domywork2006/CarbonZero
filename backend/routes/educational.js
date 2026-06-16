'use strict';

/**
 * @fileoverview Educational content routes for TerraSense.
 * Returns articles with user read-status and marks articles as read.
 *
 * Refactored: nested callbacks → async/await, magic point value → POINTS_REWARDS constant.
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { dbGet, dbRun, dbAll } = require('../utils/db');
const { POINTS_REWARDS } = require('../utils/constants');

/**
 * @route  GET /api/educational
 * @desc   Return all educational articles with the user's read status attached.
 * @access Private
 */
router.get('/', auth, asyncHandler(async (req, res) => {
  // Fetch articles and user read history in parallel
  const [articles, readRows] = await Promise.all([
    dbAll('SELECT * FROM articles', []),
    dbAll('SELECT article_id FROM read_articles WHERE user_id = ?', [req.user.id])
  ]);

  const readArticleIds = new Set(readRows.map(row => row.article_id));

  const articlesWithReadStatus = articles.map(article => ({
    ...article,
    read: readArticleIds.has(article.id)
  }));

  res.json(articlesWithReadStatus);
}));

/**
 * @route  POST /api/educational/read
 * @desc   Mark an article as read and award points (once per article per user).
 * @access Private
 */
router.post('/read', auth, asyncHandler(async (req, res) => {
  const { article_id } = req.body;

  if (!article_id) throw new AppError('Article ID is required', 400);

  // Check if already read — idempotent (no duplicate points awarded)
  const existingReadRecord = await dbGet(
    'SELECT id FROM read_articles WHERE user_id = ? AND article_id = ?',
    [req.user.id, article_id]
  );

  if (existingReadRecord) {
    return res.json({ message: 'Article already read', article_id, pointsEarned: 0 });
  }

  // Persist read record
  await dbRun(
    'INSERT INTO read_articles (user_id, article_id) VALUES (?, ?)',
    [req.user.id, article_id]
  );

  // Award points for first read
  await dbRun(
    'UPDATE users SET points = points + ? WHERE id = ?',
    [POINTS_REWARDS.ARTICLE, req.user.id]
  );

  res.json({
    message: `Article marked as read! +${POINTS_REWARDS.ARTICLE} points earned.`,
    article_id,
    pointsEarned: POINTS_REWARDS.ARTICLE
  });
}));

module.exports = router;
