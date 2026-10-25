import { Round, type PrismaClient } from "@prisma/client";
import { COMPETITIONS } from "@/lib/competition";
import {
  fetchLeagueFixtures,
  fetchLeagueTeams,
  fetchFixture,
  fetchFixtureGoals,
  fetchFixtureLineups,
  lineupPlayers,
  parseScore,
  isOwnGoal,
  GOAL_API_FINISHED_STATUSES,
  GOAL_API_LIVE_STATUSES,
  type GoalApiFixture,
  type GoalApiLineupPlayer,
} from "@/lib/goal-api";

const ISL = COMPETITIONS["ISL-2026"];
const { leagueId, season } = ISL.goalApi!;

// Team.externalId / Match.externalId have (non-sparse) unique indexes and
// already hold football-data.org ids for the World Cup rows. goal-api ids are
// shifted into their own range so the two providers can never collide.
const GOAL_API_EXTERNAL_ID_OFFSET = 1_000_000_000;

export function goalApiExternalId(apiId: string): number {
  return GOAL_API_EXTERNAL_ID_OFFSET + Number(apiId);
}

/** Monday 00:00 UTC of the week containing `date`. */
function startOfUtcWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  return d.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000;
}

/** "Kerala Blasters" → "KB", "Goa" → "GOA" — only used as a compact label. */
function teamCode(name: string): string {
  const words = name.replace(/\bFC\b/g, "").trim().split(/\s+/);
  return (words.length > 1 ? words.map((w) => w[0]).join("") : words[0].slice(0, 3)).toUpperCase();
}

function positionLabel(position: string | null): string | null {
  if (!position) return null;
  return position.replace(/s$/, "");
}

export type ImportIslScheduleResult = {
  teams: number;
  matches: number;
};

/**
 * Upserts the ISL 2026–27 schedule (teams + all league matches) from goal-api.
 * Only touches schedule fields — results are left to syncIslResults — so it's
 * safe to re-run whenever kickoff times move.
 */
export async function importIslSchedule(prisma: PrismaClient): Promise<ImportIslScheduleResult> {
  const fixtures = (await fetchLeagueFixtures(leagueId)).filter((f) => f.leagueYear === season);
  if (fixtures.length === 0) {
    throw new Error(`goal-api returned no ISL fixtures for season ${season}.`);
  }

  const teamsByGoalApiId = new Map<string, { name: string; badge: string | null; apiId: string }>();
  const teamApiIds = await fetchTeamApiIds(fixtures);
  for (const f of fixtures) {
    teamsByGoalApiId.set(f.homeTeamId, {
      name: f.homeTeamName,
      badge: f.teamHomeBadge,
      apiId: teamApiIds.get(f.homeTeamId)!,
    });
    teamsByGoalApiId.set(f.awayTeamId, {
      name: f.awayTeamName,
      badge: f.teamAwayBadge,
      apiId: teamApiIds.get(f.awayTeamId)!,
    });
  }

  const teamIdByGoalApiId = new Map<string, string>();
  for (const [goalApiId, team] of teamsByGoalApiId) {
    const data = {
      name: team.name,
      shortName: team.name,
      fifaCode: teamCode(team.name),
      flag: team.badge,
      goalApiId,
    };
    const row = await prisma.team.upsert({
      where: { externalId: goalApiExternalId(team.apiId) },
      update: data,
      create: { externalId: goalApiExternalId(team.apiId), ...data },
    });
    teamIdByGoalApiId.set(goalApiId, row.id);
  }

  // Matchweek N = the Nth calendar week (Mon–Sun, UTC) that has ISL matches,
  // so international breaks don't leave gaps in the numbering.
  const weekStarts = [...new Set(fixtures.map((f) => startOfUtcWeek(new Date(f.kickoffUtc))))].sort(
    (a, b) => a - b
  );

  for (const f of fixtures) {
    const kickoffTime = new Date(f.kickoffUtc);
    const schedule = {
      round: Round.REGULAR_SEASON,
      competition: ISL.code,
      matchweek: weekStarts.indexOf(startOfUtcWeek(kickoffTime)) + 1,
      homeTeamId: teamIdByGoalApiId.get(f.homeTeamId)!,
      awayTeamId: teamIdByGoalApiId.get(f.awayTeamId)!,
      kickoffTime,
      goalApiId: f.id,
    };
    await prisma.match.upsert({
      where: { externalId: goalApiExternalId(f.apiId) },
      update: schedule,
      create: { externalId: goalApiExternalId(f.apiId), ...schedule },
    });
  }

  return { teams: teamsByGoalApiId.size, matches: fixtures.length };
}

