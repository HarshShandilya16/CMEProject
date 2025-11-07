// src/components/charts/PriceChart.tsx
import { useState, useEffect, memo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface ChartData {
  time: string;
  price: number;
  volume?: number;
}

const PriceChart: React.FC = () => {
  const currentSymbol = useAppStore((state) => state.currentSymbol);
  const theme = useAppStore((state) => state.theme);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // This useEffect now fetches REAL data
  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/v1/historical-price/${currentSymbol}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }
        const result = await res.json();

        if (result.data) {
          setChartData(result.data);
        } else if (result.error) {
          setError(result.error);
          setChartData([]);
        }
      } catch (err: any) {
        console.error("Failed to fetch chart data", err);
        setError(err.message || "An unknown error occurred");
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [currentSymbol]); // Re-fetches when the symbol changes

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      // Use the first price in the current data as the baseline
      const firstPrice = chartData[0]?.price || data.price;
      const change = data.price - firstPrice;
      const changePercent = ((change / firstPrice) * 100).toFixed(2);

      return (
        <div style={{
          backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
          border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#000' }}>
            {data.time}
          </p>
          <p style={{ margin: '4px 0', color: theme === 'dark' ? '#4ade80' : '#16a34a', fontWeight: 500 }}>
            Price: ₹{data.price.toLocaleString('en-IN')}
          </p>
          <p style={{ 
            margin: '4px 0', 
            color: change >= 0 ? '#16a34a' : '#dc2626',
            fontSize: '0.9em'
          }}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent}%)
          </p>
          {data.volume && (
            <p style={{ margin: '4px 0', fontSize: '0.85em', color: theme === 'dark' ? '#999' : '#666' }}>
              Volume: {(data.volume / 10000000).toFixed(2)}Cr
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div style={{ 
        height: '500px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: theme === 'dark' ? '#999' : '#666'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>Loading {currentSymbol} data...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        height: '500px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#dc2626' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.2em', marginBottom: '8px' }}>⚠️ Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const latestPrice = chartData[chartData.length - 1]?.price || 0;
  const firstPrice = chartData[0]?.price || 0;
  const priceChange = latestPrice - firstPrice;
  const percentChange = firstPrice === 0 ? 0 : ((priceChange / firstPrice) * 100);
  const isPositive = priceChange >= 0;

  return (
    <div style={{ padding: '16px' }}>
      {/* Price Info Header */}
      <div style={{ 
        marginBottom: '20px', 
        display: 'flex', 
        alignItems: 'baseline',
        gap: '16px'
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '2em', 
          color: theme === 'dark' ? '#fff' : '#000' 
        }}>
          ₹{latestPrice.toLocaleString('en-IN')}
        </h2>
        <span style={{ 
          fontSize: '1.1em',
          color: isPositive ? '#16a34a' : '#dc2626',
          fontWeight: 600
        }}>
          {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({percentChange.toFixed(2)}%)
        </span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? "#16a34a" : "#dc2626"} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={isPositive ? "#16a34a" : "#dc2626"} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={theme === 'dark' ? '#333' : '#e5e5e5'}
            vertical={false}
          />
          <XAxis 
            dataKey="time" 
            stroke={theme === 'dark' ? '#666' : '#999'}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            stroke={theme === 'dark' ? '#666' : '#999'}
            tick={{ fontSize: 12 }}
            domain={['auto', 'auto']}
            tickFormatter={(value) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={isPositive ? "#16a34a" : "#dc2626"}
            strokeWidth={2}
            fill="url(#colorPrice)"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Info Footer */}
      <div style={{ 
        marginTop: '16px', 
        padding: '12px',
        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f9fafb',
        borderRadius: '8px',
        fontSize: '0.85em',
        color: theme === 'dark' ? '#999' : '#666'
      }}>
        <p style={{ margin: 0 }}>
          📊 Data shows last 30 days of trading activity.
        </p>
      </div>
    </div>
  );
};

export default memo(PriceChart);
