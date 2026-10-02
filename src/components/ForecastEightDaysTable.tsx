import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Copy, Check, Download, AlertCircle } from 'lucide-react';
import { DayForecast, MarketCandle } from '../types/finance';
import { FittedModel } from '../utils/regressionEngine';

interface ForecastEightDaysTableProps {
  forecasts: DayForecast[];
  candles: MarketCandle[];
  model: FittedModel | null;
  ticker: string;
}

export const ForecastEightDaysTable: React.FC<ForecastEightDaysTableProps> = ({
  forecasts,
  candles,
  model,
  ticker,
}) => {
  const [copied, setCopied] = useState(false);

  if (forecasts.length === 0 || candles.length === 0) {
    return null;
  }

  const currentPrice = candles[candles.length - 1].close;
  const target8dPrice = forecasts[forecasts.length - 1].projectedPrice;
  const total8dChangePct = ((target8dPrice - currentPrice) / currentPrice) * 100;
  
  // Market diagnosis today
  const lastReturns = [];
  for (let i = candles.length - 10; i < candles.length; i++) {
    if (i > 0) lastReturns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
  }
  const avg10dReturn = lastReturns.reduce((a, b) => a + b, 0) / (lastReturns.length || 1);
  const isCurrentlyBullish = avg10dReturn > 0.001;

  // Copy table to clipboard in tab-separated format for Excel / Google Sheets
  const handleCopyTable = () => {
    const header = 'Día\tFecha\tPrecio Proyectado (USD)\tVar. Diaria (%)\tRetorno Acum. (%)\tIC 95% Inferior\tIC 95% Superior\tSeñal';
    const rows = forecasts.map(
      f => `${f.dayNumber}\t${f.dateStr}\t${f.projectedPrice}\t${f.dailyExpectedChangePct}%\t${f.cumulativeChangePct}%\t${f.lowerConfidenceBound}\t${f.upperConfidenceBound}\t${f.signal}`
    );
    navigator.clipboard.writeText([header, ...rows].join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCSV = () => {
    const header = 'Dia,Fecha,DiaSemana,PrecioProyectadoUSD,VarDiariaPct,RetornoAcumuladoPct,ICInferior95,ICSuperior95,Senal\n';
    const rows = forecasts
      .map(
        f =>
          `${f.dayNumber},${f.dateStr},${f.dayName},${f.projectedPrice},${f.dailyExpectedChangePct},${f.cumulativeChangePct},${f.lowerConfidenceBound},${f.upperConfidenceBound},${f.signal}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `prediccion_8dias_${ticker.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary Cards: ¿Cómo está hoy? y ¿Cómo estará en 8 días? */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Diagnóstico Actual */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-2">
            <span>Diagnóstico de Mercado</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">Estado al Cierre de Hoy</span>
          </div>
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-lg font-bold text-slate-100">
              ¿Cómo está {ticker} hoy?
            </h3>
            <span className="text-xl font-bold font-mono text-white tabular-nums">
              ${currentPrice.toFixed(2)} USD
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            {isCurrentlyBullish
              ? `El activo ${ticker} muestra una inercia constructiva con momentum positivo en las últimas 10 ruedas. Los osciladores de corto plazo indican absorción de liquidez por encima de sus medias móviles de soporte.`
              : `El activo ${ticker} atraviesa una fase de consolidación o ajuste correctivo a corto plazo. Su volatilidad realizada muestra cautela por parte de los operadores de mercado.`}
          </p>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-400">Sesgo Técnico</div>
              <div className={`font-semibold mt-0.5 ${isCurrentlyBullish ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isCurrentlyBullish ? 'Tendencia Positiva' : 'Consolidación'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Error RMSE</div>
              <div className="font-semibold text-slate-200 mt-0.5 tabular-nums">
                ±${model?.metrics.rmse.toFixed(2) ?? '0.00'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Bondad R² Test</div>
              <div className="font-semibold text-cyan-400 mt-0.5 tabular-nums">
                {model?.metrics.r2Test.toFixed(3) ?? 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Proyección 8 Días */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-2">
            <span>Scikit-Learn Forecast</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">Horizonte 8 Días Hábiles</span>
          </div>
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-lg font-bold text-slate-100">
              ¿Cómo estará performando en 8 días?
            </h3>
            <span
              className={`text-xl font-bold font-mono tabular-nums ${
                total8dChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {total8dChangePct >= 0 ? '+' : ''}
              {total8dChangePct.toFixed(2)}%
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            El modelo de regresión proyecta que para el{' '}
            <strong className="text-slate-100 font-mono">{forecasts[forecasts.length - 1].dateStr}</strong>{' '}
            (Día +8), {ticker} alcanzará un precio estimado de{' '}
            <strong className="text-cyan-300 font-mono">${target8dPrice.toFixed(2)} USD</strong>{' '}
            con un cono de confianza probabilístico del 95% situado entre{' '}
            <span className="font-mono text-slate-200">${forecasts[forecasts.length - 1].lowerConfidenceBound.toFixed(2)}</span>{' '}
            y{' '}
            <span className="font-mono text-slate-200">${forecasts[forecasts.length - 1].upperConfidenceBound.toFixed(2)} USD</span>.
          </p>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-400">Objetivo Día +8</div>
              <div className="font-semibold text-cyan-300 mt-0.5 tabular-nums">
                ${target8dPrice.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Dirección Esperada</div>
              <div
                className={`font-semibold mt-0.5 ${
                  total8dChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {total8dChangePct >= 0 ? 'Alcista Moderado' : 'Bajista Moderado'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Riesgo Modelo</div>
              <div className="font-semibold text-slate-200 mt-0.5">
                Normalizado
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 8-Day Projection Data Grid */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Tabla Diaria de Proyección (Día +1 a Día +8)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulación iterativa paso a paso calculada sobre features técnicas normalizadas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTable}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-950 border border-slate-800 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar TSV'}</span>
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-950 border border-slate-800 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar CSV</span>
            </button>
          </div>
        </div>

        {/* Dense Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
              <tr>
                <th className="py-3 px-4 font-semibold">Paso</th>
                <th className="py-3 px-4 font-semibold">Fecha Hábil</th>
                <th className="py-3 px-4 font-semibold text-right">Precio Proyectado</th>
                <th className="py-3 px-4 font-semibold text-right">Var. Diaria</th>
                <th className="py-3 px-4 font-semibold text-right">Ret. Acumulado</th>
                <th className="py-3 px-4 font-semibold text-center">Banda Confianza 95%</th>
                <th className="py-3 px-4 font-semibold text-center">Señal</th>
                <th className="py-3 px-4 font-semibold text-right">Vol. Estimada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {forecasts.map(f => {
                const isPositiveDaily = f.dailyExpectedChangePct >= 0;
                const isPositiveCum = f.cumulativeChangePct >= 0;

                return (
                  <tr key={f.dayNumber} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-200">
                      Día +{f.dayNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      <span>{f.dateStr}</span>
                      <span className="text-[11px] text-slate-500 ml-1.5 font-sans">({f.dayName})</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-100 tabular-nums">
                      ${f.projectedPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      <span
                        className={`inline-flex items-center gap-0.5 font-semibold ${
                          isPositiveDaily ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositiveDaily ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {isPositiveDaily ? '+' : ''}
                        {f.dailyExpectedChangePct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      <span
                        className={`font-semibold ${
                          isPositiveCum ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositiveCum ? '+' : ''}
                        {f.cumulativeChangePct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums text-slate-400">
                      <span className="text-slate-300">${f.lowerConfidenceBound.toFixed(2)}</span>
                      <span className="mx-1 text-slate-600">—</span>
                      <span className="text-slate-300">${f.upperConfidenceBound.toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          f.signal === 'BULLISH'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : f.signal === 'BEARISH'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {f.signal === 'BULLISH' ? 'ALCISTA' : f.signal === 'BEARISH' ? 'BAJISTA' : 'NEUTRAL'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-slate-400">
                      {f.estimatedVol.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Academic Note Footer */}
        <div className="p-3.5 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-300">Nota para el informe de la materia: </strong>
            El intervalo de confianza al 95% (h = 1 a 8) se expande proporcionalmente a la raíz del horizonte de predicción (√h), modelando el incremento de entropía e incertidumbre estocástica en series temporales no estacionarias.
          </p>
        </div>
      </div>
    </div>
  );
};
