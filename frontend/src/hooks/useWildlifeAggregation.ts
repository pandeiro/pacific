import { useMemo } from 'react';
import type { SightingRecord, TaxonGroup } from '../types';

// --- Types ---

export interface AggregatedSpecies {
  species: string;
  taxonGroup: TaxonGroup;
  count: number;
  countLabel: string; // e.g. "12+" (max across sources, with '+')
  locations: string[];
  sources: string[];
  sightingDates: string[]; // distinct dates this species appeared
}

export interface TimeBlock {
  label: string;      // "Last Day" | "Last Week" | "Older"
  species: AggregatedSpecies[];
}

export interface WildlifeAggregation {
  timeBlocks: TimeBlock[];
  totalRaw: number;    // pre-filter count
  totalFiltered: number; // post-filter count
  totalAggregated: number; // post-aggregation count
}

export interface WildlifeFilters {
  searchQuery: string;
  activeTaxonGroups: Set<TaxonGroup>;
  selectedSources: Set<string>;
}

// --- Helpers ---

const TIME_BLOCK_ORDER = ['Last Day', 'Last Week', 'Older'] as const;

function getTimeGroup(sightingDate: string | null): string | null {
  if (!sightingDate) return null;

  const [year, month, day] = sightingDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const now = new Date();
  const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((currentDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;
  if (diffDays <= 1) return 'Last Day';
  if (diffDays <= 7) return 'Last Week';
  if (diffDays <= 50) return 'Older';
  return null;
}

// --- Hook ---

export function useWildlifeAggregation(
  rawSightings: SightingRecord[],
  filters: WildlifeFilters,
): WildlifeAggregation {
  const { searchQuery, activeTaxonGroups, selectedSources } = filters;

  return useMemo(() => {
    // Step 1: Apply filters
    const filtered = rawSightings.filter((s) => {
      if (!activeTaxonGroups.has(s.taxon_group)) return false;
      if (selectedSources.size > 0 && !selectedSources.has(s.source)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.species.toLowerCase().includes(q) ||
          (s.location_name?.toLowerCase().includes(q) ?? false) ||
          s.source.toLowerCase().includes(q)
        );
      }
      return true;
    });

    // Step 2: Group by time block, then aggregate by species within each block
    const blockMap = new Map<string, Map<string, SightingRecord[]>>();

    for (const s of filtered) {
      const timeLabel = getTimeGroup(s.sighting_date);
      if (!timeLabel) continue;

      if (!blockMap.has(timeLabel)) {
        blockMap.set(timeLabel, new Map());
      }
      const speciesMap = blockMap.get(timeLabel)!;
      const key = s.species.toLowerCase();
      if (!speciesMap.has(key)) {
        speciesMap.set(key, []);
      }
      speciesMap.get(key)!.push(s);
    }

    // Step 3: Build aggregated time blocks
    const timeBlocks: TimeBlock[] = TIME_BLOCK_ORDER.map((label) => {
      const speciesMap = blockMap.get(label);
      if (!speciesMap) return { label, species: [] };

      const species: AggregatedSpecies[] = Array.from(speciesMap.entries())
        .map(([, sightings]) => {
          const representative = sightings[0];
          const maxCount = Math.max(
            ...sightings.map((s) => s.count ?? 0).filter((c) => c > 0),
            0,
          );
          const hasAnyCount = sightings.some((s) => s.count != null && s.count > 0);

          const locations = [...new Set(
            sightings.map((s) => s.location_name).filter(Boolean) as string[],
          )];
          const sources = [...new Set(sightings.map((s) => s.source))];
          const sightingDates = [...new Set(
            sightings.map((s) => s.sighting_date).filter(Boolean) as string[],
          )];

          return {
            species: representative.species,
            taxonGroup: representative.taxon_group,
            count: maxCount,
            countLabel: hasAnyCount ? `${maxCount}+` : '',
            locations,
            sources,
            sightingDates,
          };
        })
        // Sort: highest max-count first, then alphabetical
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return a.species.localeCompare(b.species);
        });

      return { label, species };
    }).filter((block) => block.species.length > 0);

    // Count totals for debugging / summary
    const totalRaw = rawSightings.length;
    const totalFiltered = filtered.length;
    const totalAggregated = timeBlocks.reduce(
      (sum, block) => sum + block.species.length,
      0,
    );

    return { timeBlocks, totalRaw, totalFiltered, totalAggregated };
  }, [rawSightings, searchQuery, activeTaxonGroups, selectedSources]);
}
