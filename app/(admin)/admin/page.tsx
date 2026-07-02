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
        <h1 className="text-2xl font-semibold text-accent">Admin Dashboard</h1>
        <div className="flex gap-3 text-sm underline">
          <Link href="/admin/matches">Manage matches</Link>
          <Link href="/admin/users">Manage users</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Users" value={userCount} />
        <StatCard label="Matches completed" value={`${finishedCount} / ${matchCount}`} />
        <StatCard label="Predictions submitted" value={predictionCount} />
        <StatCard label="Prediction %" value={`${predictionPercentage}%`} />
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

function StatCard({ label, value }: { readonly label: string; readonly value: string | number }) {
  return (
    <div className="rounded border p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
