import Link from "next/link";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function AdminCoinsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ userId?: string; type?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const where: any = {};
  if (params.userId) where.userId = params.userId;
  if (params.type) where.type = params.type;

  const [transactions, users, totalCount] = await Promise.all([
    prisma.coinTransaction.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.findMany({
      where: { role: "USER", active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.coinTransaction.count({ where }),
  ]);

  const typeStats = await prisma.coinTransaction.groupBy({
    by: ["type"],
    _count: true,
  });

  const reasonStats = await prisma.coinTransaction.groupBy({
    by: ["reason"],
    _count: true,
    orderBy: {
      _count: { reason: "desc" },
    },
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="gradient-text">Coin Transactions</h1>
        <p className="text-xs text-gray-500 sm:text-sm">
          Total: <span className="font-semibold">{totalCount}</span> transactions · showing the latest 100
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {typeStats.map((stat) => (
          <div
            key={stat.type}
            className="card p-3 sm:p-4 border-t-2"
            style={{
              borderTopColor:
                stat.type === "spend"
                  ? "var(--color-danger)"
                  : "var(--color-success)",
            }}
          >
            <p className="text-xs text-gray-600 dark:text-gray-400 capitalize font-medium">
              {stat.type}
            </p>
            <p className="font-display mt-1 text-3xl leading-none">{stat._count}</p>
          </div>
        ))}
      </div>

      {/* Top Reasons */}
      <div className="card space-y-3 p-4 sm:p-5">
        <h2 className="font-display text-2xl leading-none">Top Reasons</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
          {reasonStats.slice(0, 8).map((stat) => (
            <div key={stat.reason} className="rounded-xl bg-white/[0.04] p-3 text-xs sm:text-sm">
              <p className="font-medium truncate">{stat.reason}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {stat._count}×
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card space-y-4 p-4 sm:p-5">
        <h2 className="font-display text-2xl leading-none">Transactions</h2>
        <form className="grid grid-cols-2 gap-2 sm:flex sm:gap-3" method="get">
          <select
            name="userId"
            defaultValue={params.userId || ""}
            className="input-pill col-span-2 sm:flex-1"
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <select
            name="type"
            defaultValue={params.type || ""}
            className="input-pill col-span-2 sm:w-36"
          >
            <option value="">All Types</option>
            <option value="spend">Spend</option>
            <option value="award">Award</option>
          </select>
          <button type="submit" className="btn btn-primary h-10 px-5 text-sm">
            Filter
          </button>
          <Link href="/admin/coins" className="btn btn-outline h-10 px-5 text-sm">
            Clear
          </Link>
        </form>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">No transactions found</div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{tx.user.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {tx.reason} · {new Date(tx.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      tx.type === "spend" ? "bg-danger/15 text-danger" : "bg-success/15 text-success"
                    }`}
                  >
                    {tx.type === "spend" ? "-" : "+"}
                    {tx.amount}
                  </span>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {tx.balanceBefore} → {tx.balanceAfter}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
