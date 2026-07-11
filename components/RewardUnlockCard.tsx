"use client";

import { useState, useEffect } from "react";

interface RewardUnlockCardProps {
  slot: "booster" | 3 | 4;
  balance: number;
  title: string;
  description: string;
}

export function RewardUnlockCard({
  slot,
  balance,
  title,
  description,
}: RewardUnlockCardProps) {
  const [cost, setCost] = useState<number | null>(null);
  const [canUnlock, setCanUnlock] = useState(false);

  useEffect(() => {
    const fetchCost = async () => {
      try {
        const response = await fetch(`/api/admin/reward-config`);
        if (response.ok) {
          const config = await response.json();
          const slotCost =
            slot === "booster"
              ? config.boosterCost
              : slot === 3
                ? config.thirdScorerCost
                : config.fourthScorerCost;
          setCost(slotCost);
          setCanUnlock(balance >= slotCost);
        }
      } catch (error) {
        console.error("Error fetching cost:", error);
        // Fallback to defaults
        const defaultCost =
          slot === "booster" ? 100 : slot === 3 ? 50 : 150;
        setCost(defaultCost);
        setCanUnlock(balance >= defaultCost);
      }
    };

    fetchCost();
  }, [slot, balance]);

  if (cost === null) {
    return (
      <div className="card space-y-3 border-l-4 border-gray-300 p-5 sm:p-6 dark:border-gray-700">
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div
      className={`card space-y-3 border-l-4 p-5 sm:p-6 ${
        canUnlock
          ? "border-success bg-success/5"
          : "border-gray-300 dark:border-gray-700"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </p>
        </div>
        {canUnlock && (
          <span className="rounded-full bg-success/20 px-2 py-1 text-xs font-bold text-success">
            ✅ Unlocked
          </span>
        )}
      </div>
      <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{cost} coins needed</span>
          <span className="text-sm text-accent font-bold">{balance}/{cost}</span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
          <div
            className="bg-accent h-2 rounded-full transition-all"
            style={{ width: `${Math.min((balance / cost) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
