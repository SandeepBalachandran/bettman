"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SiteNavFlags = {
  navFixtures: boolean;
  navMyPredictions: boolean;
  navLeaderboard: boolean;
  rewardsPage: boolean;
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNavLinks({
  flags,
  isAdmin,
}: {
  readonly flags: SiteNavFlags;
  readonly isAdmin: boolean;
}) {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `rounded-full px-3 py-1 transition ${
      isActive(pathname, href)
        ? "bg-white/25 font-semibold shadow-inner"
        : "hover:bg-white/20"
    }`;

  return (
    <nav className="hidden items-center gap-x-4 gap-y-1 text-sm font-medium sm:flex">
      {flags.navFixtures && (
        <Link href="/fixtures" className={linkClass("/fixtures")}>
          Fixtures
        </Link>
      )}
      {flags.navMyPredictions && (
        <Link href="/my-predictions" className={linkClass("/my-predictions")}>
          My Predictions
        </Link>
      )}
      {flags.navLeaderboard && (
        <Link href="/leaderboard" className={linkClass("/leaderboard")}>
          Leaderboard
        </Link>
      )}
      {flags.rewardsPage && (
        <Link href="/rewards" className={linkClass("/rewards")}>
          Rewards
        </Link>
      )}
      {isAdmin && (
        <Link
          href="/admin"
          className={`rounded-full px-3 py-1 font-semibold transition ${
            isActive(pathname, "/admin")
              ? "bg-white text-highlight shadow-inner"
              : "bg-highlight text-highlight-foreground hover:brightness-105"
          }`}
        >
          Admin
        </Link>
      )}
    </nav>
  );
}
