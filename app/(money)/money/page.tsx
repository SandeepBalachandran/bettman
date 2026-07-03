import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMoney } from "@/lib/leaderboard-money";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format-money";
import { moneyConfig } from "@/lib/money-config";
import { calculateMatchMoney } from "@/lib/money";
import { FinancialSummaryWidget } from "@/components/FinancialSummaryWidget";

export const metadata = {
  title: "Money Dashboard - Bettman",
};

export default async function MoneyPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userMoney = await getUserMoney(session.user.id);

  // Get match-by-match history
  const finishedMatches = await prisma.match.findMany({
    where: { status: "FINISHED" },
    include: {
      homeTeam: true,
      awayTeam: true,
      scorers: true,
      predictions: {
        where: { userId: session.user.id },
        include: { scorers: true },
      },
    },
    orderBy: { kickoffTime: "desc" },
  });

  // Calculate per-match money
  const matchHistory = finishedMatches
    .map((match) => {
      const prediction = match.predictions[0];
      if (!prediction) return null;

      const actualScorerIds = match.scorers.map((ms) => ms.playerId);
      const money = calculateMatchMoney(
        {
          winnerTeamId: prediction.winnerTeamId,
          scorerPlayerIds: prediction.scorers.map((ps) => ps.playerId),
        },
        {
          winnerTeamId: match.winnerTeamId,
        },
        actualScorerIds,
        moneyConfig
      );

      return {
        matchId: match.id,
        matchName: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        amount: money.total,
      };
    })
    .filter(Boolean) as Array<{
    matchId: string;
    matchName: string;
    amount: number;
  }>;

  // Calculate stats
  const highestWin = matchHistory.reduce(
    (max, m) => (m.amount > max ? m.amount : max),
    0
  );
  const worstMatch = matchHistory.reduce(
    (min, m) => (m.amount < min ? m.amount : min),
    0
  );
  const averagePerMatch =
    matchHistory.length > 0
      ? matchHistory.reduce((sum, m) => sum + m.amount, 0) / matchHistory.length
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gradient-text text-3xl font-bold">Money Dashboard</h1>
        <p className="text-muted-foreground">Track your financial performance</p>
      </div>

      {/* Financial Summary */}
      <FinancialSummaryWidget
        currentBalance={userMoney.currentBalance}
        moneyWon={userMoney.moneyWon}
        moneyLost={userMoney.moneyLost}
      />

      {/* Match Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card card-interactive p-4">
          <div className="text-sm text-muted-foreground">
            Highest Winning Match
          </div>
          <div className="mt-2 text-2xl font-bold text-success">
            {highestWin > 0
              ? formatMoney(highestWin)
              : formatMoney(0)}
          </div>
        </div>
        <div className="card card-interactive p-4">
          <div className="text-sm text-muted-foreground">Worst Match</div>
          <div className="mt-2 text-2xl font-bold text-danger">
            {worstMatch < 0 ? formatMoney(worstMatch) : formatMoney(0)}
          </div>
        </div>
        <div className="card card-interactive p-4">
          <div className="text-sm text-muted-foreground">
            Average Per Match
          </div>
          <div className="mt-2 text-2xl font-bold">
            {formatMoney(Math.round(averagePerMatch))}
          </div>
        </div>
      </div>

      {/* Pending Exposure */}
      <div className="card border-highlight/30 bg-highlight/5 p-4">
        <h2 className="font-semibold">Pending Financial Exposure</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <div className="text-muted-foreground">Remaining Matches</div>
            <div className="mt-1 text-lg font-bold">
              {userMoney.pendingExposure.matchesRemaining}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Maximum Possible Win</div>
            <div className="mt-1 text-lg font-bold text-success">
              {formatMoney(userMoney.pendingExposure.maxWin)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Maximum Possible Loss</div>
            <div className="mt-1 text-lg font-bold text-danger">
              {formatMoney(userMoney.pendingExposure.maxLoss)}
            </div>
          </div>
        </div>
      </div>

      {/* Match History */}
      {matchHistory.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-bold">Match-by-Match History</h2>
          <div className="space-y-2">
            {matchHistory.map((match) => (
              <div
                key={match.matchId}
                className="card card-interactive flex items-center justify-between gap-2 p-3"
              >
                <span className="text-sm font-medium">{match.matchName}</span>
                <span
                  className={`font-bold ${
                    match.amount > 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {match.amount > 0 ? "+" : ""}{formatMoney(match.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {matchHistory.length === 0 && (
        <div className="card border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No finished matches yet. Your financial history will appear here
            once matches are completed.
          </p>
        </div>
      )}
    </div>
  );
}
