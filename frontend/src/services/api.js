/**
 * @fileoverview Centralised API service for TerraSense.
 * All fetch calls go through this module — single source of truth for the backend URL.
 * GET endpoints use a simple 5-minute in-memory cache to reduce redundant requests.
 */

const API_URL = import.meta.env.VITE_API_URL + '/api';

/** Simple in-memory cache: endpoint → { data, fetchedAt } */
const _cache = new Map();

/** Cache time-to-live in milliseconds (5 minutes). */
const CACHE_TTL_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

/**
 * Build HTTP headers, injecting the Authorization Bearer token when available.
 *
 * @returns {Object} Headers object for use with fetch().
 */
function buildHeaders() {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Parse a fetch Response, throwing a descriptive Error on non-2xx status.
 *
 * @param {Response} response - The raw fetch Response object.
 * @returns {Promise<Object>} Parsed JSON body.
 * @throws {Error} When the response status indicates failure.
 */
async function parseResponse(response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

/**
 * Retrieve a cached result if it is still within the TTL window.
 *
 * @param {string} cacheKey - Unique string key for this cached value.
 * @returns {*|null} Cached data, or null if absent / expired.
 */
function getCached(cacheKey) {
  const entry = _cache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    _cache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

/**
 * Store a value in the in-memory cache.
 *
 * @param {string} cacheKey - Unique string key for this cached value.
 * @param {*}      data     - The value to cache.
 */
function setCache(cacheKey, data) {
  _cache.set(cacheKey, { data, fetchedAt: Date.now() });
}

/** Invalidate all cached GET responses (called after mutations). */
function invalidateCache() {
  _cache.clear();
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

const api = {
  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  /**
   * Register a new user account.
   *
   * @param {string}   name             - Display name.
   * @param {string}   email            - Email address.
   * @param {string}   password         - Plain-text password (min 6 chars).
   * @param {string}   [location]       - Optional location string.
   * @param {number}   [reductionTarget] - CO2 reduction goal percentage.
   * @param {string[]} [interests]      - Sustainability interest tags.
   * @returns {Promise<{token: string, user: Object}>}
   */
  async register(name, email, password, location, reductionTarget, interests) {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ name, email, password, location, reduction_target: reductionTarget, interests })
    });
    const data = await parseResponse(response);
    if (data.token) localStorage.setItem('token', data.token);
    invalidateCache();
    return data;
  },

  /**
   * Authenticate with email and password, receive a JWT token.
   *
   * @param {string} email    - Registered email address.
   * @param {string} password - Account password.
   * @returns {Promise<{token: string, user: Object}>}
   */
  async login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ email, password })
    });
    const data = await parseResponse(response);
    if (data.token) localStorage.setItem('token', data.token);
    invalidateCache();
    return data;
  },

  /**
   * Fetch the currently authenticated user's profile.
   *
   * @returns {Promise<Object>} User profile object.
   */
  async getMe() {
    const cached = getCached('getMe');
    if (cached) return cached;
    const response = await fetch(`${API_URL}/auth/me`, { method: 'GET', headers: buildHeaders() });
    const data = await parseResponse(response);
    setCache('getMe', data);
    return data;
  },

  /**
   * Update the authenticated user's profile settings.
   *
   * @param {Object} profileData - Fields to update (name, location, etc.).
   * @returns {Promise<Object>} Updated user profile.
   */
  async updateProfile(profileData) {
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(profileData)
    });
    const data = await parseResponse(response);
    invalidateCache();
    return data;
  },

  /**
   * Remove the stored JWT token (client-side logout).
   */
  logout() {
    localStorage.removeItem('token');
    invalidateCache();
  },

  // -------------------------------------------------------------------------
  // Calculations
  // -------------------------------------------------------------------------

  /**
   * Submit a new monthly carbon footprint calculation.
   *
   * @param {Object} calculationData - Input values for all emission categories.
   * @returns {Promise<Object>} Saved calculation with CO2 values and any new badges.
   */
  async submitCalculation(calculationData) {
    const response = await fetch(`${API_URL}/calculations`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(calculationData)
    });
    const data = await parseResponse(response);
    invalidateCache();
    return data;
  },

  /**
   * Retrieve the user's full calculation history, newest first.
   *
   * @returns {Promise<Array<Object>>} Array of calculation records.
   */
  async getHistory() {
    const cached = getCached('getHistory');
    if (cached) return cached;
    const response = await fetch(`${API_URL}/calculations/history`, { method: 'GET', headers: buildHeaders() });
    const data = await parseResponse(response);
    setCache('getHistory', data);
    return data;
  },

  /**
   * Retrieve the emissions summary, trend, prediction, and national comparisons.
   *
   * @returns {Promise<Object>} Summary object with hasData, latest, trend, etc.
   */
  async getSummary() {
    const cached = getCached('getSummary');
    if (cached) return cached;
    const response = await fetch(`${API_URL}/calculations/summary`, { method: 'GET', headers: buildHeaders() });
    const data = await parseResponse(response);
    setCache('getSummary', data);
    return data;
  },

  // -------------------------------------------------------------------------
  // Recommendations
  // -------------------------------------------------------------------------

  /**
   * Retrieve personalised reduction tips based on the user's emission profile.
   *
   * @returns {Promise<Array<Object>>} Array of tip objects with adoption status.
   */
  async getRecommendations() {
    const cached = getCached('getRecommendations');
    if (cached) return cached;
    const response = await fetch(`${API_URL}/recommendations`, { method: 'GET', headers: buildHeaders() });
    const data = await parseResponse(response);
    setCache('getRecommendations', data);
    return data;
  },

  /**
   * Update the adoption status of a recommendation tip.
   *
   * @param {string} tipId  - The tip's unique identifier.
   * @param {string} status - One of 'in_progress', 'adopted', or 'none'.
   * @returns {Promise<Object>} Updated status and points earned.
   */
  async adoptTip(tipId, status) {
    const response = await fetch(`${API_URL}/recommendations/adopt`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ tip_id: tipId, status })
    });
    const data = await parseResponse(response);
    invalidateCache();
    return data;
  },

  // -------------------------------------------------------------------------
  // Leaderboard
  // -------------------------------------------------------------------------

  /**
   * Retrieve the global leaderboard ranked by reduction % then points.
   *
   * @returns {Promise<Array<Object>>} Ranked array of user entries.
   */
  async getLeaderboard() {
    const cached = getCached('getLeaderboard');
    if (cached) return cached;
    const response = await fetch(`${API_URL}/leaderboard`, { method: 'GET', headers: buildHeaders() });
    const data = await parseResponse(response);
    setCache('getLeaderboard', data);
    return data;
  },

  /**
   * Retrieve the authenticated user's badge unlock status.
   *
   * @returns {Promise<Array<Object>>} All badges with unlocked flag and awarded_at date.
   */
  async getBadges() {
    const response = await fetch(`${API_URL}/leaderboard/badges`, { method: 'GET', headers: buildHeaders() });
    return parseResponse(response);
  },

  // -------------------------------------------------------------------------
  // Educational
  // -------------------------------------------------------------------------

  /**
   * Retrieve all educational articles with the user's read status.
   *
   * @returns {Promise<Array<Object>>} Articles with a `read` boolean attached.
   */
  async getArticles() {
    const cached = getCached('getArticles');
    if (cached) return cached;
    const response = await fetch(`${API_URL}/educational`, { method: 'GET', headers: buildHeaders() });
    const data = await parseResponse(response);
    setCache('getArticles', data);
    return data;
  },

  /**
   * Mark an educational article as read and earn points (once per article).
   *
   * @param {string} articleId - The article's unique identifier.
   * @returns {Promise<Object>} Confirmation with points earned.
   */
  async readArticle(articleId) {
    const response = await fetch(`${API_URL}/educational/read`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ article_id: articleId })
    });
    const data = await parseResponse(response);
    invalidateCache();
    return data;
  }
};

export default api;
