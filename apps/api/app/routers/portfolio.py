"""Portfolio module: private CRUD + uploads + public read endpoint + GitHub sync.

The bio is a singleton (id=1). Projects can either be hand-curated or
sync'd from GitHub repos. The /public endpoint returns nothing if
`bio.public_enabled` is false — flipping that flag is the single switch
that makes the portfolio visible to the world.
"""

import datetime as dt
import re

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.github import GitHubAdapter
from app.core.config import get_settings
from app.core.database import get_db
from app.models.portfolio import PortfolioBio, PortfolioProject
from app.schemas.portfolio.bio import (
    PortfolioBioOut,
    PortfolioBioUpdate,
)
from app.schemas.portfolio.project import (
    PortfolioProjectCreate,
    PortfolioProjectOut,
    PortfolioProjectUpdate,
)
from app.services.upload_service import save_cv, save_photo, save_screenshot

router = APIRouter()

BIO_ID = 1

_SLUG_NON_ALNUM = re.compile(r"[^a-z0-9\s-]")
_SLUG_SEPARATORS = re.compile(r"[\s-]+")


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = _SLUG_NON_ALNUM.sub("", text)
    text = _SLUG_SEPARATORS.sub("-", text)
    return text.strip("-") or "project"


async def _get_or_create_bio(db: AsyncSession) -> PortfolioBio:
    result = await db.execute(
        select(PortfolioBio).where(PortfolioBio.id == BIO_ID)
    )
    bio = result.scalar_one_or_none()
    if bio is None:
        # Explicit empty defaults — the server_default is PG-only, so we
        # set them in Python too for portability (e.g. SQLite in tests).
        bio = PortfolioBio(
            id=BIO_ID,
            skills=[],
            education=[],
            experience=[],
            public_enabled=False,
        )
        db.add(bio)
        await db.flush()
    return bio


# ---------- BIO (singleton) ----------


@router.get("/bio", response_model=PortfolioBioOut)
async def get_bio(db: AsyncSession = Depends(get_db)) -> PortfolioBio:
    bio = await _get_or_create_bio(db)
    await db.commit()
    await db.refresh(bio)
    return bio


@router.patch("/bio", response_model=PortfolioBioOut)
async def update_bio(
    update: PortfolioBioUpdate,
    db: AsyncSession = Depends(get_db),
) -> PortfolioBio:
    bio = await _get_or_create_bio(db)
    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(bio, key, value)
    await db.commit()
    await db.refresh(bio)
    return bio


@router.post("/bio/photo", response_model=PortfolioBioOut)
async def upload_bio_photo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> PortfolioBio:
    url = await save_photo(file)
    bio = await _get_or_create_bio(db)
    bio.photo_url = url
    await db.commit()
    await db.refresh(bio)
    return bio


@router.post("/bio/cv", response_model=PortfolioBioOut)
async def upload_bio_cv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> PortfolioBio:
    url = await save_cv(file)
    bio = await _get_or_create_bio(db)
    bio.cv_url = url
    await db.commit()
    await db.refresh(bio)
    return bio


# ---------- PROJECTS ----------


@router.get("/projects", response_model=list[PortfolioProjectOut])
async def list_projects(
    db: AsyncSession = Depends(get_db),
) -> list[PortfolioProject]:
    result = await db.execute(
        select(PortfolioProject).order_by(
            PortfolioProject.display_order.desc(),
            PortfolioProject.created_at.desc(),
        )
    )
    return list(result.scalars().all())


@router.post(
    "/projects",
    response_model=PortfolioProjectOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_project(
    project: PortfolioProjectCreate,
    db: AsyncSession = Depends(get_db),
) -> PortfolioProject:
    payload = project.model_dump(by_alias=False)
    if not payload.get("slug"):
        payload["slug"] = _slugify(payload["name"])
    # Same portability concern as bio: server_default is PG-only.
    payload.setdefault("tech_stack", [])

    existing = await db.execute(
        select(PortfolioProject).where(PortfolioProject.slug == payload["slug"])
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Slug '{payload['slug']}' déjà utilisé",
        )

    new_project = PortfolioProject(**payload)
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    return new_project


@router.patch("/projects/{project_id}", response_model=PortfolioProjectOut)
async def update_project(
    project_id: int,
    update: PortfolioProjectUpdate,
    db: AsyncSession = Depends(get_db),
) -> PortfolioProject:
    result = await db.execute(
        select(PortfolioProject).where(PortfolioProject.id == project_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Projet non trouvé"
        )

    for key, value in update.model_dump(
        exclude_unset=True, by_alias=False
    ).items():
        setattr(project, key, value)

    await db.commit()
    await db.refresh(project)
    return project


@router.delete(
    "/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(PortfolioProject).where(PortfolioProject.id == project_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Projet non trouvé"
        )
    await db.delete(project)
    await db.commit()


@router.post(
    "/projects/{project_id}/screenshot", response_model=PortfolioProjectOut
)
async def upload_project_screenshot(
    project_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> PortfolioProject:
    result = await db.execute(
        select(PortfolioProject).where(PortfolioProject.id == project_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Projet non trouvé"
        )
    url = await save_screenshot(file)
    project.screenshot_url = url
    await db.commit()
    await db.refresh(project)
    return project


# ---------- GITHUB SYNC ----------


@router.post("/projects/sync-github")
async def sync_from_github(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    """Fetch the user's GitHub repos and upsert PortfolioProject rows.

    Never deletes. Manually-edited fields (description_long, screenshot,
    is_visible, is_featured, display_order) are preserved on update.
    Newly-created projects default to is_visible=False so the user can
    review before publishing.
    """
    settings = get_settings()
    token = (
        settings.github_token.get_secret_value()
        if settings.github_token
        else None
    )
    adapter = GitHubAdapter(
        token=token,
        username=settings.github_username,
        session_factory=getattr(request.app.state, "db_sessionmaker", None),
    )

    try:
        repos = await adapter.fetch_user_repos(limit=50)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur GitHub : {exc}",
        ) from exc
    finally:
        await adapter.aclose()

    created = 0
    updated = 0
    now = dt.datetime.now(dt.UTC)

    for repo in repos:
        repo_id = repo.get("id")
        if not isinstance(repo_id, int):
            continue

        existing_q = await db.execute(
            select(PortfolioProject).where(
                PortfolioProject.github_repo_id == repo_id
            )
        )
        existing = existing_q.scalar_one_or_none()

        if existing is not None:
            existing.repo_url = repo.get("html_url") or existing.repo_url
            existing.github_synced_at = now
            if not existing.tech_stack and repo.get("language"):
                existing.tech_stack = [repo["language"]]
            updated += 1
            continue

        slug = _slugify(repo.get("name") or f"repo-{repo_id}")
        collision = await db.execute(
            select(PortfolioProject).where(PortfolioProject.slug == slug)
        )
        if collision.scalar_one_or_none() is not None:
            slug = f"{slug}-{repo_id}"

        new_project = PortfolioProject(
            name=repo.get("name") or f"repo-{repo_id}",
            slug=slug,
            description_short=repo.get("description"),
            repo_url=repo.get("html_url"),
            tech_stack=[repo["language"]] if repo.get("language") else [],
            github_repo_id=repo_id,
            github_synced_at=now,
            is_visible=False,
            is_featured=False,
            display_order=0,
        )
        db.add(new_project)
        created += 1

    await db.commit()
    return {"created": created, "updated": updated, "total_repos": len(repos)}
