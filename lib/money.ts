import { prisma } from "./prisma";
import { MoneyConfig, moneyConfig } from "./money-config";

export type MatchMoney = {
  winnerMoney: number;
  scorerMoney: number;
  total: number;
};

export function calculateMatchMoney(
  prediction: {
    winnerTeamId: string;
    scorerPlayerIds: string[];
  },
  match: {
    winnerTeamId: string | null;
  },
  actualScorerPlayerIds: string[],
  config: MoneyConfig
): MatchMoney {
  let winnerMoney = 0;
  if (match.winnerTeamId) {
    winnerMoney =
      prediction.winnerTeamId === match.winnerTeamId
        ? config.moneyPerCorrectWinner
        : config.moneyPerIncorrectWinner;
  }

  const scorerMoney = prediction.scorerPlayerIds.reduce((sum, playerId) => {
    const goalCount = actualScorerPlayerIds.filter(id => id === playerId).length;
    if (goalCount > 0) {
      return sum + goalCount * config.moneyPerCorrectScorer;
    }
    return sum + config.moneyPerIncorrectScorer;
  }, 0);

  return { winnerMoney, scorerMoney, total: winnerMoney + scorerMoney };
}

export type SettlementLogEntry = {
  userId: string;
  userName: string;
  matchId: string;
  matchName: string;
  amount: number;
};

/**
 * One row per user per finished match, for admins to hand-verify money
 * calculations. Excludes matches a user never predicted on.
 */
export async function getSettlementLog(): Promise<SettlementLogEntry[]> {
  const finishedMatches = await prisma.match.findMany({
    where: { status: "FINISHED" },
    include: {
      homeTeam: true,
      awayTeam: true,
      scorers: true,
      predictions: { include: { scorers: true, user: true } },
    },
    orderBy: { kickoffTime: "asc" },
  });

  const log: SettlementLogEntry[] = [];

  for (const match of finishedMatches) {
    const actualScorerPlayerIds = match.scorers.map((s) => s.playerId);
    const matchName = `${match.homeTeam.name} vs ${match.awayTeam.name}`;

    for (const prediction of match.predictions) {
      const money = calculateMatchMoney(
        {
          winnerTeamId: prediction.winnerTeamId,
          scorerPlayerIds: prediction.scorers.map((s) => s.playerId),
        },
        { winnerTeamId: match.winnerTeamId },
        actualScorerPlayerIds,
        moneyConfig
      );

      log.push({
        userId: prediction.userId,
        userName: prediction.user.name,
        matchId: match.id,
        matchName,
        amount: money.total,
      });
    }
  }

  return log;
}
