"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, Player, Team } from "@/lib/api";
import { Target, Loader2 } from "lucide-react";

export default function ScoutingPage() {
  const [mode, setMode] = useState<"report" | "compare">("report");
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [teamFilter, setTeamFilter] = useState("");

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: () => api.get("/teams/").then((r) => r.data),
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["players", teamFilter],
    queryFn: () =>
      api.get("/players/", { params: { team_id: teamFilter || undefined, limit: 500 } }).then((r) => r.data),
  });

  const reportMutation = useMutation({
    mutationFn: (playerId: string) =>
      api.get(`/scouting/report/${playerId}`).then((r) => r.data),
  });

  const compareMutation = useMutation({
    mutationFn: () =>
      api.get("/scouting/compare", { params: { player_a_id: playerA, player_b_id: playerB } }).then((r) => r.data),
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Target className="h-7 w-7 text-violet-400" />
        <h1 className="text-2xl font-bold">Scouting</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {(["report", "compare"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              mode === m ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {m === "report" ? "Scouting Report" : "Compare Players"}
          </button>
        ))}
      </div>

      {mode === "report" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex gap-3 mb-4">
            <select
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="">All Teams</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
            <select
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
            >
              <option value="">Select player...</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            <button
              onClick={() => selectedPlayer && reportMutation.mutate(selectedPlayer)}
              disabled={!selectedPlayer || reportMutation.isPending}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              {reportMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate
            </button>
          </div>
          {reportMutation.data && (
            <div className="mt-4 p-4 bg-gray-800 rounded-xl">
              <h3 className="font-semibold text-violet-300 mb-2">{reportMutation.data.player}</h3>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                {reportMutation.data.report}
              </pre>
            </div>
          )}
        </div>
      )}

      {mode === "compare" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[{ label: "Player A", val: playerA, set: setPlayerA }, { label: "Player B", val: playerB, set: setPlayerB }].map(
              ({ label, val, set }) => (
                <div key={label}>
                  <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                  >
                    <option value="">Select player...</option>
                    {players.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
              )
            )}
          </div>
          <button
            onClick={() => compareMutation.mutate()}
            disabled={!playerA || !playerB || compareMutation.isPending}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            {compareMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Compare
          </button>
          {compareMutation.data && (
            <div className="mt-4 p-4 bg-gray-800 rounded-xl">
              <h3 className="font-semibold text-violet-300 mb-2">
                {compareMutation.data.player_a} vs {compareMutation.data.player_b}
              </h3>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                {compareMutation.data.analysis}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
