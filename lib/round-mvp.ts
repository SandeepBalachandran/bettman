import { prisma } from "./prisma";
import { calculateMatchPoints, isResultPickCorrect } from "./scoring";
import { activeMatchWhere } from "./competition";
import { matchGroupKey, matchGroupLabel } from "./match-groups";

export type RoundMvp = {
  /** Round (knockouts) or matchweek (league play) key — see matchGroupKey. */
  groupKey: string;
  groupLabel: string;
  userId: string;
  name: string;
  points: number;
};

/** Top scorer(s) per finished round/matchweek — ties share the MVP spot. */
export async function getRoundMvps(): Promise<RoundMvp[]> {
  const finishedMatches = await prisma.match.findMany({
    where: { status: "FINISHED", ...activeMatchWhere() },
    include: {
      scorers: true,
      predictions: { include: { user: true, scorers: true } },
    },
  });

  const pointsByRoundAndUser = new Map<string, Map<string, { name: string; points: number }>>();
  const labelByGroupKey = new Map<string, string>();

  for (const match of finishedMatches) {
    const actualScorerIds = match.scorers.map((s) => s.playerId);
    const groupKey = matchGroupKey(match);
    labelByGroupKey.set(groupKey, matchGroupLabel(match));
    const roundMap = pointsByRoundAndUser.get(groupKey) ?? new Map();
    pointsByRoundAndUser.set(groupKey, roundMap);

    for (const prediction of match.predictions) {
      const points = calculateMatchPoints(
        {
          winnerTeamId: prediction.winnerTeamId,
          predictedDraw: prediction.predictedDraw,
          scorerPlayerIds: prediction.scorers.map((s) => s.playerId),
        },
        { winnerTeamId: match.winnerTeamId, isDraw: match.isDraw, wonOnPenalties: match.wonOnPenalties },
        actualScorerIds
      );

      const entry = roundMap.get(prediction.userId) ?? { name: prediction.user.name, points: 0 };
      entry.points += points.total;
      roundMap.set(prediction.userId, entry);
    }
  }

  const mvps: RoundMvp[] = [];
  for (const [groupKey, userMap] of pointsByRoundAndUser) {
    const maxPoints = Math.max(...[...userMap.values()].map((e) => e.points));
    if (maxPoints <= 0) continue;

    for (const [userId, entry] of userMap) {
      if (entry.points === maxPoints) {
        mvps.push({
          groupKey,
          groupLabel: labelByGroupKey.get(groupKey)!,
          userId,
          name: entry.name,
          points: entry.points,
        });
      }
    }
  }

  return mvps;
}

/** Consecutive correct-winner picks ending at the most recently finished match. */
export async function getUserWinnerStreak(userId: string): Promise<number> {
  const finishedMatches = await prisma.match.findMany({
    where: { status: "FINISHED", ...activeMatchWhere() },
    include: { predictions: { where: { userId } } },
    orderBy: { kickoffTime: "desc" },
  });

  let streak = 0;
  for (const match of finishedMatches) {
    const prediction = match.predictions[0];
    if (!prediction || !isResultPickCorrect(prediction, match)) {
      break;
    }
    streak++;
  }

  return streak;
}
