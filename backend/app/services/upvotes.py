from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Build, BuildUpvote


async def user_total_upvotes(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.sum(Build.upvote_count), 0)).where(Build.user_id == user_id)
    )
    return int(result.scalar_one())


async def user_upvoted_build_ids(
    db: AsyncSession,
    user_id: uuid.UUID,
    build_ids: list[uuid.UUID],
) -> set[uuid.UUID]:
    if not build_ids:
        return set()
    result = await db.execute(
        select(BuildUpvote.build_id).where(
            BuildUpvote.user_id == user_id,
            BuildUpvote.build_id.in_(build_ids),
        )
    )
    return set(result.scalars().all())
