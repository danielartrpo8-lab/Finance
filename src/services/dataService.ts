import { AssetProfile, HistoricalDataset, MarketCandle } from '../types/finance';

export const FEATURED_ASSETS: AssetProfile[] = [
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    category: 'Tech',
    sector: 'Semiconductores & IA',
    academicRationale: 'Excelente caso de estudio por su fuerte tendencia y alta volatilidad. Permite contrastar si los lags de precio capturan el momentum o si sobreajustan.',
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    category: 'Blue Chip',
    sector: 'Tecnología de Consumo',
    academicRationale: 'El activo canónico de finanzas cuantitativas. Gran liquidez, baja dispersión y comportamiento más estacionario en retornos.',
  },
  {
    ticker: 'SPY',
    name: 'SPDR S&P 500 ETF',
    category: 'Index ETF',
    sector: 'Índice General de Mercado',
    academicRationale: 'Benchmark por excelencia de Wall Street. Ideal para poner a prueba la Hipótesis de Mercados Eficientes de Eugene Fama.',
  },
  {
    ticker: 'TSLA',
    name: 'Tesla, Inc.',
    category: 'Growth',
    sector: 'Automotriz & Energía',
    academicRationale: 'Presenta cambios bruscos de régimen y alta curtosis. Perfecto para comparar modelos lineales vs regularización Ridge/Lasso.',
  },
  {
    ticker: 'BTC-USD',
    name: 'Bitcoin (USD)',
    category: 'Crypto',
    sector: 'Activos Digitales',
    academicRationale: 'Mercado 24/7 con colas pesadas y asimetría pronunciada. Ideal para analizar la robustez de las métricas de QuantStats (VaR y Max Drawdown).',
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corp.',
    category: 'Blue Chip',
    sector: 'Software & Cloud',
    academicRationale: 'Crecimiento estructural sostenido con baja correlación de errores en los residuos de regresión.',
  },
];

// Fallback baseline prices in case offline or API throttled
const BASELINE_FALLBACKS: Record<string, { price: number; vol: number; trend: number }> = {
  'NVDA': { price: 125.0, vol: 0.030, trend: 0.0016 },
  'AAPL': { price: 230.0, vol: 0.015, trend: 0.0008 },
  'SPY': { price: 580.0, vol: 0.010, trend: 0.0006 },
  'TSLA': { price: 245.0, vol: 0.035, trend: 0.0011 },
  'BTC-USD': { price: 68000.0, vol: 0.040, trend: 0.0014 },
  'MSFT': { price: 435.0, vol: 0.017, trend: 0.0008 },
  'AMZN': { price: 190.0, vol: 0.020, trend: 0.0009 },
  'GOOGL': { price: 175.0, vol: 0.018, trend: 0.0007 },
};

function generateClientSyntheticData(ticker: string, range: string): MarketCandle[] {
  const days = range === '6m' ? 126 : range === '2y' ? 504 : range === '5y' ? 1260 : 252;
  const meta = BASELINE_FALLBACKS[ticker.toUpperCase()] || { price: 150.0, vol: 0.022, trend: 0.0009 };
  const records: MarketCandle[] = [];
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  let price = meta.price * Math.exp(-meta.trend * days);
  let seed = 42;
  for (let i = 0; i < ticker.length; i++) seed += ticker.charCodeAt(i) * 17;

  const prng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const isCrypto = ticker.toUpperCase().includes('BTC') || ticker.toUpperCase().includes('ETH');

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    if (!isCrypto && (d.getDay() === 0 || d.getDay() === 6)) continue;

    // Normal approximation
    const u1 = Math.max(1e-5, prng());
    const u2 = prng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    const ret = meta.trend + meta.vol * z;
    const open = price;
    price = Math.max(1, price * (1 + ret));
    const high = Math.max(open, price) * (1 + prng() * 0.012);
    const low = Math.min(open, price) * (1 - prng() * 0.012);
    const volume = Math.round(5000000 + prng() * 20000000);

    records.push({
      date: d.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(price.toFixed(2)),
      adjClose: parseFloat(price.toFixed(2)),
      volume,
    });
  }

  return records;
}

export async function fetchHistoricalData(
  ticker: string,
  range: '6m' | '1y' | '2y' | '5y' = '1y'
): Promise<HistoricalDataset> {
  const cleanTicker = ticker.trim().toUpperCase();

  try {
    const response = await fetch(`/api/finance/history?ticker=${encodeURIComponent(cleanTicker)}&range=${range}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.records && data.records.length > 30) {
        return {
          symbol: cleanTicker,
          currency: data.currency || 'USD',
          isSynthetic: !!data.isSynthetic,
          records: data.records,
          regularMarketPrice: data.regularMarketPrice || data.records[data.records.length - 1].close,
          lastUpdated: new Date().toLocaleTimeString(),
        };
      }
    }
  } catch (err) {
    console.warn(`Server API fetch failed for ${cleanTicker}, applying client fallback generator:`, err);
  }

  // Graceful client fallback
  const fallbackRecords = generateClientSyntheticData(cleanTicker, range);
  const lastPrice = fallbackRecords[fallbackRecords.length - 1]?.close || 150;

  return {
    symbol: cleanTicker,
    currency: 'USD',
    isSynthetic: true,
    records: fallbackRecords,
    regularMarketPrice: lastPrice,
    lastUpdated: new Date().toLocaleTimeString(),
  };
}
