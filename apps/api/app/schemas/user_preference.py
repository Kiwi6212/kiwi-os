from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.user_preference import Locale, UIDensity


class UserPreferenceBase(BaseModel):
    ui_density: UIDensity = UIDensity.COMFORTABLE
    locale: Locale = Locale.FR
    display_name: str | None = None
    avatar_url: str | None = None
    weather_location_lat: float | None = None
    weather_location_lon: float | None = None
    weather_location_name: str | None = None
    github_username: str | None = None


class UserPreferenceUpdate(BaseModel):
    ui_density: UIDensity | None = None
    locale: Locale | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    weather_location_lat: float | None = None
    weather_location_lon: float | None = None
    weather_location_name: str | None = None
    github_username: str | None = None


class UserPreferenceOut(UserPreferenceBase):
    id: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
