import logging

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.adapters.weather import WeatherAdapter
from app.schemas.weather import WeatherData
from app.services.weather import get_weather

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=WeatherData)
async def get_weather_forecast(
    request: Request,
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
) -> WeatherData:
    redis = request.app.state.redis
    adapter = WeatherAdapter()
    try:
        return await get_weather(adapter, redis, lat, lon)
    except Exception as exc:
        logger.exception("Failed to fetch weather forecast")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather API unreachable",
        ) from exc
    finally:
        await adapter.aclose()
