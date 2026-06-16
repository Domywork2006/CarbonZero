import { useState, useEffect, useCallback, useRef } from 'react';

/** Cache TTL in milliseconds (5 minutes). */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Generic data-fetching hook with a simple 5-minute in-memory cache.
 * Prevents redundant API calls when the user navigates between tabs quickly.
 *
 * @template T
 * @param {Function} apiFn   - Async function that returns the data (e.g. `api.getSummary`).
 * @param {Array}    [deps=[]] - Dependency array — re-fetches when any dep changes.
 * @returns {{ data: T|null, loading: boolean, error: string|null, refetch: Function }}
 */
export function useApi(apiFn, deps = []) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const cacheRef     = useRef({ data: null, fetchedAt: 0 });
  const controllerRef = useRef(null);

  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();
    const isFresh = now - cacheRef.current.fetchedAt < CACHE_TTL_MS;

    // Return cached data if still fresh and not forced
    if (!force && isFresh && cacheRef.current.data !== null) {
      setData(cacheRef.current.data);
      setLoading(false);
      return;
    }

    // Abort previous in-flight request
    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await apiFn();
      cacheRef.current = { data: result, fetchedAt: Date.now() };
      setData(result);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetchData();
    return () => { if (controllerRef.current) controllerRef.current.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  /** Force a fresh fetch, bypassing cache. */
  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, error, refetch };
}
