// frontend/src/components/widgets/OpenInterestWidget.tsx
import React from 'react';
import useSWR from 'swr';
import { useAppStore } from '../../store/useAppStore';
import axios from 'axios';

// Define kr rhe structure of response
interface OpenInterestData {
  symbol: string;
  total_call_oi: number;
  total_put_oi: number;
}

// Define the fetcher function
const API_URL = 'http://127.0.0.1:8000/api/v1';
const fetcher = async (url: string): Promise<OpenInterestData> => {
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
  };
};

// used to format big numbers to their short form
const formatLargeNumber = (num: number) => {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toLocaleString('en-IN');
};

export const OpenInterestWidget: React.FC = () => {
  const { currentSymbol, theme } = useAppStore();
  const classes = getThemeClasses(theme);

  // Fetch data from our new Open Interest endpoint
  const { data, error } = useSWR(
    `${API_URL}/open-interest/${currentSymbol}`,
    fetcher,
    { refreshInterval: 60000 } // Refresh in 1 min
  );

  const cardClasses = `${classes.bg} p-6 rounded-xl shadow-lg border ${classes.border} h-full`;

  if (error) {
    return (
      <div className={cardClasses}>
        <h3 className={`text-lg font-semibold ${classes.textPrimary}`}>Open Interest</h3>
        <p className="text-sm text-red-500 mt-4">Error loading data.</p>
      </div>
    );
  }

  if (!data) {
    
    return (
      <div className={cardClasses}>
        <h3 className={`text-lg font-semibold ${classes.textPrimary}`}>Open Interest</h3>
        <div className="animate-pulse mt-4">
          <div className={`h-8 ${classes.loadingBg} rounded w-1/2 mb-3`}></div>
          <div className={`h-4 ${classes.loadingBg} rounded w-3/4`}></div>
        </div>
      </div>
    );
  }

  
  const totalOI = data.total_call_oi + data.total_put_oi;
  const callPercent = totalOI > 0 ? (data.total_call_oi / totalOI) * 100 : 50;
  const putPercent = 100 - callPercent;

  return (
    <div className={cardClasses}>
      <h3 className={`text-lg font-semibold ${classes.textPrimary}`}>Open Interest</h3>
      <div className="mt-4">
        {}
        <div className="flex w-full h-3 rounded-full overflow-hidden">
          <div 
            className="bg-green-500" 
            style={{ width: `${callPercent}%` }}
            title={`Calls: ${formatLargeNumber(data.total_call_oi)}`}
          />
          <div 
            className="bg-red-500" 
            style={{ width: `${putPercent}%` }}
            title={`Puts: ${formatLargeNumber(data.total_put_oi)}`}
          />
        </div>

        {}
        <div className="flex justify-between mt-3">
          <div>
            <p className="text-xs text-green-500 uppercase">Total Call OI</p>
            <p className={`text-2xl font-bold ${classes.textPrimary}`}>
              {formatLargeNumber(data.total_call_oi)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-red-500 uppercase">Total Put OI</p>
            <p className={`text-2xl font-bold ${classes.textPrimary}`}>
              {formatLargeNumber(data.total_put_oi)}
            </p>
          </div>
        </div>

        <p className={`text-sm ${classes.textSecondary} mt-3`}>
          Puts make up <span className="font-bold">{putPercent.toFixed(1)}%</span> of the total open interest.
        </p>
      </div>
    </div>
  );
};
