from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.pomodoro_preference import PomodoroPreference
from app.schemas.pomodoro_preference import (
    PomodoroPreferenceOut,
    PomodoroPreferenceUpdate,
)

router = APIRouter()

PREF_ID = 1


@router.get("/preferences", response_model=PomodoroPreferenceOut)
async def get_preferences(
    db: AsyncSession = Depends(get_db),
) -> PomodoroPreference:
    result = await db.execute(
        select(PomodoroPreference).where(PomodoroPreference.id == PREF_ID)
    )
    pref = result.scalar_one_or_none()
    if pref is None:
        pref = PomodoroPreference(id=PREF_ID)
        db.add(pref)
        await db.commit()
        await db.refresh(pref)
    return pref


@router.patch("/preferences", response_model=PomodoroPreferenceOut)
async def update_preferences(
    payload: PomodoroPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
) -> PomodoroPreference:
    result = await db.execute(
        select(PomodoroPreference).where(PomodoroPreference.id == PREF_ID)
    )
    pref = result.scalar_one_or_none()
    if pref is None:
        pref = PomodoroPreference(id=PREF_ID)
        db.add(pref)
        await db.flush()

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(pref, field, value)

    await db.commit()
    await db.refresh(pref)
    return pref
