// This is the code for your MarketSentiment widget
import React from 'react';
import useSWR from 'swr';
import { useAppStore } from '../../store/useAppStore'; // Adjust path if needed
import axios from 'axios';

// Define the shape of the API response
interface SentimentData {
  symbol: string;
  pcr: number;
  insight: string;
}

// Define the fetcher function
const API_URL = 'http://127.0.0.1:8000/api/v1';
const fetcher = async (url: string): Promise<SentimentData> => {
  const res = await axios.get(url);
  return res.data;
};

// Helper to get the theme
const getThemeClasses = (theme: 'light' | 'dark') => {
  return {
    bg: theme === 'dark' ? 'bg-gray-800' : 'bg-white',
    textPrimary: theme === 'dark' ? 'text-white' : 'text-gray-900',
    textSecondary: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
    border: theme === 'dark' ? 'border-gray-700' : 'border-gray-200',
    loadingBg: theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200',
    loadingText: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
  };
};

export const MarketSentimentWidget: React.FC = () => {
  // 1. LISTEN to the global symbol and theme
  const { currentSymbol, theme } = useAppStore();
  const classes = getThemeClasses(theme);

  // 2. FETCH live data from our new endpoint
  const { data, error } = useSWR(
    `${API_URL}/sentiment/${currentSymbol}`, // The key is the dynamic URL
    fetcher, // The function to run
    { refreshInterval: 60000 } // Re-fetch every 60 seconds
  );

  // 3. RENDER the loading/error/success states
  if (error) {
    return (
      <div className={`${classes.bg} p-6 rounded-xl shadow-md border ${classes.border}`}>
        <h3 className={`text-lg font-semibold ${classes.textPrimary}`}>Market Sentiment</h3>
        <p className="text-sm text-red-500 mt-4">Error loading sentiment data.</p>
      </div>
    );
  }

  if (!data) {
    // This is a "skeleton" loading state to match your UI
    return (
      <div className={`${classes.bg} p-6 rounded-xl shadow-md border ${classes.border}`}>
        <h3 className={`text-lg font-semibold ${classes.textPrimary}`}>Market Sentiment</h3>
        <div className="animate-pulse mt-4">
          <div className="flex justify-between mb-1">
            <span className={`h-4 ${classes.loadingBg} rounded w-1/4`}></span>
            <span className={`h-4 ${classes.loadingBg} rounded w-1/6`}></span>
          </div>
          <div className={`w-full ${classes.loadingBg} rounded-full h-2.5`}></div>
          <div className={`h-3 ${classes.loadingBg} rounded w-5/6 mt-3`}></div>
        </div>
      </div>
    );
  }

  // --- Success State ---
  // Simple logic for the progress bar
  const pcrPercent = Math.min(data.pcr / 2, 1) * 100; // Cap at PCR 2.0

  return (
    <div className={`${classes.bg} p-6 rounded-xl shadow-md border ${classes.border}`}>
      <h3 className={`text-lg font-semibold ${classes.textPrimary}`}>Market Sentiment</h3>
      
      <div className="my-4">
        <div className="flex justify-between mb-1">
          <span className={`text-sm font-medium ${classes.textPrimary}`}>PCR Ratio</span>
          <span className={`text-sm font-bold ${classes.textPrimary}`}>{data.pcr.toFixed(2)}</span>
        </div>
        <div className={`w-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2.5`}>
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${pcrPercent}%` }}
          ></div>
        </div>
      </div>
      
      <p className={`text-sm ${classes.textSecondary}`}>
        {data.insight}
      </p>
    </div>
  );
};

