import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { requireFeaturePage } from "@/lib/feature-flags";
import { getLeaderboard, getPreviousLeaderboard, rankEntries } from "@/lib/leaderboard";
import { getUserWinnerStreak } from "@/lib/round-mvp";
import { activeMatchWhere, getActiveCompetition } from "@/lib/competition";
import { refreshActiveCompetitionResults } from "@/lib/refresh-results";
import { LeaderboardList } from "@/components/features/leaderboard/LeaderboardList";
import { ShareToWhatsApp } from "@/components/ShareToWhatsApp";
import { formatPoints } from "@/lib/format-points";
import { getCurrentPrizeHolders, getPrizeSettings } from "@/lib/prizes";
import { PrizesCard } from "@/components/PrizesCard";
import { MoneyRulesCard } from "@/components/MoneyRulesCard";

export default async function LeaderboardPage() {
  const user = await requireAuth();
  await requireFeaturePage("navLeaderboard", user.role);
  refreshActiveCompetitionResults();

  const [rawLeaderboard, rawPreviousLeaderboard, matchCount, unfinishedCount, prizeSettings, prizeByUserId] =
    await Promise.all([
      getLeaderboard(),
      getPreviousLeaderboard(),
      prisma.match.count({ where: activeMatchWhere() }),
      prisma.match.count({ where: { ...activeMatchWhere(), status: { not: "FINISHED" } } }),
      getPrizeSettings(),
      getCurrentPrizeHolders(),
    ]);
  const leaderboard = rankEntries(rawLeaderboard);
  const previousLeaderboard = rankEntries(rawPreviousLeaderboard);

  // Champions are crowned once every match of the competition has been played.
  const tournamentComplete = matchCount > 0 && unfinishedCount === 0;

  const previousRankByUserId = new Map(
    previousLeaderboard.map((entry, index) => [entry.userId, index + 1])
  );
  const streaks = await Promise.all(
    leaderboard.map(async (entry) => [entry.userId, await getUserWinnerStreak(entry.userId)] as const)
  );
  const streakByUserId = new Map(streaks);

  const myIndex = leaderboard.findIndex((entry) => entry.userId === user.id);
  const myEntry = myIndex >= 0 ? leaderboard[myIndex] : null;
  const myRank = myIndex >= 0 ? myIndex + 1 : null;
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
            <span className={`font-bold ${myEntry.money >= 0 ? "text-success" : "text-danger"}`}>
              {formatPoints(myEntry.money)}
            </span>
          </p>
          <ShareToWhatsApp
            text={`⚽ ${getActiveCompetition().shortName} Predictions update!\nI'm #${myRank} on the leaderboard with ${formatPoints(
              myEntry.money
            )}. Think you can beat me?${appUrl ? ` Check it out: ${appUrl}` : ""}`}
          />
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="card flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1.5 p-2 sm:p-3 text-[9px] sm:text-[11px] text-gray-500">
          <span className="font-semibold text-gray-400">Legend:</span>
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
          streakByUserId={streakByUserId}
          tournamentComplete={tournamentComplete}
          prizeByUserId={prizeByUserId}
        />
      )}

      <PrizesCard settings={prizeSettings} seasonName={getActiveCompetition().name} />

      <MoneyRulesCard />
    </main>
  );
}
