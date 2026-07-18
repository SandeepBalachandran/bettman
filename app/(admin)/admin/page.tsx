import Link from "next/link";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/lib/leaderboard";
import { getAllUsersMoney } from "@/lib/leaderboard-money";
import { formatMoney } from "@/lib/format-money";
import { SendNotificationForm } from "@/components/features/admin/SendNotificationForm";
import { RecentQuizAttemptsTable } from "@/components/features/admin/RecentQuizAttemptsTable";

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [userCount, matchCount, finishedCount, predictionCount, leaderboard, playersMoney, players, usersWithCoins, dailyRewardStats] =
    await Promise.all([
      prisma.user.count(),
      prisma.match.count(),
      prisma.match.count({ where: { status: "FINISHED" } }),
      prisma.prediction.count(),
      getLeaderboard(),
      getAllUsersMoney(),
      prisma.user.findMany({
        where: { role: "USER", active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: { role: "USER", active: true },
        select: { id: true, name: true, coinBalance: true, dailyRewards: true },
        orderBy: { coinBalance: { balance: "desc" } },
      }),
      prisma.dailyReward.groupBy({
        by: ["userId"],
        _sum: { coins: true },
        _count: true,
      }),
    ]);

  const tournamentNet = playersMoney.reduce((sum, p) => sum + p.currentBalance, 0);

  // Calculate coin stats
  const totalCoinsInSystem = usersWithCoins.reduce((sum, u) => sum + (u.coinBalance?.balance ?? 0), 0);
  const usersWithCoins_ = usersWithCoins.filter(u => (u.coinBalance?.balance ?? 0) > 0).length;
  const usersWhoCollectedCoins = new Set(dailyRewardStats.map(stat => stat.userId)).size;
  const avgCoinsPerUser = userCount > 0 ? Math.round(totalCoinsInSystem / userCount) : 0;

  const maxPossiblePredictions = userCount * matchCount;
  const predictionPercentage =
    maxPossiblePredictions > 0
      ? Math.round((predictionCount / maxPossiblePredictions) * 100)
      : 0;

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        <h1 className="text-2xl font-bold gradient-text">Admin Dashboard</h1>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap text-xs sm:text-sm">
          <Link href="/admin/sync" className="rounded-full bg-success/10 px-3 py-1.5 text-center text-success hover:bg-success/15 transition-colors">
            Sync results
          </Link>
          <Link href="/admin/matches" className="rounded-full bg-accent/10 px-3 py-1.5 text-center text-accent hover:bg-accent/15 transition-colors">
            Manage matches
          </Link>
          <Link href="/admin/users" className="rounded-full bg-accent/10 px-3 py-1.5 text-center text-accent hover:bg-accent/15 transition-colors">
            Manage players
          </Link>
          <Link
            href="/admin/predictions"
            className="rounded-full bg-accent/10 px-3 py-1.5 text-center text-accent hover:bg-accent/15 transition-colors"
          >
            View predictions
          </Link>
          <Link href="/admin/money" className="rounded-full bg-accent/10 px-3 py-1.5 text-center text-accent hover:bg-accent/15 transition-colors">
            View finances
          </Link>
          <Link href="/admin/rewards" className="rounded-full bg-accent/10 px-3 py-1.5 text-center text-accent hover:bg-accent/15 transition-colors">
            Manage rewards
          </Link>
          <Link href="/admin/quiz" className="rounded-full bg-accent/10 px-3 py-1.5 text-center text-accent hover:bg-accent/15 transition-colors">
            Manage quiz
          </Link>
          <Link href="/admin/coins" className="rounded-full bg-accent/10 px-3 py-1.5 text-center text-accent hover:bg-accent/15 transition-colors">
            Coin history
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

      <SendNotificationForm users={players} />

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

      <section className="card space-y-4 p-4">
        <h2 className="text-lg font-medium">💰 Coins System</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-accent/10 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Coins</p>
            <p className="text-lg font-bold text-accent">{totalCoinsInSystem}</p>
          </div>
          <div className="p-3 bg-success/10 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Users Active</p>
            <p className="text-lg font-bold text-success">{usersWithCoins_} / {userCount}</p>
          </div>
          <div className="p-3 bg-highlight/10 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Collected Coins</p>
            <p className="text-lg font-bold text-highlight-foreground dark:text-highlight">{usersWhoCollectedCoins}</p>
          </div>
          <div className="p-3 bg-secondary/10 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Avg per User</p>
            <p className="text-lg font-bold text-secondary">{avgCoinsPerUser}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color-mix(in_srgb,var(--foreground)_8%,transparent)]">
                <th className="text-left py-2 px-2">Player</th>
                <th className="text-right py-2 px-2">💰 Balance</th>
                <th className="text-center py-2 px-2">Status</th>
                <th className="text-right py-2 px-2">Days</th>
              </tr>
            </thead>
            <tbody>
              {usersWithCoins.map((user) => {
                const balance = user.coinBalance?.balance ?? 0;
                const rewardCount = user.dailyRewards?.length ?? 0;
                const hasCollected = rewardCount > 0;
                return (
                  <tr key={user.id} className="border-b border-[color-mix(in_srgb,var(--foreground)_4%,transparent)] hover:bg-[color-mix(in_srgb,var(--foreground)_2%,transparent)]">
                    <td className="py-2 px-2">{user.name}</td>
                    <td className="text-right py-2 px-2 font-semibold">{balance}</td>
                    <td className="text-center py-2 px-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        hasCollected ? "bg-success/20 text-success" : "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}>
                        {hasCollected ? "✓ Collected" : "No coins"}
                      </span>
                    </td>
                    <td className="text-right py-2 px-2 text-gray-600 dark:text-gray-400">{rewardCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <RecentQuizAttemptsTable />
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
      <p className="text-xl font-bold wrap-break-word">{value}</p>
    </div>
  );
}
