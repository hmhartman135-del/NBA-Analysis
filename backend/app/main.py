import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .core.database import engine, Base
from .api.routes import players, teams, standings, analytics, scouting, roster, sync, trades, free_agency, draft


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        await sync.maybe_auto_sync()
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Startup sync failed (will retry on /sync): %s", exc)
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
