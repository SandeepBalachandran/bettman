"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RewardSuccessModal } from "./RewardSuccessModal";

interface ClaimRewardButtonProps {
  alreadyClaimed: boolean;
  todaysReward: number;
  onClaimed?: () => void;
}

export function ClaimRewardButton({
  alreadyClaimed,
  todaysReward,
  onClaimed,
}: ClaimRewardButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClaim = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/rewards/claim-daily", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to claim reward");
      }

      const result = await response.json();

      if (!result.success) {
        if (result.reason === "already_claimed") {
          toast.info("You've already claimed today's reward");
        } else if (result.reason === "campaign_not_active") {
          toast.info("Campaign is not active");
        } else {
          toast.error("Could not claim reward");
        }
      } else {
        setShowSuccess(true);
        onClaimed?.();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to claim reward"
      );
    } finally {
      setLoading(false);
    }
  };

  if (alreadyClaimed) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 border border-success rounded-lg text-success font-medium text-sm">
        ✅ Claimed Today
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleClaim}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
      >
        {loading ? (
          <>
            <span className="animate-spin">⏳</span>
            Claiming...
          </>
        ) : (
          <>
            🎁 Claim {todaysReward} Coins
          </>
        )}
      </button>

      <RewardSuccessModal
        isOpen={showSuccess}
        coins={todaysReward}
        onClose={() => setShowSuccess(false)}
      />
    </>
  );
}
