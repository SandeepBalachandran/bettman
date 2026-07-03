export interface MoneyConfig {
  currencySymbol: string;
  moneyPerCorrectWinner: number;
  moneyPerCorrectScorer: number;
  moneyPerIncorrectScorer: number;
  maxMoneyPerMatch: number;
  maxLossPerMatch: number;
}

function loadMoneyConfig(): MoneyConfig {
  const currencySymbol = process.env.CURRENCY_SYMBOL || "₹";
  const moneyPerCorrectWinner = parseInt(
    process.env.MONEY_PER_CORRECT_WINNER || "30"
  );
  const moneyPerCorrectScorer = parseInt(
    process.env.MONEY_PER_CORRECT_SCORER || "10"
  );
  const moneyPerIncorrectScorer = parseInt(
    process.env.MONEY_PER_INCORRECT_SCORER || "-5"
  );

  // Validation
  if (moneyPerCorrectWinner < 0) {
    throw new Error(
      `Invalid MONEY_PER_CORRECT_WINNER: ${moneyPerCorrectWinner} (must be >= 0)`
    );
  }
  if (moneyPerCorrectScorer < 0) {
    throw new Error(
      `Invalid MONEY_PER_CORRECT_SCORER: ${moneyPerCorrectScorer} (must be >= 0)`
    );
  }
  if (moneyPerIncorrectScorer > 0) {
    throw new Error(
      `Invalid MONEY_PER_INCORRECT_SCORER: ${moneyPerIncorrectScorer} (must be <= 0)`
    );
  }

  const maxMoneyPerMatch =
    moneyPerCorrectWinner + 3 * moneyPerCorrectScorer;
  const maxLossPerMatch = 3 * moneyPerIncorrectScorer;

  return {
    currencySymbol,
    moneyPerCorrectWinner,
    moneyPerCorrectScorer,
    moneyPerIncorrectScorer,
    maxMoneyPerMatch,
    maxLossPerMatch,
  };
}

export const moneyConfig = loadMoneyConfig();
