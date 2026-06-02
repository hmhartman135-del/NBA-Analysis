"""
AI-powered NBA roster construction and trade analysis.
"""
import anthropic
from ..core.config import get_settings

settings = get_settings()


async def analyze_roster(team_name: str, roster: list[dict]) -> str:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    roster_str = "\n".join(
        f"- {p['name']} ({p.get('position', '?')}): {p.get('points', 0)} PPG, "
        f"{p.get('rebounds', 0)} RPG, {p.get('assists', 0)} APG"
        for p in roster
    )

    prompt = f"""You are an NBA front office analyst. Analyze the {team_name} roster:

{roster_str}

Provide:
1. Team strengths (offensive/defensive identity)
2. Gaps and weaknesses
3. Best starting five recommendation
4. Rotation depth assessment
5. Top 2-3 offseason priorities (trades or free agency targets)"""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


LINEUP_SCENARIOS = {
    "3pt": "Three-Point Lineup — maximize floor spacing and 3PT shooting. Prioritize high-volume 3PT shooters (3PA, 3P%), floor spacers, and players who can shoot off the dribble and off screens.",
    "big": "Big Lineup — maximize size, rebounding, and interior presence. Prioritize frontcourt players, rim protectors, rebounders, and post scorers. Can sacrifice some spacing for physicality.",
    "defensive": "Defensive Lineup — maximize on-ball and help defense. Prioritize players with high STL, BLK, low opponent FG%, long wingspan, and elite lateral quickness. Lock-down stoppers at each position.",
    "small": "Small Ball / Speed Lineup — maximize pace, ball movement, and transition. Prioritize high AST, STL, fast players who can push in transition, shoot in space, and guard multiple positions.",
}


async def suggest_lineup_scenario(
    team_name: str,
    roster: list[dict],
    scenario: str,
) -> str:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    description = LINEUP_SCENARIOS.get(scenario, scenario)

    roster_str = "\n".join(
        f"- {p['name']} ({p.get('position', '?')}): "
        f"{p.get('points', '—')} PPG, {p.get('rebounds', '—')} RPG, "
        f"{p.get('assists', '—')} APG, {p.get('three_pct', '—')} 3P%, "
        f"{p.get('fg_pct', '—')} FG%, {p.get('minutes', '—')} MPG"
        for p in roster
    )

    prompt = f"""You are an NBA coaching analyst building a {team_name} lineup for this scenario:

SCENARIO: {description}

{team_name} Roster with 2025-26 stats:
{roster_str}

Build the best possible 5-man lineup for this scenario from ONLY the players listed above.

Provide:
1. **Recommended Lineup** — list each position slot and the player, with a one-line reason
2. **Why It Works** — how this 5-man unit executes the scenario
3. **Key Plays / Actions** — 2-3 specific plays or sets this lineup runs best
4. **Matchup Targets** — type of opponent this lineup exploits
5. **Weakness** — what this lineup gives up and how to counter it"""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


async def analyze_rotation(starters: str, bench: str) -> str:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    prompt = f"""You are an NBA coaching analyst. Evaluate this lineup and rotation:

Starting Five:
{starters}

Bench Rotation:
{bench if bench else "None selected"}

Analyze:
1. Starting lineup fit — positional balance, offensive/defensive identity, spacing
2. Bench depth — scoring punch, defensive coverage, role players
3. Lineup strengths and potential matchup problems
4. Minutes distribution recommendations
5. Best small-ball or big lineups within this group
6. Overall rotation grade (A–F) and why"""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


async def suggest_trades(
    team_name: str,
    roster: list[dict],
    target_need: str,
) -> str:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    roster_str = "\n".join(f"- {p['name']} ({p.get('position', '?')})" for p in roster)

    prompt = f"""You are an NBA trade analyst. The {team_name} needs: {target_need}

Current roster:
{roster_str}

Suggest 3 realistic trade scenarios including:
- Assets to offer
- Target player and team
- Why the other team would do this deal
- Salary/cap implications (general)
- How it addresses the need"""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
