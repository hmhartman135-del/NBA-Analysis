from fastapi import APIRouter, Query, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from ...core.database import get_db
from ...models.team import Team
from ...models.player import Player
from ...models.stats import PlayerStats
from ...data import draft_prospects, nba_client
from ...services.draft_ai import scout_prospect, grade_mock_draft, generate_ai_mock_draft

router = APIRouter(prefix="/draft", tags=["draft"])
CURRENT_SEASON = "2025-26"


# ── Prospect list ─────────────────────────────────────────────────────────────
@router.get("/prospects")
async def list_prospects(
    search: str | None = Query(None),
    position: str | None = Query(None),
):
    prospects = await draft_prospects.get_prospects()
    if search:
        prospects = [p for p in prospects if search.lower() in p["name"].lower()]
    if position:
        prospects = [p for p in prospects if position.upper() in (p.get("position") or "").upper()]
    return prospects


# ── AI scouting report for one prospect ──────────────────────────────────────
@router.get("/prospects/{rank}/scout")
async def scout(rank: int):
    prospects = await draft_prospects.get_prospects()
    p = next((p for p in prospects if p["rank"] == rank), None)
    if not p:
        raise HTTPException(404, "Prospect not found")
    report = await scout_prospect(p)
    return {"prospect": p, "report": report}


# ── Draft order ───────────────────────────────────────────────────────────────
@router.get("/order")
async def draft_order():
    return await draft_prospects.get_draft_order()


# ── Grade a user's mock draft ─────────────────────────────────────────────────
class MockPick(BaseModel):
    overall: int
    team_name: str
    prospect_name: str
    prospect_rank: int
    position: str | None = None
    school: str | None = None


class GradeMockRequest(BaseModel):
    picks: list[MockPick]


@router.post("/grade-mock")
async def grade_mock(body: GradeMockRequest):
    grade = await grade_mock_draft([p.model_dump() for p in body.picks])
    return {"grade": grade}


# ── AI-generated mock draft ───────────────────────────────────────────────────
class AIMockRequest(BaseModel):
    rounds: int = 2
    # Optional: override team needs. If empty, AI infers from standings.
    team_needs: dict[str, str] = {}


@router.post("/ai-mock")
async def ai_mock(body: AIMockRequest, db: AsyncSession = Depends(get_db)):
    order = await draft_prospects.get_draft_order()
    prospects = await draft_prospects.get_prospects()

    # Build team needs from actual team stats if not provided
    needs = body.team_needs
    if not needs:
        try:
            all_ts  = await nba_client.get_team_stats(CURRENT_SEASON)
            all_def = await nba_client.get_team_defensive_stats(CURRENT_SEASON)
            standings = await nba_client.get_standings(CURRENT_SEASON)

            # For each pick team, build a quick needs description
            seen_teams = set()
            for pick in order[:30]:
                tname = pick["team_name"]
                if tname in seen_teams:
                    continue
                seen_teams.add(tname)

                ts  = next((t for t in all_ts  if tname in t.get("TEAM_NAME","")), {})
                dfs = next((t for t in all_def  if tname in t.get("TEAM_NAME","")), {})
                std = next((t for t in standings if f"{t['TeamCity']} {t['TeamName']}" == tname), {})

                wins = ts.get("W", "?")
                pts_rank = ts.get("PTS_RANK", "?")
                def_rank = dfs.get("DEF_RATING_RANK", "?")

                needs[tname] = (
                    f"{wins} wins, offense #{pts_rank}, defense #{def_rank}. "
                    f"Needs: {'scoring wing' if int(pts_rank or 30) > 20 else 'defensive depth' if int(def_rank or 30) > 20 else 'best player available'}"
                )
        except Exception:
            pass

    result = await generate_ai_mock_draft(order, prospects, needs, rounds=body.rounds)
    return {"mock_draft": result, "rounds": body.rounds}
