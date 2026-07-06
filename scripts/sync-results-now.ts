import { prisma } from "@/lib/prisma";
import { syncFinishedMatchResultsWithScorers } from "@/lib/sync-match-results";

async function main() {
  console.log("🔄 Syncing finished matches with scorers from api-football.com...");
  const result = await syncFinishedMatchResultsWithScorers(prisma);
  console.log(`✅ Checked ${result.checkedMatches} matches`);
  console.log(`📊 Updated ${result.updated.length} matches with results & scorers`);

  if (result.updated.length > 0) {
    console.log("\nMatches updated:");
    for (const m of result.updated) {
      console.log(`  • ${m.homeTeamName} vs ${m.awayTeamName} — Winner: ${m.winnerName}, Scorers: ${m.scorerNames.join(", ")}`);
    }
  }

  if (result.teamLookupFailed.length > 0) {
    console.log(`⚠️ ${result.teamLookupFailed.length} teams had lookup failures: ${result.teamLookupFailed.join(", ")}`);
  }
  if (result.tbdSkipped > 0) {
    console.log(`⏳ ${result.tbdSkipped} TBD matches skipped`);
  }
  if (result.notYetPlayed > 0) {
    console.log(`📅 ${result.notYetPlayed} matches not yet played`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Sync failed:", error);
  process.exit(1);
});
