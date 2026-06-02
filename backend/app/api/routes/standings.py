from fastapi import APIRouter, Query
from ...data import nba_client

router = APIRouter(prefix="/api/v1/standings", tags=["standings"])

CURRENT_SEASON = "2025-26"


@router.get("/")
async def get_standings(season: str = Query(CURRENT_SEASON)):
    return await nba_client.get_standings(season)
