"use client";

import { useEffect, useState } from "react";
import { getCountdown } from "@/lib/countdown";

export function CountdownBadge({ kickoffTime }: { readonly kickoffTime: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const target = new Date(kickoffTime);

    const update = () => {
      const { hasStarted, days, hours, minutes, seconds } = getCountdown(target);
      if (hasStarted) {
        setLabel("Kicked off");
        return;
      }
      setLabel(
        days > 0
          ? `${days}d ${hours}h ${minutes}m`
          : `${hours}h ${minutes}m ${seconds}s`
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [kickoffTime]);

  if (!label) {
    return null;
  }

  return (
    <span className="rounded-full bg-highlight/20 px-2 py-0.5 text-xs font-medium text-highlight-foreground dark:text-highlight">
      {label}
    </span>
  );
}
