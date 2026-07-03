import { moneyConfig } from "@/lib/money-config";
import { formatMoney } from "@/lib/format-money";

export function MoneyRulesCard({
  defaultOpen = false,
}: {
  readonly defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="card group p-4 open:pb-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold marker:content-none">
        <span>💰 How winning &amp; losing money works</span>
        <span className="text-xs text-muted-foreground transition group-open:rotate-180">▾</span>
      </summary>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex items-center justify-between gap-3 rounded-xl bg-success/5 px-3 py-2">
          <span>Correct match winner</span>
          <span className="font-bold text-success">+{formatMoney(moneyConfig.moneyPerCorrectWinner)}</span>
        </li>
        <li className="flex items-center justify-between gap-3 rounded-xl bg-danger/5 px-3 py-2">
          <span>Incorrect match winner</span>
          <span className="font-bold text-danger">
            {formatMoney(moneyConfig.moneyPerIncorrectWinner)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 rounded-xl bg-success/5 px-3 py-2">
          <span>Per correct goal scorer pick</span>
          <span className="font-bold text-success">
            +{formatMoney(moneyConfig.moneyPerCorrectScorer)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 rounded-xl bg-danger/5 px-3 py-2">
          <span>Per incorrect goal scorer pick</span>
          <span className="font-bold text-danger">
            {formatMoney(moneyConfig.moneyPerIncorrectScorer)}
          </span>
        </li>
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        You can pick up to 3 goal scorers per match. Each pick is scored on its own — there&apos;s
        no shared pool. E.g. 2 correct + 1 wrong ={" "}
        {formatMoney(2 * moneyConfig.moneyPerCorrectScorer + moneyConfig.moneyPerIncorrectScorer)}
        , not one combined amount.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Best case per match: {formatMoney(moneyConfig.maxMoneyPerMatch)} (correct winner + all 3
        scorers correct). Worst case per match: {formatMoney(moneyConfig.maxLossPerMatch)} (wrong
        winner + all 3 scorer picks wrong).
      </p>
    </details>
  );
}
