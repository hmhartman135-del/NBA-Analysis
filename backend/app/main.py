import os
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .core.database import engine, Base
from .api.routes import players, teams, standings, analytics, scouting, roster, sync, trades, free_agency, draft

logger = logging.getLogger(__name__)


_DAILY_SYNC_INTERVAL = 24 * 60 * 60  # 24 hours


async def _daily_sync_loop():
    """Sync rosters, trades, and free agency data every 24 hours."""
    await asyncio.sleep(10)  # let server fully start first
    while True:
        try:
            logger.info("Daily sync: pulling latest rosters, trades, and signings...")
            await sync.force_sync()
            logger.info("Daily sync complete.")
        except Exception as exc:
            logger.warning("Daily sync failed: %s", exc)
        await asyncio.sleep(_DAILY_SYNC_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Start daily sync loop — runs on startup then every 24h forever
    asyncio.create_task(_daily_sync_loop())
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


@app.get("/")
async def root():
    return {
        "service": "NBA Analytics Platform API",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "note": "Open the Vercel frontend URL to use the app — this is the API backend only."
    }
