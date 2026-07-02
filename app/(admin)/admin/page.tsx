import Link from "next/link";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/lib/leaderboard";

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [userCount, matchCount, finishedCount, predictionCount, leaderboard] =
    await Promise.all([
      prisma.user.count(),
      prisma.match.count(),
      prisma.match.count({ where: { status: "FINISHED" } }),
      prisma.prediction.count(),
      getLeaderboard(),
    ]);

  const maxPossiblePredictions = userCount * matchCount;
  const predictionPercentage =
    maxPossiblePredictions > 0
      ? Math.round((predictionCount / maxPossiblePredictions) * 100)
      : 0;

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gradient-text">Admin Dashboard</h1>
        <div className="flex flex-wrap gap-3 text-sm underline">
          <Link href="/admin/matches">Manage matches</Link>
          <Link href="/admin/users">Manage players</Link>
          <Link href="/admin/predictions">View all predictions</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Players" value={userCount} color="accent" />
        <StatCard
          label="Matches completed"
          value={`${finishedCount} / ${matchCount}`}
          color="secondary"
        />
        <Link href="/admin/predictions">
          <StatCard label="Predictions submitted" value={predictionCount} color="highlight" />
        </Link>
        <StatCard label="Prediction %" value={`${predictionPercentage}%`} color="success" />
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Leaderboard</h2>
        <ol className="space-y-1 text-sm">
          {leaderboard.map((entry, index) => (
            <li key={entry.userId} className="flex justify-between border-b py-1">
              <span>
                {index + 1}. {entry.name}
              </span>
              <span className="font-medium">{entry.total}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

const STAT_CARD_COLORS = {
  accent: "border-accent text-accent",
  secondary: "border-secondary text-secondary",
  highlight: "border-highlight text-highlight-foreground dark:text-highlight",
  success: "border-success text-success",
} as const;

function StatCard({
  label,
  value,
  color,
}: {
  readonly label: string;
  readonly value: string | number;
  readonly color: keyof typeof STAT_CARD_COLORS;
}) {
  return (
    <div className={`rounded-lg border-t-4 bg-white p-4 shadow-sm dark:bg-white/5 ${STAT_CARD_COLORS[color]}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
