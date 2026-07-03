import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { PredictionForm } from "@/components/features/predictions/PredictionForm";
import { TeamFlag } from "@/components/TeamFlag";
import { MoneyRulesCard } from "@/components/MoneyRulesCard";

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

  const isLocked = match.locked || match.kickoffTime.getTime() <= Date.now();
  const isTbd = match.homeTeam.fifaCode === "TBD" || match.awayTeam.fifaCode === "TBD";
  const existingPrediction = match.predictions[0] ?? null;

  return (
    <main className="mx-auto max-w-lg space-y-6 p-4 sm:p-6">
      <div className="gradient-header card rounded-2xl border-0 p-5 text-white shadow-xl">
        <h1 className="flex items-center justify-center gap-2 text-lg font-bold">
          <TeamFlag flag={match.homeTeam.flag} name={match.homeTeam.name} size={24} />
          {match.homeTeam.name} vs {match.awayTeam.name}
          <TeamFlag flag={match.awayTeam.flag} name={match.awayTeam.name} size={24} />
        </h1>
        <p className="mt-1 text-center text-xs text-white/80">
          Kickoff: {match.kickoffTime.toLocaleString()}
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
        <PredictionForm
          matchId={match.id}
          homeTeam={{
            id: match.homeTeam.id,
            name: match.homeTeam.name,
            players: match.homeTeam.players,
          }}
          awayTeam={{
            id: match.awayTeam.id,
            name: match.awayTeam.name,
            players: match.awayTeam.players,
          }}
          initialWinnerTeamId={existingPrediction?.winnerTeamId ?? null}
          initialScorerPlayerIds={existingPrediction?.scorers.map((s) => s.playerId) ?? []}
        />
      )}
    </main>
  );
}
