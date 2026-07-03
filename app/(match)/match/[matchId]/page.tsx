import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { calculateMatchPoints } from "@/lib/scoring";
import { PerfectPredictionConfetti } from "@/components/features/match/PerfectPredictionConfetti";
import { TeamFlag } from "@/components/TeamFlag";

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
    <main className="mx-auto max-w-lg space-y-6 p-4 sm:p-6">
      <PerfectPredictionConfetti isPerfect={points?.total === 60} />

      <div className="gradient-header card rounded-2xl border-0 p-5 text-white shadow-xl">
        <div className="flex items-center justify-center gap-3 text-lg font-bold">
          <TeamFlag flag={match.homeTeam.flag} name={match.homeTeam.name} size={28} />
          <span>{match.homeTeam.name}</span>
          <span className="text-white/70">vs</span>
          <span>{match.awayTeam.name}</span>
          <TeamFlag flag={match.awayTeam.flag} name={match.awayTeam.name} size={28} />
        </div>
        <p className="mt-1 text-center text-xs text-white/80">
          Kickoff: {match.kickoffTime.toLocaleString()} · Status: {match.status}
        </p>
      </div>

      {isFinished && (
        <section className="card space-y-1 border-l-4 border-success p-4 text-sm">
          <p className="font-semibold text-success">
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

      <section className="card space-y-1 border-l-4 border-secondary p-4 text-sm">
        <p className="font-semibold text-secondary">My prediction</p>
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
              <p className="font-bold text-highlight-foreground dark:text-highlight">
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
        <Link
          href={`/predict/${match.id}`}
          className="gradient-header btn block py-2.5 text-center text-sm font-semibold text-white"
        >
          Go to prediction page
        </Link>
      )}
    </main>
  );
}
