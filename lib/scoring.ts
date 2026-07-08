import { applyPointsBoosterMultiplier } from "@/lib/points-booster";

export type MatchPoints = {
  winnerPoints: number;
  scorerPoints: number;
  total: number;
};

export function calculateMatchPoints(
  prediction: {
    winnerTeamId: string;
    scorerPlayerIds: string[];
  },
  match: {
    winnerTeamId: string | null;
    wonOnPenalties?: boolean;
  },
  actualScorerPlayerIds: string[],
  hasPointsBooster: boolean = false
): MatchPoints {
  const winnerCorrect = match.winnerTeamId && prediction.winnerTeamId === match.winnerTeamId;
  let winnerPoints = winnerCorrect ? 30 : 0;

  let scorerPoints = 0;

  // If match was won on penalties and user predicted the correct winner,
  // award full points for their scorer picks (they got the outcome right)
  if (winnerCorrect && match.wonOnPenalties) {
    scorerPoints = prediction.scorerPlayerIds.length * 10;
  } else {
    // Otherwise, award points only for actual goal scorers
    scorerPoints = prediction.scorerPlayerIds.reduce((sum, playerId) => {
      const goalCount = actualScorerPlayerIds.filter(id => id === playerId).length;
      return sum + (goalCount > 0 ? goalCount * 10 : 0);
    }, 0);
  }

  // Apply booster multiplier (only to positive points, not penalties)
  winnerPoints = applyPointsBoosterMultiplier(winnerPoints, hasPointsBooster);
  scorerPoints = applyPointsBoosterMultiplier(scorerPoints, hasPointsBooster);

  return { winnerPoints, scorerPoints, total: winnerPoints + scorerPoints };
}
