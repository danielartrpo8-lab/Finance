import React from 'react';
import { ShieldAlert, TrendingUp, Calendar, HelpCircle, Layers } from 'lucide-react';
import { QuantStatsMetrics } from '../types/finance';

interface QuantStatsTearSheetProps {
  metrics: QuantStatsMetrics;
  ticker: string;
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const QuantStatsTearSheet: React.FC<QuantStatsTearSheetProps> = ({
  metrics,
  ticker,
}) => {
  const years = Object.keys(metrics.monthlyReturns)
    .map(Number)
    .sort((a, b) => b - a);

  // Underwater chart points
  const ddPoints = metrics.drawdownSeries.slice(-120);
  const minDd = Math.min(0, ...ddPoints.map(d => d.drawdown));
  const ddWidth = 800;
  const ddHeight = 160;
  const ddPaddingX = 40;
  const ddPaddingY = 20;

  const getDdY = (val: number) => {
    // 0 is at top (ddPaddingY), minDd is at bottom (ddHeight - ddPaddingY)
    const range = Math.abs(minDd) || 1;
    return ddPaddingY + (Math.abs(val) / range) * (ddHeight - 2 * ddPaddingY);
  };

  const getDdX = (index: number) => {
    const step = (ddWidth - 2 * ddPaddingX) / (ddPoints.length - 1 || 1);
    return ddPaddingX + index * step;
  };

  const ddSvgPath =
    ddPoints.length > 0
      ? `M ${getDdX(0)},${getDdY(0)} ` +
        ddPoints.map((d, i) => `L ${getDdX(i)},${getDdY(d.drawdown)}`).join(' ') +
        ` L ${getDdX(ddPoints.length - 1)},${getDdY(0)} Z`
      : '';

  return (
    <div className="space-y-6">
      {/* Tear Sheet Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <span>Librería Python: quantstats</span>
              <span aria-hidden="true">·</span>
              <span className="text-cyan-400">Tear Sheet Cuantitativo</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Evaluación Institucional de Riesgo y Rendimiento ({ticker})
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            Tasa libre de riesgo (Rf): 4.0%
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-cyan-300">QuantStats</strong> es la suite de análisis cuantitativo estándar en Python y GitHub para evaluar la viabilidad de carteras y estrategias. Mientras que Scikit-Learn predice el precio a 8 días, QuantStats mide la calidad estructural de los rendimientos históricos, penalizando la volatilidad asimétrica y las caídas prolongadas (*drawdowns*).
        </p>
      </div>

      {/* Primary QuantStats Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="text-[11px] font-mono text-slate-400">Sharpe Ratio (Anualizado)</div>
          <div
            className={`text-2xl font-bold font-mono mt-1 tabular-nums ${
              metrics.sharpeRatio >= 1.0
                ? 'text-emerald-400'
                : metrics.sharpeRatio >= 0.5
                ? 'text-cyan-400'
                : 'text-amber-400'
            }`}
          >
            {metrics.sharpeRatio.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {metrics.sharpeRatio >= 1 ? 'Excelente relación retorno/riesgo' : 'Retorno ajustado modesto'}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="text-[11px] font-mono text-slate-400">Sortino Ratio</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {metrics.sortinoRatio.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Penaliza únicamente volatilidad a la baja
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="text-[11px] font-mono text-slate-400">Max Drawdown (MDD)</div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1 tabular-nums">
            -{metrics.maxDrawdownPct.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Duración máxima: {metrics.maxDrawdownDurationDays} ruedas
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="text-[11px] font-mono text-slate-400">Volatilidad Anualizada</div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1 tabular-nums">
            {metrics.annualizedVolatilityPct.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            $\sigma \times \sqrt{252}$ días bursátiles
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="text-[11px] font-mono text-slate-400">Calmar Ratio</div>
          <div className="text-2xl font-bold font-mono text-slate-200 mt-1 tabular-nums">
            {metrics.calmarRatio.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Retorno anual / Max Drawdown
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="text-[11px] font-mono text-slate-400">Value at Risk (VaR 95% Diario)</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
            {metrics.dailyVar95Pct.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Pérdida máxima esperada al 95% de confianza
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="text-[11px] font-mono text-slate-400">Expected Shortfall (CVaR 95%)</div>
          <div className="text-2xl font-bold font-mono text-rose-300 mt-1 tabular-nums">
            {metrics.cvar95Pct.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Pérdida promedio en el 5% peor de casos
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="text-[11px] font-mono text-slate-400">Win Rate (% Días Positivos)</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {metrics.winRatePct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Factor de Ganancia: {metrics.profitFactor.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Secondary Distribution Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded p-3 text-xs font-mono">
          <span className="text-slate-400 block text-[10px]">Mejor Día Histórico</span>
          <span className="text-emerald-400 font-bold text-sm">+{metrics.bestDayPct.toFixed(2)}%</span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800/80 rounded p-3 text-xs font-mono">
          <span className="text-slate-400 block text-[10px]">Peor Día Histórico</span>
          <span className="text-rose-400 font-bold text-sm">{metrics.worstDayPct.toFixed(2)}%</span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800/80 rounded p-3 text-xs font-mono">
          <span className="text-slate-400 block text-[10px]">Asimetría (Skewness)</span>
          <span className="text-slate-200 font-bold text-sm">{metrics.skewness.toFixed(2)}</span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800/80 rounded p-3 text-xs font-mono">
          <span className="text-slate-400 block text-[10px]">Curtosis Excesiva</span>
          <span className="text-slate-200 font-bold text-sm">{metrics.kurtosis.toFixed(2)}</span>
        </div>
      </div>

      {/* Underwater Drawdown Chart */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Gráfico Underwater: Caídas desde Máximos Históricos (Drawdowns)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Representación de la profundidad y duración de las pérdidas no realizadas
            </p>
          </div>
          <span className="text-xs font-mono text-rose-400">
            Pico de caída: -{metrics.maxDrawdownPct.toFixed(2)}%
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${ddWidth} ${ddHeight}`} className="w-full h-auto min-w-[600px]">
            <defs>
              <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Zero reference line */}
            <line
              x1={ddPaddingX}
              y1={getDdY(0)}
              x2={ddWidth - ddPaddingX}
              y2={getDdY(0)}
              stroke="#475569"
              strokeWidth="1"
            />
            <text x={ddPaddingX - 8} y={getDdY(0) + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
              0%
            </text>

            {/* Min DD line */}
            <line
              x1={ddPaddingX}
              y1={getDdY(minDd)}
              x2={ddWidth - ddPaddingX}
              y2={getDdY(minDd)}
              stroke="#334155"
              strokeDasharray="3 3"
            />
            <text x={ddPaddingX - 8} y={getDdY(minDd) + 4} textAnchor="end" className="text-[10px] fill-rose-400 font-mono">
              {minDd.toFixed(1)}%
            </text>

            {/* Drawdown area and stroke */}
            <path d={ddSvgPath} fill="url(#ddGrad)" stroke="#f43f5e" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      {/* Monthly Returns Heatmap (QuantStats Signature Report Table) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Mapa de Calor de Retornos Mensuales (% Retorno por Mes)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Matriz histórica de desempeño mensual idéntica al reporte HTML de QuantStats
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-center">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                <th className="py-2 px-3 text-left">Año</th>
                {MONTH_NAMES.map(m => (
                  <th key={m} className="py-2 px-2">{m}</th>
                ))}
                <th className="py-2 px-3 text-right">Anual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {years.map(yr => {
                const monthsData = metrics.monthlyReturns[yr] || {};
                let yearlySum = 0;
                let monthCount = 0;

                return (
                  <tr key={yr} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-3 text-left font-bold text-slate-200">{yr}</td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                      const val = monthsData[m];
                      if (val === undefined || isNaN(val)) {
                        return <td key={m} className="py-2 px-2 text-slate-600">—</td>;
                      }
                      yearlySum += val;
                      monthCount++;
                      const isPositive = val >= 0;
                      return (
                        <td key={m} className="py-2 px-2">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums ${
                              isPositive
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-rose-500/15 text-rose-400'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {val.toFixed(1)}%
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                      <span className={yearlySum >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {yearlySum >= 0 ? '+' : ''}
                        {yearlySum.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
