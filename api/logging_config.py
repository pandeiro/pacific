"""Structured logging configuration for Pacifica API."""

import logging
import sys
import os

import structlog


def configure_logging():
    """Configure structlog for JSON output."""
    log_format = os.getenv("LOG_FORMAT", "pretty")

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.ExtraAdder(),
    ]

    if log_format == "json":
        # Production: JSON output for Grafana/Loki
        structlog.configure(
            processors=shared_processors
            + [
                structlog.processors.dict_tracebacks,
                structlog.processors.JSONRenderer(),
            ],
            wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=True,
        )
    else:
        # Development: Pretty console output
        structlog.configure(
            processors=shared_processors
            + [
                structlog.dev.ConsoleRenderer(colors=True),
            ],
            wrapper_class=structlog.make_filtering_bound_logger(logging.DEBUG),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=True,
        )

    # Configure standard library logging to use structlog
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO,
    )

    # Make uvicorn use structlog
    logging.getLogger("uvicorn").handlers = [logging.StreamHandler(sys.stdout)]
    logging.getLogger("uvicorn.access").handlers = [logging.StreamHandler(sys.stdout)]


def get_logger(name: str = None):
    """Get a structured logger instance."""
    return structlog.get_logger(name)
