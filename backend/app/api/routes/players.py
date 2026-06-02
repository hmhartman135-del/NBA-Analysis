from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from ...core.database import get_db
from ...models.player import Player
from ...models.team import Team

router = APIRouter(prefix="/players", tags=["players"])


@router.get("/")
async def list_players(
    status: str | None = Query(None),
    position: str | None = Query(None),
    team_id: UUID | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(100, le=5000),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    q = select(Player)
    if status:
        q = q.where(Player.status == status)
    if position:
        q = q.where(Player.position == position)
    if team_id:
        q = q.where(Player.team_id == team_id)
    if search:
        q = q.where(Player.full_name.ilike(f"%{search}%"))
    q = q.order_by(Player.full_name).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{player_id}")
async def get_player(player_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Player not found")
    return player
