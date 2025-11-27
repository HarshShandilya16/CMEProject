// frontend/src/components/charts/PriceChart.tsx
import React, { useState, useEffect, memo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  Brush,
  ReferenceLine,
} from 'recharts';

interface ChartData {
  time: string;
  price: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

type Period = 'intraday' | '10d' | '30d';

const PriceChart: React.FC = () => {
  const { currentSymbol, theme } = useAppStore();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30d');

  const isDark = theme === 'dark';
  const textColor = isDark ? '#9ca3af' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e5e5';
  const axisFill = isDark ? '#d1d5db' : '#374151';

  // 🎨 BINANCE PRO COLOR PALETTE
  const binanceColors = {
    upCandle: '#0ECB81',      // Vibrant Green
    downCandle: '#F6465D',    // Vibrant Red
    trendLine: '#F0B90B',     // Bright Yellow
    grid: '#333',             // Subtle grid
    axisText: '#888',         // Dull grey
    brushFill: '#1a1a2e',     // Dark brush fill
    brushStroke: '#F0B90B',   // Yellow brush stroke
    tooltipBg: '#1E2329',
    tooltipBorder: '#333',
    volumeUp: 'rgba(14, 203, 129, 0.2)',
    volumeDown: 'rgba(246, 70, 93, 0.2)',
  };

  useEffect(() => {
    console.log('📈 PriceChart: Fetching data for', currentSymbol, selectedPeriod);

    const fetchChartData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/v1/historical-price/${currentSymbol}?period=${selectedPeriod}`
        );
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
  }, [currentSymbol, selectedPeriod]);

  const formatVolume = (num: number) => {
    if (num >= 10000000) return (num / 10000000).toFixed(1) + 'Cr';
    if (num >= 100000) return (num / 100000).toFixed(1) + 'L';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // 🎨 BINANCE-STYLE TOOLTIP
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const ohlcData = payload[0]?.payload;
      const maLineData = payload.find((p: any) => p.dataKey === 'closeMA');
      const volumeData = payload.find((p: any) => p.dataKey === 'volume');
      
      const tooltipStyle = selectedPeriod === 'intraday' 
        ? {
            backgroundColor: binanceColors.tooltipBg,
            border: `1px solid ${binanceColors.tooltipBorder}`,
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }
        : {};
      
      // Original tooltip for non-intraday
      if (selectedPeriod !== 'intraday') {
        const priceData = payload.find((p: any) => p.dataKey === 'price');
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
            <div className="mb-2">
              <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'} font-semibold`}>
                Price: ₹{priceData?.value.toLocaleString('en-IN')}
              </p>
              <p className={`text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent}%)
              </p>
            </div>
            {volumeData && (
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Volume: {formatVolume(volumeData.value)}
              </p>
            )}
          </div>
        );
      }
      
      // Binance-style tooltip for intraday
      return (
        <div style={tooltipStyle}>
          <p className="text-white text-sm font-bold mb-3">{label}</p>
          
          {ohlcData && (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: binanceColors.axisText }}>O</span>
                  <span className="text-xs text-white ml-2">
                    {ohlcData.open?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: binanceColors.axisText }}>H</span>
                  <span className="text-xs ml-2" style={{ color: binanceColors.upCandle }}>
                    {ohlcData.high?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: binanceColors.axisText }}>L</span>
                  <span className="text-xs ml-2" style={{ color: binanceColors.downCandle }}>
                    {ohlcData.low?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: binanceColors.axisText }}>C</span>
                  <span className="text-xs text-white ml-2 font-bold">
                    {ohlcData.close?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              
              {maLineData && (
                <div className="flex justify-between pt-2 border-t" style={{ borderColor: binanceColors.tooltipBorder }}>
                  <span className="text-xs" style={{ color: binanceColors.axisText }}>MA(5)</span>
                  <span className="text-xs font-bold" style={{ color: binanceColors.trendLine }}>
                    {maLineData.value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              
              {volumeData && (
                <div className="flex justify-between pt-2 border-t mt-2" style={{ borderColor: binanceColors.tooltipBorder }}>
                  <span className="text-xs" style={{ color: binanceColors.axisText }}>Vol</span>
                  <span className="text-xs text-white">
                    {formatVolume(volumeData.value)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      );
    }
    return null;
  };

  // 🕯️ PROFESSIONAL CANDLESTICK RENDERER
  const CandlestickBar = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!payload || payload.open == null || payload.close == null || 
        payload.high == null || payload.low == null) return null;

    const isPositive = payload.close >= payload.open;
    const color = selectedPeriod === 'intraday' 
      ? (isPositive ? binanceColors.upCandle : binanceColors.downCandle)
      : (isPositive ? '#10b981' : '#ef4444');
    
    // Wider candles for better visibility
    const candleWidth = selectedPeriod === 'intraday' 
      ? Math.min(width * 0.8, 20)  // Max 20px width
      : Math.max(width * 0.6, 3);
    
    const centerX = x + width / 2;
    
    // Calculate Y positions
    const priceRange = payload.high - payload.low || 1;
    const pixelsPerUnit = height / priceRange;
    
    const highY = y;
    const lowY = y + height;
    const openY = y + ((payload.high - payload.open) * pixelsPerUnit);
    const closeY = y + ((payload.high - payload.close) * pixelsPerUnit);
    
    const bodyTop = Math.min(openY, closeY);
    const bodyBottom = Math.max(openY, closeY);
    const bodyHeight = Math.max(bodyBottom - bodyTop, 0.5);

    return (
      <g>
        {/* Upper Wick */}
        <line
          x1={centerX}
          y1={highY}
          x2={centerX}
          y2={bodyTop}
          stroke={color}
          strokeWidth={selectedPeriod === 'intraday' ? 2 : 1}
          strokeLinecap="round"
        />
        
        {/* Lower Wick */}
        <line
          x1={centerX}
          y1={bodyBottom}
          x2={centerX}
          y2={lowY}
          stroke={color}
          strokeWidth={selectedPeriod === 'intraday' ? 2 : 1}
          strokeLinecap="round"
        />
        
        {/* Candle Body */}
        <rect
          x={centerX - candleWidth / 2}
          y={bodyTop}
          width={candleWidth}
          height={bodyHeight}
          fill={isPositive ? color : color}
          stroke={color}
          strokeWidth={1}
          rx={selectedPeriod === 'intraday' ? 1 : 0}
        />
      </g>
    );
  };

  // Process data with MA calculation
  const processedChartData = React.useMemo(() => {
    if (selectedPeriod !== 'intraday') return chartData;
    
    return chartData.map((item, index) => {
      let maValue = item.close;
      if (index >= 4 && item.close != null) {
        let sum = 0;
        let count = 0;
        for (let i = 0; i <= 4; i++) {
          const val = chartData[index - i]?.close;
          if (val != null) {
            sum += val;
            count++;
          }
        }
        maValue = count > 0 ? sum / count : item.close;
      }
      return {
        ...item,
        closeMA: maValue,
        // Add min/max for proper domain calculation
        dataMin: Math.min(item.low || item.price, item.open || item.price),
        dataMax: Math.max(item.high || item.price, item.close || item.price),
      };
    });
  }, [chartData, selectedPeriod]);

  if (loading) {
    return (
      <div className="h-[480px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading {currentSymbol} chart...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[480px] flex items-center justify-center">
        <div className="text-center text-red-500">
          <div className="text-3xl mb-2">⚠️</div>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[480px] flex items-center justify-center">
        <div className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="text-3xl mb-2">📊</div>
          <p>No chart data available</p>
        </div>
      </div>
    );
  }

  const latestPrice = chartData[chartData.length - 1]?.close || chartData[chartData.length - 1]?.price || 0;
  const firstPrice = chartData[0]?.close || chartData[0]?.price || 0;
  const priceChange = latestPrice - firstPrice;
  const percentChange = firstPrice ? ((priceChange / firstPrice) * 100).toFixed(2) : '0.00';
  const isPositive = priceChange >= 0;

  // Calculate domain for auto-scaling (intraday only)
  const getYDomain = () => {
    if (selectedPeriod !== 'intraday') {
      const prices = chartData.map(d => d.price);
      return [Math.min(...prices) * 0.995, Math.max(...prices) * 1.005];
    }
    return ['dataMin', 'dataMax'];  // Auto-scale for intraday
  };

  const periodLabels = {
    intraday: 'Intraday (10m)',
    '10d': 'Last 10 Days',
    '30d': 'Last 30 Days'
  };

  return (
    <div className="h-full">
      {/* Period Selection Buttons */}
      <div className="flex gap-2 mb-4">
        {(['intraday', '10d', '30d'] as Period[]).map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              selectedPeriod === period
                ? period === 'intraday' 
                  ? `bg-[${binanceColors.trendLine}] text-black shadow-lg`
                  : 'bg-blue-500 text-white shadow-lg'
                : isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            style={selectedPeriod === period && period === 'intraday' ? {
              backgroundColor: binanceColors.trendLine,
              color: '#000'
            } : undefined}
          >
            {period === 'intraday' ? 'Intraday' : period.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {currentSymbol}
          </h2>
          <p className={`text-xs ${
            selectedPeriod === 'intraday' ? 'text-gray-500' : isDark ? 'text-gray-500' : 'text-gray-600'
          }`}>
            {periodLabels[selectedPeriod]}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <h2 className={`text-2xl font-bold`} 
               style={{ color: isPositive ? binanceColors.upCandle : binanceColors.downCandle }}>
            ₹{latestPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h2>
          <p className={`text-sm`}
             style={{ color: isPositive ? binanceColors.upCandle : binanceColors.downCandle }}>
            {isPositive ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)} ({percentChange}%)
          </p>
        </div>
      </div>

      <div className={selectedPeriod === 'intraday' ? "h-[550px] w-full" : "h-[480px] w-full"}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={processedChartData} 
            margin={{ top: 10, right: 10, left: 0, bottom: selectedPeriod === 'intraday' ? 80 : 5 }}
            barCategoryGap={selectedPeriod === 'intraday' ? 2 : 10}
            barGap={0}
          >
            {/* 🌟 SVG DEFINITIONS FOR EFFECTS */}
            <defs>
              {/* Gradient for area chart */}
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              
              {/* 💫 NEON GLOW EFFECT FOR MA LINE */}
              {selectedPeriod === 'intraday' && (
                <filter id="neonGlow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feOffset dx="0" dy="0" result="offsetBlur"/>
                  <feFlood floodColor={binanceColors.trendLine} floodOpacity="0.5"/>
                  <feComposite in2="offsetBlur" operator="in" result="coloredShadow"/>
                  <feMerge>
                    <feMergeNode in="coloredShadow"/>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              )}
            </defs>
            
            {/* 📊 SUBTLE GRID */}
            <CartesianGrid 
              strokeDasharray={selectedPeriod === 'intraday' ? "3 3" : "3 3"}
              stroke={selectedPeriod === 'intraday' ? binanceColors.grid : gridColor}
              vertical={false}  // No vertical grid lines
              opacity={selectedPeriod === 'intraday' ? 0.5 : 1}
            />
            
            {/* 📏 CLEAN X-AXIS */}
            <XAxis 
              dataKey="time" 
              stroke={selectedPeriod === 'intraday' ? binanceColors.axisText : textColor}
              tick={{ 
                fontSize: 11,
                fill: selectedPeriod === 'intraday' ? binanceColors.axisText : textColor
              }}
              axisLine={selectedPeriod === 'intraday' ? false : true}
              tickLine={false}
              minTickGap={10}
            />
            
            {/* 📈 AUTO-SCALING Y-AXIS */}
            <YAxis 
              yAxisId="left" 
              domain={getYDomain()}
              stroke={selectedPeriod === 'intraday' ? binanceColors.axisText : textColor}
              tick={{ 
                fontSize: 11,
                fill: selectedPeriod === 'intraday' ? binanceColors.axisText : textColor
              }}
              axisLine={selectedPeriod === 'intraday' ? false : true}
              tickLine={false}
              tickFormatter={(val) => typeof val === 'number' ? `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : val}
              width={80}
            />
            
            {/* 📊 VOLUME Y-AXIS */}
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke={selectedPeriod === 'intraday' ? binanceColors.axisText : '#82ca9d'}
              tick={{ 
                fontSize: 10,
                fill: selectedPeriod === 'intraday' ? binanceColors.axisText : '#82ca9d'
              }}
              axisLine={selectedPeriod === 'intraday' ? false : true}
              tickLine={false}
              tickFormatter={formatVolume}
              width={55}
            />

            <Tooltip 
              content={<CustomTooltip />}
              cursor={selectedPeriod === 'intraday' ? {
                fill: 'rgba(255, 255, 255, 0.02)',
                strokeWidth: 0,
              } : undefined}
              wrapperStyle={{ zIndex: 1000 }}
            />
            
            {selectedPeriod !== 'intraday' && (
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconType="square"
              />
            )}

            {/* 📊 LAYER 1: VOLUME BARS (BACKGROUND) */}
            <Bar 
              yAxisId="right" 
              dataKey="volume" 
              name="Volume" 
              fill={isDark ? "#374151" : "#d1d5db"}
              barSize={selectedPeriod === 'intraday' ? 15 : 8}
              radius={[2, 2, 0, 0]}
              opacity={selectedPeriod === 'intraday' ? 1 : 0.6}
            >
              {selectedPeriod === 'intraday' && processedChartData.map((entry, index) => {
                const isUp = entry.close && entry.open ? entry.close >= entry.open : false;
                return (
                  <Cell 
                    key={`volume-${index}`} 
                    fill={isUp ? binanceColors.volumeUp : binanceColors.volumeDown}
                  />
                );
              })}
            </Bar>

            {/* CONDITIONAL CHART RENDERING */}
            {selectedPeriod === 'intraday' ? (
              <>
                {/* 🕯️ LAYER 2: CANDLESTICKS */}
                <Bar
                  yAxisId="left"
                  dataKey="high"
                  name="Price"
                  shape={CandlestickBar as any}
                  isAnimationActive={false}
                />
                
                {/* ✨ LAYER 3: NEON MA LINE */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="closeMA"
                  name="MA(5)"
                  stroke={binanceColors.trendLine}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ 
                    r: 6,
                    fill: binanceColors.trendLine,
                    stroke: '#000',
                    strokeWidth: 2
                  }}
                  filter="url(#neonGlow)"  // Apply neon glow
                  isAnimationActive={false}
                />
              </>
            ) : (
              // Original area chart for 10d and 30d
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
            )}
            
            {/* 🎛️ ZOOM & PAN BRUSH (INTRADAY ONLY) */}
            {selectedPeriod === 'intraday' && (
              <Brush
                dataKey="time"
                height={40}
                stroke={binanceColors.brushStroke}
                fill={binanceColors.brushFill}
                travellerWidth={10}
                startIndex={Math.max(0, processedChartData.length - 30)}
                endIndex={processedChartData.length - 1}
              >
                <ComposedChart>
                  <Line 
                    dataKey="close" 
                    stroke={binanceColors.trendLine}
                    strokeWidth={1}
                    dot={false}
                  />
                  <Bar 
                    dataKey="volume" 
                    fill={binanceColors.axisText}
                    opacity={0.3}
                  />
                </ComposedChart>
              </Brush>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className={`mt-3 text-xs ${
        selectedPeriod === 'intraday' ? 'text-gray-600' : isDark ? 'text-gray-500' : 'text-gray-600'
      } text-center`}>
        {selectedPeriod === 'intraday' ? (
          <span>
            🎯 Auto-scaling • 🎚️ Drag the slider to zoom/pan • ✨ MA(5) with neon glow
          </span>
        ) : (
          <span>
            📊 Historical data from yfinance • Volume shown as bars • Hover for details
          </span>
        )}
      </div>
    </div>
  );
};

export default memo(PriceChart);