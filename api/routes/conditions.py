"""Conditions API routes."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, Location, Condition
from schemas import WaterTemperatureReading, WaterTemperatureResponse
from logging_config import get_logger

router = APIRouter(prefix="/api", tags=["conditions"])
logger = get_logger("api.conditions")


def fahrenheit_to_celsius(f: float) -> float:
    """Convert Fahrenheit to Celsius."""
    return round((f - 32) * 5 / 9, 1)


@router.get("/conditions/water-temp", response_model=WaterTemperatureResponse)
async def get_water_temperature(
    location_id: int = Query(3, description="Location ID (default: 3 = Santa Monica)"),
    hours: int = Query(48, description="Hours of historical data", ge=1, le=168),
    db: AsyncSession = Depends(get_db),
):
    """
    Get water temperature for a specific location.

    Returns the current (most recent) water temperature along with
    historical readings for the specified time window.
    """
    logger.info(
        "Water temperature endpoint called",
        location_id=location_id,
        hours=hours,
    )

    # Get location info
    location_result = await db.execute(
        select(Location).where(Location.id == location_id)
    )
    location = location_result.scalar_one_or_none()

    if not location:
        raise HTTPException(
            status_code=404,
            detail=f"Location not found: {location_id}",
        )

    # Calculate time window
    now = datetime.now(timezone.utc)
    start_time = now - timedelta(hours=hours)

    # Query water temperature conditions for this location
    result = await db.execute(
        select(Condition)
        .where(Condition.location_id == location_id)
        .where(Condition.condition_type == "water_temp")
        .where(Condition.timestamp >= start_time)
        .where(Condition.timestamp <= now)
        .order_by(desc(Condition.timestamp))
    )
    conditions = result.scalars().all()

    # Convert to Pydantic models
    history = [
        WaterTemperatureReading(
            timestamp=cond.timestamp,
            temperature_f=float(cond.value),
            source=cond.source,
            source_url=cond.source_url,
        )
        for cond in conditions
    ]

    # Get the most recent reading (current temperature)
    current = history[0] if history else None

    current_temp_f = current.temperature_f if current else None
    current_temp_c = fahrenheit_to_celsius(current_temp_f) if current_temp_f else None

    return WaterTemperatureResponse(
        location_id=location_id,
        location_name=location.name,
        current_temp_f=current_temp_f,
        current_temp_c=current_temp_c,
        source=current.source if current else None,
        source_url=current.source_url if current else None,
        last_updated=current.timestamp if current else None,
        history=history,
        hours_requested=hours,
        readings_count=len(history),
    )
