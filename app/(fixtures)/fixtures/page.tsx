import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { MatchCard, type MatchCardData } from "@/components/features/matches/MatchCard";
import type { Round } from "@prisma/client";

const ROUND_ORDER: Round[] = ["ROUND_OF_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];

const ROUND_LABELS: Record<Round, string> = {
  ROUND_OF_16: "Round of 16",
  QUARTER_FINALS: "Quarter Finals",
  SEMI_FINALS: "Semi Finals",
  FINAL: "Final",
};

export default async function FixturesPage() {
  const user = await requireAuth();

  const matches = await prisma.match.findMany({
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: { where: { userId: user.id } },
    },
    orderBy: { kickoffTime: "asc" },
  });

  const matchesByRound = new Map<Round, typeof matches>();
  for (const match of matches) {
    const existing = matchesByRound.get(match.round) ?? [];
    existing.push(match);
    matchesByRound.set(match.round, existing);
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-4 sm:space-y-10 sm:p-6">
      <h1 className="text-2xl font-semibold text-accent">Fixtures</h1>

      {matches.length === 0 && (
        <p className="text-sm text-gray-500">
          No matches yet. Ask the admin to run the match sync script.
        </p>
      )}

      {ROUND_ORDER.map((round) => {
        const roundMatches = matchesByRound.get(round);
        if (!roundMatches || roundMatches.length === 0) {
          return null;
        }

        return (
          <section key={round} className="space-y-3">
            <h2 className="text-lg font-medium">{ROUND_LABELS[round]}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {roundMatches.map((match) => {
                const cardData: MatchCardData = {
                  id: match.id,
                  kickoffTime: match.kickoffTime,
                  locked: match.locked || match.kickoffTime.getTime() <= Date.now(),
                  homeTeam: { name: match.homeTeam.name, flag: match.homeTeam.flag },
                  awayTeam: { name: match.awayTeam.name, flag: match.awayTeam.flag },
                  hasPrediction: match.predictions.length > 0,
                };
                return <MatchCard key={match.id} match={cardData} />;
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
