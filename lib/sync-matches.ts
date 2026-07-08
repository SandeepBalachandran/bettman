import { Round, type PrismaClient } from "@prisma/client";
import { fetchCompetitionMatches, fetchLiveMatchResults, fetchCompetitionScorersList, type FootballDataTeam, type FootballDataMatch } from "@/lib/football-data";
import { searchApiFootballTeam, fetchHeadToHeadFixtures, FINISHED_FIXTURE_STATUSES } from "@/lib/api-football";

const STAGE_TO_ROUND: Record<string, Round> = {
  LAST_16: Round.ROUND_OF_16,
  QUARTER_FINALS: Round.QUARTER_FINALS,
  SEMI_FINALS: Round.SEMI_FINALS,
  FINAL: Round.FINAL,
};

// Sentinel externalId for the placeholder "TBD" team used when football-data.org
// hasn't determined a knockout match's participants yet (earlier rounds still in progress).
// Real football-data.org team ids are always positive, so -1 can never collide.
const TBD_TEAM_EXTERNAL_ID = -1;

export type SyncMatchesResult = {
  totalFetched: number;
  determinedCount: number;
  placeholderCount: number;
  totalMatches: number;
};

async function upsertTeam(prisma: PrismaClient, team: FootballDataTeam) {
  return prisma.team.upsert({
    where: { externalId: team.id },
    update: {
      name: team.name,
      shortName: team.shortName,
      fifaCode: team.tla,
      flag: team.crest,
    },
    create: {
      externalId: team.id,
      name: team.name,
      shortName: team.shortName,
      fifaCode: team.tla,
      flag: team.crest,
    },
  });
}

async function getOrCreateTbdTeam(prisma: PrismaClient) {
  return prisma.team.upsert({
    where: { externalId: TBD_TEAM_EXTERNAL_ID },
    update: {},
    create: {
      externalId: TBD_TEAM_EXTERNAL_ID,
      name: "TBD",
      shortName: "TBD",
      fifaCode: "TBD",
      flag: null,
    },
  });
}

/**
 * Upserts knockout-stage Match/Team rows from the football-data.org schedule.
 * Safe to re-run any time — idempotent on football-data.org's match id, and
 * automatically replaces TBD placeholders once earlier rounds resolve.
 */
export async function syncMatchesFromLiveApi(
  prisma: PrismaClient,
  competitionCode = "WC"
): Promise<SyncMatchesResult> {
  const matches = await fetchCompetitionMatches(competitionCode);
  const knockoutMatches = matches.filter((match) => match.stage in STAGE_TO_ROUND);

  const tbdTeam = await getOrCreateTbdTeam(prisma);
  let determinedCount = 0;
  let placeholderCount = 0;

  for (const match of knockoutMatches) {
    const round = STAGE_TO_ROUND[match.stage];
    const isDetermined = Boolean(match.homeTeam?.id && match.awayTeam?.id);

    const homeTeam = isDetermined ? await upsertTeam(prisma, match.homeTeam) : tbdTeam;
    const awayTeam = isDetermined ? await upsertTeam(prisma, match.awayTeam) : tbdTeam;

    await prisma.match.upsert({
      where: { externalId: match.id },
      update: {
        round,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        kickoffTime: new Date(match.utcDate),
      },
      create: {
        externalId: match.id,
        round,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        kickoffTime: new Date(match.utcDate),
      },
    });

    if (isDetermined) {
      determinedCount++;
    } else {
      placeholderCount++;
    }
  }

  const totalMatches = await prisma.match.count();

  return {
    totalFetched: matches.length,
    determinedCount,
    placeholderCount,
    totalMatches,
  };
}

async function mapWinnerToTeam(
  prisma: PrismaClient,
  winner: string | null | undefined,
  homeTeamExternalId: number,
  awayTeamExternalId: number
): Promise<string | null> {
  if (!winner || winner === "DRAW") {
    return null;
  }

  const targetExternalId =
    winner === "HOME_TEAM" ? homeTeamExternalId : awayTeamExternalId;

  const team = await prisma.team.findUnique({
    where: { externalId: targetExternalId },
    select: { id: true },
  });

  return team?.id || null;
}

