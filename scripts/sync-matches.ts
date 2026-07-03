import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { syncMatchesFromLiveApi } from "@/lib/sync-matches";

const prisma = new PrismaClient();

async function main() {
  const competitionCode = process.argv[2] ?? "WC";

  const result = await syncMatchesFromLiveApi(prisma, competitionCode);

  console.log(
    `Fetched ${result.totalFetched} total matches, ${result.determinedCount + result.placeholderCount} knockout matches for round mapping.`
  );
  console.log(
    `Synced ${result.determinedCount} match(es) with confirmed teams, ${result.placeholderCount} placeholder ("TBD") match(es) awaiting earlier-round results.`
  );
  console.log(
    "Re-run this script again once more results are in — it's safe to re-run any time (upserts by football-data.org's match id), and will automatically replace TBD placeholders with real teams as they become known."
  );
  console.log(`Sync complete. Match collection now has ${result.totalMatches} documents.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
