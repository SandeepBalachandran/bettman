import { prisma } from "./prisma";
import { calculateMatchMoney } from "./money";
import { moneyConfig } from "./money-config";

export interface UserMoney {
  currentBalance: number;
  moneyWon: number;
  moneyLost: number;
  completedMatches: number;
  pendingMatches: number;
  pendingExposure: {
    matchesRemaining: number;
    maxWin: number;
    maxLoss: number;
  };
}

export async function getUserMoney(userId: string): Promise<UserMoney> {
  // Get all matches grouped by status
  const [allMatches, predictions] = await Promise.all([
    prisma.match.findMany({
      include: {
        scorers: true,
      },
    }),
    prisma.prediction.findMany({
      where: { userId },
      include: { scorers: true },
    }),
  ]);

  const finishedMatches = allMatches.filter((m) => m.status === "FINISHED");
  const pendingMatches = allMatches.filter((m) => m.status !== "FINISHED");

  // Calculate money per finished match
  let currentBalance = 0;
  let moneyWon = 0;
  let moneyLost = 0;

  for (const match of finishedMatches) {
    const prediction = predictions.find((p) => p.matchId === match.id);

    if (prediction) {
      const actualScorerIds = match.scorers.map((ms) => ms.playerId);
      const money = calculateMatchMoney(
        {
          winnerTeamId: prediction.winnerTeamId,
          scorerPlayerIds: prediction.scorers.map((ps) => ps.playerId),
        },
        {
          winnerTeamId: match.winnerTeamId,
          wonOnPenalties: match.wonOnPenalties,
        },
        actualScorerIds,
        moneyConfig
      );

      currentBalance += money.total;
      if (money.total > 0) {
        moneyWon += money.total;
      } else if (money.total < 0) {
        moneyLost += Math.abs(money.total);
      }
    }
  }

  return {
    currentBalance,
    moneyWon,
    moneyLost,
    completedMatches: finishedMatches.length,
    pendingMatches: pendingMatches.length,
    pendingExposure: {
      matchesRemaining: pendingMatches.length,
      maxWin: pendingMatches.length * moneyConfig.maxMoneyPerMatch,
      maxLoss: pendingMatches.length * Math.abs(moneyConfig.maxLossPerMatch),
    },
  };
}

export type UserMoneyRow = UserMoney & { userId: string; name: string; upiId: string | null };

export async function getAllUsersMoney(): Promise<UserMoneyRow[]> {
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: { id: true, name: true, upiId: true },
  });

  return Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      name: user.name,
      upiId: user.upiId,
      ...(await getUserMoney(user.id)),
    }))
  );
}
