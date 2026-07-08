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
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Scorers:</span>
              {myPrediction.scorers.length > 0 ? (
                myPrediction.scorers.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1">
                    <PlayerAvatar name={s.player.name} photoUrl={s.player.photoUrl} size={22} />
                    {s.player.name}
                  </span>
                ))
              ) : (
                <span>None</span>
              )}
            </div>
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

      {isLocked ? (
        <section className="card space-y-3 p-4 text-sm">
          <p className="font-semibold">🔓 Everyone&apos;s predictions</p>
          {otherPredictions.length === 0 ? (
            <p className="text-gray-500">No one else predicted this match.</p>
          ) : (
            <div className="space-y-3">
              {otherPredictions.map((prediction) => (
                <div
                  key={prediction.id}
                  className="card-interactive space-y-2 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_8%,transparent)] bg-black/2 p-3 dark:bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${nameColor(
                        prediction.userId
                      )}`}
                    >
                      {prediction.user.name.slice(0, 1).toUpperCase()}
                    </span>
                    <p className="font-medium">{prediction.user.name}</p>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <span className="w-14 shrink-0 text-xs font-semibold text-gray-400">
                      Winner
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                      <TeamFlag
                        flag={prediction.winnerTeam.flag}
                        name={prediction.winnerTeam.name}
                        size={16}
                      />
                      {prediction.winnerTeam.name}
                    </span>
                  </div>

                  <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                    <span className="mt-1 w-14 shrink-0 text-xs font-semibold text-gray-400">
                      Scorers
                    </span>
                    {prediction.scorers.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {prediction.scorers.map((s) => (
                          <span
                            key={s.id}
                            className="flex flex-col items-center gap-1 text-center text-xs"
                          >
                            <PlayerAvatar name={s.player.name} photoUrl={s.player.photoUrl} size={40} />
                            <span className="max-w-16 truncate">{s.player.name}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="mt-1 text-gray-400">None</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
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