/** Fixture rows only carry goal-api's cuid team ids; the numeric apiId lives on the team itself. */
async function fetchTeamApiIds(fixtures: GoalApiFixture[]): Promise<Map<string, string>> {
  const apiIdByTeamId = new Map((await fetchLeagueTeams(leagueId)).map((t) => [t.id, t.apiId]));
  for (const f of fixtures) {
    for (const id of [f.homeTeamId, f.awayTeamId]) {
      if (!apiIdByTeamId.has(id)) {
        throw new Error(`goal-api team ${id} (from fixture ${f.id}) isn't listed among the league's teams.`);
      }
    }
  }
  return apiIdByTeamId;
}

/**
 * Adds/updates players from a match's lineups (starting XI + bench). goal-api's
 * squad lists are stale, so lineups are the reliable source of who's actually
 * in each team's matchday squad this season.
 */
async function upsertLineupPlayers(
  prisma: PrismaClient,
  teamId: string,
  players: GoalApiLineupPlayer[]
): Promise<void> {
  if (players.length === 0) return;

  // One read per team, then only write what's new or changed — this runs while
  // a page is rendering, so per-player round-trips to the database add up fast.
  const existing = new Map(
    (
      await prisma.player.findMany({
        where: { teamId, externalKey: { in: players.map((p) => p.playerKey) } },
        select: { id: true, externalKey: true, name: true, jerseyNumber: true, position: true, photoUrl: true },
      })
    ).map((p) => [p.externalKey!, p])
  );

  const toCreate = [];
  for (const p of players) {
    const data = {
      name: p.lineupPlayer,
      jerseyNumber: p.lineupNumber ? Number(p.lineupNumber) || null : null,
      position: positionLabel(p.playerPosition),
      // Keep a known photo when a later lineup omits it.
      photoUrl: p.playerImage ?? existing.get(p.playerKey)?.photoUrl ?? null,
    };
    const current = existing.get(p.playerKey);
    if (!current) {
      toCreate.push({ teamId, externalKey: p.playerKey, ...data });
    } else if (
      current.name !== data.name ||
      current.jerseyNumber !== data.jerseyNumber ||
      current.position !== data.position ||
      current.photoUrl !== data.photoUrl
    ) {
      await prisma.player.update({ where: { id: current.id }, data });
    }
  }
  if (toCreate.length > 0) {
    await prisma.player.createMany({ data: toCreate });
  }
}

type IslMatch = Awaited<ReturnType<typeof loadUnfinishedIslMatches>>[number];

function loadUnfinishedIslMatches(prisma: PrismaClient, kickoffBefore: Date) {
  return prisma.match.findMany({
    where: {
      competition: ISL.code,
      status: { not: "FINISHED" },
      goalApiId: { not: null },
      kickoffTime: { lte: kickoffBefore },
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffTime: "asc" },
  });
}

async function syncLineups(prisma: PrismaClient, match: IslMatch): Promise<boolean> {
  const lineups = await fetchFixtureLineups(match.goalApiId!);
  const home = lineupPlayers(lineups?.home);
  const away = lineupPlayers(lineups?.away);
  if (home.length === 0 && away.length === 0) return false;
  await upsertLineupPlayers(prisma, match.homeTeamId, home);
  await upsertLineupPlayers(prisma, match.awayTeamId, away);
  return true;
}

export type FinishedIslMatch = {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  winnerName: string | null;
  scorerNames: string[];
};

