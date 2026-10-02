import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { AssetSelector } from './components/AssetSelector';
import { PriceForecastChart } from './components/PriceForecastChart';
import { ForecastEightDaysTable } from './components/ForecastEightDaysTable';
import { ModelMetricsPanel } from './components/ModelMetricsPanel';
import { QuantStatsTearSheet } from './components/QuantStatsTearSheet';
import { PythonCodeModal } from './components/PythonCodeModal';
import { AcademicReportView } from './components/AcademicReportView';
import {
  HistoricalDataset,
  RegressionModelConfig,
  DayForecast,
  QuantStatsMetrics,
} from './types/finance';
import { fetchHistoricalData } from './services/dataService';
import {
  buildFeatureDataset,
  trainRegressionModel,
  generateEightDayForecast,
  FittedModel,
} from './utils/regressionEngine';
import { calculateQuantStats } from './utils/quantStatsEngine';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [selectedTicker, setSelectedTicker] = useState<string>('NVDA');
  const [selectedRange, setSelectedRange] = useState<'6m' | '1y' | '2y' | '5y'>('1y');
  const [activeTab, setActiveTab] = useState<'forecast' | 'metrics' | 'quantstats' | 'code' | 'academic'>('forecast');
  
  const [dataset, setDataset] = useState<HistoricalDataset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Scikit-Learn Model Configuration
  const [modelConfig, setModelConfig] = useState<RegressionModelConfig>({
    modelType: 'linear',
    trainSplit: 0.8,
    regularizationAlpha: 1.0,
    features: [
      'Lag 1',
      'Lag 2',
      'Lag 3',
      'Lag 5',
      'SMA 10',
      'SMA 20',
      'SMA 50',
      'RSI 14',
      'Bollinger %B',
      'Volatilidad 20D',
    ],
  });

  // Load historical data whenever ticker or range changes
  const loadData = async (ticker: string, range: '6m' | '1y' | '2y' | '5y') => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchHistoricalData(ticker, range);
      setDataset(data);
    } catch (err: any) {
      setError(`No se pudieron cargar los datos de Yahoo Finance para ${ticker}.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedTicker, selectedRange);
  }, [selectedTicker, selectedRange]);

  // Compute Machine Learning Model and QuantStats metrics
  const { fittedModel, forecasts, quantStats } = useMemo(() => {
    if (!dataset || dataset.records.length < 50) {
      return { fittedModel: null, forecasts: [], quantStats: null };
    }

    const featureRows = buildFeatureDataset(dataset.records);
    const model = trainRegressionModel(featureRows, modelConfig);

    const isCrypto = dataset.symbol.includes('BTC') || dataset.symbol.includes('ETH');
    const pred8d = model ? generateEightDayForecast(dataset.records, model, isCrypto) : [];
    const qs = calculateQuantStats(dataset.records);

    return {
      fittedModel: model,
      forecasts: pred8d,
      quantStats: qs,
    };
  }, [dataset, modelConfig]);

  const handleRefresh = () => {
    loadData(selectedTicker, selectedRange);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Contract (3 zones) */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={handleRefresh}
        onExportReport={() => setActiveTab('academic')}
        isLoading={isLoading}
        ticker={selectedTicker}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Asset & Parameter Selector (always available for instant switching) */}
        <AssetSelector
          selectedTicker={selectedTicker}
          onSelectTicker={setSelectedTicker}
          selectedRange={selectedRange}
          onSelectRange={setSelectedRange}
          dataset={dataset}
          isLoading={isLoading}
        />

        {/* Error notification if any */}
        {error && (
          <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={handleRefresh}
              className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-900 rounded font-semibold text-[11px]"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !dataset && (
          <div className="h-96 rounded-lg bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="text-sm font-mono text-slate-400">
              Extrayendo datos de Yahoo Finance y entrenando regresión Scikit-Learn...
            </span>
          </div>
        )}

        {/* Tab 1: 8-Day Ahead Forecast (Primary view) */}
        {activeTab === 'forecast' && dataset && (
          <div className="space-y-6">
            <PriceForecastChart
              candles={dataset.records}
              forecasts={forecasts}
              model={fittedModel}
              ticker={selectedTicker}
            />

            <ForecastEightDaysTable
              forecasts={forecasts}
              candles={dataset.records}
              model={fittedModel}
              ticker={selectedTicker}
            />
          </div>
        )}

        {/* Tab 2: Scikit-Learn Regression Models & Metrics */}
        {activeTab === 'metrics' && dataset && (
          <ModelMetricsPanel
            config={modelConfig}
            onChangeConfig={setModelConfig}
            model={fittedModel}
            ticker={selectedTicker}
          />
        )}

        {/* Tab 3: QuantStats Tear Sheet */}
        {activeTab === 'quantstats' && quantStats && (
          <QuantStatsTearSheet
            metrics={quantStats}
            ticker={selectedTicker}
          />
        )}

        {/* Tab 4: Python Code Generator & GitHub submission files */}
        {activeTab === 'code' && (
          <PythonCodeModal
            ticker={selectedTicker}
            range={selectedRange}
            config={modelConfig}
            r2Test={fittedModel?.metrics.r2Test ?? 0.85}
          />
        )}

        {/* Tab 5: Academic Report & Defense Guide */}
        {activeTab === 'academic' && (
          <AcademicReportView
            ticker={selectedTicker}
            range={selectedRange}
            config={modelConfig}
            model={fittedModel}
            forecasts={forecasts}
            quantStats={quantStats}
          />
        )}
      </main>

      {/* Clean quiet footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 mt-auto no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-mono">
          <div>
            <span>QuantRegression · Proyecto de Regresión y Finanzas Cuantitativas</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Yahoo Finance</span>
            <span aria-hidden="true">·</span>
            <span>Scikit-Learn</span>
            <span aria-hidden="true">·</span>
            <span>QuantStats</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
