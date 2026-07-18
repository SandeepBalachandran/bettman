import { prisma } from "@/lib/prisma";

function FIFAFootballIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block"
    >
      <circle cx="50" cy="50" r="48" fill="#000000" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="50" cy="50" r="45" fill="#FFFFFF" />

      {/* Pentagon patches */}
      <polygon
        points="50,15 63,35 48,40"
        fill="#000000"
      />
      <polygon
        points="50,15 37,35 52,40"
        fill="#000000"
      />

      {/* Top hexagons */}
      <polygon
        points="65,28 75,35 72,48 60,50 58,38"
        fill="#000000"
      />
      <polygon
        points="35,28 25,35 28,48 40,50 42,38"
        fill="#000000"
      />

      {/* Middle hexagons */}
      <polygon
        points="80,48 85,62 75,70 65,65 70,52"
        fill="#000000"
      />
      <polygon
        points="20,48 15,62 25,70 35,65 30,52"
        fill="#000000"
      />

      {/* Bottom pentagons */}
      <polygon
        points="60,75 50,85 40,75 45,62 55,62"
        fill="#000000"
      />
      <polygon
        points="75,65 80,80 65,85 58,72"
        fill="#000000"
      />
      <polygon
        points="25,65 20,80 35,85 42,72"
        fill="#000000"
      />
    </svg>
  );
}

export async function RecentQuizAttemptsTable() {
  const attempts = await prisma.quizAttempt.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    totalAttempts: attempts.length,
    totalCoinsAwarded: attempts.reduce((sum, a) => sum + a.coinsAwarded, 0),
    averageScore: attempts.length > 0
      ? Math.round(
          (attempts.reduce((sum, a) => sum + a.correctCount, 0) / attempts.length) * 100
        ) / 100
      : 0,
  };

  return (
    <section className="card space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FIFAFootballIcon />
          <h2 className="text-lg font-medium">Recent Quiz Attempts</h2>
        </div>
        <span className="text-sm text-gray-500">{attempts.length} total attempts</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-accent/10 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Attempts</p>
          <p className="text-lg font-bold text-accent">{stats.totalAttempts}</p>
        </div>
        <div className="p-3 bg-success/10 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Coins Awarded</p>
          <p className="text-lg font-bold text-success">💰 {stats.totalCoinsAwarded}</p>
        </div>
        <div className="p-3 bg-highlight/10 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Avg Score</p>
          <p className="text-lg font-bold text-highlight-foreground dark:text-highlight">{stats.averageScore}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color-mix(in_srgb,var(--foreground)_8%,transparent)]">
              <th className="text-left py-2 px-2">Player</th>
              <th className="text-center py-2 px-2">Date</th>
              <th className="text-center py-2 px-2">Score</th>
              <th className="text-center py-2 px-2">Coins</th>
              <th className="text-right py-2 px-2">Answered in Time</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((attempt) => {
              const scorePercentage = Math.round(
                (attempt.correctCount / 7) * 100
              );
              const createdDate = new Date(attempt.createdAt).toLocaleDateString(
                "en-US",
                { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
              );

              const getScoreColor = () => {
                if (scorePercentage >= 80) return "bg-success/20 text-success";
                if (scorePercentage >= 60) return "bg-accent/20 text-accent";
                return "bg-secondary/20 text-secondary";
              };

              const answersArray = typeof attempt.answers === "string"
                ? JSON.parse(attempt.answers)
                : (Array.isArray(attempt.answers) ? attempt.answers : []);
              const answeredInTime = answersArray.filter((a: any) => a.answeredInTime).length;

              return (
                <tr
                  key={attempt.id}
                  className="border-b border-[color-mix(in_srgb,var(--foreground)_4%,transparent)] hover:bg-[color-mix(in_srgb,var(--foreground)_2%,transparent)]"
                >
                  <td className="py-2 px-2">
                    <div>
                      <p className="font-semibold">{attempt.user.name}</p>
                      <p className="text-xs text-gray-500">{attempt.user.email}</p>
                    </div>
                  </td>
                  <td className="text-center py-2 px-2 text-gray-600 dark:text-gray-400">
                    {createdDate}
                  </td>
                  <td className="text-center py-2 px-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getScoreColor()}`}>
                      {attempt.correctCount}/7 ({scorePercentage}%)
                    </span>
                  </td>
                  <td className="text-center py-2 px-2 font-semibold text-accent">
                    +{attempt.coinsAwarded}
                  </td>
                  <td className="text-right py-2 px-2 text-gray-600 dark:text-gray-400">
                    {answeredInTime} / 7
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {attempts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No quiz attempts yet</p>
        </div>
      )}
    </section>
  );
}
