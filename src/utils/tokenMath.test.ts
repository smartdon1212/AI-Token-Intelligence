import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEstimatedCost,
  calculateBillingDiscrepancy,
  calculateMAE,
  calculateRMSE,
  calculateSafeMAPE,
  calculatePredictionBias,
  formatTokens,
  formatCurrency,
} from './tokenMath.ts';

test('calculateEstimatedCost computes correct input and output expenditure', () => {
  const rate = {
    inputPricePer1M: 1.0,
    outputPricePer1M: 4.0,
  };
  const result = calculateEstimatedCost(500_000, 250_000, rate);

  // 0.5M * $1.00 = $0.50
  assert.equal(result.inputCost, 0.5);
  // 0.25M * $4.00 = $1.00
  assert.equal(result.outputCost, 1.0);
  assert.equal(result.totalCost, 1.5);
});

test('calculateEstimatedCost handles cached tokens correctly', () => {
  const rate = {
    inputPricePer1M: 2.0,
    outputPricePer1M: 8.0,
    cachedInputPricePer1M: 0.5,
  };
  // 1M input of which 600k is cached, 400k uncached
  const result = calculateEstimatedCost(1_000_000, 100_000, rate, 600_000);
  // uncached: 0.4M * 2.0 = 0.8
  // cached: 0.6M * 0.5 = 0.3
  // total input = 1.1
  assert.equal(result.inputCost, 1.1);
  // output: 0.1M * 8.0 = 0.8
  assert.equal(result.outputCost, 0.8);
  assert.equal(result.totalCost, 1.9);
});

test('calculateEstimatedCost rejects negative token counts', () => {
  const rate = { inputPricePer1M: 1, outputPricePer1M: 2 };
  assert.throws(() => calculateEstimatedCost(-10, 100, rate), /non-negative/);
});

test('calculateBillingDiscrepancy isolates estimated from actual billed amounts', () => {
  const diff1 = calculateBillingDiscrepancy(1.25, 1.20);
  assert.equal(diff1, 0.05); // Estimated exceeded billed

  const diff2 = calculateBillingDiscrepancy(1.00, 1.15);
  assert.equal(diff2, -0.15); // Under-estimated

  const diffNull = calculateBillingDiscrepancy(1.00, null);
  assert.equal(diffNull, null);
});

test('evaluation metrics (MAE, RMSE, safe MAPE, Bias) execute accurately', () => {
  const pairs = [
    { predicted: 100, actual: 80 },  // err = +20, abs = 20, pct = 25%
    { predicted: 200, actual: 200 }, // err = 0, abs = 0, pct = 0%
    { predicted: 300, actual: 350 }, // err = -50, abs = 50, pct = 14.2857%
  ];

  // MAE = (20 + 0 + 50) / 3 = 70 / 3 = 23.3333
  assert.equal(calculateMAE(pairs), 23.3333);

  // RMSE = sqrt((400 + 0 + 2500) / 3) = sqrt(2900 / 3) = sqrt(966.6667) = 31.0913
  assert.equal(calculateRMSE(pairs), 31.0913);

  // Safe MAPE = (25 + 0 + 14.2857) / 3 = 39.2857 / 3 = 13.1%
  assert.equal(calculateSafeMAPE(pairs), 13.1);

  // Bias = (20 + 0 - 50) / 3 = -30 / 3 = -10
  assert.equal(calculatePredictionBias(pairs), -10);
});

test('safe MAPE avoids zero division when actual is zero', () => {
  const pairs = [{ predicted: 50, actual: 0 }];
  const mape = calculateSafeMAPE(pairs, 1.0);
  // (50 - 0) / max(0, 1.0) * 100 = 5000%
  assert.equal(mape, 5000);
});

test('formatting utilities display clean representations', () => {
  assert.equal(formatTokens(1250400), '1,250,400');
  assert.equal(formatCurrency(0.00045), '$0.00045');
  assert.equal(formatCurrency(12.5), '$12.50');
});
