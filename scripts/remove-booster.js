#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function removeBooster() {
  try {
    // Find Spain vs France match
    const match = await prisma.match.findFirst({
      where: {
        OR: [
          {
            AND: [
              { homeTeam: { name: "Spain" } },
              { awayTeam: { name: "France" } }
            ]
          },
          {
            AND: [
              { homeTeam: { name: "France" } },
              { awayTeam: { name: "Spain" } }
            ]
          }
        ]
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    if (!match) {
      console.log("❌ Spain vs France match not found");
      process.exit(1);
    }

    console.log(`✅ Found match: ${match.homeTeam.name} vs ${match.awayTeam.name}`);

    // Find admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" }
    });

    if (!adminUser) {
      console.log("❌ No admin user found");
      process.exit(1);
    }

    console.log(`✅ Found admin user: ${adminUser.name}`);

    // Find the prediction
    const prediction = await prisma.prediction.findFirst({
      where: {
        matchId: match.id,
        userId: adminUser.id
      }
    });

    if (!prediction) {
      console.log("❌ No prediction found for admin user on this match");
      process.exit(1);
    }

    if (!prediction.usedPointsBooster) {
      console.log("ℹ️ Booster is not used on this prediction");
      process.exit(0);
    }

    // Remove booster (NO REFUND)
    await prisma.prediction.update({
      where: { id: prediction.id },
      data: { usedPointsBooster: false }
    });

    console.log("✅ Booster removed successfully!");
    console.log("💾 Ready to test popup activation");

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

removeBooster();
