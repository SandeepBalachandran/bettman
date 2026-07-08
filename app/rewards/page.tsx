import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import {
  getRewardProgress,
  getUserCoinBalance,
  COIN_CONFIG,
} from "@/lib/coin-rewards";
import { RewardUnlockCard } from "@/components/RewardUnlockCard";
import { ClaimRewardButton } from "@/components/ClaimRewardButton";
import Link from "next/link";

export default async function RewardsPage() {
  const user = await requireAuth();
  const progress = await getRewardProgress(user.id);
  const balance = await getUserCoinBalance(user.id);

  const dailyRewards = await prisma.dailyReward.findMany({
    where: { userId: user.id },
    orderBy: { day: "asc" },
  });

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-4 sm:p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold gradient-text">Daily Rewards</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Earn coins every day to unlock premium features
        </p>
      </div>

      {!progress.campaignActive ? (
        <div className="card space-y-4 border-l-4 border-orange-500 p-5 sm:p-6 bg-orange-50/50 dark:bg-orange-900/10">
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
            ℹ️ Daily Reward Campaign Ended
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            The 14-day daily reward campaign has ended. However, you still have{" "}
            <span className="font-bold">{balance}</span> coins available to unlock features.
          </p>
        </div>
      ) : (
        <div className="card space-y-6 border-l-4 border-accent p-5 sm:p-6">
          <div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
              CAMPAIGN PROGRESS
            </p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">
                    Day {progress.dayNumber} of {progress.totalDays}
                  </span>
                  <span className="text-sm font-semibold text-accent">
                    {Math.round((progress.dayNumber / progress.totalDays) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div
                    className="bg-accent h-2.5 rounded-full transition-all"
                    style={{ width: `${(progress.dayNumber / progress.totalDays) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">
                TODAY'S REWARD
              </p>
              <p className="text-2xl font-bold text-yellow-500">
                {progress.todaysReward}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">coins</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">
                TOTAL COINS
              </p>
              <p className="text-2xl font-bold text-accent">{balance}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">available</p>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            {!progress.claimed ? (
              <ClaimRewardButton
                alreadyClaimed={false}
                todaysReward={progress.todaysReward}
              />
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 border border-success rounded-lg text-success font-semibold text-sm">
                ✅ Already claimed today
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unlock Tiers */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Feature Unlocks</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* 3rd Scorer */}
          <RewardUnlockCard
            slot={3}
            balance={balance}
            title="3rd Scorer Slot"
            description="Unlock the ability to predict a third goal scorer"
          />

          {/* 4th Scorer */}
          <RewardUnlockCard
            slot={4}
            balance={balance}
            title="4th Scorer Slot"
            description="Unlock the ability to predict a fourth goal scorer"
          />
        </div>
      </div>

      {/* Daily Rewards History */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Claimed Rewards</h2>

        {dailyRewards.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No rewards claimed yet. Check back tomorrow!
          </p>
        ) : (
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
            {Array.from({ length: progress.totalDays }, (_, i) => {
              const dayNum = i + 1;
              const claimed = dailyRewards.find((r) => r.day === dayNum);
              const reward = COIN_CONFIG.rewards[i];

              return (
                <div
                  key={dayNum}
                  className={`card p-3 text-center text-sm font-semibold rounded-lg ${
                    claimed
                      ? "bg-success/10 border border-success text-success"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400"
                  }`}
                >
                  <p className="font-bold">{dayNum}</p>
                  <p className="text-xs mt-1">{reward}c</p>
                  {claimed && <p className="text-xs mt-1">✅</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Link
        href="/fixtures"
        className="inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300 dark:hover:bg-gray-800/50"
      >
        ← Back to Fixtures
      </Link>
    </main>
  );
}
