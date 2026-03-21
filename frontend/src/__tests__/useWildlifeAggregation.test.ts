import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWildlifeAggregation } from '../hooks/useWildlifeAggregation';
import type { SightingRecord, TaxonGroup } from '../types';

// --- Test helpers ---

const ALL_TAXON: Set<TaxonGroup> = new Set(['whale', 'dolphin', 'shark', 'pinniped', 'bird', 'other']);
const NO_SOURCES: Set<string> = new Set();
const NO_FILTER = { searchQuery: '', activeTaxonGroups: ALL_TAXON, selectedSources: NO_SOURCES, sortBy: 'count' as const };

function today(): Date {
  return new Date(2026, 2, 21); // March 21, 2026
}

function dateStr(offsetDays: number): string {
  const d = today();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sighting(overrides: Partial<SightingRecord> & { species: string; source: string }): SightingRecord {
  return {
    id: Math.random(),
    timestamp: new Date().toISOString(),
    sighting_date: dateStr(0),
    taxon_group: 'whale',
    count: null,
    location_id: null,
    location_name: null,
    source_url: null,
    confidence: 'high',
    raw_text: null,
    metadata: {},
    ...overrides,
  };
}

// Fix "now" to March 21, 2026 so time grouping is deterministic
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(today());
});

afterEach(() => {
  vi.useRealTimers();
});

// --- Tests ---

