from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.system_log import LogLevel
from app.services.system_logger import log_event


class WeatherAdapter:
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession] | None = None,
    ) -> None:
        self._session_factory = session_factory
        self._client = httpx.AsyncClient(
            timeout=10.0,
            headers={"User-Agent": "kiwi-os/0.1.0"},
        )

    async def _log_call(
        self, status_code: int, ok: bool, extra: dict[str, Any] | None = None
    ) -> None:
        if self._session_factory is None:
            return
        level = LogLevel.INFO if ok else LogLevel.ERROR
        message = (
            f"Open-Meteo forecast → {status_code}"
            if ok
            else f"Open-Meteo forecast failed ({status_code})"
        )
        context: dict[str, Any] = {"status": status_code}
        if extra:
            context.update(extra)
        await log_event(
            level=level,
            module="weather",
            message=message,
            context=context,
            session_factory=self._session_factory,
        )

    async def fetch_forecast(self, lat: float, lon: float) -> dict[str, Any]:
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m,wind_speed_10m",
            "hourly": "temperature_2m,weather_code,precipitation_probability",
            "daily": "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
            "timezone": "auto",
            "forecast_days": 3,
            "forecast_hours": 24,
        }
        try:
            response = await self._client.get(self.BASE_URL, params=params)
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            await self._log_call(
                exc.response.status_code,
                ok=False,
                extra={"lat": lat, "lon": lon},
            )
            raise
        await self._log_call(
            response.status_code, ok=True, extra={"lat": lat, "lon": lon}
        )
        return response.json()

    async def aclose(self) -> None:
        await self._client.aclose()
