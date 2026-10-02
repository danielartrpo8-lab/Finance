import React from 'react';
import { Sliders, Cpu, Activity, BarChart2, CheckCircle2 } from 'lucide-react';
import { RegressionModelConfig, ModelType } from '../types/finance';
import { FittedModel } from '../utils/regressionEngine';

interface ModelMetricsPanelProps {
  config: RegressionModelConfig;
  onChangeConfig: (newConfig: RegressionModelConfig) => void;
  model: FittedModel | null;
  ticker: string;
}

const AVAILABLE_FEATURES = [
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
];

export const ModelMetricsPanel: React.FC<ModelMetricsPanelProps> = ({
  config,
  onChangeConfig,
  model,
  ticker,
}) => {
  const handleModelTypeChange = (type: ModelType) => {
    onChangeConfig({ ...config, modelType: type });
  };

  const handleSplitChange = (val: number) => {
    onChangeConfig({ ...config, trainSplit: val });
  };

  const handleAlphaChange = (val: number) => {
    onChangeConfig({ ...config, regularizationAlpha: val });
  };

  const toggleFeature = (feat: string) => {
    let nextFeatures: string[];
    if (config.features.includes(feat)) {
      if (config.features.length <= 1) return; // Keep at least 1
      nextFeatures = config.features.filter(f => f !== feat);
    } else {
      nextFeatures = [...config.features, feat];
    }
    onChangeConfig({ ...config, features: nextFeatures });
  };

  const metrics = model?.metrics;

  return (
    <div className="space-y-6">
      {/* Hyperparameter & Model Configuration Panel */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Configuración del Algoritmo Scikit-Learn
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            sklearn.linear_model / ensemble
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Model Type Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Tipo de Modelo de Regresión
            </label>
            <div className="space-y-1.5">
              {[
                { id: 'linear', name: 'Regresión Lineal (OLS)', desc: 'Mínimos Cuadrados Ordinarios' },
                { id: 'ridge', name: 'Regresión Ridge (L2)', desc: 'Penaliza colinealidad con norma L2' },
                { id: 'lasso', name: 'Regresión Lasso (L1)', desc: 'Selección automática de variables' },
                { id: 'polynomial', name: 'Regresión Polinomial (Grado 2)', desc: 'Captura curvaturas no lineales' },
                { id: 'random_forest', name: 'Random Forest Regressor', desc: 'Ensamble con árboles de decisión' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => handleModelTypeChange(m.id as ModelType)}
                  className={`w-full text-left p-2.5 rounded border transition-all cursor-pointer ${
                    config.modelType === m.id
                      ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="text-xs font-semibold flex items-center justify-between">
                    <span>{m.name}</span>
                    {config.modelType === m.id && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Train/Test Split & Regularization Alpha */}
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                <span>División Temporal Train / Test</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {Math.round(config.trainSplit * 100)}% / {Math.round((1 - config.trainSplit) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="0.9"
                step="0.05"
                value={config.trainSplit}
                onChange={e => handleSplitChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-950 h-1.5 rounded cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>60% Train</span>
                <span>80% Estándar</span>
                <span>90% Train</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                <strong className="text-slate-300">Regla econométrica:</strong> La partición se realiza en orden cronológico estricto (temporal split) para evitar sesgo de anticipación o fuga de datos hacia el pasado.
              </p>
            </div>

            {(config.modelType === 'ridge' || config.modelType === 'lasso') && (
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                  <span>Parámetro de Regularización (Alpha / $\lambda$)</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {config.regularizationAlpha || 1.0}
                  </span>
                </div>
                <div className="flex gap-2">
                  {[0.01, 0.1, 0.5, 1.0, 5.0, 10.0].map(a => (
                    <button
                      key={a}
                      onClick={() => handleAlphaChange(a)}
                      className={`flex-1 py-1 text-xs font-mono rounded border cursor-pointer ${
                        (config.regularizationAlpha || 1.0) === a
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded text-xs text-slate-300 space-y-1 font-mono">
              <div className="text-[10px] text-slate-400">Muestras del dataset</div>
              <div>Entrenamiento: <strong className="text-white">{metrics?.trainSamples ?? 0} velas</strong></div>
              <div>Prueba (Out-of-sample): <strong className="text-white">{metrics?.testSamples ?? 0} velas</strong></div>
            </div>
          </div>

          {/* Feature Engineering Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Ingeniería de Características (Features)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {AVAILABLE_FEATURES.map(feat => {
                const isActive = config.features.includes(feat);
                return (
                  <button
                    key={feat}
                    onClick={() => toggleFeature(feat)}
                    className={`p-2 rounded text-left text-xs font-mono border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[11px]">{feat}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Haz clic para activar o desactivar variables en la matriz de diseño $X$.
            </p>
          </div>
        </div>
      </div>

      {/* Model Performance Scoreboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-mono text-slate-400">R² Fuera de Muestra (Test)</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1 tabular-nums">
            {metrics?.r2Test.toFixed(4) ?? '0.0000'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Bondad de ajuste test</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-mono text-slate-400">R² En Muestra (Train)</div>
          <div className="text-xl font-bold font-mono text-slate-200 mt-1 tabular-nums">
            {metrics?.r2Train.toFixed(4) ?? '0.0000'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Ajuste histórico base</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-mono text-slate-400">RMSE (Error Cuadrático)</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
            ${metrics?.rmse.toFixed(2) ?? '0.00'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">En unidades de USD</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-mono text-slate-400">MAE (Error Absoluto)</div>
          <div className="text-xl font-bold font-mono text-slate-200 mt-1 tabular-nums">
            ${metrics?.mae.toFixed(2) ?? '0.00'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Desviación promedio</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-mono text-slate-400">MAPE (Error %)</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {metrics?.mape.toFixed(2) ?? '0.00'}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Porcentaje sobre precio</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-mono text-slate-400">MSE</div>
          <div className="text-xl font-bold font-mono text-slate-300 mt-1 tabular-nums">
            {metrics?.mse.toFixed(2) ?? '0.00'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Varianza residual</div>
        </div>
      </div>

      {/* Feature Importance / Weights Bar Chart */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              Importancia Relativa y Coeficientes Normalizados ($\beta_j$)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ponderación de cada variable explicativa en la ecuación de regresión estimada
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400">
            Total: {metrics?.featureWeights.length ?? 0} Variables
          </span>
        </div>

        <div className="space-y-3">
          {metrics?.featureWeights.map(fw => (
            <div key={fw.feature} className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-medium">{fw.feature}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">Coef. $\beta$: {fw.weight >= 0 ? '+' : ''}{fw.weight}</span>
                  <span className="text-cyan-300 font-bold w-12 text-right">{fw.importancePct}%</span>
                </div>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, fw.importancePct)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
