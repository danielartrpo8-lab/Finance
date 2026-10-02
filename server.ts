import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pre-calculated representative baseline prices for fallback seeds
const BASELINE_PRICES: Record<string, { price: number; volatility: number; trend: number }> = {
  'NVDA': { price: 125.5, volatility: 0.032, trend: 0.0018 },
  'AAPL': { price: 232.0, volatility: 0.016, trend: 0.0008 },
  'SPY': { price: 585.0, volatility: 0.011, trend: 0.0006 },
  'MSFT': { price: 440.0, volatility: 0.018, trend: 0.0009 },
  'TSLA': { price: 250.0, volatility: 0.038, trend: 0.0012 },
  'BTC-USD': { price: 68500.0, volatility: 0.042, trend: 0.0015 },
  'AMZN': { price: 195.0, volatility: 0.021, trend: 0.0010 },
  'GOOGL': { price: 180.0, volatility: 0.019, trend: 0.0007 },
};

function generateSyntheticHistoricalData(ticker: string, days: number = 252) {
  const meta = BASELINE_PRICES[ticker.toUpperCase()] || { price: 150.0, volatility: 0.022, trend: 0.0009 };
  const records = [];
  const now = new Date();
  
  // Deterministic seed generation based on ticker
  let seed = 0;
  for (let i = 0; i < ticker.length; i++) {
    seed = (seed * 31 + ticker.charCodeAt(i)) & 0xffffffff;
  }
  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 4294967296;
  };

  let currentPrice = meta.price * Math.exp(-meta.trend * days);
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    // Skip weekends for traditional equities (unless crypto)
    const isCrypto = ticker.toUpperCase().includes('BTC') || ticker.toUpperCase().includes('ETH');
    if (!isCrypto && (date.getDay() === 0 || date.getDay() === 6)) {
      continue;
    }

    // Box-Muller normal distribution
    const u1 = Math.max(0.0001, pseudoRandom());
    const u2 = pseudoRandom();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    const dailyReturn = meta.trend + meta.volatility * z;
    const open = currentPrice;
    currentPrice = Math.max(1, currentPrice * (1 + dailyReturn));
    const high = Math.max(open, currentPrice) * (1 + pseudoRandom() * 0.01);
    const low = Math.min(open, currentPrice) * (1 - pseudoRandom() * 0.01);
    const volume = Math.round(10000000 + pseudoRandom() * 15000000);

    records.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(currentPrice.toFixed(2)),
      adjClose: parseFloat(currentPrice.toFixed(2)),
      volume: volume,
    });
  }

  return records;
}

async function fetchFromYahooFinance(ticker: string, range: string = '1y') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=1d&includePrePost=false`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance responded with status ${response.status}`);
  }

  const json = await response.json();
  const result = json?.chart?.result?.[0];
  if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
    throw new Error('Formato de datos no válido de Yahoo Finance');
  }

  const timestamps: number[] = result.timestamp;
  const quote = result.indicators.quote[0];
  const adjclose = result.indicators.adjclose?.[0]?.adjclose || quote.close;

  const records = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = quote.close[i];
    if (close === null || close === undefined || isNaN(close)) continue;

    const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
    records.push({
      date: dateStr,
      open: parseFloat((quote.open[i] ?? close).toFixed(2)),
      high: parseFloat((quote.high[i] ?? close).toFixed(2)),
      low: parseFloat((quote.low[i] ?? close).toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      adjClose: parseFloat((adjclose[i] ?? close).toFixed(2)),
      volume: quote.volume[i] ?? 0,
    });
  }

  return {
    source: 'Yahoo Finance Real-time',
    symbol: result.meta?.symbol || ticker.toUpperCase(),
    currency: result.meta?.currency || 'USD',
    regularMarketPrice: result.meta?.regularMarketPrice || records[records.length - 1]?.close,
    records,
  };
}

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json());

  // API Health
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'QuantRegression API', timestamp: new Date().toISOString() });
  });

  // API endpoint to fetch asset historical data
  app.get('/api/finance/history', async (req: Request, res: Response) => {
    const ticker = String(req.query.ticker || 'NVDA').toUpperCase().trim();
    const range = String(req.query.range || '1y');

    try {
      const realData = await fetchFromYahooFinance(ticker, range);
      res.json({
        success: true,
        isSynthetic: false,
        ticker,
        range,
        ...realData,
      });
    } catch (err: any) {
      console.warn(`Yahoo Finance direct fetch for ${ticker} failed (${err.message}). Using synthetic fallback data.`);
      
      const days = range === '6m' ? 130 : range === '2y' ? 504 : range === '5y' ? 1260 : 252;
      const syntheticRecords = generateSyntheticHistoricalData(ticker, days);
      const lastPrice = syntheticRecords[syntheticRecords.length - 1]?.close || 100;

      res.json({
        success: true,
        isSynthetic: true,
        fallbackNotice: 'Datos simulados basados en parámetros históricos del activo (Yahoo Finance fallback)',
        symbol: ticker,
        currency: 'USD',
        regularMarketPrice: lastPrice,
        records: syntheticRecords,
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`QuantRegression server running on port ${port}`);
  });
}

startServer();
