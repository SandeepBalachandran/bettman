import type { PrismaClient } from "@prisma/client";
import { fetchCompetitionMatches } from "@/lib/football-data";
import {
  searchApiFootballTeam,
  fetchHeadToHeadFixtures,
  fetchFixtureGoalEvents,
  FINISHED_FIXTURE_STATUSES,
  type ApiFootballFixture,
} from "@/lib/api-football";
import { playerMatchKey } from "@/lib/player-name-match";

export type SyncedResult = {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  winnerName: string;
};

export type SyncMatchResultsResult = {
  checkedFinished: number;
  updated: SyncedResult[];
  alreadyFinished: number;
  unresolved: number;
};

/**
 * Auto-finishes matches the live API already reports as FINISHED, setting
 * status + winnerTeamId (so leaderboard/money unblock immediately) without
 * needing an admin to enter it by hand. Goal scorers still need manual entry
 * afterward — football-data.org's free tier doesn't expose player-level goal
 * events — but the winner-based portion of scoring/money works right away.
 * Safe to re-run: already-finished matches on our side are left untouched.
 */
export async function syncFinishedMatchResults(
  prisma: PrismaClient,
  competitionCode = "WC"
): Promise<SyncMatchResultsResult> {
  // Bypass the disk cache here — an admin triggering this wants the current
  // result, not a possibly-stale one from earlier today.
  const apiMatches = await fetchCompetitionMatches(competitionCode, { ttlMs: 0 });
  const finishedApiMatches = apiMatches.filter((m) => m.status === "FINISHED");

  const updated: SyncedResult[] = [];
  let alreadyFinished = 0;
  let unresolved = 0;

  for (const apiMatch of finishedApiMatches) {
    const match = await prisma.match.findUnique({
      where: { externalId: apiMatch.id },
      include: { homeTeam: true, awayTeam: true },
    });

    if (!match) {
      continue;
    }

    if (match.status === "FINISHED") {
      alreadyFinished++;
      continue;
    }

    const winnerTeamId =
      apiMatch.score.winner === "HOME_TEAM"
        ? match.homeTeamId
        : apiMatch.score.winner === "AWAY_TEAM"
          ? match.awayTeamId
          : null;

    if (!winnerTeamId) {
      // Draw or unresolved score — shouldn't happen for a knockout match, but
      // leave it for an admin to resolve by hand rather than guess.
      unresolved++;
      continue;
    }

    await prisma.match.update({
      where: { id: match.id },
      data: { status: "FINISHED", winnerTeamId, locked: true },
    });

    updated.push({
      matchId: match.id,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      winnerName: winnerTeamId === match.homeTeamId ? match.homeTeam.name : match.awayTeam.name,
    });
  }

  return {
    checkedFinished: finishedApiMatches.length,
    updated,
    alreadyFinished,
    unresolved,
  };
}

export type SyncedResultWithScorers = SyncedResult & {
  scorerNames: string[];
  unmatchedScorerNames: string[];
};

