import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { searchApiFootballTeam, fetchApiFootballSquad } from "@/lib/api-football";
import { playerMatchKey } from "@/lib/player-name-match";

const prisma = new PrismaClient();

// api-football's free tier is 10 requests/min — stay well under that.
const DELAY_BETWEEN_REQUESTS_MS = 7000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const teams = await prisma.team.findMany({
    where: {
      externalId: { not: null, gt: 0 },
      OR: [
        { homeMatches: { some: { round: "ROUND_OF_16" } } },
        { awayMatches: { some: { round: "ROUND_OF_16" } } },
      ],
    },
    include: { players: true },
  });

  console.log(`Syncing player photos for ${teams.length} Round of 16 team(s)...`);

  let updated = 0;
  let unmatched = 0;

  for (const [index, team] of teams.entries()) {
    console.log(`[${index + 1}/${teams.length}] ${team.name}...`);

    const apiTeam = await searchApiFootballTeam(team.name);
    if (!apiTeam) {
      console.log(`  No api-football match for "${team.name}", skipping.`);
      continue;
    }

    await sleep(DELAY_BETWEEN_REQUESTS_MS);
    const squad = await fetchApiFootballSquad(apiTeam.id);
    const squadByKey = new Map<string, (typeof squad)[number]>();
    for (const p of squad) {
      const key = playerMatchKey(p.name);
      if (key) squadByKey.set(key, p);
    }

    for (const player of team.players) {
      const key = playerMatchKey(player.name);
      const match = key ? squadByKey.get(key) : undefined;
      if (!match || !match.photo) {
        unmatched++;
        continue;
      }

      await prisma.player.update({
        where: { id: player.id },
        data: { photoUrl: match.photo },
      });
      updated++;
    }

    if (index < teams.length - 1) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }
  }

  console.log(`Done. ${updated} player photo(s) updated, ${unmatched} unmatched.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
