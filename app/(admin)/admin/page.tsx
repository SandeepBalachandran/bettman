import Link from "next/link";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/lib/leaderboard";
import { getAllUsersMoney } from "@/lib/leaderboard-money";
import { formatMoney } from "@/lib/format-money";

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [userCount, matchCount, finishedCount, predictionCount, leaderboard, playersMoney] =
    await Promise.all([
      prisma.user.count(),
      prisma.match.count(),
      prisma.match.count({ where: { status: "FINISHED" } }),
      prisma.prediction.count(),
      getLeaderboard(),
      getAllUsersMoney(),
    ]);

  const tournamentNet = playersMoney.reduce((sum, p) => sum + p.currentBalance, 0);

  const maxPossiblePredictions = userCount * matchCount;
  const predictionPercentage =
    maxPossiblePredictions > 0
      ? Math.round((predictionCount / maxPossiblePredictions) * 100)
      : 0;

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold gradient-text">Admin Dashboard</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin/matches" className="rounded-full bg-accent/10 px-3 py-1 text-accent">
            Manage matches
          </Link>
          <Link href="/admin/users" className="rounded-full bg-accent/10 px-3 py-1 text-accent">
            Manage players
          </Link>
          <Link
            href="/admin/predictions"
            className="rounded-full bg-accent/10 px-3 py-1 text-accent"
          >
            View all predictions
          </Link>
          <Link href="/admin/money" className="rounded-full bg-accent/10 px-3 py-1 text-accent">
            View finances
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard label="Players" value={userCount} color="accent" />
        <StatCard
          label="Matches completed"
          value={`${finishedCount} / ${matchCount}`}
          color="secondary"
        />
        <Link href="/admin/predictions" className="block">
          <StatCard label="Predictions submitted" value={predictionCount} color="highlight" />
        </Link>
        <StatCard label="Prediction %" value={`${predictionPercentage}%`} color="success" />
        <Link href="/admin/money" className="col-span-2 block sm:col-span-1">
          <StatCard label="Payments" value={formatMoney(tournamentNet)} color="success" />
        </Link>
      </div>

      <section className="card space-y-2 p-4">
        <h2 className="text-lg font-medium">Leaderboard</h2>
        <ol className="divide-y divide-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-sm">
          {leaderboard.map((entry, index) => (
            <li key={entry.userId} className="flex justify-between py-2">
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
    <div className={`card card-interactive h-full border-t-4 p-4 ${STAT_CARD_COLORS[color]}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold break-words">{value}</p>
    </div>
  );
}
