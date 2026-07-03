import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { TeamFlag } from "@/components/TeamFlag";
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

export default async function AdminPredictionsPage() {
  await requireAdmin();

  const [matches, allUsers] = await Promise.all([
    prisma.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        predictions: {
          include: {
            user: true,
            winnerTeam: true,
            scorers: { include: { player: true } },
          },
        },
      },
      orderBy: { kickoffTime: "asc" },
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);

  const matchesByRound = new Map<Round, typeof matches>();
  for (const match of matches) {
    const existing = matchesByRound.get(match.round) ?? [];
    existing.push(match);
    matchesByRound.set(match.round, existing);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4 sm:p-6">
      <h1 className="text-2xl font-bold gradient-text">All Predictions</h1>
      <p className="text-sm text-gray-500">
        {allUsers.length} player{allUsers.length === 1 ? "" : "s"} · every prediction across
        every match, visible only to admins.
      </p>

      {ROUND_ORDER.map((round) => {
        const roundMatches = matchesByRound.get(round);
        if (!roundMatches || roundMatches.length === 0) {
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

            <div className="space-y-3">
              {roundMatches.map((match) => {
                const predictedUserIds = new Set(match.predictions.map((p) => p.userId));
                const missingUsers = allUsers.filter((u) => !predictedUserIds.has(u.id));

                return (
                  <div key={match.id} className="card p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <TeamFlag flag={match.homeTeam.flag} name={match.homeTeam.name} size={18} />
                      {match.homeTeam.name} vs {match.awayTeam.name}
                      <TeamFlag flag={match.awayTeam.flag} name={match.awayTeam.name} size={18} />
                      <span className="ml-auto text-xs font-normal text-gray-400">
                        {match.kickoffTime.toLocaleString()}
                      </span>
                    </div>

                    {match.predictions.length === 0 ? (
                      <p className="text-xs text-gray-500">No predictions submitted yet.</p>
                    ) : (
                      <ul className="space-y-1 text-xs">
                        {match.predictions.map((prediction) => (
                          <li
                            key={prediction.id}
                            className="flex flex-wrap items-center gap-2 rounded bg-gray-50 px-2 py-1 dark:bg-white/5"
                          >
                            <span className="font-semibold text-secondary">
                              {prediction.user.name}
                            </span>
                            <span>→ winner: {prediction.winnerTeam.name}</span>
                            <span className="text-gray-500">
                              scorers:{" "}
                              {prediction.scorers.length > 0
                                ? prediction.scorers.map((s) => s.player.name).join(", ")
                                : "none"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {missingUsers.length > 0 && (
                      <p className="mt-1 text-xs text-gray-400">
                        Not yet predicted: {missingUsers.map((u) => u.name).join(", ")}
                      </p>
                    )}
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
