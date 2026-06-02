"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Trophy, Star } from "lucide-react";
import { useState } from "react";

interface StandingRow {
  TeamID: number;
  TeamCity: string;
  TeamName: string;
  Conference: string;
  Division: string;
  DivisionRank: number;
  PlayoffRank: number;
  PlayoffSeeding: number;
  WINS: number;
  LOSSES: number;
  WinPCT: number;
  ConferenceGamesBack: number;
  DivisionGamesBack: number;
  HOME: string;
  ROAD: string;
  L10: string;
  strCurrentStreak: string;
  PointsPG: number;
  OppPointsPG: number;
  DiffPointsPG: number;
  ClinchIndicator: string;
  ClinchedConferenceTitle: number;
  ClinchedDivisionTitle: number;
  ClinchedPlayoffBirth: number;
  ClinchedPlayIn: number;
  EliminatedConference: number | null;
}

const DIVISIONS: Record<string, string[]> = {
  East: ["Atlantic", "Central", "Southeast"],
  West: ["Northwest", "Pacific", "Southwest"],
};

function clinchBadge(row: StandingRow) {
  if (row.ClinchedConferenceTitle)
    return <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400">CONF</span>;
  if (row.ClinchedPlayoffBirth && !row.ClinchedPlayIn)
    return <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">P</span>;
  if (row.ClinchedPlayIn)
    return <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">PI</span>;
  if (row.EliminatedConference)
    return <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">E</span>;
  return null;
}

function rowBg(rank: number, eliminated: boolean) {
  if (eliminated) return "opacity-50";
  if (rank <= 6) return "";
  if (rank <= 10) return "bg-blue-950/20";
  return "";
}

