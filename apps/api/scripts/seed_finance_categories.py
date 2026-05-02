"""Seed default finance categories. Idempotent — exits cleanly if already seeded."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Ensure 'app' is importable when this script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.core.database import create_engine, create_session_factory  # noqa: E402
from app.models.finance.category import Category, CategoryType  # noqa: E402


DEFAULT_CATEGORIES: list[dict[str, str]] = [
    # Expenses
    {"name": "Logement", "icon": "🏠", "color": "#ef4444", "type": "expense"},
    {"name": "Alimentation", "icon": "🛒", "color": "#f59e0b", "type": "expense"},
    {"name": "Transport", "icon": "🚗", "color": "#3b82f6", "type": "expense"},
    {"name": "Santé", "icon": "💊", "color": "#10b981", "type": "expense"},
    {"name": "Loisirs", "icon": "🎮", "color": "#8b5cf6", "type": "expense"},
    {"name": "Restaurants", "icon": "🍽️", "color": "#ec4899", "type": "expense"},
    {"name": "Shopping", "icon": "🛍️", "color": "#f43f5e", "type": "expense"},
    {"name": "Abonnements", "icon": "📺", "color": "#6366f1", "type": "expense"},
    {"name": "Études", "icon": "📚", "color": "#14b8a6", "type": "expense"},
    {"name": "Autres dépenses", "icon": "💸", "color": "#94a3b8", "type": "expense"},
    # Income
    {"name": "Salaire", "icon": "💼", "color": "#22c55e", "type": "income"},
    {"name": "Bourse / Aides", "icon": "🎓", "color": "#84cc16", "type": "income"},
    {"name": "Remboursements", "icon": "↩️", "color": "#06b6d4", "type": "income"},
    {"name": "Autres revenus", "icon": "💰", "color": "#a3e635", "type": "income"},
]


async def seed() -> None:
    engine = create_engine()
    session_factory = create_session_factory(engine)
    try:
        async with session_factory() as db:
            existing = await db.execute(
                select(Category).where(Category.is_system.is_(True))
            )
            if existing.scalars().first():
                print("System categories already exist. Skipping.")
                return

            for data in DEFAULT_CATEGORIES:
                cat = Category(
                    name=data["name"],
                    icon=data["icon"],
                    color=data["color"],
                    type=CategoryType(data["type"]),
                    is_system=True,
                )
                db.add(cat)

            await db.commit()
            print(f"Seeded {len(DEFAULT_CATEGORIES)} default categories.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
