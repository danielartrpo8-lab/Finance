import { RegressionModelConfig } from '../types/finance';

export function generatePythonScript(
  ticker: string,
  range: string,
  config: RegressionModelConfig
): string {
  const modelNameSklearn =
    config.modelType === 'ridge'
      ? 'Ridge(alpha=' + (config.regularizationAlpha || 1.0) + ')'
      : config.modelType === 'lasso'
      ? 'Lasso(alpha=' + (config.regularizationAlpha || 0.1) + ')'
      : config.modelType === 'random_forest'
      ? 'RandomForestRegressor(n_estimators=100, random_state=42)'
      : 'LinearRegression()';

  const modelImport =
    config.modelType === 'ridge'
      ? 'from sklearn.linear_model import Ridge'
      : config.modelType === 'lasso'
      ? 'from sklearn.linear_model import Lasso'
      : config.modelType === 'random_forest'
      ? 'from sklearn.ensemble import RandomForestRegressor'
      : 'from sklearn.linear_model import LinearRegression';

  return `"""
PROYECTO ACADÉMICO: REGRESIÓN DE ACTIVOS FINANCIEROS Y PREDICCIÓN A 8 DÍAS
Entorno: Google Colab / Jupyter Notebook / GitHub
Librerías principales: yfinance, scikit-learn, quantstats, pandas, numpy, matplotlib
Activo seleccionado: ${ticker}
"""

# 1. INSTALACIÓN DE DEPENDENCIAS (Ejecutar en Google Colab si es necesario)
# !pip install yfinance scikit-learn quantstats pandas numpy matplotlib seaborn

import datetime
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import yfinance as yf
import quantstats as qs
${modelImport}
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

# Configuración estética de gráficos
sns.set_theme(style="darkgrid")
plt.rcParams['figure.figsize'] = [12, 6]

# ==========================================
# PASO 1: DESCARGA DE DATOS DE YAHOO FINANCE
# ==========================================
TICKER = "${ticker}"
PERIODO = "${range}"  # Opciones: 6m, 1y, 2y, 5y

print(f"Descargando datos históricos de Yahoo Finance para {TICKER} ({PERIODO})...")
df = yf.download(TICKER, period=PERIODO, interval="1d", auto_adjust=True)

if df.empty:
    raise ValueError(f"No se pudieron descargar datos para el activo {TICKER}")

print(f"Total de registros obtenidos: {len(df)}")
print(df.tail())

# ==========================================
# PASO 2: INGENIERÍA DE CARACTERÍSTICAS (FEATURES)
# ==========================================
data = df.copy()

# 1. Variables rezagadas (Lags temporales)
data['Lag_1'] = data['Close'].shift(1)
data['Lag_2'] = data['Close'].shift(2)
data['Lag_3'] = data['Close'].shift(3)
data['Lag_5'] = data['Close'].shift(5)

# 2. Medias móviles técnicas
data['SMA_10'] = data['Close'].rolling(window=10).mean()
data['SMA_20'] = data['Close'].rolling(window=20).mean()
data['SMA_50'] = data['Close'].rolling(window=50).mean()

# 3. Índice de Fuerza Relativa (RSI 14)
delta = data['Close'].diff()
gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
rs = gain / (loss + 1e-9)
data['RSI_14'] = 100 - (100 / (1 + rs))

# 4. Bandas de Bollinger y Volatilidad
bb_std = data['Close'].rolling(window=20).std()
data['BB_Upper'] = data['SMA_20'] + (2 * bb_std)
data['BB_Lower'] = data['SMA_20'] - (2 * bb_std)
data['BB_PctB'] = (data['Close'] - data['BB_Lower']) / (data['BB_Upper'] - data['BB_Lower'] + 1e-9)
data['Volatilidad_20d'] = data['Close'].pct_change().rolling(window=20).std() * np.sqrt(252)

# 5. Variable Objetivo (Target): Precio de Cierre del Día Siguiente (t + 1)
data['Target'] = data['Close'].shift(-1)

# Limpieza de valores nulos producidos por rolling y shift
data_clean = data.dropna().copy()
print(f"Muestras efectivas tras preprocesamiento: {len(data_clean)}")

features = [
    'Lag_1', 'Lag_2', 'Lag_3', 'Lag_5',
    'SMA_10', 'SMA_20', 'SMA_50',
    'RSI_14', 'BB_PctB', 'Volatilidad_20d'
]

X = data_clean[features]
y = data_clean['Target']

# ==========================================
# PASO 3: DIVISIÓN TEMPORAL (TRAIN / TEST SPLIT)
# ==========================================
# En finanzas NUNCA se debe hacer split aleatorio (para evitar fuga de información hacia el pasado)
split_ratio = ${config.trainSplit}
split_idx = int(len(data_clean) * split_ratio)

X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

print(f"Muestras de Entrenamiento: {len(X_train)} | Muestras de Prueba: {len(X_test)}")

# Normalización estándar (Z-score)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ==========================================
# PASO 4: ENTRENAMIENTO DEL MODELO SCIKIT-LEARN
# ==========================================
model = ${modelNameSklearn}
model.fit(X_train_scaled, y_train)

# Predicciones sobre el conjunto de test
y_pred_train = model.predict(X_train_scaled)
y_pred_test = model.predict(X_test_scaled)

# Métricas de evaluación econométrica
r2_train = r2_score(y_train, y_pred_train)
r2_test = r2_score(y_test, y_pred_test)
mse = mean_squared_error(y_test, y_pred_test)
rmse = np.sqrt(mse)
mae = mean_absolute_error(y_test, y_pred_test)
mape = np.mean(np.abs((y_test - y_pred_test) / y_test)) * 100

print("\\n" + "="*45)
print(" RESULTADOS DE LA EVALUACIÓN DEL MODELO")
print("="*45)
print(f"R² (Entrenamiento) : {r2_train:.4f}")
print(f"R² (Prueba / Test) : {r2_test:.4f}")
print(f"RMSE (Error Cuadrático Medio) : ${'{rmse:.2f}'}")
print(f"MAE (Error Absoluto Medio)    : ${'{mae:.2f}'}")
print(f"MAPE (Error Porcentual)       : {mape:.2f}%")

# Gráfico de Real vs Predicho en Test
plt.figure(figsize=(12, 5))
plt.plot(y_test.index, y_test.values, label='Precio Real', color='#0284c7', lw=1.8)
plt.plot(y_test.index, y_pred_test, label='Predicción Regresión', color='#f59e0b', linestyle='--', lw=1.8)
plt.title(f'{TICKER} - Validación Fuera de Muestra (Out-of-sample Test)')
plt.ylabel('Precio (USD)')
plt.legend()
plt.tight_layout()
plt.savefig('validacion_test.png')
plt.show()

# ==========================================
# PASO 5: PREDICCIÓN MULTI-PASO A 8 DÍAS
# ==========================================
print("\\n" + "="*45)
print(" GENERANDO PREDICCIÓN ROLLING A 8 DÍAS")
print("="*45)

last_series = list(df['Close'].values)
current_date = df.index[-1]
predictions_8d = []

for step in range(1, 9):
    # Generar siguiente fecha hábil (lunes a viernes)
    current_date += datetime.timedelta(days=1)
    while current_date.weekday() >= 5:  # Saltar sábado y domingo
        current_date += datetime.timedelta(days=1)
        
    s_closes = pd.Series(last_series)
    
    # Calcular features para el paso actual
    lag_1 = s_closes.iloc[-1]
    lag_2 = s_closes.iloc[-2]
    lag_3 = s_closes.iloc[-3]
    lag_5 = s_closes.iloc[-5]
    sma_10 = s_closes.rolling(10).mean().iloc[-1]
    sma_20 = s_closes.rolling(20).mean().iloc[-1]
    sma_50 = s_closes.rolling(50).mean().iloc[-1]
    
    delta_s = s_closes.diff()
    g = (delta_s.where(delta_s > 0, 0)).rolling(14).mean().iloc[-1]
    l = (-delta_s.where(delta_s < 0, 0)).rolling(14).mean().iloc[-1]
    rsi_14 = 100 - (100 / (1 + (g / (l + 1e-9))))
    
    bb_std_s = s_closes.rolling(20).std().iloc[-1]
    bb_up = sma_20 + (2 * bb_std_s)
    bb_dn = sma_20 - (2 * bb_std_s)
    bb_pct = (lag_1 - bb_dn) / (bb_up - bb_dn + 1e-9)
    vol_20 = s_closes.pct_change().rolling(20).std().iloc[-1] * np.sqrt(252)
    
    feat_vector = pd.DataFrame([[lag_1, lag_2, lag_3, lag_5, sma_10, sma_20, sma_50, rsi_14, bb_pct, vol_20]], columns=features)
    feat_scaled = scaler.transform(feat_vector)
    
    # Predicción del modelo
    next_price = float(model.predict(feat_scaled)[0])
    
    # Intervalo de confianza al 95% (expande con sqrt(t))
    ci_margin = rmse * np.sqrt(step) * 1.96
    ci_lower = max(0.01, next_price - ci_margin)
    ci_upper = next_price + ci_margin
    
    predictions_8d.append({
        'Día': f'Día +{step}',
        'Fecha': current_date.strftime('%Y-%m-%d'),
        'Precio Proyectado (USD)': round(next_price, 2),
        'CI 95% Inferior': round(ci_lower, 2),
        'CI 95% Superior': round(ci_upper, 2),
        'Variación % vs Actual': round(((next_price - df['Close'].iloc[-1]) / df['Close'].iloc[-1]) * 100, 2)
    })
    
    # Agregar la predicción a la serie para simular el siguiente día
    last_series.append(next_price)

pred_df = pd.DataFrame(predictions_8d)
print(pred_df.to_string(index=False))

# ==========================================
# PASO 6: ANÁLISIS CUANTITATIVO CON QUANTSTATS
# ==========================================
print("\\n" + "="*45)
print(" GENERANDO TEAR SHEET CON QUANTSTATS")
print("="*45)

daily_returns = df['Close'].pct_change().dropna()

# Extender soporte de pandas para quantstats
qs.extend_pandas()

# Métricas clave de rendimiento y riesgo
print(f"Sharpe Ratio           : {qs.stats.sharpe(daily_returns, rf=0.04):.2f}")
print(f"Sortino Ratio          : {qs.stats.sortino(daily_returns, rf=0.04):.2f}")
print(f"Max Drawdown (MDD)     : {qs.stats.max_drawdown(daily_returns) * 100:.2f}%")
print(f"Volatilidad Anualizada : {qs.stats.volatility(daily_returns) * 100:.2f}%")
print(f"Calmar Ratio           : {qs.stats.calmar(daily_returns):.2f}")
print(f"Win Rate (% días pos.) : {qs.stats.win_rate(daily_returns) * 100:.2f}%")

# Generar reporte HTML interactivo de QuantStats para adjuntar en GitHub
qs.reports.html(daily_returns, output='quantstats_tearsheet.html', title=f'QuantStats Report - {TICKER}')
print("\\nInforme HTML completo guardado exitosamente como 'quantstats_tearsheet.html'!")
`;
}

