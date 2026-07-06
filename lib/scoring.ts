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
  },
  actualScorerPlayerIds: string[]
): MatchPoints {
  const winnerPoints =
    match.winnerTeamId && prediction.winnerTeamId === match.winnerTeamId ? 30 : 0;

  const scorerPoints = prediction.scorerPlayerIds.reduce((sum, playerId) => {
    const goalCount = actualScorerPlayerIds.filter(id => id === playerId).length;
    return sum + (goalCount > 0 ? goalCount * 10 : 0);
  }, 0);

  return { winnerPoints, scorerPoints, total: winnerPoints + scorerPoints };
}
