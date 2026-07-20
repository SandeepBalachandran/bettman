"use client";

import { useState } from "react";
import Link from "next/link";
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
  moneyBalance,
  streak = 0,
  rankChange = 0,
  highlightedMetric = "points",
  winnerTag = null,
}: {
  readonly entry: LeaderboardEntry;
  readonly rank: number;
  readonly isCurrentUser: boolean;
  readonly moneyBalance: number;
  readonly streak?: number;
  /** Positive = moved up this many spots since the last finished match, negative = moved down. */
  readonly rankChange?: number;
  readonly highlightedMetric?: "points" | "money";
  /** Final-standings badge (e.g. "🏆 Points Champion") shown when the tournament is over. */
  readonly winnerTag?: string | null;
}) {
  const penalty = entry.scorerPoints < 0 ? entry.scorerPoints : 0;
  const scorerGains = entry.scorerPoints - penalty;
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
        <p className="truncate text-xs sm:text-sm font-semibold">
          {entry.name}
          {isCurrentUser && (
            <span className="ml-1 rounded-full bg-highlight/20 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-medium text-highlight-foreground dark:text-highlight">
              you
            </span>
          )}
          {winnerTag && (
            <span
              className={`ml-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold ${
                rank === 1
                  ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-sm"
                  : "bg-gray-200 text-gray-700 dark:bg-white/15 dark:text-gray-200"
              }`}
            >
              {winnerTag}
            </span>
          )}
          </p>
          <div className="mt-0.5 flex flex-wrap gap-0.5 sm:gap-1 text-[8px] sm:text-[10px]">
          <span className="rounded-full bg-accent/10 px-1 sm:px-1.5 py-0.5 font-medium text-accent">
            W +{entry.winnerPoints}
          </span>
          <span className="rounded-full bg-success/10 px-1 sm:px-1.5 py-0.5 font-medium text-success">
            S +{scorerGains}
          </span>
          {penalty < 0 && (
            <span className="rounded-full bg-danger/10 px-1 sm:px-1.5 py-0.5 font-medium text-danger">
              P {penalty}
            </span>
          )}
          {streak >= 2 && (
            <span className="rounded-full bg-highlight/15 px-1 sm:px-1.5 py-0.5 font-medium text-highlight-foreground dark:text-highlight">
              🔥 {streak}
            </span>
          )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5 sm:gap-1">
          {highlightedMetric === "points" ? (
            <>
              <div className={`rounded-lg px-2 py-1 transition-all ${
                highlightedMetric === "points" ? "bg-accent/10" : ""
              }`}>
                <p className="gradient-text text-lg sm:text-xl font-extrabold">{entry.total}</p>
                <p className="text-[8px] sm:text-[10px] text-gray-400">pts</p>
              </div>
              <div className={`text-right text-[8px] sm:text-[10px] font-semibold rounded-lg px-2 py-1 transition-all ${
                moneyBalance >= 0 ? "text-success" : "text-danger"
              }`}>
                <p>{formatMoney(moneyBalance)}</p>
              </div>
            </>
          ) : (
            <>
              <div className={`text-right transition-all ${
                moneyBalance >= 0 ? "text-success" : "text-danger"
              } rounded-lg px-2 py-1 bg-success/10`}>
                <p className="text-lg sm:text-xl font-extrabold">{formatMoney(moneyBalance)}</p>
                <p className="text-[8px] sm:text-[10px] text-gray-400">💰</p>
              </div>
              <div className={`rounded-lg px-2 py-1 transition-all`}>
                <p className="text-[8px] sm:text-[10px] font-semibold text-gray-500">{entry.total} pts</p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
