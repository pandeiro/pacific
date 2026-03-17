import { useState } from 'react';
import { useTides } from '../../hooks/useTides';
import './TidesTile.css';

interface TidesTileProps {
  locationId: number;
  stationId: string;
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

export function TidesTile({ locationId, stationId }: TidesTileProps) {
  const { tides, isLoading, error } = useTides(locationId, stationId);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  const width = 300;
  const height = 80;
  
  if (isLoading) {
    return (
      <div className="tile tides-tile" data-testid="tides-tile">
        <div className="tile__header">
          <div className="tile__title">Tides</div>
        </div>
        <div className="tile__content" data-testid="tile-loading">
          <div className="loading-state">Loading tide data...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="tile tides-tile tile--error" data-testid="tides-tile">
        <div className="tile__header">
          <div className="tile__title">Tides</div>
        </div>
        <div className="tile__content" data-testid="tile-error">
          <div className="error-state">Tide data unavailable</div>
        </div>
      </div>
    );
  }

  // Generate data points for the graph
  const graphData = tides?.events ? tides.events.map(event => ({
    timestamp: event.timestamp,
    height: event.height_ft,
    type: event.type
  })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) : [];

  // Calculate SVG path
  const curvePath = (() => {
    if (graphData.length === 0) return '';
    
    const heights = graphData.map(e => e.height);
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const heightRange = maxHeight - minHeight || 1;
    
    const startTime = new Date(graphData[0].timestamp).getTime();
    const endTime = new Date(graphData[graphData.length - 1].timestamp).getTime();
    const timeRange = endTime - startTime || 1;
    
    const points = graphData.map(event => {
      const time = new Date(event.timestamp).getTime();
      const x = ((time - startTime) / timeRange) * width;
      const normalizedHeight = (event.height - minHeight) / heightRange;
      const y = height - (normalizedHeight * (height - 20) + 10);
      return { x, y };
    });
    
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    
    return path;
  })();

  // Calculate current position
  const currentPos = (() => {
    if (!tides?.current_height_ft || graphData.length === 0) return null;
    
    const heights = graphData.map(e => e.height);
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const heightRange = maxHeight - minHeight || 1;
    
    const startTime = new Date(graphData[0].timestamp).getTime();
    const endTime = new Date(graphData[graphData.length - 1].timestamp).getTime();
    const timeRange = endTime - startTime || 1;
    
    const now = Date.now();
    const x = ((now - startTime) / timeRange) * width;
    const normalizedHeight = (tides.current_height_ft - minHeight) / heightRange;
    const y = height - (normalizedHeight * (height - 20) + 10);
    
    return { x, y };
  })();
  
  return (
    <div className="tile tides-tile" data-testid="tides-tile">
      <div className="tile__header">
        <div className="tile__title">Tides</div>
      </div>
      
      <div className="tile__content">
        <div className="tides-tile__display">
          {tides?.next_low && (
            <div className="tides-tile__time-block tides-tile__low">
              <span className="tides-tile__time" data-testid="next-low">
                {formatTime(tides.next_low.timestamp)}
              </span>
              <span className="tides-tile__label">Low {tides.next_low.height_ft.toFixed(1)}ft</span>
            </div>
          )}
          
          <div className="tides-tile__arrow">→</div>
          
          {tides?.next_high && (
            <div className="tides-tile__time-block tides-tile__high">
              <span className="tides-tile__time" data-testid="next-high">
                {formatTime(tides.next_high.timestamp)}
              </span>
              <span className="tides-tile__label">High {tides.next_high.height_ft.toFixed(1)}ft</span>
            </div>
          )}
        </div>
        
        {graphData.length > 0 && (
          <div className="tides-tile__chart-container">
            <div className="tide-curve" data-testid="tides-curve">
              <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                {curvePath && (
                  <>
                    <path className="tide-curve__path" d={curvePath} fill="none" />
                    {currentPos && (
                      <circle 
                        className="tide-curve__current" 
                        cx={currentPos.x} 
                        cy={currentPos.y} 
                        r="4" 
                      />
                    )}
                    {/* Hover line */}
                    {hoveredIndex !== null && graphData[hoveredIndex] && (
                      <line
                        className="tide-curve__hover-line"
                        x1={(hoveredIndex / (graphData.length - 1)) * width}
                        y1="0"
                        x2={(hoveredIndex / (graphData.length - 1)) * width}
                        y2={height}
                      />
                    )}
                  </>
                )}
              </svg>
              {/* Invisible overlay for hover detection */}
              <div className="tide-curve__overlay">
                {graphData.map((_, i) => (
                  <div
                    key={i}
                    className="tide-curve__hover-zone"
                    style={{ left: `${(i / (graphData.length - 1)) * 100}%` }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                ))}
              </div>
            </div>
            {hoveredIndex !== null && graphData[hoveredIndex] && (
              <div className="tides-tile__hover-info">
                {formatTime(graphData[hoveredIndex].timestamp)} — {graphData[hoveredIndex].height.toFixed(1)}ft
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