describe('useWildlifeAggregation', () => {
  // ── Time block grouping ──────────────────────────────────────────────

  describe('time block grouping', () => {
    it('places today\'s sightings in Last Day', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(0) })],
          NO_FILTER,
        ),
      );
      expect(result.current.timeBlocks).toHaveLength(1);
      expect(result.current.timeBlocks[0].label).toBe('Last Day');
    });

    it('places yesterday\'s sightings in Last Day', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(-1) })],
          NO_FILTER,
        ),
      );
      expect(result.current.timeBlocks).toHaveLength(1);
      expect(result.current.timeBlocks[0].label).toBe('Last Day');
    });

    it('places 3-day-old sightings in Last Week', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(-3) })],
          NO_FILTER,
        ),
      );
      expect(result.current.timeBlocks).toHaveLength(1);
      expect(result.current.timeBlocks[0].label).toBe('Last Week');
    });

    it('places 30-day-old sightings in Older', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(-30) })],
          NO_FILTER,
        ),
      );
      expect(result.current.timeBlocks).toHaveLength(1);
      expect(result.current.timeBlocks[0].label).toBe('Older');
    });

    it('excludes sightings older than 50 days', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(-60) })],
          NO_FILTER,
        ),
      );
      expect(result.current.timeBlocks).toHaveLength(0);
    });

    it('excludes future sightings', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(1) })],
          NO_FILTER,
        ),
      );
      expect(result.current.timeBlocks).toHaveLength(0);
    });

    it('excludes sightings with null sighting_date', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: null })],
          NO_FILTER,
        ),
      );
      expect(result.current.timeBlocks).toHaveLength(0);
    });

    it('puts species in the correct block boundary (day 7 = Last Week, day 8 = Older)', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Fin Whale', source: 'iNat', sighting_date: dateStr(-7), id: 1 }),
            sighting({ species: 'Minke Whale', source: 'iNat', sighting_date: dateStr(-8), id: 2 }),
          ],
          NO_FILTER,
        ),
      );
      expect(result.current.timeBlocks).toHaveLength(2);
      const labels = result.current.timeBlocks.map((b) => b.label);
      expect(labels).toContain('Last Week');
      expect(labels).toContain('Older');
    });
  });

  // ── Aggregation by species ───────────────────────────────────────────

  describe('species aggregation', () => {
    it('aggregates same species from different sources into one row', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Gray Whale', source: 'daveyslocker', sighting_date: dateStr(0), id: 2 }),
          ],
          NO_FILTER,
        ),
      );
      const species = result.current.timeBlocks[0].species;
      expect(species).toHaveLength(1);
      expect(species[0].species).toBe('Gray Whale');
      expect(species[0].sources).toHaveLength(2);
    });

    it('treats species names case-insensitively for aggregation key', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'gray whale', source: 'daveyslocker', sighting_date: dateStr(0), id: 2 }),
          ],
          NO_FILTER,
        ),
      );
      const species = result.current.timeBlocks[0].species;
      expect(species).toHaveLength(1);
    });

    it('keeps different species in separate rows', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Fin Whale', source: 'iNat', sighting_date: dateStr(0), id: 2 }),
          ],
          NO_FILTER,
        ),
      );
      const species = result.current.timeBlocks[0].species;
      expect(species).toHaveLength(2);
    });

    it('does not double-count species across time blocks', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(-3), id: 2 }),
          ],
          NO_FILTER,
        ),
      );
      expect(result.current.timeBlocks).toHaveLength(2);
      expect(result.current.timeBlocks[0].species).toHaveLength(1);
      expect(result.current.timeBlocks[1].species).toHaveLength(1);
    });
  });

  // ── Count: SUM + suffix ──────────────────────────────────────────────

  describe('count aggregation', () => {
    it('sums counts across sources', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', count: 5, sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Gray Whale', source: 'daveyslocker', count: 12, sighting_date: dateStr(0), id: 2 }),
          ],
          NO_FILTER,
        ),
      );
      const sp = result.current.timeBlocks[0].species[0];
      expect(sp.count).toBe(17);
      expect(sp.countLabel).toBe('17+');
    });

    it('appends + to count label', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [sighting({ species: 'Gray Whale', source: 'iNat', count: 7, sighting_date: dateStr(0) })],
          NO_FILTER,
        ),
      );
      expect(result.current.timeBlocks[0].species[0].countLabel).toBe('7+');
    });

    it('returns empty countLabel when all counts are null', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', count: null, sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Gray Whale', source: 'daveyslocker', count: null, sighting_date: dateStr(0), id: 2 }),
          ],
          NO_FILTER,
        ),
      );
      const sp = result.current.timeBlocks[0].species[0];
      expect(sp.count).toBe(0);
      expect(sp.countLabel).toBe('');
    });

    it('ignores null counts when summing', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', count: null, sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Gray Whale', source: 'daveyslocker', count: 8, sighting_date: dateStr(0), id: 2 }),
          ],
          NO_FILTER,
        ),
      );
      const sp = result.current.timeBlocks[0].species[0];
      expect(sp.count).toBe(8);
      expect(sp.countLabel).toBe('8+');
    });

    it('handles zero counts as having no count', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [sighting({ species: 'Gray Whale', source: 'iNat', count: 0, sighting_date: dateStr(0) })],
          NO_FILTER,
        ),
      );
      const sp = result.current.timeBlocks[0].species[0];
      expect(sp.count).toBe(0);
      expect(sp.countLabel).toBe('');
    });
  });

  // ── Location deduplication ───────────────────────────────────────────

  describe('location deduplication', () => {
    it('deduplicates same location across sources', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', location_name: 'Ventura', sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Gray Whale', source: 'daveyslocker', location_name: 'Ventura', sighting_date: dateStr(0), id: 2 }),
          ],
          NO_FILTER,
        ),
      );
      expect(result.current.timeBlocks[0].species[0].locations).toEqual(['Ventura']);
    });

    it('collects distinct locations', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', location_name: 'Ventura', sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Gray Whale', source: 'daveyslocker', location_name: 'Newport Beach', sighting_date: dateStr(0), id: 2 }),
          ],
          NO_FILTER,
        ),
      );
      const locs = result.current.timeBlocks[0].species[0].locations;
      expect(locs).toHaveLength(2);
      expect(locs).toContain('Ventura');
      expect(locs).toContain('Newport Beach');
    });

    it('excludes null locations', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', location_name: null, sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Gray Whale', source: 'daveyslocker', location_name: 'Ventura', sighting_date: dateStr(0), id: 2 }),
          ],
          NO_FILTER,
        ),
      );
      expect(result.current.timeBlocks[0].species[0].locations).toEqual(['Ventura']);
    });
  });

  // ── Source collection ────────────────────────────────────────────────

  describe('source collection', () => {
    it('collects unique sources', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Gray Whale', source: 'daveyslocker', sighting_date: dateStr(0), id: 2 }),
            sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(0), id: 3 }),
          ],
          NO_FILTER,
        ),
      );
      const sources = result.current.timeBlocks[0].species[0].sources;
      expect(sources).toHaveLength(2);
      expect(sources).toContain('iNat');
      expect(sources).toContain('daveyslocker');
    });
  });

  // ── Sorting ──────────────────────────────────────────────────────────

  describe('sorting', () => {
    it('sorts by count descending, then alphabetically (default)', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Fin Whale', source: 'iNat', count: 5, sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Gray Whale', source: 'iNat', count: 5, sighting_date: dateStr(0), id: 2 }),
            sighting({ species: 'Minke Whale', source: 'iNat', count: 20, sighting_date: dateStr(0), id: 3 }),
          ],
          NO_FILTER,
        ),
      );
      const names = result.current.timeBlocks[0].species.map((s) => s.species);
      expect(names[0]).toBe('Minke Whale');
      expect(names[1]).toBe('Fin Whale');
      expect(names[2]).toBe('Gray Whale');
    });

    it('sorts alphabetically when sortBy is alpha', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Minke Whale', source: 'iNat', count: 20, sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Fin Whale', source: 'iNat', count: 5, sighting_date: dateStr(0), id: 2 }),
            sighting({ species: 'Gray Whale', source: 'iNat', count: 10, sighting_date: dateStr(0), id: 3 }),
          ],
          { ...NO_FILTER, sortBy: 'alpha' },
        ),
      );
      const names = result.current.timeBlocks[0].species.map((s) => s.species);
      expect(names).toEqual(['Fin Whale', 'Gray Whale', 'Minke Whale']);
    });

    it('sorts by most recent sighting when sortBy is recent', () => {
      // All in same time block to test sort order within block
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Fin Whale', source: 'iNat', sighting_date: dateStr(-2), id: 1 }),
            sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(0), id: 2 }),
            sighting({ species: 'Minke Whale', source: 'iNat', sighting_date: dateStr(-3), id: 3 }),
          ],
          { ...NO_FILTER, sortBy: 'recent' },
        ),
      );
      // Gray Whale is in Last Day; Fin Whale and Minke Whale are in Last Week
      const lastWeek = result.current.timeBlocks.find((b) => b.label === 'Last Week');
      expect(lastWeek).toBeDefined();
      const names = lastWeek!.species.map((s) => s.species);
      expect(names[0]).toBe('Fin Whale');    // -2 days (more recent than -3)
      expect(names[1]).toBe('Minke Whale');  // -3 days
    });
  });

  // ── Filtering ────────────────────────────────────────────────────────

  describe('filtering', () => {
    it('filters by taxon group', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', taxon_group: 'whale', sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Leopard Shark', source: 'iNat', taxon_group: 'shark', sighting_date: dateStr(0), id: 2 }),
          ],
          { ...NO_FILTER, activeTaxonGroups: new Set<TaxonGroup>(['whale']) },
        ),
      );
      expect(result.current.totalFiltered).toBe(1);
      expect(result.current.timeBlocks[0].species[0].species).toBe('Gray Whale');
    });

    it('filters by source when selectedSources is set', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Gray Whale', source: 'daveyslocker', sighting_date: dateStr(0), id: 2 }),
          ],
          { ...NO_FILTER, selectedSources: new Set(['iNat']) },
        ),
      );
      expect(result.current.totalFiltered).toBe(1);
      expect(result.current.timeBlocks[0].species[0].sources).toEqual(['iNat']);
    });

    it('no source filter when selectedSources is empty (all pass)', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Gray Whale', source: 'daveyslocker', sighting_date: dateStr(0), id: 2 }),
          ],
          { ...NO_FILTER, selectedSources: new Set() },
        ),
      );
      expect(result.current.totalFiltered).toBe(2);
    });

    it('search query matches species name', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Fin Whale', source: 'iNat', sighting_date: dateStr(0), id: 2 }),
          ],
          { ...NO_FILTER, searchQuery: 'gray' },
        ),
      );
      expect(result.current.totalFiltered).toBe(1);
      expect(result.current.timeBlocks[0].species[0].species).toBe('Gray Whale');
    });

    it('search query matches location', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', location_name: 'Ventura', sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Fin Whale', source: 'iNat', location_name: 'Dana Point', sighting_date: dateStr(0), id: 2 }),
          ],
          { ...NO_FILTER, searchQuery: 'ventura' },
        ),
      );
      expect(result.current.totalFiltered).toBe(1);
    });

    it('search query matches source', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'daveyslocker', sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Fin Whale', source: 'iNat', sighting_date: dateStr(0), id: 2 }),
          ],
          { ...NO_FILTER, searchQuery: 'daveys' },
        ),
      );
      expect(result.current.totalFiltered).toBe(1);
    });

    it('filters apply before aggregation', () => {
      // Gray Whale from two sources, but only iNat is filtered in
      // Should aggregate just the iNat entry, not include daveyslocker
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', count: 3, sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Gray Whale', source: 'daveyslocker', count: 10, sighting_date: dateStr(0), id: 2 }),
          ],
          { ...NO_FILTER, selectedSources: new Set(['iNat']) },
        ),
      );
      const sp = result.current.timeBlocks[0].species[0];
      expect(sp.count).toBe(3); // only iNat's 3, daveyslocker's 10 excluded by filter
      expect(sp.sources).toEqual(['iNat']);
    });
  });

  // ── Totals ───────────────────────────────────────────────────────────

  describe('totals', () => {
    it('reports correct totalRaw, totalFiltered, totalAggregated', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Gray Whale', source: 'iNat', sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Gray Whale', source: 'daveyslocker', sighting_date: dateStr(0), id: 2 }),
            sighting({ species: 'Fin Whale', source: 'iNat', taxon_group: 'shark', sighting_date: dateStr(0), id: 3 }),
          ],
          { ...NO_FILTER, activeTaxonGroups: new Set<TaxonGroup>(['whale']) },
        ),
      );
      expect(result.current.totalRaw).toBe(3);
      expect(result.current.totalFiltered).toBe(2); // shark filtered out
      expect(result.current.totalAggregated).toBe(1); // two Gray Whales → one row
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles empty sightings array', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation([], NO_FILTER),
      );
      expect(result.current.timeBlocks).toHaveLength(0);
      expect(result.current.totalRaw).toBe(0);
      expect(result.current.totalFiltered).toBe(0);
      expect(result.current.totalAggregated).toBe(0);
    });

    it('handles single sighting', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [sighting({ species: 'Gray Whale', source: 'iNat', count: 1, sighting_date: dateStr(0) })],
          NO_FILTER,
        ),
      );
      const sp = result.current.timeBlocks[0].species[0];
      expect(sp.species).toBe('Gray Whale');
      expect(sp.countLabel).toBe('1+');
      expect(sp.sources).toHaveLength(1);
    });

    it('uses representative taxon_group from first sighting of species', () => {
      // Shouldn't happen in practice, but if taxon_group differs across sources for same species
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [
            sighting({ species: 'Something', source: 'iNat', taxon_group: 'whale', sighting_date: dateStr(0), id: 1 }),
            sighting({ species: 'Something', source: 'daveyslocker', taxon_group: 'dolphin', sighting_date: dateStr(0), id: 2 }),
          ],
          NO_FILTER,
        ),
      );
      // First sighting's taxon_group wins
      expect(result.current.timeBlocks[0].species[0].taxonGroup).toBe('whale');
    });

    it('filters out all sightings when no taxon groups match', () => {
      const { result } = renderHook(() =>
        useWildlifeAggregation(
          [sighting({ species: 'Gray Whale', source: 'iNat', taxon_group: 'whale', sighting_date: dateStr(0) })],
          { ...NO_FILTER, activeTaxonGroups: new Set<TaxonGroup>(['shark']) },
        ),
      );
      expect(result.current.timeBlocks).toHaveLength(0);
      expect(result.current.totalFiltered).toBe(0);
    });
  });
});
