"""
Sync routes — pull fresh data from stats.nba.com into the local DB.
"""
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ...core.database import get_db
from ...data import nba_client
from ...models.team import Team
from ...models.player import Player
from ...models.stats import PlayerStats

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/sync", tags=["sync"])

CURRENT_SEASON = "2025-26"
_last_sync: datetime | None = None


async def maybe_auto_sync() -> None:
    global _last_sync
    if _last_sync and (datetime.now(timezone.utc) - _last_sync) < timedelta(hours=12):
        return
    logger.info("Auto-syncing NBA data...")
    from ...core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        await _sync_teams(session)
        await _sync_rosters(session)   # replaces _sync_players — gets team assignments + details
        await _sync_stats(session)
        await session.commit()
    _last_sync = datetime.now(timezone.utc)
    logger.info("NBA auto-sync complete")


async def _sync_teams(db: AsyncSession) -> None:
    teams = await nba_client.get_all_teams()
    for t in teams:
        result = await db.execute(select(Team).where(Team.nba_id == t["id"]))
        team = result.scalar_one_or_none()
        if not team:
            team = Team(nba_id=t["id"])
            db.add(team)
        team.full_name = t["full_name"]
        team.abbreviation = t["abbreviation"]
        team.city = t["city"]
        team.nickname = t["nickname"]
    await db.flush()


async def _sync_rosters(db: AsyncSession) -> None:
    """
    Pull CommonTeamRoster for every team — gives current roster with
    position, height, weight, jersey number, age, and team assignment.
    Rate-limit to avoid hammering stats.nba.com.
    """
    teams_result = await db.execute(select(Team))
    teams = teams_result.scalars().all()

    for team in teams:
        if not team.nba_id:
            continue
        try:
            roster_data = await nba_client.get_team_roster(team.nba_id, CURRENT_SEASON)
            rows = roster_data.get("CommonTeamRoster", [])
        except Exception as e:
            logger.warning("Roster fetch failed for %s: %s", team.full_name, e)
            await asyncio.sleep(1)
            continue

        for row in rows:
            nba_id = row.get("PLAYER_ID")
            if not nba_id:
                continue

            result = await db.execute(select(Player).where(Player.nba_id == nba_id))
            player = result.scalar_one_or_none()
            if not player:
                player = Player(nba_id=nba_id)
                db.add(player)

            player.full_name = row.get("PLAYER", player.full_name or "")
            # Split name into first/last
            parts = player.full_name.split(" ", 1)
            player.first_name = parts[0]
            player.last_name = parts[1] if len(parts) > 1 else ""

            player.team_id = team.id
            player.status = "active"
            player.jersey_number = row.get("NUM")
            player.position = row.get("POSITION")
            player.height = row.get("HEIGHT")
            player.weight = int(row["WEIGHT"]) if row.get("WEIGHT") else None
            player.age = int(row["AGE"]) if row.get("AGE") else None

            # Parse birth date  "APR 03, 1999" → date
            birth_str = row.get("BIRTH_DATE")
            if birth_str:
                try:
                    from datetime import date
                    import calendar
                    month_abbr, day_year = birth_str.split(" ", 1)
                    day, year = day_year.replace(",", "").split()
                    month = list(calendar.month_abbr).index(month_abbr.capitalize())
                    player.birth_date = date(int(year), month, int(day))
                except Exception:
                    pass

        await db.flush()
        await asyncio.sleep(0.6)   # be polite to stats.nba.com

    logger.info("Roster sync complete for %d teams", len(teams))


async def _upsert_stats(db: AsyncSession, rows: list[dict], season_type: str) -> None:
    for row in rows:
        nba_id = row.get("PLAYER_ID")
        result = await db.execute(select(Player).where(Player.nba_id == nba_id))
        player = result.scalar_one_or_none()
        if not player:
            continue

        sr = await db.execute(
            select(PlayerStats).where(
                PlayerStats.player_id == player.id,
                PlayerStats.season == CURRENT_SEASON,
                PlayerStats.season_type == season_type,
            )
        )
        stat = sr.scalar_one_or_none()
        if not stat:
            stat = PlayerStats(player_id=player.id, season=CURRENT_SEASON, season_type=season_type)
            db.add(stat)

        stat.games_played = row.get("GP")
        stat.games_started = row.get("GS")
        stat.minutes_per_game = row.get("MIN")
        stat.points = row.get("PTS")
        stat.rebounds = row.get("REB")
        stat.assists = row.get("AST")
        stat.steals = row.get("STL")
        stat.blocks = row.get("BLK")
        stat.turnovers = row.get("TOV")
        stat.fg_made = row.get("FGM")
        stat.fg_attempted = row.get("FGA")
        stat.fg_pct = row.get("FG_PCT")
        stat.three_made = row.get("FG3M")
        stat.three_attempted = row.get("FG3A")
        stat.three_pct = row.get("FG3_PCT")
        stat.ft_made = row.get("FTM")
        stat.ft_attempted = row.get("FTA")
        stat.ft_pct = row.get("FT_PCT")
        stat.off_rebounds = row.get("OREB")
        stat.def_rebounds = row.get("DREB")
        stat.plus_minus = row.get("PLUS_MINUS")


async def _sync_stats(db: AsyncSession) -> None:
    # Regular season
    rs_rows = await nba_client.get_league_player_stats(CURRENT_SEASON, "Regular Season")
    await _upsert_stats(db, rs_rows, "Regular Season")
    # Playoffs
    try:
        po_rows = await nba_client.get_league_player_stats(CURRENT_SEASON, "Playoffs")
        await _upsert_stats(db, po_rows, "Playoffs")
    except Exception as e:
        logger.warning("Playoff stats fetch failed: %s", e)


@router.post("/")
async def trigger_sync(db: AsyncSession = Depends(get_db)):
    global _last_sync
    await _sync_teams(db)
    await _sync_rosters(db)
    await _sync_stats(db)
    _last_sync = datetime.now(timezone.utc)
    return {"status": "ok", "synced_at": _last_sync.isoformat()}
