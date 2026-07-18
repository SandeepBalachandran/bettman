import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient, QuizDifficulty } from "@prisma/client";

const prisma = new PrismaClient();

type PlayerFixture = { name: string; position: string };

async function seedAdmin() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set in .env before seeding."
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log(`Admin user ready: ${admin.email}`);
}

async function seedBettor() {
  const name = process.env.BETTOR_NAME;
  const email = process.env.BETTOR_EMAIL;
  const password = process.env.BETTOR_PASSWORD;

  if (!name || !email || !password) {
    console.log("BETTOR_NAME/EMAIL/PASSWORD not set in .env — skipping demo user.");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const bettor = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      password: hashedPassword,
      role: "USER",
    },
  });

  console.log(`Demo bettor user ready: ${bettor.email}`);
}

async function seedPlayers() {
  const filePath = path.join(process.cwd(), "prisma", "data", "players.json");
  const raw = await readFile(filePath, "utf-8");
  const playersByFifaCode = JSON.parse(raw) as Record<string, PlayerFixture[]>;

  let linked = 0;
  let skipped = 0;

  for (const [fifaCode, players] of Object.entries(playersByFifaCode)) {
    const team = await prisma.team.findFirst({ where: { fifaCode } });

    if (!team) {
      skipped += players.length;
      continue;
    }

    for (const player of players) {
      const existing = await prisma.player.findFirst({
        where: { teamId: team.id, name: player.name },
      });

      if (existing) {
        continue;
      }

      await prisma.player.create({
        data: {
          teamId: team.id,
          name: player.name,
          position: player.position,
        },
      });
      linked++;
    }
  }

  console.log(
    `Players seeded: ${linked} created/verified, ${skipped} skipped (team not found yet — run scripts/sync-matches.ts first).`
  );
}

async function seedQuizQuestions() {
  const easyQuestions = [
    {
      question: "How many players does each team have on the field during a football match?",
      options: ["10", "11", "12", "9"],
      correctIndex: 1,
      difficulty: QuizDifficulty.EASY,
    },
    {
      question: "What does FIFA stand for?",
      options: ["Federation of International Football Association", "Fédération Internationale de Football Association", "Football International Federation Alliance", "Federation for International Football Amateur"],
      correctIndex: 1,
      difficulty: QuizDifficulty.EASY,
    },
    {
      question: "How long is a standard football match?",
      options: ["80 minutes", "90 minutes", "100 minutes", "120 minutes"],
      correctIndex: 1,
      difficulty: QuizDifficulty.EASY,
    },
    {
      question: "What is the primary objective in football?",
      options: ["Throw the ball", "Kick the ball into the opponent's goal", "Run with the ball", "Hit the ball with a stick"],
      correctIndex: 1,
      difficulty: QuizDifficulty.EASY,
    },
    {
      question: "Which country is famous for winning the most FIFA World Cups?",
      options: ["Germany", "Argentina", "Brazil", "France"],
      correctIndex: 2,
      difficulty: QuizDifficulty.EASY,
    },
    {
      question: "What is the area in front of the goal called?",
      options: ["Center zone", "Penalty area", "Goal box", "Attack zone"],
      correctIndex: 1,
      difficulty: QuizDifficulty.EASY,
    },
    {
      question: "How many substitutes can a team make in a football match?",
      options: ["2", "3", "4", "5"],
      correctIndex: 1,
      difficulty: QuizDifficulty.EASY,
    },
    {
      question: "What color card is shown for a serious foul?",
      options: ["Yellow card", "Red card", "Blue card", "White card"],
      correctIndex: 1,
      difficulty: QuizDifficulty.EASY,
    },
    {
      question: "What is the penalty for a handball in the penalty area?",
      options: ["Free kick", "Indirect free kick", "Penalty kick", "Corner kick"],
      correctIndex: 2,
      difficulty: QuizDifficulty.EASY,
    },
    {
      question: "Which country hosted the first FIFA World Cup in 1930?",
      options: ["France", "Italy", "Uruguay", "Brazil"],
      correctIndex: 2,
      difficulty: QuizDifficulty.EASY,
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const question of easyQuestions) {
    const exists = await prisma.quizQuestion.findFirst({
      where: { question: question.question },
    });

    if (exists) {
      skipped++;
      continue;
    }

    await prisma.quizQuestion.create({
      data: question,
    });
    created++;
  }

  console.log(`Quiz questions seeded: ${created} created, ${skipped} already exist.`);
}

async function main() {
  await seedAdmin();
  // Removed: seedBettor() - demo user should not be created
  await seedPlayers();
  await seedQuizQuestions();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
