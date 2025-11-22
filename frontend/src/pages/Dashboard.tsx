
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
import SocialBuzzWidget from '../components/SocialBuzzWidget';
import NewsPanel from '../components/NewsPanel';
import { GraphicalOptionChain } from '../components/charts/GraphicalOptionChain';

import {
  getOptionChain,
  getSentiment,
  getVolatilitySpread,
  type SentimentResponse,
} from '../services/apiService';

import type { OptionChainData } from '../data/types';

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

  const [chain, setChain] = useState<OptionChainData | null>(null);
  const [sentiment, setSentiment] = useState<SentimentResponse | null>(null);
  const [vol, setVol] = useState<{
    implied_volatility: number;
    realized_volatility: number;
  } | null>(null);

  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

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

  const volVsOi = useMemo(() => {
    if (!chain) return [];
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

  const changeOiSeries = useMemo(() => {
    if (!chain) return [];
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

  const oiChangeSummary = useMemo(() => {
    if (!changeOiSeries.length) return [];

    const ceTotal = changeOiSeries.reduce((acc, row) => acc + row.ce, 0);
    const peTotal = changeOiSeries.reduce((acc, row) => acc + row.pe, 0);

    return [
      { name: 'Calls ΔOI', value: ceTotal },
      { name: 'Puts ΔOI', value: peTotal },
    ];
  }, [changeOiSeries]);

  const topVolumeStrikes = useMemo(() => {
    if (!volVsOi.length) return [];

    const sorted = [...volVsOi].sort((a, b) => b.volume - a.volume);
    return sorted.slice(0, 5).map((row) => ({
      strike: row.strike,
      volume: row.volume,
    }));
  }, [volVsOi]);

  const interpretations = useMemo(() => {
    const pcr = sentiment?.pcr ?? 0;
    const avgVol = volVsOi.length
      ? volVsOi.reduce((a, b) => a + b.volume, 0) / volVsOi.length
      : 0;

    const avgOiChange = changeOiSeries.length
      ? changeOiSeries.reduce((a, b) => a + (b.ce + b.pe), 0) /
        changeOiSeries.length
      : 0;

    const volumeWhy =
      avgVol > 0
        ? 'Volume is rising near popular strikes; liquidity and trader activity are clustering around key levels.'
        : 'Low traded volume indicates indecision or off-peak session.';

    const oiWhy =
      avgOiChange < 0
        ? 'OI is dropping, indicating short-covering or profit booking by writers.'
        : 'OI is building up, signaling fresh positions adding to an ongoing trend.';

    let bias = 'Neutral';
    if (pcr > 1.0) bias = 'Bearish';
    else if (pcr < 0.7) bias = 'Bullish';

    return { volumeWhy, oiWhy, bias, pcr };
  }, [sentiment, volVsOi, changeOiSeries]);

  return (
    <div className={`w-full min-h-screen p-4 md:p-6 ${classes.bg}`}>
      {/* Header */}
      <AnimatedWidget delay={0}>
        <div className={`${cardClass} rounded-xl shadow-lg p-4 md:p-6 mb-4`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className={`text-2xl md:text-3xl font-bold ${classes.textPrimary}`}>
                {currentSymbol} Command Center
              </h1>
              <p
                className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                } mt-1`}
              >
                Real-time market intelligence and analytics
              </p>
            </div>

            <div className="w-full lg:w-auto">
              <SymbolSelector />
            </div>
          </div>
        </div>
      </AnimatedWidget>

      {/* GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* PRICE CHART */}
        <div className="lg:col-span-8">
          <AnimatedWidget delay={0.1}>
            <div className={`${cardClass} rounded-xl shadow-lg p-4`}>
              <PriceChart />
            </div>
          </AnimatedWidget>
        </div>

        {/* RIGHT-SIDE WIDGET STACK */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <AnimatedWidget delay={0.2}>
            <MarketSentimentWidget />
          </AnimatedWidget>

          <AnimatedWidget delay={0.3}>
            <IVvsRVWidget />
          </AnimatedWidget>

          <AnimatedWidget delay={0.4}>
            <MaxPainWidget />
          </AnimatedWidget>

          <AnimatedWidget delay={0.45}>
            <OpenInterestWidget />
          </AnimatedWidget>

          {/* RESTORED AI SUMMARY (under Open Interest) */}
          <AnimatedWidget delay={0.47}>
            <div className={`${cardClass} rounded-xl shadow-lg p-4 md:p-5 min-h-[460px] flex flex-col`}>
              <div>
                <h3 className={`mb-1 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  AI Summary
                </h3>
                <p className={theme === 'dark' ? 'text-gray-300 text-sm' : 'text-gray-700 text-sm'}>
                  {sentiment?.detailed_insight || 'No summary available.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 mt-4">
                <div className={`rounded-lg p-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
                  <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Why is volume increasing?
                  </div>
                  <p className={theme === 'dark' ? 'text-gray-300 text-xs' : 'text-gray-700 text-xs'}>
                    {interpretations.volumeWhy}
                  </p>
                </div>

                <div className={`rounded-lg p-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
                  <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Why OI dropping?
                  </div>
                  <p className={theme === 'dark' ? 'text-gray-300 text-xs' : 'text-gray-700 text-xs'}>
                    {interpretations.oiWhy}
                  </p>
                </div>

                <div className={`rounded-lg p-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
                  <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Is market becoming bullish/bearish?
                  </div>
                  <p className={theme === 'dark' ? 'text-gray-300 text-xs' : 'text-gray-700 text-xs'}>
                    Based on PCR {interpretations.pcr?.toFixed(2)}, bias looks {interpretations.bias}.
                  </p>
                </div>
              </div>
            </div>
          </AnimatedWidget>
        </div>

        {/* OPTION CHAIN */}
        <div className="lg:col-span-8">
          <AnimatedWidget delay={0.5}>
            <GraphicalOptionChain />
          </AnimatedWidget>
        </div>

        {/* RIGHT WIDGETS next to Option Chain - keep as spacer to maintain layout */}
        <div className="lg:col-span-4"></div>

        {/* ★ SOCIAL BUZZ — FULL WIDTH (Option C position) */}
        <div className="lg:col-span-12">
          <AnimatedWidget delay={0.55}>
            <SocialBuzzWidget symbol={currentSymbol} />
          </AnimatedWidget>
        </div>

        {/* ANALYTICS SECTION */}
        <div className="lg:col-span-12">
          <AnimatedWidget delay={0.65}>
            <div className={`${cardClass} rounded-xl shadow-lg p-4 md:p-6`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className={`text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  Analytics — {currentSymbol}
                </h2>
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Expiry: {chain?.expiryDate || '-'}
                </span>
              </div>

              {loadingAnalytics ? (
                <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  Loading analytics…
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2 space-y-6">
                    {/* VOLUME VS OI */}
                    <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                      <h3 className={`mb-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        Volume vs Open Interest
                      </h3>
                      <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={volVsOi} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                            <XAxis dataKey="strike" stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} tick={{ fontSize: 11 }} label={{ value: 'Strike Price (₹)', position: 'insideBottom', offset: -10, fill: theme === 'dark' ? '#d1d5db' : '#374151', fontSize: 13, fontWeight: 700 }} />
                            <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} tick={{ fontSize: 11 }} label={{ value: 'Open Interest (OI)', angle: -90, position: 'insideLeft', fill: theme === 'dark' ? '#d1d5db' : '#374151', fontSize: 13, fontWeight: 700 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="volume" fill="#60a5fa" name="Volume (Contracts)" />
                            <Bar dataKey="oi" fill="#34d399" name="Open Interest (OI)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* STRIKES VS ΔOI */}
                    <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                      <h3 className={`mb-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Strikes vs Change in OI</h3>
                      <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={changeOiSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                            <XAxis dataKey="strike" stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} tick={{ fontSize: 11 }} label={{ value: 'Strike Price (₹)', position: 'insideBottom', offset: -10, fill: theme === 'dark' ? '#d1d5db' : '#374151', fontSize: 13, fontWeight: 700 }} />
                            <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} tick={{ fontSize: 11 }} label={{ value: 'ΔOI (CE / PE)', angle: -90, position: 'insideLeft', fill: theme === 'dark' ? '#d1d5db' : '#374151', fontSize: 13, fontWeight: 700 }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="ce" stroke="#f59e0b" dot={false} name="CE ΔOI" />
                            <Line type="monotone" dataKey="pe" stroke="#8b5cf6" dot={false} name="PE ΔOI" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* PCR & IV-RV */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                        <h3 className={`mb-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Put-Call Ratio (PCR)</h3>
                        <div className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{sentiment?.pcr?.toFixed(2) ?? '-'}</div>
                        <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Bias: {interpretations.bias}</div>
                      </div>

                      <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                        <h3 className={`mb-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Implied vs Realized Volatility</h3>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[{ name: currentSymbol, IV: vol?.implied_volatility ?? 0, RV: vol?.realized_volatility ?? 0 }]}>
                              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                              <XAxis dataKey="name" hide />
                              <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} tick={{ fontSize: 11 }} label={{ value: 'Volatility (%)', angle: -90, position: 'insideLeft', fill: theme === 'dark' ? '#d1d5db' : '#374151', fontSize: 13, fontWeight: 700 }} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="IV" fill="#60a5fa" name="Implied Volatility (%)" />
                              <Bar dataKey="RV" fill="#f87171" name="Realized Volatility (%)" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN ANALYTICS */}
                  <div className="space-y-6 mt-6 xl:mt-0">
                    {/* NET OI CHANGE */}
                    <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                      <h3 className={`mb-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Net OI Change (Calls vs Puts)</h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={oiChangeSummary} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                            <XAxis type="number" stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} />
                            <YAxis type="category" dataKey="name" stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} tick={{ fontSize: 11 }} label={{ value: 'Instrument', angle: -90, position: 'insideLeft', fill: theme === 'dark' ? '#d1d5db' : '#374151', fontSize: 13, fontWeight: 700 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#818cf8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* TOP VOLUME STRIKES */}
                    <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                      <h3 className={`mb-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Top Volume Strikes</h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topVolumeStrikes} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                            <XAxis dataKey="strike" stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} tick={{ fontSize: 11 }} label={{ value: 'Strike Price (₹)', position: 'insideBottom', offset: -8, fill: theme === 'dark' ? '#d1d5db' : '#374151', fontSize: 13, fontWeight: 700 }} />
                            <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} tick={{ fontSize: 11 }} label={{ value: 'Volume (Contracts)', angle: -90, position: 'insideLeft', fill: theme === 'dark' ? '#d1d5db' : '#374151', fontSize: 13, fontWeight: 700 }} />
                            <Tooltip />
                            <Bar dataKey="volume" fill="#34d399" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AnimatedWidget>
        </div>

        {/* NEWS PANEL */}
        <div className="lg:col-span-12">
          <AnimatedWidget delay={0.75}>
            <NewsPanel />
          </AnimatedWidget>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
