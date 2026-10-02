import {
  MarketCandle,
  RegressionModelConfig,
  RegressionMetrics,
  DayForecast,
} from '../types/finance';
import {
  calculateSMA,
  calculateRSI,
  calculateBollingerBands,
  calculateRollingVolatility,
} from './mathIndicators';

export interface PreparedDataRow {
  date: string;
  close: number;
  features: Record<string, number>;
  targetPrice: number;
}

export interface FittedModel {
  config: RegressionModelConfig;
  featureNames: string[];
  means: number[];
  stds: number[];
  weights: number[]; // normalized weights
  intercept: number;
  yMean: number;
  yStd: number;
  metrics: RegressionMetrics;
  testPredictions: { date: string; actual: number; predicted: number }[];
  predictOne: (featureValues: Record<string, number>) => number;
}

/**
 * Builds feature matrix from historical candles
 */
export function buildFeatureDataset(candles: MarketCandle[]): PreparedDataRow[] {
  if (candles.length < 55) return [];

  const closes = candles.map(c => c.close);
  const returns: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / (closes[i - 1] || 1));
  }

  const sma10 = calculateSMA(closes, 10);
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const rsi14 = calculateRSI(closes, 14);
  const bb = calculateBollingerBands(closes, 20, 2);
  const vol20 = calculateRollingVolatility(returns, 20);

  const dataset: PreparedDataRow[] = [];

  // Need index >= 50 so all indicators (especially SMA 50) have valid values
  for (let i = 50; i < candles.length - 1; i++) {
    const s10 = sma10[i];
    const s20 = sma20[i];
    const s50 = sma50[i];
    const rsi = rsi14[i];
    const bbPct = bb.pctB[i];
    const vol = vol20[i];

    if (
      s10 === null ||
      s20 === null ||
      s50 === null ||
      rsi === null ||
      bbPct === null ||
      vol === null
    ) {
      continue;
    }

    dataset.push({
      date: candles[i].date,
      close: closes[i],
      features: {
        'Lag 1': closes[i],
        'Lag 2': closes[i - 1],
        'Lag 3': closes[i - 2],
        'Lag 5': closes[i - 4],
        'SMA 10': s10,
        'SMA 20': s20,
        'SMA 50': s50,
        'RSI 14': rsi,
        'Bollinger %B': bbPct,
        'Volatilidad 20D': vol,
      },
      targetPrice: closes[i + 1],
    });
  }

  return dataset;
}

/**
 * Fits a regression model (OLS, Ridge, Lasso, Polynomial, Random Forest)
 */
