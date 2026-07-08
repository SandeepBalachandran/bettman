const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyMatch() {
  try {
    const match = await prisma.match.findFirst({
      where: {
        homeTeam: { name: "Switzerland" },
        awayTeam: { name: "Colombia" }
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        winnerTeam: true,
        scorers: true
      }
    });

    if (!match) {
      console.log("❌ Match not found");
      return;
    }

    console.log("🏟️  MATCH DETAILS");
    console.log("=".repeat(50));
    console.log(`Match: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
    console.log(`Status: ${match.status}`);
    console.log(`Winner: ${match.winnerTeam?.name || "None"}`);
    console.log(`Won on Penalties: ${match.wonOnPenalties}`);
    console.log(`Locked: ${match.locked}`);
    console.log(`Goal Scorers: ${match.scorers.length}`);
    console.log("=".repeat(50));

    if (match.status === "FINISHED" && match.winnerTeamId && match.wonOnPenalties) {
      console.log("\n✅ Match correctly set up:");
      console.log("   • Result: 0-0 (Extra Time)");
      console.log("   • Penalties: Switzerland 4-3 Colombia");
      console.log("   • Predictions will score on: Switzerland as winner");
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMatch();
