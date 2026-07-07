import { Round, type PrismaClient } from "@prisma/client";
import { fetchCompetitionMatches, fetchLiveMatchResults, type FootballDataTeam, type FootballDataMatch } from "@/lib/football-data";

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

    for (const liveMatch of liveMatches) {
      if (!liveMatch.id || !liveMatch.score) {
        continue;
      }

      const dbMatch = await prisma.match.findUnique({
        where: { externalId: liveMatch.id },
        include: { scorers: true },
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

        await prisma.match.update({
          where: { id: dbMatch.id },
          data: {
            status: "FINISHED",
            winnerTeamId,
          },
        });

        // Clear existing scorers and add new ones from API
        await prisma.matchScorer.deleteMany({
          where: { matchId: dbMatch.id },
        });

        if (liveMatch.scorers && liveMatch.scorers.length > 0) {
          for (const scorer of liveMatch.scorers) {
            if (scorer.type === "GOAL") {
              const player = await prisma.player.findFirst({
                where: {
                  name: scorer.player.name,
                  team: {
                    externalId: scorer.team.id,
                  },
                },
                select: { id: true },
              });

              if (player) {
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
