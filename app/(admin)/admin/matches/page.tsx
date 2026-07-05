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
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold gradient-text">Manage Matches</h1>
        <div className="flex flex-wrap gap-2">
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
