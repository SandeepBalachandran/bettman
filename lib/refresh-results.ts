import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveCompetition } from "@/lib/competition";
import { syncIslResults, type FinishedIslMatch, type SyncIslResultsResult } from "@/lib/sync-isl";
import { sendPushToAll } from "@/lib/push";

// goal-api allows 1000 requests/day; a sync costs ~1 call per match in
// progress, so refreshing at most every 2 minutes stays far below that even on
// a double-header matchday.
const MIN_INTERVAL_MS = 2 * 60 * 1000;

let lastRunAt = 0;
let inFlight: Promise<SyncIslResultsResult | null> | null = null;

export function finishedMatchPushBody(match: FinishedIslMatch): string {
  const outcome = match.winnerName ? `${match.winnerName} won` : "it's a draw";
  const scorers = match.scorerNames.length > 0 ? ` Scorers: ${match.scorerNames.join(", ")}.` : "";
  return `${match.homeTeamName} ${match.homeScore}–${match.awayScore} ${match.awayTeamName} — ${outcome}.${scorers} See how your picks did.`;
}

export async function notifyFinishedMatches(finished: FinishedIslMatch[]): Promise<void> {
  for (const match of finished) {
    await sendPushToAll({
      title: "Match finished!",
      body: finishedMatchPushBody(match),
      url: `/match/${match.matchId}`,
    }).catch((error) => console.error("Failed to send match-finished push:", error));
  }
}

/**
 * Pulls live scores / final results for the active competition straight from
 * the provider whenever a page that shows them is opened — no cron needed.
 * Runs after the response is sent (provider + DB round-trips take seconds), so
 * the page renders what's in the database now and the next load shows the
 * update. Throttled per server instance; never throws.
 */
export function refreshActiveCompetitionResults(): void {
  if (!getActiveCompetition().goalApi || !process.env.GOAL_API_KEY) return;
  if (inFlight || Date.now() - lastRunAt < MIN_INTERVAL_MS) return;
  lastRunAt = Date.now();
  after(runRefresh);
}

async function runRefresh(): Promise<void> {
  if (inFlight) return;

  inFlight = syncIslResults(prisma)
    .then(async (result) => {
      await notifyFinishedMatches(result.finished);
      return result;
    })
    .catch((error) => {
      console.error("Failed to refresh ISL results:", error);
      return null;
    })
    .finally(() => {
      inFlight = null;
    });
  await inFlight;
}
