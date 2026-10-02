import { MarketCandle } from '../types/finance';

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += prices[i - j];
      }
      result.push(sum / period);
    }
  }
  return result;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  let previousEMA: number | null = null;

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      // First EMA is simple average
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += prices[i - j];
      }
      previousEMA = sum / period;
      result.push(previousEMA);
    } else {
      previousEMA = (prices[i] - previousEMA!) * multiplier + previousEMA!;
      result.push(previousEMA);
    }
  }
  return result;
}

/**
 * Calculates Relative Strength Index (RSI - 14 periods standard Wilder smoothing)
 */
export function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (prices.length <= period) {
    return prices.map(() => null);
  }

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // First values before period
  for (let i = 0; i < period; i++) {
    result.push(null);
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    const chg = changes[i];
    if (chg >= 0) avgGain += chg;
    else avgLoss += Math.abs(chg);
  }
  avgGain /= period;
  avgLoss /= period;

  const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - (100 / (1 + firstRS)));

  for (let i = period; i < changes.length; i++) {
    const chg = changes[i];
    const gain = chg >= 0 ? chg : 0;
    const loss = chg < 0 ? Math.abs(chg) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
  }

  return result;
}

/**
 * Calculates Bollinger Bands (Upper, Lower, Middle)
 */
export function calculateBollingerBands(prices: number[], period: number = 20, multiplier: number = 2) {
  const sma = calculateSMA(prices, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const pctB: (number | null)[] = [];

  for (let i = 0; i < prices.length; i++) {
    const mean = sma[i];
    if (mean === null) {
      upper.push(null);
      lower.push(null);
      pctB.push(null);
      continue;
    }

    let varianceSum = 0;
    for (let j = 0; j < period; j++) {
      const diff = prices[i - j] - mean;
      varianceSum += diff * diff;
    }
    const stdDev = Math.sqrt(varianceSum / period);

    const up = mean + multiplier * stdDev;
    const dn = mean - multiplier * stdDev;
    upper.push(up);
    lower.push(dn);

    const bandWidth = up - dn;
    pctB.push(bandWidth === 0 ? 0.5 : (prices[i] - dn) / bandWidth);
  }

  return { upper, lower, middle: sma, pctB };
}

/**
 * Calculates rolling annualized volatility (std * sqrt(252))
 */
export function calculateRollingVolatility(returns: number[], period: number = 20): (number | null)[] {
  const result: (number | null)[] = [];

  for (let i = 0; i < returns.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += returns[i - j];
    }
    const mean = sum / period;

    let variance = 0;
    for (let j = 0; j < period; j++) {
      const diff = returns[i - j] - mean;
      variance += diff * diff;
    }
    const std = Math.sqrt(variance / (period - 1 || 1));
    result.push(std * Math.sqrt(252)); // Annualized
  }

  return result;
}
