import logging
from datetime import UTC, datetime

from redis.asyncio import Redis

from app.adapters.weather import WeatherAdapter
from app.core.cache import get_or_set_json
from app.schemas.weather import (
    CurrentWeather,
    DailyForecast,
    HourlyForecast,
    WeatherData,
)

logger = logging.getLogger(__name__)

_CACHE_TTL_SECONDS = 600


async def get_weather(
    adapter: WeatherAdapter,
    redis: Redis,
    lat: float,
    lon: float,
) -> WeatherData:
    lat_rounded = round(lat, 2)
    lon_rounded = round(lon, 2)

    async def fetch() -> WeatherData:
        raw = await adapter.fetch_forecast(lat_rounded, lon_rounded)

        current_raw = raw["current"]
        current = CurrentWeather(
            temperature=current_raw["temperature_2m"],
            apparent_temperature=current_raw["apparent_temperature"],
            weather_code=current_raw["weather_code"],
            is_day=bool(current_raw["is_day"]),
            humidity=current_raw["relative_humidity_2m"],
            wind_speed=current_raw["wind_speed_10m"],
        )

        hourly_raw = raw["hourly"]
        now = datetime.now(UTC).astimezone()
        hourly: list[HourlyForecast] = []
        for i, time_str in enumerate(hourly_raw["time"]):
            t = datetime.fromisoformat(time_str)
            if t.replace(tzinfo=None) < now.replace(tzinfo=None):
                continue
            if t.replace(tzinfo=None).date() > now.date():
                break
            hourly.append(
                HourlyForecast(
                    time=t,
                    temperature=hourly_raw["temperature_2m"][i],
                    weather_code=hourly_raw["weather_code"][i],
                    precipitation_probability=hourly_raw["precipitation_probability"][i] or 0,
                )
            )

        daily_raw = raw["daily"]
        daily: list[DailyForecast] = []
        for i in range(len(daily_raw["time"])):
            daily.append(
                DailyForecast(
                    date=daily_raw["time"][i],
                    temperature_max=daily_raw["temperature_2m_max"][i],
                    temperature_min=daily_raw["temperature_2m_min"][i],
                    weather_code=daily_raw["weather_code"][i],
                    precipitation_probability=daily_raw["precipitation_probability_max"][i] or 0,
                )
            )

        return WeatherData(
            latitude=lat_rounded,
            longitude=lon_rounded,
            timezone=raw.get("timezone", "UTC"),
            current=current,
            hourly=hourly,
            daily=daily,
            fetched_at=datetime.now(UTC),
        )

    return await get_or_set_json(
        redis=redis,
        key=f"weather:{lat_rounded}:{lon_rounded}",
        ttl_seconds=_CACHE_TTL_SECONDS,
        model=WeatherData,
        fetch=fetch,
    )
