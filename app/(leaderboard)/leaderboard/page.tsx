import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { requireFeaturePage } from "@/lib/feature-flags";
import { getLeaderboard, getPreviousLeaderboard } from "@/lib/leaderboard";
import { getUserMoney } from "@/lib/leaderboard-money";
import { getRoundMvps, getUserWinnerStreak } from "@/lib/round-mvp";
import { LeaderboardList } from "@/components/features/leaderboard/LeaderboardList";
import { ShareToWhatsApp } from "@/components/ShareToWhatsApp";
import { formatMoney } from "@/lib/format-money";
import type { Round } from "@prisma/client";

const ROUND_LABELS: Record<Round, string> = {
  ROUND_OF_16: "Round of 16",
  QUARTER_FINALS: "Quarter Finals",
  SEMI_FINALS: "Semi Finals",
  THIRD_PLACE: "Third Place Play-off",
  FINAL: "Final",
};

const ROUND_ORDER: Round[] = ["ROUND_OF_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"];

export default async function LeaderboardPage() {
  const user = await requireAuth();
  await requireFeaturePage("navLeaderboard", user.role);

  const [leaderboard, previousLeaderboard, roundMvps, finalMatch] = await Promise.all([
    getLeaderboard(),
    getPreviousLeaderboard(),
    getRoundMvps(),
    prisma.match.findFirst({ where: { round: "FINAL" }, select: { status: true } }),
  ]);

  const tournamentComplete = finalMatch?.status === "FINISHED";

  const previousRankByUserId = new Map(
    previousLeaderboard.map((entry, index) => [entry.userId, index + 1])
  );

  // Fetch money + streak data for all users
  const perUserData = await Promise.all(
    leaderboard.map(async (entry) => ({
      userId: entry.userId,
      balance: (await getUserMoney(entry.userId)).currentBalance,
      streak: await getUserWinnerStreak(entry.userId),
    }))
  );

  const moneyByUserId = new Map(perUserData.map((d) => [d.userId, d.balance]));
  const streakByUserId = new Map(perUserData.map((d) => [d.userId, d.streak]));

  const mvpsByRound = new Map<Round, typeof roundMvps>();
  for (const mvp of roundMvps) {
    const existing = mvpsByRound.get(mvp.round) ?? [];
    existing.push(mvp);
    mvpsByRound.set(mvp.round, existing);
  }

  const myIndex = leaderboard.findIndex((entry) => entry.userId === user.id);
  const myEntry = myIndex >= 0 ? leaderboard[myIndex] : null;
  const myRank = myIndex >= 0 ? myIndex + 1 : null;
  const myBalance = myEntry ? moneyByUserId.get(myEntry.userId) || 0 : 0;
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const appUrl = host ? `${protocol}://${host}` : "";

  return (
    <main className="mx-auto max-w-2xl space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <h1 className="text-xl sm:text-2xl font-bold gradient-text">Leaderboard</h1>

      {myEntry && myRank && (
        <div className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4">
          <p className="text-xs sm:text-sm">
            You&apos;re <span className="font-bold">#{myRank}</span> with{" "}
            <span className="font-bold">{myEntry.total} pts</span> ({formatMoney(myBalance)})
          </p>
          <ShareToWhatsApp
            text={`⚽ World Cup Predictions update!\nI'm #${myRank} on the leaderboard with ${myEntry.total} pts (${formatMoney(
              myBalance
            )}). Think you can beat me?${appUrl ? ` Check it out: ${appUrl}` : ""}`}
          />
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="card flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1.5 p-2 sm:p-3 text-[9px] sm:text-[11px] text-gray-500">
          <span className="font-semibold text-gray-400">Legend:</span>
          <span className="inline-flex items-center gap-0.5 sm:gap-1">
            <span className="rounded-full bg-accent/10 px-1 sm:px-1.5 py-0.5 font-medium text-accent">
              W
            </span>
            <span className="hidden sm:inline">winner points</span><span className="sm:hidden">wins</span>
          </span>
          <span className="inline-flex items-center gap-0.5 sm:gap-1">
            <span className="rounded-full bg-success/10 px-1 sm:px-1.5 py-0.5 font-medium text-success">
              S
            </span>
            <span className="hidden sm:inline">scorer points</span><span className="sm:hidden">scorers</span>
          </span>
          <span className="inline-flex items-center gap-0.5 sm:gap-1">
            <span className="rounded-full bg-danger/10 px-1 sm:px-1.5 py-0.5 font-medium text-danger">
              P
            </span>
            <span className="hidden sm:inline">penalty</span><span className="sm:hidden">pen</span>
          </span>
          <span className="inline-flex items-center gap-0.5 sm:gap-1">
            <span className="rounded-full bg-highlight/15 px-1 sm:px-1.5 py-0.5 font-medium text-highlight-foreground dark:text-highlight">
              🔥
            </span>
            <span className="hidden sm:inline">win streak</span><span className="sm:hidden">streak</span>
          </span>
          <span className="inline-flex items-center gap-0.5 sm:gap-1">
            <span className="font-semibold text-success">▲</span><span className="hidden sm:inline">/</span>
            <span className="font-semibold text-danger">▼</span>
            <span className="hidden sm:inline">rank change</span><span className="sm:hidden">change</span>
          </span>
        </div>
      )}

      {leaderboard.length === 0 ? (
        <p className="text-sm text-gray-500">No players yet.</p>
      ) : (
        <LeaderboardList
          entries={leaderboard}
          currentUserId={user.id}
          previousRankByUserId={previousRankByUserId}
          moneyByUserId={moneyByUserId}
          streakByUserId={streakByUserId}
          tournamentComplete={tournamentComplete}
        />
      )}

      <div className="card space-y-2 sm:space-y-3 p-3 sm:p-4">
        <div className="space-y-2">
          <p className="font-semibold text-xs sm:text-sm">📋 Scoring Guide</p>
          <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs text-gray-600 dark:text-gray-400">
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">
                ⭐ <span className="text-accent">Points</span>
              </p>
              <ul className="ml-3 sm:ml-5 list-disc space-y-0.5 text-[10px] sm:text-xs">
                <li>✅ Correct winner: +30 pts</li>
                <li>✅ Correct scorer: +10 pts per goal</li>
                <li>❌ Wrong scorer: 0</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">
                💰 <span className="text-success">Money</span>
              </p>
              <ul className="ml-3 sm:ml-5 list-disc space-y-0.5 text-[10px] sm:text-xs">
                <li>✅ Correct winner: +₹30</li>
                <li>❌ Wrong winner: -₹30</li>
                <li>✅ Correct scorer: +₹5 per goal</li>
                <li>❌ Wrong scorer: -₹5</li>
              </ul>
            </div>
            <p className="text-[9px] sm:text-[10px] text-gray-500 italic mt-1 sm:mt-2">
              💡 If a player scores multiple goals, you get points/money for each goal. Points reward only. Money has penalties.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
