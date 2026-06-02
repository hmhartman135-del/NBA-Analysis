from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from ...core.database import get_db
from ...models.player import Player
from ...models.team import Team
from ...models.stats import PlayerStats
from ...services.analytics import enrich_player_stats
from ...data import nba_client

router = APIRouter(prefix="/analytics", tags=["analytics"])

CURRENT_SEASON = "2025-26"


def _best_stat(stats: list) -> object | None:
    """Prefer Playoffs row; fall back to Regular Season."""
    if not stats:
        return None
    for s in stats:
        if s.season_type == "Playoffs":
            return s
    return stats[0]


@router.get("/player/{player_id}")
async def player_analytics(
    player_id: UUID,
    season: str = Query(CURRENT_SEASON),
    season_type: str = Query("best"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Player not found")

    q = select(PlayerStats).where(PlayerStats.player_id == player_id, PlayerStats.season == season)
    if season_type != "best":
        q = q.where(PlayerStats.season_type == season_type)
    sr = await db.execute(q)
    stats = sr.scalars().all()
    stat = _best_stat(list(stats)) if season_type == "best" else (stats[0] if stats else None)

    if not stat:
        return {"player_id": str(player_id), "season": season, "stats": None}

    stat_dict = {c.name: getattr(stat, c.name) for c in stat.__table__.columns}
    return {"player_id": str(player_id), "name": player.full_name, "season": season,
            "season_type": stat.season_type, "stats": enrich_player_stats(stat_dict)}


@router.get("/leaderboard")
async def leaderboard(
    metric: str = Query("points"),
    season: str = Query(CURRENT_SEASON),
    season_type: str = Query("best"),
    limit: int = Query(25, le=600),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Player, PlayerStats)
        .join(PlayerStats, PlayerStats.player_id == Player.id)
        .where(PlayerStats.season == season)
    )
    if season_type != "best":
        q = q.where(PlayerStats.season_type == season_type)

    result = await db.execute(q)
    rows = result.all()

    seen: dict[str, dict] = {}
    for player, stat in rows:
        pid = str(player.id)
        stat_dict = {c.name: getattr(stat, c.name) for c in stat.__table__.columns}
        entry = {
            "player_id": pid,
            "name": player.full_name,
            "position": player.position,
            "team_id": str(player.team_id) if player.team_id else None,
            "season_type": stat.season_type,
            **enrich_player_stats(stat_dict),
        }
        if pid not in seen or stat.season_type == "Playoffs":
            seen[pid] = entry

    enriched = list(seen.values())
    if not enriched:
        return []

    key = metric if metric in enriched[0] else "points"
    enriched.sort(key=lambda x: x.get(key) or 0, reverse=True)
    return enriched[:limit]


@router.get("/team/{team_id}")
async def team_analytics(
    team_id: UUID,
    season: str = Query(CURRENT_SEASON),
    db: AsyncSession = Depends(get_db),
):
    """Team stats + league rankings + individual player stats."""
    tr = await db.execute(select(Team).where(Team.id == team_id))
    team = tr.scalar_one_or_none()
    if not team:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Team not found")

    # Fetch league-wide team stats from nba_api (has rank columns)
    all_team_stats = await nba_client.get_team_stats(season)
    all_def_stats = await nba_client.get_team_defensive_stats(season)

    team_stat = next((t for t in all_team_stats if t["TEAM_ID"] == team.nba_id), None)
    team_def = next((t for t in all_def_stats if t["TEAM_ID"] == team.nba_id), None)

    # Individual player stats for this team
    players_result = await db.execute(select(Player).where(Player.team_id == team_id))
    players = players_result.scalars().all()

    player_rows = []
    for p in players:
        sr = await db.execute(
            select(PlayerStats).where(PlayerStats.player_id == p.id, PlayerStats.season == season)
        )
        stats = sr.scalars().all()
        stat = _best_stat(list(stats))
        if stat:
            sd = {c.name: getattr(stat, c.name) for c in stat.__table__.columns}
            player_rows.append({
                "player_id": str(p.id),
                "name": p.full_name,
                "position": p.position,
                "jersey_number": p.jersey_number,
                "age": p.age,
                "season_type": stat.season_type,
                **enrich_player_stats(sd),
            })

    player_rows.sort(key=lambda x: x.get("minutes_per_game") or 0, reverse=True)

    return {
        "team_id": str(team_id),
        "team_name": team.full_name,
        "season": season,
        "team_stats": team_stat,
        "defensive_stats": team_def,
        "players": player_rows,
    }
