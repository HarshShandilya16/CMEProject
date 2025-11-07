// src/data/types.ts

/** A single leg of an option (either a Call or a Put) */
export interface OptionLeg {
  strike: number;
  type: 'CE' | 'PE';
  lastPrice: number;
  iv: number;
  oi: number;
  volume: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

/** The complete option chain data from our API */
export interface OptionChainData {
  symbol: string;
  underlyingPrice: number;
  timestamp: string; // ISO 8601 string
  expiryDate: string; // YYYY-MM-DD
  legs: OptionLeg[];
}

/** A single point for a time-series chart */
export interface TimeSeriesPoint {
  time: number; // UNIX timestamp
  value: number;
}

/** Data for the IV vs RV chart */
export interface VolatilityData {
  implied: TimeSeriesPoint[];
  realized: TimeSeriesPoint[];
}

/** Data for the AI Sentiment chart */
export interface SentimentData {
  score: TimeSeriesPoint[]; // Score from -1 to 1
  rationale: string;
}

/** A leg selected by the user for the payoff chart */
export interface PortfolioLeg {
  strike: number;
  type: 'CE' | 'PE';
  position: 'buy' | 'sell';
  premium: number;
}
