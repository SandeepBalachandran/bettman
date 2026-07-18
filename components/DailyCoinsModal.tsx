"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface DailyCoinsModalProps {
  isOpen: boolean;
  coinsAmount: number;
  dayNumber: number;
  onClose: () => void;
  onCollected: () => void;
}

export function DailyCoinsModal({
  isOpen,
  coinsAmount,
  dayNumber,
  onClose,
  onCollected,
}: DailyCoinsModalProps) {
  const [loading, setLoading] = useState(false);

  // Hide background when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCollect = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/rewards/claim-daily", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to claim reward");
      }

      toast.success(`🎉 Collected ${coinsAmount} coins!`);
      onCollected();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to collect coins";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-600/40 backdrop-blur-sm p-4 sm:p-6">
      <div className="card relative w-full max-w-sm space-y-4 sm:space-y-6 p-6 sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl sm:text-2xl transition-colors"
        >
          ✕
        </button>

        {/* Header */}
        <div className="space-y-2 sm:space-y-3 text-center">
          <div className="text-4xl sm:text-5xl">🎁</div>
          <h2 className="text-lg sm:text-2xl font-bold">Claim Your Daily Coins</h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Day {dayNumber} of your reward campaign
          </p>
        </div>

        {/* Coin Display */}
        <div className="flex flex-col items-center justify-center rounded-lg bg-gradient-to-r from-accent/10 to-secondary/10 p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-2">
            You've earned
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl sm:text-5xl font-extrabold text-accent">{coinsAmount}</p>
            <p className="text-2xl sm:text-3xl">💰</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Use coins to activate boosters, unlock extra scorers, and unlock more features!
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:gap-3">
          <button
            onClick={handleCollect}
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors touch-none"
          >
            {loading ? "Collecting..." : "Collect Now"}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 sm:py-4 text-sm sm:text-base font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 touch-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
