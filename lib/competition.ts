/** Sent as a prediction's `winnerTeamId` (and the admin result) to mean "draw". */
export const DRAW_PICK = "DRAW";

export type CompetitionCode = "WC" | "ISL-2026";

export type Competition = {
  code: CompetitionCode;
  name: string;
  shortName: string;
  /** League matches can be drawn; knockout tournaments always produce a winner. */
  allowsDraws: boolean;
  goalApi?: { leagueId: string; season: string };
};

export const COMPETITIONS: Record<CompetitionCode, Competition> = {
  WC: {
    code: "WC",
    name: "FIFA World Cup 2026",
    shortName: "World Cup",
    allowsDraws: false,
  },
  "ISL-2026": {
    code: "ISL-2026",
    name: "Indian Super League 2026–27",
    shortName: "ISL",
    allowsDraws: true,
    goalApi: { leagueId: "cmr77dvry008arx06q35z3h2m", season: "2026/2027" },
  },
};

const DEFAULT_COMPETITION: CompetitionCode = "ISL-2026";

/**
 * The one competition the app currently shows. Every other competition's
 * matches, predictions and results stay in the database untouched — set
 * ACTIVE_COMPETITION=WC to bring the World Cup back.
 */
export function getActiveCompetition(): Competition {
  const code = process.env.ACTIVE_COMPETITION as CompetitionCode | undefined;
  return COMPETITIONS[code && code in COMPETITIONS ? code : DEFAULT_COMPETITION];
}

/** Prisma `where` fragment scoping a Match query to the active competition. */
export function activeMatchWhere() {
  return { competition: getActiveCompetition().code };
}
