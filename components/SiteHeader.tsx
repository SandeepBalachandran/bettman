import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BottomNav } from "@/components/BottomNav";

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
              href="/money"
              className="rounded-full px-3 py-1 transition hover:bg-white/20"
            >
              Money
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

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="hidden text-xs text-white/80 sm:inline">{session.user.name}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-full border border-white/40 px-3 py-1 text-xs transition hover:bg-white/20"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <BottomNav isAdmin={session.user.role === "ADMIN"} />
    </>
  );
}
