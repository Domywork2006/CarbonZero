import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * Manages authentication state for the application.
 * Encapsulates token persistence, user loading, login, logout, and profile refresh.
 *
 * @returns {{
 *   user: Object|null,
 *   token: string|null,
 *   loading: boolean,
 *   login: Function,
 *   logout: Function,
 *   updateUser: Function,
 *   refreshUser: Function
 * }}
 */
export function useAuth() {
  const [token,   setToken]   = useState(() => localStorage.getItem('token'));
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user profile whenever the token changes
  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const userData = await api.getMe();
        if (!cancelled) setUser(userData);
      } catch {
        if (!cancelled) {
          api.logout();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUser();
    return () => { cancelled = true; };
  }, [token]);

  /**
   * Called after a successful login or registration.
   * Sets the authenticated user and token in state.
   *
   * @param {Object} authenticatedUser - User object returned by the API.
   * @param {string} jwtToken          - JWT token string.
   */
  const login = useCallback((authenticatedUser, jwtToken) => {
    setToken(jwtToken);
    setUser(authenticatedUser);
  }, []);

  /**
   * Clears auth state and removes the token from localStorage.
   */
  const logout = useCallback(() => {
    api.logout();
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Merges a partial update into the current user state.
   * Used by the profile settings page after a successful update.
   *
   * @param {Partial<Object>} partialUser - Fields to merge into user state.
   */
  const updateUser = useCallback((partialUser) => {
    setUser(prev => ({ ...prev, ...partialUser }));
  }, []);

  /**
   * Refreshes the user profile from the API.
   * Used after actions that change points or streak.
   */
  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch {
      // Non-critical — silently fail (user stays logged in)
    }
  }, []);

  return { user, token, loading, login, logout, updateUser, refreshUser };
}
