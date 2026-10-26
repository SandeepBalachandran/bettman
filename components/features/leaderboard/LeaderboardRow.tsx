"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { LeaderboardEntry } from "@/lib/leaderboard";

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

/** Uses the user's chosen avatar if set, otherwise a deterministic DiceBear cartoon character. */
function CartoonAvatar({
  userId,
  name,
  avatarUrl,
}: {
  readonly userId: string;
  readonly name: string;
  readonly avatarUrl: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();

  if (failed) {
    return (
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColorFor(
          userId
        )}`}
      >
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(userId)}`}
      alt=""
      width={36}
      height={36}
      className="h-9 w-9 shrink-0 rounded-full bg-gray-100 object-cover dark:bg-white/10"
      onError={() => setFailed(true)}
    />
  );
}

export function LeaderboardRow({
  entry,
  rank,
  isCurrentUser,
  streak = 0,
  rankChange = 0,
  winnerTag = null,
  prizeAmount,
}: {
  readonly entry: LeaderboardEntry;
  readonly rank: number;
  readonly isCurrentUser: boolean;
  readonly streak?: number;
  /** Positive = moved up this many spots since the last finished match, negative = moved down. */
  readonly rankChange?: number;
  /** Final-standings badge (e.g. "🏆 Champion") shown when the tournament is over. */
  readonly winnerTag?: string | null;
  /** ₹ Amazon voucher this player would win if the season ended now. */
  readonly prizeAmount?: number;
}) {
  const medal = MEDALS[rank - 1];

  return (
    <Link href={`/user/${entry.userId}/predictions`}>
      <motion.div
        layout
        layoutId={entry.userId}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`card card-interactive mb-4 flex items-center gap-2 sm:gap-3 p-2 sm:p-3 ${
          isCurrentUser ? "border-highlight bg-highlight/10" : ""
        } ${rank <= 3 ? "ring-1 ring-inset ring-highlight/30" : ""}`}
      >
        <div className="flex shrink-0 flex-col items-center gap-0.5">
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-gray-100 text-xs sm:text-sm font-bold dark:bg-white/10">
          {medal ?? <span className="text-gray-500">#{rank}</span>}
        </div>
        {rankChange !== 0 && (
          <span
            className={`text-[8px] sm:text-[10px] font-bold ${rankChange > 0 ? "text-success" : "text-danger"}`}
          >
            {rankChange > 0 ? `▲${rankChange}` : `▼${Math.abs(rankChange)}`}
          </span>
        )}
        </div>

        <CartoonAvatar userId={entry.userId} name={entry.name} avatarUrl={entry.avatarUrl} />

        <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
          <p className="truncate text-xs sm:text-sm font-semibold min-w-0">{entry.name}</p>
          {isCurrentUser && (
            <span className="shrink-0 rounded-full bg-highlight/20 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-medium text-highlight-foreground dark:text-highlight">
              you
            </span>
          )}
          {winnerTag && (
            <span
              className={`shrink-0 whitespace-nowrap rounded-full px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold ${
                rank === 1
                  ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-sm"
                  : "bg-gray-200 text-gray-700 dark:bg-white/15 dark:text-gray-200"
              }`}
            >
              {winnerTag}
            </span>
          )}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-0.5 sm:gap-1 text-[8px] sm:text-[10px]">
          {prizeAmount !== undefined && (
            <span className="rounded-full bg-accent px-1 sm:px-1.5 py-0.5 font-semibold text-accent-foreground" title="Season prize if the season ended now">
              🎁 ₹{prizeAmount}
            </span>
          )}
          {streak >= 2 && (
            <span className="rounded-full bg-highlight/15 px-1 sm:px-1.5 py-0.5 font-medium text-highlight-foreground dark:text-highlight">
              🔥 {streak}
            </span>
          )}
          </div>
        </div>

        <div className="shrink-0 rounded-xl bg-accent/10 px-2.5 py-1 text-right">
          <p className={`font-display text-2xl leading-none sm:text-3xl ${entry.money < 0 ? "text-danger" : "text-accent"}`}>
            {entry.money}
          </p>
          <p className="text-[9px] text-gray-400 sm:text-[10px]">pts</p>
        </div>
      </motion.div>
    </Link>
  );
}
