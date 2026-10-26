"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/predictions", label: "Predictions" },
  { href: "/admin/users", label: "Players" },
  { href: "/admin/money", label: "Finance" },
  { href: "/admin/coins", label: "Coins" },
  { href: "/admin/rewards", label: "Rewards" },
  { href: "/admin/prizes", label: "Prizes" },
  { href: "/admin/quiz", label: "Quiz" },
  { href: "/admin/sync", label: "Sync" },
  { href: "/admin/features", label: "Features" },
];

/** Admin section switcher: one swipeable row of pills on phones, wrapping on wider screens. */
export function AdminNav() {
  const pathname = usePathname();
  const rowRef = useRef<HTMLDivElement>(null);

  // Keep the current section's pill visible in the swipeable row.
  useEffect(() => {
    const row = rowRef.current;
    const active = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (row && active) row.scrollLeft = active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2;
  }, [pathname]);

  return (
    <nav aria-label="Admin sections" className="space-y-3">
      <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Admin</p>
      <div ref={rowRef} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {LINKS.map(({ href, label }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "bg-white/[0.06] text-gray-300 hover:bg-white/10"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
