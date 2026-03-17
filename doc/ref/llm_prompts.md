# LLM Prompt Engineering Findings

## Overview

This document captures lessons learned from testing LLM prompts for wildlife
sighting extraction. Findings apply to `llama3.2:1b` via Ollama (local) and
should be validated when using other models.

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
"Extract wildlife observations including zero counts."
```

## Recommended Prompt Template

```python
DEFAULT_SYSTEM_PROMPT = "Return only valid JSON."

DEFAULT_USER_PROMPT = """Extract wildlife sightings. Return JSON with "sightings" array containing objects with "species" (string) and "count" (integer) fields.

{text}"""
```

### With Additional Fields

```python
USER_PROMPT_WITH_LOCATION = """Extract wildlife sightings. Return JSON with "sightings" array. Each object has: "species" (string), "count" (integer), "location_hint" (string, optional), "behavior" (string, optional).

{text}"""
```

## Best Practices

1. **Test with your actual model** - Different models may behave differently
2. **Use temperature 0.0** for extraction tasks requiring consistency
3. **Keep prompts simple** - Inline format descriptions work better than schema dumps
4. **Strip markdown code blocks** as a fallback for higher temperatures
5. **Provide fallback regex** for critical data when LLM fails
6. **Validate output** - Check for required fields, correct types, reasonable values

## Docker Networking

When running scrapers in Docker containers, use `host.docker.internal:11434`
to reach Ollama running on the host machine, not `localhost:11434`.

```python
# In docker-compose.yml or .env
OLLAMA_API_URL=http://host.docker.internal:11434
```

## Example Usage

```python
from llm import LLMClient

async def extract_sightings(text: str) -> dict:
    async with LLMClient() as client:
        result = await client.extract(text)
        return result
```

## Future Work

- Test with larger models (glm-5, deepseek-v3) when available locally
- Benchmark extraction accuracy across model sizes
- Develop specialized prompts for different source types (narrative vs. structured)