from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Build, User
from app.routers.builds import _serialize_public_build
from app.schemas import UserProfilePublic
from app.services.upvotes import user_total_upvotes

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{username}", response_model=UserProfilePublic)
async def get_public_user_profile(
    username: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(User).where(User.username == username.strip()))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

    count_result = await db.execute(
        select(func.count())
        .select_from(Build)
        .where(Build.user_id == user.id, Build.is_public == True)  # noqa: E712
    )
    public_builds_count = int(count_result.scalar_one())
    total_upvotes = await user_total_upvotes(db, user.id)

    builds_result = await db.execute(
        select(Build)
        .where(Build.user_id == user.id, Build.is_public == True)  # noqa: E712
        .order_by(Build.upvote_count.desc(), Build.updated_at.desc())
    )
    builds = list(builds_result.scalars().all())

    return {
        "username": user.username,
        "created_at": user.created_at,
        "public_builds_count": public_builds_count,
        "total_upvotes": total_upvotes,
        "builds": [_serialize_public_build(b, user.username) for b in builds],
    }
