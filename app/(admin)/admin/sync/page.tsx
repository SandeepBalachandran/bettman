"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

type SyncType = "all" | "live" | "detailed";

interface SyncResponse {
  timestamp: string;
  synced: string[];
  detailedResults?: {
    checkedMatches: number;
    updated: number;
    skipped: number;
    notYetPlayed: number;
    failedTeamLookups: string[];
  };
  summary: {
    totalMatches: number;
    matchesByStatus: Record<string, number>;
  };
}

export default function SyncResultsPage() {
  const [loading, setLoading] = useState(false);
  const [syncType, setSyncType] = useState<SyncType>("all");
  const [result, setResult] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/sync-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: syncType }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Sync failed");
      }

      const data = (await response.json()) as SyncResponse;
      setResult(data);
      toast.success("✅ Results synced successfully!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      setError(message);
      toast.error(`❌ ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Sync Match Results</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Pull the latest scores, results and goal scorers from the live results provider
          </p>
        </div>
        <Link href="/admin" className="text-xs sm:text-sm text-accent hover:underline self-start sm:self-auto">
          ← Back to Admin
        </Link>
      </div>

      {/* Sync Type Selection */}
      <div className="card space-y-4 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold">Sync Type</h2>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-accent/5 transition">
            <input
              type="radio"
              value="all"
              checked={syncType === "all"}
              onChange={(e) => setSyncType(e.target.value as SyncType)}
              className="mt-1"
              disabled={loading}
            />
            <div>
              <p className="font-semibold text-sm">🔄 Full Sync (Recommended)</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Syncs both live match statuses and detailed results with scorers. Safe to re-run anytime.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-accent/5 transition">
            <input
              type="radio"
              value="live"
              checked={syncType === "live"}
              onChange={(e) => setSyncType(e.target.value as SyncType)}
              className="mt-1"
              disabled={loading}
            />
            <div>
              <p className="font-semibold text-sm">⚡ Live Status Only</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Updates match status (UPCOMING → LIVE → FINISHED) only. Faster.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-accent/5 transition">
            <input
              type="radio"
              value="detailed"
              checked={syncType === "detailed"}
              onChange={(e) => setSyncType(e.target.value as SyncType)}
              className="mt-1"
              disabled={loading}
            />
            <div>
              <p className="font-semibold text-sm">⚽ Detailed (Winners + Scorers)</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Includes goal scorers. Slower due to API rate limits. Use for scoring setup.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Sync Button */}
      <button
        onClick={handleSync}
        disabled={loading}
        className="w-full rounded-lg bg-accent px-4 py-3 sm:py-2.5 font-medium text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition touch-none"
      >
        {loading ? "🔄 Syncing..." : "▶ Start Sync"}
      </button>

      {/* Error */}
      {error && (
        <div className="card space-y-2 border-l-4 border-danger bg-danger/5 p-4 sm:p-5">
          <p className="font-semibold text-danger">Sync Failed</p>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="card space-y-6 p-4 sm:p-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-success">✅ Sync Completed</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>

          {/* Synced Modules */}
          <div>
            <p className="text-sm font-semibold mb-2">Modules Synced:</p>
            <div className="flex flex-wrap gap-2">
              {result.synced.map((module) => (
                <span key={module} className="inline-block px-2.5 py-1 bg-success/10 text-success rounded text-xs font-medium">
                  ✓ {module}
                </span>
              ))}
            </div>
          </div>

          {/* Detailed Results */}
          {result.detailedResults && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-accent/10 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Checked</p>
                <p className="text-lg font-bold text-accent">{result.detailedResults.checkedMatches}</p>
              </div>
              <div className="p-3 bg-success/10 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Updated</p>
                <p className="text-lg font-bold text-success">{result.detailedResults.updated}</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Skipped</p>
                <p className="text-lg font-bold text-secondary">{result.detailedResults.skipped}</p>
              </div>
              <div className="p-3 bg-highlight/10 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Not Played</p>
                <p className="text-lg font-bold text-highlight-foreground dark:text-highlight">
                  {result.detailedResults.notYetPlayed}
                </p>
              </div>

              {result.detailedResults.failedTeamLookups.length > 0 && (
                <div className="col-span-2 sm:col-span-4 p-3 bg-danger/5 border border-danger/20 rounded-lg">
                  <p className="text-xs font-semibold text-danger mb-1">Failed Team Lookups:</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{result.detailedResults.failedTeamLookups.join(", ")}</p>
                </div>
              )}
            </div>
          )}

          {/* Match Summary */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <p className="text-sm font-semibold mb-3">Match Summary</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-lg font-bold">{result.summary.totalMatches}</p>
              </div>
              {Object.entries(result.summary.matchesByStatus).map(([status, count]) => (
                <div key={status} className="p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">{status}</p>
                  <p className="text-lg font-bold">{count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="card space-y-3 bg-accent/5 border-l-4 border-accent p-4 sm:p-5">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">ℹ️ How it works</p>
        <ul className="text-xs sm:text-sm space-y-2 text-gray-600 dark:text-gray-400">
          <li>• <span className="font-medium">Live Status</span> updates UPCOMING → LIVE → FINISHED</li>
          <li>• <span className="font-medium">Detailed Sync</span> also adds goal scorers from API</li>
          <li>• Safe to run multiple times — already-synced matches are skipped</li>
          <li>• Results populate leaderboard and user payouts immediately</li>
          <li>• For ISL every option does the same full sync (results + scorers + squads) — and it also runs on its own whenever someone opens the app</li>
        </ul>
      </div>
    </main>
  );
}
