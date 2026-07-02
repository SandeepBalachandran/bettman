import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { calculateMatchPoints } from "@/lib/scoring";

export default async function MatchDetailsPage({
  params,
}: {
  readonly params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const user = await requireAuth();

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
      winnerTeam: true,
      scorers: { include: { player: true } },
      predictions: {
        where: { userId: user.id },
        include: { scorers: { include: { player: true } } },
      },
    },
  });

  if (!match) {
    notFound();
  }

  const myPrediction = match.predictions[0] ?? null;
  const isFinished = match.status === "FINISHED";

  const points =
    isFinished && myPrediction
      ? calculateMatchPoints(
          {
            winnerTeamId: myPrediction.winnerTeamId,
            scorerPlayerIds: myPrediction.scorers.map((s) => s.playerId),
          },
          { winnerTeamId: match.winnerTeamId },
          match.scorers.map((s) => s.playerId)
        )
      : null;

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">
          {match.homeTeam.name} vs {match.awayTeam.name}
        </h1>
        <p className="text-sm text-gray-500">
          Kickoff: {match.kickoffTime.toLocaleString()} · Status: {match.status}
        </p>
      </div>

      {isFinished && (
        <section className="space-y-1 rounded border p-4 text-sm">
          <p className="font-medium">
            Winner: {match.winnerTeam?.name ?? "—"}
          </p>
          <p>
            Scorers:{" "}
            {match.scorers.length > 0
              ? match.scorers.map((s) => s.player.name).join(", ")
              : "None"}
          </p>
        </section>
      )}

      <section className="space-y-1 rounded border p-4 text-sm">
        <p className="font-medium">My prediction</p>
        {myPrediction ? (
          <>
            <p>
              Winner:{" "}
              {myPrediction.winnerTeamId === match.homeTeamId
                ? match.homeTeam.name
                : match.awayTeam.name}
            </p>
            <p>
              Scorers:{" "}
              {myPrediction.scorers.length > 0
                ? myPrediction.scorers.map((s) => s.player.name).join(", ")
                : "None"}
            </p>
            {points && (
              <p className="font-medium">
                Points earned: {points.total} (winner {points.winnerPoints}, scorers{" "}
                {points.scorerPoints})
              </p>
            )}
          </>
        ) : (
          <p className="text-gray-500">No prediction submitted.</p>
        )}
      </section>

      {!isFinished && (
        <Link href={`/predict/${match.id}`} className="text-sm underline">
          Go to prediction page
        </Link>
      )}
    </main>
  );
}
