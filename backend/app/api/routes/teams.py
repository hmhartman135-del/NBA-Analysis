from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from ...core.database import get_db
from ...models.team import Team
from ...models.player import Player

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("/")
async def list_teams(
    conference: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Team).order_by(Team.full_name)
    if conference:
        q = q.where(Team.conference == conference)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{team_id}")
async def get_team(team_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.get("/{team_id}/roster")
async def get_roster(team_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Player).where(Player.team_id == team_id).order_by(Player.position, Player.full_name)
    )
    return result.scalars().all()
