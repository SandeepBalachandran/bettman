import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { TeamFlag } from "@/components/TeamFlag";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { calculateMatchPoints } from "@/lib/scoring";
import { calculateMatchMoney } from "@/lib/money";
import { moneyConfig } from "@/lib/money-config";
import { formatMoney } from "@/lib/format-money";
import { PenaltyBadge } from "@/components/PenaltyBadge";
import type { Round } from "@prisma/client";
import Link from "next/link";

const ROUND_ORDER: Round[] = ["ROUND_OF_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];

const ROUND_LABELS: Record<Round, string> = {
  ROUND_OF_16: "Round of 16",
  QUARTER_FINALS: "Quarter Finals",
  SEMI_FINALS: "Semi Finals",
  FINAL: "Final",
};

const ROUND_BADGE_STYLES: Record<Round, string> = {
  ROUND_OF_16: "bg-accent/15 text-accent",
  QUARTER_FINALS: "bg-secondary/15 text-secondary",
  SEMI_FINALS: "bg-highlight/20 text-highlight-foreground dark:text-highlight",
  FINAL: "bg-danger/15 text-danger",
};

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
    select: { id: true, name: true, email: true },
  });

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
      match: { status: "FINISHED" },
    },
    include: {
      match: {
        select: {
          id: true,
          status: true,
          round: true,
          kickoffTime: true,
          winnerTeamId: true,
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

  // Group by round
  const byRound = new Map<Round, typeof predictions>();
  for (const prediction of predictions) {
    const existing = byRound.get(prediction.match.round) ?? [];
    existing.push(prediction);
    byRound.set(prediction.match.round, existing);
  }

  // Calculate totals
  let totalPoints = 0;
  let totalMoney = 0;

  for (const prediction of predictions) {
    const actualScorerPlayerIds = prediction.match.scorers.map(s => s.playerId);
    const pointsData = calculateMatchPoints(
      {
        winnerTeamId: prediction.winnerTeamId,
        scorerPlayerIds: prediction.scorers.map(s => s.playerId),
      },
      { winnerTeamId: prediction.match.winnerTeamId, wonOnPenalties: prediction.match.wonOnPenalties },
      actualScorerPlayerIds
    );
    const moneyData = calculateMatchMoney(
      {
        winnerTeamId: prediction.winnerTeamId,
        scorerPlayerIds: prediction.scorers.map(s => s.playerId),
      },
      { winnerTeamId: prediction.match.winnerTeamId, wonOnPenalties: prediction.match.wonOnPenalties },
      actualScorerPlayerIds,
      moneyConfig
    );
    totalPoints += pointsData.total;
    totalMoney += moneyData.total;
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

      {predictions.length > 0 && (
        <div className="card space-y-3 bg-gradient-to-r from-accent/10 to-secondary/10 border-l-4 border-accent p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            Total Performance (Finished Matches)
          </h2>
          <div className="flex flex-wrap gap-8 pt-1">
            <div>
              <p className="text-3xl font-bold text-accent">{totalPoints}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Points</p>
            </div>
            <div>
              <p
                className={`text-3xl font-bold ${
                  totalMoney >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {totalMoney >= 0 ? "+" : ""}{formatMoney(totalMoney)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Money</p>
            </div>
          </div>
        </div>
      )}

      {predictions.length === 0 && (
        <p className="text-sm text-gray-500">
          No finished match predictions yet.
        </p>
      )}

      {ROUND_ORDER.map((round) => {
        const roundPredictions = byRound.get(round);
        if (!roundPredictions || roundPredictions.length === 0) {
          return null;
        }

        return (
          <section key={round} className="space-y-4 pt-2">
            <h2 className="inline-block">
              <span
                className={`rounded-full px-4 py-1.5 text-sm font-bold ${ROUND_BADGE_STYLES[round]}`}
              >
                {ROUND_LABELS[round]}
              </span>
            </h2>
            <div className="w-full space-y-3">
              {roundPredictions.map((prediction) => {
                const actualScorerPlayerIds = prediction.match.scorers.map(s => s.playerId);
                const pointsData = calculateMatchPoints(
                  {
                    winnerTeamId: prediction.winnerTeamId,
                    scorerPlayerIds: prediction.scorers.map(s => s.playerId),
                  },
                  { winnerTeamId: prediction.match.winnerTeamId, wonOnPenalties: prediction.match.wonOnPenalties },
                  actualScorerPlayerIds
                );
                const moneyData = calculateMatchMoney(
                  {
                    winnerTeamId: prediction.winnerTeamId,
                    scorerPlayerIds: prediction.scorers.map(s => s.playerId),
                  },
                  { winnerTeamId: prediction.match.winnerTeamId, wonOnPenalties: prediction.match.wonOnPenalties },
                  actualScorerPlayerIds,
                  moneyConfig
                );
                const points = pointsData.total;
                const money = moneyData.total;

                return (
                  <div
                    key={prediction.id}
                    className="card space-y-4 border-l-4 border-accent/30 shadow-sm p-5 sm:p-6"
                  >
                    {/* Match Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
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
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                          +{points} pts
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            money >= 0
                              ? "bg-success/10 text-success"
                              : "bg-danger/10 text-danger"
                          }`}
                        >
                          {money >= 0 ? "+" : ""}{formatMoney(money)}
                        </span>
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
                          <span className="text-xs font-semibold text-gray-500">Winner</span>
                          <TeamFlag
                            flag={prediction.winnerTeam.flag}
                            name={prediction.winnerTeam.name}
                            size={16}
                          />
                          <span className="text-sm font-medium">
                            {prediction.winnerTeam.name}
                          </span>
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
                          <span className="text-xs font-semibold text-gray-500">Winner</span>
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
                    <div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-800">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-semibold">Winner:</span>{" "}
                        {pointsData.winnerPoints > 0 ? "✅" : "❌"} {pointsData.winnerPoints} pts
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-semibold">Scorers:</span>{" "}
                        {pointsData.scorerPoints > 0 ? "✅" : "❌"} {pointsData.scorerPoints} pts
                      </p>
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
