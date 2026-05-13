"""RSS reader: CRUD on feeds + items, manual sync, stats."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.rss import RSSFeed, RSSItem
from app.schemas.rss.feed import RSSFeedCreate, RSSFeedOut, RSSFeedUpdate
from app.schemas.rss.item import RSSItemOut, RSSItemUpdate
from app.services.rss_service import sync_all_feeds, sync_feed

router = APIRouter()


async def _annotate_feed(db: AsyncSession, feed: RSSFeed) -> dict[str, Any]:
    unread_q = await db.execute(
        select(func.count(RSSItem.id)).where(
            RSSItem.feed_id == feed.id,
            RSSItem.is_read.is_(False),
        )
    )
    out = RSSFeedOut.model_validate(feed).model_dump()
    out["unread_count"] = unread_q.scalar() or 0
    return out


# ---------- FEEDS ----------


@router.get("/feeds", response_model=list[RSSFeedOut])
async def list_feeds(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    result = await db.execute(
        select(RSSFeed).order_by(RSSFeed.display_order, RSSFeed.name)
    )
    feeds = list(result.scalars().all())
    return [await _annotate_feed(db, f) for f in feeds]


@router.post(
    "/feeds", response_model=RSSFeedOut, status_code=status.HTTP_201_CREATED
)
async def create_feed(
    feed: RSSFeedCreate, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    existing = await db.execute(
        select(RSSFeed).where(RSSFeed.url == feed.url)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Feed avec URL '{feed.url}' déjà existant",
        )

    new_feed = RSSFeed(**feed.model_dump())
    db.add(new_feed)
    await db.commit()
    await db.refresh(new_feed)
    return await _annotate_feed(db, new_feed)


@router.patch("/feeds/{feed_id}", response_model=RSSFeedOut)
async def update_feed(
    feed_id: int,
    update: RSSFeedUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(select(RSSFeed).where(RSSFeed.id == feed_id))
    feed = result.scalar_one_or_none()
    if feed is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Feed non trouvé"
        )

    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(feed, key, value)

    await db.commit()
    await db.refresh(feed)
    return await _annotate_feed(db, feed)


@router.delete("/feeds/{feed_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feed(
    feed_id: int, db: AsyncSession = Depends(get_db)
) -> None:
    result = await db.execute(select(RSSFeed).where(RSSFeed.id == feed_id))
    feed = result.scalar_one_or_none()
    if feed is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Feed non trouvé"
        )
    await db.delete(feed)
    await db.commit()


@router.post("/feeds/{feed_id}/sync")
async def sync_one_feed(
    feed_id: int, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    result = await db.execute(select(RSSFeed).where(RSSFeed.id == feed_id))
    feed = result.scalar_one_or_none()
    if feed is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Feed non trouvé"
        )
    return await sync_feed(db, feed)


@router.post("/sync-all")
async def sync_all(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    return await sync_all_feeds(db)


# ---------- ITEMS ----------


@router.get("/items", response_model=list[RSSItemOut])
async def list_items(
    db: AsyncSession = Depends(get_db),
    feed_id: int | None = Query(None),
    is_read: bool | None = Query(None),
    is_favorited: bool | None = Query(None),
    category: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[dict[str, Any]]:
    q = select(
        RSSItem,
        RSSFeed.name.label("feed_name"),
        RSSFeed.category.label("feed_category"),
    ).join(RSSFeed, RSSItem.feed_id == RSSFeed.id)

    if feed_id is not None:
        q = q.where(RSSItem.feed_id == feed_id)
    if is_read is not None:
        q = q.where(RSSItem.is_read.is_(is_read))
    if is_favorited is not None:
        q = q.where(RSSItem.is_favorited.is_(is_favorited))
    if category is not None:
        q = q.where(RSSFeed.category == category)

    q = (
        q.order_by(RSSItem.published_at.desc().nulls_last())
        .limit(limit)
        .offset(offset)
    )

    result = await db.execute(q)
    rows = result.all()

    out: list[dict[str, Any]] = []
    for item, feed_name, feed_category in rows:
        item_dict = RSSItemOut.model_validate(item).model_dump()
        item_dict["feed_name"] = feed_name
        item_dict["feed_category"] = feed_category
        out.append(item_dict)
    return out


@router.patch("/items/{item_id}", response_model=RSSItemOut)
async def update_item(
    item_id: int,
    update: RSSItemUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(select(RSSItem).where(RSSItem.id == item_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item non trouvé"
        )

    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(item, key, value)

    await db.commit()
    await db.refresh(item)
    return RSSItemOut.model_validate(item).model_dump()


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: int, db: AsyncSession = Depends(get_db)
) -> None:
    result = await db.execute(select(RSSItem).where(RSSItem.id == item_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item non trouvé"
        )
    await db.delete(item)
    await db.commit()


@router.get("/items/stats")
async def items_stats(db: AsyncSession = Depends(get_db)) -> dict[str, int]:
    total_q = await db.execute(select(func.count(RSSItem.id)))
    unread_q = await db.execute(
        select(func.count(RSSItem.id)).where(RSSItem.is_read.is_(False))
    )
    fav_q = await db.execute(
        select(func.count(RSSItem.id)).where(RSSItem.is_favorited.is_(True))
    )
    return {
        "total": total_q.scalar() or 0,
        "unread": unread_q.scalar() or 0,
        "favorited": fav_q.scalar() or 0,
    }
