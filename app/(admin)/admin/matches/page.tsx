import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { AdminMatchRow } from "@/components/features/admin/AdminMatchRow";

export default async function AdminMatchesPage() {
  await requireAdmin();

  const matches = await prisma.match.findMany({
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
    },
    orderBy: { kickoffTime: "asc" },
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-accent">Manage Matches</h1>

      {matches.length === 0 ? (
        <p className="text-sm text-gray-500">
          No matches yet. Run <code>npx tsx scripts/sync-matches.ts WC</code>.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="w-full min-w-180 text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-2 pl-3">Round</th>
                <th className="py-2 pr-2">Match</th>
                <th className="py-2 pr-2">Kickoff</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Actions</th>
                <th className="py-2 pr-3">Finish</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <AdminMatchRow
                  key={match.id}
                  match={{
                    id: match.id,
                    round: match.round,
                    homeTeam: { id: match.homeTeam.id, name: match.homeTeam.name },
                    awayTeam: { id: match.awayTeam.id, name: match.awayTeam.name },
                    players: [...match.homeTeam.players, ...match.awayTeam.players].map((p) => ({
                      id: p.id,
                      name: p.name,
                      teamId: p.teamId,
                    })),
                    kickoffTime: match.kickoffTime.toISOString(),
                    status: match.status,
                    locked: match.locked,
                    winnerTeamId: match.winnerTeamId,
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
