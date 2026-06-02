from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from pydantic import BaseModel
from ...core.database import get_db
from ...models.team import Team
from ...models.player import Player
from ...models.stats import PlayerStats
from ...data import nba_client, contracts as contract_data
from ...services.free_agency import generate_offseason_plan, grade_mock_offseason

router = APIRouter(prefix="/free-agency", tags=["free-agency"])

CURRENT_SEASON = "2025-26"


async def _stat_dict(player_id: UUID, db: AsyncSession) -> dict:
    sr = await db.execute(
        select(PlayerStats).where(
            PlayerStats.player_id == player_id,
            PlayerStats.season == CURRENT_SEASON,
        )
    )
    rows = sr.scalars().all()
    stat = next((s for s in rows if s.season_type == "Playoffs"), rows[0] if rows else None)
    if not stat:
        return {}
    return {
        "points": stat.points,
        "rebounds": stat.rebounds,
        "assists": stat.assists,
        "steals": stat.steals,
        "blocks": stat.blocks,
        "fg_pct": round(stat.fg_pct * 100, 1) if stat.fg_pct else None,
        "three_pct": round(stat.three_pct * 100, 1) if stat.three_pct else None,
        "minutes": stat.minutes_per_game,
        "games": stat.games_played,
        "season_type": stat.season_type,
    }


# ── List free agents ──────────────────────────────────────────────────────────
@router.get("/list")
async def list_free_agents(
    position: str | None = Query(None),
    search: str | None = Query(None),
    fa_type: str | None = Query(None, description="UFA, Player Option, Team Option"),
    db: AsyncSession = Depends(get_db),
):
    fa_rows = await contract_data.get_free_agents_2026()

    result = []
    for fa in fa_rows:
        # Match to our player DB by name
        name = fa["name"]
        pr = await db.execute(
            select(Player).where(Player.full_name.ilike(name))
        )
        player = pr.scalar_one_or_none()

        # Fuzzy fallback — first + last name
        if not player:
            parts = name.split()
            if len(parts) >= 2:
                pr2 = await db.execute(
                    select(Player).where(
                        Player.first_name.ilike(parts[0]),
                        Player.last_name.ilike(parts[-1]),
                    )
                )
                player = pr2.scalar_one_or_none()

        stats = {}
        if player:
            stats = await _stat_dict(player.id, db)

        entry = {
            "player_id": str(player.id) if player else None,
            "name": name,
            "position": player.position if player else None,
            "age": player.age if player else None,
            "height": player.height if player else None,
            "current_team": fa["team"],
            "salary_2526": fa["salary"],
            "salary_int": fa["salary_int"],
            "fa_type": fa["fa_type"],
            **stats,
        }
        result.append(entry)

    # Filters
    if fa_type:
        result = [r for r in result if r["fa_type"] == fa_type]
    if position:
        result = [r for r in result if r.get("position") and position.upper() in r["position"].upper()]
    if search:
        result = [r for r in result if search.lower() in r["name"].lower()]

    # Sort by PPG desc
    result.sort(key=lambda x: x.get("points") or 0, reverse=True)
    return result


# ── AI offseason plan for a team ──────────────────────────────────────────────
@router.get("/team/{team_id}/plan")
async def offseason_plan(team_id: UUID, db: AsyncSession = Depends(get_db)):
    tr = await db.execute(select(Team).where(Team.id == team_id))
    team = tr.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Current roster
    pr = await db.execute(select(Player).where(Player.team_id == team_id))
    players = pr.scalars().all()
    roster = []
    for p in players:
        stats = await _stat_dict(p.id, db)
        roster.append({"name": p.full_name, "position": p.position, **stats})
    roster.sort(key=lambda x: x.get("minutes") or 0, reverse=True)

    # Team stats
    try:
        all_ts  = await nba_client.get_team_stats(CURRENT_SEASON)
        all_def = await nba_client.get_team_defensive_stats(CURRENT_SEASON)
        ts   = next((t for t in all_ts  if t["TEAM_ID"] == team.nba_id), {})
        defs = next((t for t in all_def if t["TEAM_ID"] == team.nba_id), {})
        team_stats = {**ts, **defs}
        record = f"{ts.get('W','?')}-{ts.get('L','?')}"
    except Exception:
        team_stats = {}
        record = "?"

    # Top FAs with stats (from real contract data)
    fa_rows = await contract_data.get_free_agents_2026()
    top_fas = []
    for fa in fa_rows:
        name = fa["name"]
        pr2 = await db.execute(select(Player).where(Player.full_name.ilike(name)))
        p2 = pr2.scalar_one_or_none()
        if not p2:
            parts = name.split()
            if len(parts) >= 2:
                pr3 = await db.execute(
                    select(Player).where(Player.first_name.ilike(parts[0]), Player.last_name.ilike(parts[-1]))
                )
                p2 = pr3.scalar_one_or_none()
        stats = await _stat_dict(p2.id, db) if p2 else {}
        if stats.get("points"):
            top_fas.append({
                "name": name,
                "position": p2.position if p2 else None,
                "current_team": fa["team"],
                "fa_type": fa["fa_type"],
                **stats,
            })

    top_fas.sort(key=lambda x: x.get("points") or 0, reverse=True)

    plan = await generate_offseason_plan(team.full_name, record, roster, team_stats, top_fas[:40])
    return {"team": team.full_name, "record": record, "plan": plan}


# ── Mock offseason grader ─────────────────────────────────────────────────────
class MockMove(BaseModel):
    player_id: str
    name: str
    position: str | None = None


class GradeMockRequest(BaseModel):
    team_id: str
    signed: list[MockMove] = []
    released: list[MockMove] = []
    traded_away: list[MockMove] = []
    traded_for: list[MockMove] = []
    notes: str = ""


@router.post("/grade-mock")
async def grade_mock(body: GradeMockRequest, db: AsyncSession = Depends(get_db)):
    tr = await db.execute(select(Team).where(Team.id == UUID(body.team_id)))
    team = tr.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    async def enrich_moves(moves: list[MockMove]) -> list[dict]:
        enriched = []
        for m in moves:
            try:
                pr = await db.execute(select(Player).where(Player.id == UUID(m.player_id)))
                p = pr.scalar_one_or_none()
                stats = await _stat_dict(UUID(m.player_id), db) if p else {}
            except Exception:
                stats = {}
            enriched.append({"name": m.name, "position": m.position, **stats})
        return enriched

    pr = await db.execute(select(Player).where(Player.team_id == UUID(body.team_id)))
    players = pr.scalars().all()
    current_roster = []
    for p in players:
        stats = await _stat_dict(p.id, db)
        current_roster.append({"name": p.full_name, "position": p.position, **stats})
    current_roster.sort(key=lambda x: x.get("minutes") or 0, reverse=True)

    try:
        all_ts = await nba_client.get_team_stats(CURRENT_SEASON)
        ts = next((t for t in all_ts if t["TEAM_ID"] == team.nba_id), {})
        record = f"{ts.get('W','?')}-{ts.get('L','?')}"
    except Exception:
        record = "?"

    grade = await grade_mock_offseason(
        team.full_name, current_roster, record,
        await enrich_moves(body.signed),
        await enrich_moves(body.released),
        await enrich_moves(body.traded_away),
        await enrich_moves(body.traded_for),
        body.notes,
    )
    return {"team": team.full_name, "record": record, "grade": grade}
