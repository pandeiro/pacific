"""Base scraper class with retry logic, structured logging, and scrape_logs tracking."""

import os
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, List, Dict

import httpx
import structlog

from db import get_db_session, log_scrape_run

LOG_FORMAT = os.getenv("LOG_FORMAT", "pretty")

# Configure structlog for scraper (separate from API, same dual-mode pattern)
if LOG_FORMAT == "json":
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
else:
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer(colors=True),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(10),  # DEBUG
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


class BaseScraper(ABC):
    """Abstract base class for all Pacifica scrapers.

    Provides:
    - Shared httpx.AsyncClient with connection pooling
    - Structured logging via structlog
    - Automatic scrape_logs table tracking (started_at, finished_at, status, counts)
    - Context manager support
    """

    def __init__(self, name: str):
        self.name = name
        self.logger = structlog.get_logger(name)
        self.http_client = httpx.AsyncClient()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.http_client.aclose()

    @abstractmethod
    async def scrape(self) -> List[Dict[str, Any]]:
        """Scrape data from source. Must be implemented by subclasses."""
        pass

    async def run(self):
        """Execute the scraper with timing, logging, and scrape_logs tracking.

        Records a row in the scrape_logs table for every execution,
        whether it succeeds or fails. This enables Grafana panels
        for scraper health, duration, error rates, and data freshness.
        """
        started_at = datetime.now(timezone.utc)
        self.logger.info("scrape_started", scraper=self.name)

        try:
            data = await self.scrape()
            finished_at = datetime.now(timezone.utc)
            duration_ms = int((finished_at - started_at).total_seconds() * 1000)

            self.logger.info(
                "scrape_completed",
                scraper=self.name,
                records=len(data),
                duration_ms=duration_ms,
            )

            # Log success to scrape_logs
            try:
                async with get_db_session() as session:
                    await log_scrape_run(
                        session,
                        scraper_name=self.name,
                        started_at=started_at,
                        finished_at=finished_at,
                        status="success",
                        records_created=len(data),
                    )
            except Exception as log_err:
                self.logger.error(
                    "scrape_log_write_failed",
                    scraper=self.name,
                    error=str(log_err),
                )

            return data

        except Exception as e:
            finished_at = datetime.now(timezone.utc)
            duration_ms = int((finished_at - started_at).total_seconds() * 1000)

            self.logger.error(
                "scrape_failed",
                scraper=self.name,
                error=str(e),
                duration_ms=duration_ms,
            )

            # Log failure to scrape_logs
            try:
                async with get_db_session() as session:
                    await log_scrape_run(
                        session,
                        scraper_name=self.name,
                        started_at=started_at,
                        finished_at=finished_at,
                        status="failure",
                        error_message=str(e),
                    )
            except Exception as log_err:
                self.logger.error(
                    "scrape_log_write_failed",
                    scraper=self.name,
                    error=str(log_err),
                )

            raise
