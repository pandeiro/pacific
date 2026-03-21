# LLM Prompt Engineering Findings

## Overview

This document captures lessons learned from testing LLM prompts for wildlife
sighting extraction. Findings apply to `llama3.2:1b` via Ollama (local) and
should be validated when using other models.

## Extraction Profiles

All prompts are predefined in `scraper/llm.py` in the `PROFILES` dict.
Consumers must specify a profile name rather than passing ad-hoc prompts.

### Available Profiles

| Profile | Description | Temperature | Use Case |
|---------|-------------|-------------|----------|
| `default` | Generic wildlife sightings | 0.0 | Fallback, testing |
| `acs-la` | ACS-LA Gray Whale Census | 0.0 | Card 18b: narrative extraction |
| `dive-conditions` | South Coast Divers visibility/swell | 0.0 | Card 15b: dive report extraction |

### Adding New Profiles

To add a new extraction profile (e.g., for Card 19, 23):

```python
# In scraper/llm.py, add to PROFILES dict:

PROFILES = {
    # ... existing profiles ...
    
    "harbor-breeze": {
        "system": "Return only valid JSON.",
        "user_template": 'Extract wildlife sightings from this whale watching trip report. Return JSON with "sightings" array. Each object has: "species" (string), "count" (integer), "location_hint" (string, optional), "behavior" (string, optional).\n\n{text}',
        "temperature": 0.0,
    },
    
    "dive-conditions": {
        "system": "Return only valid JSON.",
        "user_template": 'Extract from dive report. Look for visibility (viz, vis, visibility) in feet. Look for swell height in feet. Return JSON: {"visibility_feet": int or null, "swell_feet": int or null, "confidence": "high" or "medium" or "low"}.\n\n{text}',
        "temperature": 0.0,
    },
}
```

## Test Results Summary

| Test | Prompt Style | Temp | Raw JSON? | Quality |
|------|-------------|------|-----------|---------|
| 3 | System: "Return only valid JSON" | 0.0 | ✓ | ✓ Correct |
| 8 | System + "sightings" schema | 0.0 | ✓ | ✓ Matches our schema |
| 9 | System + sightings schema | 0.1 | ✓ | ✓ Correct |
| 10 | System + sightings schema | 0.5 | ✘ (code blocks) | ✓ Correct |
| 12 | Consistency check (3x) | 0.0 | ✓ | 100% consistent |

## Key Findings

### 1. Temperature Matters

- **Temperature ≤ 0.1** → Returns raw JSON (no markdown code blocks)
- **Temperature ≥ 0.5** → Wraps output in ````json` code blocks
- **Recommendation**: Use `temperature: 0.0` for maximum consistency

### 2. Prompt Complexity

Small models (llama3.2:1b) struggle with complex JSON schema dumps embedded
in prompts. Simpler is better:

**Works well:**
```
System: "Return only valid JSON."
User: "Extract wildlife sightings. Return JSON with "sightings" array 
      containing objects with "species" (string) and "count" (integer) fields."
```

**Works poorly:**
```
User: "Return ONLY valid JSON matching this schema:
      {"type": "object", "properties": {...}, "items": {...}}"
```

The complex schema causes the model to echo the schema back instead of
extracting data from the input.

### 3. System Message

A short system message is sufficient and often better:

- ✓ `"Return only valid JSON."`
- ✓ `"You are a data extraction assistant. Return only valid JSON."`
- ✘ Long system messages about behavior, role, etc.

### 4. Consistency

At `temperature: 0.0`, the model produces identical output across multiple
runs with the same input. This is critical for deterministic scraper behavior.

### 5. Zero Counts

Models may skip sightings with `count: 0` unless explicitly told to include them.
If zero counts are meaningful (e.g., "no whales spotted today"), add:

```
"Include zero counts if explicitly stated."
```

## Best Practices

1. **Test with your actual model** - Different models may behave differently
2. **Use temperature 0.0** for extraction tasks requiring consistency
3. **Keep prompts simple** - Inline format descriptions work better than schema dumps
4. **Strip markdown code blocks** as a fallback for higher temperatures
5. **Provide fallback regex** for critical data when LLM fails
6. **Validate output** - Check for required fields, correct types, reasonable values
7. **Use predefined profiles** - All prompts must be in PROFILES, not ad-hoc
8. **Check `supports_llm()`** before running scrapers that need LLM capability
9. **Keep MODEL_PREFERENCE_LIST updated** with models available in all environments

## Docker Networking

The LLM client connects to Ollama running on the Docker host via
`http://host.docker.internal:11434`. This URL is hardcoded in `LLMClient.__init__`.

