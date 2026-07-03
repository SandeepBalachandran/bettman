import { requireAuth } from "@/lib/authz";
import { getLeaderboard } from "@/lib/leaderboard";
import { getUserMoney } from "@/lib/leaderboard-money";
import { LeaderboardRow } from "@/components/features/leaderboard/LeaderboardRow";

export default async function LeaderboardPage() {
  const user = await requireAuth();
  const leaderboard = await getLeaderboard();

  // Fetch money data for all users
  const moneyData = await Promise.all(
    leaderboard.map(async (entry) => ({
      userId: entry.userId,
      balance: (await getUserMoney(entry.userId)).currentBalance,
    }))
  );

  const moneyByUserId = new Map(
    moneyData.map((d) => [d.userId, d.balance])
  );

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold gradient-text">Leaderboard</h1>

      {leaderboard.length === 0 ? (
        <p className="text-sm text-gray-500">No players yet.</p>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              rank={index + 1}
              isCurrentUser={entry.userId === user.id}
              moneyBalance={moneyByUserId.get(entry.userId) || 0}
            />
          ))}
        </div>
      )}
    </main>
  );
}
