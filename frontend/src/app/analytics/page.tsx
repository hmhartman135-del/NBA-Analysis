"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, Team } from "@/lib/api";
import { TrendingUp } from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────
type Metric = "points" | "rebounds" | "assists" | "steals" | "blocks" | "per" | "true_shooting_pct";

interface LeaderRow {
  player_id: string;
  name: string;
  position: string | null;
  team_id: string | null;
  season_type: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  per: number;
  true_shooting_pct: number;
  usage_rate: number;
  minutes_per_game: number;
  [key: string]: unknown;
}

interface TeamStat {
  TEAM_NAME: string;
  GP: number; W: number; L: number; W_PCT: number;
  PTS: number; PTS_RANK: number;
  FG_PCT: number; FG_PCT_RANK: number;
  FG3_PCT: number; FG3_PCT_RANK: number;
  FT_PCT: number; FT_PCT_RANK: number;
  REB: number; REB_RANK: number;
  AST: number; AST_RANK: number;
  TOV: number; TOV_RANK: number;
  STL: number; STL_RANK: number;
  BLK: number; BLK_RANK: number;
  PLUS_MINUS: number; PLUS_MINUS_RANK: number;
  OREB: number; OREB_RANK: number;
  FG3M: number; FG3M_RANK: number;
}

interface DefStat {
  DEF_RATING: number; DEF_RATING_RANK: number;
  OPP_PTS_PAINT: number; OPP_PTS_PAINT_RANK: number;
  OPP_PTS_OFF_TOV: number; OPP_PTS_OFF_TOV_RANK: number;
  OPP_PTS_2ND_CHANCE: number; OPP_PTS_2ND_CHANCE_RANK: number;
}

interface TeamAnalytics {
  team_name: string;
  season: string;
  team_stats: TeamStat;
  defensive_stats: DefStat;
  players: LeaderRow[];
}

