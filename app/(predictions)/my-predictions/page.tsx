import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { TeamFlag } from "@/components/TeamFlag";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { isMatchLocked } from "@/lib/match-lock";
import type { Round } from "@prisma/client";

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


export default async function MyPredictionsPage() {
  const user = await requireAuth();

  const predictions = await prisma.prediction.findMany({
    where: { userId: user.id },
    include: {
      match: { include: { homeTeam: true, awayTeam: true } },
      winnerTeam: true,
      scorers: { include: { player: true } },
    },
    orderBy: { match: { kickoffTime: "asc" } },
  });

  const byRound = new Map<Round, typeof predictions>();
  for (const prediction of predictions) {
    const existing = byRound.get(prediction.match.round) ?? [];
    existing.push(prediction);
    byRound.set(prediction.match.round, existing);
  }

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

      {ROUND_ORDER.map((round) => {
        const roundPredictions = byRound.get(round);
        if (!roundPredictions || roundPredictions.length === 0) {
          return null;
        }

        return (
          <section key={round} className="space-y-3">
            <h2 className="inline-block">
              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${ROUND_BADGE_STYLES[round]}`}
              >
                {ROUND_LABELS[round]}
              </span>
            </h2>
            <div className="w-full space-y-2">
              {roundPredictions.map((prediction) => {
                const isLocked = isMatchLocked(prediction.match);

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
                      {isLocked && (
                        <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                          Locked
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <span className="text-xs font-semibold text-gray-400">Winner</span>
                      <TeamFlag flag={prediction.winnerTeam.flag} name={prediction.winnerTeam.name} size={16} />
                      <span>{prediction.winnerTeam.name}</span>
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
