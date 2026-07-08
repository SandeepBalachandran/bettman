import { prisma } from "./prisma";
import { MoneyConfig, moneyConfig } from "./money-config";
import { applyPointsBoosterMultiplier } from "@/lib/points-booster";

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
    wonOnPenalties?: boolean;
  },
  actualScorerPlayerIds: string[],
  config: MoneyConfig,
  hasPointsBooster: boolean = false
): MatchMoney {
  let winnerMoney = 0;
  if (match.winnerTeamId) {
    winnerMoney =
      prediction.winnerTeamId === match.winnerTeamId
        ? config.moneyPerCorrectWinner
        : config.moneyPerIncorrectWinner;
  }

  const winnerCorrect = match.winnerTeamId && prediction.winnerTeamId === match.winnerTeamId;
  let scorerMoney = 0;

  // If match was won on penalties and user predicted the correct winner,
  // award full money for their scorer picks (they got the outcome right)
  if (winnerCorrect && match.wonOnPenalties) {
    scorerMoney = prediction.scorerPlayerIds.length * config.moneyPerCorrectScorer;
  } else {
    // Otherwise, award money only for actual goal scorers
    scorerMoney = prediction.scorerPlayerIds.reduce((sum, playerId) => {
      const goalCount = actualScorerPlayerIds.filter(id => id === playerId).length;
      if (goalCount > 0) {
        return sum + goalCount * config.moneyPerCorrectScorer;
      }
      return sum + config.moneyPerIncorrectScorer;
    }, 0);
  }

  // Apply booster multiplier (only to positive money, not penalties)
  winnerMoney = applyPointsBoosterMultiplier(winnerMoney, hasPointsBooster);
  scorerMoney = applyPointsBoosterMultiplier(scorerMoney, hasPointsBooster);

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
        moneyConfig,
        prediction.usedPointsBooster
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
