import { prisma } from "@/lib/prisma";

// DailyReward.day is unique per user, so stored day numbers count from one
// fixed epoch across every campaign — a new campaign must never reuse an old
// campaign's day numbers. Never change this date.
const DAY_NUMBER_EPOCH = new Date("2026-07-08");

type RewardCampaign = {
  name: string;
  start: Date;
  /** Last claimable day (inclusive). */
  end: Date;
  /** Coins for the Nth day of this campaign (1-indexed). */
  rewardForDay: (campaignDay: number) => number;
};

const WORLD_CUP_REWARDS = [
  50, 50, 50, 50, 50, 50, // Days 1-6: 50 coins
  100, 100, 100, 100, 100, 100, // Days 7-12: 100 coins
];

const REWARD_CAMPAIGNS: RewardCampaign[] = [
  {
    name: "World Cup",
    start: new Date("2026-07-08"),
    end: new Date("2026-07-19"),
    rewardForDay: (day) => WORLD_CUP_REWARDS[day - 1],
  },
  {
    name: "ISL 2026–27",
    start: new Date("2026-10-26"),
    end: new Date("2027-01-17"),
    rewardForDay: () => 20,
  },
];

// Default unlock tiers (will be overridden by database config)
const DEFAULT_UNLOCK_TIERS = {
  thirdScorer: 50,
  fourthScorer: 150,
};

let cachedUnlockTiers = { ...DEFAULT_UNLOCK_TIERS };
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export function invalidateUnlockTiersCache() {
  cacheTimestamp = 0;
}

async function getUnlockTiers() {
  const now = Date.now();
  if (now - cacheTimestamp < CACHE_DURATION) {
    return cachedUnlockTiers;
  }

  try {
    let config = await prisma.rewardConfig.findFirst();

    if (!config) {
      config = await prisma.rewardConfig.create({
        data: {
          boosterCost: 100,
          thirdScorerCost: 50,
          fourthScorerCost: 150,
        },
      });
    }

    cachedUnlockTiers = {
      thirdScorer: config.thirdScorerCost,
      fourthScorer: config.fourthScorerCost,
    };
    cacheTimestamp = now;
  } catch (error) {
    console.error("Error fetching unlock tiers from DB:", error);
    cachedUnlockTiers = { ...DEFAULT_UNLOCK_TIERS };
  }

  return cachedUnlockTiers;
}

/** Days since DAY_NUMBER_EPOCH (UTC calendar days, 1-indexed) — the value stored in DailyReward.day. */
function getDayNumber(date: Date): number {
  const toUtcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const days = Math.floor((toUtcDay(date) - toUtcDay(DAY_NUMBER_EPOCH)) / (1000 * 60 * 60 * 24));
  return days + 1;
}

type ActiveCampaignDay = {
  /** Absolute day number, as stored in DailyReward.day. */
  dayNumber: number;
  /** Day within the running campaign (1-indexed), for display. */
  campaignDay: number;
  /** DailyReward.day value of the campaign's first day. */
  firstDayNumber: number;
  totalDays: number;
  rewards: number[];
  name: string;
  /** ISO date of the campaign's last claimable day. */
  endDate: string;
};

function getActiveCampaignDay(date: Date): ActiveCampaignDay | null {
  const dayNumber = getDayNumber(date);
  for (const campaign of REWARD_CAMPAIGNS) {
    const firstDayNumber = getDayNumber(campaign.start);
    const totalDays = getDayNumber(campaign.end) - firstDayNumber + 1;
    const campaignDay = dayNumber - firstDayNumber + 1;
    if (campaignDay >= 1 && campaignDay <= totalDays) {
      const rewards = Array.from({ length: totalDays }, (_, i) => campaign.rewardForDay(i + 1));
      return {
        dayNumber,
        campaignDay,
        firstDayNumber,
        totalDays,
        rewards,
        name: campaign.name,
        endDate: campaign.end.toISOString(),
      };
    }
  }
  return null;
}

