import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { calculateMatchPoints } from "@/lib/scoring";
import { isMatchLocked } from "@/lib/match-lock";
import { PerfectPredictionConfetti } from "@/components/features/match/PerfectPredictionConfetti";
import { TeamFlag } from "@/components/TeamFlag";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { LocalDateTime } from "@/components/LocalDateTime";
import { PenaltyBadge } from "@/components/PenaltyBadge";

const AVATAR_COLORS = ["bg-accent", "bg-secondary", "bg-highlight", "bg-success", "bg-danger"];

function nameColor(id: string) {
  const hash = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

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
        include: { user: true, winnerTeam: true, scorers: { include: { player: true } } },
      },
    },
  });

  if (!match) {
    notFound();
  }

  const myPrediction = match.predictions.find((p) => p.userId === user.id) ?? null;
  const isFinished = match.status === "FINISHED";
  const isLocked = isMatchLocked(match);
  const otherPredictions = match.predictions.filter((p) => p.userId !== user.id);

  const points =
    isFinished && myPrediction
      ? calculateMatchPoints(
          {
            winnerTeamId: myPrediction.winnerTeamId,
            scorerPlayerIds: myPrediction.scorers.map((s) => s.playerId),
          },
          { winnerTeamId: match.winnerTeamId, wonOnPenalties: match.wonOnPenalties },
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
          Kickoff: <LocalDateTime date={match.kickoffTime.toISOString()} /> · Status:{" "}
          {match.status}
        </p>
      </div>

      {isFinished && (
        <section className="card space-y-2 border-l-4 border-success p-4 text-sm">
          <p className="font-semibold text-success">
            Winner: {match.winnerTeam?.name ?? "—"}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Scorers:</span>
            {match.scorers.length > 0 ? (
              match.scorers.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1">
                  <PlayerAvatar name={s.player.name} photoUrl={s.player.photoUrl} size={22} />
                  {s.player.name}
                </span>
              ))
            ) : (
              <span>None</span>
            )}
          </div>
          {match.wonOnPenalties && <PenaltyBadge />}
        </section>
      )}

      {myPrediction && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-accent mb-3">My prediction</h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Winner</p>
              <p className="text-sm font-medium">
                {myPrediction.winnerTeamId === match.homeTeamId
                  ? match.homeTeam.name
                  : match.awayTeam.name}
              </p>
            </div>
            {myPrediction.scorers.length > 0 && (
              <div>
                <p className="text-xs text-gray-500">Scorers</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {myPrediction.scorers.map((s) => (
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
            {points && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-highlight-foreground dark:text-highlight">
                  Points: {points.total} (winner {points.winnerPoints}, scorers {points.scorerPoints})
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {isLocked && otherPredictions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-secondary">📊 Everyone&apos;s predictions</h3>
          {otherPredictions.map((prediction) => (
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

      {!isLocked && (
        <p className="text-center text-xs text-gray-500">
          Other players&apos; predictions unlock once this match locks (30 minutes before
          kickoff).
        </p>
      )}

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
