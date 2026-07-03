import { formatMoney } from "@/lib/format-money";

interface FinancialSummaryWidgetProps {
  currentBalance: number;
  moneyWon: number;
  moneyLost: number;
}

export function FinancialSummaryWidget({
  currentBalance,
  moneyWon,
  moneyLost,
}: FinancialSummaryWidgetProps) {
  const isPositive = currentBalance >= 0;

  return (
    <div className="card grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
      <div className="text-center">
        <div className="text-sm text-muted-foreground">Current Balance</div>
        <div
          className={`text-2xl font-bold ${
            isPositive ? "text-success" : "text-danger"
          }`}
        >
          {formatMoney(currentBalance)}
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm text-muted-foreground">Money Won</div>
        <div className="text-2xl font-bold text-success">
          {formatMoney(moneyWon)}
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm text-muted-foreground">Money Lost</div>
        <div className="text-2xl font-bold text-danger">
          {formatMoney(moneyLost)}
        </div>
      </div>
    </div>
  );
}
