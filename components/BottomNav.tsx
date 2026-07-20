import Link from "next/link";

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

export function BottomNav({
  isAdmin,
  visible = ALL_VISIBLE,
}: {
  readonly isAdmin: boolean;
  readonly visible?: BottomNavVisibility;
}) {
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
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-white/90 transition hover:text-white active:scale-95"
        >
          <span className="text-lg leading-none">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
