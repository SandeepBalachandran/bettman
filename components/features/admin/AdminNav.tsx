import Link from "next/link";

export function AdminNav() {
  return (
    <div className="flex flex-col gap-2 sm:gap-3 pb-4 sm:pb-6 border-b border-[color-mix(in_srgb,var(--foreground)_8%,transparent)]">
      <h1 className="text-lg sm:text-2xl font-bold gradient-text">Admin Dashboard</h1>
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2 md:flex md:flex-wrap text-xs">
        <Link href="/admin/users" className="rounded-full bg-accent/10 px-2 py-0.5 sm:px-3 sm:py-1 text-center text-accent hover:bg-accent/15 transition-colors line-clamp-1">
          Players
        </Link>
        <Link
          href="/admin/predictions"
          className="rounded-full bg-accent/10 px-2 py-0.5 sm:px-3 sm:py-1 text-center text-accent hover:bg-accent/15 transition-colors line-clamp-1"
        >
          Predict
        </Link>
        <Link href="/admin/money" className="rounded-full bg-accent/10 px-2 py-0.5 sm:px-3 sm:py-1 text-center text-accent hover:bg-accent/15 transition-colors line-clamp-1">
          Finance
        </Link>
        <Link href="/admin/rewards" className="rounded-full bg-accent/10 px-2 py-0.5 sm:px-3 sm:py-1 text-center text-accent hover:bg-accent/15 transition-colors line-clamp-1">
          Rewards
        </Link>
        <Link href="/admin/quiz" className="rounded-full bg-accent/10 px-2 py-0.5 sm:px-3 sm:py-1 text-center text-accent hover:bg-accent/15 transition-colors line-clamp-1">
          Quiz
        </Link>
        <Link href="/admin/coins" className="rounded-full bg-accent/10 px-2 py-0.5 sm:px-3 sm:py-1 text-center text-accent hover:bg-accent/15 transition-colors line-clamp-1">
          Coins
        </Link>
      </div>
    </div>
  );
}
