from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from logging_config import configure_logging, get_logger

# Configure logging on startup
configure_logging()
logger = get_logger("api")

app = FastAPI(title="Pacifica API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    logger.debug("Health check requested")
    return {"status": "healthy", "service": "pacifica-api"}


@app.get("/api/v1/tides")
async def get_tides():
    logger.info("Tides endpoint called")
    return {"message": "Tides endpoint - stub implementation"}


@app.get("/api/v1/conditions")
async def get_conditions():
    logger.info("Conditions endpoint called")
    return {"message": "Conditions endpoint - stub implementation"}


@app.get("/api/v1/sightings")
async def get_sightings():
    logger.info("Sightings endpoint called")
    return {"message": "Sightings endpoint - stub implementation"}


@app.get("/api/v1/activity-scores")
async def get_activity_scores():
    logger.info("Activity scores endpoint called")
    return {"message": "Activity scores endpoint - stub implementation"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=4900)
