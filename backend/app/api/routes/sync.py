"""
Sync routes — pull fresh data from ESPN (rosters) + stats.nba.com (stats) into the local DB.
ESPN is used for rosters because it reflects trades/signings in real-time.
"""
import logging
import asyncio
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ...core.database import get_db
from ...data import nba_client
from ...models.team import Team
from ...models.player import Player
from ...models.stats import PlayerStats

ESPN_TEAMS_URL  = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=40"
ESPN_ROSTER_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{team_id}/roster"
ESPN_HEADERS    = {"User-Agent": "Mozilla/5.0"}

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/sync", tags=["sync"])

CURRENT_SEASON = "2025-26"
_last_sync: datetime | None = None


async def _run_full_sync() -> None:
    global _last_sync
    from ...core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        await _sync_teams(session)
        await _sync_rosters(session)
        await _sync_stats(session)
        await session.commit()
    _last_sync = datetime.now(timezone.utc)


async def maybe_auto_sync() -> None:
    global _last_sync
    if _last_sync and (datetime.now(timezone.utc) - _last_sync) < timedelta(hours=12):
        return
    logger.info("Auto-syncing NBA data...")
    await _run_full_sync()
    logger.info("NBA auto-sync complete")


async def force_sync() -> None:
    """Always runs — bypasses the throttle. Used by the daily background loop."""
    logger.info("Force sync: pulling fresh rosters and stats from stats.nba.com...")
    await _run_full_sync()
    logger.info("Force sync complete.")


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


async def _fetch_espn_team_map() -> dict[str, str]:
    """Returns {abbreviation → espn_team_id} for all 30 NBA teams."""
    async with httpx.AsyncClient(headers=ESPN_HEADERS, timeout=15) as client:
        r = await client.get(ESPN_TEAMS_URL)
        r.raise_for_status()
    raw = r.json()["sports"][0]["leagues"][0]["teams"]
    return {t["team"]["abbreviation"]: t["team"]["id"] for t in raw}


async def _fetch_espn_roster(espn_team_id: str) -> list[dict]:
    """Returns list of athlete dicts from ESPN for one team."""
    url = ESPN_ROSTER_URL.format(team_id=espn_team_id)
    async with httpx.AsyncClient(headers=ESPN_HEADERS, timeout=15) as client:
        r = await client.get(url)
        r.raise_for_status()
    return r.json().get("athletes", [])


async def _sync_rosters(db: AsyncSession) -> None:
    """
    Pull live rosters from ESPN — reflects trades, signings, and draft picks
    immediately (no season-lag like stats.nba.com).
    """
    teams_result = await db.execute(select(Team))
    teams = teams_result.scalars().all()

    try:
        espn_map = await _fetch_espn_team_map()
    except Exception as e:
        logger.error("Could not fetch ESPN team map: %s", e)
        return

    for team in teams:
        abbr = team.abbreviation
        espn_id = espn_map.get(abbr)
        if not espn_id:
            # Try a few known abbreviation mismatches
            alt = {"BKN": "17", "NOP": "3", "UTA": "26", "GS": "9", "NY": "18", "SA": "24"}
            espn_id = alt.get(abbr)
        if not espn_id:
            logger.warning("No ESPN ID for team %s (%s)", team.full_name, abbr)
            continue

        try:
            athletes = await _fetch_espn_roster(espn_id)
        except Exception as e:
            logger.warning("ESPN roster fetch failed for %s: %s", team.full_name, e)
            await asyncio.sleep(0.5)
            continue

        for a in athletes:
            espn_player_id = int(a.get("id", 0))
            if not espn_player_id:
                continue

            # Match by ESPN id stored in nba_id, or fall back to name
            result = await db.execute(select(Player).where(Player.nba_id == espn_player_id))
            player = result.scalar_one_or_none()
            if not player:
                # Try matching by full name
                full_name = a.get("fullName", "")
                result2 = await db.execute(select(Player).where(Player.full_name == full_name))
                player = result2.scalar_one_or_none()
            if not player:
                player = Player(nba_id=espn_player_id)
                db.add(player)

            player.nba_id    = espn_player_id
            player.full_name = a.get("fullName", player.full_name or "")
            player.first_name = a.get("firstName", "")
            player.last_name  = a.get("lastName", "")
            player.team_id    = team.id
            player.status     = "active"
            player.jersey_number = a.get("jersey")
            pos = a.get("position", {})
            player.position = pos.get("abbreviation") if isinstance(pos, dict) else None

            # Height in inches → "6-7" format
            h = a.get("height")
            if h:
                feet, inches = divmod(int(h), 12)
                player.height = f"{feet}-{inches}"

            player.weight = int(a["weight"]) if a.get("weight") else None
            player.age    = int(a["age"])    if a.get("age")    else None

        await db.flush()
        await asyncio.sleep(0.3)

    logger.info("ESPN roster sync complete for %d teams", len(teams))


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
async def trigger_sync():
    await force_sync()
    return {"status": "ok", "synced_at": _last_sync.isoformat()}


@router.get("/status")
async def sync_status():
    return {
        "last_sync": _last_sync.isoformat() if _last_sync else None,
        "next_sync_in_hours": round(
            24 - (datetime.now(timezone.utc) - _last_sync).total_seconds() / 3600, 1
        ) if _last_sync else 0,
    }
