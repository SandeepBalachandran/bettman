import Link from "next/link";
import { auth } from "@/lib/auth";
import { ProfileMenu } from "@/components/ProfileMenu";
import { BottomNav } from "@/components/BottomNav";
import { DailyRewardClaim } from "@/components/DailyRewardClaim";

export async function SiteHeader() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return (
    <>
      <header className="gradient-header flex items-center justify-between gap-2 px-4 py-3 text-white shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-tight">🏆 Bettman</span>
          <nav className="hidden items-center gap-x-4 gap-y-1 text-sm font-medium sm:flex">
            <Link href="/fixtures" className="rounded-full px-3 py-1 transition hover:bg-white/20">
              Fixtures
            </Link>
            <Link
              href="/my-predictions"
              className="rounded-full px-3 py-1 transition hover:bg-white/20"
            >
              My Predictions
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-full px-3 py-1 transition hover:bg-white/20"
            >
              Leaderboard
            </Link>
            <Link
              href="/rewards"
              className="rounded-full px-3 py-1 transition hover:bg-white/20"
            >
              Rewards
            </Link>
            {session.user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="rounded-full bg-highlight px-3 py-1 font-semibold text-highlight-foreground transition hover:brightness-105"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <DailyRewardClaim />
          <ProfileMenu name={session.user.name ?? "?"} avatarUrl={session.user.avatarUrl} />
        </div>
      </header>

      <BottomNav isAdmin={session.user.role === "ADMIN"} />
    </>
  );
}
