# Pacific - Project Specification

## Vision

Pacific is a real-time coastal intelligence dashboard for the Southern California coastline. It aggregates data from dozens of sources - official APIs, amateur dive reports, whale watch trip logs, live cams, citizen science platforms, and social media - into a single, information-dense, tiled interface.

The dashboard answers questions like:
- Is this weekend good to go snorkeling in Laguna? What's the visibility and water temp?
- Have they been seeing whales at Point Vicente? What kind?
- I have 45 minutes - where can I get to from here right now?
- When is the next low tide at this tidepool area I'm near?
- Where are good snorkeling spots besides Laguna Beach?
- Is bioluminescence happening anywhere right now?

Pacific is a tool for a curious, active Southern Californian who wants to know what's happening on their coast right now, what's coming up, and where to go.

## Voice Profile

All generated text, summaries, and condition reports should read like a **passionate, knowledgeable local** - the person at the dive shop who always knows where the action is.

Characteristics:
- **Enthusiastic but honest** - gets excited about good conditions, but doesn't hype mediocre days
- **Practical** - includes actionable details (timing, wind windows, parking notes)
- **Local vernacular** - uses spot names locals use, knows the neighborhoods
- **Opinionated** - will say "skip it today" or "drop everything and go"
- **Amateur naturalist** - genuinely interested in the wildlife, not just the activity

Example (good):
> Solid vis at Shaw's Cove this morning - 12-15ft, water's a comfortable 65°. Garibaldi are everywhere as usual but South Coast Divers mentioned a juvenile horn shark near the reef. Worth the drive if you can get there before the afternoon onshore picks up.

Example (bad - too robotic):
> Shaw's Cove: Visibility 12-15ft. Water temp 65°F. Species reported: Garibaldi, horn shark (juvenile). Wind: onshore expected PM.

This voice profile should guide LLM prompts, template text, and any editorial content in the dashboard.

## Geographic Scope

**Primary coverage area**: San Diego to San Simeon (~350 miles of coastline)

**Default map view**: Full coastline, displayed in a tall/narrow tile on the left side of the dashboard, potentially rotated to optimally align with the NW-SE orientation of the California coast.

**Key areas of interest** (not exhaustive):

### South Coast
- Dana Point / Dana Wharf (whale watching departure)
- Laguna Beach (Shaw's Cove, Crescent Bay, Heisler Park tidepools, Treasure Island)
- Crystal Cove State Park

### LA / Orange County Coast
- Palos Verdes Peninsula (Point Vicente, Abalone Cove, Terranea tidepools)
- Hermosa Beach / Manhattan Beach
- Santa Monica
- Malibu (Leo Carrillo, El Matador, Point Dume)
- Zuma Beach

### Ventura / Central Coast
- Channel Islands (Anacapa, Santa Cruz, Santa Rosa, San Miguel, Santa Catalina)
- Morro Bay
- San Simeon (elephant seals, Hearst Castle coast)

### Whale Watching Departure Points
- Long Beach / San Pedro (Harbor Breeze)
- Dana Point (Dana Wharf)
- Ventura / Oxnard (Island Packers)

### Tidepool Areas (to be expanded with research)
- Palos Verdes Peninsula (multiple spots)
- Malibu area
- Leo Carrillo
- Laguna Beach (Heisler Park)
