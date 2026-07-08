"use client";

/**
 * Badge/indicator for matches decided by penalty shootout.
 * Shows below match results to distinguish from regular wins.
 */
export function PenaltyBadge() {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 dark:bg-yellow-900/20">
      <span className="text-lg">🎯</span>
      <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
        Won on Penalties
      </span>
    </div>
  );
}
