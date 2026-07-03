"use client";

import { motion } from "framer-motion";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { formatMoney } from "@/lib/format-money";

const MEDALS = ["🥇", "🥈", "🥉"];

const AVATAR_COLORS = [
  "bg-accent",
  "bg-secondary",
  "bg-highlight",
  "bg-success",
  "bg-danger",
];

function avatarColorFor(userId: string) {
  const hash = [...userId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function LeaderboardRow({
  entry,
  rank,
  isCurrentUser,
  moneyBalance,
}: {
  readonly entry: LeaderboardEntry;
  readonly rank: number;
  readonly isCurrentUser: boolean;
  readonly moneyBalance: number;
}) {
  const penalty = entry.scorerPoints < 0 ? entry.scorerPoints : 0;
  const scorerGains = entry.scorerPoints - penalty;
  const medal = MEDALS[rank - 1];
  const initials = entry.name.slice(0, 2).toUpperCase();

  return (
    <motion.div
      layout
      layoutId={entry.userId}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`card card-interactive flex items-center gap-3 p-3 ${
        isCurrentUser ? "border-highlight bg-highlight/10" : ""
      } ${rank <= 3 ? "ring-1 ring-inset ring-highlight/30" : ""}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold dark:bg-white/10">
        {medal ?? <span className="text-gray-500">#{rank}</span>}
      </div>

      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColorFor(
          entry.userId
        )}`}
      >
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {entry.name}
          {isCurrentUser && (
            <span className="ml-1 rounded-full bg-highlight/20 px-2 py-0.5 text-[10px] font-medium text-highlight-foreground dark:text-highlight">
              you
            </span>
          )}
        </p>
        <div className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
          <span className="rounded-full bg-accent/10 px-1.5 py-0.5 font-medium text-accent">
            W +{entry.winnerPoints}
          </span>
          <span className="rounded-full bg-success/10 px-1.5 py-0.5 font-medium text-success">
            S +{scorerGains}
          </span>
          {penalty < 0 && (
            <span className="rounded-full bg-danger/10 px-1.5 py-0.5 font-medium text-danger">
              P {penalty}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <div>
          <p className="gradient-text text-xl font-extrabold">{entry.total}</p>
          <p className="text-[10px] text-gray-400">pts</p>
        </div>
        <div className={`text-right text-[10px] font-semibold ${
          moneyBalance >= 0 ? "text-success" : "text-danger"
        }`}>
          <p>{formatMoney(moneyBalance)}</p>
        </div>
      </div>
    </motion.div>
  );
}
