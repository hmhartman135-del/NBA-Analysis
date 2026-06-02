import { Activity, Users, Target, TrendingUp, Trophy, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

const modules = [
  {
    href: "/roster",
    icon: Users,
    title: "Roster Builder",
    description: "AI-powered roster analysis, gap identification, and trade suggestions.",
    color: "from-orange-600 to-orange-800",
  },
  {
    href: "/scouting",
    icon: Target,
    title: "Scouting",
    description: "AI scouting reports and side-by-side player comparisons.",
    color: "from-violet-600 to-violet-800",
  },
  {
    href: "/analytics",
    icon: TrendingUp,
    title: "Analytics",
    description: "PER, True Shooting %, Usage Rate, AST/TOV and leaderboards.",
    color: "from-blue-600 to-blue-800",
  },
  {
    href: "/standings",
    icon: Trophy,
    title: "Standings",
    description: "Live East & West conference standings from stats.nba.com.",
    color: "from-emerald-600 to-emerald-800",
  },
  {
    href: "/trades",
    icon: ArrowLeftRight,
    title: "Trade Analyzer",
    description: "Evaluate trade scenarios with AI-powered impact analysis.",
    color: "from-rose-600 to-rose-800",
  },
];

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="h-8 w-8 text-orange-400" />
          <h1 className="text-3xl font-bold tracking-tight">NBA Analytics Platform</h1>
        </div>
        <p className="text-gray-400 text-lg">
          AI-powered roster management, player analytics, and scouting intelligence
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map(({ href, icon: Icon, title, description, color }) => (
          <Link key={href} href={href}>
            <div className="group relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 p-6 hover:border-gray-600 transition-all duration-200 cursor-pointer">
              <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 transition-opacity`} />
              <div className="relative">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${color} mb-4`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl font-semibold mb-2">{title}</h2>
                <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
