"""
Wrapper around the nba_api package (stats.nba.com).
All calls are synchronous — run in a thread pool to avoid blocking the event loop.
"""
import asyncio
from functools import partial
from nba_api.stats.static import teams as static_teams, players as static_players
from nba_api.stats.endpoints import (
    leaguestandingsv3,
    commonteamroster,
    playercareerstats,
    leaguedashplayerstats,
    leaguedashteamstats,
    commonallplayers,
)


def _get_all_teams() -> list[dict]:
    return static_teams.get_teams()


def _get_all_players(is_active: bool = True) -> list[dict]:
    return static_players.get_active_players() if is_active else static_players.get_players()


def _get_team_roster(team_id: int, season: str) -> dict:
    r = commonteamroster.CommonTeamRoster(team_id=team_id, season=season)
    return r.get_normalized_dict()


def _get_league_player_stats(season: str, season_type: str = "Regular Season") -> list[dict]:
    r = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season,
        season_type_all_star=season_type,
        per_mode_detailed="PerGame",
    )
    return r.get_normalized_dict()["LeagueDashPlayerStats"]


def _get_standings(season: str) -> list[dict]:
    r = leaguestandingsv3.LeagueStandingsV3(season=season)
    return r.get_normalized_dict()["Standings"]


async def get_all_teams() -> list[dict]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _get_all_teams)


async def get_all_players(is_active: bool = True) -> list[dict]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_get_all_players, is_active))


async def get_team_roster(team_id: int, season: str) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_get_team_roster, team_id, season))


async def get_league_player_stats(season: str, season_type: str = "Regular Season") -> list[dict]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_get_league_player_stats, season, season_type))


async def get_standings(season: str) -> list[dict]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_get_standings, season))


def _get_team_stats(season: str) -> list[dict]:
    r = leaguedashteamstats.LeagueDashTeamStats(
        season=season,
        per_mode_detailed="PerGame",
    )
    return r.get_normalized_dict()["LeagueDashTeamStats"]


def _get_team_defensive_stats(season: str) -> list[dict]:
    r = leaguedashteamstats.LeagueDashTeamStats(
        season=season,
        per_mode_detailed="PerGame",
        measure_type_detailed_defense="Defense",
    )
    return r.get_normalized_dict()["LeagueDashTeamStats"]


async def get_team_stats(season: str) -> list[dict]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_get_team_stats, season))


async def get_team_defensive_stats(season: str) -> list[dict]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_get_team_defensive_stats, season))


def _get_all_players_info(season: str) -> list[dict]:
    r = commonallplayers.CommonAllPlayers(
        is_only_current_season=0,
        league_id="00",
        season=season,
    )
    return r.get_normalized_dict()["CommonAllPlayers"]


async def get_all_players_info(season: str) -> list[dict]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_get_all_players_info, season))
