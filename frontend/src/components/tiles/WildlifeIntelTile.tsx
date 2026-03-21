import { useState, useMemo } from 'react';
import './WildlifeIntelTile.css';
import type { SightingRecord, TaxonGroup } from '../../types';
import { useWildlife } from '../../hooks/useWildlife';
import { getSpeciesEmoji } from '../../utils/speciesEmoji';

interface GroupedSightings {
  [timeLabel: string]: SightingRecord[];
}

const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  inaturalist: { label: 'iNat', color: 'badge--green' },
  daveyslocker: { label: 'Davey\'s', color: 'badge--blue' },
  dana_wharf: { label: 'Dana Wharf', color: 'badge--blue' },
  acs_la: { label: 'ACS-LA', color: 'badge--teal' },
  harbor_breeze: { label: 'H. Breeze', color: 'badge--blue' },
  island_packers: { label: 'Is. Packers', color: 'badge--blue' },
  whale_alert: { label: 'Whale Alert', color: 'badge--orange' },
  twitter: { label: 'Twitter', color: 'badge--gray' },
};

const TAXON_GROUPS: TaxonGroup[] = ['whale', 'dolphin', 'shark', 'pinniped', 'bird', 'other'];

function formatRecency(timestamp: string): string {
  const date = new Date(timestamp);
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
  });
  return formatter.format(date);
}

function getTimeGroup(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 24) {
    return 'Today';
  }
  if (diffDays < 7) {
    return 'This Week';
  }
  return 'Older';
}

export function WildlifeIntelTile() {
  const { sightings, isLoading, error } = useWildlife();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<TaxonGroup>>(
    new Set(TAXON_GROUPS)
  );
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());

  // Filter by search and taxon groups
  const filteredSightings = useMemo(() => {
    if (!sightings) return [];

    return sightings.sightings.filter((s) => {
      // Taxon group filter
      if (!activeFilters.has(s.taxon_group)) {
        return false;
      }

      // Source filter
      if (selectedSources.size > 0 && !selectedSources.has(s.source)) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          s.species.toLowerCase().includes(query) ||
          (s.location_name?.toLowerCase().includes(query) || false) ||
          s.source.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [sightings, activeFilters, selectedSources, searchQuery]);

  // Group by recency
  const groupedSightings = useMemo(() => {
    const groups: GroupedSightings = {
      'Today': [],
      'This Week': [],
      'Older': [],
    };

    filteredSightings.forEach((s) => {
      const group = getTimeGroup(s.timestamp);
      if (group in groups) {
        groups[group].push(s);
      }
    });

    return groups;
  }, [filteredSightings]);

  const toggleTaxonGroup = (group: TaxonGroup) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(group)) {
      newFilters.delete(group);
    } else {
      newFilters.add(group);
    }
    setActiveFilters(newFilters);
  };

  const toggleSourceFilter = (source: string) => {
    const newSources = new Set(selectedSources);
    if (newSources.has(source)) {
      newSources.delete(source);
    } else {
      newSources.add(source);
    }
    setSelectedSources(newSources);
  };

  const hasResults = filteredSightings.length > 0;

  return (
    <div className="tile wildlife-intel">
      <div className="tile__header">
        <div className="tile__title">
          <span className="tile__title-icon">🔍</span>
          Wildlife Intel
        </div>
      </div>

      <div className="tile__content">
        {/* Search bar */}
        <div className="wildlife-intel__search">
          <input
            type="text"
            className="wildlife-intel__search-input"
            placeholder="Search species, location, or source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Taxon filter pills */}
        <div className="wildlife-intel__filters">
          {TAXON_GROUPS.map((group) => (
            <button
              key={group}
              className={`wildlife-intel__filter-pill ${
                activeFilters.has(group) ? 'wildlife-intel__filter-pill--active' : ''
              }`}
              onClick={() => toggleTaxonGroup(group)}
            >
              {group.charAt(0).toUpperCase() + group.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading/Error states */}
        {isLoading && <div className="wildlife-intel__status">Loading sightings...</div>}
        {error && <div className="wildlife-intel__status wildlife-intel__status--error">Error: {error.message}</div>}

        {/* Empty state */}
        {!isLoading && !error && !hasResults && (
          <div className="wildlife-intel__status">No sightings reported in the last 7 days.</div>
        )}

        {/* Sightings list, grouped by recency */}
        {!isLoading && !error && hasResults && (
          <div className="sightings-container">
            {['Today', 'This Week', 'Older'].map((timeLabel) => {
              const group = groupedSightings[timeLabel];
              if (group.length === 0) return null;

              return (
                <div key={timeLabel} className="sightings-group">
                  <div className="sightings-group__header">{timeLabel}</div>
                  <div className="sightings-list">
                    {group.map((sighting) => (
                      <div key={sighting.id} className="sighting-item">
                        <span className="sighting-item__emoji">
                          {getSpeciesEmoji(sighting.species)}
                        </span>
                        <div className="sighting-item__info">
                          <div className="sighting-item__species">
                            {sighting.species}
                            {sighting.count && sighting.count > 1 && (
                              <span className="sighting-item__count">
                                ×{sighting.count}
                              </span>
                            )}
                          </div>
                          <div className="sighting-item__meta">
                            {sighting.location_name && (
                              <>
                                <span>{sighting.location_name}</span>
                                <span className="sighting-item__dot">·</span>
                              </>
                            )}
                            <span className="sighting-item__time">
                              {formatRecency(sighting.timestamp)}
                            </span>
                            <span className="sighting-item__dot">·</span>
                            <button
                              className={`source-badge ${
                                SOURCE_BADGES[sighting.source]?.color || 'badge--gray'
                              }`}
                              onClick={() => toggleSourceFilter(sighting.source)}
                              title={`Filter by ${sighting.source}`}
                            >
                              {SOURCE_BADGES[sighting.source]?.label || sighting.source}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
