import { useState, useEffect, useCallback } from 'react';
import type { VisibilityResponse } from '../types';
import { API_URL } from '../config';

interface UseVisibilityReturn {
  data: VisibilityResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useVisibility(locationId: number): UseVisibilityReturn {
  const [data, setData] = useState<VisibilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(
        `${API_URL}/api/conditions/visibility?location_id=${locationId}`
      );
      
      if (!res.ok) {
        throw new Error(`Visibility API error: ${res.status}`);
      }
      
      const visibilityData = await res.json();
      setData(visibilityData);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}