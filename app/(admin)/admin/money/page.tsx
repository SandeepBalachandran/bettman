import Link from "next/link";
import { requireAdmin } from "@/lib/authz";
import { getAllUsersMoney } from "@/lib/leaderboard-money";
import { formatMoney } from "@/lib/format-money";
import { MoneyRulesCard } from "@/components/MoneyRulesCard";
import { buildUpiPayLink } from "@/lib/upi";

export const metadata = {
  title: "Admin Money Dashboard - Bettman",
};

export default async function AdminMoneyPage() {
  await requireAdmin();

  const players = await getAllUsersMoney();
  const sortedPlayers = [...players].sort((a, b) => b.currentBalance - a.currentBalance);

  const totalMoneyWon = players.reduce((sum, p) => sum + p.moneyWon, 0);
  const totalMoneyLost = players.reduce((sum, p) => sum + p.moneyLost, 0);
  const tournamentNet = totalMoneyWon - totalMoneyLost;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold gradient-text sm:text-2xl">Admin Money Dashboard</h1>
        <Link
          href="/admin/settlement"
          className="rounded-full bg-accent/10 px-3 py-1 text-sm text-accent self-start"
        >
          View settlement audit
        </Link>
      </div>

      <MoneyRulesCard />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SummaryCard label="Total Players" value={String(players.length)} />
        <SummaryCard label="Total Money Won" value={formatMoney(totalMoneyWon)} color="success" />
        <SummaryCard label="Total Money Lost" value={formatMoney(totalMoneyLost)} color="danger" />
        <SummaryCard
          label="Tournament Net"
          value={formatMoney(tournamentNet)}
          color={tournamentNet >= 0 ? "success" : "danger"}
        />
      </div>

      {sortedPlayers.length === 0 ? (
        <p className="text-sm text-gray-500">No players yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="text-left bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                <th className="py-2 px-2 sm:py-2.5 sm:px-3 font-semibold">Player</th>
                <th className="py-2 px-2 sm:py-2.5 sm:px-3 font-semibold">Won</th>
                <th className="py-2 px-2 sm:py-2.5 sm:px-3 font-semibold">Lost</th>
                <th className="py-2 px-2 sm:py-2.5 sm:px-3 font-semibold">Balance</th>
                <th className="hidden lg:table-cell py-2 px-2 sm:py-2.5 sm:px-3 font-semibold">Max Win</th>
                <th className="hidden lg:table-cell py-2 px-2 sm:py-2.5 sm:px-3 font-semibold">Max Loss</th>
                <th className="py-2 px-2 sm:py-2.5 sm:px-3 font-semibold">Settle</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player) => (
                <tr key={player.userId} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 font-medium" data-label="Player">
                    <span className="line-clamp-2">{player.name}</span>
                  </td>
                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-success text-right sm:text-left font-medium" data-label="Won">
                    {formatMoney(player.moneyWon)}
                  </td>
                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-danger text-right sm:text-left font-medium" data-label="Lost">
                    {formatMoney(player.moneyLost)}
                  </td>
                  <td
                    className={`py-2 px-2 sm:py-2.5 sm:px-3 font-bold text-right sm:text-left ${
                      player.currentBalance >= 0 ? "text-success" : "text-danger"
                    }`}
                    data-label="Balance"
                  >
                    {formatMoney(player.currentBalance)}
                  </td>
                  <td className="hidden lg:table-cell py-2 px-2 sm:py-2.5 sm:px-3" data-label="Max Win">
                    {formatMoney(player.pendingExposure.maxWin)}
                  </td>
                  <td className="hidden lg:table-cell py-2 px-2 sm:py-2.5 sm:px-3" data-label="Max Loss">
                    {formatMoney(player.pendingExposure.maxLoss)}
                  </td>
                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-right sm:text-left" data-label="Settle">
                    {player.currentBalance > 0 && player.upiId ? (
                      <a
                        href={buildUpiPayLink({
                          upiId: player.upiId,
                          payeeName: player.name,
                          amount: player.currentBalance,
                          note: "Bettman settlement",
                        })}
                        className="btn btn-primary text-xs sm:text-sm whitespace-nowrap"
                      >
                        Pay
                      </a>
                    ) : player.currentBalance > 0 ? (
                      <span className="text-xs text-gray-400">No UPI</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
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

const SUMMARY_CARD_COLORS = {
  neutral: "border-accent text-accent",
  success: "border-success text-success",
  danger: "border-danger text-danger",
} as const;

function SummaryCard({
  label,
  value,
  color = "neutral",
}: {
  readonly label: string;
  readonly value: string;
  readonly color?: keyof typeof SUMMARY_CARD_COLORS;
}) {
  return (
    <div className={`card card-interactive border-t-4 p-3 sm:p-4 ${SUMMARY_CARD_COLORS[color]}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold wrap-break-word sm:text-xl">{value}</p>
    </div>
  );
}
