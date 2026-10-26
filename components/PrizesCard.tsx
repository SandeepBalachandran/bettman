import type { PrizeSettings } from "@/lib/prizes";

const PLACES = [
  { medal: "🥇", label: "1st" },
  { medal: "🥈", label: "2nd" },
  { medal: "🥉", label: "3rd" },
];

/** Season prizes: Amazon vouchers for the top 3 at the end of the season. */
export function PrizesCard({
  settings,
  seasonName,
  compact = false,
}: {
  readonly settings: PrizeSettings;
  readonly seasonName: string;
  /** Shorter version without the rules (landing page). */
  readonly compact?: boolean;
}) {
  if (!settings.enabled) return null;

  return (
    <section className="card space-y-4 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-xl" aria-hidden="true">
          🎁
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-none uppercase sm:text-3xl">Season prizes</h2>
          <p className="mt-1 text-sm text-gray-400">
            Finish in the top 3 of {seasonName} and win an Amazon voucher.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PLACES.map((place, index) => (
          <div
            key={place.label}
            className={`rounded-2xl p-3 text-center ${index === 0 ? "bg-accent text-accent-foreground" : "bg-white/[0.06]"}`}
          >
            <p className="text-lg leading-none" aria-hidden="true">
              {place.medal}
            </p>
            <p className="font-display mt-2 text-3xl leading-none">₹{settings.amounts[index]}</p>
            <p className={`mt-1 text-[11px] font-medium ${index === 0 ? "" : "text-gray-400"}`}>{place.label} place</p>
          </div>
        ))}
      </div>

      {!compact && (
        <ul className="space-y-1 text-xs leading-relaxed text-gray-400">
          <li>• Ranked by the leaderboard at the end of the season.</li>
          <li>
            • Ties go to most correct results, then most goals from your scorer picks, then whoever joined first.
          </li>
          {settings.minPredictions > 0 && (
            <li>• You need to have predicted at least {settings.minPredictions} matches to win.</li>
          )}
          <li>• Vouchers are emailed to your account email within a week of the final match. One account per person.</li>
        </ul>
      )}
    </section>
  );
}
