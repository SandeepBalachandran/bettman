const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateMatch() {
  try {
    // Find the Switzerland vs Colombia match
    const match = await prisma.match.findFirst({
      where: {
        OR: [
          {
            homeTeam: { name: "Switzerland" },
            awayTeam: { name: "Colombia" }
          },
          {
            homeTeam: { name: "Colombia" },
            awayTeam: { name: "Switzerland" }
          }
        ]
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    if (!match) {
      console.log("❌ Match not found");
      return;
    }

    console.log(`Found: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
    
    // Determine which team is Switzerland
    const isSwitzerlandHome = match.homeTeam.name === "Switzerland";
    const switzerlandTeamId = isSwitzerlandHome ? match.homeTeamId : match.awayTeamId;
    
    console.log(`Switzerland is ${isSwitzerlandHome ? "home" : "away"} team`);
    console.log(`Setting winner to Switzerland (${switzerlandTeamId})`);

    // Update match as won on penalties by Switzerland
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: "FINISHED",
        winnerTeamId: switzerlandTeamId,
        wonOnPenalties: true,
        locked: true
      },
      include: { winnerTeam: true }
    });

    console.log(`\n✅ Match updated!`);
    console.log(`  Status: ${updated.status}`);
    console.log(`  Winner: ${updated.winnerTeam.name}`);
    console.log(`  Won on Penalties: ${updated.wonOnPenalties}`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateMatch();
