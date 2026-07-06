"use client";

import { useState } from "react";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { LeaderboardRow } from "@/components/features/leaderboard/LeaderboardRow";

export type LeaderboardListProps = {
  entries: LeaderboardEntry[];
  currentUserId: string;
  previousRankByUserId: Map<string, number>;
  moneyByUserId: Map<string, number>;
  streakByUserId: Map<string, number>;
};

type SortBy = "points" | "money";

export function LeaderboardList({
  entries,
  currentUserId,
  previousRankByUserId,
  moneyByUserId,
  streakByUserId,
}: LeaderboardListProps) {
  const [sortBy, setSortBy] = useState<SortBy>("points");

  const sorted = [...entries].sort((a, b) => {
    if (sortBy === "points") {
      return b.total - a.total;
    } else {
      const balanceA = moneyByUserId.get(a.userId) || 0;
      const balanceB = moneyByUserId.get(b.userId) || 0;
      return balanceB - balanceA;
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setSortBy("points")}
          className={`btn text-sm h-10 px-4 sm:px-6 ${
            sortBy === "points" ? "btn-primary" : "btn-outline"
          }`}
        >
          ⭐ <span className="hidden xs:inline">Points</span><span className="xs:hidden">Points</span>
        </button>
        <button
          onClick={() => setSortBy("money")}
          className={`btn text-sm h-10 px-4 sm:px-6 ${
            sortBy === "money" ? "btn-primary" : "btn-outline"
          }`}
        >
          💰 <span className="hidden xs:inline">Money</span><span className="xs:hidden">Money</span>
        </button>
      </div>

      <div className="space-y-2">
        {sorted.map((entry, index) => {
          const rank = index + 1;
          const previousRank = previousRankByUserId.get(entry.userId) ?? rank;
          return (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              rank={rank}
              isCurrentUser={entry.userId === currentUserId}
              moneyBalance={moneyByUserId.get(entry.userId) || 0}
              streak={streakByUserId.get(entry.userId) || 0}
              rankChange={previousRank - rank}
            />
          );
        })}
      </div>
    </div>
  );
}
