import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncLiveMatchResults } from "@/lib/sync-matches";
import { syncFinishedMatchResultsWithScorers } from "@/lib/sync-match-results";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { type = "all" } = await request.json().catch(() => ({}));

    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      synced: [],
    };

    // Sync live match results (status updates)
    if (type === "all" || type === "live") {
      console.log("🔄 Syncing live match results...");
      await syncLiveMatchResults(
        prisma,
        process.env.FOOTBALL_DATA_COMPETITION_CODE ?? "WC"
      );
      results.synced.push("live-results");
    }

    // Sync finished match results with scorers
    if (type === "all" || type === "detailed") {
      console.log("🔄 Syncing detailed match results (winners + scorers)...");
      const syncWithScorersResult = await syncFinishedMatchResultsWithScorers(prisma);
      results.synced.push("detailed-results");
      results.detailedResults = {
        checkedMatches: syncWithScorersResult.checkedMatches,
        updated: syncWithScorersResult.updated.length,
        skipped: syncWithScorersResult.tbdSkipped,
        notYetPlayed: syncWithScorersResult.notYetPlayed,
        failedTeamLookups: syncWithScorersResult.teamLookupFailed,
      };
    }

    // Get summary stats
    const matchStats = await prisma.match.groupBy({
      by: ["status"],
      _count: true,
    });

    results.summary = {
      totalMatches: await prisma.match.count(),
      matchesByStatus: Object.fromEntries(
        matchStats.map((stat) => [stat.status, stat._count])
      ),
    };

    console.log("✅ Sync completed", results);
    return NextResponse.json(results);
  } catch (error) {
    console.error("❌ Error syncing results:", error);
    return NextResponse.json(
      {
        error: "Failed to sync results",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
