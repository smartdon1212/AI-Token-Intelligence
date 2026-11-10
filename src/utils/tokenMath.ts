/**
 * Mathematical formulas and FinOps utility functions for AI Token Intelligence.
 * Pure decoupled functions matching the Python research engine specifications.
 */

export interface PricingRate {
  inputPricePer1M: number;
  outputPricePer1M: number;
  cachedInputPricePer1M?: number | null;
}

/**
 * Calculates estimated expenditure in USD given token counts and rate card.
 */
export function calculateEstimatedCost(
  inputTokens: number,
  outputTokens: number,
  rate: PricingRate,
  cachedTokens: number = 0
): { inputCost: number; outputCost: number; totalCost: number } {
  if (inputTokens < 0 || outputTokens < 0) {
    throw new Error('Token counts must be non-negative');
  }

  const regularInput = Math.max(0, inputTokens - cachedTokens);
  let inputCost = (regularInput / 1_000_000) * rate.inputPricePer1M;

  if (cachedTokens > 0 && rate.cachedInputPricePer1M != null) {
    inputCost += (cachedTokens / 1_000_000) * rate.cachedInputPricePer1M;
  }

  const outputCost = (outputTokens / 1_000_000) * rate.outputPricePer1M;
  const totalCost = inputCost + outputCost;

  return {
    inputCost: Number(inputCost.toFixed(8)),
    outputCost: Number(outputCost.toFixed(8)),
    totalCost: Number(totalCost.toFixed(8)),
  };
}

/**
 * Calculates cost discrepancy between estimated cost and actual provider invoice.
 * Positive = Estimated > Actual (Over-estimated)
 * Negative = Actual > Estimated (Billing spike / Under-estimated)
 */
export function calculateBillingDiscrepancy(
  estimatedCost: number,
  actualBilled: number | null | undefined
): number | null {
  if (actualBilled == null) return null;
  return Number((estimatedCost - actualBilled).toFixed(8));
}

/**
 * Mean Absolute Error (MAE)
 */
export function calculateMAE(pairs: Array<{ predicted: number; actual: number }>): number {
  if (pairs.length === 0) return 0;
  const sum = pairs.reduce((acc, p) => acc + Math.abs(p.predicted - p.actual), 0);
  return Number((sum / pairs.length).toFixed(4));
}

/**
 * Root Mean Squared Error (RMSE)
 */
export function calculateRMSE(pairs: Array<{ predicted: number; actual: number }>): number {
  if (pairs.length === 0) return 0;
  const sumSq = pairs.reduce((acc, p) => acc + Math.pow(p.predicted - p.actual, 2), 0);
  return Number(Math.sqrt(sumSq / pairs.length).toFixed(4));
}

/**
 * Epsilon-adjusted MAPE (safe against zero and near-zero actuals).
 * MAPE_eps = mean(|pred - actual| / max(actual, epsilon)) * 100
 */
export function calculateSafeMAPE(
  pairs: Array<{ predicted: number; actual: number }>,
  epsilon: number = 1.0
): number {
  if (pairs.length === 0) return 0;
  const sumPct = pairs.reduce((acc, p) => {
    const denom = Math.max(p.actual, epsilon);
    return acc + (Math.abs(p.predicted - p.actual) / denom) * 100;
  }, 0);
  return Number((sumPct / pairs.length).toFixed(2));
}

/**
 * Mean Prediction Bias = mean(predicted - actual)
 */
export function calculatePredictionBias(pairs: Array<{ predicted: number; actual: number }>): number {
  if (pairs.length === 0) return 0;
  const sum = pairs.reduce((acc, p) => acc + (p.predicted - p.actual), 0);
  return Number((sum / pairs.length).toFixed(4));
}

/**
 * Format token numbers with localized commas (e.g., 1,452,000).
 */
export function formatTokens(count: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(count));
}

/**
 * Format currency with flexible precision for micro-dollar token costs.
 */
export function formatCurrency(amount: number): string {
  if (amount === 0) return '$0.00';
  if (amount < 0.01) {
    return `$${amount.toFixed(5)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}
