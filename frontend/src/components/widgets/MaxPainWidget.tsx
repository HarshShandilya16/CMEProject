// frontend/src/components/widgets/MaxPainWidget.tsx
import React from 'react';
import useSWR from 'swr';
import { useAppStore } from '../../store/useAppStore';
import axios from 'axios';

// Define the shape of the API response
interface MaxPainData {
  symbol: string;
  max_pain_strike: number;
  current_price: number;
}

// Define the fetcher function
const API_URL = 'http://127.0.0.1:8000/api/v1';
const fetcher = async (url: string): Promise<MaxPainData> => {
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

export const MaxPainWidget: React.FC = () => {
  const { currentSymbol, theme } = useAppStore();
  const classes = getThemeClasses(theme);

  // Fetch data from our new Max Pain endpoint
  const { data, error } = useSWR(
    `${API_URL}/max-pain/${currentSymbol}`,
    fetcher,
    { refreshInterval: 300000 } // Refresh every 5 minutes
  );

  const cardClasses = `${classes.bg} p-6 rounded-xl shadow-lg border ${classes.border} h-full`;

  if (error) {
    return (
      <div className={cardClasses}>
        <h3 className={`text-lg font-semibold ${classes.textPrimary}`}>Max Pain</h3>
        <p className="text-sm text-red-500 mt-4">Error loading data.</p>
      </div>
    );
  }

  if (!data || !data.max_pain_strike) {
    // Skeleton loading state
    return (
      <div className={cardClasses}>
        <h3 className={`text-lg font-semibold ${classes.textPrimary}`}>Max Pain</h3>
        <div className="animate-pulse mt-4">
          <div className={`h-8 ${classes.loadingBg} rounded w-1/2 mb-3`}></div>
          <div className={`h-4 ${classes.loadingBg} rounded w-3/4`}></div>
        </div>
      </div>
    );
  }

  // Calculate the distance
  const distance = data.current_price - data.max_pain_strike;
  
  return (
    <div className={cardClasses}>
      <h3 className={`text-lg font-semibold ${classes.textPrimary}`}>Max Pain</h3>
      <div className="mt-3">
        <p className={`text-xs ${classes.textSecondary} uppercase`}>Strike Price</p>
        <p className={`text-4xl font-bold ${classes.textPrimary} text-purple-400`}>
          {data.max_pain_strike.toLocaleString('en-IN')}
        </p>
        <p className={`text-sm ${classes.textSecondary} mt-2`}>
          Price is currently 
          <span className={`font-bold ${distance > 0 ? 'text-green-500' : 'text-red-500'}`}>
             {Math.abs(distance).toFixed(0)} pts
          </span> 
          {distance > 0 ? ' above' : ' below'} the max pain level.
        </p>
      </div>
    </div>
  );
};
