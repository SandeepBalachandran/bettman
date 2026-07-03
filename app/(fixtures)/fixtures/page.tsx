import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { MatchCard, type MatchCardData } from "@/components/features/matches/MatchCard";
import { fetchLiveCompetitionMatches, type FootballDataMatch } from "@/lib/football-data";
import type { Round } from "@prisma/client";

const COMPETITION_CODE = process.env.FOOTBALL_DATA_COMPETITION_CODE ?? "WC";

async function getLiveStatusByExternalId(): Promise<Map<number, FootballDataMatch>> {
  try {
    const liveMatches = await fetchLiveCompetitionMatches(COMPETITION_CODE);
    return new Map(liveMatches.map((match) => [match.id, match]));
  } catch {
    // Live status is a display enhancement — fall back to DB-only rendering
    // if the API token is missing or football-data.org is unreachable.
    return new Map();
  }
}

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

export default async function FixturesPage() {
  const user = await requireAuth();

  const [matches, liveStatusByExternalId] = await Promise.all([
    prisma.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        predictions: { where: { userId: user.id } },
      },
      orderBy: { kickoffTime: "asc" },
    }),
    getLiveStatusByExternalId(),
  ]);

  const matchesByRound = new Map<Round, typeof matches>();
  for (const match of matches) {
    const existing = matchesByRound.get(match.round) ?? [];
    existing.push(match);
    matchesByRound.set(match.round, existing);
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-4 sm:space-y-10 sm:p-6">
      <h1 className="text-2xl font-bold gradient-text">Fixtures</h1>

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
            <h2 className="inline-block">
              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${ROUND_BADGE_STYLES[round]}`}
              >
                {ROUND_LABELS[round]}
              </span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {roundMatches.map((match) => {
                const liveMatch = match.externalId
                  ? liveStatusByExternalId.get(match.externalId)
                  : undefined;
                const cardData: MatchCardData = {
                  id: match.id,
                  kickoffTime: match.kickoffTime,
                  locked: match.locked || match.kickoffTime.getTime() <= Date.now(),
                  homeTeam: { name: match.homeTeam.name, flag: match.homeTeam.flag },
                  awayTeam: { name: match.awayTeam.name, flag: match.awayTeam.flag },
                  hasPrediction: match.predictions.length > 0,
                  liveStatus: liveMatch?.status,
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
