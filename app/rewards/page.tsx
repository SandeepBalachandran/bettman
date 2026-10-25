import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { requireFeaturePage } from "@/lib/feature-flags";
import { getRewardProgress, getUserCoinBalance } from "@/lib/coin-rewards";
import { RewardUnlockCard } from "@/components/RewardUnlockCard";
import { ClaimRewardButton } from "@/components/ClaimRewardButton";
import Link from "next/link";

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export default async function RewardsPage() {
  const user = await requireAuth();
  await requireFeaturePage("rewardsPage", user.role);
  const progress = await getRewardProgress(user.id);
  const balance = await getUserCoinBalance(user.id);

  // Only this campaign's claims — earlier campaigns' days are history.
  const dailyRewards = progress.campaignActive
    ? await prisma.dailyReward.findMany({
        where: { userId: user.id, day: { gte: progress.firstDayNumber } },
        orderBy: { day: "asc" },
      })
    : [];
  const claimedDays = new Set(dailyRewards.map((r) => r.day));
  const coinsEarned = dailyRewards.reduce((sum, r) => sum + r.coins, 0);
  const daysLeft = progress.totalDays - progress.dayNumber;

  return (
    <main className="mx-auto max-w-4xl space-y-6 sm:space-y-8 p-3 sm:p-4 md:p-6">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Daily Rewards</h1>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Claim coins every day and spend them on extra scorer picks and points boosters.
        </p>
      </div>

      {!progress.campaignActive ? (
        <div className="card space-y-2 border-l-4 border-accent p-4 sm:p-5 md:p-6">
          {progress.nextCampaign ? (
            <>
              <p className="text-xs sm:text-sm font-semibold text-accent">
                🗓️ {progress.nextCampaign.name} rewards start {formatDay(progress.nextCampaign.startDate)}
              </p>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                Come back from then to claim {progress.nextCampaign.dailyReward} coins every day. You
                have <span className="font-bold">{balance}</span> coins to spend right now.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs sm:text-sm font-semibold text-accent">ℹ️ No reward campaign running</p>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                You still have <span className="font-bold">{balance}</span> coins to spend on unlocks.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="card space-y-4 sm:space-y-6 border-l-4 border-accent p-4 sm:p-5 md:p-6">
          <div>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1 sm:mb-3">
              <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">
                {progress.campaignName?.toUpperCase()} REWARDS
              </p>
              {progress.campaignEndDate && (
                <p className="text-xs text-gray-500">Ends {formatDay(progress.campaignEndDate)}</p>
              )}
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium">
                Day {progress.dayNumber} of {progress.totalDays}
              </span>
              <span className="text-xs sm:text-sm text-gray-500">
                {daysLeft === 0 ? "Last day!" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5 dark:bg-gray-700">
              <div
                className="bg-accent h-2 sm:h-2.5 rounded-full transition-all"
                style={{ width: `${(progress.dayNumber / progress.totalDays) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Stat label="Today" value={progress.todaysReward} hint="coins" tone="text-yellow-600 dark:text-yellow-400" />
            <Stat label="Balance" value={balance} hint="coins" tone="text-accent" />
            <Stat
              label="Claimed"
              value={`${dailyRewards.length}/${progress.dayNumber}`}
              hint={`${coinsEarned} coins`}
              tone="text-success"
            />
          </div>

          <div className="pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-800">
            {!progress.claimed ? (
              <ClaimRewardButton alreadyClaimed={false} todaysReward={progress.todaysReward} />
            ) : (
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-success/10 border border-success rounded-lg text-success font-semibold text-xs sm:text-sm">
                ✅ Claimed today — come back tomorrow for {progress.rewards[progress.dayNumber] ?? 0} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unlock Tiers */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold">Spend your coins</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          <RewardUnlockCard
            slot="booster"
            balance={balance}
            title="Points Booster"
            description="Double your points and money on one prediction (from My Predictions)"
          />
          <RewardUnlockCard
            slot={3}
            balance={balance}
            title="3rd Scorer Slot"
            description="Pick a third goal scorer on a prediction"
          />
          <RewardUnlockCard
            slot={4}
            balance={balance}
            title="4th Scorer Slot"
            description="Pick a fourth goal scorer on a prediction"
          />
        </div>
      </div>

      {/* This campaign's claim history */}
      {progress.campaignActive && (
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-lg sm:text-xl font-bold">This season&apos;s claims</h2>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: progress.dayNumber }, (_, i) => {
              const dayNum = i + 1;
              const claimed = claimedDays.has(progress.firstDayNumber + i);
              const isToday = dayNum === progress.dayNumber;
              return (
                <div
                  key={dayNum}
                  title={`Day ${dayNum}: ${claimed ? `claimed ${progress.rewards[i]} coins` : isToday ? "not claimed yet" : "missed"}`}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                    claimed
                      ? "bg-success/15 text-success"
                      : isToday
                        ? "border-2 border-dashed border-accent text-accent"
                        : "bg-gray-100 text-gray-400 dark:bg-white/5"
                  }`}
                >
                  {claimed ? "✓" : dayNum}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">
            ✓ claimed · dashed = today · grey = missed. Missed days can&apos;t be claimed later.
          </p>
        </div>
      )}

      <Link
        href="/fixtures"
        className="inline-flex rounded-lg border border-gray-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300 dark:hover:bg-gray-800/50 touch-none"
      >
        ← Back to Fixtures
      </Link>
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  readonly label: string;
  readonly value: number | string;
  readonly hint: string;
  readonly tone: string;
}) {
  return (
    <div className="rounded-lg bg-black/3 p-2.5 sm:p-4 dark:bg-white/5">
      <p className="text-[10px] sm:text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-lg sm:text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-[10px] sm:text-xs text-gray-500">{hint}</p>
    </div>
  );
}
