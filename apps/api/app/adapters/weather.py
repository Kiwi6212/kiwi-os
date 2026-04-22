from typing import Any

import httpx


class WeatherAdapter:
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            timeout=10.0,
            headers={"User-Agent": "kiwi-os/0.1.0"},
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
        response = await self._client.get(self.BASE_URL, params=params)
        response.raise_for_status()
        return response.json()

    async def aclose(self) -> None:
        await self._client.aclose()
