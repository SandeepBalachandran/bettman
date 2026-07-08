import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { PredictionForm } from "@/components/features/predictions/PredictionForm";
import { TeamFlag } from "@/components/TeamFlag";
import { MoneyRulesCard } from "@/components/MoneyRulesCard";
import { LocalDateTime } from "@/components/LocalDateTime";
import { isMatchLocked, AUTO_LOCK_MINUTES_BEFORE_KICKOFF } from "@/lib/match-lock";
import { getUserCoinBalance, canUnlockScorer } from "@/lib/coin-rewards";

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
        where: { userId: user.id },
        include: { scorers: true },
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
  const canUse3rdScorer = await canUnlockScorer(coinBalance, 3);
  const canUse4thScorer = await canUnlockScorer(coinBalance, 4);

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
        <div className="card border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Predictions are locked for this match.
          <p className="mt-1 text-xs text-danger/80">
            Predictions lock automatically {AUTO_LOCK_MINUTES_BEFORE_KICKOFF} minutes before
            kickoff.
          </p>
          {existingPrediction && (
            <p className="mt-2">
              Your prediction: winner{" "}
              {existingPrediction.winnerTeamId === match.homeTeamId
                ? match.homeTeam.name
                : match.awayTeam.name}
            </p>
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
            canUse3rdScorer={canUse3rdScorer}
            canUse4thScorer={canUse4thScorer}
          />
        </>
      )}
    </main>
  );
}
