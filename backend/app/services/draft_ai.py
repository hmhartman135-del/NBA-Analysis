"""
AI-powered draft analysis: scouting reports, mock draft grading, AI mock draft.
"""
import anthropic
from ..core.config import get_settings

settings = get_settings()

def _client():
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


async def scout_prospect(prospect: dict) -> str:
    stats_str = (
        f"{prospect.get('ppg','—')} PPG, {prospect.get('rpg','—')} RPG, "
        f"{prospect.get('apg','—')} APG, {prospect.get('fg_pct','—')}% FG, "
        f"{prospect.get('mpg','—')} MPG"
    ) if prospect.get('ppg') else "College stats unavailable"

    prompt = f"""You are an elite NBA scout. Write a detailed scouting report for:

**{prospect['name']}** — #{prospect['rank']} prospect
School: {prospect.get('school','?')} | Class: {prospect.get('year_class','?')} | Position: {prospect.get('position','?')} | Height: {prospect.get('height','?')} | Weight: {prospect.get('weight','?')} lbs
2025-26 College Stats: {stats_str}

Cover:
1. **Overview** — player type and NBA role projection (starter, 6th man, role player)
2. **Offensive Game** — scoring, creation, shooting, efficiency
3. **Defensive Profile** — tools, effort, potential
4. **Athletic Profile** — speed, length, strength, explosiveness
5. **NBA Comparison** — one current/recent player (justify it)
6. **Best-case ceiling / Worst-case floor**
7. **Ideal landing spot** — team type/system that maximizes him
8. **Draft grade** — is he worth the slot? (A+ to F)"""

    msg = await _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=900,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


async def grade_mock_draft(picks: list[dict]) -> str:
    """picks = [{overall, team_name, prospect_name, prospect_rank, position, school}]"""
    picks_str = "\n".join(
        f"Pick {p['overall']} ({p['team_name']}): {p['prospect_name']} "
        f"(#{p['prospect_rank']} prospect, {p.get('position','?')}, {p.get('school','?')})"
        for p in picks[:30]
    )

    prompt = f"""You are an NFL/NBA draft analyst. Grade this 2026 NBA Mock Draft:

{picks_str}

For each pick assess:
- Was it a reach, fair value, or a steal?
- Does the prospect fit the team's needs?

Then give:
1. **Best Picks** — top 3 value picks (team got more than expected)
2. **Biggest Reaches** — top 3 overdrafted players
3. **Best Fits** — top 3 prospects who landed on perfect teams
4. **Overall Draft Class Grade** (A+ to F) — how good is this class?
5. **Top 5 picks individually graded** (A+ to F each)"""

    msg = await _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1400,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


async def generate_ai_mock_draft(
    draft_order: list[dict],
    prospects: list[dict],
    team_needs: dict,   # {team_name: "needs description"}
    rounds: int = 2,
) -> str:
    order_str = "\n".join(
        f"Pick {p['overall']} (R{p['round']}): {p['team_name']}"
        for p in draft_order[:30 * rounds]
    )

    needs_str = "\n".join(
        f"- {team}: {need}"
        for team, need in list(team_needs.items())[:30]
    )

    prospects_str = "\n".join(
        f"#{p['rank']} {p['name']} ({p.get('position','?')}, {p.get('school','?')}) "
        f"— {p.get('ppg','?')} PPG"
        for p in prospects[:60]
    )

    prompt = f"""You are an NBA draft analyst. Simulate the 2026 NBA Draft.

**Draft Order ({rounds} rounds):**
{order_str}

**Top Prospects (ranked by scouts):**
{prospects_str}

**Team Needs:**
{needs_str}

Simulate the draft considering:
- Teams draft for need AND best player available
- Stars rarely fall past pick 5
- Teams reach for need in the 20s-30s
- International and raw prospects get mixed in
- 2nd round is more unpredictable

Format each pick as:
Pick [#] ([Team]): [Player] ([School/Country], [Pos]) — [1 sentence on the fit]

Do all {30 * rounds} picks. Be specific, realistic, and vary it (don't just go rank order)."""

    msg = await _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2500,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text
