/**
 * Imports the ISL 2026–27 schedule from goal-api, then pulls results, goal
 * scorers and matchday squads for every match already played. Safe to re-run.
 *
 *   npx tsx scripts/import-isl.ts
 */
import { prisma } from "@/lib/prisma";
import { importIslSchedule, syncIslResults } from "@/lib/sync-isl";

async function main() {
  const dbName = process.env.DATABASE_URL?.match(/mongodb\.net\/([^?]+)/)?.[1];
  console.log(`Database: ${dbName ?? "(unknown)"}`);

  const schedule = await importIslSchedule(prisma);
  console.log(`Schedule: ${schedule.matches} matches, ${schedule.teams} teams`);

  const results = await syncIslResults(prisma);
  console.log(
    `Results: checked ${results.checked}, finished ${results.finished.length}, live ${results.live}, lineups synced ${results.lineupsSynced}`
  );
  for (const m of results.finished) {
    console.log(
      `  ${m.homeTeamName} ${m.homeScore}–${m.awayScore} ${m.awayTeamName}` +
        (m.scorerNames.length ? `  (${m.scorerNames.join(", ")})` : "")
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
