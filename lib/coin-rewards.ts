import { prisma } from "@/lib/prisma";

const REWARD_CAMPAIGN_START = new Date("2026-07-08"); // Campaign starts today
const REWARD_CAMPAIGN_END = new Date("2026-07-19"); // Final day

const DAILY_REWARDS = [
  50, 50, 50, 50, 50, 50, // Days 1-6: 50 coins
  100, 100, 100, 100, 100, 100, // Days 7-12: 100 coins
];

const UNLOCK_TIERS = {
  thirdScorer: 100,
  fourthScorer: 300,
};

function getDayNumber(date: Date): number {
  const start = new Date(REWARD_CAMPAIGN_START);
  start.setHours(0, 0, 0, 0);

  const current = new Date(date);
  current.setHours(0, 0, 0, 0);

  const diff = current.getTime() - start.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days + 1; // 1-indexed
}

export async function awardDailyCoins(userId: string) {
  const today = new Date();
  const dayNumber = getDayNumber(today);

  // Check if campaign is active
  if (dayNumber < 1 || dayNumber > DAILY_REWARDS.length) {
    return { awarded: 0, reason: "campaign_not_active" };
  }

  // Check if already claimed today
  const existingReward = await prisma.dailyReward.findUnique({
    where: {
      userId_day: {
        userId,
        day: dayNumber,
      },
    },
  });

  if (existingReward) {
    return { awarded: 0, reason: "already_claimed" };
  }

  const coinsToAward = DAILY_REWARDS[dayNumber - 1];

  // Get or create coin balance
  let coinBalance = await prisma.coinBalance.findUnique({
    where: { userId },
  });

  if (!coinBalance) {
    coinBalance = await prisma.coinBalance.create({
      data: { userId, balance: 0 },
    });
  }

  // Award coins
  await Promise.all([
    prisma.coinBalance.update({
      where: { userId },
      data: { balance: { increment: coinsToAward } },
    }),
    prisma.dailyReward.create({
      data: {
        userId,
        day: dayNumber,
        coins: coinsToAward,
      },
    }),
  ]);

  return { awarded: coinsToAward, reason: "success" };
}

export async function getUserCoinBalance(userId: string): Promise<number> {
  const coinBalance = await prisma.coinBalance.findUnique({
    where: { userId },
  });
  return coinBalance?.balance ?? 0;
}

export async function spendCoins(userId: string, amount: number): Promise<boolean> {
  const coinBalance = await prisma.coinBalance.findUnique({
    where: { userId },
  });

  if (!coinBalance || coinBalance.balance < amount) {
    return false;
  }

  await prisma.coinBalance.update({
    where: { userId },
    data: { balance: { decrement: amount } },
  });

  return true;
}

export function canUnlockScorer(balance: number, scorerPosition: 3 | 4): boolean {
  if (scorerPosition === 3) {
    return balance >= UNLOCK_TIERS.thirdScorer;
  }
  if (scorerPosition === 4) {
    return balance >= UNLOCK_TIERS.fourthScorer;
  }
  return false;
}

export function getUnlockCost(scorerPosition: 3 | 4): number {
  if (scorerPosition === 3) return UNLOCK_TIERS.thirdScorer;
  if (scorerPosition === 4) return UNLOCK_TIERS.fourthScorer;
  return 0;
}

export async function getRewardProgress(userId: string) {
  const today = new Date();
  const dayNumber = getDayNumber(today);

  if (dayNumber < 1 || dayNumber > DAILY_REWARDS.length) {
    return {
      campaignActive: false,
      dayNumber: 0,
      totalDays: DAILY_REWARDS.length,
      todaysReward: 0,
      claimed: false,
      coinBalance: await getUserCoinBalance(userId),
    };
  }

  const claimed = await prisma.dailyReward.findUnique({
    where: {
      userId_day: {
        userId,
        day: dayNumber,
      },
    },
  });

  return {
    campaignActive: true,
    dayNumber,
    totalDays: DAILY_REWARDS.length,
    todaysReward: DAILY_REWARDS[dayNumber - 1],
    claimed: !!claimed,
    coinBalance: await getUserCoinBalance(userId),
  };
}

export const COIN_CONFIG = {
  rewards: DAILY_REWARDS,
  unlocks: UNLOCK_TIERS,
  campaignStart: REWARD_CAMPAIGN_START,
  campaignEnd: REWARD_CAMPAIGN_END,
};
