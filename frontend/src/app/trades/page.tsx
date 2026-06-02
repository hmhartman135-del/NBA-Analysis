"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, Team, Player } from "@/lib/api";
import { ArrowLeftRight, Search, Loader2, X, Plus, User, Users } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TradeLeg {
  teamId: string;
  teamName: string;
  playersOut: Player[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function AIResult({ title, content }: { title: string; content: string }) {
  return (
    <div className="mt-5 bg-gray-900 border border-gray-700 rounded-xl p-5">
      <div className="text-sm font-semibold text-orange-300 mb-3">{title}</div>
      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
    </div>
  );
}

function PlayerPill({ player, onRemove }: { player: Player; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-700 rounded-full text-xs font-medium">
      {player.full_name}
      <span className="text-gray-400">{player.position ?? "?"}</span>
      <button onClick={onRemove} className="text-gray-400 hover:text-red-400 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ─── Team selector with player picker ────────────────────────────────────────
function TeamLeg({
  leg,
  teams,
  usedTeamIds,
  onTeamChange,
  onAddPlayer,
  onRemovePlayer,
  onRemoveLeg,
  canRemove,
}: {
  leg: TradeLeg;
  teams: Team[];
  usedTeamIds: string[];
  onTeamChange: (teamId: string, teamName: string) => void;
  onAddPlayer: (player: Player) => void;
  onRemovePlayer: (playerId: string) => void;
  onRemoveLeg: () => void;
  canRemove: boolean;
}) {
  const [search, setSearch] = useState("");

  const { data: roster = [] } = useQuery<Player[]>({
    queryKey: ["trade-roster", leg.teamId],
    queryFn: () => api.get(`/teams/${leg.teamId}/roster`).then((r) => r.data),
    enabled: !!leg.teamId,
  });

  const selectedIds = new Set(leg.playersOut.map((p) => p.id));
  const filtered = roster.filter(
    (p) => !selectedIds.has(p.id) && p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex-1 min-w-[220px]">
      <div className="flex items-center justify-between mb-3">
        <select
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-orange-500"
          value={leg.teamId}
          onChange={(e) => {
            const t = teams.find((t) => t.id === e.target.value);
            if (t) onTeamChange(t.id, t.full_name);
          }}
        >
          <option value="">Select team...</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id} disabled={usedTeamIds.includes(t.id) && t.id !== leg.teamId}>
              {t.full_name}
            </option>
          ))}
        </select>
        {canRemove && (
          <button onClick={onRemoveLeg} className="ml-2 text-gray-500 hover:text-red-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Players going out */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1.5">Sending out:</div>
        <div className="flex flex-wrap gap-1.5 min-h-[28px]">
          {leg.playersOut.length === 0 && <span className="text-xs text-gray-600 italic">No players selected</span>}
          {leg.playersOut.map((p) => (
            <PlayerPill key={p.id} player={p} onRemove={() => onRemovePlayer(p.id)} />
          ))}
        </div>
      </div>

      {/* Player search */}
      {leg.teamId && (
        <div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:border-orange-500"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <div className="mt-1 bg-gray-800 border border-gray-700 rounded-lg max-h-36 overflow-y-auto">
              {filtered.slice(0, 10).map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onAddPlayer(p); setSearch(""); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 flex justify-between items-center"
                >
                  <span>{p.full_name}</span>
                  <span className="text-gray-400">{p.position ?? "?"}</span>
                </button>
              ))}
              {filtered.length === 0 && <div className="px-3 py-2 text-xs text-gray-500">No players found</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Multi-team Trade Builder ────────────────────────────────────────────
function TradeBuilder({ teams }: { teams: Team[] }) {
  const [legs, setLegs] = useState<TradeLeg[]>([
    { teamId: "", teamName: "", playersOut: [] },
    { teamId: "", teamName: "", playersOut: [] },
  ]);

  const usedTeamIds = legs.map((l) => l.teamId).filter(Boolean);

  const addLeg = () => {
    if (legs.length < 4) setLegs((prev) => [...prev, { teamId: "", teamName: "", playersOut: [] }]);
  };
  const removeLeg = (i: number) => setLegs((prev) => prev.filter((_, idx) => idx !== i));

  const updateTeam = (i: number, teamId: string, teamName: string) =>
    setLegs((prev) => prev.map((l, idx) => idx === i ? { ...l, teamId, teamName, playersOut: [] } : l));

  const addPlayer = (i: number, player: Player) =>
    setLegs((prev) => prev.map((l, idx) => idx === i ? { ...l, playersOut: [...l.playersOut, player] } : l));

  const removePlayer = (i: number, playerId: string) =>
    setLegs((prev) => prev.map((l, idx) => idx === i ? { ...l, playersOut: l.playersOut.filter((p) => p.id !== playerId) } : l));

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/trades/grade", {
        legs: legs.map((l) => ({ team_id: l.teamId, players_out: l.playersOut.map((p) => p.id) })),
      }).then((r) => r.data),
  });

  const canGrade = legs.every((l) => l.teamId) && legs.some((l) => l.playersOut.length > 0);

  // Build trade summary for title
  const tradeSummary = legs.map((l) => l.teamName.split(" ").pop() ?? l.teamName).join(" ↔ ");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400 text-sm">Build a trade between 2–4 teams, then grade it with AI.</p>
        {legs.length < 4 && (
          <button
            onClick={addLeg}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Team
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        {legs.map((leg, i) => (
          <TeamLeg
            key={i}
            leg={leg}
            teams={teams}
            usedTeamIds={usedTeamIds}
            onTeamChange={(id, name) => updateTeam(i, id, name)}
            onAddPlayer={(p) => addPlayer(i, p)}
            onRemovePlayer={(id) => removePlayer(i, id)}
            onRemoveLeg={() => removeLeg(i)}
            canRemove={legs.length > 2}
          />
        ))}
      </div>

      {/* Arrow connectors */}
      {legs.every((l) => l.teamId) && (
        <div className="flex items-center justify-center gap-2 mb-4 text-sm text-gray-400">
          {legs.map((l, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="font-medium text-white">{l.teamName.split(" ").pop()}</span>
              {i < legs.length - 1 && <ArrowLeftRight className="h-4 w-4 text-orange-400" />}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={!canGrade || mutation.isPending}
        className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 rounded-lg text-sm font-semibold flex items-center gap-2"
      >
        {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Grade This Trade with AI
      </button>

      {mutation.data && (
        <AIResult title={`Trade Analysis: ${tradeSummary}`} content={mutation.data.analysis} />
      )}
    </div>
  );
}

// ─── Tab: Player Trade Suggestions ───────────────────────────────────────────
function PlayerSuggestions({ teams }: { teams: Team[] }) {
  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");

  const { data: roster = [] } = useQuery<Player[]>({
    queryKey: ["trade-roster-player", teamId],
    queryFn: () => api.get(`/teams/${teamId}/roster`).then((r) => r.data),
    enabled: !!teamId,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.get(`/trades/player/${playerId}/suggestions`).then((r) => r.data),
  });

  const selectedPlayer = roster.find((p) => p.id === playerId);

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">Pick a player and AI will suggest realistic trade scenarios for them.</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
          value={teamId}
          onChange={(e) => { setTeamId(e.target.value); setPlayerId(""); }}
        >
          <option value="">Select team...</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>

        {teamId && (
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
          >
            <option value="">Select player...</option>
            {roster.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name} ({p.position ?? "?"})</option>
            ))}
          </select>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={!playerId || mutation.isPending}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Find Trades
        </button>
      </div>

      {mutation.data && (
        <AIResult
          title={`Trade Scenarios for ${mutation.data.player} (${mutation.data.team})`}
          content={mutation.data.analysis}
        />
      )}
    </div>
  );
}

// ─── Tab: Team Trade Suggestions ─────────────────────────────────────────────
function TeamSuggestions({ teams }: { teams: Team[] }) {
  const [teamId, setTeamId] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.get(`/trades/team/${teamId}/suggestions`).then((r) => r.data),
  });

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">Pick a team and AI will suggest the best trades they should pursue.</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          <option value="">Select team...</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>

        <button
          onClick={() => mutation.mutate()}
          disabled={!teamId || mutation.isPending}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Suggest Trades
        </button>
      </div>

      {mutation.data && (
        <AIResult
          title={`Trade Suggestions for the ${mutation.data.team} (${mutation.data.record})`}
          content={mutation.data.analysis}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type TabKey = "builder" | "player" | "team";

const TABS: { key: TabKey; label: string; icon: typeof ArrowLeftRight }[] = [
  { key: "builder", label: "Trade Builder", icon: ArrowLeftRight },
  { key: "player", label: "For a Player", icon: User },
  { key: "team",   label: "For a Team",   icon: Users },
];

export default function TradesPage() {
  const [tab, setTab] = useState<TabKey>("builder");

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: () => api.get("/teams/").then((r) => r.data),
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ArrowLeftRight className="h-7 w-7 text-rose-400" />
        <h1 className="text-2xl font-bold">Trade Center</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? "bg-rose-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
        {tab === "builder" && <TradeBuilder teams={teams} />}
        {tab === "player"  && <PlayerSuggestions teams={teams} />}
        {tab === "team"    && <TeamSuggestions teams={teams} />}
      </div>
    </div>
  );
}