export function generateJupyterNotebookJSON(
  ticker: string,
  range: string,
  config: RegressionModelConfig
): string {
  const pythonScript = generatePythonScript(ticker, range, config);
  const cells = [
    {
      cell_type: 'markdown',
      metadata: {},
      source: [
        `# Proyecto de Regresión Financiera y Proyección a 8 Días\\n`,
        `**Activo Analizado:** \`${ticker}\` | **Fuente de Datos:** Yahoo Finance (\`yfinance\`)\\n`,
        `**Modelado:** \`scikit-learn\` (${config.modelType}) | **Análisis de Rendimiento:** \`quantstats\`\\n`,
        `\\nEste notebook cumple con los requerimientos de la materia universitaria para la entrega en GitHub y ejecución en Google Colab.`
      ]
    },
    {
      cell_type: 'code',
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        `# Instalación de librerías en entorno Colab\\n`,
        `!pip install yfinance scikit-learn quantstats pandas numpy matplotlib seaborn`
      ]
    },
    {
      cell_type: 'code',
      execution_count: null,
      metadata: {},
      outputs: [],
      source: pythonScript.split('\n').map(l => l + '\n')
    }
  ];

  const notebook = {
    cells,
    metadata: {
      kernelspec: {
        display_name: 'Python 3',
        language: 'python',
        name: 'python3'
      },
      language_info: {
        name: 'python',
        version: '3.10.0'
      }
    },
    nbformat: 4,
    nbformat_minor: 2
  };

  return JSON.stringify(notebook, null, 2);
}

