from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from pydantic import BaseModel
from ...core.database import get_db
from ...models.team import Team
from ...models.player import Player
from ...models.stats import PlayerStats
from ...services.trade_analyzer import grade_trade, suggest_trades_for_player, suggest_trades_for_team
from ...data import nba_client

router = APIRouter(prefix="/trades", tags=["trades"])

CURRENT_SEASON = "2025-26"


async def _player_stat_dict(player_id: UUID, db: AsyncSession) -> dict:
    sr = await db.execute(
        select(PlayerStats)
        .where(PlayerStats.player_id == player_id, PlayerStats.season == CURRENT_SEASON)
    )
    stats = sr.scalars().all()
    # prefer playoffs
    stat = next((s for s in stats if s.season_type == "Playoffs"), stats[0] if stats else None)
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
    }


# ── Grade a multi-team trade ──────────────────────────────────────────────────
class TradeLeg(BaseModel):
    team_id: str
    players_out: list[str]   # player IDs being sent away


class GradeTradeRequest(BaseModel):
    legs: list[TradeLeg]     # 2–4 legs


@router.post("/grade")
async def grade_trade_route(body: GradeTradeRequest, db: AsyncSession = Depends(get_db)):
    if len(body.legs) < 2 or len(body.legs) > 4:
        raise HTTPException(status_code=400, detail="Trade must have 2–4 teams")

    # Build a map: team_id → set of player_ids going out
    outgoing: dict[str, list[str]] = {leg.team_id: leg.players_out for leg in body.legs}
    all_out_ids = [pid for pids in outgoing.values() for pid in pids]

    # For each team, players_in = all other teams' players_out
    teams_payload = []
    for leg in body.legs:
        tr = await db.execute(select(Team).where(Team.id == UUID(leg.team_id)))
        team = tr.scalar_one_or_none()
        if not team:
            raise HTTPException(status_code=404, detail=f"Team {leg.team_id} not found")

        players_out = []
        for pid in leg.players_out:
            pr = await db.execute(select(Player).where(Player.id == UUID(pid)))
            p = pr.scalar_one_or_none()
            if not p:
                continue
            stats = await _player_stat_dict(UUID(pid), db)
            players_out.append({"name": p.full_name, "position": p.position, **stats})

        players_in_ids = [pid for tid, pids in outgoing.items() if tid != leg.team_id for pid in pids]
        players_in = []
        for pid in players_in_ids:
            pr = await db.execute(select(Player).where(Player.id == UUID(pid)))
            p = pr.scalar_one_or_none()
            if not p:
                continue
            stats = await _player_stat_dict(UUID(pid), db)
            players_in.append({"name": p.full_name, "position": p.position, **stats})

        teams_payload.append({
            "team_name": team.full_name,
            "players_out": players_out,
            "players_in": players_in,
        })

    analysis = await grade_trade(teams_payload)
    return {"analysis": analysis, "teams": [t["team_name"] for t in teams_payload]}


# ── Suggest trades for a player ───────────────────────────────────────────────
@router.get("/player/{player_id}/suggestions")
async def player_trade_suggestions(player_id: UUID, db: AsyncSession = Depends(get_db)):
    pr = await db.execute(select(Player).where(Player.id == player_id))
    player = pr.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    stats = await _player_stat_dict(player_id, db)

    # Current team name
    current_team = "Unknown"
    if player.team_id:
        tr = await db.execute(select(Team).where(Team.id == player.team_id))
        team = tr.scalar_one_or_none()
        if team:
            current_team = team.full_name

    # Brief league context — top teams' records from standings
    try:
        standings = await nba_client.get_standings(CURRENT_SEASON)
        top_teams = sorted(standings, key=lambda x: x["WinPCT"], reverse=True)[:10]
        ctx = "\n".join(f"- {t['TeamCity']} {t['TeamName']}: {t['WINS']}-{t['LOSSES']}" for t in top_teams)
    except Exception:
        ctx = "League standings unavailable"

    analysis = await suggest_trades_for_player(player.full_name, stats, current_team, ctx)
    return {"player": player.full_name, "team": current_team, "analysis": analysis}


# ── Suggest trades for a team ─────────────────────────────────────────────────
@router.get("/team/{team_id}/suggestions")
async def team_trade_suggestions(team_id: UUID, db: AsyncSession = Depends(get_db)):
    tr = await db.execute(select(Team).where(Team.id == team_id))
    team = tr.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Roster with stats
    pr = await db.execute(select(Player).where(Player.team_id == team_id))
    players = pr.scalars().all()
    roster = []
    for p in players:
        stats = await _player_stat_dict(p.id, db)
        roster.append({"name": p.full_name, "position": p.position, **stats})
    roster.sort(key=lambda x: x.get("minutes") or 0, reverse=True)

    # Team stats for context
    try:
        all_team_stats = await nba_client.get_team_stats(CURRENT_SEASON)
        all_def = await nba_client.get_team_defensive_stats(CURRENT_SEASON)
        ts = next((t for t in all_team_stats if t["TEAM_ID"] == team.nba_id), {})
        defs = next((t for t in all_def if t["TEAM_ID"] == team.nba_id), {})
        team_stats = {**ts, **defs}
        record = f"{ts.get('W','?')}-{ts.get('L','?')}"
    except Exception:
        team_stats = {}
        record = "?"

    analysis = await suggest_trades_for_team(team.full_name, roster, record, team_stats)
    return {"team": team.full_name, "record": record, "analysis": analysis}
