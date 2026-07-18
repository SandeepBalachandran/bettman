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
    <>

      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:gap-3 md:grid-cols-4">
        <StatCard label="Players" value={userCount} color="accent" />
        <StatCard
          label="Matches"
          value={`${finishedCount}/${matchCount}`}
          color="secondary"
        />
        <Link href="/admin/predictions" className="block">
          <StatCard label="Predict" value={predictionCount} color="highlight" />
        </Link>
        <StatCard label="Pred %" value={`${predictionPercentage}%`} color="success" />
        <Link href="/admin/money" className="col-span-2 block md:col-span-1">
          <StatCard label="Payment" value={formatMoney(tournamentNet)} color="success" />
        </Link>
      </div>

      <SendNotificationForm users={players} />

      <section className="card space-y-1 p-2 sm:p-4">
        <h2 className="text-sm sm:text-lg font-medium">Leaderboard</h2>
        <ol className="divide-y divide-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-xs">
          {leaderboard.map((entry, index) => (
            <li key={entry.userId} className="flex justify-between py-1 sm:py-2 gap-2">
              <span className="truncate">
                {index + 1}. {entry.name}
              </span>
              <span className="font-medium flex-shrink-0">{entry.total}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card space-y-2 p-2 sm:p-4">
        <h2 className="text-sm sm:text-lg font-medium">💰 Coins</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2">
          <div className="p-1.5 sm:p-2 bg-accent/10 rounded">
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-none">Total</p>
            <p className="text-sm sm:text-base font-bold text-accent">{totalCoinsInSystem}</p>
          </div>
          <div className="p-1.5 sm:p-2 bg-success/10 rounded">
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-none">Active</p>
            <p className="text-sm sm:text-base font-bold text-success">{usersWithCoins_}/{userCount}</p>
          </div>
          <div className="p-1.5 sm:p-2 bg-highlight/10 rounded">
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-none">Collect</p>
            <p className="text-sm sm:text-base font-bold text-highlight-foreground dark:text-highlight">{usersWhoCollectedCoins}</p>
          </div>
          <div className="p-1.5 sm:p-2 bg-secondary/10 rounded">
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-none">Avg</p>
            <p className="text-sm sm:text-base font-bold text-secondary">{avgCoinsPerUser}</p>
          </div>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[color-mix(in_srgb,var(--foreground)_8%,transparent)]">
              <th className="text-left py-1 sm:py-2 px-1">Name</th>
              <th className="text-right py-1 sm:py-2 px-1">💰</th>
              <th className="text-center py-1 sm:py-2 px-1">C</th>
              <th className="text-right py-1 sm:py-2 px-1">D</th>
            </tr>
          </thead>
          <tbody>
            {usersWithCoins.map((user) => {
              const balance = user.coinBalance?.balance ?? 0;
              const rewardCount = user.dailyRewards?.length ?? 0;
              const hasCollected = rewardCount > 0;
              return (
                <tr key={user.id} className="border-b border-[color-mix(in_srgb,var(--foreground)_4%,transparent)] hover:bg-[color-mix(in_srgb,var(--foreground)_2%,transparent)]">
                  <td className="py-1 sm:py-2 px-1 truncate text-xs">{user.name}</td>
                  <td className="text-right py-1 sm:py-2 px-1 font-semibold text-xs">{balance}</td>
                  <td className="text-center py-1 sm:py-2 px-1">
                    <span className={`inline-block px-0.5 py-0.5 rounded text-xs font-semibold ${
                      hasCollected ? "bg-success/20 text-success" : "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      {hasCollected ? "✓" : "✗"}
                    </span>
                  </td>
                  <td className="text-right py-1 sm:py-2 px-1 text-gray-600 dark:text-gray-400 text-xs">{rewardCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <RecentQuizAttemptsTable />
    </>
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
    <div className={`card card-interactive h-full border-t-4 p-1.5 sm:p-3 ${STAT_CARD_COLORS[color]}`}>
      <p className="text-xs text-gray-500 leading-none">{label}</p>
      <p className="text-sm sm:text-base md:text-lg font-bold break-words">{value}</p>
    </div>
  );
}
