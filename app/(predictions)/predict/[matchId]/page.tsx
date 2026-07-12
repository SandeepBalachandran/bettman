import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { PredictionForm } from "@/components/features/predictions/PredictionForm";
import { TeamFlag } from "@/components/TeamFlag";
import { MoneyRulesCard } from "@/components/MoneyRulesCard";
import { LocalDateTime } from "@/components/LocalDateTime";
import { isMatchLocked, AUTO_LOCK_MINUTES_BEFORE_KICKOFF } from "@/lib/match-lock";
import { getUserCoinBalance } from "@/lib/coin-rewards";
import { getMostPickedPlayers } from "@/lib/most-picked-players";

export default async function PredictPage({
  params,
}: {
  readonly params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const user = await requireAuth();

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
      predictions: {
        include: {
          user: true,
          winnerTeam: true,
          scorers: { include: { player: true } },
        },
      },
    },
  });

  if (!match) {
    notFound();
  }

  const isLocked = isMatchLocked(match);
  const isTbd = match.homeTeam.fifaCode === "TBD" || match.awayTeam.fifaCode === "TBD";
  const existingPrediction = match.predictions[0] ?? null;

  const coinBalance = await getUserCoinBalance(user.id);
  const mostPickedPlayers = await getMostPickedPlayers(matchId, 5);

  return (
    <main className="mx-auto max-w-lg space-y-6 p-4 sm:p-6">
      <div className="gradient-header card rounded-2xl border-0 p-5 text-white shadow-xl">
        <h1 className="flex items-center justify-center gap-2 text-lg font-bold">
          <TeamFlag flag={match.homeTeam.flag} name={match.homeTeam.name} size={24} />
          {match.homeTeam.name} vs {match.awayTeam.name}
          <TeamFlag flag={match.awayTeam.flag} name={match.awayTeam.name} size={24} />
        </h1>
        <p className="mt-1 text-center text-xs text-white/80">
          Kickoff: <LocalDateTime date={match.kickoffTime.toISOString()} />
        </p>
      </div>

      <MoneyRulesCard />

      {isTbd ? (
        <div className="card border-highlight/30 bg-highlight/10 p-4 text-sm text-highlight-foreground dark:text-highlight">
          The teams for this match haven&apos;t been determined yet — check back once the
          earlier round finishes.
        </div>
      ) : isLocked ? (
        <div className="space-y-4">
          {existingPrediction && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-accent mb-3">My prediction</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Winner</p>
                  <p className="text-sm font-medium">
                    {existingPrediction.winnerTeamId === match.homeTeamId
                      ? match.homeTeam.name
                      : match.awayTeam.name}
                  </p>
                </div>
                {existingPrediction.scorers.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500">Scorers</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {existingPrediction.scorers.map((s) => (
                        <div key={s.id} className="flex items-center gap-1">
                          {s.player.photoUrl && (
                            <img
                              src={s.player.photoUrl}
                              alt={s.player.name}
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                          )}
                          <span className="text-xs text-gray-600 line-clamp-1">
                            {s.player.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {match.predictions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-secondary">📊 Everyone&apos;s predictions</h3>
              {match.predictions.map((prediction) => (
                <div key={prediction.id} className="card p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-semibold text-secondary">
                      {prediction.user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-sm">{prediction.user.name}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Winner</p>
                      <p className="font-medium text-accent">{prediction.winnerTeam.name}</p>
                    </div>
                    {prediction.scorers.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500">Scorers</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {prediction.scorers.map((s) => (
                            <div key={s.id} className="flex items-center gap-0.5">
                              {s.player.photoUrl && (
                                <img
                                  src={s.player.photoUrl}
                                  alt={s.player.name}
                                  width={16}
                                  height={16}
                                  className="rounded-full"
                                />
                              )}
                              <span className="text-xs text-gray-600 line-clamp-1">
                                {s.player.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            Predictions lock automatically {AUTO_LOCK_MINUTES_BEFORE_KICKOFF} minutes before
            kickoff — get your picks in before then.
          </p>
          <PredictionForm
            matchId={match.id}
            homeTeam={{
              id: match.homeTeam.id,
              name: match.homeTeam.name,
              flag: match.homeTeam.flag,
              players: match.homeTeam.players,
            }}
            awayTeam={{
              id: match.awayTeam.id,
              name: match.awayTeam.name,
              flag: match.awayTeam.flag,
              players: match.awayTeam.players,
            }}
            initialWinnerTeamId={existingPrediction?.winnerTeamId ?? null}
            initialScorerPlayerIds={existingPrediction?.scorers.map((s) => s.playerId) ?? []}
            coinBalance={coinBalance}
            mostPickedPlayers={mostPickedPlayers}
          />
        </>
      )}
    </main>
  );
}
