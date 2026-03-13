"""Base scraper class with retry logic and common utilities.

This is a stub implementation. Full implementation will include:
- BaseScraper abstract class
- Retry logic with exponential backoff
- LLM extraction utilities
- Rate limiting
"""

from abc import ABC, abstractmethod
from typing import Any


class BaseScraper(ABC):
    """Abstract base class for all Pacifica scrapers."""

    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    async def scrape(self) -> list[dict[str, Any]]:
        """Scrape data from source. Must be implemented by subclasses."""
        pass

    async def run(self):
        """Execute the scraper."""
        print(f"[{self.name}] Starting scrape...")
        data = await self.scrape()
        print(f"[{self.name}] Scraped {len(data)} items")
        return data
