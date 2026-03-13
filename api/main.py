from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    return {"status": "healthy", "service": "pacifica-api"}


@app.get("/api/v1/tides")
async def get_tides():
    return {"message": "Tides endpoint - stub implementation"}


@app.get("/api/v1/conditions")
async def get_conditions():
    return {"message": "Conditions endpoint - stub implementation"}


@app.get("/api/v1/sightings")
async def get_sightings():
    return {"message": "Sightings endpoint - stub implementation"}


@app.get("/api/v1/activity-scores")
async def get_activity_scores():
    return {"message": "Activity scores endpoint - stub implementation"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=4900)
