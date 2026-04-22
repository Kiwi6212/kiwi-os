from datetime import datetime

from pydantic import BaseModel


class CurrentWeather(BaseModel):
    temperature: float
    apparent_temperature: float
    weather_code: int
    is_day: bool
    humidity: int
    wind_speed: float


class HourlyForecast(BaseModel):
    time: datetime
    temperature: float
    weather_code: int
    precipitation_probability: int


class DailyForecast(BaseModel):
    date: str
    temperature_max: float
    temperature_min: float
    weather_code: int
    precipitation_probability: int


class WeatherData(BaseModel):
    latitude: float
    longitude: float
    timezone: str
    current: CurrentWeather
    hourly: list[HourlyForecast]
    daily: list[DailyForecast]
    fetched_at: datetime
