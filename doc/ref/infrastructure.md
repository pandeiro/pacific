# Technical Reference: Infrastructure & Deployment

## 1. Environment Strategy
The project follows a "Configuration as Code" approach, with all secrets and environment-specific settings managed outside of version control.

### Configuration
- **Environment Variables**: Used for DB URLs, API keys, and service endpoints.
- **GitHub Secrets**: Source of truth for all sensitive variables (e.g., `GOOGLE_MAPS_API_KEY`, `SSH_PRIVATE_KEY`).
- **`.env.example`**: Maintained in the repo to document all required variables.

## 2. Docker Architecture
Orchestrated via `docker-compose.yml`:

```
┌─────────────────────────────────────────────────────────┐
│                        nginx                            │
│              (reverse proxy + static)                    │
│         pacifica.pch.onl :443                            │
└────────────┬──────────────────────────────┬─────────────┘
             │                              │
    ┌────────┴────────┐              ┌──────┴─────────┐
    │   Frontend      │              │   API Server    │
    │  (static build) │              │   (Python)      │
    │  React/Vite/TS  │              │   FastAPI       │
    └─────────────────┘              └────────┬────────┘
                                              │
                                      ┌───────┴────────┐
                                      │   PostgreSQL    │
                                      │  + TimescaleDB  │
                                      └───────┬────────┘
                                              │
    ┌────────────────┐              ┌─────────┴────────┐
    │  Scraper Worker│──────────────┘  Scheduler       │
    │  (Python)      │              │  (APScheduler)   │
    │  Direct writes │              └──────────────────┘
    └────────────────┘
```

### Services

| Service | Role | Database Access | Notes |
|---------|------|-----------------|-------|
| **nginx** | Reverse proxy, TLS, static serving | No | Serves frontend, proxies `/api` to API server |
| **frontend** | Static SPA | No | React app served by nginx |
| **api** | REST + WebSocket reads | **Read-only** | Serves data to frontend, WebSocket for live updates |
| **scraper** | Data collection | **Read-write** | Direct writes to DB within Docker network |
| **postgres** | Primary data store | N/A | PostgreSQL 16 + TimescaleDB |

### Key Design Decisions

1. **Scraper Direct Access**: Scrapers bypass the API layer and write directly to Postgres. This is safe because:
   - All scrapers run within the isolated Docker network
   - No external access to the database port
   - Single write pattern per data type (no conflicts)

2. **API Layer Responsibilities**:
   - **Read Operations**: All SELECT queries for the frontend
   - **Data Transformation**: Formatting, interpolation, and aggregation
   - **WebSocket Broadcast**: Receives internal notifications from scrapers and pushes to clients
   - **Health Checks**: Exposes `/api/health` endpoints

3. **Single Database Instance**: Both Production (`pch.onl`) and Staging (`staging.pch.onl`) read from the same PostgreSQL instance. They are differentiated by:
   - Different frontend containers
   - Separate API server containers
   - Same database (data is shared for both environments)

## 3. GitHub Actions CI/CD
The repository at `https://github.com/pandeiro/pacifica` uses GitHub Actions for automation.

### Pipelines
1. **Validation**: Linting, type-checking, and unit tests on every push.
2. **Preview (PR)**: Builds and deploys to `/staging` path on the VPS.
3. **Production (Main)**: Pushes built images to **GHCR** and deploys via SSH to the production server.

### Deployment Flow
- **Assets**: Built SPA files are synced to the VPS asset path (e.g., `/var/www/pacifica/prod/`).
- **Containers**: `docker compose pull && docker compose up -d` executed via SSH.
- **Health Verification**: Post-deployment scripts check `/api/health` before considering the deployment successful.

## 4. Staging vs. Production

| Aspect | Production | Staging |
|--------|------------|---------|
| **URL** | `https://pch.onl` | `https://staging.pch.onl` |
| **Frontend** | Served from `/prod/` | Served from `/staging/` |
| **API** | `api` container | `api-staging` container |
| **Database** | Shared (read-only) | Shared (read-only) |
| **Scrapers** | `scraper` container | `scraper-staging` container (optional) |

### Notes on Shared Database
- Staging is primarily for **UI/UX testing**, not data isolation
- Both environments see the same data
- Scrapers run once and write to the shared DB
- For true isolation, use separate schemas or database instances (future enhancement)

## 5. Testing Strategy

### Frontend Testing
- **agent-browser**: Used for high-level, agentic verification of dashboard functionality. Tests simulate user workflows and verify that tiles render correctly, data flows through WebSockets, and the UI responds to real-time updates.
- **Playwright**: Used for scraping workflows that require complex interactions (e.g., JavaScript-rendered pages, multi-step navigation). Scrapers that need full browser automation use Playwright directly.

### Backend Testing
- **pytest**: Unit tests for transformation logic, integration tests for database operations
- **VCR.py**: Records HTTP interactions for scraper tests

## 6. Local Development
See `doc/ref/local_dev.md` for local environment setup.