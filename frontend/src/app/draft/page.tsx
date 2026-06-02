"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BookOpen, Search, Loader2, X, ChevronDown, ChevronUp, Star } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Prospect {
  rank: number;
  name: string;
  school: string;
  year_class: string;
  position: string;
  height: string;
  weight: string;
  ppg: number | null;
  rpg: number | null;
  apg: number | null;
  fg_pct: number | null;
  mpg: number | null;
}

interface DraftPick {
  overall: number;
  round: number;
  pick: number;
  team_name: string;
  team_abbr: string;
  traded: boolean;
}

interface MockPick {
  overall: number;
  team_name: string;
  prospect_name: string;
  prospect_rank: number;
  position: string | null;
  school: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function AIResult({ title, content, color = "text-amber-300" }: { title: string; content: string; color?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-5 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      <button className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/50" onClick={() => setOpen(v => !v)}>
        <span className={`text-sm font-semibold ${color}`}>{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Big Board Tab ────────────────────────────────────────────────────────────
function BigBoard() {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [scoutingRank, setScoutingRank] = useState<number | null>(null);
  const [scoutResult, setScoutResult] = useState<{ rank: number; text: string } | null>(null);

  const { data: prospects = [], isLoading } = useQuery<Prospect[]>({
    queryKey: ["prospects"],
    queryFn: () => api.get("/draft/prospects").then(r => r.data),
  });

  const scoutMutation = useMutation({
    mutationFn: (rank: number) => api.get(`/draft/prospects/${rank}/scout`).then(r => r.data),
    onSuccess: (data) => setScoutResult({ rank: data.prospect.rank, text: data.report }),
  });

  const filtered = useMemo(() => prospects.filter(p =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase())) &&
    (!position || p.position?.toUpperCase().includes(position.toUpperCase()))
  ), [prospects, search, position]);

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input className="bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm w-48 focus:outline-none focus:border-amber-500"
            placeholder="Search prospects..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
          value={position} onChange={e => setPosition(e.target.value)}>
          <option value="">All Positions</option>
          {["PG","SG","SF","PF","C"].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="text-sm text-gray-500">{filtered.length} prospects (CBS Sports rankings)</span>
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-center py-16">Loading 2026 draft prospects...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-left">
                <th className="px-2 py-2 w-8">#</th>
                <th className="px-2 py-2">Prospect</th>
                <th className="px-2 py-2">School</th>
                <th className="px-2 py-2">Yr</th>
                <th className="px-2 py-2">Pos</th>
                <th className="px-2 py-2">Ht</th>
                <th className="px-2 py-2 text-right">MPG</th>
                <th className="px-2 py-2 text-right">PPG</th>
                <th className="px-2 py-2 text-right">RPG</th>
                <th className="px-2 py-2 text-right">APG</th>
                <th className="px-2 py-2 text-right">FG%</th>
                <th className="px-2 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <>
                  <tr key={p.rank} className={`border-b border-gray-800/40 hover:bg-gray-800/30 ${p.rank <= 14 ? "bg-amber-950/10" : ""}`}>
                    <td className="px-2 py-2 font-bold text-amber-400 tabular-nums">{p.rank}</td>
                    <td className="px-2 py-2 font-medium">{p.name}</td>
                    <td className="px-2 py-2 text-gray-400">{p.school}</td>
                    <td className="px-2 py-2 text-gray-500">{p.year_class}</td>
                    <td className="px-2 py-2 text-amber-400">{p.position}</td>
                    <td className="px-2 py-2 text-gray-400">{p.height}</td>
                    <td className="px-2 py-2 text-right text-gray-400">{p.mpg?.toFixed(1) ?? "—"}</td>
                    <td className="px-2 py-2 text-right">{p.ppg?.toFixed(1) ?? "—"}</td>
                    <td className="px-2 py-2 text-right text-gray-400">{p.rpg?.toFixed(1) ?? "—"}</td>
                    <td className="px-2 py-2 text-right text-gray-400">{p.apg?.toFixed(1) ?? "—"}</td>
                    <td className="px-2 py-2 text-right text-gray-400">{p.fg_pct?.toFixed(1) ?? "—"}</td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => { setScoutingRank(p.rank); scoutMutation.mutate(p.rank); }}
                        disabled={scoutMutation.isPending && scoutingRank === p.rank}
                        className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        {scoutMutation.isPending && scoutingRank === p.rank
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Star className="h-3 w-3" />}
                        Scout
                      </button>
                    </td>
                  </tr>
                  {scoutResult?.rank === p.rank && (
                    <tr key={`${p.rank}-scout`}>
                      <td colSpan={12} className="px-4 pb-4">
                        <div className="bg-gray-900 border border-amber-900/40 rounded-xl p-4 mt-1">
                          <div className="text-xs font-semibold text-amber-300 mb-2">Scout Report — {p.name}</div>
                          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{scoutResult.text}</pre>
                          <button onClick={() => setScoutResult(null)} className="mt-2 text-xs text-gray-500 hover:text-gray-300">Close</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Mock Draft Tab ───────────────────────────────────────────────────────────
function MockDraft() {
  const [rounds, setRounds] = useState<1 | 2>(2);
  const [myTeam, setMyTeam] = useState(""); // "" = all teams (AI picks), team name = user picks for that team
  const [picks, setPicks] = useState<MockPick[]>([]);
  const [searchFor, setSearchFor] = useState<number | null>(null); // pick overall number
  const [prospectSearch, setProspectSearch] = useState("");

  const { data: order = [] } = useQuery<DraftPick[]>({
    queryKey: ["draft-order"],
    queryFn: () => api.get("/draft/order").then(r => r.data),
  });

  const { data: prospects = [] } = useQuery<Prospect[]>({
    queryKey: ["prospects"],
    queryFn: () => api.get("/draft/prospects").then(r => r.data),
  });

  const gradeMutation = useMutation({
    mutationFn: () => api.post("/draft/grade-mock", { picks }).then(r => r.data),
  });

  const visibleOrder = order.filter(p => p.round <= rounds);
  const pickedRanks = new Set(picks.map(p => p.prospect_rank));
  const pickedOveralls = new Set(picks.map(p => p.overall));

  const assignPick = (overall: number, prospect: Prospect) => {
    const slot = order.find(p => p.overall === overall)!;
    setPicks(prev => {
      const filtered = prev.filter(p => p.overall !== overall && p.prospect_rank !== prospect.rank);
      return [...filtered, {
        overall,
        team_name: slot.team_name,
        prospect_name: prospect.name,
        prospect_rank: prospect.rank,
        position: prospect.position,
        school: prospect.school,
      }];
    });
    setSearchFor(null);
    setProspectSearch("");
  };

  const removePick = (overall: number) => setPicks(prev => prev.filter(p => p.overall !== overall));

  const filteredProspects = prospects.filter(p =>
    !pickedRanks.has(p.rank) &&
    p.name.toLowerCase().includes(prospectSearch.toLowerCase())
  ).slice(0, 12);

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          {([1, 2] as const).map(r => (
            <button key={r} onClick={() => setRounds(r)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${rounds === r ? "bg-amber-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
              {r} Round{r > 1 ? "s" : ""}
            </button>
          ))}
        </div>
        <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
          value={myTeam} onChange={e => setMyTeam(e.target.value)}>
          <option value="">I pick for all teams</option>
          {[...new Set(order.map(p => p.team_name))].sort().map(t =>
            <option key={t} value={t}>{t}</option>
          )}
        </select>
        <button onClick={() => setPicks([])} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 rounded-lg">
          Reset
        </button>
      </div>

      {myTeam && (
        <div className="mb-3 px-3 py-2 bg-amber-950/30 border border-amber-900/40 rounded-lg text-sm text-amber-300">
          You're picking for <strong>{myTeam}</strong>. Other teams' picks will be shown as TBD — fill in your team's slots.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5 max-h-[600px] overflow-y-auto pr-1">
        {visibleOrder.map(slot => {
          const myPick = picks.find(p => p.overall === slot.overall);
          const isMyTeam = !myTeam || slot.team_name === myTeam;
          const isOpen = searchFor === slot.overall;

          return (
            <div key={slot.overall} className={`border rounded-lg p-3 ${myPick ? "border-amber-700/50 bg-amber-950/10" : "border-gray-800 bg-gray-900"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-amber-400 font-bold tabular-nums w-7 text-sm shrink-0">{slot.overall}</span>
                  <span className="text-gray-400 text-xs truncate">{slot.team_name}</span>
                  {slot.traded && <span className="text-xs text-blue-400 shrink-0">(traded)</span>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {myPick ? (
                    <>
                      <span className="text-sm font-medium truncate max-w-[140px]">{myPick.prospect_name}</span>
                      <span className="text-xs text-gray-500">#{myPick.prospect_rank}</span>
                      {isMyTeam && (
                        <button onClick={() => removePick(slot.overall)} className="text-gray-500 hover:text-red-400">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  ) : isMyTeam ? (
                    <button onClick={() => { setSearchFor(isOpen ? null : slot.overall); setProspectSearch(""); }}
                      className="px-2 py-0.5 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 rounded text-xs">
                      + Pick
                    </button>
                  ) : (
                    <span className="text-xs text-gray-600 italic">TBD</span>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="mt-2">
                  <input className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 mb-1"
                    placeholder="Search prospect..." value={prospectSearch}
                    onChange={e => setProspectSearch(e.target.value)} autoFocus />
                  <div className="max-h-40 overflow-y-auto rounded border border-gray-700 bg-gray-800">
                    {filteredProspects.map(p => (
                      <button key={p.rank} onClick={() => assignPick(slot.overall, p)}
                        className="w-full text-left px-2 py-1.5 hover:bg-gray-700 text-xs flex justify-between">
                        <span><span className="text-amber-400 mr-1">#{p.rank}</span>{p.name}</span>
                        <span className="text-gray-400">{p.position} · {p.ppg?.toFixed(1) ?? "—"} PPG</span>
                      </button>
                    ))}
                    {filteredProspects.length === 0 && <div className="px-2 py-2 text-xs text-gray-500">No prospects available</div>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => gradeMutation.mutate()}
          disabled={picks.length === 0 || gradeMutation.isPending}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          {gradeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Grade My Mock Draft
        </button>
        <span className="text-sm text-gray-500">{picks.length} picks made</span>
      </div>

      {gradeMutation.data && (
        <AIResult title="Mock Draft Grade" content={gradeMutation.data.grade} />
      )}
    </div>
  );
}

// ─── AI Mock Draft Tab ────────────────────────────────────────────────────────
function AIMockDraft() {
  const [rounds, setRounds] = useState<1 | 2>(2);

  const mutation = useMutation({
    mutationFn: () => api.post("/draft/ai-mock", { rounds }).then(r => r.data),
  });

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">
        AI simulates the full 2026 NBA Draft considering each team's roster needs, record, and prospect fit.
      </p>
      <div className="flex gap-3 items-center mb-4">
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          {([1, 2] as const).map(r => (
            <button key={r} onClick={() => setRounds(r)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${rounds === r ? "bg-amber-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
              {r} Round{r > 1 ? "s" : ""}
            </button>
          ))}
        </div>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Generate AI Mock Draft
        </button>
        {mutation.isPending && <span className="text-xs text-gray-400">Simulating {rounds === 2 ? "60" : "30"} picks... ~20s</span>}
      </div>

      {mutation.data && (
        <AIResult title={`AI Mock Draft — ${mutation.data.rounds} Round${mutation.data.rounds > 1 ? "s" : ""}`} content={mutation.data.mock_draft} color="text-amber-300" />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type TabKey = "bigboard" | "mock" | "aimock";
const TABS: { key: TabKey; label: string }[] = [
  { key: "bigboard", label: "Big Board" },
  { key: "mock",     label: "My Mock Draft" },
  { key: "aimock",  label: "AI Mock Draft" },
];

export default function DraftPage() {
  const [tab, setTab] = useState<TabKey>("bigboard");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="h-7 w-7 text-amber-400" />
        <h1 className="text-2xl font-bold">2026 NBA Draft</h1>
        <span className="text-sm text-gray-500">CBS Sports Rankings</span>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? "bg-amber-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className={tab === "bigboard" ? "" : "bg-gray-900/50 border border-gray-800 rounded-2xl p-5"}>
        {tab === "bigboard" && <BigBoard />}
        {tab === "mock"     && <MockDraft />}
        {tab === "aimock"  && <AIMockDraft />}
      </div>
    </div>
  );
}
