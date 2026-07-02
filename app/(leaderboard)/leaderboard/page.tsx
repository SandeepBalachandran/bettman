import { requireAuth } from "@/lib/authz";
import { getLeaderboard } from "@/lib/leaderboard";
import { LeaderboardRow } from "@/components/features/leaderboard/LeaderboardRow";

export default async function LeaderboardPage() {
  const user = await requireAuth();
  const leaderboard = await getLeaderboard();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-accent">Leaderboard</h1>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 pr-2">Rank</th>
            <th className="py-2 pr-2">Player</th>
            <th className="py-2 pr-2 text-right">Winner</th>
            <th className="py-2 pr-2 text-right">Scorer</th>
            <th className="py-2 pr-2 text-right">Penalty</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, index) => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              rank={index + 1}
              isCurrentUser={entry.userId === user.id}
            />
          ))}
        </tbody>
      </table>

      {leaderboard.length === 0 && (
        <p className="text-sm text-gray-500">No users yet.</p>
      )}
    </main>
  );
}
