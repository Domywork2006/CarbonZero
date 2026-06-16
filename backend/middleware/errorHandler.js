/**
 * @fileoverview Centralised error handling for the TerraSense Express API.
 *
 * Exports:
 *   - AppError      — Custom error class with HTTP status code
 *   - asyncHandler  — Wraps async route handlers so unhandled rejections reach
 *                     the error middleware instead of crashing the process
 *   - errorMiddleware — Final Express error handler; returns consistent JSON
 */

'use strict';

/**
 * Application-level error with an associated HTTP status code.
 * Throw this inside route handlers for expected error conditions.
 *
 * @example
 * throw new AppError('User not found', 404);
 */
class AppError extends Error {
  /**
   * @param {string} message    - Human-readable error description.
   * @param {number} [statusCode=500] - HTTP status code to send to the client.
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Higher-order function that wraps an async Express route handler.
 * Any rejected promise or thrown error is forwarded to next(err) so
 * the centralised errorMiddleware can handle it uniformly.
 *
 * @param {Function} routeHandler - Async (req, res, next) => void function.
 * @returns {Function} Express-compatible route handler.
 *
 * @example
 * router.get('/example', asyncHandler(async (req, res) => {
 *   const data = await someAsyncOperation();
 *   res.json(data);
 * }));
 */
function asyncHandler(routeHandler) {
  return (req, res, next) => {
    Promise.resolve(routeHandler(req, res, next)).catch(next);
  };
}

/**
 * Express error-handling middleware. Must be registered LAST in index.js
 * (after all routes) with exactly four parameters for Express to recognise it.
 *
 * Returns a consistent JSON error envelope:
 * ```json
 * { "error": "Human-readable message" }
 * ```
 *
 * @param {Error}    err  - The error object caught by Express.
 * @param {Object}   req  - Express request.
 * @param {Object}   res  - Express response.
 * @param {Function} next - Express next middleware (unused but required).
 */
function errorMiddleware(err, req, res, next) { // eslint-disable-line no-unused-vars
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected server error occurred';

  // Structured log with timestamp for debugging
  const timestamp = new Date().toISOString();
  if (isDevelopment) {
    console.error(`[${timestamp}] ${statusCode} ${req.method} ${req.originalUrl} — ${message}`);
    if (err.stack) console.error(err.stack);
  } else {
    // In production only log 5xx server errors (not client 4xx mistakes)
    if (statusCode >= 500) {
      console.error(`[${timestamp}] SERVER ERROR ${statusCode} — ${message}`);
    }
  }

  res.status(statusCode).json({ error: message });
}

module.exports = { AppError, asyncHandler, errorMiddleware };
