// frontend/src/components/widgets/IVvsRVWidget.tsx
import React from 'react';
import useSWR from 'swr';
import { useAppStore } from '../../store/useAppStore';
import axios from 'axios';

// Define the shape of the API response
interface VolatilityData {
  symbol: string;
  implied_volatility: number;
  realized_volatility: number;
  spread: number;
}

// Define the fetcher function
const API_URL = 'http://127.0.0.1:8000/api/v1';
const fetcher = async (url: string): Promise<VolatilityData> => {
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

export const IVvsRVWidget: React.FC = () => {
  const { currentSymbol, theme } = useAppStore();
  const classes = getThemeClasses(theme);

  // Fetch data from our new Volatility Spread endpoint
  const { data, error } = useSWR(
    `${API_URL}/volatility-spread/${currentSymbol}`,
    fetcher,
    { refreshInterval: 300000 } // Refresh every 5 minutes
  );

  const cardClasses = `${classes.bg} p-6 rounded-xl shadow-lg border ${classes.border} h-full`;

  if (error) {
    return (
      <div className={cardClasses}>
        <h3 className={`text-lg font-semibold ${classes.textPrimary}`}>IV vs RV Spread</h3>
        <p className="text-sm text-red-500 mt-4">Error loading data.</p>
      </div>
    );
  }

  if (!data) {
    // Skeleton loading state
    return (
      <div className={cardClasses}>
        <h3 className={`text-lg font-semibold ${classes.textPrimary}`}>IV vs RV Spread</h3>
        <div className="animate-pulse mt-4">
          <div className={`h-6 ${classes.loadingBg} rounded w-1/2 mb-3`}></div>
          <div className={`h-4 ${classes.loadingBg} rounded w-3/4`}></div>
        </div>
      </div>
    );
  }

  const isExpensive = data.spread > 0;

  return (
    <div className={cardClasses}>
      <h3 className={`text-lg font-semibold ${classes.textPrimary}`}>IV vs RV Spread</h3>
      
      {/* --- THIS IS THE NEW, FIXED LAYOUT --- */}
      <div className="flex justify-between items-center mt-4 text-center">
        
        {/* IV */}
        <div className="px-1">
          <p className={`text-xs ${classes.textSecondary} uppercase`}>Implied Vol (IV)</p>
          <p className={`text-2xl font-bold ${classes.textPrimary}`}>{data.implied_volatility.toFixed(2)}%</p>
        </div>
        
        {/* RV */}
        <div className="px-1">
          <p className={`text-xs ${classes.textSecondary} uppercase`}>Realized Vol (RV)</p>
          <p className={`text-2xl font-bold ${classes.textPrimary}`}>{data.realized_volatility.toFixed(2)}%</p>
        </div>
        
        {/* Spread */}
        <div className="px-1">
          <p className={`text-xs ${classes.textSecondary} uppercase`}>Spread</p>
          <p className={`text-2xl font-bold ${isExpensive ? 'text-green-500' : 'text-red-500'}`}>
            {isExpensive ? '+' : ''}{data.spread.toFixed(2)}%
          </p>
        </div>

      </div>
      {/* --- END OF NEW LAYOUT --- */}

      <p className={`text-sm ${classes.textSecondary} mt-3 text-center`}>
        Options are trading at a <span className="font-bold">{isExpensive ? 'premium' : 'discount'}</span> to realized volatility.
      </p>
    </div>
  );
};
