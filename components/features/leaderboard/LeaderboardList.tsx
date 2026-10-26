"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { LeaderboardRow } from "@/components/features/leaderboard/LeaderboardRow";

export type LeaderboardListProps = {
  entries: LeaderboardEntry[];
  currentUserId: string;
  previousRankByUserId: Map<string, number>;
  streakByUserId: Map<string, number>;
  tournamentComplete?: boolean;
  /** userId → ₹ voucher for players currently in a prize place. */
  prizeByUserId?: Map<string, number>;
};

export function LeaderboardList({
  entries,
  currentUserId,
  previousRankByUserId,
  streakByUserId,
  tournamentComplete = false,
  prizeByUserId,
}: LeaderboardListProps) {
  // Celebrate the champions on every visit/reload once the tournament is over
  useEffect(() => {
    if (!tournamentComplete) return;

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

  // Entries arrive already ranked (rankEntries).
  return (
    <div className="space-y-4">
      <div className="space-y-3 sm:space-y-4">
        {entries.map((entry, index) => {
          const rank = index + 1;
          const previousRank = previousRankByUserId.get(entry.userId) ?? rank;
          let winnerTag: string | null = null;
          if (tournamentComplete && rank === 1) {
            winnerTag = "🏆 Champion";
          } else if (tournamentComplete && rank === 2) {
            winnerTag = "🥈 Runner-up";
          }
          return (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              rank={rank}
              isCurrentUser={entry.userId === currentUserId}
              streak={streakByUserId.get(entry.userId) || 0}
              rankChange={previousRank - rank}
              winnerTag={winnerTag}
              prizeAmount={prizeByUserId?.get(entry.userId)}
            />
          );
        })}
      </div>
    </div>
  );
}
