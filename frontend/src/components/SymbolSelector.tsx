import React from 'react';
import { useAppStore } from '../store/useAppStore'; // Make sure this path is correct

const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];

export const SymbolSelector: React.FC = () => {
  // 1. Get the theme from the global store
  const { currentSymbol, setCurrentSymbol, theme } = useAppStore();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentSymbol(e.target.value);
  };

  // 2. These classes are now dynamic based on the theme
  const baseClasses = "appearance-none w-full rounded-lg py-1.5 pl-3 pr-8 text-sm font-semibold transition-colors focus:outline-none focus:ring-2";
  
  const themeClasses = theme === 'dark' 
    ? "bg-gray-700 border-gray-600 text-white focus:bg-gray-600 focus:border-blue-500 focus:ring-blue-500"
    : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500";
  
  const iconThemeClasses = theme === 'dark' ? "text-gray-400" : "text-gray-500";

  return (
    <div className="relative">
      <select
        value={currentSymbol}
        onChange={handleChange}
        className={`${baseClasses} ${themeClasses}`}
      >
        {symbols.map((symbol) => (
          <option 
            key={symbol} 
            value={symbol}
            // Add styling for the dropdown options themselves
            className={theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-black'}
          >
            {symbol}
          </option>
        ))}
      </select>
      <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 ${iconThemeClasses}`}>
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  );
};

export default SymbolSelector;