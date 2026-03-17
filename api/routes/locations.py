"""Locations API routes."""

import math
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, Location
from logging_config import get_logger

router = APIRouter(prefix="/api", tags=["locations"])
logger = get_logger("api.locations")


def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in miles between two coordinates using Haversine formula."""
    R = 3959  # Earth's radius in miles

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def get_direction(lat1: float, lng1: float, lat2: float, lng2: float) -> str:
    """Get cardinal direction from point 1 to point 2."""
    delta_lat = lat2 - lat1
    delta_lng = lng2 - lng1

    # Calculate bearing
    bearing = math.atan2(delta_lng, delta_lat)
    bearing_deg = math.degrees(bearing)

    # Convert to cardinal direction
    directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    index = round(bearing_deg / 45) % 8
    return directions[index]


# NOAA station metadata (official coordinates from NOAA API)
NOAA_STATIONS = {
    "9410032": {"name": "San Clemente Island", "lat": 32.8833, "lng": -118.3167},
    "9410068": {"name": "San Nicolas Island", "lat": 33.2333, "lng": -119.5167},
    "9410079": {"name": "Avalon, Catalina Island", "lat": 33.35, "lng": -118.3167},
    "9410120": {"name": "Imperial Beach", "lat": 32.5833, "lng": -117.1333},
    "9410170": {"name": "San Diego", "lat": 32.7167, "lng": -117.1667},
    "9410230": {"name": "La Jolla", "lat": 32.8667, "lng": -117.25},
    "9410583": {"name": "Newport Beach", "lat": 33.6, "lng": -117.8833},
    "9410660": {"name": "Dana Point", "lat": 33.4667, "lng": -117.7},
    "9410680": {"name": "Long Beach", "lat": 33.7667, "lng": -118.1833},
    "9410738": {"name": "Redondo Beach", "lat": 33.85, "lng": -118.4},
    "9410777": {"name": "El Segundo", "lat": 33.9167, "lng": -118.4333},
    "9410840": {"name": "Santa Monica", "lat": 34.0167, "lng": -118.5},
    "9410962": {
        "name": "Bechers Bay, Santa Rosa Island",
        "lat": 34.0,
        "lng": -120.0167,
    },
    "9410971": {
        "name": "Prisoners Harbor, Santa Cruz Island",
        "lat": 34.0167,
        "lng": -119.6833,
    },
    "9411065": {"name": "Port Hueneme", "lat": 34.1667, "lng": -119.4},
    "9411189": {"name": "Ventura", "lat": 34.2667, "lng": -119.2833},
    "9411340": {"name": "Santa Barbara", "lat": 34.4, "lng": -119.6833},
    "9412110": {"name": "Port San Luis", "lat": 35.1689, "lng": -120.7542},
    "9412553": {"name": "San Simeon", "lat": 35.65, "lng": -121.1833},
}


def get_station_info(loc, station_map):
    """Get station info for a location, returning None if it's the same location."""
    if not loc.noaa_station_id or loc.noaa_station_id not in station_map:
        return None

    station = station_map[loc.noaa_station_id]
    distance = calculate_distance(
        float(loc.lat), float(loc.lng), station["lat"], station["lng"]
    )

    # Only return info if there's actual distance
    if distance < 0.1:
        return None

    # Use official NOAA station name if available
    station_name = NOAA_STATIONS.get(loc.noaa_station_id, {}).get(
        "name", station["name"]
    )

    return {
        "name": station_name,
        "distance_miles": round(distance, 1),
        "direction": get_direction(
            float(loc.lat), float(loc.lng), station["lat"], station["lng"]
        ),
    }


@router.get("/locations")
async def get_locations(db: AsyncSession = Depends(get_db)):
    """
    Get all coastal locations.

    Returns a list of all locations in the database with their
    metadata including coordinates, region, and station IDs.
    """
    logger.info("Locations endpoint called")

    # Get all locations
    result = await db.execute(select(Location).order_by(Location.name))
    locations = result.scalars().all()

    # Build a mapping of station IDs to official station coordinates
    # Use NOAA station coordinates (not surf spot locations)
    station_map = {}
    for loc in locations:
        if loc.noaa_station_id and loc.noaa_station_id not in station_map:
            # Use official NOAA station coordinates if available
            if loc.noaa_station_id in NOAA_STATIONS:
                station_data = NOAA_STATIONS[loc.noaa_station_id]
                station_map[loc.noaa_station_id] = {
                    "name": station_data["name"],
                    "lat": station_data["lat"],
                    "lng": station_data["lng"],
                }
            else:
                # Fallback to location coordinates for unknown stations
                station_map[loc.noaa_station_id] = {
                    "name": loc.name,
                    "lat": float(loc.lat),
                    "lng": float(loc.lng),
                }

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
            "station_info": get_station_info(loc, station_map),
        }
        for loc in locations
    ]