// ── Playoff Picture ───────────────────────────────────────────────────────────
function PlayoffPicture({ teams }: { teams: StandingRow[] }) {
  const conf = (c: string) =>
    [...teams]
      .filter((t) => t.Conference === c)
      .sort((a, b) => a.PlayoffRank - b.PlayoffRank);

  const Block = ({ conf: c }: { conf: string }) => {
    const sorted = conf(c);
    const seeds = sorted.slice(0, 6);
    const playIn = sorted.slice(6, 10);
    const out = sorted.slice(10);

    return (
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-orange-400" />
          {c}ern Conference
        </h2>

        {/* Playoff seeds 1–6 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-2">
          <div className="px-3 py-1.5 bg-emerald-950/40 border-b border-gray-800 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Playoff — Seeds 1–6
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs">
                <th className="px-3 py-1.5 text-left w-6">#</th>
                <th className="px-2 py-1.5 text-left">Team</th>
                <th className="px-2 py-1.5 text-right">W</th>
                <th className="px-2 py-1.5 text-right">L</th>
                <th className="px-2 py-1.5 text-right">GB</th>
                <th className="px-2 py-1.5 text-right">L10</th>
                <th className="px-2 py-1.5 text-right hidden sm:table-cell">Diff</th>
              </tr>
            </thead>
            <tbody>
              {seeds.map((t, i) => (
                <tr key={t.TeamID} className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${rowBg(i + 1, !!t.EliminatedConference)}`}>
                  <td className="px-3 py-2 text-gray-400 font-medium">{i + 1}</td>
                  <td className="px-2 py-2 font-medium">
                    {t.TeamCity} {t.TeamName}
                    {clinchBadge(t)}
                  </td>
                  <td className="px-2 py-2 text-right">{t.WINS}</td>
                  <td className="px-2 py-2 text-right text-gray-400">{t.LOSSES}</td>
                  <td className="px-2 py-2 text-right text-gray-400">{t.ConferenceGamesBack === 0 ? "—" : t.ConferenceGamesBack}</td>
                  <td className="px-2 py-2 text-right text-gray-400">{t.L10}</td>
                  <td className={`px-2 py-2 text-right hidden sm:table-cell ${t.DiffPointsPG > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {t.DiffPointsPG > 0 ? "+" : ""}{t.DiffPointsPG.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Play-In 7–10 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-2">
          <div className="px-3 py-1.5 bg-blue-950/40 border-b border-gray-800 text-xs font-semibold text-blue-400 uppercase tracking-wider">
            Play-In — Seeds 7–10
          </div>
          <table className="w-full text-sm">
            <tbody>
              {playIn.map((t, i) => (
                <tr key={t.TeamID} className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${rowBg(i + 7, !!t.EliminatedConference)}`}>
                  <td className="px-3 py-2 w-6 text-gray-400">{i + 7}</td>
                  <td className="px-2 py-2 font-medium">
                    {t.TeamCity} {t.TeamName}
                    {clinchBadge(t)}
                  </td>
                  <td className="px-2 py-2 text-right">{t.WINS}</td>
                  <td className="px-2 py-2 text-right text-gray-400">{t.LOSSES}</td>
                  <td className="px-2 py-2 text-right text-gray-400">{t.ConferenceGamesBack === 0 ? "—" : t.ConferenceGamesBack}</td>
                  <td className="px-2 py-2 text-right text-gray-400">{t.L10}</td>
                  <td className={`px-2 py-2 text-right hidden sm:table-cell ${t.DiffPointsPG > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {t.DiffPointsPG > 0 ? "+" : ""}{t.DiffPointsPG.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Eliminated / lottery */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-3 py-1.5 bg-gray-800/60 border-b border-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Lottery
          </div>
          <table className="w-full text-sm">
            <tbody>
              {out.map((t, i) => (
                <tr key={t.TeamID} className="border-b border-gray-800/50 hover:bg-gray-800/30 opacity-50">
                  <td className="px-3 py-2 w-6 text-gray-500">{i + 11}</td>
                  <td className="px-2 py-2 text-gray-400 font-medium">{t.TeamCity} {t.TeamName}</td>
                  <td className="px-2 py-2 text-right text-gray-400">{t.WINS}</td>
                  <td className="px-2 py-2 text-right text-gray-500">{t.LOSSES}</td>
                  <td className="px-2 py-2 text-right text-gray-500">{t.ConferenceGamesBack}</td>
                  <td className="px-2 py-2 text-right text-gray-500">{t.L10}</td>
                  <td className={`px-2 py-2 text-right hidden sm:table-cell ${t.DiffPointsPG > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {t.DiffPointsPG > 0 ? "+" : ""}{t.DiffPointsPG.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <Block conf="East" />
      <Block conf="West" />
    </div>
  );
}

// ── Division Standings ────────────────────────────────────────────────────────
function DivisionStandings({ teams }: { teams: StandingRow[] }) {
  return (
    <div className="space-y-8">
      {(["East", "West"] as const).map((conf) => (
        <div key={conf}>
          <h2 className="text-lg font-bold mb-4">{conf}ern Conference — Divisions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DIVISIONS[conf].map((div) => {
              const divTeams = [...teams]
                .filter((t) => t.Conference === conf && t.Division === div)
                .sort((a, b) => a.DivisionRank - b.DivisionRank);
              return (
                <div key={div} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-gray-800/60 border-b border-gray-800 flex items-center justify-between">
                    <span className="text-sm font-semibold">{div}</span>
                    <Star className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-500 text-xs">
                        <th className="px-3 py-1.5 text-left">Team</th>
                        <th className="px-2 py-1.5 text-right">W-L</th>
                        <th className="px-2 py-1.5 text-right">GB</th>
                        <th className="px-2 py-1.5 text-right">Str</th>
                      </tr>
                    </thead>
                    <tbody>
                      {divTeams.map((t) => (
                        <tr key={t.TeamID} className="border-b border-gray-800/40 hover:bg-gray-800/30">
                          <td className="px-3 py-2 font-medium text-sm">
                            {t.DivisionRank === 1 && (
                              <span className="mr-1 text-yellow-500">★</span>
                            )}
                            {t.TeamCity} {t.TeamName}
                            {clinchBadge(t)}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">{t.WINS}-{t.LOSSES}</td>
                          <td className="px-2 py-2 text-right text-gray-400 tabular-nums">
                            {t.DivisionGamesBack === 0 ? "—" : t.DivisionGamesBack}
                          </td>
                          <td className={`px-2 py-2 text-right text-xs tabular-nums ${t.strCurrentStreak.startsWith("W") ? "text-emerald-400" : "text-red-400"}`}>
                            {t.strCurrentStreak}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StandingsPage() {
  const [view, setView] = useState<"playoff" | "division">("playoff");

  const { data = [], isLoading } = useQuery<StandingRow[]>({
    queryKey: ["standings"],
    queryFn: () => api.get("/standings/").then((r) => r.data),
  });

  if (isLoading) return <div className="text-gray-400 text-center py-20">Loading standings...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-orange-400" />
          <h1 className="text-2xl font-bold">Standings</h1>
          <span className="text-sm text-gray-500">2025–26</span>
        </div>
        <div className="flex gap-2">
          {(["playoff", "division"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                view === v ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {v === "playoff" ? "Playoff Picture" : "By Division"}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold">CONF</span> Clinched Conference</span>
        <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">P</span> Clinched Playoff</span>
        <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">PI</span> Clinched Play-In</span>
        <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">E</span> Eliminated</span>
        <span className="flex items-center gap-1 ml-2 text-gray-500">Diff = Pt differential per game</span>
      </div>

      {view === "playoff" ? (
        <PlayoffPicture teams={data} />
      ) : (
        <DivisionStandings teams={data} />
      )}
    </div>
  );
}
