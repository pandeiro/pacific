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

## Docker Networking

The LLM client connects to Ollama running on the Docker host via
`http://host.docker.internal:11434`. This URL is hardcoded in `LLMClient.__init__`.

```python
# In scraper/llm.py
self.base_url = "http://host.docker.internal:11434"
```

To use a different model, set the `LLM_MODEL` environment variable:

```bash
# In .env or docker-compose.yml
LLM_MODEL=llama3.2:1b
```

## Example Usage

```python
from llm import LLMClient

async def extract_acs_la(text: str) -> dict:
    async with LLMClient() as client:
        # Use the acs-la profile for ACS-LA Gray Whale Census data
        result = await client.extract(text, profile="acs-la")
        return result

async def extract_generic(text: str) -> dict:
    async with LLMClient() as client:
        # Use default profile for generic extraction
        result = await client.extract(text, profile="default")
        return result
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