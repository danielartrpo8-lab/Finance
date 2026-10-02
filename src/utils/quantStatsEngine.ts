import { MarketCandle, QuantStatsMetrics } from '../types/finance';

/**
 * Computes performance analytics following the exact formulas of QuantStats (Python)
 */
export function calculateQuantStats(candles: MarketCandle[], riskFreeRateAnnual: number = 0.04): QuantStatsMetrics {
  if (candles.length < 5) {
    return {
      cumulativeReturnPct: 0,
      cagrPct: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdownPct: 0,
      maxDrawdownDurationDays: 0,
      annualizedVolatilityPct: 0,
      dailyVar95Pct: 0,
      cvar95Pct: 0,
      winRatePct: 0,
      profitFactor: 0,
      bestDayPct: 0,
      worstDayPct: 0,
      skewness: 0,
      kurtosis: 0,
      monthlyReturns: {},
      drawdownSeries: [],
    };
  }

  // 1. Calculate daily returns
  const dailyReturns: { date: string; ret: number }[] = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1].close;
    const curr = candles[i].close;
    const ret = prev > 0 ? (curr - prev) / prev : 0;
    dailyReturns.push({ date: candles[i].date, ret });
  }

  const rets = dailyReturns.map(d => d.ret);
  const n = rets.length;

  // 2. Cumulative Return
  const startPrice = candles[0].close;
  const endPrice = candles[candles.length - 1].close;
  const cumulativeReturnPct = ((endPrice - startPrice) / startPrice) * 100;

  // 3. CAGR
  const years = n / 252;
  const cagr = years > 0 ? Math.pow(endPrice / startPrice, 1 / years) - 1 : 0;
  const cagrPct = cagr * 100;

  // 4. Mean and Volatility
  const meanDailyRet = rets.reduce((acc, v) => acc + v, 0) / n;
  const variance = rets.reduce((acc, v) => acc + Math.pow(v - meanDailyRet, 2), 0) / (n - 1 || 1);
  const dailyStd = Math.sqrt(variance);
  const annualizedVolatilityPct = dailyStd * Math.sqrt(252) * 100;

  // 5. Sharpe Ratio (Annualized)
  const rfDaily = riskFreeRateAnnual / 252;
  const excessReturnDaily = meanDailyRet - rfDaily;
  const sharpeRatio = dailyStd > 0 ? (excessReturnDaily / dailyStd) * Math.sqrt(252) : 0;

  // 6. Downside deviation & Sortino Ratio
  const downsideDifferences = rets.map(r => (r < rfDaily ? Math.pow(r - rfDaily, 2) : 0));
  const downsideVariance = downsideDifferences.reduce((acc, v) => acc + v, 0) / (n - 1 || 1);
  const downsideDeviation = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideDeviation > 0 ? (excessReturnDaily / downsideDeviation) * Math.sqrt(252) : 0;

  // 7. Drawdown Series & Max Drawdown
  let peak = candles[0].close;
  let maxDrawdown = 0;
  let currentDdDuration = 0;
  let maxDdDuration = 0;
  const drawdownSeries: { date: string; drawdown: number }[] = [];

  for (let i = 0; i < candles.length; i++) {
    const price = candles[i].close;
    if (price > peak) {
      peak = price;
      currentDdDuration = 0;
    } else {
      currentDdDuration++;
      if (currentDdDuration > maxDdDuration) {
        maxDdDuration = currentDdDuration;
      }
    }

    const dd = (price - peak) / peak; // negative or 0
    if (dd < maxDrawdown) {
      maxDrawdown = dd;
    }
    drawdownSeries.push({
      date: candles[i].date,
      drawdown: parseFloat((dd * 100).toFixed(2)),
    });
  }
  const maxDrawdownPct = Math.abs(maxDrawdown) * 100;

  // 8. Calmar Ratio
  const calmarRatio = maxDrawdownPct > 0 ? cagrPct / maxDrawdownPct : 0;

  // 9. VaR 95% (Historical percentile 5%) and CVaR (Expected Shortfall)
  const sortedReturns = [...rets].sort((a, b) => a - b);
  const idx5th = Math.floor(n * 0.05);
  const dailyVar95Pct = Math.abs(sortedReturns[idx5th] || 0) * 100;

  // CVaR is the mean of all returns below the 5% VaR threshold
  const tailReturns = sortedReturns.slice(0, idx5th + 1);
  const cvarMean = tailReturns.length > 0 ? tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length : 0;
  const cvar95Pct = Math.abs(cvarMean) * 100;

  // 10. Win Rate & Profit Factor
  const winDays = rets.filter(r => r > 0);
  const lossDays = rets.filter(r => r < 0);
  const winRatePct = (winDays.length / (n || 1)) * 100;

  const totalGains = winDays.reduce((a, b) => a + b, 0);
  const totalLosses = Math.abs(lossDays.reduce((a, b) => a + b, 0));
  const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? 99.9 : 0;

  // 11. Best & Worst Day
  const bestDayPct = (Math.max(...rets) || 0) * 100;
  const worstDayPct = (Math.min(...rets) || 0) * 100;

  // 12. Skewness and Kurtosis
  let m3 = 0;
  let m4 = 0;
  for (const r of rets) {
    const diff = r - meanDailyRet;
    m3 += Math.pow(diff, 3);
    m4 += Math.pow(diff, 4);
  }
  m3 /= n;
  m4 /= n;
  const skewness = dailyStd > 0 ? m3 / Math.pow(dailyStd, 3) : 0;
  const kurtosis = dailyStd > 0 ? m4 / Math.pow(dailyStd, 4) - 3 : 0; // Excess kurtosis

  // 13. Monthly Returns Grid (QuantStats classic monthly table)
  const monthlyReturns: Record<number, Record<number, number>> = {};

  // Group candles by year and month
  const monthGroups: Record<string, { start: number; end: number }> = {};
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const key = c.date.substring(0, 7); // YYYY-MM
    if (!monthGroups[key]) {
      monthGroups[key] = { start: c.close, end: c.close };
    } else {
      monthGroups[key].end = c.close;
    }
  }

  for (const [ym, val] of Object.entries(monthGroups)) {
    const [yStr, mStr] = ym.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const retPct = ((val.end - val.start) / val.start) * 100;

    if (!monthlyReturns[year]) {
      monthlyReturns[year] = {};
    }
    monthlyReturns[year][month] = parseFloat(retPct.toFixed(2));
  }

  return {
    cumulativeReturnPct: parseFloat(cumulativeReturnPct.toFixed(2)),
    cagrPct: parseFloat(cagrPct.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
    calmarRatio: parseFloat(calmarRatio.toFixed(2)),
    maxDrawdownPct: parseFloat(maxDrawdownPct.toFixed(2)),
    maxDrawdownDurationDays: maxDdDuration,
    annualizedVolatilityPct: parseFloat(annualizedVolatilityPct.toFixed(2)),
    dailyVar95Pct: parseFloat(dailyVar95Pct.toFixed(2)),
    cvar95Pct: parseFloat(cvar95Pct.toFixed(2)),
    winRatePct: parseFloat(winRatePct.toFixed(1)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    bestDayPct: parseFloat(bestDayPct.toFixed(2)),
    worstDayPct: parseFloat(worstDayPct.toFixed(2)),
    skewness: parseFloat(skewness.toFixed(2)),
    kurtosis: parseFloat(kurtosis.toFixed(2)),
    monthlyReturns,
    drawdownSeries,
  };
}
