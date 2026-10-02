import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, Terminal, ExternalLink, BookOpen } from 'lucide-react';
import { RegressionModelConfig } from '../types/finance';
import {
  generatePythonScript,
  generateJupyterNotebookJSON,
  generateGitHubReadme,
} from '../utils/codeGenerator';

interface PythonCodeModalProps {
  ticker: string;
  range: string;
  config: RegressionModelConfig;
  r2Test: number;
}

export const PythonCodeModal: React.FC<PythonCodeModalProps> = ({
  ticker,
  range,
  config,
  r2Test,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'python' | 'readme' | 'colab'>('python');
  const [copied, setCopied] = useState(false);

  const pythonCode = generatePythonScript(ticker, range, config);
  const readmeContent = generateGitHubReadme(
    ticker,
    range,
    config,
    r2Test,
    'Proyección calculada con features rezagadas (Lags 1-5, SMA, RSI) e intervalos de confianza 95%.'
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPy = () => {
    const blob = new Blob([pythonCode], { type: 'text/x-python;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `regresion_${ticker.toLowerCase()}_8dias.py`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadIpynb = () => {
    const notebookJson = generateJupyterNotebookJSON(ticker, range, config);
    const blob = new Blob([notebookJson], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `regresion_${ticker.toLowerCase()}_colab.ipynb`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadReadme = () => {
    const blob = new Blob([readmeContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `README.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <span>Entrega Académica</span>
              <span aria-hidden="true">·</span>
              <span className="text-cyan-400">Archivos para GitHub y Google Colab</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Código Fuente y Notebooks Listos para Ejecutar
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleCopy(activeSubTab === 'readme' ? readmeContent : pythonCode)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-950 border border-slate-700 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado al Portapapeles' : 'Copiar Código'}</span>
            </button>
            <button
              onClick={handleDownloadPy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-950 border border-slate-800 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Descargar .py</span>
            </button>
            <button
              onClick={handleDownloadIpynb}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .ipynb (Colab)</span>
            </button>
          </div>
        </div>

        {/* Instructions strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded">
            <span className="font-semibold text-cyan-300 block mb-1">1. Google Colab</span>
            <p className="text-slate-400 text-[11px]">
              Descarga el archivo <code className="text-slate-300 font-mono">.ipynb</code>, ábrelo en colab.research.google.com y haz clic en "Ejecutar todo".
            </p>
          </div>
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded">
            <span className="font-semibold text-cyan-300 block mb-1">2. Repositorio en GitHub</span>
            <p className="text-slate-400 text-[11px]">
              Crea un nuevo repositorio en GitHub, sube el script <code className="text-slate-300 font-mono">.py</code> y copia el contenido en <code className="text-slate-300 font-mono">README.md</code>.
            </p>
          </div>
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded">
            <span className="font-semibold text-cyan-300 block mb-1">3. Reporte QuantStats</span>
            <p className="text-slate-400 text-[11px]">
              El script genera automáticamente el archivo <code className="text-slate-300 font-mono">quantstats_tearsheet.html</code> para presentar al profesor.
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tabs: Python Script vs GitHub README */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('python')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeSubTab === 'python'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Script Python Completo (.py)
        </button>
        <button
          onClick={() => setActiveSubTab('readme')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeSubTab === 'readme'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Plantilla README.md para GitHub
        </button>
      </div>

      {/* Code Display Area */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>{activeSubTab === 'python' ? `main_${ticker.toLowerCase()}_regression.py` : 'README.md'}</span>
          </div>
          <button
            onClick={() => handleCopy(activeSubTab === 'readme' ? readmeContent : pythonCode)}
            className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed selection:bg-cyan-500/30 selection:text-white">
          <code>{activeSubTab === 'python' ? pythonCode : readmeContent}</code>
        </pre>
      </div>
    </div>
  );
};
