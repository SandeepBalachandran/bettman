"use client";

import { motion } from "framer-motion";
import type { LeaderboardEntry } from "@/lib/leaderboard";

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardRow({
  entry,
  rank,
  isCurrentUser,
}: {
  readonly entry: LeaderboardEntry;
  readonly rank: number;
  readonly isCurrentUser: boolean;
}) {
  const penalty = entry.scorerPoints < 0 ? entry.scorerPoints : 0;
  const scorerGains = entry.scorerPoints - penalty;
  const medal = MEDALS[rank - 1];

  return (
    <motion.tr
      layout
      layoutId={entry.userId}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`border-b ${isCurrentUser ? "bg-highlight/15 font-medium" : ""}`}
    >
      <td className="py-2 pr-2">
        {medal ? <span aria-hidden>{medal}</span> : rank}
      </td>
      <td className="py-2 pr-2">
        {entry.name}
        {isCurrentUser && <span className="ml-1 text-xs text-gray-500">(you)</span>}
      </td>
      <td className="py-2 pr-2 text-right">{entry.winnerPoints}</td>
      <td className="py-2 pr-2 text-right">{scorerGains}</td>
      <td className="py-2 pr-2 text-right">{penalty}</td>
      <td className="py-2 text-right font-semibold">{entry.total}</td>
    </motion.tr>
  );
}
