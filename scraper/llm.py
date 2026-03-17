"""LLM extraction client for wildlife scrapers.

Thin async wrapper around an OpenAI-compatible chat completions API.
Defaults to local Ollama. Falls back to regex heuristics on failure.
"""

import os
from typing import Callable

import httpx


SIGHTINGS_SCHEMA = {
    "type": "object",
    "properties": {
        "sightings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "species": {"type": "string"},
                    "count": {"type": "integer"},
                    "location_hint": {"type": "string"},
                    "behavior": {"type": "string"},
                },
                "required": ["species"],
            },
        }
    },
}


class LLMClient:
    """Async wrapper around OpenAI-compatible chat completions API."""

    def __init__(self, base_url: str | None = None, model: str | None = None):
        self.base_url = base_url or os.getenv(
            "OLLAMA_API_URL", "http://localhost:11434"
        )
        self.model = model or os.getenv("LLM_MODEL", "llama3.2:1b")
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=60.0)
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self) -> "LLMClient":
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        await self.close()

    async def extract(
        self,
        raw_text: str,
        schema: dict,
        fallback_fn: Callable[[str], dict] | None = None,
    ) -> dict:
        """Extract structured data from raw text using LLM.

        Args:
            raw_text: The unstructured text to extract from.
            schema: JSON schema describing the expected output structure.
            fallback_fn: Optional function to call if LLM fails.

        Returns:
            Extracted data matching the schema, or empty dict on failure
            (calls fallback_fn if provided).
        """
        client = await self._get_client()

        prompt = f"""Extract structured data from the following wildlife sighting report.
Return ONLY valid JSON matching this schema:
{schema}

Text to extract from:
{raw_text}"""

        try:
            response = await client.post(
                f"{self.base_url}/v1/chat/completions",
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a data extraction assistant. Extract structured data and return only valid JSON.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.1,
                },
            )
            response.raise_for_status()
            data = response.json()

            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            import json

            return json.loads(content)
        except Exception as e:
            print(f"[LLMClient] Extraction failed: {e}")
            if fallback_fn is not None:
                try:
                    return fallback_fn(raw_text)
                except Exception as fallback_error:
                    print(f"[LLMClient] Fallback also failed: {fallback_error}")
            return {}
