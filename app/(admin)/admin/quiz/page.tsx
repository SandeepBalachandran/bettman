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
    <main className="mx-auto max-w-4xl space-y-4 sm:space-y-6 md:space-y-8 p-3 sm:p-4 md:p-6">
      <h1 className="text-xl sm:text-2xl font-bold gradient-text">Quiz Management</h1>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <QuizConfigForm initialConfig={config} />
        <QuizQuestionForm />
      </div>

      {/* Questions list */}
      <section className="card p-3 sm:p-4">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Questions ({questions.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-2">Question</th>
                <th className="text-center py-2 px-2">Difficulty</th>
                <th className="text-center py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 px-2 text-xs">
                    <p className="line-clamp-2">{q.question}</p>
                  </td>
                  <td className="text-center py-2 px-2">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      q.difficulty === 'EASY' ? 'bg-success/10 text-success' :
                      q.difficulty === 'MEDIUM' ? 'bg-warning/10 text-warning' :
                      'bg-danger/10 text-danger'
                    }`}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="text-center py-2 px-2">
                    <span className={`text-xs font-medium ${q.active ? 'text-success' : 'text-gray-500'}`}>
                      {q.active ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quiz history */}
      <section className="card p-3 sm:p-4">
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
    </main>
  );
}
