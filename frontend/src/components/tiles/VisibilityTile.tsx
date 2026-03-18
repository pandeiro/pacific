import { useVisibility } from '../../hooks/useVisibility';
import './VisibilityTile.css';

interface VisibilityTileProps {
  locationId: number;
}

export function VisibilityTile({ locationId }: VisibilityTileProps) {
  const { data, isLoading, error } = useVisibility(locationId);

  if (isLoading) {
    return (
      <div className="tile visibility" data-testid="visibility-tile">
        <div className="tile__header">
          <div className="tile__title">Water Visibility</div>
        </div>
        <div className="tile__content" data-testid="tile-loading">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="tile visibility tile--error" data-testid="visibility-tile">
        <div className="tile__header">
          <div className="tile__title">Water Visibility</div>
        </div>
        <div className="tile__content" data-testid="tile-error">
          <div className="error-state">Data unavailable</div>
        </div>
      </div>
    );
  }

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Los_Angeles'
    });
  };

  const formatRange = (min: number | null, max: number | null): string | null => {
    if (min === null || max === null) return null;
    if (min === max) return `${min}`;
    return `${min}-${max}`;
  };

  const hasVisibility = data.visibility_min !== null && data.visibility_max !== null;
  const hasSwell = data.swell_min !== null && data.swell_max !== null;

  return (
    <div className="tile visibility" data-testid="visibility-tile">
      <div className="tile__header">
        <div className="tile__title">Conditions</div>
      </div>

      <div className="tile__content">
        <div className="visibility__row">
          <div className="visibility__section visibility__section--left">
            <div className="visibility__label">Viz</div>
            {hasVisibility ? (
              <div className="visibility__value">
                <span className="visibility__number">
                  {formatRange(data.visibility_min, data.visibility_max)}
                </span>
                <span className="visibility__unit">ft</span>
              </div>
            ) : (
              <div className="visibility__no-value">--</div>
            )}
          </div>
          <div className="visibility__divider"></div>
          <div className="visibility__section visibility__section--right">
            <div className="visibility__label">Swell</div>
            {hasSwell ? (
              <div className="visibility__value">
                <span className="visibility__number">
                  {formatRange(data.swell_min, data.swell_max)}
                </span>
                <span className="visibility__unit">ft</span>
              </div>
            ) : (
              <div className="visibility__no-value">--</div>
            )}
          </div>
        </div>

        {data.source && (
          <div className="visibility__source">
            {data.source}{data.last_updated && ` • ${formatTime(data.last_updated)}`}
          </div>
        )}
      </div>
    </div>
  );
}