// frontend/src/components/charts/GraphicalOptionChain.tsx
import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { useAppStore } from '../../store/useAppStore';
import useSWR from 'swr';
import { getOptionChain } from '../../services/apiService';

const fetcher = (symbol: string) => getOptionChain(symbol);

interface ChartDataPoint {
  strike: number;
  callOI: number;
  putOI: number;
  callVol: number;
  putVol: number;
  callDelta: number | null;
  putDelta: number | null;
  callGamma: number | null;
  putGamma: number | null;
  isATM?: boolean;
}

export const GraphicalOptionChain: React.FC = () => {
  const { currentSymbol, theme } = useAppStore();
  const { data, error, isLoading } = useSWR(currentSymbol, fetcher, { 
    refreshInterval: 60000,
    revalidateOnFocus: false 
  });

  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const textColor = isDark ? '#e5e7eb' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e5e5';

  // Transform Data
  const chartData = useMemo(() => {
    if (!data || !data.legs) return [];

    console.log('📊 GraphicalOptionChain: Processing', data.legs.length, 'legs for', currentSymbol);

    const strikeMap = new Map<number, ChartDataPoint>();
    
    data.legs.forEach(leg => {
      if (!strikeMap.has(leg.strike)) {
        strikeMap.set(leg.strike, { 
          strike: leg.strike, 
          callOI: 0, 
          putOI: 0, 
          callVol: 0, 
          putVol: 0,
          callDelta: null, 
          putDelta: null,
          callGamma: null, 
          putGamma: null,
          isATM: false
        });
      }
      
      const entry = strikeMap.get(leg.strike)!;
      
      if (leg.type === 'CE') {
        entry.callOI = leg.oi;
        entry.callVol = leg.volume;
        entry.callDelta = leg.delta ?? null;
        entry.callGamma = leg.gamma ?? null;
      } else {
        entry.putOI = leg.oi;
        entry.putVol = leg.volume;
        entry.putDelta = leg.delta ?? null;
        entry.putGamma = leg.gamma ?? null;
      }
    });

    let sortedData = Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike);

    // Filter to ±12 strikes around ATM
    if (data.underlyingPrice) {
      const atmIndex = sortedData.findIndex(d => d.strike >= data.underlyingPrice);
      if (atmIndex !== -1) {
        // Mark ATM
        sortedData[atmIndex].isATM = true;
        
        const start = Math.max(0, atmIndex - 12);
        const end = Math.min(sortedData.length, atmIndex + 12);
        sortedData = sortedData.slice(start, end);
      }
    }

    console.log('📊 Chart showing', sortedData.length, 'strikes');
    return sortedData;
  }, [data, currentSymbol]);

  // --- READABLE TOOLTIP WITH SOLID BACKGROUND ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload as ChartDataPoint;
      
      return (
        // Solid dark background for maximum readability
        <div className="p-4 border border-gray-600 bg-gray-900 shadow-2xl rounded-lg z-50">
          {/* Header */}
          <div className="mb-3 pb-2 border-b border-gray-700">
            <p className="font-bold text-base text-white">
              Strike: ₹{label?.toLocaleString()}
            </p>
            {d.isATM && (
              <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded mt-1 inline-block">
                ATM
              </span>
            )}
          </div>
          
          {/* Data Grid */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
            {/* Headers */}
            <span className="font-semibold text-gray-400">Metric</span>
            <span className="font-bold text-green-400 text-right">CALL</span>
            <span className="font-bold text-red-400 text-right">PUT</span>

            {/* Open Interest */}
            <span className="text-gray-200">Open Int.</span>
            <span className="text-white text-right font-semibold">
              {d.callOI.toLocaleString()}
            </span>
            <span className="text-white text-right font-semibold">
              {d.putOI.toLocaleString()}
            </span>

            {/* Volume - Distinct colors matching the lines */}
            <span className="text-gray-200">Volume</span>
            <span className="text-blue-400 text-right font-semibold">
              {d.callVol.toLocaleString()}
            </span>
            <span className="text-purple-400 text-right font-semibold">
              {d.putVol.toLocaleString()}
            </span>
            
            {/* Greeks Divider */}
            <div className="col-span-3 border-b border-gray-700 my-2"></div>

            {/* Delta */}
            <span className="text-gray-200">Delta</span>
            <span className="text-white text-right">
              {d.callDelta !== null ? d.callDelta.toFixed(3) : '-'}
            </span>
            <span className="text-white text-right">
              {d.putDelta !== null ? d.putDelta.toFixed(3) : '-'}
            </span>

            {/* Gamma */}
            <span className="text-gray-200">Gamma</span>
            <span className="text-white text-right">
              {d.callGamma !== null ? d.callGamma.toFixed(4) : '-'}
            </span>
            <span className="text-white text-right">
              {d.putGamma !== null ? d.putGamma.toFixed(4) : '-'}
            </span>
          </div>

          {/* PCR Footer */}
          <div className="mt-3 pt-2 border-t border-gray-700">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">PCR (Put/Call OI):</span>
              <span className="text-white font-bold">
                {d.callOI > 0 ? (d.putOI / d.callOI).toFixed(2) : '-'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Loading State
  if (isLoading) {
    return (
      <div className={`p-6 rounded-xl shadow-lg border ${borderColor} ${bgColor} h-full flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading {currentSymbol} analysis...
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={`p-6 rounded-xl shadow-lg border ${borderColor} ${bgColor} h-full`}>
        <div className="text-red-500 text-center">
          <div className="text-3xl mb-2">⚠️</div>
          <p>Error loading chart</p>
        </div>
      </div>
    );
  }

  // No Data State
  if (!data || chartData.length === 0) {
    return (
      <div className={`p-6 rounded-xl shadow-lg border ${borderColor} ${bgColor} h-full`}>
        <div className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="text-3xl mb-2">📊</div>
          <p>No data available for {currentSymbol}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-xl shadow-lg border ${borderColor} ${bgColor} h-full`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div>
          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Option Chain Analysis
          </h3>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Bars = Open Interest | Lines = Volume | Hover for Greeks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-blue-500">
            Spot: ₹{data.underlyingPrice?.toLocaleString()}
          </span>
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            {data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : ''}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Call OI</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Put OI</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-8 h-0.5 bg-blue-500"></div>
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Call Vol</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-8 h-0.5 bg-purple-500"></div>
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Put Vol</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={chartData} 
            margin={{ top: 10, right: 40, left: 0, bottom: 40 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={gridColor} 
              vertical={false} 
            />
            
            <XAxis 
              dataKey="strike" 
              stroke={textColor} 
              tick={{ fontSize: 10, fill: textColor }}
              angle={-45}
              textAnchor="end"
              height={80}
              tickFormatter={(value) => value.toLocaleString()}
            />
            
            {/* Left Axis: Open Interest */}
            <YAxis 
              yAxisId="left"
              stroke={textColor} 
              tickFormatter={(val) => (val / 1000).toFixed(0) + 'K'} 
              tick={{ fontSize: 11, fill: textColor }} 
              label={{ 
                value: 'Open Interest', 
                angle: -90, 
                position: 'insideLeft', 
                fill: textColor, 
                fontSize: 10 
              }}
            />

            {/* Right Axis: Volume */}
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#8884d8" 
              tickFormatter={(val) => (val / 1000).toFixed(0) + 'K'}
              tick={{ fontSize: 11, fill: '#8884d8' }}
              label={{ 
                value: 'Volume', 
                angle: 90, 
                position: 'insideRight', 
                fill: '#8884d8', 
                fontSize: 10 
              }}
            />

            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            
            <Legend 
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
              iconType="square"
            />
            
            <ReferenceLine 
              yAxisId="left" 
              x={data.underlyingPrice} 
              stroke="orange" 
              strokeDasharray="5 5" 
              strokeWidth={2}
              label={{ 
                value: 'SPOT', 
                position: 'top',
                fill: 'orange',
                fontSize: 10,
                fontWeight: 'bold'
              }}
            />

            {/* Bars for Total OI (Left Axis) - Green/Red */}
            <Bar 
              yAxisId="left" 
              dataKey="callOI" 
              name="Call OI" 
              fill="#22c55e" 
              radius={[4, 4, 0, 0]} 
              barSize={20}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`call-${index}`} 
                  fill={entry.isATM ? '#16a34a' : '#22c55e'} 
                />
              ))}
            </Bar>
            
            <Bar 
              yAxisId="left" 
              dataKey="putOI" 
              name="Put OI" 
              fill="#ef4444" 
              radius={[4, 4, 0, 0]} 
              barSize={20}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`put-${index}`} 
                  fill={entry.isATM ? '#dc2626' : '#ef4444'} 
                />
              ))}
            </Bar>

            {/* Lines for Volume (Right Axis) - Blue/Purple for distinction */}
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="callVol" 
              name="Call Vol" 
              stroke="#3b82f6" 
              strokeWidth={2} 
              dot={false} 
              strokeDasharray="5 5" 
            />
            
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="putVol" 
              name="Put Vol" 
              stroke="#a855f7" 
              strokeWidth={2} 
              dot={false} 
              strokeDasharray="5 5" 
            />

          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'} text-center`}>
        Hover over strikes for detailed breakdown • ±12 strikes around ATM
      </div>
    </div>
  );
};

export default GraphicalOptionChain;