export type SyncMatchResultsWithScorersResult = {
  checkedMatches: number;
  updated: SyncedResultWithScorers[];
  tbdSkipped: number;
  notYetPlayed: number;
  teamLookupFailed: string[];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_FIXTURE_DATE_DRIFT_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

function pickFixture(
  fixtures: ApiFootballFixture[],
  kickoffTime: Date,
  apiHomeId: number,
  apiAwayId: number
): ApiFootballFixture | null {
  const candidates = fixtures.filter(
    (f) =>
      FINISHED_FIXTURE_STATUSES.has(f.fixture.status.short) &&
      (f.teams.home.id === apiHomeId || f.teams.home.id === apiAwayId) &&
      (f.teams.away.id === apiHomeId || f.teams.away.id === apiAwayId) &&
      Math.abs(new Date(f.fixture.date).getTime() - kickoffTime.getTime()) < MAX_FIXTURE_DATE_DRIFT_MS
  );

  if (candidates.length === 0) return null;

  return candidates.sort(
    (a, b) =>
      Math.abs(new Date(a.fixture.date).getTime() - kickoffTime.getTime()) -
      Math.abs(new Date(b.fixture.date).getTime() - kickoffTime.getTime())
  )[0];
}

function resolveWinnerTeamId(
  fixture: ApiFootballFixture,
  apiHomeId: number,
  ourHomeTeamId: string,
  ourAwayTeamId: string
): string | null {
  const homeIsOurHome = fixture.teams.home.id === apiHomeId;
  const ourHomeSide = homeIsOurHome ? fixture.teams.home : fixture.teams.away;
  const ourAwaySide = homeIsOurHome ? fixture.teams.away : fixture.teams.home;

  if (ourHomeSide.winner) return ourHomeTeamId;
  if (ourAwaySide.winner) return ourAwayTeamId;

  // Fall back to comparing goals directly (winner flags are occasionally null
  // for a walkover/awarded result even though the score itself is conclusive).
  const ourHomeGoals = homeIsOurHome ? fixture.goals.home : fixture.goals.away;
  const ourAwayGoals = homeIsOurHome ? fixture.goals.away : fixture.goals.home;
  if (ourHomeGoals != null && ourAwayGoals != null) {
    if (ourHomeGoals > ourAwayGoals) return ourHomeTeamId;
    if (ourAwayGoals > ourHomeGoals) return ourAwayTeamId;
  }

  return null;
}

/**
 * Fuller version of syncFinishedMatchResults using api-football.com v3 instead
 * of football-data.org — this provider exposes per-player goal events, so it
 * can auto-populate MatchScorer rows too, not just the winner. Both winner-
 * and scorer-based scoring/money become fully automatic once results land.
 *
 * Slower than the football-data.org version (a head-to-head + events lookup
 * per match, plus a small delay to respect api-football's free-tier rate
 * limit) — fine for an admin-triggered action given how few matches finish
 * at once, but intended to also be runnable as a one-off script.
 */
export async function syncFinishedMatchResultsWithScorers(
  prisma: PrismaClient
): Promise<SyncMatchResultsWithScorersResult> {
  // Also re-check matches we already marked FINISHED but with no scorers on
  // file yet — e.g. ones the winner-only football-data.org sync finished
  // before this scorer-aware sync existed.
  const matches = await prisma.match.findMany({
    where: { OR: [{ status: { not: "FINISHED" } }, { scorers: { none: {} } }] },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
      scorers: true,
    },
  });

  const playableMatches = matches.filter(
    (m) => m.homeTeam.fifaCode !== "TBD" && m.awayTeam.fifaCode !== "TBD"
  );

  const updated: SyncedResultWithScorers[] = [];
  const teamLookupFailed = new Set<string>();
  const tbdSkipped = matches.length - playableMatches.length;
  let notYetPlayed = 0;

  for (const [index, match] of playableMatches.entries()) {
    const [apiHomeTeam, apiAwayTeam] = await Promise.all([
      searchApiFootballTeam(match.homeTeam.name),
      searchApiFootballTeam(match.awayTeam.name),
    ]);

    if (!apiHomeTeam) teamLookupFailed.add(match.homeTeam.name);
    if (!apiAwayTeam) teamLookupFailed.add(match.awayTeam.name);
    if (!apiHomeTeam || !apiAwayTeam) {
      continue;
    }

    const fixtures = await fetchHeadToHeadFixtures(apiHomeTeam.id, apiAwayTeam.id);
    const fixture = pickFixture(fixtures, match.kickoffTime, apiHomeTeam.id, apiAwayTeam.id);

    if (!fixture) {
      notYetPlayed++;
      if (index < playableMatches.length - 1) await sleep(1200);
      continue;
    }

    const winnerTeamId = resolveWinnerTeamId(
      fixture,
      apiHomeTeam.id,
      match.homeTeamId,
      match.awayTeamId
    );

    if (!winnerTeamId) {
      notYetPlayed++;
      if (index < playableMatches.length - 1) await sleep(1200);
      continue;
    }

    const goalEvents = await fetchFixtureGoalEvents(fixture.fixture.id);

    const rosterByKey = new Map<string, { id: string; name: string }>();
    for (const p of [...match.homeTeam.players, ...match.awayTeam.players]) {
      const key = playerMatchKey(p.name);
      if (key) rosterByKey.set(key, p);
    }

    const scorerIds = new Set<string>();
    const scorerNames = new Set<string>();
    const unmatchedScorerNames = new Set<string>();

    for (const event of goalEvents) {
      const key = playerMatchKey(event.player.name);
      const player = key ? rosterByKey.get(key) : undefined;
      if (player) {
        scorerIds.add(player.id);
        scorerNames.add(player.name);
      } else {
        unmatchedScorerNames.add(event.player.name);
      }
    }

    const wonOnPenalties = fixture.fixture.status.short === "PEN";

    await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: match.id },
        data: { status: "FINISHED", winnerTeamId, wonOnPenalties, locked: true },
      });
      await tx.matchScorer.deleteMany({ where: { matchId: match.id } });
      if (scorerIds.size > 0) {
        await tx.matchScorer.createMany({
          data: [...scorerIds].map((playerId) => ({ matchId: match.id, playerId })),
        });
      }
    });

    updated.push({
      matchId: match.id,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      winnerName:
        winnerTeamId === match.homeTeamId ? match.homeTeam.name : match.awayTeam.name,
      scorerNames: [...scorerNames],
      unmatchedScorerNames: [...unmatchedScorerNames],
    });

    if (index < playableMatches.length - 1) {
      await sleep(1200);
    }
  }

  return {
    checkedMatches: playableMatches.length,
    updated,
    tbdSkipped,
    notYetPlayed,
    teamLookupFailed: [...teamLookupFailed],
  };
}
