// frontend/src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AnimatedWidget } from '../components/animation/AnimatedWidget';
import SymbolSelector from '../components/SymbolSelector';

// Import ALL Widgets
import PriceChart from '../components/charts/PriceChart';
import { MarketSentimentWidget } from '../components/widgets/MarketSentimentWidget';
import { MaxPainWidget } from '../components/widgets/MaxPainWidget';
import { IVvsRVWidget } from '../components/widgets/IVvsRVWidget';
import { OpenInterestWidget } from '../components/widgets/OpenInterestWidget';
import NewsPanel from '../components/NewsPanel';
import { GraphicalOptionChain } from '../components/charts/GraphicalOptionChain';
import { SocialBuzzWidget } from '../components/SocialBuzzWidget';
import { AlertsWidget } from '../components/widgets/AlertsWidget';

// Import API Services for Analytics
import {
  getOptionChain,
  getSentiment,
  getVolatilitySpread,
  type SentimentResponse,
} from '../services/apiService';
import type { OptionChainData } from '../data/types';

// Import Recharts for Analytics
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const getThemeClasses = (theme: 'light' | 'dark') => ({
  bg: theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100',
  textPrimary: theme === 'dark' ? 'text-white' : 'text-gray-900',
});

const Dashboard: React.FC = () => {
  const { currentSymbol, theme } = useAppStore();
  const classes = getThemeClasses(theme);

  const cardClass =
    theme === 'dark'
      ? 'bg-gray-800 border border-gray-700'
      : 'bg-white border border-gray-200';

  // --- ANALYTICS STATE ---
  const [chain, setChain] = useState<OptionChainData | null>(null);
  const [sentiment, setSentiment] = useState<SentimentResponse | null>(null);
  const [vol, setVol] = useState<{
    implied_volatility: number;
    realized_volatility: number;
  } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // --- FETCH ANALYTICS DATA ---
  useEffect(() => {
    let mounted = true;
    setLoadingAnalytics(true);

    Promise.all([
      getOptionChain(currentSymbol),
      getSentiment(currentSymbol),
      getVolatilitySpread(currentSymbol),
    ])
      .then(([c, s, v]) => {
        if (!mounted) return;
        setChain(c);
        setSentiment(s);
        setVol({
          implied_volatility: v.implied_volatility,
          realized_volatility: v.realized_volatility,
        });
      })
      .finally(() => {
        if (mounted) setLoadingAnalytics(false);
      });

    return () => {
      mounted = false;
    };
  }, [currentSymbol]);

  // --- ANALYTICS DATA PROCESSING ---

  // Volume vs OI
  const volVsOi = useMemo(() => {
    if (!chain || !chain.legs) return [];
    const byStrike: Record<string, { volume: number; oi: number }> = {};

    for (const leg of chain.legs) {
      const k = String(leg.strike);
      if (!byStrike[k]) byStrike[k] = { volume: 0, oi: 0 };
      byStrike[k].volume += leg.volume || 0;
      byStrike[k].oi += leg.oi || 0;
    }

    return Object.entries(byStrike)
      .map(([strike, v]) => ({
        strike: Number(strike),
        volume: v.volume,
        oi: v.oi,
      }))
      .sort((a, b) => a.strike - b.strike);
  }, [chain]);

  // OI Change Series
  const changeOiSeries = useMemo(() => {
    if (!chain || !chain.legs) return [];
    const map: Record<string, { ce: number; pe: number }> = {};

    for (const leg of chain.legs) {
      const k = String(leg.strike);
      if (!map[k]) map[k] = { ce: 0, pe: 0 };
      if (leg.type === 'CE') map[k].ce += leg.oi_change || 0;
      if (leg.type === 'PE') map[k].pe += leg.oi_change || 0;
    }

    return Object.entries(map)
      .map(([strike, v]) => ({
        strike: Number(strike),
        ce: v.ce,
        pe: v.pe,
      }))
      .sort((a, b) => a.strike - b.strike);
  }, [chain]);

  // OI Change Summary
  const oiChangeSummary = useMemo(() => {
    if (!changeOiSeries.length) return [];

    const ceTotal = changeOiSeries.reduce((acc, row) => acc + row.ce, 0);
    const peTotal = changeOiSeries.reduce((acc, row) => acc + row.pe, 0);

    return [
      { name: 'Calls ΔOI', value: ceTotal },
      { name: 'Puts ΔOI', value: peTotal },
    ];
  }, [changeOiSeries]);

  // Top Volume Strikes
  const topVolumeStrikes = useMemo(() => {
    if (!volVsOi.length) return [];

    const sorted = [...volVsOi].sort((a, b) => b.volume - a.volume);
    return sorted.slice(0, 5).map((row) => ({
      strike: row.strike,
      volume: row.volume,
    }));
  }, [volVsOi]);
  // --- INTERPRETATIONS (AI Insights) ---
// --- INTERPRETATIONS (AI Insights) ---
const interpretations = useMemo(() => {
  const pcr = sentiment?.pcr ?? 0;
  const avgVol = volVsOi.length
    ? volVsOi.reduce((a, b) => a + b.volume, 0) / volVsOi.length
    : 0;

  const avgOiChange = changeOiSeries.length
    ? changeOiSeries.reduce((a, b) => a + (b.ce + b.pe), 0) / changeOiSeries.length
    : 0;

  // 1. Volume Analysis
  const volumeWhy =
    avgVol > 0
      ? 'Volume is rising near popular strikes; liquidity and trader activity are clustering around key levels.'
      : 'Low traded volume indicates indecision or off-peak session.';

  // 2. OI Analysis
  const oiWhy =
    avgOiChange < 0
      ? 'OI is dropping, indicating short-covering or profit booking by writers.'
      : 'OI is building up, signaling fresh positions adding to an ongoing trend.';

  // 3. Market Bias
  let bias = 'Neutral';
  if (pcr > 1.0) bias = 'Bearish';
  else if (pcr < 0.7) bias = 'Bullish';

  // 4. Key Support/Resistance (Max OI Strikes)
  const maxOiStrike = volVsOi.length
    ? volVsOi.reduce((max, item) => (item.oi > max.oi ? item : max), volVsOi[0])
    : null;
  
  const supportResistance = maxOiStrike
    ? `Strike ${maxOiStrike.strike} has the highest OI (${maxOiStrike.oi.toLocaleString()}), acting as a major support/resistance level where price may consolidate.`
    : 'Analyzing key levels...';

  // 5. IV-RV Spread Analysis
  const ivRvSpread = vol 
    ? vol.implied_volatility - vol.realized_volatility 
    : 0;
  
  const volatilitySignal =
    ivRvSpread > 5
      ? `Options are expensive (IV ${vol?.implied_volatility.toFixed(1)}% > RV ${vol?.realized_volatility.toFixed(1)}%). Consider selling premium.`
      : ivRvSpread < -5
      ? `Options are cheap (IV ${vol?.implied_volatility.toFixed(1)}% < RV ${vol?.realized_volatility.toFixed(1)}%). Consider buying protection.`
      : `IV-RV spread is balanced at ${Math.abs(ivRvSpread).toFixed(1)}%. Fair pricing for options.`;

  // 6. Institutional Activity
  const topOiStrikes = [...volVsOi]
    .sort((a, b) => b.oi - a.oi)
    .slice(0, 3)
    .map(s => s.strike);
  
  const institutionalActivity =
    topOiStrikes.length > 0
      ? `Smart money is concentrated at ${topOiStrikes.slice(0, 2).join(', ')} strikes. These are key institutional levels.`
      : 'Analyzing institutional positioning...';

  // 7. Momentum Analysis (OI Change)
  const netCallOI = changeOiSeries.reduce((sum, s) => sum + s.ce, 0);
  const netPutOI = changeOiSeries.reduce((sum, s) => sum + s.pe, 0);
  
  const momentumSignal =
    netCallOI > netPutOI * 1.2
      ? `Call writers adding ${((netCallOI / netPutOI - 1) * 100).toFixed(0)}% more positions than puts. Bearish signal if near resistance.`
      : netPutOI > netCallOI * 1.2
      ? `Put writers adding ${((netPutOI / netCallOI - 1) * 100).toFixed(0)}% more positions. Bullish signal if near support.`
      : 'Balanced call-put writing activity. Market in equilibrium.';

  // 8. Trading Action
  const topVolumeStrike = volVsOi.length
    ? volVsOi.reduce((max, item) => (item.volume > max.volume ? item : max), volVsOi[0])
    : null;
  
  const tradingAction = topVolumeStrike
    ? `Strike ${topVolumeStrike.strike} is seeing highest volume (${topVolumeStrike.volume.toLocaleString()}). Active intraday trading zone.`
    : 'Analyzing trading activity...';

  return { 
    volumeWhy, 
    oiWhy, 
    bias, 
    pcr,
    supportResistance,
    volatilitySignal,
    institutionalActivity,
    momentumSignal,
    tradingAction,
    ivRvSpread
  };
}, [sentiment, volVsOi, changeOiSeries, vol]);

  // --- MAIN RENDER ---
  return (
    <div className={`w-full min-h-screen p-4 md:p-6 ${classes.bg}`}>
      
      {/* ========== HEADER ========== */}
      <AnimatedWidget delay={0}>
        <div className={`${cardClass} rounded-xl shadow-lg p-4 md:p-6 mb-6`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className={`text-2xl md:text-3xl font-bold ${classes.textPrimary}`}>
                {currentSymbol} Command Center
              </h1>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                Real-time market intelligence and analytics
              </p>
            </div>
            <div className="w-full lg:w-auto">
              <SymbolSelector />
            </div>
          </div>
        </div>
      </AnimatedWidget>

      {/* ========== MAIN GRID ========== */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

{/* ========== LEFT COLUMN: MAIN CHARTS ========== */}
<div className="lg:col-span-8 flex flex-col gap-10 pl-8">
  
  {/* 1. Price Chart */}
  <AnimatedWidget delay={0.1}>
    <PriceChart />
  </AnimatedWidget>

  {/* 2. Graphical Option Chain */}
  <AnimatedWidget delay={0.2}>
    <GraphicalOptionChain />
  </AnimatedWidget>

</div>

{/* ========== RIGHT COLUMN: METRICS & INSIGHTS ========== */}
<div className="lg:col-span-4 flex flex-col gap-5">
  
  <AnimatedWidget delay={0.3}>
    <MarketSentimentWidget />
  </AnimatedWidget>

  <AnimatedWidget delay={0.4}>
    <IVvsRVWidget />
  </AnimatedWidget>

  <AnimatedWidget delay={0.5}>
    <MaxPainWidget />
  </AnimatedWidget>
  
  {/* AI INSIGHTS - ENHANCED */}
<AnimatedWidget delay={0.6}>
  <div className={`${cardClass} rounded-xl shadow-lg p-4 flex flex-col`}>
    <div className="flex items-center justify-between mb-3">
      <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
        AI Insights
      </h3>
      <span className={`text-xs px-2 py-1 rounded ${theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
        Live
      </span>
    </div>
    
    {/* Main Insight from Sentiment API */}
    <div className="mb-3">
      <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
        {sentiment?.detailed_insight || 'Loading market analysis...'}
      </p>
    </div>

    {/* Divider */}
    <div className={`border-t my-2 ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}></div>

    {/* Q&A Style Insights - Scrollable */}
    <div className="space-y-2 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
      
      {/* 1. Volume Analysis */}
      <div className={`rounded-lg p-2.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
          Why is volume increasing?
        </div>
        <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {interpretations.volumeWhy}
        </p>
      </div>

      {/* 2. OI Analysis */}
      <div className={`rounded-lg p-2.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
          Why is OI changing?
        </div>
        <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {interpretations.oiWhy}
        </p>
      </div>

      {/* 3. Market Bias */}
      <div className={`rounded-lg p-2.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
          Is market becoming bullish/bearish?
        </div>
        <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Based on PCR <span className="font-bold">{interpretations.pcr?.toFixed(2)}</span>, 
          market bias looks <span className={`font-bold ${
            interpretations.bias === 'Bullish' ? 'text-green-500' :
            interpretations.bias === 'Bearish' ? 'text-red-500' :
            'text-yellow-500'
          }`}>{interpretations.bias}</span>.
        </p>
      </div>

      {/* 4. Support/Resistance Levels */}
      <div className={`rounded-lg p-2.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
          Where are key support/resistance levels?
        </div>
        <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {interpretations.supportResistance}
        </p>
      </div>

      {/* 5. IV-RV Spread */}
      <div className={`rounded-lg p-2.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
          Are options expensive or cheap?
        </div>
        <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {interpretations.volatilitySignal}
        </p>
      </div>

      {/* 6. Institutional Activity */}
      <div className={`rounded-lg p-2.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
          Where are institutions positioning?
        </div>
        <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {interpretations.institutionalActivity}
        </p>
      </div>

      {/* 7. Momentum Signal */}
      <div className={`rounded-lg p-2.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-pink-400' : 'text-pink-600'}`}>
          What's the momentum telling us?
        </div>
        <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {interpretations.momentumSignal}
        </p>
      </div>

      {/* 8. Trading Action */}
      <div className={`rounded-lg p-2.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
          Where is the trading action?
        </div>
        <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {interpretations.tradingAction}
        </p>
      </div>

    </div>
  </div>
</AnimatedWidget>

</div>

{/* Rest of your dashboard continues... */}

  {/* ========== ROW 2: OPEN INTEREST (FULL WIDTH OR SPLIT) ========== */}
  <div className="lg:col-span-8">
    <AnimatedWidget delay={0.7}>
      <OpenInterestWidget />
    </AnimatedWidget>
  </div>

  {/* Continue with Advanced Analytics section... */}
        {/* ========== ROW 3: ADVANCED ANALYTICS ========== */}
        
        <div className="lg:col-span-12">
          <AnimatedWidget delay={0.7}>
            <div className={`${cardClass} rounded-xl shadow-lg p-4 md:p-6`}>
              
              {/* Section Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className={`text-xl md:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Advanced Analytics
                  </h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                    Deep dive into {currentSymbol} option chain metrics
                  </p>
                </div>
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  Expiry: {chain?.expiryDate || '-'}
                </span>
              </div>

              {loadingAnalytics ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      Loading analytics...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  
                  {/* LEFT COLUMN - Large Charts */}
                  <div className="xl:col-span-2 space-y-6">
                    
                    {/* Volume vs Open Interest */}
                    <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <h3 className={`mb-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        Volume vs Open Interest
                      </h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={volVsOi} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                            <XAxis 
                              dataKey="strike" 
                              stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} 
                              tick={{ fontSize: 10 }}
                              angle={-45}
                              textAnchor='end'
                              height={60}
                              label={{ 
                                value: 'Strike Price', 
                                position: 'insideBottom', 
                                offset: 5,
                                fill: theme === 'dark' ? '#d1d5db' : '#374151'
                              }}
                            />
                            <YAxis 
                              stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} 
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                                border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                borderRadius: '8px',
                                color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
                              }}
                            />
                            <Legend />
                            <Bar dataKey="volume" fill="#60a5fa" name="Volume" />
                            <Bar dataKey="oi" fill="#34d399" name="Open Interest" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Strikes vs Change in OI */}
                    <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <h3 className={`mb-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        Strikes vs Change in OI (Momentum)
                      </h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={changeOiSeries} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                            <XAxis 
                              dataKey="strike" 
                              stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} 
                              tick={{ fontSize: 11 }}
                              angle={-45}
                              textAnchor='end'
                              height={60}
                              label={{ 
                                value: 'Strike Price', 
                                position: 'insideBottom', 
                                offset: 0,
                                fill: theme === 'dark' ? '#d1d5db' : '#374151'
                              }}
                            />
                            <YAxis 
                              stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} 
                              tick={{ fontSize: 11 }}
                              label={{ 
                                value: 'OI Change', 
                                angle: -90, 
                                position: 'insideLeft',
                                fill: theme === 'dark' ? '#d1d5db' : '#374151'
                              }}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                                border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                borderRadius: '8px',
                                color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
                              }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="ce" stroke="#f59e0b" strokeWidth={2} dot={false} name="Call ΔOI" />
                            <Line type="monotone" dataKey="pe" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Put ΔOI" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN - Summary Charts */}
                  <div className="space-y-6">
                    
                    {/* Net OI Change Summary */}
                    <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <h3 className={`mb-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        Net OI Change
                      </h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={oiChangeSummary} 
                            layout="vertical" 
                            margin={{ top: 10, right: 20, left: 60, bottom: 10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                            <XAxis type="number" stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} 
                              tick={{ fontSize: 11 }}
                              width={100}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                                border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                borderRadius: '8px',
                                color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
                              }}
                            />
                            <Bar dataKey="value" fill="#818cf8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Top Volume Strikes */}
                    <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <h3 className={`mb-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        Top 5 Volume Strikes
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topVolumeStrikes} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                            <XAxis 
                              dataKey="strike" 
                              stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} 
                              tick={{ fontSize: 11 }}
                              label={{ 
                                value: 'Strike', 
                                position: 'insideBottom', 
                                offset: -15,
                                fill: theme === 'dark' ? '#d1d5db' : '#374151'
                              }}
                            />
                            <YAxis 
                              stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} 
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                                border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                borderRadius: '8px',
                                color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
                              }}
                            />
                            <Bar dataKey="volume" fill="#34d399" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* PCR & IV-RV Metrics */}
                    <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <h3 className={`mb-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        Key Metrics
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Put-Call Ratio (PCR)
                          </div>
                          <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {sentiment?.pcr?.toFixed(2) ?? '-'}
                          </div>
                        </div>
                        <div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Implied Volatility
                          </div>
                          <div className={`text-xl font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                            {vol?.implied_volatility?.toFixed(2) ?? '-'}%
                          </div>
                        </div>
                        <div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Realized Volatility
                          </div>
                          <div className={`text-xl font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                            {vol?.realized_volatility?.toFixed(2) ?? '-'}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AnimatedWidget>
        </div>

        {/* ========== ROW 4: NEWS & SOCIAL ========== */}
        
        {/* News Panel - Left (6 cols) */}
        <div className="lg:col-span-6">
          <AnimatedWidget delay={0.8}>
            <NewsPanel />
          </AnimatedWidget>
        </div>

        {/* Social Buzz Widget - Right (6 cols) */}
        <div className="lg:col-span-6">
          <AnimatedWidget delay={0.9}>
            <SocialBuzzWidget symbol={currentSymbol} />
          </AnimatedWidget>
        </div>

        {/* Alerts Widget - Full Width (Compact) */}
        <div className="lg:col-span-12 mt-4">
          <AnimatedWidget delay={1.0}>
            <AlertsWidget />
          </AnimatedWidget>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;