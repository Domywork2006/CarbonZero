/**
 * @fileoverview Promise-based wrappers around the sqlite3 db instance.
 * Converts callback-style db.get / db.run / db.all into async/await-friendly
 * functions so route handlers can use linear, readable control flow.
 */

'use strict';

const db = require('../models/database');

/**
 * Run a SELECT query expected to return at most one row.
 *
 * @param {string}  sql    - Parameterised SQL statement.
 * @param {Array}   [params=[]] - Bound parameter values.
 * @returns {Promise<Object|undefined>} Resolves with the row or undefined.
 * @throws {Error} Rejects on database error.
 */
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Run a mutating statement (INSERT, UPDATE, DELETE).
 *
 * @param {string} sql    - Parameterised SQL statement.
 * @param {Array}  [params=[]] - Bound parameter values.
 * @returns {Promise<{lastID: number, changes: number}>}
 *   Resolves with the sqlite3 Statement context (lastID + changes).
 * @throws {Error} Rejects on database error.
 */
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      // `this` is the sqlite3 Statement context — provides lastID and changes
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Run a SELECT query that may return multiple rows.
 *
 * @param {string} sql    - Parameterised SQL statement.
 * @param {Array}  [params=[]] - Bound parameter values.
 * @returns {Promise<Array<Object>>} Resolves with an array of rows (may be empty).
 * @throws {Error} Rejects on database error.
 */
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

module.exports = { dbGet, dbRun, dbAll };
