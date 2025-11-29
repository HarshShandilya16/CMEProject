import axios from 'axios';
import type { OptionChainData, VolatilityData } from '../data/types';
import { MOCK_NIFTY_CHAIN, MOCK_VOLATILITY_DATA } from '../data/mockData';

//to see whether the live api is being used or not
const USE_LIVE_API = true;

// The base URL for backend api
const API_URL = 'http://127.0.0.1:8000/api/v1';



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
    
  } else {
    return simulateDelay(MOCK_NIFTY_CHAIN) as Promise<OptionChainData>;
  }
};

export const getVolatilityData = async (): Promise<VolatilityData> => {
  if (USE_LIVE_API) {
    
    return simulateDelay(MOCK_VOLATILITY_DATA) as Promise<VolatilityData>; 
  } else {
    return simulateDelay(MOCK_VOLATILITY_DATA) as Promise<VolatilityData>;
  }
};



//backend classes
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

export interface SocialBuzzSentiment {
  positive: number;
  neutral: number;
  negative: number;
}

export interface SocialBuzzTimelinePoint {
  time: string;
  count: number;
}

export interface SocialBuzzPost {
  source: string;
  user?: string;
  text: string;
  likes: number;
}

export interface SocialBuzzResponse {
  symbol: string;
  buzz_score: number;
  sources_used: string[];
  sentiment: SocialBuzzSentiment;
  timeline: SocialBuzzTimelinePoint[];
  top_keywords: string[];
  top_posts: SocialBuzzPost[];
}

export interface AlertEvent {
  symbol: string;
  rule_name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  message: string;
  metadata: Record<string, any>;
}

export interface AlertsResponse {
  symbol: string;
  alerts: AlertEvent[];
}


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

export const getSocialBuzz = async (symbol: string): Promise<SocialBuzzResponse> => {
  try {
    const resp = await axios.get(`${API_URL}/social-buzz/${symbol}`);
    return resp.data;
  } catch (e) {
    console.error('getSocialBuzz error', e);
    return {
      symbol,
      buzz_score: 0,
      sources_used: [],
      sentiment: { positive: 0, neutral: 1, negative: 0 },
      timeline: [],
      top_keywords: [],
      top_posts: [],
    };
  }
};

export const getAlerts = async (symbol: string): Promise<AlertsResponse> => {
  try {
    const resp = await axios.get(`${API_URL}/alerts/${symbol}`);
    return resp.data;
  } catch (e) {
    console.error('getAlerts error', e);
    return { symbol, alerts: [] };
  }
};

