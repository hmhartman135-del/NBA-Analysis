import axios from "axios";

function makeBaseUrl(raw: string | undefined): string {
  const fallback =
    typeof window !== "undefined" && window.location.hostname !== "localhost"
      ? "https://nba-analysis-production.up.railway.app"
      : "http://localhost:8001";
  const url = raw || fallback;
  // ensure protocol is present
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return "https://" + url;
}

const BASE_URL = makeBaseUrl(process.env.NEXT_PUBLIC_API_URL);

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

export interface Team {
  id: string;
  nba_id: number;
  full_name: string;
  abbreviation: string;
  city: string;
  nickname: string;
  conference: string | null;
  division: string | null;
}

export interface Player {
  id: string;
  nba_id: number | null;
  full_name: string;
  first_name: string;
  last_name: string;
  position: string | null;
  secondary_positions: string[] | null;
  status: string;
  age: number | null;
  height: string | null;
  weight: number | null;
  jersey_number: string | null;
  country: string | null;
  draft_year: number | null;
  draft_round: number | null;
  draft_number: number | null;
  team_id: string | null;
}

export interface PlayerStats {
  id: string;
  player_id: string;
  season: string;
  games_played: number | null;
  minutes_per_game: number | null;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  fg_pct: number | null;
  three_pct: number | null;
  ft_pct: number | null;
  plus_minus: number | null;
}

export interface PlayerAnalytics extends PlayerStats {
  per: number;
  true_shooting_pct: number;
  usage_rate: number;
  ast_to_tov: number;
}
