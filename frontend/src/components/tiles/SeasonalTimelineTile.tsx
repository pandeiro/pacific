import { useState } from 'react';
import './SeasonalTimelineTile.css';
import { Modal } from '../Modal';
import { useSeasonalEvents } from '../../hooks/useSeasonalEvents';
import type { SeasonalEvent } from '../../types';

const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const currentMonth = new Date().getMonth();

const categoryEmoji: Record<string, string> = {
  migration: '🐋',
  spawning: '🐟',
  bloom: '✨',
  season: '🦞',
  breeding: '🐣',
  tidal: '🌊',
};

function getEventStyle(event: SeasonalEvent) {
  const startMonth = event.typical_start_month - 1;
  const endMonth = event.typical_end_month - 1;
  const left = (startMonth / 12) * 100;
  const width = startMonth <= endMonth
    ? ((endMonth - startMonth + 1) / 12) * 100
    : ((12 - startMonth + endMonth + 1) / 12) * 100;
  return { left: `${left}%`, width: `${width}%` };
}

function isActiveInMonth(event: SeasonalEvent, month: number): boolean {
  if (event.typical_start_month > event.typical_end_month) {
    return month >= (event.typical_start_month - 1) || month <= (event.typical_end_month - 1);
  }
  return month >= (event.typical_start_month - 1) && month <= (event.typical_end_month - 1);
}

function formatTimespan(event: SeasonalEvent): string {
  return `${monthNames[event.typical_start_month - 1]} ${event.typical_start_day} — ${monthNames[event.typical_end_month - 1]} ${event.typical_end_day}`;
}

export function SeasonalTimelineTile() {
  const { events, isLoading, error } = useSeasonalEvents();
  const [expanded, setExpanded] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SeasonalEvent | null>(null);

  const currentMarkerPosition = ((currentMonth + 0.5) / 12) * 100;

  return (
    <>
      <div
        className={`seasonal-timeline ${expanded ? 'seasonal-timeline--expanded' : ''}`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="seasonal-timeline__months">
          {months.map((m, i) => (
            <div
              key={i}
              className={`seasonal-timeline__month ${i === currentMonth ? 'seasonal-timeline__month--current' : ''}`}
            >
              {m}
            </div>
          ))}
        </div>

        <div className="seasonal-timeline__bars">
          {isLoading && <div className="seasonal-timeline__empty">Loading…</div>}
          {error && !isLoading && <div className="seasonal-timeline__empty">Unavailable</div>}
          {!isLoading && !error && events.map((event, idx) => {
            const row = idx % 6;
            return (
              <div
                key={event.id}
                className={`seasonal-timeline__bar seasonal-timeline__bar--${event.category} ${isActiveInMonth(event, currentMonth) ? 'seasonal-timeline__bar--active' : ''}`}
                style={{
                  ...getEventStyle(event),
                  '--bar-row': row,
                } as React.CSSProperties}
                onClick={() => setSelectedEvent(event)}
              >
                <span className="seasonal-timeline__bar-label">{event.name}</span>
              </div>
            );
          })}
        </div>

        <div
          className="seasonal-timeline__marker"
          style={{ left: `${currentMarkerPosition}%` }}
        />
      </div>

      {selectedEvent && (
        <Modal isOpen onClose={() => setSelectedEvent(null)}>
          <div className="event-detail">
            <div className="event-detail__header">
              <span className="event-detail__emoji">
                {categoryEmoji[selectedEvent.category] ?? '📋'}
              </span>
              <div>
                <h2 className="event-detail__title">{selectedEvent.name}</h2>
                <span className="event-detail__category">{selectedEvent.category}</span>
              </div>
            </div>

            {selectedEvent.description && (
              <p className="event-detail__description">{selectedEvent.description}</p>
            )}

            <div className="event-detail__section">
              <div className="event-detail__label">Timespan</div>
              <div className="event-detail__value">{formatTimespan(selectedEvent)}</div>
            </div>

            {selectedEvent.species && (
              <div className="event-detail__section">
                <div className="event-detail__label">Species</div>
                <div className="event-detail__value event-detail__value--italic">{selectedEvent.species}</div>
              </div>
            )}

            {selectedEvent.conditions_text && (
              <div className="event-detail__section">
                <div className="event-detail__label">
                  Conditions
                  {selectedEvent.conditions_type && (
                    <span className="event-detail__condition-type">({selectedEvent.conditions_type})</span>
                  )}
                </div>
                <div className="event-detail__value">{selectedEvent.conditions_text}</div>
              </div>
            )}

            {selectedEvent.locations.length > 0 && (
              <div className="event-detail__section">
                <div className="event-detail__label">Locations</div>
                <div className="event-detail__locations">
                  {selectedEvent.locations.map(loc => (
                    <span key={loc.id} className="event-detail__location-chip">
                      {loc.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
