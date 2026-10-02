import React from 'react';
import { Download, RefreshCw, FileText } from 'lucide-react';

interface HeaderProps {
  activeTab: 'forecast' | 'metrics' | 'quantstats' | 'code' | 'academic';
  setActiveTab: (tab: 'forecast' | 'metrics' | 'quantstats' | 'code' | 'academic') => void;
  onRefresh: () => void;
  onExportReport: () => void;
  isLoading: boolean;
  ticker: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onRefresh,
  onExportReport,
  isLoading,
  ticker,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
            QuantRegression
          </span>
          <span className="hidden sm:inline-block text-xs font-mono text-slate-400 pl-2 border-l border-slate-800">
            {ticker} · Proyección 8D
          </span>
        </div>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('forecast')}
            className={`transition-colors cursor-pointer pb-0.5 ${
              activeTab === 'forecast'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Predicción 8 Días
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`transition-colors cursor-pointer pb-0.5 ${
              activeTab === 'metrics'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Modelos Scikit-Learn
          </button>
          <button
            onClick={() => setActiveTab('quantstats')}
            className={`transition-colors cursor-pointer pb-0.5 ${
              activeTab === 'quantstats'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            QuantStats Tear Sheet
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`transition-colors cursor-pointer pb-0.5 ${
              activeTab === 'code'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Código Python & Colab
          </button>
          <button
            onClick={() => setActiveTab('academic')}
            className={`transition-colors cursor-pointer pb-0.5 ${
              activeTab === 'academic'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Guía Académica
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Recalcular regresión"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded-md hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Recalcular</span>
          </button>
          <button
            onClick={onExportReport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Informe Académico</span>
          </button>
        </div>
      </div>
      
      {/* Mobile nav bar */}
      <div className="flex md:hidden overflow-x-auto px-4 py-2 border-t border-slate-800/80 gap-3 text-xs font-medium scrollbar-none">
        <button
          onClick={() => setActiveTab('forecast')}
          className={`whitespace-nowrap py-1 px-2 rounded ${activeTab === 'forecast' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400'}`}
        >
          Predicción 8D
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`whitespace-nowrap py-1 px-2 rounded ${activeTab === 'metrics' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400'}`}
        >
          Scikit-Learn
        </button>
        <button
          onClick={() => setActiveTab('quantstats')}
          className={`whitespace-nowrap py-1 px-2 rounded ${activeTab === 'quantstats' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400'}`}
        >
          QuantStats
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`whitespace-nowrap py-1 px-2 rounded ${activeTab === 'code' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400'}`}
        >
          Python & Colab
        </button>
        <button
          onClick={() => setActiveTab('academic')}
          className={`whitespace-nowrap py-1 px-2 rounded ${activeTab === 'academic' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400'}`}
        >
          Guía Académica
        </button>
      </div>
    </header>
  );
};