```python
# In scraper/llm.py
self.base_url = "http://host.docker.internal:11434"
```

For Docker containers to reach Ollama on the host, the container must have
`host.docker.internal` configured via `extra_hosts`:

```yaml
# In docker-compose.yml
services:
  scraper:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

## Model Discovery

The LLM client automatically discovers available models and selects the best one:

```python
# Model preference list (in order of preference)
MODEL_PREFERENCE_LIST = ["llama3.2:1b", "llama3.2:3b"]
```

**Selection Logic:**

1. If `LLM_MODEL` env var is set and that model is available → use it
2. Otherwise, try models in `MODEL_PREFERENCE_LIST` in order
3. First available model from the list is used

**Error Behavior:**

| Scenario | Behavior |
|----------|----------|
| Ollama unreachable (connection error) | Continue without LLM, scraper uses fallback extraction |
| Ollama reachable, no preferred models | Raise `ValueError` (configuration issue) |
| Ollama reachable, `LLM_MODEL` set but not installed | Raise `ValueError` (configuration issue) |

**Why fail-only-when-reachable?**

- Transient network issues (Ollama restarting) should not crash the scheduler
- Configuration mismatches (missing model) should fail loudly so they get fixed
- Scraper will fall back to regex extraction when LLM is unavailable

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_MODEL` | Explicit model to use (overrides auto-discovery) | Auto-select from preference list |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://host.docker.internal:11434` |

## Example Usage

```python
from llm import LLMClient

async def extract_acs_la(text: str) -> dict:
    async with LLMClient() as client:
        # Use the acs-la profile for ACS-LA Gray Whale Census data
        result = await client.extract(text, profile="acs-la")
        return result

async def extract_with_fallback(text: str) -> dict:
    def regex_fallback(raw_text: str) -> dict:
        # Regex-based extraction as fallback
        import re
        # ... fallback logic ...
        return {"visibility": None, "swell": None}
    
    async with LLMClient() as client:
        # LLM extraction with fallback on failure
        result = await client.extract(
            text, 
            profile="dive-conditions",
            fallback_fn=regex_fallback
        )
        return result

# Check if LLM is available before running
async def conditional_scrape():
    async with LLMClient() as client:
        if not client.supports_llm():
            print("LLM not available, using regex-only extraction")
            # ... regex extraction logic ...
        else:
            print(f"Using LLM model: {client.model}")
            # ... LLM extraction logic ...
```

## Profile-Specific Notes

### `acs-la` Profile (Card 18b)

Optimized for ACS-LA Gray Whale Census narrative text. Key characteristics:
- Mixes narrative ("10 BOTTLENOSE DOLPHINS spotted at 5pm") with structured blocks
- Zero counts are meaningful ("Southbound: 0")
- Location is fixed (Pt. Vicente) but narrative may mention other hints

Test input:
```
ACS/LA Gray Whale Census... heavy fog blocked our views... 
GRAY WHALES were reported just south of us along the kelp...
we finally spotted a group of 10 BOTTLENOSE DOLPHINS - at 5pm!
GRAY WHALES TODAY: Southbound: 0 Northbound: 0 Total: 0
```

Expected output:
```json
{
  "sightings": [
    {"species": "GRAY WHALE", "count": 0},
    {"species": "BOTTLENOSE DOLPHIN", "count": 10}
  ]
}
```

## Future Work

- Add profiles for Card 19 (Harbor Breeze), Card 23 (Twitter)
- Test with larger models (glm-5, deepseek-v3) when available locally
- Benchmark extraction accuracy across model sizes
- Monitor for prompt drift as models update

### `dive-conditions` Profile (Card 15b)

Optimized for South Coast Divers dive condition reports. Extracts water visibility
and swell height ranges from narrative dive reports.

Key characteristics:
- Visibility phrases: "viz", "vis", "visibility", "clarity"
- Swell phrases: "swell", "surf", wave heights
- Returns strings that may be ranges like "10-15" or single values like "10"
- Backend parses strings into min/max integers
- Consistency: 100% at temperature 0.0 across multiple runs

Test input:
```
Good morning Divers!!! The swell models show a S swell still, the surf is 
fairly decent at 1-3 feet. The viz looks like around 10 feet...
```

Expected output:
```json
{
  "visibility": "10",
  "swell": "1-3"
}
```

Parsing in Python:
```python
def parse_range(value: str) -> tuple:
    """Parse '10-15' → (10, 15) or '10' → (10, 10)"""
    if "-" in value:
        parts = value.split("-")
        return int(parts[0]), int(parts[1])
    v = int(float(value))
    return v, v
```