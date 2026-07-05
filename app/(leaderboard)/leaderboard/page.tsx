import { headers } from "next/headers";
import { requireAuth } from "@/lib/authz";
import { getLeaderboard, getPreviousLeaderboard } from "@/lib/leaderboard";
import { getUserMoney } from "@/lib/leaderboard-money";
import { getRoundMvps, getUserWinnerStreak } from "@/lib/round-mvp";
import { LeaderboardRow } from "@/components/features/leaderboard/LeaderboardRow";
import { ShareToWhatsApp } from "@/components/ShareToWhatsApp";
import { formatMoney } from "@/lib/format-money";
import type { Round } from "@prisma/client";

const ROUND_LABELS: Record<Round, string> = {
  ROUND_OF_16: "Round of 16",
  QUARTER_FINALS: "Quarter Finals",
  SEMI_FINALS: "Semi Finals",
  FINAL: "Final",
};

const ROUND_ORDER: Round[] = ["ROUND_OF_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];

export default async function LeaderboardPage() {
  const user = await requireAuth();
  const [leaderboard, previousLeaderboard, roundMvps] = await Promise.all([
    getLeaderboard(),
    getPreviousLeaderboard(),
    getRoundMvps(),
  ]);

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
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold gradient-text">Leaderboard</h1>

      {myEntry && myRank && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm">
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

      {roundMvps.length > 0 && (
        <div className="card space-y-2 p-4">
          <p className="font-semibold">🏅 Round MVPs</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {ROUND_ORDER.map((round) => {
              const mvps = mvpsByRound.get(round);
              if (!mvps || mvps.length === 0) return null;
              return (
                <span
                  key={round}
                  className="rounded-full bg-highlight/15 px-3 py-1 text-highlight-foreground dark:text-highlight"
                >
                  {ROUND_LABELS[round]}: {mvps.map((m) => m.name).join(" & ")} ({mvps[0].points}{" "}
                  pts)
                </span>
              );
            })}
          </div>
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="card flex flex-wrap items-center gap-x-3 gap-y-1.5 p-3 text-[11px] text-gray-500">
          <span className="font-semibold text-gray-400">Legend:</span>
          <span className="inline-flex items-center gap-1">
            <span className="rounded-full bg-accent/10 px-1.5 py-0.5 font-medium text-accent">
              W
            </span>
            winner points
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="rounded-full bg-success/10 px-1.5 py-0.5 font-medium text-success">
              S
            </span>
            scorer points
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="rounded-full bg-danger/10 px-1.5 py-0.5 font-medium text-danger">
              P
            </span>
            penalty (wrong scorer picks)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="rounded-full bg-highlight/15 px-1.5 py-0.5 font-medium text-highlight-foreground dark:text-highlight">
              🔥
            </span>
            win streak
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="font-semibold text-success">▲</span>/
            <span className="font-semibold text-danger">▼</span>
            rank change since last match
          </span>
        </div>
      )}

      {leaderboard.length === 0 ? (
        <p className="text-sm text-gray-500">No players yet.</p>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => {
            const rank = index + 1;
            const previousRank = previousRankByUserId.get(entry.userId) ?? rank;
            return (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                rank={rank}
                isCurrentUser={entry.userId === user.id}
                moneyBalance={moneyByUserId.get(entry.userId) || 0}
                streak={streakByUserId.get(entry.userId) || 0}
                rankChange={previousRank - rank}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
