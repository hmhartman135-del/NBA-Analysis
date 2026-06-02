from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from pydantic import BaseModel
from ...core.database import get_db
from ...models.team import Team
from ...models.player import Player
from ...models.stats import PlayerStats
from ...services.roster_builder import analyze_roster, analyze_rotation, suggest_lineup_scenario
from ...data import contracts as contract_data

router = APIRouter(prefix="/roster", tags=["roster"])

CURRENT_SEASON = "2025-26"


async def _team_roster_with_stats(team_id: UUID, season: str, db: AsyncSession) -> tuple[Team, list[dict]]:
    tr = await db.execute(select(Team).where(Team.id == team_id))
    team = tr.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    result = await db.execute(select(Player).where(Player.team_id == team_id))
    players = result.scalars().all()

    roster = []
    for p in players:
        sr = await db.execute(
            select(PlayerStats).where(PlayerStats.player_id == p.id, PlayerStats.season == season)
        )
        stat = sr.scalar_one_or_none()
        entry = {"name": p.full_name, "position": p.position, "age": p.age, "height": p.height}
        if stat:
            entry.update({
                "points": stat.points,
                "rebounds": stat.rebounds,
                "assists": stat.assists,
                "fg_pct": stat.fg_pct,
                "three_pct": stat.three_pct,
                "minutes": stat.minutes_per_game,
            })
        roster.append(entry)
    return team, roster


@router.get("/{team_id}/analysis")
async def roster_analysis(
    team_id: UUID,
    season: str = Query(CURRENT_SEASON),
    db: AsyncSession = Depends(get_db),
):
    team, roster = await _team_roster_with_stats(team_id, season, db)
    analysis = await analyze_roster(team.full_name, roster)
    return {"team": team.full_name, "season": season, "analysis": analysis}


class RotationRequest(BaseModel):
    starters: str   # "PG: LeBron James, SG: Austin Reaves, ..."
    bench: str      # "Jarred Vanderbilt, Bronny James, ..."


@router.post("/rotation-analysis")
async def rotation_analysis(body: RotationRequest):
    analysis = await analyze_rotation(body.starters, body.bench)
    return {"analysis": analysis}


@router.get("/{team_id}/finances")
async def team_finances(team_id: UUID, db: AsyncSession = Depends(get_db)):
    """Return each player's contract details: salary, years remaining, options, full breakdown."""
    tr = await db.execute(select(Team).where(Team.id == team_id))
    team = tr.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    pr = await db.execute(select(Player).where(Player.team_id == team_id))
    players = pr.scalars().all()

    # Get all contracts (cached) and match by name
    all_contracts = await contract_data.get_contracts()
    contract_by_name = {c["name"].lower(): c for c in all_contracts}

    def _find_contract(player_name: str) -> dict | None:
        key = player_name.lower()
        if key in contract_by_name:
            return contract_by_name[key]
        # Fuzzy: first+last name match
        parts = key.split()
        if len(parts) >= 2:
            for c_name, c in contract_by_name.items():
                c_parts = c_name.split()
                if len(c_parts) >= 2 and parts[0] == c_parts[0] and parts[-1] == c_parts[-1]:
                    return c
        # Partial substring
        for c_name, c in contract_by_name.items():
            if key in c_name or c_name in key:
                return c
        return None

    roster_finances = []
    total_payroll = 0
    for p in players:
        contract = _find_contract(p.full_name)
        entry = {
            "player_id": str(p.id),
            "name": p.full_name,
            "position": p.position,
            "age": p.age,
            "jersey_number": p.jersey_number,
            "salary": contract["salary"] if contract else None,
            "salary_int": contract["salary_int"] if contract else None,
            "years_remaining": contract["years_remaining"] if contract else None,
            "fa_type": contract["fa_type"] if contract else None,
            "contract_years": contract["contract_years"] if contract else [],
        }
        if contract and contract.get("salary_int"):
            total_payroll += contract["salary_int"]
        roster_finances.append(entry)

    # Sort by salary desc
    roster_finances.sort(key=lambda x: x.get("salary_int") or 0, reverse=True)

    # Cap context (2025-26 cap ~$141M, luxury tax ~$171M)
    NBA_CAP = 141_000_000
    NBA_LUX = 171_000_000

    return {
        "team": team.full_name,
        "total_payroll": total_payroll,
        "cap_space": max(0, NBA_CAP - total_payroll),
        "over_cap": total_payroll > NBA_CAP,
        "over_luxury": total_payroll > NBA_LUX,
        "nba_cap": NBA_CAP,
        "luxury_tax": NBA_LUX,
        "players": roster_finances,
    }


@router.get("/{team_id}/lineup-scenario")
async def lineup_scenario(
    team_id: UUID,
    scenario: str = Query(..., description="3pt, big, defensive, or small"),
    season: str = Query(CURRENT_SEASON),
    db: AsyncSession = Depends(get_db),
):
    team, roster = await _team_roster_with_stats(team_id, season, db)
    suggestion = await suggest_lineup_scenario(team.full_name, roster, scenario)
    return {"team": team.full_name, "scenario": scenario, "suggestion": suggestion}
