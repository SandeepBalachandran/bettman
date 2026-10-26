/**
 * One-off, additive backfill for the multi-competition fields: tags every
 * pre-existing Match as the World Cup and fills the new draw flags with their
 * defaults. Only sets fields that are missing — never overwrites or deletes —
 * so it's safe to re-run, and it's what keeps the World Cup data restorable
 * via ACTIVE_COMPETITION=WC.
 *
 *   npx tsx scripts/backfill-competition.ts
 */
import { prisma } from "@/lib/prisma";

async function setMissing(collection: string, field: string, value: string | boolean) {
  const result = (await prisma.$runCommandRaw({
    update: collection,
    updates: [{ q: { [field]: { $exists: false } }, u: { $set: { [field]: value } }, multi: true }],
  })) as { n: number; nModified: number };
  console.log(`${collection}.${field}: set on ${result.nModified} document(s)`);
}

async function main() {
  const dbName = process.env.DATABASE_URL?.match(/mongodb\.net\/([^?]+)/)?.[1];
  console.log(`Database: ${dbName ?? "(unknown)"}`);

  await setMissing("Match", "competition", "WC");
  await setMissing("Match", "isDraw", false);
  await setMissing("Prediction", "predictedDraw", false);
  await setMissing("FeatureFlags", "fixturesChronological", true);

  const byCompetition = await prisma.match.groupBy({ by: ["competition"], _count: true });
  console.log("Matches per competition:", byCompetition.map((c) => `${c.competition}=${c._count}`).join(", "));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
