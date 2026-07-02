import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import type { Round } from "@prisma/client";

const ROUND_ORDER: Round[] = ["ROUND_OF_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];

const ROUND_LABELS: Record<Round, string> = {
  ROUND_OF_16: "Round of 16",
  QUARTER_FINALS: "Quarter Finals",
  SEMI_FINALS: "Semi Finals",
  FINAL: "Final",
};

export default async function MyPredictionsPage() {
  const user = await requireAuth();

  const predictions = await prisma.prediction.findMany({
    where: { userId: user.id },
    include: {
      match: { include: { homeTeam: true, awayTeam: true } },
      winnerTeam: true,
      scorers: { include: { player: true } },
    },
    orderBy: { match: { kickoffTime: "asc" } },
  });

  const byRound = new Map<Round, typeof predictions>();
  for (const prediction of predictions) {
    const existing = byRound.get(prediction.match.round) ?? [];
    existing.push(prediction);
    byRound.set(prediction.match.round, existing);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">My Predictions</h1>

      {predictions.length === 0 && (
        <p className="text-sm text-gray-500">
          You haven&apos;t made any predictions yet.{" "}
          <Link href="/fixtures" className="underline">
            View fixtures
          </Link>
        </p>
      )}

      {ROUND_ORDER.map((round) => {
        const roundPredictions = byRound.get(round);
        if (!roundPredictions || roundPredictions.length === 0) {
          return null;
        }

        return (
          <section key={round} className="space-y-3">
            <h2 className="text-lg font-medium">{ROUND_LABELS[round]}</h2>
            <div className="space-y-2">
              {roundPredictions.map((prediction) => {
                const isLocked =
                  prediction.match.locked ||
                  prediction.match.kickoffTime.getTime() <= Date.now();

                return (
                  <Link
                    key={prediction.id}
                    href={`/match/${prediction.match.id}`}
                    className="block rounded border p-3 text-sm hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {prediction.match.homeTeam.name} vs {prediction.match.awayTeam.name}
                      </span>
                      {isLocked && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-gray-500">
                      Winner: {prediction.winnerTeam.name} · Scorers:{" "}
                      {prediction.scorers.length > 0
                        ? prediction.scorers.map((s) => s.player.name).join(", ")
                        : "None"}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
