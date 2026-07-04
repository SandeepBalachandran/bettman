import { prisma } from "@/lib/prisma";
import { calculateMatchPoints } from "@/lib/scoring";

export type LeaderboardEntry = {
  userId: string;
  name: string;
  winnerPoints: number;
  scorerPoints: number;
  total: number;
};

type FinishedMatchWithPredictions = {
  winnerTeamId: string | null;
  scorers: { playerId: string }[];
  predictions: {
    userId: string;
    winnerTeamId: string;
    scorers: { playerId: string }[];
  }[];
};

function computeLeaderboardEntries(
  users: { id: string; name: string }[],
  finishedMatches: FinishedMatchWithPredictions[]
): LeaderboardEntry[] {
  const entries = new Map<string, LeaderboardEntry>(
    users.map((user) => [
      user.id,
      { userId: user.id, name: user.name, winnerPoints: 0, scorerPoints: 0, total: 0 },
    ])
  );

  for (const match of finishedMatches) {
    const actualScorerPlayerIds = match.scorers.map((s) => s.playerId);

    for (const prediction of match.predictions) {
      const entry = entries.get(prediction.userId);
      if (!entry) {
        continue;
      }

      const points = calculateMatchPoints(
        {
          winnerTeamId: prediction.winnerTeamId,
          scorerPlayerIds: prediction.scorers.map((s) => s.playerId),
        },
        { winnerTeamId: match.winnerTeamId },
        actualScorerPlayerIds
      );

      entry.winnerPoints += points.winnerPoints;
      entry.scorerPoints += points.scorerPoints;
      entry.total += points.total;
    }
  }

  return Array.from(entries.values()).sort((a, b) => b.total - a.total);
}

async function getUsersAndFinishedMatches() {
  return Promise.all([
    prisma.user.findMany({ where: { role: "USER" }, select: { id: true, name: true } }),
    prisma.match.findMany({
      where: { status: "FINISHED" },
      include: {
        scorers: true,
        predictions: { include: { scorers: true } },
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
