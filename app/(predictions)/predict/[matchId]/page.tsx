import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { PredictionForm } from "@/components/features/predictions/PredictionForm";

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
  const existingPrediction = match.predictions[0] ?? null;

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">
          {match.homeTeam.name} vs {match.awayTeam.name}
        </h1>
        <p className="text-sm text-gray-500">
          Kickoff: {match.kickoffTime.toLocaleString()}
        </p>
      </div>

      {isLocked ? (
        <div className="rounded border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
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
