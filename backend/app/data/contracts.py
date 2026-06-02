"""
Scrape real NBA contract data from Basketball Reference.
Captures all contract years, options, and years remaining.
Cached in memory for 6 hours.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from functools import partial

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_cache: dict = {}
_cache_time: datetime | None = None
_CACHE_TTL = timedelta(hours=6)

BREF_URL = "https://www.basketball-reference.com/contracts/players.html"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

# Season labels matching the y1–y6 columns (2025-26 is current = y1)
YEAR_LABELS = ["2025-26", "2026-27", "2027-28", "2028-29", "2029-30", "2030-31"]


def _parse_salary(s: str) -> int | None:
    try:
        return int(s.replace("$", "").replace(",", ""))
    except ValueError:
        return None


def _scrape_contracts() -> list[dict]:
    resp = httpx.get(BREF_URL, headers=HEADERS, follow_redirects=True, timeout=20)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")
    table = soup.find("table", id="player-contracts")
    if not table:
        raise ValueError("Contract table not found on page")

    results = []
    for row in table.find_all("tr"):
        name_cell = row.find("td", {"data-stat": "player"})
        if not name_cell:
            continue

        team_cell = row.find("td", {"data-stat": "team_id"})
        name = name_cell.get_text(strip=True)
        team = team_cell.get_text(strip=True) if team_cell else ""

        # Collect all salary years y1-y6
        year_cells = [row.find("td", {"data-stat": f"y{i}"}) for i in range(1, 7)]
        salaries_raw = [c.get_text(strip=True) if c else "" for c in year_cells]
        salaries_int = [_parse_salary(s) for s in salaries_raw]

        cur_sal_raw = salaries_raw[0]
        if not cur_sal_raw:
            continue   # player not on a current contract in our dataset

        # Years remaining = count of non-empty salary cells
        years_remaining = sum(1 for s in salaries_raw if s)

        # Detect option type on y2 (next year after current)
        y2_cell = year_cells[1]
        y2_classes = " ".join(y2_cell.get("class", [])) if y2_cell else ""
        y2_val = salaries_raw[1]

        if not y2_val:
            fa_type = "UFA"
        elif "salary-pl" in y2_classes:
            fa_type = "Player Option"
        elif "salary-tm" in y2_classes:
            fa_type = "Team Option"
        else:
            fa_type = None  # firmly under contract

        # Build per-year breakdown
        contract_years = []
        for i, (label, raw, amt) in enumerate(zip(YEAR_LABELS, salaries_raw, salaries_int)):
            if not raw:
                break
            cell = year_cells[i]
            classes = " ".join(cell.get("class", [])) if cell else ""
            option = None
            if "salary-pl" in classes:
                option = "Player Option"
            elif "salary-tm" in classes:
                option = "Team Option"
            contract_years.append({
                "season": label,
                "salary": raw,
                "salary_int": amt,
                "option": option,
            })

        results.append({
            "name":            name,
            "team":            team,
            "salary":          cur_sal_raw,
            "salary_int":      salaries_int[0],
            "years_remaining": years_remaining,
            "fa_type":         fa_type,
            "contract_years":  contract_years,
        })

    return results


async def get_contracts() -> list[dict]:
    global _cache, _cache_time
    now = datetime.utcnow()
    if _cache and _cache_time and (now - _cache_time) < _CACHE_TTL:
        return list(_cache.values())

    loop = asyncio.get_event_loop()
    rows = await loop.run_in_executor(None, _scrape_contracts)

    _cache = {r["name"]: r for r in rows}
    _cache_time = now
    logger.info("Contracts cache refreshed: %d players", len(rows))
    return rows


async def get_free_agents_2026() -> list[dict]:
    rows = await get_contracts()
    return [r for r in rows if r["fa_type"] in ("UFA", "Player Option", "Team Option")]


async def get_contract_for_player(name: str) -> dict | None:
    rows = await get_contracts()
    name_lower = name.lower()
    for r in rows:
        if r["name"].lower() == name_lower:
            return r
    # partial / unicode fallback
    for r in rows:
        if name_lower in r["name"].lower() or r["name"].lower() in name_lower:
            return r
    return None


async def get_team_contracts(team_abbr: str) -> list[dict]:
    """All contracts for a given team abbreviation (e.g. 'LAL')."""
    rows = await get_contracts()
    return [r for r in rows if r["team"].upper() == team_abbr.upper()]
