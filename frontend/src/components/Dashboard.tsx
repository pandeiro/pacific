import { useState, useMemo } from 'react';
import './Dashboard.css';
import { MapTile } from './tiles/MapTile';
import { ActivityScoresTile } from './tiles/ActivityScoresTile';
import { LiveCamTile } from './tiles/LiveCamTile';
import { WaterTempsTile } from './tiles/WaterTempsTile';
import { WildlifeIntelTile } from './tiles/WildlifeIntelTile';
import { SunTile } from './tiles/SunTile';
import { TidesTile } from './tiles/TidesTile';
import { DriveTimesTile } from './tiles/DriveTimesTile';
import { SeasonalTimelineTile } from './tiles/SeasonalTimelineTile';
import { useLocations } from '../hooks/useLocations';

// Default to Santa Monica (closest to us)
const DEFAULT_LOCATION_ID = 3;

export function Dashboard() {
  const [locationId, setLocationId] = useState(DEFAULT_LOCATION_ID);
  const { locations } = useLocations();
  
  // Derive stationId from current location
  const stationId = useMemo(() => {
    const location = locations.find(loc => loc.id === locationId);
    return location?.noaa_station_id || '9410840'; // Fallback to Santa Monica
  }, [locations, locationId]);
  
  return (
    <div className="dashboard">
      <div className="dashboard__main">
        <div className="dashboard__map">
          <MapTile />
        </div>
        
        <div className="dashboard__center">
          <ActivityScoresTile />
          <LiveCamTile />
          <DriveTimesTile />
        </div>
        
        <div className="dashboard__right">
          <SunTile 
            locationId={locationId} 
            onLocationChange={setLocationId} 
          />
          <WaterTempsTile locationId={locationId} />
          <WildlifeIntelTile />
          <TidesTile 
            locationId={locationId} 
            stationId={stationId}
          />
        </div>
      </div>
      
      <div className="dashboard__timeline">
        <SeasonalTimelineTile />
      </div>
    </div>
  );
}
