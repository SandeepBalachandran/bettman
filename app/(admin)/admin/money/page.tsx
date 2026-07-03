import Link from "next/link";
import { requireAdmin } from "@/lib/authz";
import { getAllUsersMoney } from "@/lib/leaderboard-money";
import { formatMoney } from "@/lib/format-money";
import { MoneyRulesCard } from "@/components/MoneyRulesCard";

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
        <div className="table-card overflow-x-auto">
          <table className="responsive-table w-full min-w-180 text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2.5 pr-2 pl-3">Player</th>
                <th className="py-2.5 pr-2">Money Won</th>
                <th className="py-2.5 pr-2">Money Lost</th>
                <th className="py-2.5 pr-2">Current Balance</th>
                <th className="py-2.5 pr-2">Pending Max Win</th>
                <th className="py-2.5 pr-3">Pending Max Loss</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player) => (
                <tr key={player.userId}>
                  <td className="py-2 pr-2 pl-3 font-medium" data-label="Player">
                    {player.name}
                  </td>
                  <td className="py-2 pr-2 text-success" data-label="Money Won">
                    {formatMoney(player.moneyWon)}
                  </td>
                  <td className="py-2 pr-2 text-danger" data-label="Money Lost">
                    {formatMoney(player.moneyLost)}
                  </td>
                  <td
                    className={`py-2 pr-2 font-bold ${
                      player.currentBalance >= 0 ? "text-success" : "text-danger"
                    }`}
                    data-label="Current Balance"
                  >
                    {formatMoney(player.currentBalance)}
                  </td>
                  <td className="py-2 pr-2" data-label="Pending Max Win">
                    {formatMoney(player.pendingExposure.maxWin)}
                  </td>
                  <td className="py-2 pr-3" data-label="Pending Max Loss">
                    {formatMoney(player.pendingExposure.maxLoss)}
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
