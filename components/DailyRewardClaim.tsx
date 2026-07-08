"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface RewardProgress {
  campaignActive: boolean;
  dayNumber: number;
  totalDays: number;
  todaysReward: number;
  claimed: boolean;
  coinBalance: number;
}

export function DailyRewardClaim() {
  const [progress, setProgress] = useState<RewardProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    async function loadProgress() {
      try {
        const res = await fetch("/api/rewards/progress");
        if (res.ok) {
          const data = await res.json();
          setProgress(data);
        }
      } catch (error) {
        console.error("Failed to load reward progress:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, []);

  async function handleClaimReward() {
    if (!progress || progress.claimed || claiming) return;

    setClaiming(true);
    try {
      const res = await fetch("/api/rewards/claim-daily", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        toast.success(`🎉 Claimed ${data.awarded} coins!`);
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                claimed: true,
                coinBalance: prev.coinBalance + data.awarded,
              }
            : null
        );
      } else if (data.reason === "already_claimed") {
        toast.info("Already claimed today's reward");
      } else {
        toast.error("Failed to claim reward");
      }
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("Error claiming reward");
    } finally {
      setClaiming(false);
    }
  }

  if (loading || !progress) {
    return null;
  }

  if (!progress.campaignActive) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400">
        💰 {progress.coinBalance} coins
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-3">
      <div className="hidden text-right sm:block">
        <div className="text-xs font-semibold text-white">
          Day {progress.dayNumber}/{progress.totalDays}
        </div>
        <div className="text-[10px] text-white/80">
          {progress.todaysReward} coins
        </div>
      </div>

      <div className="sm:hidden text-right">
        <div className="text-[10px] font-semibold text-white">
          Day {progress.dayNumber}/{progress.totalDays}
        </div>
      </div>

      {!progress.claimed && (
        <button
          onClick={handleClaimReward}
          disabled={claiming}
          className="rounded-lg bg-yellow-500 px-2 py-0.5 text-[10px] font-bold text-gray-900 transition hover:bg-yellow-400 disabled:opacity-50 sm:px-2.5 sm:py-1 sm:text-xs"
        >
          {claiming ? "..." : "Claim"}
        </button>
      )}
      {progress.claimed && (
        <div className="rounded-lg bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white sm:px-2.5 sm:py-1 sm:text-xs">
          ✅
        </div>
      )}

      <div className="text-[10px] font-semibold text-white sm:text-xs">
        💰 {progress.coinBalance}
      </div>
    </div>
  );
}
