"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format-money";

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
  const canActivate = !isUsed && userCoins >= 100;

  const handleActivate = async () => {
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

      onActivated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error activating booster");
    } finally {
      setLoading(false);
    }
  };

  if (isUsed) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm dark:bg-amber-900/20">
        <span className="text-lg">⚡</span>
        <span className="font-semibold text-amber-700 dark:text-amber-400">
          1.5x Active
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleActivate}
        disabled={!canActivate || loading}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
          canActivate
            ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 cursor-pointer"
            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        } ${loading ? "opacity-50" : ""}`}
      >
        <span className="text-lg">⚡</span>
        <span>
          {loading ? "Activating..." : `1.5x Booster (100 💰)`}
        </span>
      </button>
      {error && (
        <p className="text-xs text-danger">
          {error}
        </p>
      )}
      {!canActivate && !isUsed && userCoins < 100 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Need {100 - userCoins} more coins
        </p>
      )}
    </div>
  );
}