export async function syncLiveMatchResults(
  prisma: PrismaClient,
  competitionCode = "WC"
): Promise<void> {
  try {
    const liveMatches = await fetchLiveMatchResults(competitionCode, {
      revalidateSeconds: 0,
    });

    // Fetch all scorers from the dedicated endpoint for more reliable data
    const allScorers = await fetchCompetitionScorersList(competitionCode, {
      revalidateSeconds: 0,
    });

    for (const liveMatch of liveMatches) {
      if (!liveMatch.id || !liveMatch.score) {
        continue;
      }

      const dbMatch = await prisma.match.findUnique({
        where: { externalId: liveMatch.id },
        include: { scorers: true, homeTeam: true, awayTeam: true },
      });

      if (!dbMatch) {
        continue;
      }

      // Update to FINISHED when live API shows finished
      if (liveMatch.status === "FINISHED" && dbMatch.status !== "FINISHED") {
        const winnerTeamId = await mapWinnerToTeam(
          prisma,
          liveMatch.score.winner,
          liveMatch.homeTeam.id,
          liveMatch.awayTeam.id
        );

        // Check if match was decided by penalties
        let wonOnPenalties = false;
        try {
          const [apiHomeTeam, apiAwayTeam] = await Promise.all([
            searchApiFootballTeam(dbMatch.homeTeam.name),
            searchApiFootballTeam(dbMatch.awayTeam.name),
          ]);

          if (apiHomeTeam && apiAwayTeam) {
            const fixtures = await fetchHeadToHeadFixtures(apiHomeTeam.id, apiAwayTeam.id);
            const matchedFixture = fixtures.find(
              (f) =>
                FINISHED_FIXTURE_STATUSES.has(f.fixture.status.short) &&
                Math.abs(new Date(f.fixture.date).getTime() - dbMatch.kickoffTime.getTime()) < 3 * 24 * 60 * 60 * 1000
            );
            if (matchedFixture) {
              wonOnPenalties = matchedFixture.fixture.status.short === "PEN";
            }
          }
        } catch (error) {
          console.warn(`Could not check penalty status for match ${dbMatch.id}:`, error);
        }

        await prisma.match.update({
          where: { id: dbMatch.id },
          data: {
            status: "FINISHED",
            winnerTeamId,
            wonOnPenalties,
          },
        });

        // Clear existing scorers and add new ones from API
        await prisma.matchScorer.deleteMany({
          where: { matchId: dbMatch.id },
        });

        // Get scorers for this match's teams from the scorers endpoint
        const homeTeamExternalId = liveMatch.homeTeam.id;
        const awayTeamExternalId = liveMatch.awayTeam.id;

        const matchScorers = allScorers.filter(
          (scorer) =>
            scorer.teamId === homeTeamExternalId ||
            scorer.teamId === awayTeamExternalId
        );

        if (matchScorers.length > 0) {
          for (const scorer of matchScorers) {
            const player = await prisma.player.findFirst({
              where: {
                name: scorer.playerName,
                team: {
                  externalId: scorer.teamId,
                },
              },
              select: { id: true },
            });

            if (player) {
              // Add the player once for each goal they scored
              for (let i = 0; i < scorer.numberOfGoals; i++) {
                await prisma.matchScorer.create({
                  data: {
                    matchId: dbMatch.id,
                    playerId: player.id,
                  },
                });
              }
            }
          }
        }
      } else if (liveMatch.status === "LIVE" && dbMatch.status === "UPCOMING") {
        await prisma.match.update({
          where: { id: dbMatch.id },
          data: { status: "LIVE" },
        });
      }
    }

    console.log(`✓ Synced live match results from Football Data API`);
  } catch (error) {
    console.error("Error syncing live match results:", error);
  }
}
