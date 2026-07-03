import { Round, type PrismaClient } from "@prisma/client";
import { fetchCompetitionMatches, type FootballDataTeam } from "@/lib/football-data";

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
