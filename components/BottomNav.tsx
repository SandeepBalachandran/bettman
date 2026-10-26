"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type BottomNavItem = {
  href: string;
  label: string;
  /** SVG path data for a 24×24 stroke icon. */
  icon: string;
};

export type BottomNavVisibility = {
  fixtures: boolean;
  myPredictions: boolean;
  leaderboard: boolean;
  rewards: boolean;
};

const ALL_VISIBLE: BottomNavVisibility = {
  fixtures: true,
  myPredictions: true,
  leaderboard: true,
  rewards: true,
};

const ICONS = {
  fixtures: "M3 10.5 12 3l9 7.5V21H3z",
  myPredictions: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
  leaderboard: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4",
  rewards: "M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z",
  admin: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Floating pill nav (phones): the active item expands into a lime pill with its label. */
export function BottomNav({
  isAdmin,
  visible = ALL_VISIBLE,
}: {
  readonly isAdmin: boolean;
  readonly visible?: BottomNavVisibility;
}) {
  const pathname = usePathname();

  const items: BottomNavItem[] = [];
  if (visible.fixtures) items.push({ href: "/fixtures", label: "Fixtures", icon: ICONS.fixtures });
  if (visible.myPredictions) items.push({ href: "/my-predictions", label: "My Picks", icon: ICONS.myPredictions });
  if (visible.leaderboard) items.push({ href: "/leaderboard", label: "Ranks", icon: ICONS.leaderboard });
  if (visible.rewards) items.push({ href: "/rewards", label: "Rewards", icon: ICONS.rewards });
  if (isAdmin) items.push({ href: "/admin", label: "Admin", icon: ICONS.admin });

  return (
    <nav
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-50 flex justify-center px-3 sm:hidden"
      aria-label="Primary"
    >
      <div className="flex items-center gap-1.5 rounded-full bg-[#1c1c1c]/95 p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.6)] ring-1 ring-white/10 backdrop-blur">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={`flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold transition active:scale-95 ${
                active
                  ? "bg-accent px-5 text-accent-foreground"
                  : "w-12 bg-white/[0.06] text-white/75 hover:text-white"
              }`}
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {active && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
