// frontend/src/components/OptionChainTable.tsx
import React, { useMemo, useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { OptionLeg, OptionChainData } from '../data/types';
import { showToast } from '../utils/toast';
import { getOptionChain } from '../services/apiService';
import DataBar from '../components/charts/DataBar';

type ProcessedRow = {
  strike: number;
  ce: OptionLeg | null;
  pe: OptionLeg | null;
};

export const OptionChainTable: React.FC = () => {
  const { currentSymbol, theme } = useAppStore();

  const [chainData, setChainData] = useState<OptionChainData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  
  useEffect(() => {
    console.log('🔄 Symbol changed to:', currentSymbol); 
    
    const fetchData = async () => {
      console.log('📡 Fetching option chain for:', currentSymbol);
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await getOptionChain(currentSymbol);
        
        if ('error' in data) {
          console.error('❌ Backend error:', data.error);
          setError(data.error as string);
          setChainData(null);
          showToast(data.error as string, 'error');
        } else {
          console.log('✅ Data received for:', data.symbol, 'Legs:', data.legs?.length);
          setChainData(data);
          if (!data.legs || data.legs.length === 0) {
            setError('No option chain data available');
          }
        }
      } catch (err) {
        console.error('❌ Fetch error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch option chain data';
        setError(errorMsg);
        showToast(errorMsg, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    
    return () => {
      console.log('🧹 Cleaning up interval for:', currentSymbol);
      clearInterval(interval);
    };
  }, [currentSymbol]); // ✅ MUST depend on currentSymbol

  const { processedRows, maxOi, maxVolume } = useMemo(() => {
    if (!chainData || !chainData.legs) {
      return { processedRows: [], maxOi: 0, maxVolume: 0 };
    }

    let maxOi = 0;
    let maxVolume = 0;
    const legMap = new Map<number, { ce: OptionLeg | null; pe: OptionLeg | null }>();

    chainData.legs.forEach((leg) => {
      if (leg.oi > maxOi) maxOi = leg.oi;
      if (leg.volume > maxVolume) maxVolume = leg.volume;

      const strike = leg.strike;
      if (strike != null) {
        if (!legMap.has(strike)) {
          legMap.set(strike, { ce: null, pe: null });
        }
        if (leg.type === 'CE') {
          legMap.get(strike)!.ce = leg;
        } else {
          legMap.get(strike)!.pe = leg;
        }
      }
    });

    const processedRows = Array.from(legMap.entries())
      .filter(([strike]) => strike != null)
      .sort(([a], [b]) => a - b)
      .map(([strike, legs]) => ({ strike, ...legs }));

    return { processedRows, maxOi, maxVolume };
  }, [chainData]);

  // Loading State
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

  // Error State
  if (error) {
    return (
      <div className={`p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen flex items-center justify-center`}>
        <div className={`max-w-md ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-lg p-8 text-center`}>
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Error Loading Data
          </h2>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No Data State
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

  const greekClass = theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600';

  return (
    <div className={`p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen`}>
      <div className="max-w-[1920px] mx-auto">
        
        {/* Header */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {currentSymbol} Option Chain
              </h1>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                Underlying: ₹{chainData.underlyingPrice?.toLocaleString() || 'N/A'} | Expiry: {chainData.expiryDate || 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Last Updated</div>
              <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {chainData.timestamp ? new Date(chainData.timestamp).toLocaleTimeString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-lg overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className={`w-full divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'} table-fixed text-xs`}>
              <thead className={`sticky top-0 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-800'} text-white z-10`}>
                <tr>
                  <th className="px-2 py-3 text-center font-bold text-indigo-400">Delta</th>
                  <th className="px-2 py-3 text-center font-bold text-indigo-400">Theta</th>
                  <th className="px-2 py-3 text-center font-bold text-indigo-400">Gamma</th>
                  <th className="px-2 py-3 text-right font-bold">IV</th>
                  <th className="px-2 py-3 text-right font-bold">OI</th>
                  <th className="px-2 py-3 text-right font-bold">OI Chg</th>
                  <th className="px-2 py-3 text-right font-bold">Vol</th>
                  <th className="px-2 py-3 text-right font-bold">LTP</th>
                  <th className="w-24 px-2 py-3 text-center text-sm font-bold bg-gray-700">Strike</th>
                  <th className="px-2 py-3 text-left font-bold">LTP</th>
                  <th className="px-2 py-3 text-left font-bold">Vol</th>
                  <th className="px-2 py-3 text-left font-bold">OI Chg</th>
                  <th className="px-2 py-3 text-left font-bold">OI</th>
                  <th className="px-2 py-3 text-left font-bold">IV</th>
                  <th className="px-2 py-3 text-center font-bold text-indigo-400">Gamma</th>
                  <th className="px-2 py-3 text-center font-bold text-indigo-400">Theta</th>
                  <th className="px-2 py-3 text-center font-bold text-indigo-400">Delta</th>
                </tr>
              </thead>

              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {processedRows.map(({ strike, ce, pe }) => {
                  if (!strike) return null;
                  
                  const isATM = Math.abs(strike - chainData.underlyingPrice) < 50;
                  const rowClass = isATM
                    ? theme === 'dark' ? 'bg-yellow-900 bg-opacity-20' : 'bg-yellow-50'
                    : theme === 'dark' ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50';

                  return (
                    <tr key={strike} className={rowClass}>
                      {/* CALLS */}
                      <td className={`px-2 py-2 text-center ${greekClass}`}>{ce?.delta?.toFixed(2) || '-'}</td>
                      <td className={`px-2 py-2 text-center ${greekClass}`}>{ce?.theta?.toFixed(2) || '-'}</td>
                      <td className={`px-2 py-2 text-center ${greekClass}`}>{ce?.gamma?.toFixed(4) || '-'}</td>
                      <td className={`px-2 py-2 text-right ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {ce?.iv ? `${ce.iv.toFixed(2)}%` : '-'}
                      </td>
                      <td className={`relative px-2 py-2 text-right ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <DataBar value={ce?.oi || 0} maxValue={maxOi} colorClass="bg-green-500/20" align="right" />
                        <span className="relative z-10">{ce?.oi ? ce.oi.toLocaleString() : '-'}</span>
                      </td>
                      <td className={`px-2 py-2 text-right font-semibold ${ce && ce.oi_change > 0 ? 'text-green-500' : ce && ce.oi_change < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {ce ? ce.oi_change.toLocaleString() : '-'}
                      </td>
                      <td className={`relative px-2 py-2 text-right ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <DataBar value={ce?.volume || 0} maxValue={maxVolume} colorClass="bg-blue-500/20" align="right" />
                        <span className="relative z-10">{ce?.volume ? ce.volume.toLocaleString() : '-'}</span>
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-green-500">
                        {ce ? `₹${ce.lastPrice.toFixed(2)}` : '-'}
                      </td>

                      {/* STRIKE */}
                      <td className={`px-2 py-2 text-center font-bold text-sm ${theme === 'dark' ? 'text-white bg-gray-700' : 'text-gray-900 bg-gray-100'}`}>
                        {strike.toLocaleString()}
                      </td>

                      {/* PUTS */}
                      <td className="px-2 py-2 text-left font-semibold text-red-500">
                        {pe ? `₹${pe.lastPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className={`relative px-2 py-2 text-left ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <DataBar value={pe?.volume || 0} maxValue={maxVolume} colorClass="bg-blue-500/20" align="left" />
                        <span className="relative z-10">{pe?.volume ? pe.volume.toLocaleString() : '-'}</span>
                      </td>
                      <td className={`px-2 py-2 text-left font-semibold ${pe && pe.oi_change > 0 ? 'text-green-500' : pe && pe.oi_change < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {pe ? pe.oi_change.toLocaleString() : '-'}
                      </td>
                      <td className={`relative px-2 py-2 text-left ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <DataBar value={pe?.oi || 0} maxValue={maxOi} colorClass="bg-red-500/20" align="left" />
                        <span className="relative z-10">{pe?.oi ? pe.oi.toLocaleString() : '-'}</span>
                      </td>
                      <td className={`px-2 py-2 text-left ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {pe?.iv ? `${pe.iv.toFixed(2)}%` : '-'}
                      </td>
                      <td className={`px-2 py-2 text-center ${greekClass}`}>{pe?.gamma?.toFixed(4) || '-'}</td>
                      <td className={`px-2 py-2 text-center ${greekClass}`}>{pe?.theta?.toFixed(2) || '-'}</td>
                      <td className={`px-2 py-2 text-center ${greekClass}`}>{pe?.delta?.toFixed(2) || '-'}</td>
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