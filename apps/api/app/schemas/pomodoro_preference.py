from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PomodoroPreferenceUpdate(BaseModel):
    focus_duration_seconds: int | None = Field(None, ge=60, le=14400)
    short_break_seconds: int | None = Field(None, ge=60, le=3600)
    long_break_seconds: int | None = Field(None, ge=60, le=7200)
    cycles_before_long_break: int | None = Field(None, ge=1, le=10)


class PomodoroPreferenceOut(BaseModel):
    id: int
    focus_duration_seconds: int
    short_break_seconds: int
    long_break_seconds: int
    cycles_before_long_break: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