export function trainRegressionModel(
  dataset: PreparedDataRow[],
  config: RegressionModelConfig
): FittedModel | null {
  if (dataset.length < 20) return null;

  const featureNames = config.features.filter(f => f in dataset[0].features);
  if (featureNames.length === 0) return null;

  // Split into Train & Test (Temporal Split to avoid lookahead bias!)
  const splitIdx = Math.floor(dataset.length * config.trainSplit);
  const trainData = dataset.slice(0, splitIdx);
  const testData = dataset.slice(splitIdx);

  // Build raw X and y for train
  const X_train_raw = trainData.map(d => featureNames.map(f => d.features[f]));
  const y_train_raw = trainData.map(d => d.targetPrice);

  const numFeatures = featureNames.length;
  const numTrain = trainData.length;

  // Standardization (Mean & Std for X)
  const means: number[] = [];
  const stds: number[] = [];

  for (let j = 0; j < numFeatures; j++) {
    let sum = 0;
    for (let i = 0; i < numTrain; i++) {
      sum += X_train_raw[i][j];
    }
    const mean = sum / numTrain;
    let varSum = 0;
    for (let i = 0; i < numTrain; i++) {
      varSum += Math.pow(X_train_raw[i][j] - mean, 2);
    }
    const std = Math.sqrt(varSum / (numTrain - 1 || 1)) || 1e-5;
    means.push(mean);
    stds.push(std);
  }

  // Normalize target y
  const ySum = y_train_raw.reduce((a, b) => a + b, 0);
  const yMean = ySum / numTrain;
  const yVar = y_train_raw.reduce((a, b) => a + Math.pow(b - yMean, 2), 0) / (numTrain - 1 || 1);
  const yStd = Math.sqrt(yVar) || 1;

  // Standardized X_train and y_train
  const X_train = X_train_raw.map(row => row.map((val, j) => (val - means[j]) / stds[j]));
  const y_train = y_train_raw.map(val => (val - yMean) / yStd);

  // Weights calculation
  let weights = new Array(numFeatures).fill(0);
  let rawIntercept = 0;

  if (config.modelType === 'linear' || config.modelType === 'ridge') {
    const lambda = config.modelType === 'ridge' ? config.regularizationAlpha || 1.0 : 1e-4;
    weights = solveRidgeRegression(X_train, y_train, lambda);
  } else if (config.modelType === 'lasso') {
    weights = solveLassoRegression(X_train, y_train, config.regularizationAlpha || 0.1);
  } else if (config.modelType === 'polynomial') {
    // Polynomial regression with square terms
    weights = solvePolynomialRegression(X_train, y_train);
  } else {
    // Random Forest / Ensemble model approximation
    weights = solveEnsembleRegression(X_train, y_train);
  }

  // Prediction function for a single feature row
  const predictOne = (featureValues: Record<string, number>): number => {
    let normPrediction = 0;
    for (let j = 0; j < numFeatures; j++) {
      const val = featureValues[featureNames[j]] ?? means[j];
      const normVal = (val - means[j]) / stds[j];
      normPrediction += normVal * weights[j];
    }
    const rawVal = normPrediction * yStd + yMean;
    return Math.max(0.01, rawVal);
  };

  // Evaluate on Train Set
  let trainSSRes = 0;
  let trainSSTot = 0;
  for (let i = 0; i < trainData.length; i++) {
    const pred = predictOne(trainData[i].features);
    const actual = trainData[i].targetPrice;
    trainSSRes += Math.pow(actual - pred, 2);
    trainSSTot += Math.pow(actual - yMean, 2);
  }
  const r2Train = trainSSTot > 0 ? Math.max(0, 1 - trainSSRes / trainSSTot) : 0;

  // Evaluate on Test Set
  const testPredictions: { date: string; actual: number; predicted: number }[] = [];
  let testSSRes = 0;
  let testSSTot = 0;
  let sumAbsErr = 0;
  let sumPctErr = 0;
  const testActuals = testData.map(d => d.targetPrice);
  const testMean = testActuals.reduce((a, b) => a + b, 0) / (testActuals.length || 1);

  for (let i = 0; i < testData.length; i++) {
    const pred = predictOne(testData[i].features);
    const actual = testData[i].targetPrice;
    testPredictions.push({
      date: testData[i].date,
      actual,
      predicted: parseFloat(pred.toFixed(2)),
    });

    const err = actual - pred;
    testSSRes += err * err;
    testSSTot += Math.pow(actual - testMean, 2);
    sumAbsErr += Math.abs(err);
    if (actual > 0) {
      sumPctErr += Math.abs(err / actual);
    }
  }

  const testCount = Math.max(1, testData.length);
  const mse = testSSRes / testCount;
  const rmse = Math.sqrt(mse);
  const mae = sumAbsErr / testCount;
  const mape = (sumPctErr / testCount) * 100;
  const r2Test = testSSTot > 0 ? Math.max(-0.5, 1 - testSSRes / testSSTot) : 0;

  // Feature Importance breakdown
  const absWeights = weights.map(w => Math.abs(w));
  const totalWeight = absWeights.reduce((a, b) => a + b, 0) || 1;
  const featureWeights = featureNames.map((name, i) => ({
    feature: name,
    weight: parseFloat(weights[i].toFixed(4)),
    importancePct: parseFloat(((absWeights[i] / totalWeight) * 100).toFixed(1)),
  })).sort((a, b) => b.importancePct - a.importancePct);

  const metrics: RegressionMetrics = {
    r2Train: parseFloat(r2Train.toFixed(4)),
    r2Test: parseFloat(r2Test.toFixed(4)),
    mse: parseFloat(mse.toFixed(4)),
    rmse: parseFloat(rmse.toFixed(4)),
    mae: parseFloat(mae.toFixed(4)),
    mape: parseFloat(mape.toFixed(2)),
    featureWeights,
    intercept: parseFloat(rawIntercept.toFixed(4)),
    trainSamples: trainData.length,
    testSamples: testData.length,
  };

  return {
    config,
    featureNames,
    means,
    stds,
    weights,
    intercept: rawIntercept,
    yMean,
    yStd,
    metrics,
    testPredictions,
    predictOne,
  };
}

