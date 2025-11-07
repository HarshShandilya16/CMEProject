// src/components/OptionChainTable.tsx
import React, { useMemo, useEffect, useState } from 'react';
import { FiShoppingCart, FiTrendingDown } from 'react-icons/fi';
// import { MOCK_NIFTY_CHAIN } from '../data/mockData'; // <-- You can safely remove this!
import { useAppStore } from '../store/useAppStore';
import type { OptionLeg, OptionChainData } from '../data/types';
import { showToast } from '../utils/toast';
import { getOptionChain } from '../services/apiService';

interface StrikeData {
  ce?: OptionLeg;
  pe?: OptionLeg;
}

export const OptionChainTable: React.FC = () => {
  // --- 1. HOOKS BLOCK ---
  // All hooks MUST be called here, at the top, unconditionally.
  const addLeg = useAppStore((state) => state.addLeg);
  const currentSymbol = useAppStore((state) => state.currentSymbol);
  const theme = useAppStore((state) => state.theme);

  const [chainData, setChainData] = useState<OptionChainData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getOptionChain(currentSymbol);
        
        // Check if the API returned an error
        if ('error' in data) {
          setError(data.error as string);
          setChainData(null);
        } else {
          setChainData(data);
        }
      } catch (err) {
        console.error('Error fetching option chain:', err);
        setError('Failed to fetch option chain data');
        showToast('Failed to fetch option chain data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Refresh data every 60 seconds
    const interval = setInterval(fetchData, 60000);
    // This cleanup function is excellent!
    return () => clearInterval(interval); 
  }, [currentSymbol]);

  // Process flat legs array into strike-based map
  // This is now "safe" because it handles chainData being null
  const strikeMap = useMemo(() => {
    const map = new Map<number, StrikeData>();
    
    // On first render or error, chainData is null. Just return an empty map.
    if (!chainData || !chainData.legs) {
      return map;
    }

    chainData.legs.forEach((leg) => {
      if (!map.has(leg.strike)) {
        map.set(leg.strike, {});
      }
      const strikeData = map.get(leg.strike)!;
      if (leg.type === 'CE') {
        strikeData.ce = leg;
      } else {
        strikeData.pe = leg;
      }
    });

    return map;
  }, [chainData]); // Only re-calculate when chainData changes

  // Get sorted strikes
  // This is also "safe" because it handles strikeMap being empty
  const strikes = useMemo(() => {
    return Array.from(strikeMap.keys()).sort((a, b) => a - b);
  }, [strikeMap]); // Only re-calculate when strikeMap changes

  // --- 2. HANDLER FUNCTIONS ---
  // Define handlers for buying/selling
  const handleBuy = (leg: OptionLeg) => {
    addLeg({
      strike: leg.strike,
      type: leg.type,
      position: 'buy',
      premium: leg.lastPrice,
    });
    showToast(
      `Bought ${leg.type} ${leg.strike} @ ₹${leg.lastPrice}`,
      'success'
    );
  };

  const handleSell = (leg: OptionLeg) => {
    addLeg({
      strike: leg.strike,
      type: leg.type,
      position: 'sell',
      premium: leg.lastPrice,
    });
    showToast(
      `Sold ${leg.type} ${leg.strike} @ ₹${leg.lastPrice}`,
      'success'
    );
  };

  // --- 3. GUARD CLAUSES BLOCK ---
  // Now we can safely check states and return early
  
  // Loading state
  if (isLoading) {
    return (
      <div className={`p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Loading {currentSymbol} data...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen flex items-center justify-center`}>
        <div className={`max-w-md ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-lg p-8 text-center`}>
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Error Loading Data
          </h2>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  // No data state
  if (!chainData || strikes.length === 0) {
    return (
      <div className={`p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen flex items-center justify-center`}>
        <div className={`max-w-md ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-lg p-8 text-center`}>
          <div className="text-gray-500 text-5xl mb-4">📊</div>
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            No Data Available
          </h2>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No option chain data found for {currentSymbol}.
          </p>
        </div>
      </div>
    );
  }

  // --- 4. RENDER BLOCK ---
  // If we get here, chainData is valid and strikes is a populated array.
  return (
    <div className={`p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {currentSymbol} Option Chain
              </h1>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                Underlying: ₹{chainData.underlyingPrice.toLocaleString()} | 
                Expiry: {chainData.expiryDate}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Last Updated</div>
              <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {new Date(chainData.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Option Chain Table */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-lg overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className={`w-full divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {/* Sticky Header */}
              <thead className={`sticky top-0 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-800'} text-white z-10`}>
                <tr>
                  {/* CALLS Header */}
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">
                    IV
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">
                    OI
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">
                    LTP
                  </th>
                  
                  {/* STRIKE */}
                  <th className="px-6 py-3 text-center text-sm font-bold uppercase tracking-wider bg-gray-700">
                    Strike
                  </th>
                  
                  {/* PUTS Header */}
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    LTP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    OI
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    IV
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {strikes.map((strike) => {
                  const data = strikeMap.get(strike)!;
                  const isATM = Math.abs(strike - chainData.underlyingPrice) < 50; // Close to ATM
                  const rowClass = isATM 
                    ? theme === 'dark' ? 'bg-yellow-900 bg-opacity-20' : 'bg-yellow-50'
                    : theme === 'dark' ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50';

                  return (
                    <tr key={strike} className={rowClass}>
                      {/* CALL Data */}
                      <td className="px-4 py-3">
                        {data.ce && (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleBuy(data.ce!)}
                              className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                              title="Buy Call"
                            >
                              <FiShoppingCart size={16} />
                            </button>
                            <button
                              onClick={() => handleSell(data.ce!)}
                              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                              title="Sell Call"
                            >
                              <FiTrendingDown size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {data.ce?.iv.toFixed(2) || '-'}%
                      </td>
                      <td className={`px-4 py-3 text-right text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {data.ce?.oi.toLocaleString() || '-'}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {data.ce?.volume.toLocaleString() || '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-green-500">
                        {data.ce ? `₹${data.ce.lastPrice.toFixed(2)}` : '-'}
                      </td>

                      {/* STRIKE */}
                      <td className={`px-6 py-3 text-center font-bold ${theme === 'dark' ? 'text-white bg-gray-700' : 'text-gray-900 bg-gray-100'}`}>
                        {strike.toLocaleString()}
                      </td>

                      {/* PUT Data */}
                      <td className="px-4 py-3 text-left text-sm font-semibold text-red-500">
                        {data.pe ? `₹${data.pe.lastPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className={`px-4 py-3 text-left text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {data.pe?.volume.toLocaleString() || '-'}
                      </td>
                      <td className={`px-4 py-3 text-left text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {data.pe?.oi.toLocaleString() || '-'}
                      </td>
                      <td className={`px-4 py-3 text-left text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {data.pe?.iv.toFixed(2) || '-'}%
                      </td>
                      <td className="px-4 py-3">
                        {data.pe && (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleBuy(data.pe!)}
                              className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                              title="Buy Put"
                            >
                              <FiShoppingCart size={16} />
                            </button>
                            <button
                              onClick={() => handleSell(data.pe!)}
                              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                              title="Sell Put"
                            >
                              <FiTrendingDown size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};