import { prisma } from "@/lib/prisma";

const BOOSTER_COST = 100; // coins
const BOOSTER_MULTIPLIER = 2;

export async function canActivateBooster(userId: string): Promise<boolean> {
  const coinBalance = await prisma.coinBalance.findUnique({
    where: { userId },
  });
  return (coinBalance?.balance ?? 0) >= BOOSTER_COST;
}

export async function activateBooster(
  userId: string,
  predictionId: string
): Promise<{ success: boolean; reason?: string }> {
  try {
    // Check if user has enough coins
    const coinBalance = await prisma.coinBalance.findUnique({
      where: { userId },
    });

    if (!coinBalance || coinBalance.balance < BOOSTER_COST) {
      return { success: false, reason: "insufficient_coins" };
    }

    // Check if prediction exists and belongs to user
    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
    });

    if (!prediction || prediction.userId !== userId) {
      return { success: false, reason: "prediction_not_found" };
    }

    if (prediction.usedPointsBooster) {
      return { success: false, reason: "already_used" };
    }

    // Update prediction and deduct coins
    const balanceBefore = coinBalance.balance;
    const balanceAfter = balanceBefore - BOOSTER_COST;

    await Promise.all([
      prisma.prediction.update({
        where: { id: predictionId },
        data: { usedPointsBooster: true },
      }),
      prisma.coinBalance.update({
        where: { userId },
        data: { balance: { decrement: BOOSTER_COST } },
      }),
      prisma.coinTransaction.create({
        data: {
          userId,
          type: "spend",
          reason: "booster",
          amount: BOOSTER_COST,
          balanceBefore,
          balanceAfter,
          relatedId: predictionId,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error activating booster:", error);
    return { success: false, reason: "error" };
  }
}

export function applyPointsBoosterMultiplier(
  value: number,
  hasBooster: boolean
): number {
  if (!hasBooster) return value;

  // Apply multiplier to positive points/money only
  if (value > 0) {
    return Math.round(value * BOOSTER_MULTIPLIER);
  }
  // Negative penalties are NOT affected by booster
  return value;
}

export const BOOSTER_CONFIG = {
  cost: BOOSTER_COST,
  multiplier: BOOSTER_MULTIPLIER,
};
