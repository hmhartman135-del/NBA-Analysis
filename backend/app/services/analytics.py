"""
NBA advanced metrics calculation engine.
"""


def calculate_per(row: dict, lg_avg: dict | None = None) -> float:
    """Simplified Player Efficiency Rating."""
    min_pg = row.get("minutes_per_game") or 0
    if min_pg == 0:
        return 0.0
    per = (
        row.get("points", 0)
        + row.get("rebounds", 0)
        + row.get("assists", 0)
        + row.get("steals", 0)
        + row.get("blocks", 0)
        - row.get("turnovers", 0)
        - (row.get("fg_attempted", 0) - row.get("fg_made", 0)) * 0.45
        - (row.get("ft_attempted", 0) - row.get("ft_made", 0)) * 0.45
    )
    return round(per, 2)


def calculate_true_shooting(row: dict) -> float:
    """True Shooting % = PTS / (2 * (FGA + 0.44 * FTA))."""
    pts = row.get("points", 0)
    fga = row.get("fg_attempted", 0)
    fta = row.get("ft_attempted", 0)
    denom = 2 * (fga + 0.44 * fta)
    return round(pts / denom, 3) if denom > 0 else 0.0


def calculate_usage_rate(row: dict) -> float:
    """Usage rate estimate using per-game stats (proxy formula)."""
    fga = row.get("fg_attempted", 0)
    fta = row.get("ft_attempted", 0)
    tov = row.get("turnovers", 0)
    min_pg = row.get("minutes_per_game", 1) or 1
    # Simplified: (FGA + 0.44*FTA + TOV) / min * 48 / 5
    return round((fga + 0.44 * fta + tov) / min_pg * 48 / 5, 1)


def calculate_assist_to_turnover(row: dict) -> float:
    ast = row.get("assists", 0)
    tov = row.get("turnovers", 1) or 1
    return round(ast / tov, 2)


def enrich_player_stats(row: dict) -> dict:
    return {
        **row,
        "per": calculate_per(row),
        "true_shooting_pct": calculate_true_shooting(row),
        "usage_rate": calculate_usage_rate(row),
        "ast_to_tov": calculate_assist_to_turnover(row),
    }
