"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { DAILY_REWARD_CLAIMED_EVENT, type DailyRewardClaimedDetail } from "@/lib/daily-reward-events";

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

  // Claimed somewhere else (the daily coins popup or the rewards page): hide the
  // Claim button and add the coins instead of offering a claim that would fail.
  useEffect(() => {
    function handleClaimed(event: Event) {
      const { awarded } = (event as CustomEvent<DailyRewardClaimedDetail>).detail;
      setProgress((prev) =>
        prev && !prev.claimed ? { ...prev, claimed: true, coinBalance: prev.coinBalance + awarded } : prev
      );
    }
    window.addEventListener(DAILY_REWARD_CLAIMED_EVENT, handleClaimed);
    return () => window.removeEventListener(DAILY_REWARD_CLAIMED_EVENT, handleClaimed);
  }, []);

  async function handleClaimReward() {
    if (!progress || progress.claimed || claiming) return;

    setClaiming(true);
    try {
      const res = await fetch("/api/rewards/claim-daily", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        // Trigger confetti explosion
        confetti({
          particleCount: 80,
          spread: 90,
          origin: { y: 0.3 },
          colors: ["#FFD700", "#FFA500", "#FF8C00", "#FFB347", "#FFAA00"],
        });

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
        // Claimed in another tab or device: just hide the button.
        setProgress((prev) => (prev ? { ...prev, claimed: true } : null));
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
      <div className="whitespace-nowrap text-xs font-semibold text-white/90">
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
