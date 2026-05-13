from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RSSFeedBase(BaseModel):
    name: str
    url: str
    category: str | None = None
    is_active: bool = True
    display_order: int = 0


class RSSFeedCreate(RSSFeedBase):
    pass


class RSSFeedUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    category: str | None = None
    is_active: bool | None = None
    display_order: int | None = None


class RSSFeedOut(RSSFeedBase):
    id: int
    last_synced_at: datetime | None = None
    last_error: str | None = None
    created_at: datetime
    updated_at: datetime
    unread_count: int = 0

    model_config = ConfigDict(from_attributes=True)
