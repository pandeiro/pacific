# Map Tile — Technical Reference

## Overview

The Coastal Map tile is the visual anchor of the Pacifica dashboard. It renders all 23 coastal locations on an interactive MapLibre GL JS map with a rotated view that aligns the SoCal coastline along the vertical axis.

## Architecture

### Dependencies
- **maplibre-gl** `4.5.0` — WebGL vector map renderer
- **CartoDB dark-matter-nolabels** — Base map style (no built-in labels)
- Custom GeoJSON overlay for public lands

### Data Flow
```
useLocations() hook
  → /api/locations
    → 23 locations with lat/lng, type, region
      → MapTile converts to GeoJSON FeatureCollection
        → MapLibre circle layer renders dots
```

### Bidirectional Location Sync
```
Dashboard (locationId state)
  ├→ MapTile: highlights selected marker, flies to location
  ├→ MapTile click: onLocationChange(id) → Dashboard updates
  └→ Right dropdown: setLocationId → MapTile re-highlights
```

## Map Configuration

### Style
- **URL**: `https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json`
- **Why**: Dark theme matching dashboard palette, zero built-in labels — only our custom location labels appear on the map
- **Alternative considered**: OpenFreeMap liberty/positron (had MapLibre 5.x projection compatibility issues)

### Viewport
| Parameter | Value | Notes |
|-----------|-------|-------|
| `center` | `[-118.5, 34.0]` | Roughly central SoCal |
| `zoom` | `6` | Covers SD to San Simeon |
| `bearing` | `-45` | Rotates NW-SE coastline to vertical |
| `maxZoom` | `14` | |
| `minZoom` | `5` | |

### Rotation
The bearing of `-45°` rotates the map so the SoCal coastline (which runs ~315° from true north) appears to run vertically. This maximizes use of the 350px-wide left column.

## Layers

### Location Markers (GeoJSON circle layer)

Source: `locations` — dynamically generated from `/api/locations` response.

| Layer ID | Type | Purpose | Visibility |
|----------|------|---------|------------|
| `location-dots` | circle | Default tiny dots (radius 3) | Always |
| `location-hover` | circle | Expanded dot on hover (radius 6) | On hover only |
| `location-selected` | circle | Currently selected (radius 8, glowing) | Selected only |
| `location-labels` | symbol | Location name text | On hover only |

**Color coding by `location_type`:**
| Type | Color |
|------|-------|
| harbor | `#2d8b96` (teal) |
| beach | `#00d4aa` (cyan) |
| island | `#ffd93d` (amber) |
| tidepool | `#c084fc` (purple) |
| viewpoint | `#ff9f43` (orange) |

### User Location

Uses browser Geolocation API (`navigator.geolocation`). Shows a pulsating blue dot marker with CSS animation. Silently skipped if user denies permission.

### Public Lands Overlay

Source: `/data/socal-public-lands.geojson` — static GeoJSON file.

| Layer ID | Type | Purpose |
|----------|------|---------|
| `public-lands-fill` | fill | Semi-transparent green overlay |
| `public-lands-outline` | line | Boundary outline |

**Color coding by `type` property:**
| Type | Fill | Outline |
|------|------|---------|
| National Forest | `#1a4d2e` | `#3d8b4f` |
| National Park | `#0d3b2a` | `#2d7a3f` |
| State Park | `#2d6b3f` | `#4a9960` |
| State Beach | `#3a7d52` | `#5aab70` |

### Layer Order
1. Base map tiles (CartoDB)
2. `public-lands-fill` (below location markers)
3. `public-lands-outline`
4. `location-dots`
5. `location-selected`
6. `location-labels`

## Public Lands Data

### Current Data Source
Live query to **CPAD (California Protected Areas Database)** ArcGIS REST API:
- Endpoint: `https://gis.cnra.ca.gov/arcgis/rest/services/Boundaries/CPAD_AgencyLevel/MapServer/1/query`
- Bounding box: SoCal region (-121.0 to -117.0 lon, 32.5 to 35.5 lat)
- Up to 2000 features per query, clipped to viewport area
- Color-coded by agency level: Federal, State, Special District, County, City, Non Profit
- Hover popup shows unit name, agency level, and access type

### Layer IDs
| Layer ID | Type | Purpose |
|----------|------|---------|
| `public-lands-fill` | fill | Semi-transparent green overlay by agency level |
| `public-lands-outline` | line | Boundary outline |

### Alternative: Self-hosted Static GeoJSON
For production or offline use, process CPAD/PAD-US data locally:

| Source | Coverage | Format | Notes |
|--------|----------|--------|-------|
| **CPAD 2025b** | All CA protected lands | SHP → GeoJSON | [Download](https://data.cnra.ca.gov/dataset/cpad) |
| **PAD-US 4.1** | All US public lands | GDB → GeoJSON | [Download](https://www.sciencebase.gov/catalog/item/652d4fc5d34e44db0e2ee45e) |

**Processing workflow:**
```bash
# Install tools
brew install gdal
npm install -g mapshaper

# Convert CPAD SHP to GeoJSON, clip to SoCal
ogr2ogr -f GeoJSON -spat -121.0 32.5 -117.0 35.5 \
  socal_public_lands.geojson CPAD_2025b_Holdings.shp

# Simplify for web
mapshaper socal_public_lands.geojson -simplify 10% -o frontend/public/data/
```

## Component Interface

```typescript
interface MapTileProps {
  locationId?: number;           // Currently selected location (highlights on map)
  onLocationChange?: (id: number) => void;  // Fires when user clicks a location dot
}
```

## Files

| File | Purpose |
|------|---------|
| `frontend/src/components/tiles/MapTile.tsx` | Map component |
| `frontend/src/components/tiles/MapTile.css` | Tile container & popup styles |
| `frontend/public/data/socal-public-lands.geojson` | Public lands overlay data |
| `frontend/src/hooks/useLocations.ts` | Location data hook |

## Known Issues

- **React Strict Mode AbortError**: In dev mode, a benign `AbortError: signal is aborted without reason` appears in the console during the double-mount cycle. This is a MapLibre cleanup race condition and does not occur in production.
- **MapLibre 5.x incompatibility**: MapLibre 5.x had a `migrateProjection` error with all tested styles. Pinned to 4.5.0.

## Future Enhancements

- [ ] Download + process PAD-US/CPAD for self-hosted production data
- [ ] Add wildlife sighting density heatmap layer
- [ ] Click popup with location summary + drive time
- [ ] Drill-down zoom on location click
- [ ] Layer toggle controls (show/hide public lands, labels, etc.)

## Map Style Options

| Key | Provider | Style | Cost | Theme |
|-----|----------|-------|------|-------|
| `dark` | CartoDB | dark-matter-nolabels | Free | Dark, clean (default) |
| `fiord` | OpenFreeMap | fiord | Free | Blue-dark, oceanic |
| `dark2` | CartoDB | dark-matter (with labels) | Free | Dark with street labels |
| `positron` | CartoDB | positron-nolabels | Free | Light, clean |

Style toggle buttons appear in the tile header. Switching styles preserves all custom layers.