const METRICS: { key: Metric; label: string }[] = [
  { key: "points", label: "Points" },
  { key: "rebounds", label: "Rebounds" },
  { key: "assists", label: "Assists" },
  { key: "steals", label: "Steals" },
  { key: "blocks", label: "Blocks" },
  { key: "per", label: "PER" },
  { key: "true_shooting_pct", label: "TS%" },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
function RankBadge({ rank, total = 30 }: { rank: number; total?: number }) {
  const pct = rank / total;
  const color = pct <= 0.1 ? "text-emerald-400 bg-emerald-900/40"
    : pct <= 0.33 ? "text-blue-400 bg-blue-900/40"
    : pct <= 0.67 ? "text-yellow-400 bg-yellow-900/40"
    : "text-red-400 bg-red-900/40";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold tabular-nums ${color}`}>
      #{rank}
    </span>
  );
}

function StatCard({ label, value, rank, suffix = "" }: { label: string; value: string | number; rank?: number; suffix?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-xl font-bold tabular-nums">{value}{suffix}</div>
      {rank != null && <div className="mt-1"><RankBadge rank={rank} /></div>}
    </div>
  );
}

// ─── Team Stats Panel ─────────────────────────────────────────────────────────
function TeamStatsPanel({ data }: { data: TeamAnalytics }) {
  const ts = data.team_stats;
  const def = data.defensive_stats;

  return (
    <div className="mb-8">
      {/* Record */}
      <div className="flex items-center gap-4 mb-4">
        <div className="text-3xl font-bold">{ts.W}-{ts.L}</div>
        <div className="text-gray-400 text-sm">{(ts.W_PCT * 100).toFixed(1)}% • {ts.GP} GP • {data.season}</div>
      </div>

      {/* Offense */}
      <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Offense</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-5">
        <StatCard label="Points" value={ts.PTS?.toFixed(1)} rank={ts.PTS_RANK} />
        <StatCard label="FG%" value={`${(ts.FG_PCT * 100).toFixed(1)}%`} rank={ts.FG_PCT_RANK} />
        <StatCard label="3P%" value={`${(ts.FG3_PCT * 100).toFixed(1)}%`} rank={ts.FG3_PCT_RANK} />
        <StatCard label="3PM" value={ts.FG3M?.toFixed(1)} rank={ts.FG3M_RANK} />
        <StatCard label="Assists" value={ts.AST?.toFixed(1)} rank={ts.AST_RANK} />
        <StatCard label="Turnovers" value={ts.TOV?.toFixed(1)} rank={ts.TOV_RANK} />
      </div>

      {/* Defense */}
      <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Defense</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-5">
        <StatCard label="Def Rating" value={def?.DEF_RATING?.toFixed(1) ?? "—"} rank={def?.DEF_RATING_RANK} />
        <StatCard label="Steals" value={ts.STL?.toFixed(1)} rank={ts.STL_RANK} />
        <StatCard label="Blocks" value={ts.BLK?.toFixed(1)} rank={ts.BLK_RANK} />
        <StatCard label="Opp Paint Pts" value={def?.OPP_PTS_PAINT?.toFixed(1) ?? "—"} rank={def?.OPP_PTS_PAINT_RANK} />
        <StatCard label="Opp 2nd Chance" value={def?.OPP_PTS_2ND_CHANCE?.toFixed(1) ?? "—"} rank={def?.OPP_PTS_2ND_CHANCE_RANK} />
        <StatCard label="Opp Off TOV" value={def?.OPP_PTS_OFF_TOV?.toFixed(1) ?? "—"} rank={def?.OPP_PTS_OFF_TOV_RANK} />
      </div>

      {/* Other */}
      <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Other</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
        <StatCard label="Rebounds" value={ts.REB?.toFixed(1)} rank={ts.REB_RANK} />
        <StatCard label="Off Reb" value={ts.OREB?.toFixed(1)} rank={ts.OREB_RANK} />
        <StatCard label="FT%" value={`${(ts.FT_PCT * 100).toFixed(1)}%`} rank={ts.FT_PCT_RANK} />
        <StatCard label="+/-" value={(ts.PLUS_MINUS > 0 ? "+" : "") + ts.PLUS_MINUS?.toFixed(1)} rank={ts.PLUS_MINUS_RANK} />
      </div>
    </div>
  );
}

// ─── Player Stats Table ───────────────────────────────────────────────────────
function PlayerTable({ players }: { players: LeaderRow[] }) {
  const [sortKey, setSortKey] = useState<string>("minutes_per_game");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const sorted = [...players].sort((a, b) => {
    const av = (a[sortKey] as number) ?? 0;
    const bv = (b[sortKey] as number) ?? 0;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const cols: { key: string; label: string; fmt?: (v: number) => string }[] = [
    { key: "minutes_per_game", label: "MIN" },
    { key: "points", label: "PTS" },
    { key: "rebounds", label: "REB" },
    { key: "assists", label: "AST" },
    { key: "steals", label: "STL" },
    { key: "blocks", label: "BLK" },
    { key: "turnovers", label: "TOV" },
    { key: "fg_pct", label: "FG%", fmt: (v) => `${(v * 100).toFixed(1)}%` },
    { key: "three_pct", label: "3P%", fmt: (v) => `${(v * 100).toFixed(1)}%` },
    { key: "ft_pct", label: "FT%", fmt: (v) => `${(v * 100).toFixed(1)}%` },
    { key: "per", label: "PER" },
    { key: "true_shooting_pct", label: "TS%", fmt: (v) => `${(v * 100).toFixed(1)}%` },
    { key: "usage_rate", label: "USG%" },
  ];

  const toggle = (key: string) => {
    if (sortKey === key) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const fmt = (row: LeaderRow, key: string, fmtFn?: (v: number) => string) => {
    const v = row[key] as number | null;
    if (v == null) return "—";
    return fmtFn ? fmtFn(v) : v.toFixed(1);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400 text-left">
            <th className="px-2 py-2 sticky left-0 bg-gray-950">Player</th>
            <th className="px-2 py-2">Pos</th>
            <th className="px-2 py-2 text-xs text-gray-500">Type</th>
            {cols.map(({ key, label }) => (
              <th
                key={key}
                className={`px-2 py-2 text-right cursor-pointer select-none hover:text-white transition-colors ${sortKey === key ? "text-orange-400" : ""}`}
                onClick={() => toggle(key)}
              >
                {label} {sortKey === key ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.player_id} className="border-b border-gray-800/40 hover:bg-gray-800/30">
              <td className="px-2 py-2 font-medium sticky left-0 bg-gray-950 whitespace-nowrap">{p.name}</td>
              <td className="px-2 py-2 text-orange-400">{p.position ?? "—"}</td>
              <td className="px-2 py-2 text-xs text-gray-500">{p.season_type === "Playoffs" ? "PO" : "RS"}</td>
              {cols.map(({ key, fmt: fmtFn }) => (
                <td key={key} className={`px-2 py-2 text-right tabular-nums ${sortKey === key ? "text-white" : "text-gray-300"}`}>
                  {fmt(p, key, fmtFn)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── League Leaderboard ───────────────────────────────────────────────────────
function Leaderboard({ teamMap }: { teamMap: Record<string, string> }) {
  const [metric, setMetric] = useState<Metric>("points");

  const { data: leaders = [], isLoading } = useQuery<LeaderRow[]>({
    queryKey: ["leaderboard", metric],
    queryFn: () => api.get("/analytics/leaderboard", { params: { metric, limit: 30 } }).then((r) => r.data),
  });

  const fmt = (row: LeaderRow, key: Metric): string => {
    const v = row[key] as number | null;
    if (v == null) return "—";
    if (key === "true_shooting_pct") return `${(v * 100).toFixed(1)}%`;
    return v.toFixed(1);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">League Leaderboard</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {METRICS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              metric === key ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-center py-12">Loading...</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-left">
              <th className="pb-2 pr-2 w-6">#</th>
              <th className="pb-2 pr-3">Player</th>
              <th className="pb-2 pr-3">Team</th>
              <th className="pb-2 pr-3">Pos</th>
              <th className="pb-2 pr-3">Type</th>
              <th className="pb-2 pr-3">PTS</th>
              <th className="pb-2 pr-3">REB</th>
              <th className="pb-2 pr-3">AST</th>
              <th className="pb-2 pr-3 text-orange-400">{METRICS.find(m => m.key === metric)?.label}</th>
              <th className="pb-2">TS%</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((row, i) => (
              <tr key={row.player_id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 pr-2 text-gray-500">{i + 1}</td>
                <td className="py-2 pr-3 font-medium">{row.name}</td>
                <td className="py-2 pr-3 text-gray-400 text-xs">{row.team_id ? (teamMap[row.team_id] ?? "—") : "—"}</td>
                <td className="py-2 pr-3 text-gray-400">{row.position ?? "—"}</td>
                <td className="py-2 pr-3 text-xs text-gray-500">{row.season_type === "Playoffs" ? "PO" : "RS"}</td>
                <td className="py-2 pr-3">{row.points?.toFixed(1) ?? "—"}</td>
                <td className="py-2 pr-3 text-gray-400">{row.rebounds?.toFixed(1) ?? "—"}</td>
                <td className="py-2 pr-3 text-gray-400">{row.assists?.toFixed(1) ?? "—"}</td>
                <td className="py-2 pr-3 text-orange-400 font-semibold">{fmt(row, metric)}</td>
                <td className="py-2 text-gray-400">
                  {row.true_shooting_pct != null ? `${(row.true_shooting_pct * 100).toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [view, setView] = useState<"team" | "league">("team");
  const [selectedTeam, setSelectedTeam] = useState("");

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: () => api.get("/teams/").then((r) => r.data),
  });

  const { data: teamData, isLoading: teamLoading } = useQuery<TeamAnalytics>({
    queryKey: ["team-analytics", selectedTeam],
    queryFn: () => api.get(`/analytics/team/${selectedTeam}`).then((r) => r.data),
    enabled: !!selectedTeam && view === "team",
  });

  // Build abbreviation map for leaderboard
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t.abbreviation]));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-7 w-7 text-blue-400" />
          <h1 className="text-2xl font-bold">Analytics</h1>
        </div>
        <div className="flex gap-2">
          {(["team", "league"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                view === v ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {v === "team" ? "Team Stats" : "League Leaders"}
            </button>
          ))}
        </div>
      </div>

      {view === "team" && (
        <>
          <div className="mb-6">
            <select
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="">Select a team...</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>

          {teamLoading && <div className="text-gray-400 text-center py-20">Loading team stats...</div>}

          {teamData && !teamLoading && (
            <>
              <h2 className="text-xl font-bold mb-4">{teamData.team_name}</h2>
              <TeamStatsPanel data={teamData} />

              <div className="border-t border-gray-800 pt-6">
                <h2 className="text-lg font-semibold mb-1">Player Stats</h2>
                <p className="text-xs text-gray-500 mb-4">
                  PO = Playoff stats · RS = Regular Season stats · Click column headers to sort
                </p>
                <PlayerTable players={teamData.players} />
              </div>
            </>
          )}

          {!selectedTeam && (
            <div className="text-gray-500 text-center py-20">Select a team to view their stats and rankings</div>
          )}
        </>
      )}

      {view === "league" && <Leaderboard teamMap={teamMap} />}
    </div>
  );
}
