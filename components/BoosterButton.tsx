"use client";

import { useState, useEffect } from "react";
import { BoosterActivatedModal } from "@/components/BoosterActivatedModal";

interface BoosterButtonProps {
  predictionId: string;
  isUsed: boolean;
  userCoins: number;
  onActivated?: () => void;
}

export function BoosterButton({
  predictionId,
  isUsed,
  userCoins,
  onActivated,
}: BoosterButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boosterCost, setBoosterCost] = useState(100); // Default fallback
  const [showActivatedModal, setShowActivatedModal] = useState(false);
  const canActivate = !isUsed && userCoins >= boosterCost;

  useEffect(() => {
    const fetchCost = async () => {
      try {
        const response = await fetch("/api/admin/reward-config");
        if (response.ok) {
          const config = await response.json();
          setBoosterCost(config.boosterCost);
        }
      } catch (error) {
        console.error("Error fetching booster cost:", error);
      }
    };
    fetchCost();
  }, []);

  const handleActivate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isUsed || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/booster/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictionId }),
      });

      if (!response.ok) {
        const data = await response.json();

        if (response.status === 402) {
          setError("Insufficient coins");
        } else if (response.status === 409) {
          setError("Booster already used");
        } else if (response.status === 404) {
          setError("Prediction not found");
        } else {
          setError(data.error || "Failed to activate booster");
        }
        return;
      }

      setShowActivatedModal(true);
      onActivated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error activating booster");
    } finally {
      setLoading(false);
    }
  };

  if (isUsed) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-50 to-amber-100 px-4 py-2 text-sm font-semibold dark:from-amber-900/30 dark:to-amber-800/30 border border-amber-200 dark:border-amber-700/50 shadow-sm">
        <span className="text-lg animate-pulse">⚡</span>
        <span className="text-amber-700 dark:text-amber-300">
          2x Active
        </span>
      </div>
    );
  }

  return (
    <>
      <BoosterActivatedModal
        isOpen={showActivatedModal}
        onClose={() => setShowActivatedModal(false)}
      />

      <div className="flex flex-col gap-2">
        <button
          onClick={handleActivate}
          disabled={!canActivate || loading}
          className={`relative flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-bold transition-all duration-300 w-full sm:w-auto ${
            canActivate
              ? "bg-gradient-to-r from-amber-400 to-amber-500 text-white hover:from-amber-500 hover:to-amber-600 hover:shadow-xl hover:shadow-amber-400/50 active:scale-95 cursor-pointer border border-amber-300 dark:from-amber-500 dark:to-amber-600 dark:hover:from-amber-600 dark:hover:to-amber-700 dark:border-amber-400/50 dark:hover:shadow-amber-500/40 animate-pulse"
              : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed opacity-60"
          } ${loading ? "opacity-75" : ""}`}
        >
          {canActivate && !loading && (
            <span className="absolute inset-0 rounded-xl bg-white/20 animate-pulse"></span>
          )}
          <span className="text-2xl drop-shadow-lg">⚡</span>
          <span className="relative z-10">
            {loading ? "Activating..." : `2x Booster (${boosterCost} 💰)`}
          </span>
        </button>
        {error && (
          <p className="text-xs text-danger font-medium">
            {error}
          </p>
        )}
        {!canActivate && !isUsed && userCoins < boosterCost && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Need {boosterCost - userCoins} more coins
          </p>
        )}
      </div>
    </>
  );
}
