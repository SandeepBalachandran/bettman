import { prisma } from "@/lib/prisma";
import { QuizDifficulty } from "@prisma/client";

const CACHE_DURATION = 60000;
let cachedConfig: { questionsPerQuiz: number; secondsPerQuestion: number; completionCoins: number; coinsPerCorrect: number } | null = null;
let cacheTimestamp = 0;

export function todayDateString(): string {
  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return utcDate.toISOString().split('T')[0];
}

export async function getQuizConfig() {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_DURATION) {
    return cachedConfig;
  }

  try {
    let config = await prisma.quizConfig.findFirst();

    if (!config) {
      config = await prisma.quizConfig.create({
        data: {
          questionsPerQuiz: 7,
          secondsPerQuestion: 20,
          completionCoins: 20,
          coinsPerCorrect: 10,
        },
      });
    }

    cachedConfig = {
      questionsPerQuiz: config.questionsPerQuiz,
      secondsPerQuestion: config.secondsPerQuestion,
      completionCoins: config.completionCoins,
      coinsPerCorrect: config.coinsPerCorrect,
    };
    cacheTimestamp = now;
  } catch (error) {
    console.error("Error fetching quiz config:", error);
    cachedConfig = {
      questionsPerQuiz: 7,
      secondsPerQuestion: 10,
      completionCoins: 20,
      coinsPerCorrect: 10,
    };
  }

  return cachedConfig!;
}

export function invalidateQuizConfigCache() {
  cacheTimestamp = 0;
  cachedConfig = null;
}

export async function getOrCreateTodaysQuiz() {
  const date = todayDateString();
  console.log("[Quiz] Getting quiz for date:", date);

  const config = await getQuizConfig();
  console.log("[Quiz] Config loaded:", config);

  // Try to find existing quiz for today
  let dailyQuiz = await prisma.dailyQuiz.findUnique({
    where: { date },
  });

  console.log("[Quiz] Existing quiz found:", dailyQuiz?.date || "none");

  // If quiz doesn't exist, create it
  if (!dailyQuiz) {
    console.log("[Quiz] Creating new quiz for today...");
    // Get all active questions, stratified by difficulty
    const easyQuestions = await prisma.quizQuestion.findMany({
      where: { active: true, difficulty: "EASY" },
    });
    const mediumQuestions = await prisma.quizQuestion.findMany({
      where: { active: true, difficulty: "MEDIUM" },
    });
    const hardQuestions = await prisma.quizQuestion.findMany({
      where: { active: true, difficulty: "HARD" },
    });

    console.log(`[Quiz] Found questions - Easy: ${easyQuestions.length}, Medium: ${mediumQuestions.length}, Hard: ${hardQuestions.length}`);

    // Sample questions: aim for roughly equal distribution of difficulties
    const questionsPerDifficulty = Math.ceil(config.questionsPerQuiz / 3);
    const sampledQuestions: string[] = [];

    // Helper to shuffle array
    const shuffle = (arr: any[]) => arr.sort(() => Math.random() - 0.5);

    // Sample from each difficulty
    sampledQuestions.push(
      ...shuffle(easyQuestions).slice(0, questionsPerDifficulty).map(q => q.id)
    );
    sampledQuestions.push(
      ...shuffle(mediumQuestions).slice(0, questionsPerDifficulty).map(q => q.id)
    );
    sampledQuestions.push(
      ...shuffle(hardQuestions).slice(0, questionsPerDifficulty).map(q => q.id)
    );

    // Trim to exact count and shuffle final order
    const finalQuestions = shuffle(sampledQuestions.slice(0, config.questionsPerQuiz));
    console.log(`[Quiz] Sampled ${finalQuestions.length} questions`);

    dailyQuiz = await prisma.dailyQuiz.create({
      data: {
        date,
        questionIds: finalQuestions,
      },
    });
    console.log("[Quiz] Daily quiz created");
  }

  // Fetch full question objects
  console.log(`[Quiz] Fetching ${dailyQuiz.questionIds.length} questions...`);
  const questions = await prisma.quizQuestion.findMany({
    where: { id: { in: dailyQuiz.questionIds } },
  });

  console.log(`[Quiz] Retrieved ${questions.length} full question objects`);

  // Return in the order stored in dailyQuiz.questionIds
  const questionsInOrder = dailyQuiz.questionIds
    .map(id => questions.find(q => q.id === id))
    .filter(Boolean) as typeof questions;

  console.log(`[Quiz] Returning ${questionsInOrder.length} questions in order`);

  return {
    date,
    questions: questionsInOrder,
  };
}

export async function submitQuizAttempt(
  userId: string,
  date: string,
  answers: { questionId: string; selectedIndex: number; answeredInTime: boolean }[]
) {
  // Validate answers against actual questions
  const dailyQuiz = await prisma.dailyQuiz.findUnique({
    where: { date },
  });

  if (!dailyQuiz) {
    throw new Error("Quiz not found for this date");
  }

  const questions = await prisma.quizQuestion.findMany({
    where: { id: { in: dailyQuiz.questionIds } },
  });

  const questionsById = new Map(questions.map(q => [q.id, q]));

  // Score answers server-side (never trust client)
  let correctCount = 0;
  const validatedAnswers: any[] = [];

  for (const answer of answers) {
    const question = questionsById.get(answer.questionId);
    if (!question) continue;

    const isCorrect = answer.answeredInTime && answer.selectedIndex === question.correctIndex;
    if (isCorrect) correctCount++;

    validatedAnswers.push({
      questionId: answer.questionId,
      selectedIndex: answer.selectedIndex,
      correct: isCorrect,
      answeredInTime: answer.answeredInTime,
    });
  }

  const config = await getQuizConfig();
  const coinsAwarded = config.completionCoins + correctCount * config.coinsPerCorrect;

  // Get or create coin balance
  let coinBalance = await prisma.coinBalance.findUnique({
    where: { userId },
  });

  if (!coinBalance) {
    coinBalance = await prisma.coinBalance.create({
      data: { userId, balance: 0 },
    });
  }

  const balanceBefore = coinBalance.balance;
  const balanceAfter = balanceBefore + coinsAwarded;

  // Write attempt + transaction + update balance atomically
  await Promise.all([
    prisma.quizAttempt.create({
      data: {
        userId,
        date,
        answers: validatedAnswers,
        correctCount,
        coinsAwarded,
      },
    }),
    prisma.coinBalance.update({
      where: { userId },
      data: { balance: { increment: coinsAwarded } },
    }),
    prisma.coinTransaction.create({
      data: {
        userId,
        type: "award",
        reason: "daily_quiz",
        amount: coinsAwarded,
        balanceBefore,
        balanceAfter,
      },
    }),
  ]);

  return { correctCount, coinsAwarded, newBalance: balanceAfter };
}
