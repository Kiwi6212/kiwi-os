from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RSSItemBase(BaseModel):
    feed_id: int
    title: str
    link: str
    description: str | None = None
    author: str | None = None
    guid: str | None = None
    published_at: datetime | None = None
    is_read: bool = False
    is_favorited: bool = False


class RSSItemUpdate(BaseModel):
    is_read: bool | None = None
    is_favorited: bool | None = None


class RSSItemOut(RSSItemBase):
    id: int
    created_at: datetime
    feed_name: str | None = None
    feed_category: str | None = None

    model_config = ConfigDict(from_attributes=True)
