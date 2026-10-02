import React, { useState } from 'react';
import { Search, TrendingUp, Info, Clock, Check } from 'lucide-react';
import { AssetProfile, HistoricalDataset } from '../types/finance';
import { FEATURED_ASSETS } from '../services/dataService';

interface AssetSelectorProps {
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
  selectedRange: '6m' | '1y' | '2y' | '5y';
  onSelectRange: (range: '6m' | '1y' | '2y' | '5y') => void;
  dataset: HistoricalDataset | null;
  isLoading: boolean;
}

export const AssetSelector: React.FC<AssetSelectorProps> = ({
  selectedTicker,
  onSelectTicker,
  selectedRange,
  onSelectRange,
  dataset,
  isLoading,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const currentAssetProfile =
    FEATURED_ASSETS.find(a => a.ticker === selectedTicker) || {
      ticker: selectedTicker,
      name: `Activo ${selectedTicker}`,
      category: 'Personalizado' as any,
      sector: 'Mercado Financiero',
      academicRationale: 'Símbolo personalizado ingresado por el usuario para análisis de series de tiempo y regresión lineal.',
    };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onSelectTicker(customInput.trim().toUpperCase());
      setCustomInput('');
      setIsSearching(false);
    }
  };

  const latestPrice = dataset?.regularMarketPrice ?? dataset?.records[dataset.records.length - 1]?.close ?? 0;
  const firstPrice = dataset?.records[0]?.close ?? 0;
  const totalChangePct = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 sm:p-5 mb-6">
      {/* Top row: Active ticker title, selector badges, timeframe */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Yahoo Finance</span>
            <span aria-hidden="true">·</span>
            <span>{currentAssetProfile.sector}</span>
            <span aria-hidden="true">·</span>
            <span>{dataset?.records.length ?? 0} Observaciones</span>
            {dataset?.isSynthetic && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400 font-mono">Modo Respaldo Histórico</span>
              </>
            )}
          </div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              {selectedTicker}
              <span className="text-base font-normal text-slate-400 hidden sm:inline">
                {currentAssetProfile.name}
              </span>
            </h1>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-xl sm:text-2xl font-semibold text-slate-100 tabular-nums">
                ${latestPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`text-xs font-semibold tabular-nums ${
                  totalChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {totalChangePct >= 0 ? '+' : ''}
                {totalChangePct.toFixed(2)}% ({selectedRange.toUpperCase()})
              </span>
            </div>
          </div>
        </div>

        {/* Timeframe & Custom Ticker controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe segmented control */}
          <div className="flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-md">
            {(['6m', '1y', '2y', '5y'] as const).map(range => (
              <button
                key={range}
                onClick={() => onSelectRange(range)}
                disabled={isLoading}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors uppercase cursor-pointer disabled:opacity-50 ${
                  selectedRange === range
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Custom Search Form */}
          <form onSubmit={handleCustomSubmit} className="relative flex items-center">
            <input
              type="text"
              placeholder="Buscar ticker (ej. GOOGL, META)..."
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              className="w-48 sm:w-56 bg-slate-950/90 border border-slate-800 rounded-md py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 uppercase"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            {customInput && (
              <button
                type="submit"
                className="absolute right-1 px-2 py-0.5 text-[10px] bg-cyan-500 text-slate-950 font-bold rounded cursor-pointer"
              >
                Cargar
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Featured Asset Quick Selector Buttons */}
      <div className="pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">
            Activos recomendados por la cátedra para análisis de regresión:
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {FEATURED_ASSETS.map(asset => {
            const isSelected = asset.ticker === selectedTicker;
            return (
              <button
                key={asset.ticker}
                onClick={() => onSelectTicker(asset.ticker)}
                disabled={isLoading}
                className={`flex flex-col text-left p-2.5 rounded-md border transition-all cursor-pointer disabled:opacity-50 ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500/60 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-sm text-slate-100 font-mono">{asset.ticker}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
                </div>
                <span className="text-[11px] text-slate-400 truncate w-full mt-0.5">{asset.name}</span>
                <span className="text-[10px] text-slate-500 mt-1">{asset.category}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Academic Rationale Banner */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-start gap-2 text-xs text-slate-400">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-300 font-medium">Justificación del activo para la materia: </strong>
          {currentAssetProfile.academicRationale}
        </p>
      </div>
    </div>
  );
};
