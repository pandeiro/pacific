"""Locations API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, Location
from logging_config import get_logger

router = APIRouter(prefix="/api", tags=["locations"])
logger = get_logger("api.locations")


@router.get("/locations")
async def get_locations(db: AsyncSession = Depends(get_db)):
    """
    Get all coastal locations.

    Returns a list of all locations in the database with their
    metadata including coordinates, region, and station IDs.
    """
    logger.info("Locations endpoint called")

    result = await db.execute(select(Location).order_by(Location.name))
    locations = result.scalars().all()

    return [
        {
            "id": loc.id,
            "name": loc.name,
            "slug": loc.slug,
            "lat": float(loc.lat),
            "lng": float(loc.lng),
            "location_type": loc.location_type,
            "region": loc.region,
            "noaa_station_id": loc.noaa_station_id,
            "coastline_bearing": float(loc.coastline_bearing)
            if loc.coastline_bearing
            else None,
            "description": loc.description,
        }
        for loc in locations
    ]
