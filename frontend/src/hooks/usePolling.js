import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom polling hook that executes fetchFn every intervalMs (default 5000ms).
 * Returns { data, loading, error, refetch }.
 */
export function usePolling(fetchFn, intervalMs = 5000, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);
  const fetchFnRef = useRef(fetchFn);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const executeFetch = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setLoading(true);
      }
      try {
        const result = await fetchFnRef.current();
        if (isMounted.current) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err?.message || 'Failed to fetch data');
        }
      } finally {
        if (isMounted.current && isInitial) {
          setLoading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );

  useEffect(() => {
    isMounted.current = true;
    executeFetch(true);

    const timer = setInterval(() => {
      executeFetch(false);
    }, intervalMs);

    return () => {
      isMounted.current = false;
      clearInterval(timer);
    };
  }, [executeFetch, intervalMs]);

  const refetch = useCallback(() => {
    return executeFetch(false);
  }, [executeFetch]);

  return { data, loading, error, refetch };
}

export default usePolling;

