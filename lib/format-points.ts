/**
 * The season score. It's computed by lib/money.ts (+30/−30 result, +5/−5 per
 * scorer pick) but shown as points — no real money changes hands.
 */
export function formatPoints(amount: number): string {
  return `${amount} pts`;
}

/** With an explicit + for gains, for per-match results ("+35 pts", "-30 pts", "0 pts"). */
export function formatPointsDelta(amount: number): string {
  return `${amount > 0 ? "+" : ""}${amount} pts`;
}
