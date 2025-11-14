// frontend/src/components/OptionChainTable.tsx
import React, { useMemo, useEffect, useState } from 'react';
import { FiShoppingCart, FiTrendingDown } from 'react-icons/fi';
import { useAppStore } from '../store/useAppStore';
import type { OptionLeg, OptionChainData } from '../data/types';
import { showToast } from '../utils/toast';
import { getOptionChain } from '../services/apiService';
import DataBar from '../components/charts/DataBar'; // <-- IMPORT OUR NEW BAR

interface StrikeData {
  ce?: OptionLeg;
  pe?: OptionLeg;
}

// This is the type for our final table row
type ProcessedRow = {
  strike: number;
  ce: OptionLeg | null;
  pe: OptionLeg | null;
};

// The fetcher function for SWR
const fetcher = (symbol: string) => getOptionChain(symbol);

export const OptionChainTable: React.FC = () => {
  // --- 1. HOOKS BLOCK ---
  const { currentSymbol, addLeg, theme } = useAppStore();

  const [chainData, setChainData] = useState<OptionChainData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ... (Your useEffect for fetching data stays exactly the same) ...
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getOptionChain(currentSymbol);
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
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [currentSymbol]);

  // --- 2. DATA PROCESSING HOOK ---
  // This hook now calculates everything we need in one go
  const { processedRows, maxOi, maxVolume } = useMemo(() => {
    // On first render or error, chainData is null. Return empty data.
    if (!chainData || !chainData.legs) {
      return { processedRows: [], maxOi: 0, maxVolume: 0 };
    }

    let maxOi = 0;
    let maxVolume = 0;
    const legMap = new Map<number, { ce: OptionLeg | null; pe: OptionLeg | null }>();

    chainData.legs.forEach((leg) => {
      // Find the max OI and Volume while we loop
      if (leg.oi > maxOi) maxOi = leg.oi;
      if (leg.volume > maxVolume) maxVolume = leg.volume;

      // (Your existing map logic)
      const strike = leg.strike;
      if (!legMap.has(strike)) {
        legMap.set(strike, { ce: null, pe: null });
      }
      if (leg.type === 'CE') {
        legMap.get(strike)!.ce = leg;
      } else {
        legMap.get(strike)!.pe = leg;
      }
    });

    const processedRows = Array.from(legMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([strike, legs]) => ({ strike, ...legs }));

    return { processedRows, maxOi, maxVolume };
  }, [chainData]); // This hook only re-runs when 'chainData' changes

  // --- (Your handler functions are the same) ---
  const handleBuy = (leg: OptionLeg) => {
    addLeg({
      strike: leg.strike,
      type: leg.type,
      position: 'buy',
      premium: leg.lastPrice,
    });
    showToast(`Bought ${leg.type} ${leg.strike} @ ₹${leg.lastPrice}`, 'success');
  };

  const handleSell = (leg: OptionLeg) => {
    addLeg({
      strike: leg.strike,
      type: leg.type,
      position: 'sell',
      premium: leg.lastPrice,
    });
    showToast(`Sold ${leg.type} ${leg.strike} @ ₹${leg.lastPrice}`, 'success');
  };

  // --- 3. GUARD CLAUSES BLOCK ---
  // (Your guard clauses are the same)
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

  if (error) {
    return (
      <div className={`p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen flex items-center justify-center`}>
        <div className={`max-w-md ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-lg p-8 text-center`}>
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Error Loading Data
          </h2>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
        </div>
      </div>
    );
  }

  if (!chainData || processedRows.length === 0) {
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
  return (
    <div className={`p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen`}>
      <div className="max-w-7xl mx-auto">
        {/* ... (Your Header is the same) ... */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {currentSymbol} Option Chain
              </h1>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                Underlying: ₹{chainData.underlyingPrice.toLocaleString()} | Expiry: {chainData.expiryDate}
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
            {/* Make sure table-fixed is set */}
            <table className={`w-full divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'} table-fixed`}>
              {/* Sticky Header */}
              <thead className={`sticky top-0 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-800'} text-white z-10`}>
                <tr>
                  {/* CALLS Header */}
                  <th className="w-24 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">IV</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">OI</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">OI Change</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Volume</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">LTP</th>

                  {/* STRIKE */}
                  <th className="w-32 px-6 py-3 text-center text-sm font-bold uppercase tracking-wider bg-gray-700">Strike</th>

                  {/* PUTS Header */}
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">LTP</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Volume</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">OI Change</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">OI</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">IV</th>
                  <th className="w-24 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {processedRows.map(({ strike, ce, pe }) => {
                  const isATM = Math.abs(strike - chainData.underlyingPrice) < 50;
                  const rowClass = isATM
                    ? theme === 'dark' ? 'bg-yellow-900 bg-opacity-20' : 'bg-yellow-50'
                    : theme === 'dark' ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50';

                  return (
                    <tr key={strike} className={rowClass}>
                      {/* CALL Data */}
                      {/* ... (Actions cell) ... */}
                      <td className="px-4 py-3">
                        {ce && (
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => handleBuy(ce!)} className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded transition-colors" title="Buy Call"><FiShoppingCart size={16} /></button>
                            <button onClick={() => handleSell(ce!)} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors" title="Sell Call"><FiTrendingDown size={16} /></button>
                          </div>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {ce?.iv ? `${ce.iv.toFixed(2)}%` : '-'}
                      </td>

                      {/* --- OI CELL (CALLS) --- */}
                      <td className={`relative px-4 py-3 text-right text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {/* The visualization bar (behind the text) */}
                        <DataBar value={ce?.oi || 0} maxValue={maxOi} colorClass="bg-green-500/20" align="right" />
                        {/* The text (on top) */}
                        <span className="relative z-10">{ce?.oi ? ce.oi.toLocaleString() : '-'}</span>
                      </td>

                      {/* --- OI CHANGE CELL (CALLS) --- */}
                      <td className={`px-4 py-3 text-right text-sm font-semibold ${
                          ce && ce.oi_change > 0 ? 'text-green-500' : 
                          ce && ce.oi_change < 0 ? 'text-red-500' :
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                          {ce ? ce.oi_change.toLocaleString() : '-'}
                      </td>

                      {/* --- VOLUME CELL (CALLS) --- */}
                      <td className={`relative px-4 py-3 text-right text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <DataBar value={ce?.volume || 0} maxValue={maxVolume} colorClass="bg-blue-500/20" align="right" />
                        <span className="relative z-10">{ce?.volume ? ce.volume.toLocaleString() : '-'}</span>
                      </td>

                      <td className="px-4 py-3 text-right text-sm font-semibold text-green-500">
                        {ce ? `₹${ce.lastPrice.toFixed(2)}` : '-'}
                      </td>

                      {/* STRIKE */}
                      <td className={`px-6 py-3 text-center font-bold ${theme === 'dark' ? 'text-white bg-gray-700' : 'text-gray-900 bg-gray-100'}`}>
                        {strike.toLocaleString()}
                      </td>

                      {/* PUT Data */}
                      <td className="px-4 py-3 text-left text-sm font-semibold text-red-500">
                        {pe ? `₹${pe.lastPrice.toFixed(2)}` : '-'}
                      </td>

                      {/* --- VOLUME CELL (PUTS) --- */}
                      <td className={`relative px-4 py-3 text-left text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <DataBar value={pe?.volume || 0} maxValue={maxVolume} colorClass="bg-blue-500/20" align="left" />
                        <span className="relative z-10">{pe?.volume ? pe.volume.toLocaleString() : '-'}</span>
                      </td>

                      {/* --- OI CHANGE CELL (PUTS) --- */}
                      <td className={`px-4 py-3 text-left text-sm font-semibold ${
                          pe && pe.oi_change > 0 ? 'text-green-500' : 
                          pe && pe.oi_change < 0 ? 'text-red-500' :
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                          {pe ? pe.oi_change.toLocaleString() : '-'}
                      </td>

                      {/* --- OI CELL (PUTS) --- */}
                      <td className={`relative px-4 py-3 text-left text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <DataBar value={pe?.oi || 0} maxValue={maxOi} colorClass="bg-red-500/20" align="left" />
                        <span className="relative z-10">{pe?.oi ? pe.oi.toLocaleString() : '-'}</span>
                      </td>

                      <td className={`px-4 py-3 text-left text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {pe?.iv ? `${pe.iv.toFixed(2)}%` : '-'}
                      </td>
                      {/* ... (Actions cell) ... */}
                      <td className="px-4 py-3">
                        {pe && (
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => handleBuy(pe!)} className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded transition-colors" title="Buy Put"><FiShoppingCart size={16} /></button>
                            <button onClick={() => handleSell(pe!)} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors" title="Sell Put"><FiTrendingDown size={16} /></button>
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

export default OptionChainTable;
