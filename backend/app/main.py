import os
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .core.database import engine, Base
from .api.routes import players, teams, standings, analytics, scouting, roster, sync, trades, free_agency, draft

logger = logging.getLogger(__name__)


async def _background_sync():
    """Run the data sync in the background so /health passes immediately."""
    await asyncio.sleep(5)   # let the server fully start first
    try:
        await sync.maybe_auto_sync()
    except Exception as exc:
        logger.warning("Background startup sync failed (hit /api/v1/sync/ to retry): %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables (fast — just schema DDL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Kick off data sync in background — don't block startup
    asyncio.create_task(_background_sync())
    yield


app = FastAPI(
    title="NBA Analytics Platform",
    description="AI-powered NBA roster management, player analytics, and scouting",
    version="0.1.0",
    lifespan=lifespan,
)

from .core.config import get_settings as _get_settings
_s = _get_settings()
_allowed_origins = [o.strip() for o in _s.allowed_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(teams.router, prefix="/api/v1")
app.include_router(players.router, prefix="/api/v1")
app.include_router(standings.router)
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(scouting.router, prefix="/api/v1")
app.include_router(roster.router, prefix="/api/v1")
app.include_router(trades.router, prefix="/api/v1")
app.include_router(free_agency.router, prefix="/api/v1")
app.include_router(draft.router, prefix="/api/v1")
app.include_router(sync.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "NBA Analytics Platform"}
