from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from ...core.database import get_db
from ...models.player import Player
from ...models.stats import PlayerStats
from ...services.scouting import generate_scouting_report, compare_players

router = APIRouter(prefix="/scouting", tags=["scouting"])

CURRENT_SEASON = "2025-26"


@router.get("/report/{player_id}")
async def scouting_report(
    player_id: UUID,
    season: str = Query(CURRENT_SEASON),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    sr = await db.execute(
        select(PlayerStats).where(PlayerStats.player_id == player_id, PlayerStats.season == season)
    )
    stat = sr.scalar_one_or_none()
    stats_dict = {c.name: getattr(stat, c.name) for c in stat.__table__.columns} if stat else {}

    report = await generate_scouting_report(player.full_name, stats_dict)
    return {"player": player.full_name, "season": season, "report": report}


@router.get("/compare")
async def compare(
    player_a_id: UUID = Query(...),
    player_b_id: UUID = Query(...),
    season: str = Query(CURRENT_SEASON),
    db: AsyncSession = Depends(get_db),
):
    async def _fetch(pid: UUID):
        pr = await db.execute(select(Player).where(Player.id == pid))
        p = pr.scalar_one_or_none()
        if not p:
            raise HTTPException(status_code=404, detail=f"Player {pid} not found")
        sr = await db.execute(
            select(PlayerStats).where(PlayerStats.player_id == pid, PlayerStats.season == season)
        )
        s = sr.scalar_one_or_none()
        stats = {c.name: getattr(s, c.name) for c in s.__table__.columns} if s else {}
        return p, stats

    pa, sa = await _fetch(player_a_id)
    pb, sb = await _fetch(player_b_id)
    analysis = await compare_players(pa.full_name, sa, pb.full_name, sb)
    return {"player_a": pa.full_name, "player_b": pb.full_name, "analysis": analysis}
