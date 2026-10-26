import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { TeamFlag } from "@/components/TeamFlag";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { calculateMatchMoney } from "@/lib/money";
import { moneyConfig } from "@/lib/money-config";
import { formatPointsDelta } from "@/lib/format-points";
import { PenaltyBadge } from "@/components/PenaltyBadge";
import { activeMatchWhere } from "@/lib/competition";
import { groupByMatch } from "@/lib/match-groups";
import Link from "next/link";

export default async function UserPredictionsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const currentUser = await requireAuth();
  const { userId } = await params;

  // Fetch the user whose predictions we're viewing
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, coinBalance: true },
  });

  // Fetch user's coin transactions to see what they've unlocked
  const unlockedRewards = await prisma.coinTransaction.findMany({
    where: {
      userId,
      type: "spend",
      reason: { in: ["3rd_scorer", "4th_scorer"] },
    },
    select: { reason: true },
  });

  const has3rdScorer = unlockedRewards.some((r) => r.reason === "3rd_scorer");
  const has4thScorer = unlockedRewards.some((r) => r.reason === "4th_scorer");

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold gradient-text">User not found</h1>
          <Link href="/leaderboard" className="text-accent underline">
            Back to leaderboard
          </Link>
        </div>
      </main>
    );
  }

  // Fetch all finished predictions for this user
  const predictions = await prisma.prediction.findMany({
    where: {
      userId,
      match: { status: "FINISHED", ...activeMatchWhere() },
    },
    include: {
      match: {
        select: {
          id: true,
          status: true,
          round: true,
          matchweek: true,
          kickoffTime: true,
          winnerTeamId: true,
          isDraw: true,
          homeScore: true,
          awayScore: true,
          wonOnPenalties: true,
          homeTeam: true,
          awayTeam: true,
          winnerTeam: true,
          scorers: { include: { player: true } },
        },
      },
      winnerTeam: true,
      scorers: { include: { player: true } },
    },
    orderBy: { match: { kickoffTime: "desc" } },
  });

  // Group by round / matchweek
  const groups = groupByMatch(predictions, (prediction) => prediction.match);

  // Calculate totals
  let totalPoints = 0;

  for (const prediction of predictions) {
    const actualScorerPlayerIds = prediction.match.scorers.map(s => s.playerId);
    const moneyData = calculateMatchMoney(
      {
        winnerTeamId: prediction.winnerTeamId,
        predictedDraw: prediction.predictedDraw,
        scorerPlayerIds: prediction.scorers.map(s => s.playerId),
      },
      { winnerTeamId: prediction.match.winnerTeamId, isDraw: prediction.match.isDraw, wonOnPenalties: prediction.match.wonOnPenalties },
      actualScorerPlayerIds,
      moneyConfig,
      prediction.usedPointsBooster
    );
    totalPoints += moneyData.total;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-4 sm:space-y-10 sm:p-6">
      <div className="space-y-3 pb-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold gradient-text">
            {user.name}&apos;s Predictions
          </h1>
          <Link
            href="/leaderboard"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300 dark:hover:bg-gray-800/50"
          >
            ← Back
          </Link>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {user.email}
        </p>
      </div>

      {/* User's Unlocked Rewards */}
      {(has3rdScorer || has4thScorer) && (
        <div className="card space-y-3 bg-accent/5 border-l-4 border-accent p-4 sm:p-5">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            UNLOCKED FEATURES
          </p>
          <div className="flex flex-wrap gap-2">
            {has3rdScorer && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs sm:text-sm font-semibold text-success">
                🔵 3rd Scorer Slot
              </span>
            )}
            {has4thScorer && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs sm:text-sm font-semibold text-success">
                🔵 4th Scorer Slot
              </span>
            )}
          </div>
        </div>
      )}

      {predictions.length > 0 && (
        <div className="card space-y-3 bg-gradient-to-r from-accent/10 to-secondary/10 border-l-4 border-accent p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            Total Performance (Finished Matches)
          </h2>
          <div className="flex flex-wrap gap-8 pt-1">
            <div>
              <p className={`text-3xl font-bold ${totalPoints >= 0 ? "text-success" : "text-danger"}`}>
                {formatPointsDelta(totalPoints)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Points</p>
            </div>
          </div>
        </div>
      )}

      {predictions.length === 0 && (
        <p className="text-sm text-gray-500">
          No finished match predictions yet.
        </p>
      )}

      {groups.map((group) => {
        return (
          <section key={group.key} className="space-y-4 pt-2">
            <h2 className="inline-block">
              <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${group.badgeClass}`}>
                {group.label}
              </span>
            </h2>
            <div className="w-full space-y-3">
              {group.items.map((prediction) => {
                const actualScorerPlayerIds = prediction.match.scorers.map(s => s.playerId);
                const moneyData = calculateMatchMoney(
                  {
                    winnerTeamId: prediction.winnerTeamId,
                    predictedDraw: prediction.predictedDraw,
                    scorerPlayerIds: prediction.scorers.map(s => s.playerId),
                  },
                  { winnerTeamId: prediction.match.winnerTeamId, isDraw: prediction.match.isDraw, wonOnPenalties: prediction.match.wonOnPenalties },
                  actualScorerPlayerIds,
                  moneyConfig,
                  prediction.usedPointsBooster
                );
                const points = moneyData.total;

                return (
                  <div
                    key={prediction.id}
                    className="card space-y-4 border-l-4 border-accent/30 shadow-sm p-5 sm:p-6"
                  >
                    {/* Match Header */}
                    <div className="flex flex-col gap-2 pb-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="flex min-w-0 flex-wrap items-center gap-2 font-medium">
                          <TeamFlag
                            flag={prediction.match.homeTeam.flag}
                            name={prediction.match.homeTeam.name}
                          />
                          <span className="wrap-break-word">
                            {prediction.match.homeTeam.name} vs{" "}
                            {prediction.match.awayTeam.name}
                          </span>
                          <TeamFlag
                            flag={prediction.match.awayTeam.flag}
                            name={prediction.match.awayTeam.name}
                          />
                        </span>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              points >= 0
                                ? "bg-success/10 text-success"
                                : "bg-danger/10 text-danger"
                            }`}
                          >
                            {formatPointsDelta(points)}
                          </span>
                        </div>
                      </div>

                      {/* Used Rewards Badges */}
                      <div className="flex flex-wrap gap-2">
                        {prediction.usedPointsBooster && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-highlight/20 px-2.5 py-1 text-xs font-semibold text-highlight-foreground dark:text-highlight">
                            ⚡ 2x Booster
                          </span>
                        )}
                        {prediction.scorers.length >= 3 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                            🔵 3rd Scorer
                          </span>
                        )}
                        {prediction.scorers.length >= 4 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                            🔵 4th Scorer
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Prediction vs Actual */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* User's Prediction */}
                      <div className="space-y-3 rounded-lg bg-white/50 p-4 dark:bg-gray-900/30">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                         {user.name}&apos;s Predictions
                        </p>

                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <span className="text-xs font-semibold text-gray-500">Result</span>
                          {prediction.winnerTeam ? (
                            <>
                              <TeamFlag
                                flag={prediction.winnerTeam.flag}
                                name={prediction.winnerTeam.name}
                                size={16}
                              />
                              <span className="text-sm font-medium">
                                {prediction.winnerTeam.name}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-medium">Draw</span>
                          )}
                        </div>

                        <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                          <span className="mt-0.5 shrink-0 text-xs font-semibold text-gray-500">
                            Scorers
                          </span>
                          {prediction.scorers.length > 0 ? (
                            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                              {prediction.scorers.map((s) => (
                                <span key={s.id} className="inline-flex items-center gap-1">
                                  <PlayerAvatar
                                    name={s.player.name}
                                    photoUrl={s.player.photoUrl}
                                    size={16}
                                  />
                                  <span className="text-sm">{s.player.name}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">None</span>
                          )}
                        </div>
                      </div>

                      {/* Actual Result */}
                      <div className="space-y-3 rounded-lg bg-green-50/50 p-4 dark:bg-green-900/10">
                        <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
                          Actual Result
                        </p>

                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <span className="text-xs font-semibold text-gray-500">Result</span>
                          {prediction.match.winnerTeam ? (
                            <>
                              <TeamFlag
                                flag={prediction.match.winnerTeam.flag}
                                name={prediction.match.winnerTeam.name}
                                size={16}
                              />
                              <span className="text-sm font-medium">
                                {prediction.match.winnerTeam.name}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-500">Draw</span>
                          )}
                        </div>

                        <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                          <span className="mt-0.5 shrink-0 text-xs font-semibold text-gray-500">
                            Scorers
                          </span>
                          {prediction.match.scorers.length > 0 ? (
                            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                              {prediction.match.scorers.map((s) => (
                                <span
                                  key={s.id}
                                  className="inline-flex items-center gap-1"
                                >
                                  <PlayerAvatar
                                    name={s.player.name}
                                    photoUrl={s.player.photoUrl}
                                    size={16}
                                  />
                                  <span className="text-sm">{s.player.name}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">None</span>
                          )}
                        </div>
                        {prediction.match.wonOnPenalties && <PenaltyBadge />}
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
                      <div className="grid gap-4">
                        {/* Points breakdown */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Points</p>
                          <div className="space-y-1.5">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              <span>Winner:</span>{" "}
                              <span className={moneyData.winnerMoney > 0 ? "text-success font-semibold" : "text-danger"}>
                                {formatPointsDelta(moneyData.winnerMoney)}
                              </span>
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              <span>Scorers:</span>{" "}
                              <span className={moneyData.scorerMoney > 0 ? "text-success font-semibold" : "text-danger"}>
                                {formatPointsDelta(moneyData.scorerMoney)}
                              </span>
                            </p>
                            <div className="border-t border-gray-200 pt-1.5 dark:border-gray-700 mt-1.5">
                              <p className={`text-xs font-semibold ${moneyData.total > 0 ? "text-success" : "text-danger"}`}>
                                Total: {formatPointsDelta(moneyData.total)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
