# Card 17b: Tides Tile Bug Fix & Interpolation

## Problem Statement

The Tides tile is displaying incorrect tide prediction data. Cross-referencing with verified sources (NOAA, tide-forecast.com) reveals discrepancies.

### Example: Santa Monica (Current Date)

**Expected (from tide-forecast.com):**
- Next high tide: 9:36 PM
- Next low tide: 3:24 PM
- Sunset today: 7:03 PM
- Sunrise tomorrow: 7:01 AM

**Actual (Pacifica dashboard):**
- Low tide: 7:26 PM
- High tide: 1:36 PM
- Graph shows: next low 7:26 PM, next high 1:29 AM (not matching the displayed 1:36 PM)

**Issues:**
1. Times are significantly off from authoritative sources
2. Graph values don't match displayed text values
3. Time format may be confusing (AM/PM vs 24h, timezone issues)

## Scope

### Phase 1: Data Verification & Fix
- [ ] Cross-reference NOAA CO-OPS API data with tide-forecast.com and other authoritative sources
- [ ] Verify timezone handling (ensure Pacific Time throughout)
- [ ] Check if we're displaying "next" tides correctly or showing past tides
- [ ] Fix any issues in the NOAA Tides scraper or API endpoint
- [ ] Ensure high/low predictions are sorted and filtered correctly

### Phase 2: Graph Accuracy
- [ ] Ensure graph curve matches actual NOAA prediction data points
- [ ] Fix any mismatches between displayed next high/low times and graph visualization
- [ ] Verify the "current position" dot is placed correctly on the curve

### Phase 3: Interpolation (Enhanced UX)
- [ ] Implement D3.js or mathematical interpolation between high/low tide points
- [ ] Enable hover on graph to show estimated tide height at any time
- [ ] Display interpolated time and approximate height value on hover
- [ ] Consider using harmonic constituent formulas for more accurate interpolation

## Technical Approach

### Data Verification
```
NOAA CO-OPS API endpoint: /api/tides?station_id={id}&hours=48
Compare against: https://tidesandcurrents.noaa.gov/stationhome.html?id={station_id}
```

### Interpolation Strategy
Options:
1. **Linear interpolation** between high/low points (simple, less accurate)
2. **Cosine interpolation** (smoother curve, better for tides)
3. **D3 curve fitting** with proper tide curve shape
4. **Harmonic constituents** (most accurate, requires NOAA harmonic constants)

Recommended: Start with cosine interpolation, evaluate accuracy, upgrade to harmonic if needed.

## Acceptance Criteria

- [ ] Tide times match authoritative sources within 5 minutes
- [ ] High/low predictions are always in the future (not past events)
- [ ] Graph curve accurately reflects tide predictions
- [ ] Hover on graph shows interpolated tide height and time
- [ ] Timezone is consistently Pacific Time (America/Los_Angeles)
- [ ] All displayed values synchronize (text, graph, hover tooltip)

## References

- NOAA Tides & Currents: https://tidesandcurrents.noaa.gov/
- Tide Forecast (verification): https://www.tide-forecast.com/
- Harmonic Constituents: https://tidesandcurrents.noaa.gov/harmonic_constituents.html
