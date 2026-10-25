/**
 * Season coin reset: sets every user's coin balance to STARTING_BALANCE and
 * logs a "season_reset" CoinTransaction per user (with balanceBefore), so the
 * previous balances stay on record and could be restored.
 *
 *   npx tsx --env-file=.env scripts/reset-coins.ts            # dry run
 *   npx tsx --env-file=.env scripts/reset-coins.ts --apply    # write
 */
import { prisma } from "@/lib/prisma";

const STARTING_BALANCE = 100;

async function main() {
  const apply = process.argv.includes("--apply");
  const dbName = process.env.DATABASE_URL?.match(/mongodb\.net\/([^?]+)/)?.[1];
  console.log(`Database: ${dbName ?? "(unknown)"}${apply ? "" : "  (dry run — pass --apply to write)"}`);

  const users = await prisma.user.findMany({
    select: { id: true, name: true, coinBalance: { select: { balance: true } } },
    orderBy: { name: "asc" },
  });

  for (const user of users) {
    const before = user.coinBalance?.balance ?? 0;
    console.log(`${user.name.padEnd(22)} ${String(before).padStart(5)} → ${STARTING_BALANCE}`);
    if (!apply || before === STARTING_BALANCE) continue;

    await prisma.$transaction([
      prisma.coinBalance.upsert({
        where: { userId: user.id },
        update: { balance: STARTING_BALANCE },
        create: { userId: user.id, balance: STARTING_BALANCE },
      }),
      prisma.coinTransaction.create({
        data: {
          userId: user.id,
          type: STARTING_BALANCE > before ? "award" : "spend",
          reason: "season_reset",
          amount: Math.abs(STARTING_BALANCE - before),
          balanceBefore: before,
          balanceAfter: STARTING_BALANCE,
        },
      }),
    ]);
  }

  console.log(apply ? `Reset ${users.length} user(s).` : "Dry run only — nothing written.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
