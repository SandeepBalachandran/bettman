export interface MoneyConfig {
  currencySymbol: string;
  moneyPerCorrectWinner: number;
  moneyPerIncorrectWinner: number;
  moneyPerCorrectScorer: number;
  moneyPerIncorrectScorer: number;
  maxMoneyPerMatch: number;
  maxLossPerMatch: number;
}

export const MAX_SCORER_PICKS = 4;

function loadMoneyConfig(): MoneyConfig {
  const currencySymbol = process.env.CURRENCY_SYMBOL || "₹";
  const moneyPerCorrectWinner = parseInt(
    process.env.MONEY_PER_CORRECT_WINNER || "30"
  );
  const moneyPerIncorrectWinner = parseInt(
    process.env.MONEY_PER_INCORRECT_WINNER || "-30"
  );
  const moneyPerCorrectScorer = parseInt(
    process.env.MONEY_PER_CORRECT_SCORER || "5"
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
  if (moneyPerIncorrectWinner > 0) {
    throw new Error(
      `Invalid MONEY_PER_INCORRECT_WINNER: ${moneyPerIncorrectWinner} (must be <= 0)`
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

  // Best/worst case assume every scorer slot is used (2 free + 2 coin unlocks)
  // and each correct pick scores once.
  const maxMoneyPerMatch =
    moneyPerCorrectWinner + MAX_SCORER_PICKS * moneyPerCorrectScorer;
  const maxLossPerMatch = moneyPerIncorrectWinner + MAX_SCORER_PICKS * moneyPerIncorrectScorer;

  return {
    currencySymbol,
    moneyPerCorrectWinner,
    moneyPerIncorrectWinner,
    moneyPerCorrectScorer,
    moneyPerIncorrectScorer,
    maxMoneyPerMatch,
    maxLossPerMatch,
  };
}

export const moneyConfig = loadMoneyConfig();
