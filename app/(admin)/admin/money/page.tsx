import Link from "next/link";
import { requireAdmin } from "@/lib/authz";
import { getAllUsersMoney } from "@/lib/leaderboard-money";
import { formatPoints, formatPointsDelta } from "@/lib/format-points";
import { MoneyRulesCard } from "@/components/MoneyRulesCard";

export const metadata = {
  title: "Admin Points - Bettman",
};

/** Season points per player: gained, lost and total (computed by lib/money.ts). */
export default async function AdminPointsPage() {
  await requireAdmin();

  const players = await getAllUsersMoney();
  const sortedPlayers = [...players].sort((a, b) => b.currentBalance - a.currentBalance);

  const totalGained = players.reduce((sum, p) => sum + p.moneyWon, 0);
  const totalLost = players.reduce((sum, p) => sum + p.moneyLost, 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="gradient-text">Points</h1>
        <Link href="/admin/settlement" className="btn btn-outline h-9 self-start px-4 text-sm">
          Per-match points log
        </Link>
      </div>

      <MoneyRulesCard />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SummaryCard label="Players" value={String(players.length)} />
        <SummaryCard label="Points gained" value={formatPoints(totalGained)} color="success" />
        <SummaryCard label="Points lost" value={formatPoints(totalLost)} color="danger" />
        <SummaryCard
          label="Leader"
          value={sortedPlayers[0] ? formatPoints(sortedPlayers[0].currentBalance) : "—"}
        />
      </div>

      {sortedPlayers.length === 0 ? (
        <p className="text-sm text-gray-500">No players yet.</p>
      ) : (
        <div className="table-card overflow-x-auto">
          <table className="responsive-table w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2 px-2 sm:py-2.5 sm:px-3 font-semibold">Player</th>
                <th className="py-2 px-2 sm:py-2.5 sm:px-3 font-semibold">Gained</th>
                <th className="py-2 px-2 sm:py-2.5 sm:px-3 font-semibold">Lost</th>
                <th className="py-2 px-2 sm:py-2.5 sm:px-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player) => (
                <tr key={player.userId}>
                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 font-medium" data-label="Player">
                    <span className="truncate">{player.name}</span>
                  </td>
                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-success text-right sm:text-left font-medium" data-label="Gained">
                    {formatPointsDelta(player.moneyWon)}
                  </td>
                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-danger text-right sm:text-left font-medium" data-label="Lost">
                    {formatPointsDelta(-player.moneyLost)}
                  </td>
                  <td
                    className={`py-2 px-2 sm:py-2.5 sm:px-3 font-bold text-right sm:text-left ${
                      player.currentBalance >= 0 ? "text-success" : "text-danger"
                    }`}
                    data-label="Total"
                  >
                    {formatPoints(player.currentBalance)}
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
      <p className="font-display text-2xl leading-tight wrap-break-word sm:text-3xl">{value}</p>
    </div>
  );
}
