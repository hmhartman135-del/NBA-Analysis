"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, Team, Player, PlayerStats } from "@/lib/api";
import { Users, Loader2, ChevronDown, ChevronUp, Zap, Shield, ArrowUp, Circle, DollarSign } from "lucide-react";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const POSITION_LABELS: Record<string, string> = {
  PG: "Point Guard", SG: "Shooting Guard", SF: "Small Forward", PF: "Power Forward", C: "Center",
};

const SCENARIOS = [
  { key: "3pt",       label: "3PT Lineup",      icon: Circle,   color: "from-blue-600 to-blue-800",    desc: "Best floor spacers & shooters" },
  { key: "big",       label: "Big Lineup",       icon: ArrowUp,  color: "from-purple-600 to-purple-800", desc: "Max size, rebounding & post" },
  { key: "defensive", label: "Defensive Lineup", icon: Shield,   color: "from-emerald-600 to-emerald-800", desc: "Best defenders on the floor" },
  { key: "small",     label: "Small Ball",       icon: Zap,      color: "from-rose-600 to-rose-800",    desc: "Speed, pace & ball movement" },
];

interface RosterPlayer extends Player { stats?: any; }

interface ContractYear { season: string; salary: string; salary_int: number | null; option: string | null; }
interface PlayerFinance {
  player_id: string; name: string; position: string | null; age: number | null; jersey_number: string | null;
  salary: string | null; salary_int: number | null; years_remaining: number | null;
  fa_type: string | null; contract_years: ContractYear[];
}
interface TeamFinances {
  team: string; total_payroll: number; cap_space: number;
  over_cap: boolean; over_luxury: boolean; nba_cap: number; luxury_tax: number;
  players: PlayerFinance[];
}

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt$ = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;

function FaTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const colors: Record<string, string> = {
    "UFA": "bg-emerald-900/40 text-emerald-400",
    "Player Option": "bg-blue-900/40 text-blue-400",
    "Team Option": "bg-yellow-900/40 text-yellow-400",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${colors[type] ?? "text-gray-400"}`}>
      {type === "UFA" ? "UFA" : type === "Player Option" ? "PO" : "TO"}
    </span>
  );
}

function YearsBar({ years }: { years: number | null }) {
  if (!years) return <span className="text-gray-600 text-xs">—</span>;
  const max = 5;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} className={`h-2 w-2 rounded-sm ${i < years ? "bg-orange-400" : "bg-gray-700"}`} />
        ))}
      </div>
      <span className="text-xs text-gray-400">{years}yr{years !== 1 ? "s" : ""}</span>
    </div>
  );
}

// ── Finances Tab ──────────────────────────────────────────────────────────────
function FinancesTab({ teamId }: { teamId: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: finances, isLoading } = useQuery<TeamFinances>({
    queryKey: ["finances", teamId],
    queryFn: () => api.get(`/roster/${teamId}/finances`).then(r => r.data),
    enabled: !!teamId,
  });

  if (isLoading) return <div className="text-gray-400 text-center py-16">Loading contract data...</div>;
  if (!finances) return null;

  const capPct = Math.min(100, (finances.total_payroll / finances.nba_cap) * 100);
  const luxPct = Math.min(100, (finances.total_payroll / finances.luxury_tax) * 100);

  // Group upcoming FAs
  const upcomingFAs = finances.players.filter(p => p.fa_type);
  const lockedIn = finances.players.filter(p => !p.fa_type);

  return (
    <div>
      {/* Cap summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Total Payroll</div>
          <div className="text-xl font-bold">{fmt$(finances.total_payroll)}</div>
        </div>
        <div className={`bg-gray-900 border rounded-xl p-4 ${finances.over_cap ? "border-yellow-800/60" : "border-gray-800"}`}>
          <div className="text-xs text-gray-400 mb-1">Salary Cap ({fmt$(finances.nba_cap)})</div>
          <div className={`text-xl font-bold ${finances.over_cap ? "text-yellow-400" : "text-emerald-400"}`}>
            {finances.over_cap ? `+${fmt$(finances.total_payroll - finances.nba_cap)} over` : `${fmt$(finances.cap_space)} space`}
          </div>
          <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${finances.over_cap ? "bg-yellow-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(capPct, 100)}%` }} />
          </div>
        </div>
        <div className={`bg-gray-900 border rounded-xl p-4 ${finances.over_luxury ? "border-red-800/60" : "border-gray-800"}`}>
          <div className="text-xs text-gray-400 mb-1">Luxury Tax ({fmt$(finances.luxury_tax)})</div>
          <div className={`text-xl font-bold ${finances.over_luxury ? "text-red-400" : "text-gray-300"}`}>
            {finances.over_luxury ? `+${fmt$(finances.total_payroll - finances.luxury_tax)} over` : "Under tax"}
          </div>
          <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${finances.over_luxury ? "bg-red-500" : "bg-gray-600"}`} style={{ width: `${Math.min(luxPct, 100)}%` }} />
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">2026 Free Agents</div>
          <div className="text-xl font-bold">{upcomingFAs.length}</div>
          <div className="text-xs text-gray-500 mt-1">
            {upcomingFAs.filter(p => p.fa_type === "UFA").length} UFA · {upcomingFAs.filter(p => p.fa_type === "Player Option").length} PO · {upcomingFAs.filter(p => p.fa_type === "Team Option").length} TO
          </div>
        </div>
      </div>

      {/* Contract table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-left">
              <th className="px-3 py-2">#</th>
              <th className="px-2 py-2">Player</th>
              <th className="px-2 py-2">Pos</th>
              <th className="px-2 py-2">Age</th>
              <th className="px-2 py-2">2025-26 Salary</th>
              <th className="px-2 py-2">Yrs Left</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2 text-gray-500 text-xs">Details</th>
            </tr>
          </thead>
          <tbody>
            {finances.players.map(p => (
              <>
                <tr
                  key={p.player_id}
                  className={`border-b border-gray-800/40 hover:bg-gray-800/30 cursor-pointer ${p.fa_type ? "bg-amber-950/5" : ""}`}
                  onClick={() => setExpanded(expanded === p.player_id ? null : p.player_id)}
                >
                  <td className="px-3 py-2 text-gray-500">{p.jersey_number ?? "—"}</td>
                  <td className="px-2 py-2 font-medium">{p.name}</td>
                  <td className="px-2 py-2 text-orange-400">{p.position ?? "—"}</td>
                  <td className="px-2 py-2 text-gray-400">{p.age ?? "—"}</td>
                  <td className="px-2 py-2 font-mono tabular-nums">
                    {p.salary ?? <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-2 py-2"><YearsBar years={p.years_remaining} /></td>
                  <td className="px-2 py-2">
                    {p.fa_type
                      ? <FaTypeBadge type={p.fa_type} />
                      : <span className="text-xs text-gray-500">Under contract</span>
                    }
                  </td>
                  <td className="px-2 py-2 text-gray-600 text-xs">
                    {expanded === p.player_id ? "▲ hide" : "▼ show"}
                  </td>
                </tr>
                {expanded === p.player_id && p.contract_years.length > 0 && (
                  <tr key={`${p.player_id}-detail`} className="border-b border-gray-800/40">
                    <td colSpan={8} className="px-4 pb-3 pt-1">
                      <div className="flex flex-wrap gap-2 mt-1">
                        {p.contract_years.map((yr, i) => (
                          <div key={yr.season} className={`px-3 py-2 rounded-lg border text-xs ${
                            i === 0 ? "border-orange-700/50 bg-orange-950/20" : "border-gray-700 bg-gray-800/60"
                          }`}>
                            <div className="text-gray-400 mb-0.5">{yr.season}</div>
                            <div className="font-mono font-medium">{yr.salary}</div>
                            {yr.option && <FaTypeBadge type={yr.option} />}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upcoming FAs callout */}
      {upcomingFAs.length > 0 && (
        <div className="mt-6 bg-amber-950/20 border border-amber-900/40 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-300 mb-3">2026 Free Agents</h3>
          <div className="flex flex-wrap gap-2">
            {upcomingFAs.map(p => (
              <div key={p.player_id} className="px-3 py-1.5 bg-gray-900 rounded-lg text-xs flex items-center gap-2">
                <span className="font-medium">{p.name}</span>
                <span className="text-gray-400">{p.position}</span>
                <FaTypeBadge type={p.fa_type} />
                {p.salary && <span className="text-gray-500 font-mono">{p.salary}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Scenario Lineups ──────────────────────────────────────────────────────────
function ScenarioLineups({ teamId }: { teamId: string }) {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (scenario: string) =>
      api.get(`/roster/${teamId}/lineup-scenario`, { params: { scenario } }).then((r) => r.data),
    onSuccess: (_, scenario) => setActiveScenario(scenario),
  });

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-1">Lineup Scenarios</h2>
      <p className="text-gray-400 text-sm mb-4">Let AI build the optimal 5-man unit for each game situation</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {SCENARIOS.map(({ key, label, icon: Icon, color, desc }) => (
          <button
            key={key}
            onClick={() => mutation.mutate(key)}
            disabled={mutation.isPending && activeScenario === key}
            className={`relative group rounded-xl border border-gray-700 bg-gray-900 p-4 text-left hover:border-gray-500 transition-all ${activeScenario === key ? "border-orange-600/60" : ""}`}
          >
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 transition-opacity`} />
            <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${color} mb-2`}>
              {mutation.isPending && activeScenario === key
                ? <Loader2 className="h-4 w-4 text-white animate-spin" />
                : <Icon className="h-4 w-4 text-white" />}
            </div>
            <div className="text-sm font-semibold">{label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
          </button>
        ))}
      </div>

      {mutation.data && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            {SCENARIOS.find(s => s.key === activeScenario) && (() => {
              const s = SCENARIOS.find(s => s.key === activeScenario)!;
              const Icon = s.icon;
              return (
                <>
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br ${s.color}`}>
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="font-semibold text-sm">{s.label} — {mutation.data.team}</span>
                </>
              );
            })()}
          </div>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
            {mutation.data.suggestion}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Manual Rotation Builder ───────────────────────────────────────────────────
