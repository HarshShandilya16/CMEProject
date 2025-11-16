// src/pages/Analytics.tsx
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getOptionChain, getSentiment, getVolatilitySpread, type SentimentResponse } from '../services/apiService';
import type { OptionChainData } from '../data/types';
import NewsPanel from '../components/NewsPanel';
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

export default function Analytics() {
  const symbol = useAppStore((s) => s.currentSymbol);
  const theme = useAppStore((s) => s.theme);

  const [chain, setChain] = useState<OptionChainData | null>(null);
  const [sentiment, setSentiment] = useState<SentimentResponse | null>(null);
  const [vol, setVol] = useState<{ implied_volatility: number; realized_volatility: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([getOptionChain(symbol), getSentiment(symbol), getVolatilitySpread(symbol)])
      .then(([c, s, v]) => {
        if (!mounted) return;
        setChain(c);
        setSentiment(s);
        setVol({ implied_volatility: v.implied_volatility, realized_volatility: v.realized_volatility });
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [symbol]);

  const volVsOi = useMemo(() => {
    if (!chain) return [] as { strike: number; volume: number; oi: number }[];
    const byStrike: Record<string, { volume: number; oi: number }> = {};
    for (const leg of chain.legs) {
      const k = String(leg.strike);
      if (!byStrike[k]) byStrike[k] = { volume: 0, oi: 0 };
      byStrike[k].volume += leg.volume || 0;
      byStrike[k].oi += leg.oi || 0;
    }
    return Object.entries(byStrike)
      .map(([strike, v]) => ({ strike: Number(strike), volume: v.volume, oi: v.oi }))
      .sort((a, b) => a.strike - b.strike);
  }, [chain]);

  const changeOiSeries = useMemo(() => {
    if (!chain) return [] as { strike: number; ce: number; pe: number }[];
    const map: Record<string, { ce: number; pe: number }> = {};
    for (const leg of chain.legs) {
      const k = String(leg.strike);
      if (!map[k]) map[k] = { ce: 0, pe: 0 };
      if (leg.type === 'CE') map[k].ce += leg.oi_change || 0;
      if (leg.type === 'PE') map[k].pe += leg.oi_change || 0;
    }
    return Object.entries(map)
      .map(([strike, v]) => ({ strike: Number(strike), ce: v.ce, pe: v.pe }))
      .sort((a, b) => a.strike - b.strike);
  }, [chain]);

  const interpretations = useMemo(() => {
    const pcr = sentiment?.pcr ?? 0;
    const avgVol = volVsOi.length ? volVsOi.reduce((a, b) => a + b.volume, 0) / volVsOi.length : 0;
    const avgOiChange = changeOiSeries.length ?
      changeOiSeries.reduce((a, b) => a + (b.ce + b.pe), 0) / changeOiSeries.length : 0;

    const volumeWhy = avgVol > 0 ?
      'Volume is rising near popular strikes; liquidity and trader activity are clustering around key levels.' :
      'Low traded volume indicates indecision or off-peak session.';

    const oiWhy = avgOiChange < 0 ?
      'OI is dropping, indicating short-covering or profit booking by writers.' :
      'OI is building up, signaling fresh positions adding to existing trend.';

    let bias = 'Neutral';
    if (pcr > 1.0) bias = 'Bearish';
    else if (pcr < 0.7) bias = 'Bullish';

    return { volumeWhy, oiWhy, bias, pcr };
  }, [sentiment, volVsOi, changeOiSeries]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Analytics — {symbol}</h2>
        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Expiry: {chain?.expiryDate || '-'}</span>
      </div>

      {loading ? (
        <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading analytics…</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Charts 2 columns */}
          <div className="xl:col-span-2 space-y-6">
            {/* Volume vs OI */}
            <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`mb-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Volume vs Open Interest</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volVsOi} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <XAxis dataKey="strike" stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} />
                    <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="volume" fill="#60a5fa" name="Volume" />
                    <Bar dataKey="oi" fill="#34d399" name="Open Interest" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Strikes vs Change in OI */}
            <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`mb-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Strikes vs Change in OI</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={changeOiSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <XAxis dataKey="strike" stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} />
                    <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="ce" stroke="#f59e0b" dot={false} name="CE ΔOI" />
                    <Line type="monotone" dataKey="pe" stroke="#8b5cf6" dot={false} name="PE ΔOI" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PCR and IV */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`mb-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Put-Call Ratio (PCR)</h3>
                <div className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{sentiment?.pcr?.toFixed(2) ?? '-'}
                </div>
                <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Bias: {interpretations.bias}</div>
              </div>

              <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`mb-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Implied vs Realized Volatility</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: symbol, IV: vol?.implied_volatility ?? 0, RV: vol?.realized_volatility ?? 0 }]}
                              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                      <XAxis dataKey="name" hide />
                      <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="IV" fill="#60a5fa" />
                      <Bar dataKey="RV" fill="#f87171" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`mb-2 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>AI Summary</h3>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{sentiment?.detailed_insight || 'No summary available.'}</p>
            </div>

            {/* Interpretations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <div className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Why is volume increasing?</div>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{interpretations.volumeWhy}</p>
              </div>
              <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <div className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Why OI dropping?</div>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{interpretations.oiWhy}</p>
              </div>
              <div className={`rounded-lg p-4 shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <div className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Is market becoming bullish/bearish?</div>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Based on PCR {interpretations.pcr?.toFixed(2)}, bias looks {interpretations.bias}.</p>
              </div>
            </div>
          </div>

          {/* Right: News */}
          <div>
            <NewsPanel />
          </div>
        </div>
      )}
    </div>
  );
}
