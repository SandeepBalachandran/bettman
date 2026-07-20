"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { LeaderboardRow } from "@/components/features/leaderboard/LeaderboardRow";

export type LeaderboardListProps = {
  entries: LeaderboardEntry[];
  currentUserId: string;
  previousRankByUserId: Map<string, number>;
  moneyByUserId: Map<string, number>;
  streakByUserId: Map<string, number>;
  tournamentComplete?: boolean;
};

type SortBy = "points" | "money";

export function LeaderboardList({
  entries,
  currentUserId,
  previousRankByUserId,
  moneyByUserId,
  streakByUserId,
  tournamentComplete = false,
}: LeaderboardListProps) {
  const [sortBy, setSortBy] = useState<SortBy>("points");

  // Celebrate the champions once per session when the tournament is over
  useEffect(() => {
    if (!tournamentComplete || typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem("winnerConfettiSeen")) return;
    sessionStorage.setItem("winnerConfettiSeen", "1");

    const colors = ["#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#A78BFA"];
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.5 }, colors });
    setTimeout(() => {
      confetti({ particleCount: 120, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 120, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors });
    }, 350);
    setTimeout(() => {
      confetti({ particleCount: 80, spread: 120, origin: { y: 0.3 }, colors });
    }, 700);
  }, [tournamentComplete]);

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

      <div className="space-y-3 sm:space-y-4">
        {sorted.map((entry, index) => {
          const rank = index + 1;
          const previousRank = previousRankByUserId.get(entry.userId) ?? rank;
          let winnerTag: string | null = null;
          if (tournamentComplete && rank === 1) {
            winnerTag = sortBy === "points" ? "🏆 Points Champion" : "💰 Money Champion";
          } else if (tournamentComplete && rank === 2) {
            winnerTag = "🥈 Runner-up";
          }
          return (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              rank={rank}
              isCurrentUser={entry.userId === currentUserId}
              moneyBalance={moneyByUserId.get(entry.userId) || 0}
              streak={streakByUserId.get(entry.userId) || 0}
              rankChange={previousRank - rank}
              highlightedMetric={sortBy}
              winnerTag={winnerTag}
            />
          );
        })}
      </div>
    </div>
  );
}
