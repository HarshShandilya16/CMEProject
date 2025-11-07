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

