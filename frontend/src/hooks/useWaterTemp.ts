import { useState, useEffect, useCallback } from 'react';
import type { WaterTemperatureResponse } from '../types';
import { API_URL } from '../config';

interface UseWaterTempReturn {
  data: WaterTemperatureResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useWaterTemp(locationId: number): UseWaterTempReturn {
  const [data, setData] = useState<WaterTemperatureResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch 7 days (168 hours) of data
      const res = await fetch(
        `${API_URL}/api/conditions/water-temp?location_id=${locationId}&hours=168`
      );
      
      if (!res.ok) {
        throw new Error(`Water temp API error: ${res.status}`);
      }
      
      const waterTempData = await res.json();
      setData(waterTempData);
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
