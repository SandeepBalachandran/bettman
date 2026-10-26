import { prisma } from "@/lib/prisma";
import { calculateMatchPoints, isResultPickCorrect } from "@/lib/scoring";
import { calculateMatchMoney } from "@/lib/money";
import { moneyConfig } from "@/lib/money-config";
import { activeMatchWhere } from "@/lib/competition";

export type LeaderboardEntry = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  winnerPoints: number;
  scorerPoints: number;
  total: number;
  /** Money balance from finished matches (same figure as getUserMoney().currentBalance). */
  money: number;
  /** Finished matches this player predicted. */
  matchesPlayed: number;
  /** Finished matches where the result pick (winner or draw) was right — first prize tiebreaker. */
  correctResults: number;
  /** Goals scored by the player's scorer picks — second prize tiebreaker. */
  correctScorerGoals: number;
};

type FinishedMatchWithPredictions = {
  winnerTeamId: string | null;
  isDraw: boolean;
  wonOnPenalties: boolean;
  scorers: { playerId: string }[];
  predictions: {
    userId: string;
    winnerTeamId: string | null;
    predictedDraw: boolean;
    scorers: { playerId: string }[];
    usedPointsBooster: boolean;
  }[];
};

function computeLeaderboardEntries(
  users: { id: string; name: string; avatarUrl: string | null }[],
  finishedMatches: FinishedMatchWithPredictions[]
): LeaderboardEntry[] {
  const entries = new Map<string, LeaderboardEntry>(
    users.map((user) => [
      user.id,
      {
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        winnerPoints: 0,
        scorerPoints: 0,
        total: 0,
        money: 0,
        matchesPlayed: 0,
        correctResults: 0,
        correctScorerGoals: 0,
      },
    ])
  );

  for (const match of finishedMatches) {
    const actualScorerPlayerIds = match.scorers.map((s) => s.playerId);

    for (const prediction of match.predictions) {
      const entry = entries.get(prediction.userId);
      if (!entry) {
        continue;
      }

      const pick = {
        winnerTeamId: prediction.winnerTeamId,
        predictedDraw: prediction.predictedDraw,
        scorerPlayerIds: prediction.scorers.map((s) => s.playerId),
      };
      const outcome = { winnerTeamId: match.winnerTeamId, isDraw: match.isDraw, wonOnPenalties: match.wonOnPenalties };
      const points = calculateMatchPoints(pick, outcome, actualScorerPlayerIds, prediction.usedPointsBooster);
      const money = calculateMatchMoney(pick, outcome, actualScorerPlayerIds, moneyConfig, prediction.usedPointsBooster);

      entry.winnerPoints += points.winnerPoints;
      entry.scorerPoints += points.scorerPoints;
      entry.total += points.total;
      entry.money += money.total;
      entry.matchesPlayed += 1;
      if (isResultPickCorrect(pick, outcome)) entry.correctResults += 1;
      entry.correctScorerGoals += actualScorerPlayerIds.filter((id) => pick.scorerPlayerIds.includes(id)).length;
    }
  }

  return Array.from(entries.values()).sort((a, b) => b.total - a.total);
}

/**
 * Order a leaderboard by the season score (`money` — shown to players as points),
 * then most correct results, then most goals from scorer picks.
 */
export function rankEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort(
    (a, b) => b.money - a.money || b.correctResults - a.correctResults || b.correctScorerGoals - a.correctScorerGoals
  );
}

async function getUsersAndFinishedMatches() {
  return Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, avatarUrl: true },
    }),
    prisma.match.findMany({
      where: { status: "FINISHED", ...activeMatchWhere() },
      select: {
        winnerTeamId: true,
        isDraw: true,
        wonOnPenalties: true,
        scorers: true,
        predictions: {
          select: { userId: true, winnerTeamId: true, predictedDraw: true, scorers: true, usedPointsBooster: true }
        },
      },
      orderBy: { kickoffTime: "asc" },
    }),
  ]);
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const [users, finishedMatches] = await getUsersAndFinishedMatches();
  return computeLeaderboardEntries(users, finishedMatches);
}

/** The leaderboard as it stood before the most recently finished match — used to show rank movement. */
export async function getPreviousLeaderboard(): Promise<LeaderboardEntry[]> {
  const [users, finishedMatches] = await getUsersAndFinishedMatches();
  return computeLeaderboardEntries(users, finishedMatches.slice(0, -1));
}
