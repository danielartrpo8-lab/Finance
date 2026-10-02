import React, { useState } from 'react';
import { MarketCandle, DayForecast } from '../types/finance';
import { FittedModel } from '../utils/regressionEngine';

interface PriceForecastChartProps {
  candles: MarketCandle[];
  forecasts: DayForecast[];
  model: FittedModel | null;
  ticker: string;
}

export const PriceForecastChart: React.FC<PriceForecastChartProps> = ({
  candles,
  forecasts,
  model,
  ticker,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<{ type: 'hist' | 'test' | 'forecast'; idx: number } | null>(null);

  if (candles.length === 0) {
    return <div className="h-72 flex items-center justify-center text-slate-500 text-sm">Cargando gráfico de precios...</div>;
  }

  // Display the last 60 days of historical data + 8 forecast days for maximum visual readability
  const recentHistorical = candles.slice(-60);
  const testPredictions = model?.testPredictions || [];
  
  // Find min and max price across historical, forecast, and CI bounds
  const histCloses = recentHistorical.map(c => c.close);
  const forecastPrices = forecasts.map(f => f.projectedPrice);
  const lowerBounds = forecasts.map(f => f.lowerConfidenceBound);
  const upperBounds = forecasts.map(f => f.upperConfidenceBound);

  const allValues = [...histCloses, ...forecastPrices, ...lowerBounds, ...upperBounds];
  const minVal = Math.min(...allValues) * 0.98;
  const maxVal = Math.max(...allValues) * 1.02;
  const valRange = maxVal - minVal || 1;

  // Chart dimensions (SVG coordinate system)
  const width = 1000;
  const height = 360;
  const paddingLeft = 65;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 45;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const totalPoints = recentHistorical.length + forecasts.length;
  const xStep = chartWidth / (totalPoints - 1 || 1);

  // Coordinate mapping
  const getX = (index: number) => paddingLeft + index * xStep;
  const getY = (val: number) => paddingTop + chartHeight - ((val - minVal) / valRange) * chartHeight;

  // Historical path string
  const histPoints = recentHistorical.map((c, i) => `${getX(i)},${getY(c.close)}`);
  const histPathD = histPoints.length > 0 ? `M ${histPoints.join(' L ')}` : '';

  // Forecast path string (connects from the last historical point)
  const lastHistIdx = recentHistorical.length - 1;
  const lastHistClose = recentHistorical[lastHistIdx]?.close || 0;
  const forecastPoints = [
    `${getX(lastHistIdx)},${getY(lastHistClose)}`,
    ...forecasts.map((f, i) => `${getX(lastHistIdx + 1 + i)},${getY(f.projectedPrice)}`)
  ];
  const forecastPathD = `M ${forecastPoints.join(' L ')}`;

  // Shaded Confidence Interval polygon (Upper path forward, Lower path backward)
  const ciUpperPoints = [
    `${getX(lastHistIdx)},${getY(lastHistClose)}`,
    ...forecasts.map((f, i) => `${getX(lastHistIdx + 1 + i)},${getY(f.upperConfidenceBound)}`)
  ];
  const ciLowerPoints = [
    ...forecasts.map((f, i) => `${getX(lastHistIdx + 1 + i)},${getY(f.lowerConfidenceBound)}`).reverse(),
    `${getX(lastHistIdx)},${getY(lastHistClose)}`
  ];
  const ciPolygonD = `M ${ciUpperPoints.join(' L ')} L ${ciLowerPoints.join(' L ')} Z`;

  // Horizontal Grid Lines
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const val = minVal + ratio * valRange;
    return {
      val,
      y: getY(val),
    };
  });

  // Calculate active hover data
  let tooltipData: {
    title: string;
    date: string;
    price: number;
    extra?: string;
    ci?: string;
  } | null = null;

  if (hoveredIndex) {
    if (hoveredIndex.type === 'hist') {
      const c = recentHistorical[hoveredIndex.idx];
      if (c) {
        tooltipData = {
          title: 'Precio Histórico Real',
          date: c.date,
          price: c.close,
          extra: `Volumen: ${(c.volume / 1e6).toFixed(1)}M`,
        };
      }
    } else if (hoveredIndex.type === 'forecast') {
      const f = forecasts[hoveredIndex.idx];
      if (f) {
        tooltipData = {
          title: `Predicción Día +${f.dayNumber}`,
          date: `${f.dayName}, ${f.dateStr}`,
          price: f.projectedPrice,
          extra: `Var. diaria: ${f.dailyExpectedChangePct >= 0 ? '+' : ''}${f.dailyExpectedChangePct}%`,
          ci: `IC 95%: $${f.lowerConfidenceBound} - $${f.upperConfidenceBound}`,
        };
      }
    }
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 sm:p-5 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            Trayectoria Histórica y Cono de Proyección a 8 Días
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ventana reciente (60 ruedas) + Proyección multi-paso iterativa con intervalo de confianza al 95%
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-300"></span>
            <span className="text-slate-300">Precio Real Yahoo Finance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-400 border-b border-dashed border-cyan-400"></span>
            <span className="text-cyan-400 font-semibold">Regresión Scikit-Learn (+8D)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-cyan-500/20 border border-cyan-500/40 rounded-xs"></span>
            <span className="text-slate-400">Banda de Confianza 95%</span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[700px] select-none"
        >
          <defs>
            <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={width - paddingRight}
                y2={tick.y}
                stroke="#1e293b"
                strokeDasharray="3 3"
              />
              <text
                x={paddingLeft - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                ${tick.val.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Vertical boundary separating historical and forecast */}
          <line
            x1={getX(lastHistIdx)}
            y1={paddingTop}
            x2={getX(lastHistIdx)}
            y2={height - paddingBottom}
            stroke="#0ea5e9"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          <text
            x={getX(lastHistIdx)}
            y={paddingTop - 10}
            textAnchor="middle"
            className="text-[10px] fill-cyan-400 font-mono font-medium"
          >
            Hoy (t=0)
          </text>

          {/* Shaded Confidence Interval */}
          <path d={ciPolygonD} fill="url(#ciGradient)" />
          
          {/* Historical price line */}
          <path
            d={histPathD}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Forecast trajectory line */}
          <path
            d={forecastPathD}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeDasharray="5 3"
            strokeLinecap="round"
          />

          {/* Upper & Lower CI boundary lines */}
          <path
            d={`M ${ciUpperPoints.join(' L ')}`}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1"
            strokeOpacity="0.6"
          />
          <path
            d={`M ${forecasts.map((f, i) => `${getX(lastHistIdx + 1 + i)},${getY(f.lowerConfidenceBound)}`).join(' L ')}`}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1"
            strokeOpacity="0.6"
          />

          {/* Interactive Historical Points */}
          {recentHistorical.map((c, i) => {
            const cx = getX(i);
            const cy = getY(c.close);
            const isHovered = hoveredIndex?.type === 'hist' && hoveredIndex.idx === i;
            return (
              <circle
                key={`h-${i}`}
                cx={cx}
                cy={cy}
                r={isHovered ? 5 : 2}
                className={`transition-all cursor-pointer ${
                  isHovered ? 'fill-white stroke-cyan-400 stroke-2' : 'fill-slate-500 opacity-60'
                }`}
                onMouseEnter={() => setHoveredIndex({ type: 'hist', idx: i })}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}

          {/* Interactive Forecast Points (Día +1 a +8) */}
          {forecasts.map((f, i) => {
            const cx = getX(lastHistIdx + 1 + i);
            const cy = getY(f.projectedPrice);
            const isHovered = hoveredIndex?.type === 'forecast' && hoveredIndex.idx === i;
            return (
              <g key={`f-${i}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : 4}
                  className={`cursor-pointer transition-all ${
                    isHovered
                      ? 'fill-cyan-300 stroke-white stroke-2'
                      : f.signal === 'BULLISH'
                      ? 'fill-emerald-400 stroke-slate-900 stroke-2'
                      : f.signal === 'BEARISH'
                      ? 'fill-rose-400 stroke-slate-900 stroke-2'
                      : 'fill-cyan-400 stroke-slate-900 stroke-2'
                  }`}
                  onMouseEnter={() => setHoveredIndex({ type: 'forecast', idx: i })}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                <text
                  x={cx}
                  y={height - paddingBottom + 16}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-400 font-mono"
                >
                  +{f.dayNumber}d
                </text>
              </g>
            );
          })}

          {/* X Axis dates labels */}
          {[0, 15, 30, 45, lastHistIdx].map(idx => {
            const c = recentHistorical[idx];
            if (!c) return null;
            return (
              <text
                key={idx}
                x={getX(idx)}
                y={height - paddingBottom + 16}
                textAnchor="middle"
                className="text-[10px] fill-slate-500 font-mono"
              >
                {c.date.slice(5)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Floating Hover Tooltip */}
      {tooltipData && (
        <div className="absolute top-4 right-4 bg-slate-950/95 border border-cyan-500/50 rounded-md p-2.5 shadow-xl pointer-events-none text-xs z-10 font-mono min-w-[200px]">
          <div className="text-cyan-400 font-bold">{tooltipData.title}</div>
          <div className="text-slate-400 text-[11px] mb-1">{tooltipData.date}</div>
          <div className="text-white text-base font-bold tabular-nums">
            ${tooltipData.price.toFixed(2)} USD
          </div>
          {tooltipData.extra && (
            <div className="text-slate-300 text-[11px] mt-0.5">{tooltipData.extra}</div>
          )}
          {tooltipData.ci && (
            <div className="text-cyan-300/80 text-[10px] mt-0.5">{tooltipData.ci}</div>
          )}
        </div>
      )}
    </div>
  );
};
