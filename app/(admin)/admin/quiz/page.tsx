import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { QuizConfigForm } from "@/components/features/admin/QuizConfigForm";
import { QuizQuestionForm } from "@/components/features/admin/QuizQuestionForm";

export default async function QuizAdminPage() {
  await requireAdmin();

  // Get quiz config
  let config = await prisma.quizConfig.findFirst();
  if (!config) {
    config = await prisma.quizConfig.create({
      data: {
        questionsPerQuiz: 7,
        secondsPerQuestion: 10,
        completionCoins: 20,
        coinsPerCorrect: 10,
      },
    });
  }

  // Get all quiz questions
  const questions = await prisma.quizQuestion.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Get quiz history (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  const recentQuizzes = await prisma.dailyQuiz.findMany({
    where: {
      date: {
        gte: sevenDaysAgoStr,
        lte: todayStr,
      },
    },
    orderBy: { date: "desc" },
  });

  const quizAttemptCounts = await Promise.all(
    recentQuizzes.map(async (quiz) => ({
      date: quiz.date,
      attemptCount: await prisma.quizAttempt.count({
        where: { date: quiz.date },
      }),
    }))
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <h1 className="gradient-text">Quiz</h1>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <QuizConfigForm initialConfig={config} />
        <QuizQuestionForm />
      </div>

      {/* Questions list */}
      <section className="card p-4">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Questions ({questions.length})</h2>
        <ul className="divide-y divide-white/[0.06]">
          {questions.map((q) => (
            <li key={q.id} className="space-y-1.5 py-2.5">
              <p className="text-sm leading-snug">{q.question}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    q.difficulty === "EASY"
                      ? "bg-success/10 text-success"
                      : q.difficulty === "MEDIUM"
                        ? "bg-warning/10 text-warning"
                        : "bg-danger/10 text-danger"
                  }`}
                >
                  {q.difficulty}
                </span>
                <span className={`text-[11px] font-medium ${q.active ? "text-success" : "text-gray-500"}`}>
                  {q.active ? "✓ Active" : "✗ Inactive"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Quiz history */}
      <section className="card p-4">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Recent Quizzes (7 days)</h2>
        <div className="space-y-2">
          {quizAttemptCounts.length === 0 ? (
            <p className="text-sm text-gray-500">No quizzes created yet</p>
          ) : (
            quizAttemptCounts.map(({ date, attemptCount }) => (
              <div key={date} className="flex justify-between items-center py-2 px-2 bg-gray-50 dark:bg-white/5 rounded">
                <span className="text-sm font-medium">{date}</span>
                <span className="text-xs text-gray-500">{attemptCount} attempts</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
