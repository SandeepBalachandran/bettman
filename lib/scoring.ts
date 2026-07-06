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
    return sum + (actualScorerPlayerIds.includes(playerId) ? 10 : 0);
  }, 0);

  return { winnerPoints, scorerPoints, total: winnerPoints + scorerPoints };
}
