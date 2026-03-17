"""LLM extraction client for wildlife scrapers.

Thin async wrapper around an OpenAI-compatible chat completions API.
Defaults to local Ollama. Falls back to regex heuristics on failure.

See doc/ref/llm_prompts.md for prompt engineering findings.
"""

import json
import os
import re
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

DEFAULT_SYSTEM_PROMPT = "Return only valid JSON."
DEFAULT_USER_PROMPT = """Extract wildlife sightings. Return JSON with "sightings" array containing objects with "species" (string) and "count" (integer) fields.

{text}"""


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
        system_prompt: str | None = None,
        user_prompt: str | None = None,
        fallback_fn: Callable[[str], dict] | None = None,
    ) -> dict:
        """Extract structured data from raw text using LLM.

        Args:
            raw_text: The unstructured text to extract from.
            system_prompt: Optional system prompt override.
            user_prompt: Optional user prompt template (use {text} placeholder).
            fallback_fn: Optional function to call if LLM fails.

        Returns:
            Extracted data as dict, or empty dict on failure
            (calls fallback_fn if provided).

        Note:
            See doc/ref/llm_prompts.md for prompt engineering findings.
            Key findings: Use simple prompts, temperature 0.0, short system
            message "Return only valid JSON." - this consistently produces
            raw JSON output without markdown code blocks.
        """
        client = await self._get_client()

        system = system_prompt or DEFAULT_SYSTEM_PROMPT
        user_template = user_prompt or DEFAULT_USER_PROMPT
        user = user_template.format(text=raw_text)

        try:
            response = await client.post(
                f"{self.base_url}/v1/chat/completions",
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.0,
                },
            )
            response.raise_for_status()
            data = response.json()

            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            content = content.strip()

            json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
            if json_match:
                content = json_match.group(1).strip()
            elif content.startswith("```"):
                content = re.sub(r"^```(?:json)?\s*", "", content)
                content = re.sub(r"\s*```$", "", content)

            return json.loads(content.strip())
        except Exception as e:
            print(f"[LLMClient] Extraction failed: {e}")
            if fallback_fn is not None:
                try:
                    return fallback_fn(raw_text)
                except Exception as fallback_error:
                    print(f"[LLMClient] Fallback also failed: {fallback_error}")
            return {}
