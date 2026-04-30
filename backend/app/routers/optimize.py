from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.schemas import FullBuild, OptimizationRequest
from app.solver.cp_solver import SolverError
from app.solver.service import run_optimization_job

router = APIRouter(prefix="/optimize", tags=["optimize"])


@router.post("", response_model=FullBuild)
async def run_optimization(
    body: OptimizationRequest,
    db: AsyncSession = Depends(get_db),
) -> FullBuild:
    if body.mode != "solver":
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED,
            detail="Only mode='solver' is implemented (genetic / others: later).",
        )
    settings = get_settings()
    try:
        return await run_optimization_job(db, body, settings)
    except SolverError as e:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from e
