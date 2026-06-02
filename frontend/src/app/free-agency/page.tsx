"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, Team, Player } from "@/lib/api";
import { UserCheck, Search, Loader2, X, Plus, Star } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FAPlayer {
  nba_id: number;
  player_id: string | null;
  name: string;
  position: string | null;
  age: number | null;
  height: string | null;
  last_team: string | null;
  last_team_city: string | null;
  last_team_name: string | null;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  fg_pct: number | null;
  three_pct: number | null;
  minutes: number | null;
  season_type?: string;
  current_team: string | null;
  salary_2526: string | null;
  fa_type: string; // UFA, Player Option, Team Option
}

interface MockMove {
  player_id: string;
  name: string;
  position: string | null;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function AIResult({ title, content }: { title: string; content: string }) {
  return (
    <div className="mt-5 bg-gray-900 border border-gray-700 rounded-xl p-5">
      <div className="text-sm font-semibold text-emerald-300 mb-3">{title}</div>
      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: string | number | null }) {
  if (value == null) return null;
  return (
    <span className="text-xs text-gray-400">
      <span className="text-gray-500">{label} </span>{typeof value === "number" ? value.toFixed(1) : value}
    </span>
  );
}

const FA_TYPE_COLORS: Record<string, string> = {
  "UFA": "bg-emerald-900/40 text-emerald-400",
  "Player Option": "bg-blue-900/40 text-blue-400",
  "Team Option": "bg-yellow-900/40 text-yellow-400",
};

// ─── FA List Tab ──────────────────────────────────────────────────────────────
function FAList() {
  const [faTypeFilter, setFaTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");

  const { data: fas = [], isLoading } = useQuery<FAPlayer[]>({
    queryKey: ["free-agents", faTypeFilter, search, position],
    queryFn: () =>
      api.get("/free-agency/list", {
        params: {
          fa_type: faTypeFilter || undefined,
          search: search || undefined,
          position: position || undefined,
        },
      }).then((r) => r.data),
  });

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">
        Players entering free agency in the 2026 offseason — sourced from Basketball Reference contract data.
      </p>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            className="bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm w-48 focus:outline-none focus:border-emerald-500"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        >
          <option value="">All Positions</option>
          {["PG", "SG", "SF", "PF", "C"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
          value={faTypeFilter}
          onChange={(e) => setFaTypeFilter(e.target.value)}
        >
          <option value="">All FA Types</option>
          <option value="UFA">UFA only</option>
          <option value="Player Option">Player Option</option>
          <option value="Team Option">Team Option</option>
        </select>

        <span className="text-sm text-gray-500">{fas.length} players</span>
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-center py-16">Loading free agents...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-left">
                <th className="px-3 py-2">Player</th>
                <th className="px-2 py-2">Pos</th>
                <th className="px-2 py-2">Age</th>
                <th className="px-2 py-2">Team</th>
                <th className="px-2 py-2">FA Type</th>
                <th className="px-2 py-2">2025-26 Salary</th>
                <th className="px-2 py-2 text-right">PTS</th>
                <th className="px-2 py-2 text-right">REB</th>
                <th className="px-2 py-2 text-right">AST</th>
                <th className="px-2 py-2 text-right">MIN</th>
                <th className="px-2 py-2 text-right">FG%</th>
                <th className="px-2 py-2 text-right">3P%</th>
                <th className="px-2 py-2 text-xs text-gray-500">Stats</th>
              </tr>
            </thead>
            <tbody>
              {fas.map((p, i) => (
                <tr key={`${p.name}-${i}`} className="border-b border-gray-800/40 hover:bg-gray-800/30">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-2 py-2 text-emerald-400">{p.position ?? "—"}</td>
                  <td className="px-2 py-2 text-gray-400">{p.age ?? "—"}</td>
                  <td className="px-2 py-2 text-gray-400">{p.current_team ?? "—"}</td>
                  <td className="px-2 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${FA_TYPE_COLORS[p.fa_type] ?? "text-gray-400"}`}>
                      {p.fa_type}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-gray-300 text-xs tabular-nums">{p.salary_2526 ?? "—"}</td>
                  <td className="px-2 py-2 text-right">{p.points?.toFixed(1) ?? "—"}</td>
                  <td className="px-2 py-2 text-right text-gray-400">{p.rebounds?.toFixed(1) ?? "—"}</td>
                  <td className="px-2 py-2 text-right text-gray-400">{p.assists?.toFixed(1) ?? "—"}</td>
                  <td className="px-2 py-2 text-right text-gray-400">{p.minutes?.toFixed(1) ?? "—"}</td>
                  <td className="px-2 py-2 text-right text-gray-400">{p.fg_pct != null ? `${p.fg_pct}%` : "—"}</td>
                  <td className="px-2 py-2 text-right text-gray-400">{p.three_pct != null ? `${p.three_pct}%` : "—"}</td>
                  <td className="px-2 py-2 text-xs text-gray-500">{p.season_type === "Playoffs" ? "PO" : p.season_type ? "RS" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {fas.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 py-12">No free agents found</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AI Offseason Plan Tab ────────────────────────────────────────────────────
function OffseasonPlan({ teams }: { teams: Team[] }) {
  const [teamId, setTeamId] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.get(`/free-agency/team/${teamId}/plan`).then((r) => r.data),
  });

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">
        Pick a team and AI will build a complete 2026 offseason plan — re-signs, FA targets, trades, and draft strategy.
      </p>
      <div className="flex gap-3 items-center mb-4">
        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          <option value="">Select a team...</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
        <button
          onClick={() => mutation.mutate()}
          disabled={!teamId || mutation.isPending}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Build Offseason Plan
        </button>
        {mutation.isPending && (
          <span className="text-xs text-gray-400">Analyzing roster + FA pool... ~15s</span>
        )}
      </div>
      {mutation.data && (
        <AIResult
          title={`2026 Offseason Plan — ${mutation.data.team} (${mutation.data.record})`}
          content={mutation.data.plan}
        />
      )}
    </div>
  );
}

// ─── Mock Offseason Tab ───────────────────────────────────────────────────────
type RosterAction = "keep" | "release" | "trade_away";
type FAAction = "pass" | "sign" | "trade_for";

function MockOffseason({ teams }: { teams: Team[] }) {
  const [teamId, setTeamId] = useState("");
  const [notes, setNotes] = useState("");
  const [rosterActions, setRosterActions] = useState<Record<string, RosterAction>>({});
  const [faActions, setFaActions] = useState<Record<string, FAAction>>({});
  const [faSearch, setFaSearch] = useState("");
  const [faPositionFilter, setFaPositionFilter] = useState("");

  const { data: roster = [] } = useQuery<Player[]>({
    queryKey: ["mock-roster", teamId],
    queryFn: () => api.get(`/teams/${teamId}/roster`).then((r) => r.data),
    enabled: !!teamId,
  });

  const { data: fas = [], isLoading: fasLoading } = useQuery<FAPlayer[]>({
    queryKey: ["all-fas"],
    queryFn: () => api.get("/free-agency/list").then((r) => r.data),
    enabled: !!teamId,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const released = roster
        .filter(p => rosterActions[p.id] === "release")
        .map(p => ({ player_id: p.id, name: p.full_name, position: p.position }));
      const tradedAway = roster
        .filter(p => rosterActions[p.id] === "trade_away")
        .map(p => ({ player_id: p.id, name: p.full_name, position: p.position }));
      const signed = fas
        .filter(p => p.player_id && faActions[p.player_id] === "sign")
        .map(p => ({ player_id: p.player_id!, name: p.name, position: p.position }));
      const tradedFor = fas
        .filter(p => p.player_id && faActions[p.player_id] === "trade_for")
        .map(p => ({ player_id: p.player_id!, name: p.name, position: p.position }));
      return api.post("/free-agency/grade-mock", {
        team_id: teamId, signed, released, traded_away: tradedAway, traded_for: tradedFor, notes,
      }).then(r => r.data);
    },
  });

  const setRosterAction = (id: string, action: RosterAction) =>
    setRosterActions(prev => ({ ...prev, [id]: action }));
  const setFaAction = (id: string, action: FAAction) =>
    setFaActions(prev => ({ ...prev, [id]: action }));

  const totalMoves = Object.values(rosterActions).filter(a => a !== "keep").length
    + Object.values(faActions).filter(a => a !== "pass").length;

  const filteredFas = fas.filter(p =>
    (!faSearch || p.name.toLowerCase().includes(faSearch.toLowerCase())) &&
    (!faPositionFilter || (p.position ?? "").includes(faPositionFilter))
  );

  const actionedFaIds = new Set(Object.entries(faActions).filter(([, v]) => v !== "pass").map(([k]) => k));

  const ROSTER_ACTION_STYLES: Record<RosterAction, string> = {
    keep:      "bg-gray-700 text-gray-300",
    release:   "bg-red-900/60 text-red-300 border border-red-700/50",
    trade_away:"bg-orange-900/60 text-orange-300 border border-orange-700/50",
  };
  const FA_ACTION_STYLES: Record<FAAction, string> = {
    pass:      "bg-gray-700 text-gray-300",
    sign:      "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50",
    trade_for: "bg-blue-900/60 text-blue-300 border border-blue-700/50",
  };

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">
        Pick a team, decide what to do with each roster player, then sign or acquire free agents. AI grades your offseason.
      </p>

      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          value={teamId}
          onChange={(e) => { setTeamId(e.target.value); setRosterActions({}); setFaActions({}); }}
        >
          <option value="">Select a team...</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
        {teamId && (
          <button
            onClick={() => { setRosterActions({}); setFaActions({}); setNotes(""); }}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 rounded-lg"
          >
            Reset all
          </button>
        )}
      </div>

      {teamId && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* ── Left: Current Roster ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-200">Current Roster</h3>
              <div className="flex gap-2 text-xs text-gray-500">
                <span className="px-1.5 py-0.5 bg-gray-700 rounded">Keep</span>
                <span className="px-1.5 py-0.5 bg-red-900/50 text-red-400 rounded">Release</span>
                <span className="px-1.5 py-0.5 bg-orange-900/50 text-orange-400 rounded">Trade</span>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {roster.length === 0 && (
                <div className="text-center text-gray-500 py-8 text-sm">Loading roster...</div>
              )}
              {roster.map((p, i) => {
                const action = rosterActions[p.id] ?? "keep";
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-3 py-2.5 ${i < roster.length - 1 ? "border-b border-gray-800/60" : ""} ${action !== "keep" ? "bg-gray-800/40" : "hover:bg-gray-800/20"}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-emerald-400 w-5 shrink-0">{p.position ?? "?"}</span>
                      <span className="font-medium text-sm truncate">{p.full_name}</span>
                      <span className="text-xs text-gray-500 shrink-0">{p.age ? `${p.age}yo` : ""}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {(["keep", "release", "trade_away"] as RosterAction[]).map(a => (
                        <button
                          key={a}
                          onClick={() => setRosterAction(p.id, a)}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${action === a ? ROSTER_ACTION_STYLES[a] : "bg-gray-800 text-gray-500 hover:bg-gray-700"}`}
                        >
                          {a === "keep" ? "Keep" : a === "release" ? "Release" : "Trade"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right: Free Agents ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-200">Free Agents</h3>
              <div className="flex gap-2 text-xs text-gray-500">
                <span className="px-1.5 py-0.5 bg-emerald-900/50 text-emerald-400 rounded">Sign</span>
                <span className="px-1.5 py-0.5 bg-blue-900/50 text-blue-400 rounded">Trade For</span>
              </div>
            </div>

            {/* FA filters */}
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                  placeholder="Search free agents..."
                  value={faSearch}
                  onChange={e => setFaSearch(e.target.value)}
                />
              </div>
              <select
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                value={faPositionFilter}
                onChange={e => setFaPositionFilter(e.target.value)}
              >
                <option value="">All Pos</option>
                {["PG","SG","SF","PF","C"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden max-h-[480px] overflow-y-auto">
              {fasLoading && <div className="text-center text-gray-500 py-8 text-sm">Loading free agents...</div>}

              {/* Actioned FAs pinned to top */}
              {[...fas].filter(p => p.player_id && faActions[p.player_id] && faActions[p.player_id] !== "pass").map((p, i, arr) => {
                const action = p.player_id ? (faActions[p.player_id] ?? "pass") : "pass";
                return (
                  <div key={p.name} className={`flex items-center justify-between px-3 py-2.5 border-b border-gray-800/60 ${action !== "pass" ? "bg-gray-800/40" : "hover:bg-gray-800/20"}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-emerald-400 w-5 shrink-0">{p.position ?? "?"}</span>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.current_team} · {p.points?.toFixed(1) ?? "—"} PPG · {p.salary_2526}</div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {(["pass", "sign", "trade_for"] as FAAction[]).map(a => (
                        <button
                          key={a}
                          onClick={() => p.player_id && setFaAction(p.player_id, a)}
                          disabled={!p.player_id}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${action === a ? FA_ACTION_STYLES[a] : "bg-gray-800 text-gray-500 hover:bg-gray-700"}`}
                        >
                          {a === "pass" ? "Pass" : a === "sign" ? "Sign" : "Trade"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Remaining filtered FAs */}
              {filteredFas.filter(p => !p.player_id || !faActions[p.player_id] || faActions[p.player_id] === "pass").map((p, i) => {
                const action = p.player_id ? (faActions[p.player_id] ?? "pass") : "pass";
                const isActioned = p.player_id && faActions[p.player_id] && faActions[p.player_id] !== "pass";
                if (isActioned) return null;
                return (
                  <div key={p.name} className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800/60 hover:bg-gray-800/20">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-emerald-400 w-5 shrink-0">{p.position ?? "?"}</span>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{p.name}</div>
                        <div className="text-xs text-gray-500">
                          {p.current_team} · {p.points?.toFixed(1) ?? "—"} PPG · {p.rebounds?.toFixed(1) ?? "—"} RPG · {p.salary_2526 ?? "—"}
                          {p.fa_type !== "UFA" && <span className="ml-1 text-blue-400">({p.fa_type})</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {(["pass", "sign", "trade_for"] as FAAction[]).map(a => (
                        <button
                          key={a}
                          onClick={() => p.player_id && setFaAction(p.player_id, a)}
                          disabled={!p.player_id}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-30 ${action === a ? FA_ACTION_STYLES[a] : "bg-gray-800 text-gray-500 hover:bg-gray-700"}`}
                        >
                          {a === "pass" ? "Pass" : a === "sign" ? "Sign" : "Trade"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Summary + Grade ── */}
      {teamId && (
        <div className="mt-5">
          {totalMoves > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {roster.filter(p => rosterActions[p.id] === "release").map(p => (
                <span key={p.id} className="px-2.5 py-1 bg-red-900/40 border border-red-800/50 text-red-300 rounded-full text-xs">❌ {p.full_name}</span>
              ))}
              {roster.filter(p => rosterActions[p.id] === "trade_away").map(p => (
                <span key={p.id} className="px-2.5 py-1 bg-orange-900/40 border border-orange-800/50 text-orange-300 rounded-full text-xs">📤 {p.full_name}</span>
              ))}
              {fas.filter(p => p.player_id && faActions[p.player_id] === "sign").map(p => (
                <span key={p.name} className="px-2.5 py-1 bg-emerald-900/40 border border-emerald-800/50 text-emerald-300 rounded-full text-xs">✅ {p.name}</span>
              ))}
              {fas.filter(p => p.player_id && faActions[p.player_id] === "trade_for").map(p => (
                <span key={p.name} className="px-2.5 py-1 bg-blue-900/40 border border-blue-800/50 text-blue-300 rounded-full text-xs">📥 {p.name}</span>
              ))}
            </div>
          )}

          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 mb-3 resize-none"
            rows={2}
            placeholder="Optional context (e.g. 'using MLE for signings', 'rebuilding year', 'trying to win now')..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={() => mutation.mutate()}
              disabled={totalMoves === 0 || mutation.isPending}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Star className="h-4 w-4" />
              Grade My Offseason
            </button>
            <span className="text-sm text-gray-500">{totalMoves} move{totalMoves !== 1 ? "s" : ""} planned</span>
          </div>

          {mutation.data && (
            <AIResult
              title={`Offseason Grade — ${mutation.data.team} (${mutation.data.record})`}
              content={mutation.data.grade}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type TabKey = "list" | "plan" | "mock";

const TABS: { key: TabKey; label: string }[] = [
  { key: "list", label: "Free Agent Board" },
  { key: "plan", label: "AI Offseason Plan" },
  { key: "mock", label: "Mock Offseason" },
];

export default function FreeAgencyPage() {
  const [tab, setTab] = useState<TabKey>("list");

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: () => api.get("/teams/").then((r) => r.data),
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <UserCheck className="h-7 w-7 text-emerald-400" />
        <h1 className="text-2xl font-bold">Free Agency</h1>
        <span className="text-sm text-gray-500">2026 Offseason</span>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={tab === "list" ? "" : "bg-gray-900/50 border border-gray-800 rounded-2xl p-5"}>
        {tab === "list" && <FAList />}
        {tab === "plan" && <OffseasonPlan teams={teams} />}
        {tab === "mock" && <MockOffseason teams={teams} />}
      </div>
    </div>
  );
}
