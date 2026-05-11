"""Settings → Data: full-DB JSON export + (purge-and-replace) import."""

from __future__ import annotations

import datetime as dt
import json
from io import BytesIO
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.application import Application
from app.models.finance.account import Account
from app.models.finance.budget import Budget
from app.models.finance.category import Category
from app.models.finance.subscription import Subscription
from app.models.finance.transaction import Transaction
from app.models.pomodoro_preference import PomodoroPreference
from app.models.task import Task
from app.models.time_entry import TimeEntry
from app.models.user_preference import UserPreference

router = APIRouter()

EXPORT_VERSION = "1.0"


def _serialize_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()
    if hasattr(value, "value") and not isinstance(value, (str, int, float, bool)):
        return value.value
    if isinstance(value, (str, int, float, bool, list, dict)):
        return value
    try:
        json.dumps(value)
        return value
    except (TypeError, ValueError):
        return str(value)


def _serialize_row(row: Any) -> dict[str, Any]:
    return {col.name: _serialize_value(getattr(row, col.name)) for col in row.__table__.columns}


@router.get("/export")
async def export_all_data(db: AsyncSession = Depends(get_db)) -> StreamingResponse:
    """Return the full per-user dataset as a downloadable JSON file."""
    export: dict[str, Any] = {
        "exported_at": dt.datetime.now(dt.UTC).isoformat(),
        "version": EXPORT_VERSION,
        "data": {},
    }

    pref_q = await db.execute(select(UserPreference).where(UserPreference.id == 1))
    pref = pref_q.scalar_one_or_none()
    if pref:
        export["data"]["user_preferences"] = _serialize_row(pref)

    pomo_q = await db.execute(select(PomodoroPreference).where(PomodoroPreference.id == 1))
    pomo = pomo_q.scalar_one_or_none()
    if pomo:
        export["data"]["pomodoro_preferences"] = _serialize_row(pomo)

    tasks_q = await db.execute(select(Task))
    export["data"]["tasks"] = [_serialize_row(t) for t in tasks_q.scalars().all()]

    entries_q = await db.execute(select(TimeEntry))
    export["data"]["time_entries"] = [_serialize_row(e) for e in entries_q.scalars().all()]

    apps_q = await db.execute(select(Application))
    export["data"]["applications"] = [_serialize_row(a) for a in apps_q.scalars().all()]

    accounts_q = await db.execute(select(Account))
    export["data"]["accounts"] = [_serialize_row(a) for a in accounts_q.scalars().all()]

    categories_q = await db.execute(select(Category))
    export["data"]["categories"] = [_serialize_row(c) for c in categories_q.scalars().all()]

    tx_q = await db.execute(select(Transaction))
    export["data"]["transactions"] = [_serialize_row(t) for t in tx_q.scalars().all()]

    subs_q = await db.execute(select(Subscription))
    export["data"]["subscriptions"] = [_serialize_row(s) for s in subs_q.scalars().all()]

    budgets_q = await db.execute(select(Budget))
    export["data"]["budgets"] = [_serialize_row(b) for b in budgets_q.scalars().all()]

    payload = json.dumps(export, ensure_ascii=False, indent=2).encode("utf-8")
    filename = f"kiwi-os-export-{dt.date.today().isoformat()}.json"

    return StreamingResponse(
        BytesIO(payload),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _coerce_datetime(value: Any) -> dt.datetime | None:
    if not isinstance(value, str):
        return None
    try:
        return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _coerce_date(value: Any) -> dt.date | None:
    if not isinstance(value, str):
        return None
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        as_dt = _coerce_datetime(value)
        return as_dt.date() if as_dt else None


def _clean_payload(
    row: dict[str, Any],
    *,
    drop: tuple[str, ...] = (),
    datetimes: tuple[str, ...] = (),
    dates: tuple[str, ...] = (),
) -> dict[str, Any]:
    out = {k: v for k, v in row.items() if k not in drop}
    for key in datetimes:
        if key in out and out[key] is not None:
            out[key] = _coerce_datetime(out[key])
    for key in dates:
        if key in out and out[key] is not None:
            out[key] = _coerce_date(out[key])
    return out


@router.post("/import", status_code=status.HTTP_200_OK)
async def import_data(
    file: UploadFile = File(...),
    confirm_replace: bool = Query(False),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Import a previously-exported JSON.

    With `confirm_replace=true`, child→parent purge runs first then everything
    is bulk-inserted. Without it, only `user_preferences` is upserted (safe).
    """
    if not file.filename or not file.filename.lower().endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must have a .json extension",
        )

    try:
        content = await file.read()
        payload = json.loads(content.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON: {exc}",
        ) from exc

    if "data" not in payload or not isinstance(payload["data"], dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid structure: 'data' field expected",
        )

    data: dict[str, Any] = payload["data"]
    counters: dict[str, int] = {}

    if confirm_replace:
        # Purge in child→parent order to respect FKs (cascade handles most,
        # but we are explicit for clarity).
        await db.execute(delete(Transaction))
        await db.execute(delete(Subscription))
        await db.execute(delete(Budget))
        await db.execute(delete(TimeEntry))
        await db.execute(delete(Task))
        await db.execute(delete(Application))
        await db.execute(delete(Account))
        # Keep system categories (seeded by migration); drop user-created.
        await db.execute(delete(Category).where(Category.is_system.is_(False)))
        await db.flush()

    # User preferences (singleton upsert)
    if "user_preferences" in data and isinstance(data["user_preferences"], dict):
        pref_data = data["user_preferences"]
        result = await db.execute(
            select(UserPreference).where(UserPreference.id == 1)
        )
        existing = result.scalar_one_or_none()
        clean = _clean_payload(pref_data, drop=("updated_at",))
        if existing:
            for key, value in clean.items():
                if key != "id":
                    setattr(existing, key, value)
        else:
            db.add(UserPreference(**clean))
        counters["user_preferences"] = 1

    if confirm_replace:
        # Pomodoro singleton — overwrite
        if "pomodoro_preferences" in data and isinstance(
            data["pomodoro_preferences"], dict
        ):
            await db.execute(delete(PomodoroPreference))
            await db.flush()
            clean = _clean_payload(
                data["pomodoro_preferences"], drop=("updated_at",)
            )
            db.add(PomodoroPreference(**clean))
            counters["pomodoro_preferences"] = 1

        for row in data.get("accounts", []):
            clean = _clean_payload(row, drop=("created_at",))
            db.add(Account(**clean))
        counters["accounts"] = len(data.get("accounts", []))

        for row in data.get("categories", []):
            if row.get("is_system"):
                continue
            clean = _clean_payload(row, drop=("created_at",))
            db.add(Category(**clean))
        counters["categories"] = sum(
            1 for r in data.get("categories", []) if not r.get("is_system")
        )

        for row in data.get("applications", []):
            clean = _clean_payload(
                row,
                drop=("created_at", "updated_at"),
                datetimes=("date_applied", "follow_up_date", "last_contact"),
            )
            db.add(Application(**clean))
        counters["applications"] = len(data.get("applications", []))

        for row in data.get("tasks", []):
            clean = _clean_payload(
                row,
                drop=("created_at", "updated_at"),
                datetimes=("deadline", "completed_at"),
            )
            db.add(Task(**clean))
        counters["tasks"] = len(data.get("tasks", []))

        for row in data.get("time_entries", []):
            clean = _clean_payload(
                row,
                drop=("created_at", "updated_at"),
                datetimes=("started_at", "ended_at"),
            )
            db.add(TimeEntry(**clean))
        counters["time_entries"] = len(data.get("time_entries", []))

        for row in data.get("transactions", []):
            clean = _clean_payload(
                row,
                drop=("created_at", "updated_at"),
                dates=("date",),
            )
            db.add(Transaction(**clean))
        counters["transactions"] = len(data.get("transactions", []))

        for row in data.get("subscriptions", []):
            clean = _clean_payload(
                row,
                drop=("created_at", "updated_at"),
                dates=("started_at", "ended_at"),
            )
            db.add(Subscription(**clean))
        counters["subscriptions"] = len(data.get("subscriptions", []))

        for row in data.get("budgets", []):
            clean = _clean_payload(row, drop=("created_at", "updated_at"))
            db.add(Budget(**clean))
        counters["budgets"] = len(data.get("budgets", []))

    await db.commit()

    return {
        "success": True,
        "imported": counters,
        "total": sum(counters.values()),
        "replaced": confirm_replace,
        "message": f"Imported {sum(counters.values())} entities",
    }
