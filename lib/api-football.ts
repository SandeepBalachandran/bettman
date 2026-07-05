import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://v3.football.api-sports.io";
const CACHE_DIR = path.join(process.cwd(), ".cache", "api-football");
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 1 day — squads/photos rarely change mid-tournament

export type ApiFootballTeam = {
  id: number;
  name: string;
  code: string | null;
  logo: string;
  national: boolean;
};

// api-football's `country` field doesn't always match the common English name
// we store (e.g. our Team.name "United States" vs their country "USA").
const COUNTRY_ALIASES: Record<string, string> = {
  "United States": "USA",
};

// Youth/age-group and women's sides are also flagged `national: true`, so the
// senior men's team has to be picked out from among them (e.g. api-football
// lists "USA", "USA W", "United States U17", "United States U23", ... all
// with national: true for the "USA" country).
function isSeniorMensTeam(team: { name: string }) {
  return !/\bU-?\d{1,2}\b/i.test(team.name) && !/\bW\b/.test(team.name);
}

export type ApiFootballSquadPlayer = {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string | null;
  photo: string | null;
};

async function readCache<T>(cacheKey: string, ttlMs: number): Promise<T | null> {
  try {
    const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
    const raw = await readFile(filePath, "utf-8");
    const { cachedAt, data } = JSON.parse(raw) as { cachedAt: number; data: T };

    if (Date.now() - cachedAt > ttlMs) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

async function writeCache<T>(cacheKey: string, data: T): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  await writeFile(filePath, JSON.stringify({ cachedAt: Date.now(), data }, null, 2));
}

function getToken(): string {
  const token = process.env.NEW_FOOTBALL_API_TOKEN;
  if (!token) {
    throw new Error("NEW_FOOTBALL_API_TOKEN is not set in the environment.");
  }
  return token;
}

async function apiFootballGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { "x-apisports-key": getToken() },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `api-football request failed: ${response.status} ${response.statusText}` +
        (body ? ` — ${body.slice(0, 300)}` : "")
    );
  }

  return (await response.json()) as T;
}

/** Look up the senior men's national team for a country (used to map our Team.name to api-football's numeric team id). */
export async function searchApiFootballTeam(
  name: string,
  options: { ttlMs?: number } = {}
): Promise<ApiFootballTeam | null> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const cacheKey = `team-search-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const cached = await readCache<ApiFootballTeam | null>(cacheKey, ttlMs);
  if (cached !== null) {
    return cached;
  }

  type TeamsResponse = { response: { team: ApiFootballTeam }[] };

  const countryNames = [name, COUNTRY_ALIASES[name]].filter((n): n is string => Boolean(n));

  let team: ApiFootballTeam | null = null;
  for (const countryName of countryNames) {
    const data = await apiFootballGet<TeamsResponse>(
      `/teams?country=${encodeURIComponent(countryName)}`
    );
    const nationalTeams = data.response.map((r) => r.team).filter((t) => t.national);
    const seniorCandidates = nationalTeams.filter(isSeniorMensTeam);
    team =
      seniorCandidates.find((t) => t.code) ??
      seniorCandidates.sort((a, b) => a.name.length - b.name.length)[0] ??
      null;
    if (team) break;
  }

  // Fall back to a plain name search if the country lookup came up empty.
  if (!team) {
    const data = await apiFootballGet<TeamsResponse>(`/teams?search=${encodeURIComponent(name)}`);
    const nationalTeams = data.response.map((r) => r.team).filter((t) => t.national);
    const seniorCandidates = nationalTeams.filter(isSeniorMensTeam);
    team =
      seniorCandidates.find((t) => t.code) ??
      seniorCandidates[0] ??
      data.response[0]?.team ??
      null;
  }

  await writeCache(cacheKey, team);

  return team;
}

/** Full squad (with photo URLs) for a team, by api-football's numeric team id. */
export async function fetchApiFootballSquad(
  teamId: number,
  options: { ttlMs?: number } = {}
): Promise<ApiFootballSquadPlayer[]> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const cacheKey = `squad-${teamId}`;

  const cached = await readCache<ApiFootballSquadPlayer[]>(cacheKey, ttlMs);
  if (cached) {
    return cached;
  }

  type SquadsResponse = { response: { team: ApiFootballTeam; players: ApiFootballSquadPlayer[] }[] };
  const data = await apiFootballGet<SquadsResponse>(`/players/squads?team=${teamId}`);
  const players = data.response[0]?.players ?? [];
  await writeCache(cacheKey, players);

  return players;
}

export type ApiFootballFixture = {
  fixture: { id: number; date: string; status: { short: string } };
  teams: {
    home: { id: number; name: string; winner: boolean | null };
    away: { id: number; name: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
};

/** Statuses api-football uses for a definitively-completed match (including extra time/penalties). */
export const FINISHED_FIXTURE_STATUSES = new Set(["FT", "AET", "PEN", "AWD", "WO"]);

/** All historical fixtures between two teams — used to find the specific knockout match by date. */
export async function fetchHeadToHeadFixtures(
  teamIdA: number,
  teamIdB: number,
  options: { ttlMs?: number } = {}
): Promise<ApiFootballFixture[]> {
  // Short TTL — unlike squads/teams, results change during the tournament and
  // callers care about freshness (they're the reason this function is called).
  const ttlMs = options.ttlMs ?? 5 * 60 * 1000;
  const pairKey = [teamIdA, teamIdB].sort((a, b) => a - b).join("-");
  const cacheKey = `h2h-${pairKey}`;

  const cached = await readCache<ApiFootballFixture[]>(cacheKey, ttlMs);
  if (cached) {
    return cached;
  }

  type FixturesResponse = { response: ApiFootballFixture[] };
  const data = await apiFootballGet<FixturesResponse>(
    `/fixtures/headtohead?h2h=${teamIdA}-${teamIdB}`
  );
  await writeCache(cacheKey, data.response);

  return data.response;
}

export type ApiFootballGoalEvent = {
  team: { id: number; name: string };
  player: { id: number; name: string };
  type: string;
  detail: string;
};

/** Goal-scoring events for a specific fixture (excludes missed penalties, cards, VAR, etc.). */
export async function fetchFixtureGoalEvents(
  fixtureId: number,
  options: { ttlMs?: number } = {}
): Promise<ApiFootballGoalEvent[]> {
  const ttlMs = options.ttlMs ?? 5 * 60 * 1000;
  const cacheKey = `fixture-events-${fixtureId}`;

  const cached = await readCache<ApiFootballGoalEvent[]>(cacheKey, ttlMs);
  if (cached) {
    return cached;
  }

  type EventsResponse = { response: ApiFootballGoalEvent[] };
  const data = await apiFootballGet<EventsResponse>(`/fixtures/events?fixture=${fixtureId}`);
  const goals = data.response.filter((e) => e.type === "Goal" && e.detail !== "Missed Penalty");
  await writeCache(cacheKey, goals);

  return goals;
}
