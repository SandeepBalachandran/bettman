"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePrizeSettings } from "@/actions/prizes";
import type { PrizeSettings } from "@/lib/prizes";

export function PrizeSettingsForm({ settings }: { readonly settings: PrizeSettings }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [amounts, setAmounts] = useState(settings.amounts.map(String));
  const [minPredictions, setMinPredictions] = useState(String(settings.minPredictions));

  function save() {
    startTransition(async () => {
      try {
        await updatePrizeSettings({
          enabled,
          firstPrize: amounts[0],
          secondPrize: amounts[1],
          thirdPrize: amounts[2],
          minPredictions,
        });
        toast.success("Prize settings saved");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save");
      }
    });
  }

  return (
    <section className="card space-y-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl leading-none">Settings</h2>
          <p className="mt-1 text-xs text-gray-500">Players see these on the leaderboard, rewards and landing pages.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Show season prizes"
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            enabled ? "bg-success" : "bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {["🥇 1st", "🥈 2nd", "🥉 3rd"].map((label, index) => (
          <label key={label} className="space-y-1">
            <span className="text-xs font-medium text-gray-400">{label} (₹)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={amounts[index]}
              onChange={(e) => setAmounts((prev) => prev.map((v, i) => (i === index ? e.target.value : v)))}
              className="input-pill w-full"
            />
          </label>
        ))}
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-gray-400">Minimum matches predicted to be eligible (0 = no minimum)</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={minPredictions}
          onChange={(e) => setMinPredictions(e.target.value)}
          className="input-pill w-full"
        />
      </label>

      <button type="button" onClick={save} disabled={isPending} className="btn btn-primary h-11 w-full text-sm">
        {isPending ? "Saving..." : "Save prize settings"}
      </button>
    </section>
  );
}
