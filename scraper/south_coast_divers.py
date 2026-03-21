"""South Coast Divers Scraper - Fetches dive condition reports from southcoastdivers.com."""

import asyncio
from datetime import datetime, timezone
from typing import List, Any, Optional
import httpx
import sys
import os
from bs4 import BeautifulSoup

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from base import BaseScraper
    from db import (
        get_db_session,
        get_location_by_slug,
        check_duplicate_dive_report,
        insert_conditions,
    )
    from llm import LLMClient
except ImportError:
    from scraper.base import BaseScraper
    from scraper.db import (
        get_db_session,
        get_location_by_slug,
        check_duplicate_dive_report,
        insert_conditions,
    )
    from scraper.llm import LLMClient


class SouthCoastDiversScraper(BaseScraper):
    """South Coast Divers dive report scraper implementation."""

    schedule = "0 */3 * * *"  # Every 3 hours
    url = "https://southcoastdivers.com/"
    location_slug = "shaws_cove"  # Laguna Beach area

    def __init__(self):
        super().__init__("south_coast_divers")

    async def scrape(self) -> List[Any]:
        """Fetch and process dive condition reports from South Coast Divers website."""
        print(f"[{self.name}] Starting scrape...")

        async with get_db_session() as session:
            location = await get_location_by_slug(session, self.location_slug)

        if not location:
            print(
                f"[{self.name}] Location '{self.location_slug}' not found in database!"
            )
            return []

        print(f"[{self.name}] Found location: {location.name} (ID: {location.id})")

        try:
            html_content = await self._fetch_page()
            print(f"[{self.name}] Fetched page ({len(html_content)} bytes)")
        except Exception as e:
            print(f"[{self.name}] Error fetching page: {e}")
            return []

        dive_report_text = self._extract_dive_report(html_content)

        if not dive_report_text:
            print(f"[{self.name}] No dive report found on page")
            return []

        print(f"[{self.name}] Extracted dive report ({len(dive_report_text)} chars)")

        async with get_db_session() as session:
            is_duplicate = await check_duplicate_dive_report(
                session, location.id, dive_report_text, hours=96
            )

            if is_duplicate:
                print(
                    f"[{self.name}] Duplicate report found (within last 96 hours), skipping"
                )
                return []

        timestamp = datetime.now(timezone.utc)
        records = []

        dive_report_record = {
            "timestamp": timestamp,
            "location_id": location.id,
            "condition_type": "dive_report",
            "value": 0,
            "unit": "text",
            "source": "south_coast_divers",
            "source_url": self.url,
            "raw_text": dive_report_text,
        }
        records.append(dive_report_record)
        print(f"[{self.name}] Archived dive report text")

        vis_range = None
        swell_range = None

        dive_report_id = None

        try:
            async with LLMClient() as llm_client:

                def fallback_extraction(text: str) -> dict:
                    """Fallback regex extraction for visibility and swell."""
                    import re

                    result = {"visibility": None, "swell": None}

                    # Extract visibility (viz, vis, visibility)
                    viz_patterns = [
                        r"(?:viz|vis|visibility)\s*(?:is|:)?\s*(\d+(?:\s*-\s*\d+)?)\s*(?:feet|ft)",
                        r"(\d+(?:\s*-\s*\d+)?)\s*(?:feet|ft)\s*(?:viz|vis|visibility)",
                        r"(?:estimate|see|bottom)\s*(?:for|at)?\s*(\d+(?:\s*-\s*\d+)?)\s*(?:feet|ft)",
                    ]
                    for pattern in viz_patterns:
                        match = re.search(pattern, text, re.IGNORECASE)
                        if match:
                            result["visibility"] = match.group(1).strip()
                            break

                    # Extract swell/surf
                    swell_patterns = [
                        r"(?:swell|surf)\s*(?:is|:)?\s*(\d+(?:\s*-\s*\d+)?(?:\+)?)\s*(?:feet|ft)",
                        r"(\d+(?:\s*-\s*\d+)?(?:\+)?)\s*(?:feet|ft)\s*(?:swell|surf)",
                        r"(?:surf|waves?)\s*(?:is|:)?\s*(\d+(?:\s*-\s*\d+)?(?:\+)?)",
                    ]
                    for pattern in swell_patterns:
                        match = re.search(pattern, text, re.IGNORECASE)
                        if match:
                            result["swell"] = match.group(1).strip()
                            break

                    return result

                conditions_data = await llm_client.extract(
                    dive_report_text, profile="dive-conditions"
                )
                print(f"[{self.name}] LLM extraction: {conditions_data}")

                # Validate LLM response format and use fallback if needed
                valid_format = isinstance(conditions_data, dict) and (
                    "visibility" in conditions_data or "swell" in conditions_data
                )

                # Check if values are valid (not nested dicts)
                if valid_format:
                    vis = conditions_data.get("visibility")
                    swell = conditions_data.get("swell")
                    if (vis is not None and not isinstance(vis, (str, int, float))) or (
                        swell is not None and not isinstance(swell, (str, int, float))
                    ):
                        valid_format = False

                if not valid_format:
                    print(
                        f"[{self.name}] LLM returned invalid format, using fallback extraction"
                    )
                    conditions_data = fallback_extraction(dive_report_text)
                    print(f"[{self.name}] Fallback extraction: {conditions_data}")

                # Process the extraction results
                if conditions_data is None or not isinstance(conditions_data, dict):
                    print(
                        f"[{self.name}] ERROR: LLM returned invalid response type: {type(conditions_data)}"
                    )
                    print(
                        f"[{self.name}] Dive report will be archived without extraction"
                    )
                elif (
                    "visibility" not in conditions_data
                    and "swell" not in conditions_data
                ):
                    print(
                        f"[{self.name}] WARNING: LLM returned empty extraction (no visibility/swell found)"
                    )
                    print(f"[{self.name}] Raw response: {conditions_data}")
                else:
                    vis_range = conditions_data.get("visibility")
                    swell_range = conditions_data.get("swell")
                    dive_report_id = records[0].get("id") if records else None
        except Exception as e:
            print(f"[{self.name}] ERROR: LLM extraction failed: {e}")
            print(f"[{self.name}] Dive report will be archived without extraction")
            if records:
                dive_report_id = records[0].get("id") if records else None
                print(f"[{self.name}] Dive report ID: {dive_report_id}")

        def parse_range(value: str) -> tuple:
            """Parse '10-15' → (10, 15) or '10' → (10, 10)"""
            if value is None:
                return None, None
            value = str(value).strip()
            if "-" in value:
                parts = value.split("-")
                try:
                    return int(parts[0].strip()), int(parts[1].strip())
                except (ValueError, IndexError):
                    return None, None
            try:
                v = int(float(value))
                return v, v
            except (ValueError, TypeError):
                return None, None

        if vis_range:
            vis_min, vis_max = parse_range(vis_range)
            if vis_min is not None:
                visibility_record = {
                    "timestamp": timestamp,
                    "location_id": location.id,
                    "condition_type": "visibility",
                    "value": vis_max,
                    "unit": "feet",
                    "source": "south_coast_divers",
                    "source_url": self.url,
                    "raw_text": f"Extracted from dive report",
                    "meta": {"visibility_min": vis_min, "visibility_max": vis_max},
                }
                records.append(visibility_record)
                print(f"[{self.name}] Extracted visibility: {vis_min}-{vis_max} ft")

        if swell_range:
            swell_min, swell_max = parse_range(swell_range)
            if swell_min is not None:
                swell_record = {
                    "timestamp": timestamp,
                    "location_id": location.id,
                    "condition_type": "swell",
                    "value": swell_max,
                    "unit": "feet",
                    "source": "south_coast_divers",
                    "source_url": self.url,
                    "raw_text": f"Extracted from dive report",
                    "meta": {"swell_min": swell_min, "swell_max": swell_max},
                }
                records.append(swell_record)
                print(f"[{self.name}] Extracted swell: {swell_min}-{swell_max} ft")

        print(f"[{self.name}] Persisting {len(records)} records to database...")
        async with get_db_session() as session:
            await insert_conditions(session, records)

        print(f"[{self.name}] Successfully persisted {len(records)} records")
        return records

    async def _fetch_page(self) -> str:
        """Fetch the South Coast Divers homepage HTML."""
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": (
                "text/html,application/xhtml+xml,application/xml;q=0.9,"
                "image/avif,image/webp,*/*;q=0.8"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.url, headers=headers, follow_redirects=True
            )
            response.raise_for_status()
            return response.text

    def _extract_dive_report(self, html_content: str) -> Optional[str]:
        """Extract dive report text from the first table after 'Here is the latest group post.'"""
        soup = BeautifulSoup(html_content, "html.parser")

        target_text = "Here is the latest group post."
        target_element = None

        for element in soup.find_all(string=True):
            if target_text in element.strip():
                target_element = element.parent
                break

        if not target_element:
            print(f"[{self.name}] Could not find target text '{target_text}'")
            return None

        table = target_element.find_next("table")

        if not table:
            print(f"[{self.name}] No table found after target element")
            return None

        texts = []
        for row in table.find_all("tr"):
            row_texts = []
            for cell in row.find_all(["td", "th"]):
                cell_text = cell.get_text(strip=True)
                if cell_text:
                    row_texts.append(cell_text)
            if row_texts:
                texts.append(" | ".join(row_texts))

        if not texts:
            return table.get_text(separator="\n", strip=True)

        return "\n".join(texts)


if __name__ == "__main__":

    async def main():
        scraper = SouthCoastDiversScraper()
        try:
            data = await scraper.run()
            print(f"Successfully scraped {len(data)} records")
            if data:
                print(f"Sample record:\n{data[0]['raw_text'][:500]}...")
        except Exception as e:
            print(f"Error running scraper: {e}")
            raise

    asyncio.run(main())
