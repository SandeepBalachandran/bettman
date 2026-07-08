import { prisma } from "@/lib/prisma";
import { calculateMatchPoints } from "@/lib/scoring";
import { calculateMatchMoney } from "@/lib/money";
import { moneyConfig } from "@/lib/money-config";

async function main() {
  // Get all users and finished matches
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: { id: true, name: true },
  });

  const finishedMatches = await prisma.match.findMany({
    where: { status: "FINISHED" },
    include: {
      homeTeam: true,
      awayTeam: true,
      scorers: true,
      predictions: { include: { scorers: true } },
    },
    orderBy: { kickoffTime: "asc" },
  });

  // Calculate per-user breakdown
  const breakdown = new Map<string, {
    name: string;
    totalWinnerPoints: number;
    totalScorerPoints: number;
    totalMoney: number;
    matches: Array<{
      matchName: string;
      prediction: string;
      result: string;
      winnerPoints: number;
      scorerPoints: number;
      money: number;
    }>;
  }>();

  for (const user of users) {
    breakdown.set(user.id, {
      name: user.name,
      totalWinnerPoints: 0,
      totalScorerPoints: 0,
      totalMoney: 0,
      matches: [],
    });
  }

  // Process each finished match
  for (const match of finishedMatches) {
    const matchName = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
    const actualScorerPlayerIds = match.scorers.map((s) => s.playerId);

    for (const prediction of match.predictions) {
      const entry = breakdown.get(prediction.userId);
      if (!entry) continue;

      const points = calculateMatchPoints(
        {
          winnerTeamId: prediction.winnerTeamId,
          scorerPlayerIds: prediction.scorers.map((s) => s.playerId),
        },
        { winnerTeamId: match.winnerTeamId, wonOnPenalties: match.wonOnPenalties },
        actualScorerPlayerIds
      );

      const money = calculateMatchMoney(
        {
          winnerTeamId: prediction.winnerTeamId,
          scorerPlayerIds: prediction.scorers.map((s) => s.playerId),
        },
        { winnerTeamId: match.winnerTeamId, wonOnPenalties: match.wonOnPenalties },
        actualScorerPlayerIds,
        moneyConfig
      );

      // Determine predicted winner
      const predictedWinner = match.homeTeam.id === prediction.winnerTeamId
        ? match.homeTeam.name
        : match.awayTeam.name;

      const actualWinner = match.winnerTeamId === match.homeTeam.id
        ? match.homeTeam.name
        : match.winnerTeamId === match.awayTeam.id
        ? match.awayTeam.name
        : "TBD";

      const predictedScorerNames = prediction.scorers.map(s => s.playerId).join(", ");
      const actualScorerNames = match.scorers.map(s => s.playerId).join(", ");

      entry.totalWinnerPoints += points.winnerPoints;
      entry.totalScorerPoints += points.scorerPoints;
      entry.totalMoney += money.total;
      entry.matches.push({
        matchName,
        prediction: `${predictedWinner} + [${predictedScorerNames}]`,
        result: `${actualWinner} + [${actualScorerNames}]`,
        winnerPoints: points.winnerPoints,
        scorerPoints: points.scorerPoints,
        money: money.total,
      });
    }
  }

  // Display results
  console.log("\n========== LEADERBOARD BREAKDOWN ==========\n");

  // Sort by total points
  const sorted = Array.from(breakdown.values()).sort(
    (a, b) => (b.totalWinnerPoints + b.totalScorerPoints) - (a.totalWinnerPoints + a.totalScorerPoints)
  );

  for (const entry of sorted) {
    console.log(`\n📊 ${entry.name}`);
    console.log(`   Total: ${entry.totalWinnerPoints + entry.totalScorerPoints} pts | ${moneyConfig.currencySymbol}${entry.totalMoney}`);
    console.log(`   W: +${entry.totalWinnerPoints} | S: +${entry.totalScorerPoints}`);
    console.log(`   Matches:`);

    for (const m of entry.matches) {
      const status = m.winnerPoints + m.scorerPoints > 0 ? "✅" : m.winnerPoints + m.scorerPoints < 0 ? "❌" : "⚠️";
      console.log(`     ${status} ${m.matchName}`);
      console.log(`        Predicted: ${m.prediction}`);
      console.log(`        Actual: ${m.result}`);
      console.log(`        Points: W${m.winnerPoints > 0 ? "+" : ""}${m.winnerPoints} S${m.scorerPoints > 0 ? "+" : ""}${m.scorerPoints} = ${m.winnerPoints + m.scorerPoints} pts | ${moneyConfig.currencySymbol}${m.money}`)
      ;
    }
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
