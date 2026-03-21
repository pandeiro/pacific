"""Scraper Scheduler - APScheduler-based orchestration for all Pacifica scrapers.

This module auto-discovers all scraper classes and schedules them according
to their `schedule` cron expressions.
"""

import asyncio
import importlib
import inspect
import os
import sys
from pathlib import Path

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

# Import BaseScraper to identify scraper classes
from base import BaseScraper

logger = structlog.get_logger("scheduler")


def discover_scrapers() -> list:
    """Auto-discover all scraper classes in the current directory.

    Returns a list of tuples: (scraper_class, schedule_cron)
    """
    scrapers = []
    current_dir = Path(__file__).parent

    # Get all Python files in the scraper directory (excluding base.py and scheduler.py)
    for file_path in current_dir.glob("*.py"):
        module_name = file_path.stem

        # Skip non-scraper files
        if module_name in ("base", "scheduler", "__init__", "logging_config"):
            continue

        try:
            # Import the module
            module = importlib.import_module(module_name)

            # Find all BaseScraper subclasses
            for name, obj in inspect.getmembers(module, inspect.isclass):
                if (
                    issubclass(obj, BaseScraper)
                    and obj is not BaseScraper
                    and hasattr(obj, "schedule")
                ):
                    schedule = getattr(obj, "schedule", None)
                    if schedule:
                        scrapers.append((obj, schedule))
                        logger.info(
                            "scraper_discovered",
                            scraper=name,
                            schedule=schedule,
                        )
                    else:
                        logger.warning(
                            "scraper_no_schedule",
                            scraper=name,
                        )

        except Exception as e:
            logger.error("module_load_failed", module=module_name, error=str(e))
            continue

    return scrapers


def parse_cron(cron_expr: str) -> dict:
    """Parse a cron expression into kwargs for APScheduler CronTrigger.

    Supports standard cron format: minute hour day month day_of_week
    Example: "0 2 * * *" = daily at 2:00 AM
    """
    parts = cron_expr.split()
    if len(parts) != 5:
        raise ValueError(f"Invalid cron expression: {cron_expr}. Expected 5 fields.")

    return {
        "minute": parts[0],
        "hour": parts[1],
        "day": parts[2],
        "month": parts[3],
        "day_of_week": parts[4],
    }


async def run_scraper(scraper_class, retry_count=0, max_retries=3):
    """Execute a single scraper run with retry logic."""
    scraper_name = scraper_class.__name__
    logger.info("scraper_running", scraper=scraper_name)

    try:
        scraper = scraper_class()
        records = await scraper.run()
        logger.info(
            "scraper_completed",
            scraper=scraper_name,
            records=len(records),
        )
        return True  # Success
    except Exception as e:
        logger.error(
            "scraper_failed",
            scraper=scraper_name,
            error=str(e),
            retry=retry_count,
        )
        # Don't re-raise - we want the scheduler to continue even if one scraper fails

        # Retry logic for transient failures (like database not ready)
        if retry_count < max_retries:
            retry_delay = 60 * (retry_count + 1)  # Exponential backoff: 60s, 120s, 180s
            logger.info(
                "scraper_retrying",
                scraper=scraper_name,
                delay_s=retry_delay,
                attempt=retry_count + 1,
                max_retries=max_retries,
            )
            await asyncio.sleep(retry_delay)
            return await run_scraper(scraper_class, retry_count + 1, max_retries)
        else:
            logger.error(
                "scraper_exhausted_retries",
                scraper=scraper_name,
                max_retries=max_retries,
            )
            return False  # Failed after retries


async def main():
    """Main entry point - set up and run the scheduler."""
    logger.info("scheduler_starting")

    # Discover all scrapers
    scrapers = discover_scrapers()

    if not scrapers:
        logger.error("no_scrapers_found")
        return

    logger.info("scrapers_loaded", count=len(scrapers))

    # Create the scheduler
    scheduler = AsyncIOScheduler()

    # Add each scraper to the scheduler
    for scraper_class, schedule in scrapers:
        try:
            cron_kwargs = parse_cron(schedule)
            trigger = CronTrigger(**cron_kwargs)

            # Add the job
            scheduler.add_job(
                run_scraper,
                trigger=trigger,
                args=[scraper_class],
                id=scraper_class.__name__,
                name=f"{scraper_class.__name__} scraper",
                replace_existing=True,
                max_instances=1,  # Don't run the same scraper concurrently
            )

            logger.info(
                "scraper_scheduled",
                scraper=scraper_class.__name__,
                cron=schedule,
            )

        except Exception as e:
            logger.error(
                "scraper_schedule_failed",
                scraper=scraper_class.__name__,
                error=str(e),
            )
            continue

    logger.info("scheduler_starting_jobs")
    scheduler.start()

    # Run immediately on startup for testing (optional - remove in production)
    logger.info("scheduler_startup_runs")
    for scraper_class, _ in scrapers:
        success = await run_scraper(scraper_class)
        if not success:
            logger.warning(
                "startup_run_failed",
                scraper=scraper_class.__name__,
            )

    logger.info("scheduler_running")

    # Keep the event loop running
    try:
        while True:
            await asyncio.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        logger.info("scheduler_shutting_down")
        scheduler.shutdown()
        logger.info("scheduler_stopped")


if __name__ == "__main__":
    asyncio.run(main())
