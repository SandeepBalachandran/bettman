import { requireAdmin } from "@/lib/authz";
import { getSettlementLog } from "@/lib/money";
import { formatMoney } from "@/lib/format-money";

export const metadata = {
  title: "Settlement Audit - Bettman",
};

export default async function AdminSettlementPage() {
  await requireAdmin();

  const settlementLog = await getSettlementLog();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold gradient-text">Settlement Audit</h1>

      {settlementLog.length === 0 ? (
        <p className="text-sm text-gray-500">
          No finished matches yet. Settlement rows appear once matches are finished.
        </p>
      ) : (
        <div className="table-card overflow-x-auto">
          <table className="responsive-table w-full min-w-140 text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2.5 pr-2 pl-3">Player</th>
                <th className="py-2.5 pr-2">Match</th>
                <th className="py-2.5 pr-3">Money Earned/Lost</th>
              </tr>
            </thead>
            <tbody>
              {settlementLog.map((entry) => (
                <tr key={`${entry.userId}-${entry.matchId}`}>
                  <td className="py-2 pr-2 pl-3 font-medium" data-label="Player">
                    {entry.userName}
                  </td>
                  <td className="py-2 pr-2" data-label="Match">
                    {entry.matchName}
                  </td>
                  <td
                    className={`py-2 pr-3 font-bold ${
                      entry.amount >= 0 ? "text-success" : "text-danger"
                    }`}
                    data-label="Money Earned/Lost"
                  >
                    {entry.amount > 0 ? "+" : ""}
                    {formatMoney(entry.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
