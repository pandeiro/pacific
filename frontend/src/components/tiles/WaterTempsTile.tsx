import { useWaterTemp } from '../../hooks/useWaterTemp';
import './WaterTempsTile.css';

interface WaterTempsTileProps {
  locationId: number;
}

export function WaterTempsTile({ locationId }: WaterTempsTileProps) {
  const { data, isLoading, error } = useWaterTemp(locationId);

  if (isLoading) {
    return (
      <div className="tile water-temps" data-testid="water-temps-tile">
        <div className="tile__header">
          <div className="tile__title">
            <span className="tile__title-icon">🌡️</span>
            Water Temp
          </div>
        </div>
        <div className="tile__content" data-testid="tile-loading">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="tile water-temps tile--error" data-testid="water-temps-tile">
        <div className="tile__header">
          <div className="tile__title">
            <span className="tile__title-icon">🌡️</span>
            Water Temp
          </div>
        </div>
        <div className="tile__content" data-testid="tile-error">
          <div className="error-state">Data unavailable</div>
        </div>
      </div>
    );
  }

  const { current_temp_f, current_temp_c, history, source } = data;

  // Generate sparkline data from history (show last 48 points max for visual clarity)
  const sparklineData = history.slice(0, 48).reverse();
  const maxTemp = Math.max(...sparklineData.map(d => d.temperature_f));
  const minTemp = Math.min(...sparklineData.map(d => d.temperature_f));
  const tempRange = maxTemp - minTemp || 1;

  // Format source name nicely
  const formatSource = (src: string | null) => {
    if (!src) return '';
    if (src.startsWith('noaa_')) {
      return `NOAA ${src.replace('noaa_', '')}`;
    }
    return src;
  };

  return (
    <div className="tile water-temps" data-testid="water-temps-tile">
      <div className="tile__header">
        <div className="tile__title">
          <span className="tile__title-icon">🌡️</span>
          Water Temp
        </div>
      </div>
      
      <div className="tile__content">
        <div className="water-temps__display">
          {current_temp_f ? (
            <>
              <div className="water-temps__current">
                <span className="water-temps__value">{Math.round(current_temp_f)}</span>
                <span className="water-temps__unit">°F</span>
              </div>
              {current_temp_c && (
                <div className="water-temps__secondary">
                  {Math.round(current_temp_c)}°C
                </div>
              )}
            </>
          ) : (
            <div className="water-temps__no-data">No data</div>
          )}
        </div>

        {sparklineData.length > 0 && (
          <div className="water-temps__sparkline">
            {sparklineData.map((reading, i) => {
              const height = ((reading.temperature_f - minTemp) / tempRange) * 100;
              return (
                <div
                  key={i}
                  className="water-temps__sparkline-bar"
                  style={{ height: `${Math.max(height, 10)}%` }}
                  title={`${reading.temperature_f.toFixed(1)}°F at ${new Date(reading.timestamp).toLocaleString()}`}
                />
              );
            })}
          </div>
        )}

        {source && (
          <div className="water-temps__source">
            {formatSource(source)}
          </div>
        )}
      </div>
    </div>
  );
}
