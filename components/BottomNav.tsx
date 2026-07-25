"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type BottomNavItem = {
  href: string;
  label: string;
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

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav({
  isAdmin,
  visible = ALL_VISIBLE,
}: {
  readonly isAdmin: boolean;
  readonly visible?: BottomNavVisibility;
}) {
  const pathname = usePathname();

  const items: BottomNavItem[] = [];
  if (visible.fixtures) items.push({ href: "/fixtures", label: "Fixtures", icon: "⚽" });
  if (visible.myPredictions) items.push({ href: "/my-predictions", label: "My Picks", icon: "📝" });
  if (visible.leaderboard) items.push({ href: "/leaderboard", label: "Ranks", icon: "🏆" });
  if (visible.rewards) items.push({ href: "/rewards", label: "Rewards", icon: "🎁" });
  if (isAdmin) items.push({ href: "/admin", label: "Admin", icon: "⚙️" });

  return (
    <nav
      className="gradient-header fixed inset-x-0 bottom-0 z-50 flex items-stretch justify-around border-t border-white/20 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.15)] sm:hidden"
      aria-label="Primary"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition active:scale-95 ${
              active ? "text-white" : "text-white/70 hover:text-white"
            }`}
          >
            {active && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-white" />
            )}
            <span
              className={`text-lg leading-none transition-transform ${active ? "scale-110" : ""}`}
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
