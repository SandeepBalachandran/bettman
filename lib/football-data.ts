import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://api.football-data.org/v4";
const CACHE_DIR = path.join(process.cwd(), ".cache", "football-data");
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

export type FootballDataTeam = {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
};

export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  };
};

type CompetitionMatchesResponse = {
  matches: FootballDataMatch[];
};

export type FootballDataSquadPlayer = {
  id: number;
  name: string;
  position: string | null;
};

type TeamResponse = {
  id: number;
  name: string;
  squad: FootballDataSquadPlayer[];
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

export async function fetchCompetitionMatches(
  competitionCode: string,
  options: { ttlMs?: number } = {}
): Promise<FootballDataMatch[]> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const cacheKey = `${competitionCode}-matches`;

  const cached = await readCache<CompetitionMatchesResponse>(cacheKey, ttlMs);
  if (cached) {
    return cached.matches;
  }

  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) {
    throw new Error("FOOTBALL_DATA_API_TOKEN is not set in the environment.");
  }

  const response = await fetch(`${BASE_URL}/competitions/${competitionCode}/matches`, {
    headers: { "X-Auth-Token": token },
  });

  if (!response.ok) {
    throw new Error(
      `football-data.org request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as CompetitionMatchesResponse;
  await writeCache(cacheKey, data);

  return data.matches;
}

/**
 * Live lookup for the schedule page. Unlike fetchCompetitionMatches (which is
 * for the offline sync script and uses an on-disk cache), this relies on
 * Next.js's fetch data cache so repeated page loads within the revalidate
 * window don't re-hit the football-data.org API.
 */
export async function fetchLiveCompetitionMatches(
  competitionCode: string,
  options: { revalidateSeconds?: number } = {}
): Promise<FootballDataMatch[]> {
  const revalidate = options.revalidateSeconds ?? 60;

  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) {
    throw new Error("FOOTBALL_DATA_API_TOKEN is not set in the environment.");
  }

  const response = await fetch(`${BASE_URL}/competitions/${competitionCode}/matches`, {
    headers: { "X-Auth-Token": token },
    next: { revalidate, tags: [`live-matches-${competitionCode}`] },
  });

  if (!response.ok) {
    throw new Error(
      `football-data.org request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as CompetitionMatchesResponse;
  return data.matches;
}

export async function fetchTeamSquad(
  teamExternalId: number,
  options: { ttlMs?: number } = {}
): Promise<FootballDataSquadPlayer[]> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const cacheKey = `team-${teamExternalId}`;

  const cached = await readCache<TeamResponse>(cacheKey, ttlMs);
  if (cached) {
    return cached.squad;
  }

  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) {
    throw new Error("FOOTBALL_DATA_API_TOKEN is not set in the environment.");
  }

  const response = await fetch(`${BASE_URL}/teams/${teamExternalId}`, {
    headers: { "X-Auth-Token": token },
  });

  if (!response.ok) {
    throw new Error(
      `football-data.org request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as TeamResponse;
  await writeCache(cacheKey, data);

  return data.squad ?? [];
}
