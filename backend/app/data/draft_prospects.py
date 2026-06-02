"""
Scrape 2026 NBA Draft prospect rankings + college stats from CBS Sports.
Also pulls the draft order from ESPN.
Cached in memory for 6 hours.
"""
import asyncio
import logging
import re
from datetime import datetime, timedelta
from functools import partial

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_prospect_cache: list[dict] = []
_order_cache: list[dict] = []
_cache_time: datetime | None = None
_CACHE_TTL = timedelta(hours=6)

CBS_URL   = "https://www.cbssports.com/nba/draft/prospect-rankings/"
ESPN_DRAFT = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/draft?season=2026"
ESPN_TEAMS = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=40"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}


def _scrape_prospects() -> list[dict]:
    resp = httpx.get(CBS_URL, headers=HEADERS, follow_redirects=True, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    prospects = []
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if not rows or "Player" not in rows[0].get_text():
            continue

        i = 1
        while i < len(rows):
            cells = [td.get_text(strip=True) for td in rows[i].find_all(["td", "th"])]
            if not cells or not cells[0].isdigit():
                i += 1
                continue
            rank = int(cells[0])
            if re.match(r"^\d+\.\d", cells[1]):   # stat row mistaken for player
                i += 1
                continue

            prospect: dict = {
                "rank":       rank,
                "name":       cells[1],
                "school":     cells[2] if len(cells) > 2 else "",
                "year_class": cells[3] if len(cells) > 3 else "",
                "position":   cells[4] if len(cells) > 4 else "",
                "height":     cells[6] if len(cells) > 6 else "",
                "weight":     cells[7] if len(cells) > 7 else "",
                "ppg": None, "rpg": None, "apg": None,
                "fg_pct": None, "mpg": None,
            }

            # Stats are in the very next row (cells at indices 6-10)
            if i + 1 < len(rows):
                sc = [td.get_text(strip=True) for td in rows[i + 1].find_all(["td", "th"])]
                if len(sc) >= 10:
                    try:
                        prospect["mpg"]    = float(sc[6])
                        prospect["ppg"]    = float(sc[7])
                        prospect["rpg"]    = float(sc[8])
                        prospect["apg"]    = float(sc[9])
                        prospect["fg_pct"] = float(sc[10]) if len(sc) > 10 else None
                        i += 2   # skip stat+header rows
                    except (ValueError, IndexError):
                        pass

            prospects.append(prospect)
            i += 1

    return prospects


def _scrape_draft_order() -> list[dict]:
    """Return [{overall, round, pick, espn_team_id, team_abbr, team_name}]"""
    # Get picks
    r1 = httpx.get(ESPN_DRAFT, headers=HEADERS, timeout=15)
    r1.raise_for_status()
    picks_raw = r1.json().get("picks", [])

    # Get ESPN → NBA team map
    r2 = httpx.get(ESPN_TEAMS, headers=HEADERS, timeout=15)
    r2.raise_for_status()
    teams_raw = r2.json()["sports"][0]["leagues"][0]["teams"]
    team_map = {t["team"]["id"]: t["team"] for t in teams_raw}

    order = []
    for p in picks_raw:
        tid = str(p.get("teamId", ""))
        team = team_map.get(tid, {})
        order.append({
            "overall":      p["overall"],
            "round":        p["round"],
            "pick":         p["pick"],
            "espn_team_id": tid,
            "team_abbr":    team.get("abbreviation", ""),
            "team_name":    team.get("displayName", "Unknown"),
            "traded":       p.get("traded", False),
        })

    return order


async def get_prospects() -> list[dict]:
    global _prospect_cache, _order_cache, _cache_time
    now = datetime.utcnow()
    if _prospect_cache and _cache_time and (now - _cache_time) < _CACHE_TTL:
        return _prospect_cache

    loop = asyncio.get_event_loop()
    _prospect_cache = await loop.run_in_executor(None, _scrape_prospects)
    try:
        _order_cache = await loop.run_in_executor(None, _scrape_draft_order)
    except Exception as e:
        logger.warning("Draft order fetch failed: %s", e)
    _cache_time = now
    logger.info("Draft cache refreshed: %d prospects, %d picks", len(_prospect_cache), len(_order_cache))
    return _prospect_cache


async def get_draft_order() -> list[dict]:
    global _order_cache, _cache_time
    if not _order_cache:
        await get_prospects()   # populates both
    return _order_cache
