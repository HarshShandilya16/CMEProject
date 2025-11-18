// frontend/src/components/SymbolSelector.tsx
import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { ALL_INDICES, getStocksForIndex, type IndexKey } from '../data/marketconstants';

export const SymbolSelector: React.FC = () => {
  const store = useAppStore();
  
  
  const selectedIndex = store.selectedIndex;
  const selectedStock = store.selectedStock;
  const currentSymbol = store.currentSymbol;
  const setSelectedIndex = store.setSelectedIndex;
  const setSelectedStock = store.setSelectedStock;
  const theme = store.theme;

  console.log('🔴 SymbolSelector RENDER - Current State:', {
    selectedIndex,
    selectedStock,
    currentSymbol
  });

  const handleIndexChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newIndex = e.target.value as IndexKey;
    console.log('🔴🔴🔴 INDEX DROPDOWN CHANGED TO:', newIndex);
    setSelectedIndex(newIndex);
  };

  const handleStockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    console.log('🟢🟢🟢 STOCK DROPDOWN CHANGED TO:', value);
    const stockToSet = value === '' ? null : value;
    console.log('🟢 Setting stock to:', stockToSet);
    setSelectedStock(stockToSet);
  };

  const availableStocks = getStocksForIndex(selectedIndex);
  console.log('🔴 Available stocks for', selectedIndex, ':', availableStocks);

  const baseClasses = "appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 cursor-pointer border";
  const themeClasses = theme === 'dark' 
    ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-600 focus:bg-gray-600 focus:border-blue-500 focus:ring-blue-500"
    : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50 focus:border-blue-500 focus:ring-blue-500";
  const iconThemeClasses = theme === 'dark' ? "text-gray-400" : "text-gray-500";

  return (
    <div className="flex items-center gap-3">
      {/* First Dropdown: Index Selector */}
      <div className="relative min-w-[160px]">
        <select
          value={selectedIndex}
          onChange={handleIndexChange}
          className={`${baseClasses} ${themeClasses} w-full`}
        >
          {ALL_INDICES.map((index) => (
            <option key={index} value={index}>
              📈 {index}
            </option>
          ))}
        </select>
        <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 ${iconThemeClasses}`}>
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>

      <div className={`text-lg font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>→</div>

      {/* Second Dropdown: Stock Selector */}
      <div className="relative min-w-[200px] flex-1">
        <select
          value={selectedStock || ''}
          onChange={handleStockChange}
          className={`${baseClasses} ${themeClasses} w-full`}
        >
          <option value="">📊 {selectedIndex} (Index)</option>
          <option disabled>──────────────────</option>
          <optgroup label={`🏢 ${selectedIndex} Stocks (${availableStocks.length})`}>
            {availableStocks.sort().map((stock) => (
              <option key={stock} value={stock}>{stock}</option>
            ))}
          </optgroup>
        </select>
        <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 ${iconThemeClasses}`}>
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
        <div className={`absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold rounded-full ${
          theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
        }`}>
          {availableStocks.length}
        </div>
      </div>

      {}
      <div className={`px-3 py-1 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Viewing: 
        </span>
        <strong className="text-yellow-500 ml-1 text-sm">{currentSymbol}</strong>
      </div>
    </div>
  );
};

export default SymbolSelector;