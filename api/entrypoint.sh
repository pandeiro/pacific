#!/bin/bash
set -e

# Configure logging based on environment
export PYTHONUNBUFFERED=1

# Use structlog for all Python output
python3 << 'PYTHON'
import structlog
import logging
import sys

# Configure structlog for entrypoint
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger("entrypoint")

logger.info("================================")
logger.info("Pacifica API Container Starting")
logger.info("================================")

import psycopg2
import os
import time

database_url = os.getenv('DATABASE_URL', 'postgresql://pacifica:password@postgres:5432/pacifica').replace('postgresql+asyncpg', 'postgresql')
# Mask password for logging
masked_url = database_url.replace(database_url.split(':')[2].split('@')[0], '****')
logger.info("Waiting for PostgreSQL", database_url=masked_url)

connected = False
attempts = 0
max_attempts = 30

while not connected and attempts < max_attempts:
    try:
        conn = psycopg2.connect(database_url, connect_timeout=5)
        conn.close()
        connected = True
        logger.info("PostgreSQL connection successful", attempt=attempts + 1)
    except Exception as e:
        attempts += 1
        logger.info("PostgreSQL unavailable, retrying", attempt=attempts, max_attempts=max_attempts)
        time.sleep(2)

if not connected:
    logger.error("Failed to connect to PostgreSQL after max attempts")
    sys.exit(1)

logger.info("PostgreSQL is up!")
logger.info("Running database setup...")
PYTHON

# Run migrations and seed
python3 /app/run_migrations.py

# Start the application with JSON logging
logger.info("Starting API server...")
exec uvicorn main:app --host 0.0.0.0 --port 4900 --log-level info