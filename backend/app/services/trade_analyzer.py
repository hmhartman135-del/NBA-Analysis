"""
AI-powered trade analysis: grade multi-team trades, suggest trades for a player,
suggest trades for a team.
"""
import anthropic
from ..core.config import get_settings

settings = get_settings()


def _client():
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


# ── Grade a trade ─────────────────────────────────────────────────────────────
async def grade_trade(teams: list[dict]) -> str:
    """
    teams = [
        {
            "team_name": "Los Angeles Lakers",
            "players_out": [{"name": "...", "position": "...", "points": ...}, ...],
            "players_in":  [{"name": "...", ...}, ...],
        },
        ...
    ]
    """
    legs = []
    for t in teams:
        out_str = ", ".join(
            f"{p['name']} ({p.get('position','?')}, {p.get('points','?')} PPG)"
            for p in t["players_out"]
        ) or "Nothing"
        in_str = ", ".join(
            f"{p['name']} ({p.get('position','?')}, {p.get('points','?')} PPG)"
            for p in t["players_in"]
        ) or "Nothing"
        legs.append(f"**{t['team_name']}** sends: {out_str}\n**{t['team_name']}** receives: {in_str}")

    trade_str = "\n\n".join(legs)

    prompt = f"""You are a top NBA front-office analyst. Grade this trade:

{trade_str}

For EACH team provide:
1. **Grade** (A+ to F) and one-sentence verdict
2. **What they gain** — specific basketball impact
3. **What they give up** — cost and risk
4. **Fit** — how the incoming player(s) fit their system and roster
5. **Long-term vs short-term** outlook

Then give an **Overall Trade Verdict**: Is this trade fair? Who wins, who loses, who breaks even?

Be direct and specific. Use player names."""

    msg = await _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


# ── Suggest trades for a player ───────────────────────────────────────────────
async def suggest_trades_for_player(
    player_name: str,
    player_stats: dict,
    current_team: str,
    all_teams_context: str,
) -> str:
    prompt = f"""You are an NBA trade analyst. Suggest realistic trade scenarios for {player_name}.

{player_name}'s current team: {current_team}
Stats: {player_stats}

League context:
{all_teams_context}

Generate 4 specific, realistic trade scenarios. For each:
1. **Trade** — name the exact teams and players involved (3-4 players total)
2. **Why {current_team} does it** — motivation (rebuild, cap relief, value return)
3. **Why the other team does it** — what need it fills
4. **Trade value assessment** — is it fair? who overpays?
5. **Likelihood** — realistic or a stretch?

Focus on trades that make basketball sense, not just salary matching."""

    msg = await _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


# ── Suggest trades for a team ─────────────────────────────────────────────────
async def suggest_trades_for_team(
    team_name: str,
    roster: list[dict],
    record: str,
    team_stats: dict,
) -> str:
    roster_str = "\n".join(
        f"- {p['name']} ({p.get('position','?')}): "
        f"{p.get('points','?')} PPG, {p.get('rebounds','?')} RPG, "
        f"{p.get('assists','?')} APG, {p.get('minutes','?')} MPG"
        for p in roster
    )

    offense = f"PTS: {team_stats.get('PTS','?')} (#{team_stats.get('PTS_RANK','?')})"
    defense = f"Def Rating: {team_stats.get('DEF_RATING','?')} (#{team_stats.get('DEF_RATING_RANK','?')})"

    prompt = f"""You are an NBA front-office analyst. Suggest the best trades {team_name} should make this offseason.

{team_name} record: {record}
Team offense: {offense}
Team defense: {defense}

Current roster:
{roster_str}

Identify the top 3 trades {team_name} should pursue. For each trade:
1. **The Deal** — exact players in and out, teams involved
2. **Why make it** — addresses which specific weakness
3. **Roster fit** — how it changes their starting lineup and rotation
4. **Cost** — what they give up and whether it's worth it
5. **Impact** — realistic win projection change

Then give a **Priority** recommendation: which trade should they pursue first and why."""

    msg = await _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text
