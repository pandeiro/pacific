import { useSun } from '../../hooks/useSun';
import { useLocations } from '../../hooks/useLocations';
import './SunTile.css';

interface SunTileProps {
  locationId: number;
  onLocationChange: (locationId: number) => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles'
  }).toLowerCase();
}

export function SunTile({ locationId, onLocationChange }: SunTileProps) {
  const { sun, isLoading, error } = useSun(locationId);
  const { locations, isLoading: locationsLoading } = useLocations();
  
  // Filter to locations that have sun data (for now, all coastal locations)
  // In the future, this could check for actual sun data availability
  const availableLocations = locations.filter(loc => 
    ['dana_point', 'la_jolla', 'santa_monica', 'santa_barbara', 'morro_bay', 'shaws_cove', 'zuma_beach'].includes(loc.slug)
  );
  
  if (isLoading || locationsLoading) {
    return (
      <div className="tile sun-tile" data-testid="sun-tile">
        <div className="tile__header">
          <div className="tile__title">
            <span className="tile__title-icon">☀️</span>
            Sun
          </div>
        </div>
        <div className="tile__content" data-testid="tile-loading">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="tile sun-tile tile--error" data-testid="sun-tile">
        <div className="tile__header">
          <div className="tile__title">
            <span className="tile__title-icon">☀️</span>
            Sun
          </div>
        </div>
        <div className="tile__content" data-testid="tile-error">
          <div className="error-state">Sun data unavailable</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="tile sun-tile" data-testid="sun-tile">
      <div className="tile__header">
        <div className="tile__title">
          <span className="tile__title-icon">☀️</span>
          Sun
        </div>
        <select 
          className="sun-tile__location-select"
          value={locationId}
          onChange={(e) => onLocationChange(Number(e.target.value))}
        >
          {availableLocations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>
      
      <div className="tile__content">
        {sun ? (
          <div className="sun-tile__info">
            <div className="sun-tile__item" data-testid="sunrise">
              <span className="sun-tile__icon">🌅</span>
              <span className="sun-tile__label">Rise</span>
              <span className="sun-tile__time">{formatTime(sun.sunrise)}</span>
            </div>
            <div className="sun-tile__item" data-testid="sunset">
              <span className="sun-tile__icon">🌇</span>
              <span className="sun-tile__label">Set</span>
              <span className="sun-tile__time">{formatTime(sun.sunset)}</span>
            </div>
          </div>
        ) : (
          <div className="sun-tile__no-data">No sun data available</div>
        )}
      </div>
    </div>
  );
}
