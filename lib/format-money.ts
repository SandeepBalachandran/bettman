import { moneyConfig } from "./money-config";

export function formatMoney(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  return isNegative
    ? `-${moneyConfig.currencySymbol}${absAmount}`
    : `${moneyConfig.currencySymbol}${absAmount}`;
}
