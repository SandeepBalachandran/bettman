import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { requireFeaturePage, getFeatureFlags, effectiveFlags } from "@/lib/feature-flags";
import { TeamFlag } from "@/components/TeamFlag";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { isMatchLocked } from "@/lib/match-lock";
import { isOutcomeDecided } from "@/lib/scoring";
import { calculateMatchMoney } from "@/lib/money";
import { moneyConfig } from "@/lib/money-config";
import { formatPointsDelta } from "@/lib/format-points";
import { PenaltyBadge } from "@/components/PenaltyBadge";
import { BoosterButton } from "@/components/BoosterButton";
import { activeMatchWhere } from "@/lib/competition";
import { groupByMatch } from "@/lib/match-groups";


export default async function MyPredictionsPage() {
  const user = await requireAuth();
  await requireFeaturePage("navMyPredictions", user.role);
  const flags = effectiveFlags(await getFeatureFlags(), user.role);

  const coinBalance = await prisma.coinBalance.findUnique({
    where: { userId: user.id },
  });

  const predictions = await prisma.prediction.findMany({
    where: { userId: user.id, match: activeMatchWhere() },
    include: {
      match: { include: { homeTeam: true, awayTeam: true, scorers: true } },
      winnerTeam: true,
      scorers: { include: { player: true } },
    },
    orderBy: { match: { kickoffTime: "asc" } },
  });

  const groups = groupByMatch(predictions, (prediction) => prediction.match);

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-4 sm:space-y-10 sm:p-6">
      <h1 className="text-2xl font-bold gradient-text">My Predictions</h1>

      {predictions.length === 0 && (
        <p className="text-sm text-gray-500">
          You haven&apos;t made any predictions yet.{" "}
          <Link href="/fixtures" className="underline">
            View fixtures
          </Link>
        </p>
      )}

      {groups.map((group) => {
        return (
          <section key={group.key} className="space-y-3">
            <h2 className="inline-block">
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${group.badgeClass}`}>
                {group.label}
              </span>
            </h2>
            <div className="w-full space-y-2">
              {group.items.map((prediction) => {
                const isLocked = isMatchLocked(prediction.match);
                const isFinished = prediction.match.status === "FINISHED";

                let points = 0;

                if (isFinished && isOutcomeDecided(prediction.match)) {
                  const actualScorerPlayerIds = prediction.match.scorers.map(s => s.playerId);
                  const pointsData = calculateMatchMoney(
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
                  points = pointsData.total;
                }

                return (
                  <Link
                    key={prediction.id}
                    href={`/match/${prediction.match.id}`}
                    className="card card-interactive block w-full space-y-2 border-l-4 border-secondary p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex min-w-0 flex-wrap items-center gap-2 font-medium">
                        <TeamFlag
                          flag={prediction.match.homeTeam.flag}
                          name={prediction.match.homeTeam.name}
                        />
                        <span className="wrap-break-word">
                          {prediction.match.homeTeam.name} vs {prediction.match.awayTeam.name}
                        </span>
                        <TeamFlag
                          flag={prediction.match.awayTeam.flag}
                          name={prediction.match.awayTeam.name}
                        />
                      </span>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        {isFinished && (
                          <>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              points >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                            }`}>
                              {formatPointsDelta(points)}
                            </span>
                          </>
                        )}
                        {!isFinished && isLocked && (
                          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                            Locked
                          </span>
                        )}
                        {!isFinished && !isLocked && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/10 dark:text-gray-300">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <span className="text-xs font-semibold text-gray-400">Result</span>
                      {prediction.winnerTeam ? (
                        <>
                          <TeamFlag flag={prediction.winnerTeam.flag} name={prediction.winnerTeam.name} size={16} />
                          <span>{prediction.winnerTeam.name}</span>
                        </>
                      ) : (
                        <span>Draw</span>
                      )}
                    </div>

                    <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                      <span className="mt-0.5 shrink-0 text-xs font-semibold text-gray-400">
                        Scorers
                      </span>
                      {prediction.scorers.length > 0 ? (
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {prediction.scorers.map((s) => (
                            <span key={s.id} className="inline-flex items-center gap-1">
                              <PlayerAvatar name={s.player.name} photoUrl={s.player.photoUrl} size={16} />
                              {s.player.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </div>

                    {isFinished && prediction.match.wonOnPenalties && (
                      <div className="pt-1">
                        <PenaltyBadge />
                      </div>
                    )}

                    {!isFinished && !isLocked && flags.booster && (
                      <div className="border-t border-gray-200 pt-3 dark:border-gray-800">
                        <BoosterButton
                          predictionId={prediction.id}
                          isUsed={prediction.usedPointsBooster}
                          userCoins={coinBalance?.balance ?? 0}
                        />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
