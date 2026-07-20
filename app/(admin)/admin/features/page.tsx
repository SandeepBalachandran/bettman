"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type FlagKey =
  | "quiz"
  | "dailyCoins"
  | "pushBanner"
  | "finalDayBanner"
  | "rewardsPage"
  | "booster"
  | "dailyRewardClaim"
  | "navFixtures"
  | "navMyPredictions"
  | "navLeaderboard"
  | "navMoney";

type FlagValues = Record<FlagKey, boolean>;

const FEATURES: { key: FlagKey; icon: string; name: string; description: string }[] = [
  { key: "quiz", icon: "⚽", name: "Daily Quiz", description: "Floating quiz icon and quiz APIs" },
  { key: "dailyCoins", icon: "🪙", name: "Daily Coins Popup", description: "Daily coin collect modal on app open" },
  { key: "pushBanner", icon: "🔔", name: "Push Notification Prompt", description: "Enable-notifications banner" },
  { key: "finalDayBanner", icon: "🏆", name: "Final Day Popup", description: "Final day celebration popup" },
  { key: "rewardsPage", icon: "🎁", name: "Rewards Page", description: "Rewards page and its menu link" },
  { key: "booster", icon: "⚡", name: "2x Points Booster", description: "Booster button in prediction flow" },
  { key: "dailyRewardClaim", icon: "📅", name: "Daily Reward Claim", description: "Claim button in the header" },
  { key: "navFixtures", icon: "🗓️", name: "Fixtures Menu", description: "Fixtures menu item and page" },
  { key: "navMyPredictions", icon: "📝", name: "My Predictions Menu", description: "My Predictions menu item and page" },
  { key: "navLeaderboard", icon: "🏅", name: "Leaderboard Menu", description: "Leaderboard menu item and page" },
  { key: "navMoney", icon: "💰", name: "Money Menu", description: "Money menu item and page" },
];

const DEFAULT_FLAGS: FlagValues = Object.fromEntries(
  FEATURES.map((f) => [f.key, true])
) as FlagValues;

function pickFlags(data: Record<string, unknown>): FlagValues {
  return Object.fromEntries(
    FEATURES.map((f) => [f.key, Boolean(data[f.key] ?? true)])
  ) as FlagValues;
}

export default function AdminFeaturesPage() {
  const [saved, setSaved] = useState<FlagValues | null>(null);
  const [formData, setFormData] = useState<FlagValues>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/feature-flags");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      const flags = pickFlags(data);
      setSaved(flags);
      setFormData(flags);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load feature flags";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: FlagKey) => {
    setFormData((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      const updated = await response.json();
      const flags = pickFlags(updated);
      setSaved(flags);
      setFormData(flags);
      toast.success("Feature settings updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (saved) setFormData(saved);
  };

  const hasChanges = saved
    ? FEATURES.some((f) => formData[f.key] !== saved[f.key])
    : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error && !saved) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-3 sm:p-4 md:p-6">
        <h1 className="text-xl sm:text-2xl font-bold gradient-text">Manage Features</h1>
        <div className="card space-y-4 border-l-4 border-danger bg-danger/5 p-4 sm:p-6">
          <p className="font-semibold text-danger">Failed to load feature flags</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchFlags();
            }}
            className="rounded-lg bg-danger px-4 py-2 font-medium text-white hover:bg-danger/90 transition-colors"
          >
            ↻ Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold gradient-text">Manage Features</h1>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Show or hide features for all users. Admins always see every feature.
        </p>
      </div>

      <div className="card divide-y divide-gray-100 dark:divide-gray-800 p-0 overflow-hidden">
        {FEATURES.map((feature) => {
          const enabled = formData[feature.key];
          return (
            <div
              key={feature.key}
              className="flex items-center justify-between gap-3 p-3 sm:p-4"
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <span className="text-lg sm:text-xl shrink-0">{feature.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold">{feature.name}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                    {feature.description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => handleToggle(feature.key)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  enabled ? "bg-success" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex-1 rounded-lg bg-accent px-4 py-3 sm:py-2.5 text-sm sm:text-base font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>
        <button
          onClick={handleReset}
          disabled={saving || !hasChanges}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 sm:py-2.5 text-sm sm:text-base font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          ↻ Reset
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Changes take effect for users on their next page load (up to ~1 minute for cached pages).
      </p>
    </main>
  );
}
