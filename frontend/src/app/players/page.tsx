"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, Player } from "@/lib/api";
import { Search } from "lucide-react";

export default function PlayersPage() {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");

  const { data: players = [], isLoading } = useQuery<Player[]>({
    queryKey: ["players", search, position],
    queryFn: () =>
      api
        .get("/players/", { params: { search: search || undefined, position: position || undefined, limit: 200 } })
        .then((r) => r.data),
  });

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Players</h1>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-orange-500"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        >
          <option value="">All Positions</option>
          {["PG", "SG", "SF", "PF", "C"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-center py-20">Loading players...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-left">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Pos</th>
                <th className="pb-3 pr-4">Age</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Country</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="py-2 pr-4 font-medium">{p.full_name}</td>
                  <td className="py-2 pr-4 text-gray-400">{p.position ?? "—"}</td>
                  <td className="py-2 pr-4 text-gray-400">{p.age ?? "—"}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${p.status === "active" ? "bg-emerald-900/50 text-emerald-400" : "bg-gray-700 text-gray-300"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 text-gray-400">{p.country ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {players.length === 0 && (
            <p className="text-center text-gray-500 py-12">No players found.</p>
          )}
        </div>
      )}
    </div>
  );
}
