import { useState } from 'react';
import './Dashboard.css';
import { MapTile } from './tiles/MapTile';
import { ActivityScoresTile } from './tiles/ActivityScoresTile';
import { LiveCamTile } from './tiles/LiveCamTile';
import { ConditionsTile } from './tiles/ConditionsTile';
import { WildlifeIntelTile } from './tiles/WildlifeIntelTile';
import { SunTile } from './tiles/SunTile';
import { TidesTile } from './tiles/TidesTile';
import { DriveTimesTile } from './tiles/DriveTimesTile';
import { SeasonalTimelineTile } from './tiles/SeasonalTimelineTile';

// Default to Santa Monica (closest to us)
const DEFAULT_LOCATION_ID = 3;
const DEFAULT_STATION_ID = '9410840';

export function Dashboard() {
  const [locationId, setLocationId] = useState(DEFAULT_LOCATION_ID);
  const [stationId, setStationId] = useState(DEFAULT_STATION_ID);
  
  const handleLocationChange = (newLocationId: number, newStationId?: string) => {
    setLocationId(newLocationId);
    if (newStationId) {
      setStationId(newStationId);
    }
  };
  
  return (
    <div className="dashboard">
      <div className="dashboard__main">
        <div className="dashboard__map">
          <MapTile />
        </div>
        
        <div className="dashboard__center">
          <ActivityScoresTile />
          <ConditionsTile />
          <DriveTimesTile />
        </div>
        
        <div className="dashboard__right">
          <SunTile 
            locationId={locationId} 
            onLocationChange={setLocationId} 
          />
          <LiveCamTile />
          <WildlifeIntelTile />
          <TidesTile 
            locationId={locationId} 
            stationId={stationId}
            onLocationChange={handleLocationChange}
          />
        </div>
      </div>
      
      <div className="dashboard__timeline">
        <SeasonalTimelineTile />
      </div>
    </div>
  );
}
