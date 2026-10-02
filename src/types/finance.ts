export interface MarketCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}

export interface AssetProfile {
  ticker: string;
  name: string;
  category: 'Tech' | 'Index ETF' | 'Crypto' | 'Blue Chip' | 'Growth';
  sector: string;
  academicRationale: string;
}

export interface FeatureEngineeredSample {
  date: string;
  close: number;
  dailyReturn: number;
  lag1: number;
  lag2: number;
  lag3: number;
  lag5: number;
  sma10: number;
  sma20: number;
  sma50: number;
  rsi14: number;
  bbandUpper: number;
  bbandLower: number;
  volatility20d: number;
  targetPrice: number; // Next day price
  targetReturn: number; // Next day return
}

export type ModelType = 'linear' | 'ridge' | 'lasso' | 'polynomial' | 'random_forest';

export interface RegressionModelConfig {
  modelType: ModelType;
  trainSplit: number; // e.g. 0.8
  regularizationAlpha: number; // for Ridge / Lasso
  features: string[];
}

export interface RegressionMetrics {
  r2Train: number;
  r2Test: number;
  mse: number;
  rmse: number;
  mae: number;
  mape: number;
  featureWeights: { feature: string; weight: number; importancePct: number }[];
  intercept: number;
  trainSamples: number;
  testSamples: number;
}

export interface DayForecast {
  dayNumber: number; // 1 to 8
  dateStr: string;
  dayName: string;
  projectedPrice: number;
  dailyExpectedChangePct: number;
  cumulativeChangePct: number;
  lowerConfidenceBound: number;
  upperConfidenceBound: number;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  signalStrength: 'FUERTE' | 'MODERADA' | 'NEUTRO';
  estimatedVol: number;
}

export interface QuantStatsMetrics {
  cumulativeReturnPct: number;
  cagrPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdownPct: number;
  maxDrawdownDurationDays: number;
  annualizedVolatilityPct: number;
  dailyVar95Pct: number;
  cvar95Pct: number;
  winRatePct: number;
  profitFactor: number;
  bestDayPct: number;
  worstDayPct: number;
  skewness: number;
  kurtosis: number;
  monthlyReturns: Record<number, Record<number, number>>; // Year -> Month -> Return %
  drawdownSeries: { date: string; drawdown: number }[];
}

export interface HistoricalDataset {
  symbol: string;
  currency: string;
  isSynthetic: boolean;
  records: MarketCandle[];
  regularMarketPrice: number;
  lastUpdated: string;
}
