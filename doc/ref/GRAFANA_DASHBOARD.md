# Pacifica Grafana Dashboard

## Overview

A comprehensive Grafana dashboard for monitoring Pacifica's API, scrapers, and database health. Access at `http://localhost:3000/d/pacifica/pacifica-dashboard`.

## Features

### Health Status (Row 1)
| Panel | Data Source | Description |
|-------|-------------|-------------|
| **API Health** | Prometheus | Shows UP/DOWN status via `up{job="pacifica-api"}` |
| **Scraper Runs (24h)** | Loki | Total scraper executions from structured logs |
| **Successful Runs (24h)** | Loki | Successful `scrape_completed` events |
| **Failed Runs (24h)** | Loki | Failed `scrape_failed` events |
| **Records Scraped (24h)** | Loki | Total records ingested (from `records` field) |
| **DB Connections** | PostgreSQL Exporter | Active connections to `pacifica` database |

### API Performance (Row 2)
| Panel | Data Source | Description |
|-------|-------------|-------------|
| **Request Rate** | Prometheus | Requests/sec by HTTP status code |
| **Latency (p50/p95/p99)** | Prometheus | Request duration percentiles from `http_request_duration_seconds` |

### Scraper Performance (Row 3)
| Panel | Data Source | Description |
|-------|-------------|-------------|
| **Scraper Duration** | Loki | Average execution time per scraper (from `duration_ms` field) |
| **Records per Scraper** | Loki | Records ingested per scraper (from `records` field) |

### Database Metrics (Row 4)
| Panel | Data Source | Description |
|-------|-------------|-------------|
| **PostgreSQL Connections** | PostgreSQL Exporter | Connections by state (active, idle, etc.) |
| **Cache Hit Ratio** | PostgreSQL Exporter | Buffer cache efficiency (target: >95%) |
| **Rows Inserted (24h)** | PostgreSQL Exporter | Total row inserts |
| **Rows Fetched (24h)** | PostgreSQL Exporter | Total row reads |
| **Checkpoint Buffers (24h)** | PostgreSQL Exporter | Checkpoint write activity |

### Logs (Row 5)
| Panel | Data Source | Description |
|-------|-------------|-------------|
| **API Logs** | Loki | Structured logs from API container |
| **Scraper Logs** | Loki | Structured logs from scraper container |

### Error Tracking (Row 6)
| Panel | Data Source | Description |
|-------|-------------|-------------|
| **HTTP 5xx by Endpoint** | Prometheus | Server errors grouped by handler |
| **Scraper Failures Table** | Loki | Per-scraper failure counts (sortable) |

## Data Sources

| Source | Type | Purpose |
|--------|------|---------|
| `prometheus-ds` | Prometheus | API metrics (`http_*`), PostgreSQL exporter (`pg_*`), container metrics |
| `loki-ds` | Loki | Structured scraper logs (`scrape_completed`, `scrape_failed` events) |

## Structured Log Events

The dashboard parses these structlog events from scraper output:

| Event | Fields | Used By |
|-------|--------|---------|
| `scrape_started` | `scraper` | — |
| `scrape_completed` | `scraper`, `records`, `duration_ms` | All scraper panels |
| `scrape_failed` | `scraper`, `error`, `duration_ms` | Failure tracking |

## Requirements

- **Prometheus**: Scraping `pacifica-api` on `/metrics` (auto-instrumented by `prometheus-fastapi-instrumentator`)
- **PostgreSQL Exporter**: Sidecar on `:9187` connected to Pacifica database
- **Loki**: Receiving Docker logs with `app="pacifica"` label (via Alloy/docker-compose)
- **Scrapers**: Must emit structured logs with `LOG_FORMAT=json` in production

## Access

- **Link from Home**: Click "Pacifica" on the Grafana home dashboard
- **Direct URL**: `/d/pacifica/pacifica-dashboard`
- **Refresh**: 10 seconds (configurable)
- **Time Range**: Default 6 hours (configurable)
