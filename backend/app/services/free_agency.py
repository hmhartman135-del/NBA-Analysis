"""
AI-powered free agency analysis.
"""
import anthropic
from ..core.config import get_settings

settings = get_settings()


def _client():
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


async def generate_offseason_plan(
    team_name: str,
    record: str,
    roster: list[dict],
    team_stats: dict,
    top_fas: list[dict],
) -> str:
    roster_str = "\n".join(
        f"- {p['name']} ({p.get('position','?')}): "
        f"{p.get('points','—')} PPG, {p.get('rebounds','—')} RPG, {p.get('assists','—')} APG"
        for p in roster[:12]
    )
    fa_str = "\n".join(
        f"- {p['name']} ({p.get('position','?')}): "
        f"{p.get('points','—')} PPG, {p.get('rebounds','—')} RPG, {p.get('assists','—')} APG"
        for p in top_fas[:20]
    )
    pts_rank = team_stats.get("PTS_RANK", "?")
    def_rank = team_stats.get("DEF_RATING_RANK", "?")

    prompt = f"""You are an NBA front-office executive. Build a complete 2026 offseason plan for the {team_name}.

**{team_name} — {record}**
Offense: #{pts_rank} in scoring | Defense: #{def_rank} in defensive rating

Current roster (key players):
{roster_str}

Notable 2026 Free Agents available:
{fa_str}

Build a full offseason plan covering:
1. **Priority #1 — Re-sign or Let Go**: Which of their own free agents to bring back and at what priority
2. **Free Agent Targets**: Top 3 free agents to pursue and why they fit (from the list above or others you know)
3. **Trade Targets**: 1-2 trades to complement FA moves
4. **Draft Strategy**: What to look for (pick range based on record)
5. **Final Projected Roster**: Starting 5 + key bench after all moves
6. **Win Projection**: Realistic W-L projection after moves vs. this season's {record}

Be specific about names, roles, and contract types (max, mid-level exception, vet min)."""

    msg = await _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1800,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


async def grade_mock_offseason(
    team_name: str,
    current_roster: list[dict],
    record: str,
    signed_players: list[dict],
    released_players: list[dict],
    traded_away: list[dict],
    traded_for: list[dict],
    notes: str,
) -> str:
    def fmt(players: list[dict]) -> str:
        if not players:
            return "None"
        return ", ".join(
            f"{p['name']} ({p.get('position','?')}, {p.get('points','—')} PPG)"
            for p in players
        )

    prompt = f"""You are an NBA analyst grading a fan's mock offseason for the {team_name} ({record} this season).

**Moves Made:**
- Signed (free agents): {fmt(signed_players)}
- Released / Let go: {fmt(released_players)}
- Traded away: {fmt(traded_away)}
- Acquired via trade: {fmt(traded_for)}
{f'- Notes: {notes}' if notes else ''}

**Current roster before moves (top players):**
{chr(10).join(f"- {p['name']} ({p.get('position','?')}): {p.get('points','—')} PPG" for p in current_roster[:10])}

Grade this offseason on:
1. **Addressing Weaknesses** — did the moves fix the team's actual problems?
2. **Fit** — do the new players fit the system and existing roster?
3. **Value** — smart use of cap space / assets?
4. **Depth** — is the full rotation better?
5. **Championship Window** — does this extend, open, or close the window?

Give an **Overall Grade** (A+ to F) with a one-paragraph verdict.
Then give grades for each individual move.
End with the **Projected Starting Five** after all moves."""

    msg = await _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text