/** The next campaign that hasn't started yet, if any — shown between campaigns. */
function getNextCampaign(date: Date): { name: string; startDate: string; dailyReward: number } | null {
  const dayNumber = getDayNumber(date);
  const next = REWARD_CAMPAIGNS.filter((c) => getDayNumber(c.start) > dayNumber).sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  )[0];
  return next ? { name: next.name, startDate: next.start.toISOString(), dailyReward: next.rewardForDay(1) } : null;
}

export async function awardDailyCoins(userId: string) {
  const today = new Date();
  const campaign = getActiveCampaignDay(today);

  // Check if campaign is active
  if (!campaign) {
    return { awarded: 0, reason: "campaign_not_active" };
  }
  const { dayNumber } = campaign;

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

  const coinsToAward = campaign.rewards[campaign.campaignDay - 1];

  // Get or create coin balance
  let coinBalance = await prisma.coinBalance.findUnique({
    where: { userId },
  });

  if (!coinBalance) {
    coinBalance = await prisma.coinBalance.create({
      data: { userId, balance: 0 },
    });
  }

  const balanceBefore = coinBalance.balance;
  const balanceAfter = balanceBefore + coinsToAward;

  // Award coins and log transaction
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
    prisma.coinTransaction.create({
      data: {
        userId,
        type: "award",
        reason: `daily_reward_day_${dayNumber}`,
        amount: coinsToAward,
        balanceBefore,
        balanceAfter,
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

export async function spendCoins(
  userId: string,
  amount: number,
  reason: string = "unknown",
  relatedId?: string
): Promise<boolean> {
  const coinBalance = await prisma.coinBalance.findUnique({
    where: { userId },
  });

  if (!coinBalance || coinBalance.balance < amount) {
    return false;
  }

  const balanceBefore = coinBalance.balance;
  const balanceAfter = balanceBefore - amount;

  await Promise.all([
    prisma.coinBalance.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    }),
    prisma.coinTransaction.create({
      data: {
        userId,
        type: "spend",
        reason,
        amount,
        balanceBefore,
        balanceAfter,
        relatedId,
      },
    }),
  ]);

  return true;
}

export async function canUnlockScorer(balance: number, scorerPosition: 3 | 4): Promise<boolean> {
  const tiers = await getUnlockTiers();
  if (scorerPosition === 3) {
    return balance >= tiers.thirdScorer;
  }
  if (scorerPosition === 4) {
    return balance >= tiers.fourthScorer;
  }
  return false;
}

export async function getUnlockCost(scorerPosition: 3 | 4): Promise<number> {
  const tiers = await getUnlockTiers();
  if (scorerPosition === 3) return tiers.thirdScorer;
  if (scorerPosition === 4) return tiers.fourthScorer;
  return 0;
}

export async function getRewardProgress(userId: string) {
  const campaign = getActiveCampaignDay(new Date());

  if (!campaign) {
    return {
      campaignActive: false,
      campaignName: null,
      campaignEndDate: null,
      nextCampaign: getNextCampaign(new Date()),
      dayNumber: 0,
      totalDays: 0,
      firstDayNumber: 0,
      rewards: [] as number[],
      todaysReward: 0,
      claimed: false,
      coinBalance: await getUserCoinBalance(userId),
    };
  }

  const claimed = await prisma.dailyReward.findUnique({
    where: {
      userId_day: {
        userId,
        day: campaign.dayNumber,
      },
    },
  });

  return {
    campaignActive: true,
    campaignName: campaign.name,
    campaignEndDate: campaign.endDate,
    nextCampaign: null,
    // Day within the current campaign, for display ("Day 3 of 84").
    dayNumber: campaign.campaignDay,
    totalDays: campaign.totalDays,
    firstDayNumber: campaign.firstDayNumber,
    rewards: campaign.rewards,
    todaysReward: campaign.rewards[campaign.campaignDay - 1],
    claimed: !!claimed,
    coinBalance: await getUserCoinBalance(userId),
  };
}

export const COIN_CONFIG = {
  unlocks: DEFAULT_UNLOCK_TIERS,
};
