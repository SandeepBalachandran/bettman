import { prisma } from "./prisma";
import { calculateMatchPoints } from "./scoring";
import type { Round } from "@prisma/client";

export type RoundMvp = {
  round: Round;
  userId: string;
  name: string;
  points: number;
};

/** Top scorer(s) per finished round — ties share the MVP spot. */
export async function getRoundMvps(): Promise<RoundMvp[]> {
  const finishedMatches = await prisma.match.findMany({
    where: { status: "FINISHED" },
    include: {
      scorers: true,
      predictions: { include: { user: true, scorers: true } },
    },
  });

  const pointsByRoundAndUser = new Map<Round, Map<string, { name: string; points: number }>>();

  for (const match of finishedMatches) {
    const actualScorerIds = match.scorers.map((s) => s.playerId);
    const roundMap = pointsByRoundAndUser.get(match.round) ?? new Map();
    pointsByRoundAndUser.set(match.round, roundMap);

    for (const prediction of match.predictions) {
      const points = calculateMatchPoints(
        {
          winnerTeamId: prediction.winnerTeamId,
          scorerPlayerIds: prediction.scorers.map((s) => s.playerId),
        },
        { winnerTeamId: match.winnerTeamId },
        actualScorerIds
      );

      const entry = roundMap.get(prediction.userId) ?? { name: prediction.user.name, points: 0 };
      entry.points += points.total;
      roundMap.set(prediction.userId, entry);
    }
  }

  const mvps: RoundMvp[] = [];
  for (const [round, userMap] of pointsByRoundAndUser) {
    const maxPoints = Math.max(...[...userMap.values()].map((e) => e.points));
    if (maxPoints <= 0) continue;

    for (const [userId, entry] of userMap) {
      if (entry.points === maxPoints) {
        mvps.push({ round, userId, name: entry.name, points: entry.points });
      }
    }
  }

  return mvps;
}

/** Consecutive correct-winner picks ending at the most recently finished match. */
export async function getUserWinnerStreak(userId: string): Promise<number> {
  const finishedMatches = await prisma.match.findMany({
    where: { status: "FINISHED" },
    include: { predictions: { where: { userId } } },
    orderBy: { kickoffTime: "desc" },
  });

  let streak = 0;
  for (const match of finishedMatches) {
    const prediction = match.predictions[0];
    if (!prediction || prediction.winnerTeamId !== match.winnerTeamId) {
      break;
    }
    streak++;
  }

  return streak;
}