export function generateGitHubReadme(
  ticker: string,
  range: string,
  config: RegressionModelConfig,
  r2Test: number,
  forecastSummary: string
): string {
  return `# Análisis Cuantitativo y Regresión a 8 Días: ${ticker}

> **Materia:** Finanzas Cuantitativas / Machine Learning Aplicado  
> **Librerías principales:** \`scikit-learn\`, \`quantstats\`, \`yfinance\`, \`pandas\`, \`numpy\`  
> **Horizonte de proyección:** 8 días de cotización de mercado  

---

## 1. Resumen Ejecutivo
El presente trabajo desarrolla una investigación empírica sobre el activo **${ticker}** utilizando datos históricos descargados mediante **Yahoo Finance**. Se implementó una canalización de Machine Learning con **Scikit-Learn** utilizando modelos de regresión supervisada (${config.modelType.toUpperCase()}) para proyectar el comportamiento de precios a un horizonte de **8 días hábiles**. 

Complementariamente, se evaluó la calidad del activo a nivel de gestión de carteras mediante la librería **QuantStats**, analizando ratios de Sharpe, Sortino, Drawdown máximo y Value at Risk (VaR).

---

## 2. Metodología
1. **Extracción:** Descarga de series temporales de precios (Open, High, Low, Close, Volume) vía \`yfinance\` (Rango: \`${range}\`).
2. **Ingeniería de Características:**
   - Precios rezagados (*Lags* 1, 2, 3 y 5) para capturar memoria y autocorrelación de corto plazo.
   - Medias móviles simples (SMA 10, 20 y 50 períodos) para representar niveles dinámicos de soporte/resistencia.
   - Índice de Fuerza Relativa (*RSI 14*) para evaluar condiciones de sobrecompra o sobreventa.
   - Bandas de Bollinger (%B) y volatilidad histórica anualizada a 20 días.
3. **División de Datos Temporal:** División en conjunto de entrenamiento (${Math.round(config.trainSplit * 100)}%) y prueba (${Math.round((1 - config.trainSplit) * 100)}%) respetando el orden cronológico estricto para evitar *Lookahead Bias*.
4. **Entrenamiento del Modelo:** Modelo \`scikit-learn\` (${config.modelType}) con escalado estándar de variables explicativas.
5. **Simulación Rolling a 8 Días:** Predicción iterativa multi-paso donde la estimación del día $t+1$ se incorpora recursivamente para recalcular los indicadores y estimar $t+2$ hasta $t+8$.

---

## 3. Resultados y Diagnóstico
- **$R^2$ Fuera de Muestra (Test):** \`${r2Test.toFixed(4)}\`
- **Diagnóstico a 8 Días:** ${forecastSummary}

---

## 4. Instrucciones de Reproducción
Para ejecutar este proyecto en local o en **Google Colab**:

\`\`\`bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/regresion-${ticker.toLowerCase()}-8dias.git
cd regresion-${ticker.toLowerCase()}-8dias

# 2. Instalar requerimientos
pip install yfinance scikit-learn quantstats pandas numpy matplotlib seaborn

# 3. Ejecutar el script principal
python main.py
\`\`\`

El script generará las gráficas de validación y un archivo \`quantstats_tearsheet.html\` con el reporte institucional completo.

---

## 5. Discusión Teórica (Para Defensa Académica)
- **Hipótesis de Mercados Eficientes (Fama, 1970):** Si los precios siguen un paseo aleatorio (*Random Walk*), predecir el nivel de precios exacto tiene un margen de error estocástico inherente. Los modelos lineales y de regularización capturan tendencias de inercia y reversión a la media en ventanas de 8 días.
- **Riesgo de Sobreajuste (*Overfitting*):** Se utilizó división temporal y regularización para penalizar la sobreparametrización y asegurar generalización.
`;
}