function RotationBuilder({ players }: { players: RosterPlayer[] }) {
  const [starters, setStarters] = useState<Record<string, string>>(
    Object.fromEntries(POSITIONS.map((p) => [p, ""]))
  );
  const [bench, setBench] = useState<string[]>([]);

  const starterIds = new Set(Object.values(starters).filter(Boolean));

  const toggleBench = (id: string) => {
    if (starterIds.has(id)) return;
    setBench((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const getPlayer = (id: string) => players.find((p) => p.id === id);

  const analysisMutation = useMutation({
    mutationFn: () => {
      const starterList = POSITIONS.map((pos) => {
        const p = getPlayer(starters[pos]);
        return p ? `${pos}: ${p.full_name}` : `${pos}: TBD`;
      }).join(", ");
      const benchList = bench.map((id) => getPlayer(id)?.full_name).filter(Boolean).join(", ");
      return api.post("/roster/rotation-analysis", { starters: starterList, bench: benchList }).then((r) => r.data);
    },
  });

  const optionsFor = (pos: string) => {
    const match = players.filter((p) => p.position?.includes(pos[0]) || p.position === pos);
    const rest = players.filter((p) => !match.includes(p));
    return [...match, ...rest];
  };

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-1">Manual Rotation Builder</h2>
      <p className="text-gray-400 text-sm mb-4">Pick your own starters and bench, then get AI analysis</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-3">
        <h3 className="text-sm font-medium text-orange-400 mb-3">Starting Five</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {POSITIONS.map((pos) => (
            <div key={pos}>
              <label className="text-xs text-gray-400 block mb-1">{POSITION_LABELS[pos]}</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-orange-500"
                value={starters[pos]}
                onChange={(e) => setStarters((prev) => ({ ...prev, [pos]: e.target.value }))}
              >
                <option value="">— Select —</option>
                {optionsFor(pos).map((p) => (
                  <option key={p.id} value={p.id} disabled={starterIds.has(p.id) && starters[pos] !== p.id}>
                    #{p.jersey_number} {p.full_name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-3">
        <h3 className="text-sm font-medium text-gray-400 mb-2">
          Bench <span className="text-gray-500 font-normal">(click to add/remove)</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {players.filter((p) => !starterIds.has(p.id)).map((p) => (
            <button
              key={p.id}
              onClick={() => toggleBench(p.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                bench.includes(p.id) ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              #{p.jersey_number} {p.full_name} ({p.position ?? "?"})
            </button>
          ))}
        </div>
      </div>

      {Object.values(starters).some(Boolean) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-3">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-xs text-orange-400 uppercase tracking-wide mb-2">Starters</p>
              {POSITIONS.map((pos) => {
                const p = getPlayer(starters[pos]);
                return (
                  <div key={pos} className="flex justify-between py-0.5">
                    <span className="text-gray-400 w-8">{pos}</span>
                    <span className={p ? "text-white" : "text-gray-600"}>{p ? p.full_name : "—"}</span>
                  </div>
                );
              })}
            </div>
            {bench.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Bench ({bench.length})</p>
                {bench.map((id) => {
                  const p = getPlayer(id);
                  return p ? (
                    <div key={id} className="flex justify-between py-0.5">
                      <span className="text-gray-400 w-8">{p.position ?? "?"}</span>
                      <span>{p.full_name}</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>
          <button
            onClick={() => analysisMutation.mutate()}
            disabled={analysisMutation.isPending}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            {analysisMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Analyze This Rotation with AI
          </button>
        </div>
      )}

      {analysisMutation.data && (
        <div className="p-4 bg-gray-800 rounded-xl">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
            {analysisMutation.data.analysis}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Roster Table ──────────────────────────────────────────────────────────────
function RosterTable({ players }: { players: RosterPlayer[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-gray-800/50"
        onClick={() => setExpanded((v) => !v)}
      >
        <span>Full Roster ({players.length} players)</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-b border-gray-800 text-gray-400 text-left">
              <th className="px-4 py-2">#</th>
              <th className="px-2 py-2">Pos</th>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Age</th>
              <th className="px-2 py-2">Ht</th>
              <th className="px-2 py-2">PTS</th>
              <th className="px-2 py-2">REB</th>
              <th className="px-2 py-2">AST</th>
              <th className="px-2 py-2">3P%</th>
              <th className="px-2 py-2">FG%</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="border-b border-gray-800/40 hover:bg-gray-800/30">
                <td className="px-4 py-2 text-gray-500">{p.jersey_number ?? "—"}</td>
                <td className="px-2 py-2 text-orange-400 font-medium">{p.position ?? "—"}</td>
                <td className="px-2 py-2 font-medium">{p.full_name}</td>
                <td className="px-2 py-2 text-gray-400">{p.age ?? "—"}</td>
                <td className="px-2 py-2 text-gray-400">{p.height ?? "—"}</td>
                <td className="px-2 py-2">{p.stats?.points?.toFixed(1) ?? "—"}</td>
                <td className="px-2 py-2 text-gray-400">{p.stats?.rebounds?.toFixed(1) ?? "—"}</td>
                <td className="px-2 py-2 text-gray-400">{p.stats?.assists?.toFixed(1) ?? "—"}</td>
                <td className="px-2 py-2 text-gray-400">
                  {p.stats?.three_pct != null ? `${(p.stats.three_pct * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="px-2 py-2 text-gray-400">
                  {p.stats?.fg_pct != null ? `${(p.stats.fg_pct * 100).toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type RosterTab = "roster" | "finances";

export default function RosterPage() {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [activeTab, setActiveTab] = useState<RosterTab>("roster");
  const [showAnalysis, setShowAnalysis] = useState(false);

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: () => api.get("/teams/").then((r) => r.data),
  });

  const { data: rosterPlayers = [], isLoading: rosterLoading } = useQuery<RosterPlayer[]>({
    queryKey: ["roster", selectedTeam],
    queryFn: () => api.get(`/teams/${selectedTeam}/roster`).then((r) => r.data),
    enabled: !!selectedTeam,
  });

  const { data: stats = [] } = useQuery<any[]>({
    queryKey: ["roster-stats"],
    queryFn: () => api.get("/analytics/leaderboard", { params: { limit: 600 } }).then((r) => r.data),
    enabled: !!selectedTeam,
  });

  const statsById = Object.fromEntries(stats.map((s: any) => [s.player_id, s]));
  const enriched: RosterPlayer[] = rosterPlayers.map((p) => ({ ...p, stats: statsById[p.id] }));

  const analysisMutation = useMutation({
    mutationFn: () => api.get(`/roster/${selectedTeam}/analysis`).then((r) => r.data),
  });

  const selectedTeamName = teams.find((t) => t.id === selectedTeam)?.full_name;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-7 w-7 text-orange-400" />
        <h1 className="text-2xl font-bold">Roster</h1>
      </div>

      {/* Team selector + AI button */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
          value={selectedTeam}
          onChange={(e) => { setSelectedTeam(e.target.value); setShowAnalysis(false); }}
        >
          <option value="">Select a team...</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
        {selectedTeam && (
          <button
            onClick={() => { analysisMutation.mutate(); setShowAnalysis(true); }}
            disabled={analysisMutation.isPending}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            {analysisMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            AI Roster Analysis
          </button>
        )}
      </div>

      {/* Tab switcher */}
      {selectedTeam && (
        <div className="flex gap-1 mb-5 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab("roster")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "roster" ? "bg-orange-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
          >
            <Users className="h-4 w-4" />
            Roster & Lineups
          </button>
          <button
            onClick={() => setActiveTab("finances")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "finances" ? "bg-orange-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
          >
            <DollarSign className="h-4 w-4" />
            Finances
          </button>
        </div>
      )}

      {showAnalysis && analysisMutation.data && (
        <div className="bg-gray-900 border border-orange-900/40 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-orange-300 mb-2">{selectedTeamName} — Roster Analysis</h3>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
            {analysisMutation.data.analysis}
          </pre>
        </div>
      )}

      {rosterLoading && <div className="text-gray-400 text-center py-20">Loading roster...</div>}

      {!rosterLoading && enriched.length > 0 && activeTab === "roster" && (
        <>
          <RosterTable players={enriched} />
          <ScenarioLineups teamId={selectedTeam} />
          <RotationBuilder players={enriched} />
        </>
      )}

      {selectedTeam && activeTab === "finances" && (
        <FinancesTab teamId={selectedTeam} />
      )}

      {!selectedTeam && (
        <div className="text-gray-500 text-center py-20">Select a team to view their roster</div>
      )}
    </div>
  );
}