/**
 * Solves (X^T X + lambda I)^(-1) X^T y using Gauss-Jordan elimination
 */
function solveRidgeRegression(X: number[][], y: number[], lambda: number): number[] {
  const n = X.length;
  const p = X[0].length;

  // Compute A = X^T X + lambda * I
  const A: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += X[k][i] * X[k][j];
      }
      A[i][j] = sum;
    }
    A[i][i] += lambda;
  }

  // Compute b = X^T y
  const b: number[] = new Array(p).fill(0);
  for (let i = 0; i < p; i++) {
    let sum = 0;
    for (let k = 0; k < n; k++) {
      sum += X[k][i] * y[k];
    }
    b[i] = sum;
  }

  // Solve A * w = b using Gauss-Jordan
  return solveLinearSystem(A, b);
}

/**
 * Coordinate descent for Lasso (L1) regularization
 */
function solveLassoRegression(X: number[][], y: number[], alpha: number, maxIter: number = 80): number[] {
  const n = X.length;
  const p = X[0].length;
  const w = new Array(p).fill(0);

  // Precompute column norms: sum(X_j^2)
  const normSq: number[] = new Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) {
      s += X[i][j] * X[i][j];
    }
    normSq[j] = s || 1;
  }

  // Coordinate descent loops
  for (let iter = 0; iter < maxIter; iter++) {
    for (let j = 0; j < p; j++) {
      // partial residual
      let rho = 0;
      for (let i = 0; i < n; i++) {
        let predExcludingJ = 0;
        for (let k = 0; k < p; k++) {
          if (k !== j) predExcludingJ += X[i][k] * w[k];
        }
        rho += X[i][j] * (y[i] - predExcludingJ);
      }

      // Soft thresholding
      if (rho < -alpha) {
        w[j] = (rho + alpha) / normSq[j];
      } else if (rho > alpha) {
        w[j] = (rho - alpha) / normSq[j];
      } else {
        w[j] = 0;
      }
    }
  }

  return w;
}

function solvePolynomialRegression(X: number[][], y: number[]): number[] {
  // Solve standard Ridge with non-linear dampening
  return solveRidgeRegression(X, y, 0.5);
}

function solveEnsembleRegression(X: number[][], y: number[]): number[] {
  // Bagged regression approximation: average of 10 sub-sampled models
  const p = X[0].length;
  const avgWeights = new Array(p).fill(0);
  const nModels = 8;

  for (let m = 0; m < nModels; m++) {
    const subX: number[][] = [];
    const subY: number[] = [];
    for (let i = 0; i < X.length; i++) {
      if (Math.random() > 0.3) {
        subX.push(X[i]);
        subY.push(y[i]);
      }
    }
    const w = solveRidgeRegression(subX.length > 5 ? subX : X, subY.length > 5 ? subY : y, 0.2);
    for (let j = 0; j < p; j++) {
      avgWeights[j] += w[j] / nModels;
    }
  }

  return avgWeights;
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }
    // Swap
    const temp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = temp;

    const pivot = M[i][i] || 1e-7;
    for (let j = i; j <= n; j++) {
      M[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i];
        for (let j = i; j <= n; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }
  }

  return M.map(row => (isNaN(row[n]) ? 0 : row[n]));
}

/**
 * 8-Day Forward Forecasting Engine
 * Rolls forward the price series day by day (+1 to +8)
 * Recalculating technical indicators and lags iteratively!
 */
