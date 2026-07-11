import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { AdminMatchRow } from "@/components/features/admin/AdminMatchRow";
import { SyncMatchesButton } from "@/components/features/admin/SyncMatchesButton";
import { SyncMatchResultsButton } from "@/components/features/admin/SyncMatchResultsButton";

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
    <main className="mx-auto max-w-5xl space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Manage Matches</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <SyncMatchResultsButton />
          <SyncMatchesButton />
        </div>
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-gray-500">
          No matches yet. Click &quot;Sync from live API&quot; above, or run{" "}
          <code>npx tsx scripts/sync-matches.ts WC</code>.
        </p>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <AdminMatchRow
              key={match.id}
              match={{
                id: match.id,
                round: match.round,
                homeTeam: {
                  id: match.homeTeam.id,
                  name: match.homeTeam.name,
                  flag: match.homeTeam.flag,
                },
                awayTeam: {
                  id: match.awayTeam.id,
                  name: match.awayTeam.name,
                  flag: match.awayTeam.flag,
                },
                // Sort alphabetically within each team, but keep the two teams as
                // separate blocks rather than interleaving them.
                players: [
                  ...[...match.homeTeam.players].sort((a, b) => a.name.localeCompare(b.name)),
                  ...[...match.awayTeam.players].sort((a, b) => a.name.localeCompare(b.name)),
                ].map((p) => ({
                  id: p.id,
                  name: p.name,
                  teamId: p.teamId,
                  photoUrl: p.photoUrl,
                  position: p.position,
                  jerseyNumber: p.jerseyNumber,
                })),
                kickoffTime: match.kickoffTime.toISOString(),
                status: match.status,
                locked: match.locked,
                winnerTeamId: match.winnerTeamId,
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
