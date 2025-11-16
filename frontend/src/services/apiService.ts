import axios from 'axios';
import type { OptionChainData, VolatilityData } from '../data/types';
import { MOCK_NIFTY_CHAIN, MOCK_VOLATILITY_DATA } from '../data/mockData';

// --- THE MASTER SWITCH ---
const USE_LIVE_API = true;

// The base URL for your local FastAPI data pipeline
const API_URL = 'http://127.0.0.1:8000/api/v1';

// --- API FUNCTIONS ---

const simulateDelay = (data: any) => {
  return new Promise(resolve => setTimeout(() => resolve(data), 400));
};

export const getOptionChain = async (symbol: string): Promise<OptionChainData> => {
  if (USE_LIVE_API) {
    // --- THIS IS THE LIVE CODE ---
    try {
      const response = await axios.get(`${API_URL}/option-chain/${symbol}`);
      return response.data;
    } catch (err) {
      console.error(`Error fetching live option chain for ${symbol}:`, err);
      // Fallback to mock data on error
      return MOCK_NIFTY_CHAIN;
    }
    // --------------------------
  } else {
    return simulateDelay(MOCK_NIFTY_CHAIN) as Promise<OptionChainData>;
  }
};

export const getVolatilityData = async (): Promise<VolatilityData> => {
  if (USE_LIVE_API) {
    // --- UNCOMMENT THIS WHEN YOU BUILD THE VOLATILITY ENDPOINT ---
    // try {
    //   const response = await axios.get(`${API_URL}/volatility/${symbol}`);
    //   return response.data;
    // } catch (err) {
    //   console.error(`Error fetching live volatility for ${symbol}:`, err);
    //   return MOCK_VOLATILITY_DATA;
    // }
    // -----------------------------------------------------------
    return simulateDelay(MOCK_VOLATILITY_DATA) as Promise<VolatilityData>; // Placeholder
  } else {
    return simulateDelay(MOCK_VOLATILITY_DATA) as Promise<VolatilityData>;
  }
};

// You can add more API functions here as you build more endpoints
// For example: getSentiment, getPriceHistory, etc.

// --- NEW TYPES FOR BACKEND RESPONSES ---
export interface NewsArticle {
  title?: string;
  description?: string;
  url?: string;
  source?: string;
  publishedAt?: string;
  urlToImage?: string;
}

export interface NewsResponse {
  symbol: string;
  articles: NewsArticle[];
}

export interface SentimentResponse {
  symbol: string;
  pcr: number;
  detailed_insight: string;
}

export interface OpenInterestResponse {
  symbol: string;
  total_call_oi: number;
  total_put_oi: number;
}

export interface VolatilitySpreadResponse {
  symbol: string;
  implied_volatility: number;
  realized_volatility: number;
  spread: number;
}

export interface HistoricalPoint {
  time: string;
  price: number;
}

export interface HistoricalResponse {
  symbol: string;
  data: HistoricalPoint[];
}

// --- NEW API FUNCTIONS ---
export const getNews = async (symbol: string, q?: string, pageSize: number = 8): Promise<NewsResponse> => {
  try {
    const resp = await axios.get(`${API_URL}/news/${symbol}`, { params: { q, page_size: pageSize } });
    return resp.data;
  } catch (e) {
    console.error('getNews error', e);
    return { symbol, articles: [] };
  }
};

export const getSentiment = async (symbol: string): Promise<SentimentResponse> => {
  try {
    const resp = await axios.get(`${API_URL}/sentiment/${symbol}`);
    return resp.data;
  } catch (e) {
    console.error('getSentiment error', e);
    return { symbol, pcr: 0, detailed_insight: 'N/A' };
  }
};

export const getOpenInterestSummary = async (symbol: string): Promise<OpenInterestResponse> => {
  try {
    const resp = await axios.get(`${API_URL}/open-interest/${symbol}`);
    return resp.data;
  } catch (e) {
    console.error('getOpenInterestSummary error', e);
    return { symbol, total_call_oi: 0, total_put_oi: 0 };
  }
};

export const getVolatilitySpread = async (symbol: string): Promise<VolatilitySpreadResponse> => {
  try {
    const resp = await axios.get(`${API_URL}/volatility-spread/${symbol}`);
    return resp.data;
  } catch (e) {
    console.error('getVolatilitySpread error', e);
    return { symbol, implied_volatility: 0, realized_volatility: 0, spread: 0 };
  }
};

export const getHistoricalPrice = async (symbol: string): Promise<HistoricalResponse> => {
  try {
    const resp = await axios.get(`${API_URL}/historical-price/${symbol}`);
    return resp.data;
  } catch (e) {
    console.error('getHistoricalPrice error', e);
    return { symbol, data: [] };
  }
};

