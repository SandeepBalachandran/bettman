const BASE_URL = "https://api.goal-api.com/v1";

export type GoalApiFixture = {
  id: string;
  apiId: string;
  leagueYear: string;
  kickoffUtc: string;
  /** SCHEDULED, LIVE, HALF_TIME, FINISHED, AFTER_ET, AFTER_PEN, POSTPONED, ... */
  matchStatus: string;
  matchMinute: string | null;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamScore: number | string | null;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamScore: number | string | null;
  teamHomeBadge: string | null;
  teamAwayBadge: string | null;
  stageName: string | null;
};

export type GoalApiGoalEvent = {
  type: string;
  time: string;
  homeScorer: string | null;
  homeScorerId: string | null;
  awayScorer: string | null;
  awayScorerId: string | null;
};

export type GoalApiLineupPlayer = {
  playerKey: string;
  lineupPlayer: string;
  lineupNumber: string | null;
  playerImage: string | null;
  playerPosition: string | null;
};

type GoalApiLineupSide = {
  startingLineups?: GoalApiLineupPlayer[];
  substitutes?: GoalApiLineupPlayer[];
};

export type GoalApiLineups = { home?: GoalApiLineupSide; away?: GoalApiLineupSide };

export type GoalApiTeam = {
  id: string;
  apiId: string;
  name: string;
  badge: string | null;
};

/** Statuses meaning the match is over and the score is final. */
export const GOAL_API_FINISHED_STATUSES = new Set(["FINISHED", "AFTER_ET", "AFTER_PEN"]);
/** Statuses meaning the match is underway. */
export const GOAL_API_LIVE_STATUSES = new Set(["LIVE", "HALF_TIME", "EXTRA_TIME", "PENALTIES", "BREAK"]);

function getToken(): string {
  const token = process.env.GOAL_API_KEY?.trim();
  if (!token) {
    throw new Error("GOAL_API_KEY is not set in the environment.");
  }
  return token;
}

async function goalApiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
    // Results/live scores must always be fresh; callers decide how often to call.
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `goal-api request failed: ${response.status} ${response.statusText}` +
        (body ? ` — ${body.slice(0, 300)}` : "")
    );
  }

  return (await response.json()) as T;
}

/** Every fixture of a league (all seasons, paginated 50 at a time by the API). */
export async function fetchLeagueFixtures(leagueId: string): Promise<GoalApiFixture[]> {
  const fixtures: GoalApiFixture[] = [];
  for (let offset = 0; ; offset += 50) {
    const page = await goalApiGet<{
      data: GoalApiFixture[];
      pagination?: { hasMore?: boolean };
    }>(`/leagues/${leagueId}/fixtures?offset=${offset}`);
    fixtures.push(...page.data);
    if (!page.pagination?.hasMore || page.data.length === 0) break;
  }
  return fixtures;
}

/** Every team that has played in the league across seasons (can repeat a team once per season). */
export async function fetchLeagueTeams(leagueId: string): Promise<GoalApiTeam[]> {
  const { data } = await goalApiGet<{ data: GoalApiTeam[] }>(`/leagues/${leagueId}/teams`);
  return data;
}

export async function fetchFixture(fixtureId: string): Promise<GoalApiFixture> {
  const { data } = await goalApiGet<{ data: GoalApiFixture }>(`/fixtures/${fixtureId}`);
  return data;
}

export async function fetchFixtureGoals(fixtureId: string): Promise<GoalApiGoalEvent[]> {
  const { data } = await goalApiGet<{ data: GoalApiGoalEvent[] }>(`/fixtures/${fixtureId}/events`);
  return data.filter((e) => e.type === "GOAL");
}

/** Null until the lineups are published (roughly an hour before kickoff). */
export async function fetchFixtureLineups(fixtureId: string): Promise<GoalApiLineups | null> {
  const { data } = await goalApiGet<{ data: GoalApiLineups | null }>(`/fixtures/${fixtureId}/lineups`);
  return data;
}

export function lineupPlayers(side: GoalApiLineupSide | undefined): GoalApiLineupPlayer[] {
  return [...(side?.startingLineups ?? []), ...(side?.substitutes ?? [])].filter(
    (p) => p.playerKey && p.lineupPlayer
  );
}

/** Scores come back as strings or numbers depending on the endpoint. */
export function parseScore(score: number | string | null | undefined): number | null {
  if (score === null || score === undefined || score === "") return null;
  const n = Number(score);
  return Number.isFinite(n) ? n : null;
}

export function isOwnGoal(scorerName: string | null): boolean {
  return Boolean(scorerName && /\(o\.?g\.?\)/i.test(scorerName));
}
