import "dotenv/config";
import { PrismaClient, Round } from "@prisma/client";
import { fetchCompetitionMatches, type FootballDataTeam } from "@/lib/football-data";

const prisma = new PrismaClient();

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

async function upsertTeam(team: FootballDataTeam) {
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

async function getOrCreateTbdTeam() {
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

async function main() {
  const competitionCode = process.argv[2] ?? "WC";

  const matches = await fetchCompetitionMatches(competitionCode);
  const knockoutMatches = matches.filter((match) => match.stage in STAGE_TO_ROUND);

  console.log(
    `Fetched ${matches.length} total matches, ${knockoutMatches.length} knockout matches for round mapping.`
  );

  const tbdTeam = await getOrCreateTbdTeam();
  let determinedCount = 0;
  let placeholderCount = 0;

  for (const match of knockoutMatches) {
    const round = STAGE_TO_ROUND[match.stage];
    const isDetermined = Boolean(match.homeTeam?.id && match.awayTeam?.id);

    const homeTeam = isDetermined ? await upsertTeam(match.homeTeam) : tbdTeam;
    const awayTeam = isDetermined ? await upsertTeam(match.awayTeam) : tbdTeam;

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

  console.log(
    `Synced ${determinedCount} match(es) with confirmed teams, ${placeholderCount} placeholder ("TBD") match(es) awaiting earlier-round results.`
  );
  console.log(
    "Re-run this script again once more results are in — it's safe to re-run any time (upserts by football-data.org's match id), and will automatically replace TBD placeholders with real teams as they become known."
  );

  const total = await prisma.match.count();
  console.log(`Sync complete. Match collection now has ${total} documents.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
