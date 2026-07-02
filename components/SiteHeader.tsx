import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

export async function SiteHeader() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return (
    <header className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <Link href="/fixtures" className="font-semibold text-accent">
          Fixtures
        </Link>
        <Link href="/my-predictions">My Predictions</Link>
        <Link href="/leaderboard">Leaderboard</Link>
        {session.user.role === "ADMIN" && (
          <Link href="/admin" className="font-medium text-highlight">
            Admin
          </Link>
        )}
      </nav>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <span className="text-xs text-gray-500">{session.user.name}</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="text-xs underline">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
