"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, Team, Player } from "@/lib/api";
import { ArrowLeftRight, Loader2, X, Plus, User, Users } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DraftPick {
  id: string;
  label: string;
}

interface TradeLeg {
  teamId: string;
  teamName: string;
  teamAbbr: string;
  playersOut: Player[];
  picksOut: DraftPick[];
}

const PICK_YEARS = [2026, 2027, 2028, 2029];

function makePicks(teamAbbr: string): DraftPick[] {
  return PICK_YEARS.flatMap((yr) =>
    [1, 2].map((rd) => ({
      id: `${teamAbbr}-${yr}-R${rd}`,
      label: `${yr} ${rd === 1 ? "1st" : "2nd"} Round Pick`,
    }))
  );
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

function Pill({ label, sub, onRemove }: { label: string; sub?: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-700 rounded-full text-xs font-medium">
      {label}
      {sub && <span className="text-gray-400">{sub}</span>}
      <button onClick={onRemove} className="text-gray-400 hover:text-red-400 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ─── Team Leg Card ────────────────────────────────────────────────────────────
function TeamLeg({
  leg, teams, usedTeamIds,
  onTeamChange, onAddPlayer, onRemovePlayer,
  onAddPick, onRemovePick, onRemoveLeg, canRemove,
}: {
  leg: TradeLeg; teams: Team[]; usedTeamIds: string[];
  onTeamChange: (teamId: string, teamName: string, abbr: string) => void;
  onAddPlayer: (player: Player) => void;
  onRemovePlayer: (id: string) => void;
  onAddPick: (pick: DraftPick) => void;
  onRemovePick: (id: string) => void;
  onRemoveLeg: () => void;
  canRemove: boolean;
}) {
  const { data: roster = [] } = useQuery<Player[]>({
    queryKey: ["trade-roster", leg.teamId],
    queryFn: () => api.get(`/teams/${leg.teamId}/roster`).then((r) => r.data),
    enabled: !!leg.teamId,
  });

  const selectedPlayerIds = new Set(leg.playersOut.map((p) => p.id));
  const selectedPickIds   = new Set(leg.picksOut.map((p) => p.id));
  const availablePlayers  = roster.filter((p) => !selectedPlayerIds.has(p.id));
  const availablePicks    = makePicks(leg.teamAbbr || "TM").filter((pk) => !selectedPickIds.has(pk.id));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex-1 min-w-[240px]">
      {/* Team dropdown */}
      <div className="flex items-center gap-2 mb-4">
        <select
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-orange-500"
          value={leg.teamId}
          onChange={(e) => {
            const t = teams.find((t) => t.id === e.target.value);
            if (t) onTeamChange(t.id, t.full_name, t.abbreviation ?? "TM");
          }}
        >
          <option value="">Select team…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id} disabled={usedTeamIds.includes(t.id) && t.id !== leg.teamId}>
              {t.full_name}
            </option>
          ))}
        </select>
        {canRemove && (
          <button onClick={onRemoveLeg} className="text-gray-500 hover:text-red-400 transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {leg.teamId && (
        <>
          {/* Players dropdown */}
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Players</div>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-orange-500 mb-2"
              value=""
              onChange={(e) => {
                const p = roster.find((p) => p.id === e.target.value);
                if (p) onAddPlayer(p);
              }}
            >
              <option value="">Add player…</option>
              {availablePlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}{p.position ? ` (${p.position})` : ""}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1.5 min-h-[24px]">
              {leg.playersOut.length === 0 && <span className="text-xs text-gray-600 italic">None selected</span>}
              {leg.playersOut.map((p) => (
                <Pill key={p.id} label={p.full_name} sub={p.position ?? undefined} onRemove={() => onRemovePlayer(p.id)} />
              ))}
            </div>
          </div>

          {/* Draft picks dropdown */}
          <div>
            <div className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Draft Picks</div>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-orange-500 mb-2"
              value=""
              onChange={(e) => {
                const pk = availablePicks.find((p) => p.id === e.target.value);
                if (pk) onAddPick(pk);
              }}
            >
              <option value="">Add draft pick…</option>
              {availablePicks.map((pk) => (
                <option key={pk.id} value={pk.id}>
                  {leg.teamAbbr} {pk.label}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1.5 min-h-[24px]">
              {leg.picksOut.length === 0 && <span className="text-xs text-gray-600 italic">No picks included</span>}
              {leg.picksOut.map((pk) => (
                <Pill key={pk.id} label={`${leg.teamAbbr} ${pk.label}`} onRemove={() => onRemovePick(pk.id)} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab: Multi-team Trade Builder ────────────────────────────────────────────
function TradeBuilder({ teams }: { teams: Team[] }) {
  const [legs, setLegs] = useState<TradeLeg[]>([
    { teamId: "", teamName: "", teamAbbr: "", playersOut: [], picksOut: [] },
    { teamId: "", teamName: "", teamAbbr: "", playersOut: [], picksOut: [] },
  ]);

  const usedTeamIds = legs.map((l) => l.teamId).filter(Boolean);

  const addLeg    = () => { if (legs.length < 4) setLegs((p) => [...p, { teamId: "", teamName: "", teamAbbr: "", playersOut: [], picksOut: [] }]); };
  const removeLeg = (i: number) => setLegs((p) => p.filter((_, idx) => idx !== i));

  const updateTeam    = (i: number, teamId: string, teamName: string, teamAbbr: string) =>
    setLegs((p) => p.map((l, idx) => idx === i ? { ...l, teamId, teamName, teamAbbr, playersOut: [], picksOut: [] } : l));
  const addPlayer     = (i: number, player: Player) =>
    setLegs((p) => p.map((l, idx) => idx === i ? { ...l, playersOut: [...l.playersOut, player] } : l));
  const removePlayer  = (i: number, id: string) =>
    setLegs((p) => p.map((l, idx) => idx === i ? { ...l, playersOut: l.playersOut.filter((pl) => pl.id !== id) } : l));
  const addPick       = (i: number, pick: DraftPick) =>
    setLegs((p) => p.map((l, idx) => idx === i ? { ...l, picksOut: [...l.picksOut, pick] } : l));
  const removePick    = (i: number, id: string) =>
    setLegs((p) => p.map((l, idx) => idx === i ? { ...l, picksOut: l.picksOut.filter((pk) => pk.id !== id) } : l));

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/trades/grade", {
        legs: legs.map((l) => ({
          team_id: l.teamId,
          players_out: l.playersOut.map((p) => p.id),
          picks_out: l.picksOut.map((pk) => `${l.teamAbbr} ${pk.label}`),
        })),
      }).then((r) => r.data),
  });

  const hasContent = legs.some((l) => l.playersOut.length > 0 || l.picksOut.length > 0);
  const canGrade   = legs.every((l) => l.teamId) && hasContent;
  const tradeSummary = legs.map((l) => l.teamName.split(" ").pop() ?? l.teamName).join(" ↔ ");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400 text-sm">Build a trade between 2–4 teams. Include players and/or draft picks.</p>
        {legs.length < 4 && (
          <button onClick={addLeg} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add Team
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        {legs.map((leg, i) => (
          <TeamLeg
            key={i} leg={leg} teams={teams} usedTeamIds={usedTeamIds}
            onTeamChange={(id, name, abbr) => updateTeam(i, id, name, abbr)}
            onAddPlayer={(p) => addPlayer(i, p)}
            onRemovePlayer={(id) => removePlayer(i, id)}
            onAddPick={(pk) => addPick(i, pk)}
            onRemovePick={(id) => removePick(i, id)}
            onRemoveLeg={() => removeLeg(i)}
            canRemove={legs.length > 2}
          />
        ))}
      </div>

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

      {mutation.data && <AIResult title={`Trade Analysis: ${tradeSummary}`} content={mutation.data.analysis} />}
    </div>
  );
}

// ─── Tab: Player Trade Suggestions ───────────────────────────────────────────
function PlayerSuggestions({ teams }: { teams: Team[] }) {
  const [teamId, setTeamId]   = useState("");
  const [playerId, setPlayerId] = useState("");

  const { data: roster = [] } = useQuery<Player[]>({
    queryKey: ["trade-roster-player", teamId],
    queryFn: () => api.get(`/teams/${teamId}/roster`).then((r) => r.data),
    enabled: !!teamId,
  });

  const mutation = useMutation({
    mutationFn: () => api.get(`/trades/player/${playerId}/suggestions`).then((r) => r.data),
  });

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">Pick a player — AI suggests realistic trade scenarios including draft pick packages.</p>
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
          value={teamId}
          onChange={(e) => { setTeamId(e.target.value); setPlayerId(""); }}
        >
          <option value="">Select team…</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>

        {teamId && (
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
          >
            <option value="">Select player…</option>
            {roster.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}{p.position ? ` (${p.position})` : ""}</option>
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
        <AIResult title={`Trade Scenarios for ${mutation.data.player} (${mutation.data.team})`} content={mutation.data.analysis} />
      )}
    </div>
  );
}

// ─── Tab: Team Trade Suggestions ─────────────────────────────────────────────
function TeamSuggestions({ teams }: { teams: Team[] }) {
  const [teamId, setTeamId] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.get(`/trades/team/${teamId}/suggestions`).then((r) => r.data),
  });

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">Pick a team — AI suggests the best trades to pursue this offseason including pick packages.</p>
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          <option value="">Select team…</option>
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
        <AIResult title={`Trade Suggestions for the ${mutation.data.team} (${mutation.data.record})`} content={mutation.data.analysis} />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type TabKey = "builder" | "player" | "team";

const TABS: { key: TabKey; label: string; icon: typeof ArrowLeftRight }[] = [
  { key: "builder", label: "Trade Builder", icon: ArrowLeftRight },
  { key: "player",  label: "For a Player",  icon: User },
  { key: "team",    label: "For a Team",    icon: Users },
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

      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
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