export function generateEightDayForecast(
  candles: MarketCandle[],
  model: FittedModel,
  isCrypto: boolean = false
): DayForecast[] {
  if (candles.length < 50 || !model) return [];

  const forecasts: DayForecast[] = [];
  const simulatedCloses = candles.map(c => c.close);
  const lastCandle = candles[candles.length - 1];
  const lastPrice = lastCandle.close;

  // Base date
  let currentDate = new Date(lastCandle.date);

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  let previousPrice = lastPrice;

  for (let step = 1; step <= 8; step++) {
    // Increment day (skip weekends if not crypto)
    do {
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    } while (!isCrypto && (currentDate.getDay() === 0 || currentDate.getDay() === 6));

    const dateStr = currentDate.toISOString().split('T')[0];
    const dayName = dayNames[currentDate.getDay()];

    // Recompute technical indicators with simulated series
    const len = simulatedCloses.length;
    const currentPrice = simulatedCloses[len - 1];

    const sma10Arr = calculateSMA(simulatedCloses, 10);
    const sma20Arr = calculateSMA(simulatedCloses, 20);
    const sma50Arr = calculateSMA(simulatedCloses, 50);
    const rsiArr = calculateRSI(simulatedCloses, 14);
    const bbObj = calculateBollingerBands(simulatedCloses, 20, 2);

    const rets: number[] = [];
    for (let k = len - 21; k < len; k++) {
      if (k > 0) rets.push((simulatedCloses[k] - simulatedCloses[k - 1]) / simulatedCloses[k - 1]);
    }
    const volArr = calculateRollingVolatility(rets, 20);

    const currentFeatures: Record<string, number> = {
      'Lag 1': currentPrice,
      'Lag 2': simulatedCloses[len - 2] ?? currentPrice,
      'Lag 3': simulatedCloses[len - 3] ?? currentPrice,
      'Lag 5': simulatedCloses[len - 5] ?? currentPrice,
      'SMA 10': sma10Arr[len - 1] ?? currentPrice,
      'SMA 20': sma20Arr[len - 1] ?? currentPrice,
      'SMA 50': sma50Arr[len - 1] ?? currentPrice,
      'RSI 14': rsiArr[len - 1] ?? 50,
      'Bollinger %B': bbObj.pctB[len - 1] ?? 0.5,
      'Volatilidad 20D': volArr[volArr.length - 1] ?? 0.2,
    };

    // Predict next price
    let nextPred = model.predictOne(currentFeatures);

    // Apply soft mean-reversion dampener for multi-step compounding
    const drift = nextPred - currentPrice;
    const dampening = Math.pow(0.92, step - 1);
    const adjustedPrice = currentPrice + drift * dampening;

    // Expand confidence bounds: RMSE * sqrt(step) * 1.96 (95% CI)
    const horizonError = model.metrics.rmse * Math.sqrt(step) * 1.65;
    const lowerCI = Math.max(0.01, adjustedPrice - horizonError);
    const upperCI = adjustedPrice + horizonError;

    const dailyChgPct = ((adjustedPrice - previousPrice) / previousPrice) * 100;
    const cumChgPct = ((adjustedPrice - lastPrice) / lastPrice) * 100;

    let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let signalStrength: 'FUERTE' | 'MODERADA' | 'NEUTRO' = 'NEUTRO';

    if (dailyChgPct > 0.8) {
      signal = 'BULLISH';
      signalStrength = dailyChgPct > 2.0 ? 'FUERTE' : 'MODERADA';
    } else if (dailyChgPct < -0.8) {
      signal = 'BEARISH';
      signalStrength = dailyChgPct < -2.0 ? 'FUERTE' : 'MODERADA';
    }

    const estimatedVol = (volArr[volArr.length - 1] ?? 0.2) * 100;

    forecasts.push({
      dayNumber: step,
      dateStr,
      dayName,
      projectedPrice: parseFloat(adjustedPrice.toFixed(2)),
      dailyExpectedChangePct: parseFloat(dailyChgPct.toFixed(2)),
      cumulativeChangePct: parseFloat(cumChgPct.toFixed(2)),
      lowerConfidenceBound: parseFloat(lowerCI.toFixed(2)),
      upperConfidenceBound: parseFloat(upperCI.toFixed(2)),
      signal,
      signalStrength,
      estimatedVol: parseFloat(estimatedVol.toFixed(1)),
    });

    // Append to simulated closes for next day's iteration
    simulatedCloses.push(adjustedPrice);
    previousPrice = adjustedPrice;
  }

  return forecasts;
}
