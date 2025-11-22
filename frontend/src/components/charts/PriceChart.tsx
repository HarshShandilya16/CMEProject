// frontend/src/components/charts/PriceChart.tsx
import React, { useState, useEffect, memo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  ComposedChart, 
  Area, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  ReferenceLine
} from 'recharts';

// Define the data structure
interface ChartData {
  time: string;
  price: number;
  volume: number;
}

const PriceChart: React.FC = () => {
  const { currentSymbol, theme } = useAppStore();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Theme colors
  const isDark = theme === 'dark';
  const textColor = isDark ? '#9ca3af' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e5e5';

  useEffect(() => {
    console.log('📈 PriceChart: Fetching data for', currentSymbol);
    
    const fetchChartData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/v1/historical-price/${currentSymbol}`);
        if (!res.ok) throw new Error('Failed to load data');
        
        const result = await res.json();
        console.log('📈 Received data points:', result.data?.length || 0);
        
        if (result.data && result.data.length > 0) {
          setChartData(result.data);
        } else {
          setChartData([]);
          setError('No historical data available');
        }
      } catch (err) {
        console.error('📈 Error:', err);
        setError("Failed to load chart");
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [currentSymbol]);

  // Helper to format large volume numbers
  const formatVolume = (num: number) => {
    if (num >= 10000000) return (num / 10000000).toFixed(1) + 'Cr';
    if (num >= 100000) return (num / 100000).toFixed(1) + 'L';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const priceData = payload.find((p: any) => p.dataKey === 'price');
      const volumeData = payload.find((p: any) => p.dataKey === 'volume');
      
      // Calculate change from first day
      const firstPrice = chartData[0]?.price || 0;
      const currentPrice = priceData?.value || 0;
      const change = currentPrice - firstPrice;
      const changePercent = firstPrice ? ((change / firstPrice) * 100).toFixed(2) : '0.00';
      
      return (
        <div className={`p-3 border rounded-lg shadow-xl ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {label}
          </p>
          
          {priceData && (
            <div className="mb-2">
              <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'} font-semibold`}>
                Price: ₹{priceData.value.toLocaleString('en-IN')}
              </p>
              <p className={`text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent}%)
              </p>
            </div>
          )}
          
          {volumeData && (
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Volume: {formatVolume(volumeData.value)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Loading State
  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading {currentSymbol} chart...
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center text-red-500">
          <div className="text-3xl mb-2">⚠️</div>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // No Data State
  if (chartData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="text-3xl mb-2">📊</div>
          <p>No chart data available</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const latestPrice = chartData[chartData.length - 1]?.price || 0;
  const firstPrice = chartData[0]?.price || 0;
  const priceChange = latestPrice - firstPrice;
  const percentChange = firstPrice ? ((priceChange / firstPrice) * 100).toFixed(2) : '0.00';
  const isPositive = priceChange >= 0;

  // Calculate price domain for better visualization
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices) * 0.995;
  const maxPrice = Math.max(...prices) * 1.005;

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {currentSymbol}
          </h2>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            Price & Volume - Last 30 Days
          </p>
        </div>
        <div className="text-left sm:text-right">
          <h2 className={`text-2xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            ₹{latestPrice.toLocaleString('en-IN')}
          </h2>
          <p className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({percentChange}%)
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={chartData} 
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            {/* Gradient for Price Area */}
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={gridColor} 
              vertical={false} 
            />
            
            <XAxis 
              dataKey="time" 
              stroke={textColor} 
              tick={{ fontSize: 10 }} 
              minTickGap={20}
            />
            
            {/* LEFT AXIS: PRICE */}
            <YAxis 
              yAxisId="left" 
              domain={[minPrice, maxPrice]} 
              stroke={textColor} 
              tick={{ fontSize: 11 }} 
              tickFormatter={(val) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              width={65}
            />
            
            {/* RIGHT AXIS: VOLUME */}
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#82ca9d" 
              tick={{ fontSize: 10 }}
              tickFormatter={formatVolume}
              width={50}
            />

            <Tooltip content={<CustomTooltip />} />
            
            <Legend 
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="square"
            />

            {/* VOLUME BARS (Right Axis) */}
            <Bar 
              yAxisId="right" 
              dataKey="volume" 
              name="Volume" 
              fill={isDark ? "#374151" : "#d1d5db"} 
              barSize={8}
              radius={[2, 2, 0, 0]}
              opacity={0.6}
            />

            {/* PRICE AREA (Left Axis) */}
            <Area 
              yAxisId="left" 
              type="monotone" 
              dataKey="price" 
              name="Price" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorPrice)" 
              strokeWidth={2.5}
            />

          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className={`mt-3 text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'} text-center`}>
        📊 Historical data from yfinance • Volume shown as bars • Hover for details
      </div>
    </div>
  );
};

export default memo(PriceChart);