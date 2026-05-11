from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.system_log import LogLevel


class SystemLogOut(BaseModel):
    id: int
    timestamp: datetime
    level: LogLevel
    module: str
    message: str
    context: dict[str, Any] | None
    http_method: str | None
    http_path: str | None
    http_status: int | None

    model_config = ConfigDict(from_attributes=True)


class LogStatsByLevel(BaseModel):
    level: LogLevel
    count_24h: int
    count_7d: int


class LogStats(BaseModel):
    total: int
    by_level: list[LogStatsByLevel]
    by_module: dict[str, int]
    most_recent_error: datetime | None


class IntegrationStatus(BaseModel):
    name: str
    healthy: bool
    last_check: datetime
    message: str
    details: dict[str, Any] | None = None
