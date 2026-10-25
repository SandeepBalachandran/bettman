"use client";

import { useEffect, useState } from "react";
import { getCountdown } from "@/lib/countdown";

export function FirstMatchCountdown({
  kickoffTime,
  matchName,
}: {
  readonly kickoffTime: string;
  /** e.g. "Kerala Blasters vs Mumbai City" */
  readonly matchName: string;
}) {
  const [label, setLabel] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const target = new Date(kickoffTime);

    const update = () => {
      const countdown = getCountdown(target);
      if (countdown.hasStarted) {
        setHasStarted(true);
        return;
      }
      setLabel(
        countdown.days > 0
          ? `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`
          : `${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [kickoffTime]);

  // Hidden once this match kicks off; the next page load counts down to the
  // following match instead.
  if (hasStarted || !label) {
    return null;
  }

  return (
    <div className="card gradient-header border-0 p-4 text-center text-white shadow-xl">
      <p className="text-xs font-medium tracking-wide text-white/80 uppercase">Next match kicks off in</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{label}</p>
      <p className="mt-1 text-xs text-white/90">{matchName}</p>
    </div>
  );
}