async function finishMatch(
  prisma: PrismaClient,
  match: IslMatch,
  fixture: GoalApiFixture
): Promise<FinishedIslMatch | null> {
  const homeScore = parseScore(fixture.homeTeamScore);
  const awayScore = parseScore(fixture.awayTeamScore);
  if (homeScore === null || awayScore === null) return null;

  // Make sure every scorer exists as a Player before mapping goals to them.
  await syncLineups(prisma, match);
  const goals = await fetchFixtureGoals(match.goalApiId!);

  const scorerPlayerIds: string[] = [];
  const scorerNames: string[] = [];
  for (const goal of goals) {
    const isHome = Boolean(goal.homeScorerId || goal.homeScorer);
    const name = isHome ? goal.homeScorer : goal.awayScorer;
    const key = isHome ? goal.homeScorerId : goal.awayScorerId;
    // An own goal counts for the other side but isn't credited to anyone's scorer pick.
    if (!name || !key || isOwnGoal(name)) continue;

    const teamId = isHome ? match.homeTeamId : match.awayTeamId;
    const player =
      (await prisma.player.findFirst({ where: { teamId, externalKey: key }, select: { id: true } })) ??
      (await prisma.player.create({ data: { teamId, externalKey: key, name }, select: { id: true } }));
    // One row per goal: scoring awards points/money per goal scored.
    scorerPlayerIds.push(player.id);
    scorerNames.push(name);
  }

  const isDraw = homeScore === awayScore;
  const winnerTeamId = isDraw ? null : homeScore > awayScore ? match.homeTeamId : match.awayTeamId;

  const claimed = await prisma.$transaction(async (tx) => {
    // Guard against two concurrent syncs both finishing (and notifying) the same match.
    const { count } = await tx.match.updateMany({
      where: { id: match.id, status: { not: "FINISHED" } },
      data: { status: "FINISHED", winnerTeamId, isDraw, homeScore, awayScore, locked: true },
    });
    if (count === 0) return false;
    await tx.matchScorer.deleteMany({ where: { matchId: match.id } });
    if (scorerPlayerIds.length > 0) {
      await tx.matchScorer.createMany({
        data: scorerPlayerIds.map((playerId) => ({ matchId: match.id, playerId })),
      });
    }
    return true;
  }, { timeout: 20_000 });
  if (!claimed) return null;

  return {
    matchId: match.id,
    homeTeamName: match.homeTeam.name,
    awayTeamName: match.awayTeam.name,
    homeScore,
    awayScore,
    winnerName: isDraw ? null : winnerTeamId === match.homeTeamId ? match.homeTeam.name : match.awayTeam.name,
    scorerNames: [...new Set(scorerNames)],
  };
}

export type SyncIslResultsResult = {
  checked: number;
  finished: FinishedIslMatch[];
  live: number;
  lineupsSynced: number;
};

// Lineups are usually published about an hour before kickoff; picks lock 30 min before.
const LINEUP_LOOKAHEAD_MS = 75 * 60 * 1000;

/**
 * Brings every ISL match that has kicked off (or is about to) up to date:
 * live score/status, final result + goal scorers once finished, and newly
 * named players from published lineups. Only touches matches that need it,
 * so with nothing in progress it makes no API calls at all.
 */
export async function syncIslResults(prisma: PrismaClient): Promise<SyncIslResultsResult> {
  const now = Date.now();
  const matches = await loadUnfinishedIslMatches(prisma, new Date(now + LINEUP_LOOKAHEAD_MS));

  const result: SyncIslResultsResult = { checked: matches.length, finished: [], live: 0, lineupsSynced: 0 };

  for (const match of matches) {
    if (match.kickoffTime.getTime() > now) {
      if (await syncLineups(prisma, match)) result.lineupsSynced++;
      continue;
    }

    const fixture = await fetchFixture(match.goalApiId!);

    if (GOAL_API_FINISHED_STATUSES.has(fixture.matchStatus)) {
      const finished = await finishMatch(prisma, match, fixture);
      if (finished) result.finished.push(finished);
    } else if (GOAL_API_LIVE_STATUSES.has(fixture.matchStatus)) {
      await prisma.match.update({
        where: { id: match.id },
        data: {
          status: "LIVE",
          homeScore: parseScore(fixture.homeTeamScore),
          awayScore: parseScore(fixture.awayTeamScore),
        },
      });
      result.live++;
    } else if (fixture.kickoffUtc && new Date(fixture.kickoffUtc).getTime() !== match.kickoffTime.getTime()) {
      // Postponed/rescheduled — follow the new kickoff so locking stays right.
      await prisma.match.update({
        where: { id: match.id },
        data: { kickoffTime: new Date(fixture.kickoffUtc) },
      });
    }
  }

  return result;
}
