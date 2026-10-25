import { applyPointsBoosterMultiplier } from "@/lib/points-booster";

export type MatchPoints = {
  winnerPoints: number;
  scorerPoints: number;
  total: number;
};

export type ResultPick = {
  winnerTeamId: string | null;
  /** True when the user picked a draw instead of a winning team. */
  predictedDraw?: boolean;
};

export type MatchOutcome = {
  winnerTeamId: string | null;
  isDraw?: boolean;
  wonOnPenalties?: boolean;
};

/** A result exists once there's a winner or the match is recorded as drawn. */
export function isOutcomeDecided(match: MatchOutcome): boolean {
  return Boolean(match.winnerTeamId) || Boolean(match.isDraw);
}

export function isResultPickCorrect(prediction: ResultPick, match: MatchOutcome): boolean {
  if (match.isDraw) return Boolean(prediction.predictedDraw);
  return Boolean(match.winnerTeamId) && !prediction.predictedDraw && prediction.winnerTeamId === match.winnerTeamId;
}

export function calculateMatchPoints(
  prediction: ResultPick & {
    scorerPlayerIds: string[];
  },
  match: MatchOutcome,
  actualScorerPlayerIds: string[],
  hasPointsBooster: boolean = false
): MatchPoints {
  const winnerCorrect = isResultPickCorrect(prediction, match);
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
