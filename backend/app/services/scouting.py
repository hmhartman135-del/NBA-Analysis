"""
AI-powered scouting reports via Claude.
"""
import anthropic
from ..core.config import get_settings

settings = get_settings()


async def generate_scouting_report(player_name: str, stats: dict) -> str:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    prompt = f"""You are an elite NBA scout. Generate a detailed scouting report for {player_name}.

Current season stats:
{stats}

Include:
1. Overall assessment and role projection
2. Offensive strengths and weaknesses (scoring, creation, shooting)
3. Defensive strengths and weaknesses
4. Athletic profile and physical tools
5. NBA fit — best team types and system fit
6. Comparable player (current or historical)
7. Ceiling and floor projections

Be specific, analytical, and concise."""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


async def compare_players(player_a: str, stats_a: dict, player_b: str, stats_b: dict) -> str:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    prompt = f"""You are an NBA analyst. Compare these two players:

{player_a}:
{stats_a}

{player_b}:
{stats_b}

Analyze: scoring efficiency, playmaking, defense, versatility, and overall value.
Conclude with which player you'd rather have and why."""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
