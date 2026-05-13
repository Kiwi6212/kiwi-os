"""Anonymous portfolio endpoint.

Lives in its own router so main.py can mount it WITHOUT the
get_current_user dependency that protects everything else under
/api/portfolio. The route is gated by the `bio.public_enabled` flag —
when false, the response is intentionally generic so the URL doesn't
leak the existence of a private portfolio.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.portfolio import PortfolioBio, PortfolioProject
from app.schemas.portfolio.bio import PortfolioBioPublic
from app.schemas.portfolio.project import PortfolioProjectPublic

router = APIRouter()

BIO_ID = 1


@router.get("/public")
async def get_public_portfolio(
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Anonymous read endpoint. Hidden behind ``bio.public_enabled``."""
    bio_q = await db.execute(
        select(PortfolioBio).where(PortfolioBio.id == BIO_ID)
    )
    bio = bio_q.scalar_one_or_none()

    if bio is None or not bio.public_enabled:
        return {
            "public_enabled": False,
            "bio": None,
            "projects": [],
            "message": "Ce portfolio n'est pas public.",
        }

    projects_q = await db.execute(
        select(PortfolioProject)
        .where(PortfolioProject.is_visible.is_(True))
        .order_by(
            PortfolioProject.is_featured.desc(),
            PortfolioProject.display_order.desc(),
            PortfolioProject.created_at.desc(),
        )
    )
    projects = list(projects_q.scalars().all())

    return {
        "public_enabled": True,
        "bio": PortfolioBioPublic.model_validate(bio).model_dump(),
        "projects": [
            PortfolioProjectPublic.model_validate(p).model_dump(by_alias=True)
            for p in projects
        ],
    }
