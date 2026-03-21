import { useState, useEffect, useCallback } from 'react';
import type { SightingsResponse } from '../types';
import { API_URL } from '../config';

interface UseWildlifeReturn {
  sightings: SightingsResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const POLL_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function useWildlife(
  days: number = 7,
  limit: number = 200,
  quality: string = 'high,medium'
): UseWildlifeReturn {
  const [sightings, setSightings] = useState<SightingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        days: String(days),
        limit: String(limit),
        quality,
      });

      const response = await fetch(`${API_URL}/api/sightings?${params}`);

      if (!response.ok) {
        throw new Error(`Sightings API error: ${response.status}`);
      }

      const data = await response.json();
      setSightings(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [days, limit, quality]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchData]);

  return { sightings, isLoading, error, refetch: fetchData };
}
