import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fetchTeamSquad } from "@/lib/football-data";

const prisma = new PrismaClient();

// Stay safely under football-data.org's confirmed 10 requests/minute limit.
const DELAY_BETWEEN_REQUESTS_MS = 7000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const teams = await prisma.team.findMany({
    where: {
      externalId: { not: null, gt: 0 }, // excludes the -1 TBD placeholder team
      OR: [
        { homeMatches: { some: { round: "ROUND_OF_16" } } },
        { awayMatches: { some: { round: "ROUND_OF_16" } } },
      ],
    },
  });

  console.log(`Fetching full squads for ${teams.length} team(s)...`);

  let totalPlayersCreated = 0;
  let totalPlayersSkipped = 0;

  for (const [index, team] of teams.entries()) {
    if (!team.externalId) {
      continue;
    }

    console.log(`[${index + 1}/${teams.length}] ${team.name}...`);
    const squad = await fetchTeamSquad(team.externalId);

    for (const player of squad) {
      const existing = await prisma.player.findFirst({
        where: { teamId: team.id, name: player.name },
      });

      if (existing) {
        totalPlayersSkipped++;
        continue;
      }

      await prisma.player.create({
        data: {
          teamId: team.id,
          name: player.name,
          position: player.position,
        },
      });
      totalPlayersCreated++;
    }

    // Only sleep if we actually hit the network (cached responses are instant and don't count
    // against the rate limit), but a fixed delay is simplest and safe either way.
    if (index < teams.length - 1) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }
  }

  console.log(
    `Done. ${totalPlayersCreated} player(s) created, ${totalPlayersSkipped} already existed.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
