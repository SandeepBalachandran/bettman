import { requireAdmin } from "@/lib/authz";
import { getSettlementLog } from "@/lib/money";
import { formatPointsDelta } from "@/lib/format-points";

export const metadata = {
  title: "Points Log - Bettman",
};

export default async function AdminSettlementPage() {
  await requireAdmin();

  const settlementLog = await getSettlementLog();

  return (
    <div className="space-y-5 sm:space-y-6">
      <h1 className="gradient-text">Points Log</h1>

      {settlementLog.length === 0 ? (
        <p className="text-sm text-gray-500">
          No finished matches yet. Rows appear once matches are finished.
        </p>
      ) : (
        <div className="table-card overflow-x-auto">
          <table className="responsive-table w-full min-w-140 text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2.5 pr-2 pl-3">Player</th>
                <th className="py-2.5 pr-2">Match</th>
                <th className="py-2.5 pr-3">Points</th>
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
                    data-label="Points"
                  >
                    {formatPointsDelta(entry.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
