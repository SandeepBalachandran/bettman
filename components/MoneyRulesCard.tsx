import { moneyConfig } from "@/lib/money-config";
import { formatMoney } from "@/lib/format-money";

export function MoneyRulesCard() {
  return (
    <details className="card group p-4 open:pb-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold marker:content-none">
        <span>💰 How winning &amp; losing money works</span>
        <span className="text-xs text-muted-foreground transition group-open:rotate-180">▾</span>
      </summary>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex items-center justify-between gap-3 rounded-xl bg-success/5 px-3 py-2">
          <span>Correct match winner</span>
          <span className="font-bold text-success">+{formatMoney(moneyConfig.moneyPerCorrectWinner)}</span>
        </li>
        <li className="flex items-center justify-between gap-3 rounded-xl bg-success/5 px-3 py-2">
          <span>Each correct goal scorer (up to 3)</span>
          <span className="font-bold text-success">
            +{formatMoney(moneyConfig.moneyPerCorrectScorer)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 rounded-xl bg-danger/5 px-3 py-2">
          <span>Each incorrect scorer pick</span>
          <span className="font-bold text-danger">
            {formatMoney(moneyConfig.moneyPerIncorrectScorer)}
          </span>
        </li>
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Best case per match: {formatMoney(moneyConfig.maxMoneyPerMatch)} (correct winner + all 3
        scorers correct). Worst case per match: {formatMoney(moneyConfig.maxLossPerMatch)} (a
        wrong winner earns {formatMoney(0)} — the loss comes entirely from wrong scorer picks, so
        all 3 wrong is the floor). Skipping scorer picks means zero scorer risk.
      </p>
    </details>
  );
}
