// src/data/mockData.ts
import type { OptionChainData, VolatilityData, TimeSeriesPoint } from './types';

/** Mock option chain data for NIFTY */
export const MOCK_NIFTY_CHAIN: OptionChainData = {
  symbol: 'NIFTY',
  underlyingPrice: 19500,
  timestamp: new Date().toISOString(),
  expiryDate: '2024-12-28',
  legs: [
    // ITM Calls
    {
      strike: 19000,
      type: 'CE',
      lastPrice: 520,
      iv: 18.5,
      oi: 125000,
      volume: 45000,
      delta: 0.85,
      gamma: 0.002,
      theta: -12.5,
      vega: 45.2,
    },
    {
      strike: 19200,
      type: 'CE',
      lastPrice: 350,
      iv: 17.8,
      oi: 180000,
      volume: 62000,
      delta: 0.72,
      gamma: 0.0035,
      theta: -15.8,
      vega: 52.3,
    },
    {
      strike: 19400,
      type: 'CE',
      lastPrice: 210,
      iv: 17.2,
      oi: 210000,
      volume: 78000,
      delta: 0.58,
      gamma: 0.0045,
      theta: -18.2,
      vega: 58.7,
    },
    // ATM Call
    {
      strike: 19500,
      type: 'CE',
      lastPrice: 150,
      iv: 16.9,
      oi: 350000,
      volume: 125000,
      delta: 0.50,
      gamma: 0.005,
      theta: -20.5,
      vega: 62.5,
    },
    // OTM Calls
    {
      strike: 19600,
      type: 'CE',
      lastPrice: 95,
      iv: 17.5,
      oi: 280000,
      volume: 95000,
      delta: 0.42,
      gamma: 0.0045,
      theta: -18.8,
      vega: 59.2,
    },
    {
      strike: 19800,
      type: 'CE',
      lastPrice: 45,
      iv: 18.2,
      oi: 220000,
      volume: 68000,
      delta: 0.28,
      gamma: 0.0035,
      theta: -15.2,
      vega: 52.8,
    },
    {
      strike: 20000,
      type: 'CE',
      lastPrice: 18,
      iv: 19.5,
      oi: 175000,
      volume: 42000,
      delta: 0.15,
      gamma: 0.002,
      theta: -10.5,
      vega: 42.3,
    },
    // ITM Puts
    {
      strike: 20000,
      type: 'PE',
      lastPrice: 535,
      iv: 19.8,
      oi: 165000,
      volume: 38000,
      delta: -0.85,
      gamma: 0.002,
      theta: -11.2,
      vega: 43.5,
    },
    {
      strike: 19800,
      type: 'PE',
      lastPrice: 340,
      iv: 18.5,
      oi: 195000,
      volume: 55000,
      delta: -0.72,
      gamma: 0.0035,
      theta: -14.8,
      vega: 51.2,
    },
    {
      strike: 19600,
      type: 'PE',
      lastPrice: 205,
      iv: 17.8,
      oi: 245000,
      volume: 72000,
      delta: -0.58,
      gamma: 0.0045,
      theta: -17.5,
      vega: 57.8,
    },
    // ATM Put
    {
      strike: 19500,
      type: 'PE',
      lastPrice: 145,
      iv: 17.2,
      oi: 330000,
      volume: 118000,
      delta: -0.50,
      gamma: 0.005,
      theta: -20.2,
      vega: 61.8,
    },
    // OTM Puts
    {
      strike: 19400,
      type: 'PE',
      lastPrice: 92,
      iv: 17.5,
      oi: 265000,
      volume: 88000,
      delta: -0.42,
      gamma: 0.0045,
      theta: -18.5,
      vega: 58.5,
    },
    {
      strike: 19200,
      type: 'PE',
      lastPrice: 42,
      iv: 18.0,
      oi: 205000,
      volume: 62000,
      delta: -0.28,
      gamma: 0.0035,
      theta: -14.8,
      vega: 51.8,
    },
    {
      strike: 19000,
      type: 'PE',
      lastPrice: 15,
      iv: 19.2,
      oi: 155000,
      volume: 38000,
      delta: -0.15,
      gamma: 0.002,
      theta: -10.2,
      vega: 41.5,
    },
  ],
};

/** Mock volatility data (IV vs RV) for the past 30 days */
export const MOCK_VOLATILITY_DATA: VolatilityData = {
  implied: generateTimeSeriesData(30, 16, 20, 0.3),
  realized: generateTimeSeriesData(30, 14, 18, 0.4),
};

/** Mock price history for the underlying (past 30 days) */
export const MOCK_PRICE_HISTORY: TimeSeriesPoint[] = generateTimeSeriesData(
  30,
  19200,
  19800,
  0.5
);

/**
 * Helper function to generate realistic time-series data with a fixed seed
 * @param days - Number of days of data
 * @param min - Minimum value
 * @param max - Maximum value
 * @param volatility - How much the values fluctuate (0-1)
 * @param seed - Seed for reproducible random numbers
 */
function generateTimeSeriesData(
  days: number,
  min: number,
  max: number,
  volatility: number,
  seed: number = 12345
): TimeSeriesPoint[] {
  const data: TimeSeriesPoint[] = [];
  const baseDate = new Date('2024-01-01').getTime();
  const msPerDay = 24 * 60 * 60 * 1000;
  
  let currentValue = (min + max) / 2;
  
  // Seeded random generator for reproducible data
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  
  for (let i = days; i >= 0; i--) {
    const timestamp = baseDate + (days - i) * msPerDay;
    
    // Add some random walk behavior with seeded random
    const randomValue = seededRandom(seed + i);
    const change = (randomValue - 0.5) * (max - min) * volatility;
    currentValue += change;
    
    // Keep within bounds
    currentValue = Math.max(min, Math.min(max, currentValue));
    
    data.push({
      time: Math.floor(timestamp / 1000), // Convert to UNIX timestamp (seconds)
      value: Math.round(currentValue * 100) / 100, // Round to 2 decimals
    });
  }
  
  return data;
}

