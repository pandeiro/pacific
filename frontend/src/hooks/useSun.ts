import { useState, useEffect, useCallback } from 'react';
import type { SunEventsResponse } from '../types';
import { API_URL } from '../config';

interface UseSunReturn {
  sun: SunEventsResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSun(locationId: number): UseSunReturn {
  const [sun, setSun] = useState<SunEventsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const sunRes = await fetch(`${API_URL}/api/sun?location_id=${locationId}`);
      
      if (sunRes.ok) {
        const sunData = await sunRes.json();
        setSun(sunData);
      } else {
        setSun(null);
      }
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { sun, isLoading, error, refetch: fetchData };
}
