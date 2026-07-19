"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface RewardConfig {
  id: string;
  boosterCost: number;
  thirdScorerCost: number;
  fourthScorerCost: number;
  updatedAt: string;
}

export default function AdminRewardsPage() {
  const [config, setConfig] = useState<RewardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    boosterCost: 100,
    thirdScorerCost: 50,
    fourthScorerCost: 150,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/reward-config");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setConfig(data);
      setFormData({
        boosterCost: data.boosterCost,
        thirdScorerCost: data.thirdScorerCost,
        fourthScorerCost: data.fourthScorerCost,
      });
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load reward configuration";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData((prev) => ({
      ...prev,
      [field]: Math.max(0, numValue),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/reward-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }

      const updatedConfig = await response.json();
      setConfig(updatedConfig);
      toast.success("Reward configuration updated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setFormData({
        boosterCost: config.boosterCost,
        thirdScorerCost: config.thirdScorerCost,
        fourthScorerCost: config.fourthScorerCost,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (error && !config) {
    return (
      <main className="mx-auto max-w-2xl space-y-8 p-4 sm:p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold gradient-text">Manage Rewards</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure pricing for all reward items
          </p>
        </div>

        <div className="card space-y-4 border-l-4 border-danger bg-danger/5 p-6">
          <p className="font-semibold text-danger">Failed to load configuration</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchConfig();
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
        <h1 className="text-xl sm:text-2xl font-bold gradient-text">Manage Rewards</h1>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Configure pricing for all reward items
        </p>
      </div>

      <div className="card space-y-3 sm:space-y-5 p-3 sm:p-5">
        {/* 2x Points Booster */}
        <div className="space-y-2 sm:space-y-3 border-b border-gray-200 pb-4 sm:pb-6 dark:border-gray-800">
          <label className="block text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
            ⚡ 2x Points Booster Cost
          </label>
          <p className="text-xs text-gray-500">
            Price users pay to activate 2x points multiplier
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={formData.boosterCost}
              onChange={(e) => handleChange("boosterCost", e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm sm:text-base dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 whitespace-nowrap">💰 coins</span>
          </div>
        </div>

        {/* 3rd Scorer Slot */}
        <div className="space-y-2 sm:space-y-3 border-b border-gray-200 pb-4 sm:pb-6 dark:border-gray-800">
          <label className="block text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
            🔵 3rd Scorer Slot Cost
          </label>
          <p className="text-xs text-gray-500">
            Price users pay to unlock the ability to predict a 3rd goal scorer
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={formData.thirdScorerCost}
              onChange={(e) => handleChange("thirdScorerCost", e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm sm:text-base dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 whitespace-nowrap">💰 coins</span>
          </div>
        </div>

        {/* 4th Scorer Slot */}
        <div className="space-y-2 sm:space-y-3">
          <label className="block text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
            🔵 4th Scorer Slot Cost
          </label>
          <p className="text-xs text-gray-500">
            Price users pay to unlock the ability to predict a 4th goal scorer
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={formData.fourthScorerCost}
              onChange={(e) => handleChange("fourthScorerCost", e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm sm:text-base dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 whitespace-nowrap">💰 coins</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="card bg-accent/5 border-l-4 border-accent p-3 sm:p-5 space-y-2 sm:space-y-3">
        <p className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
          Current Configuration
        </p>
        <div className="space-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          <p>• Booster: <span className="font-semibold text-accent">{formData.boosterCost}</span> coins</p>
          <p>• 3rd Scorer: <span className="font-semibold text-accent">{formData.thirdScorerCost}</span> coins</p>
          <p>• 4th Scorer: <span className="font-semibold text-accent">{formData.fourthScorerCost}</span> coins</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-lg bg-accent px-4 py-3 sm:py-2.5 text-sm sm:text-base font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors touch-none"
        >
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>
        <button
          onClick={handleReset}
          disabled={saving}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 sm:py-2.5 text-sm sm:text-base font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors touch-none"
        >
          ↻ Reset
        </button>
      </div>

      {config && (
        <p className="text-xs text-gray-500 text-center">
          Last updated: {new Date(config.updatedAt).toLocaleString()}
        </p>
      )}
    </main>
  );
}
