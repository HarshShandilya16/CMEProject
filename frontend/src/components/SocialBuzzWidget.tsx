// frontend/src/components/SocialBuzzWidget.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getSocialBuzz, type SocialBuzzResponse } from '../services/apiService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface Props {
  symbol: string;
}

export const SocialBuzzWidget: React.FC<Props> = ({ symbol }) => {
  const { theme } = useAppStore();
  const [data, setData] = useState<SocialBuzzResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    getSocialBuzz(symbol)
      .then((resp) => {
        if (!mounted) return;
        setData(resp);
      })
      .catch(() => {
        if (!mounted) return;
        setError('Failed to load social buzz');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [symbol]);

  const sentimentBars = useMemo(() => {
    if (!data) return [];
    return [
      {
        name: 'Sentiment',
        positive: Math.round(data.sentiment.positive * 100),
        neutral: Math.round(data.sentiment.neutral * 100),
        negative: Math.round(data.sentiment.negative * 100),
      },
    ];
  }, [data]);

  const buzzScore = data?.buzz_score ?? 0;

  return (
    <div className={`${cardBg} rounded-xl shadow-lg p-3 md:p-4 h-full flex flex-col`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className={`text-lg font-semibold ${textPrimary}`}>Social Buzz</h3>
          <p className={`text-xs ${textMuted}`}>
            Combined activity across Stocktwits, Google Trends, Reddit (mock){' '}
            {data?.sources_used?.includes('twitter_optional') && ' + Twitter (if available)'}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-xs font-medium ${textMuted}`}>Buzz Score</span>
          <span className="text-2xl font-bold text-indigo-400">{buzzScore}</span>
        </div>
      </div>

      {loading && (
        <div className={`flex-1 flex items-center justify-center ${textMuted}`}>
          Loading social buzz…
        </div>
      )}

      {!loading && error && (
        <div className={`flex-1 flex items-center justify-center text-sm text-red-400`}>
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Sentiment bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className={textMuted}>Sentiment</span>
              <span className={textMuted}>
                +{Math.round(data.sentiment.positive * 100)}% /
                {Math.round(data.sentiment.neutral * 100)}% /
                -{Math.round(data.sentiment.negative * 100)}%
              </span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden bg-gray-700/40">
              <div className="h-full bg-green-500 inline-block" style={{ width: `${Math.round(data.sentiment.positive * 100)}%` }} />
              <div className="h-full bg-gray-400 inline-block" style={{ width: `${Math.round(data.sentiment.neutral * 100)}%` }} />
              <div className="h-full bg-red-500 inline-block" style={{ width: `${Math.round(data.sentiment.negative * 100)}%` }} />
            </div>
          </div>

          {/* Timeline Chart — NOW WITH X & Y AXIS LABELS */}
          <div className="mb-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.timeline}
                margin={{ top: 10, right: 15, left: 25, bottom: 25 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#374151' : '#e5e7eb'}
                />

                <XAxis
                  dataKey="time"
                  stroke={isDark ? '#d1d5db' : '#374151'}
                  tick={{ fontSize: 10 }}
                  label={{
                    value: 'Time',
                    position: 'insideBottom',
                    offset: -10,
                    fill: isDark ? '#d1d5db' : '#374151',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />

                <YAxis
                  stroke={isDark ? '#d1d5db' : '#374151'}
                  tick={{ fontSize: 10 }}
                  label={{
                    value: 'Buzz Count',
                    angle: -90,
                    position: 'insideLeft',
                    fill: isDark ? '#d1d5db' : '#374151',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />

                <Tooltip cursor={{ fill: isDark ? '#111827' : '#e5e7eb', opacity: 0.3 }} />

                <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Keywords */}
          {data.top_keywords.length > 0 && (
            <div className="mb-3">
              <div className={`text-xs font-medium mb-1 ${textMuted}`}>Trending keywords</div>
              <div className="flex flex-wrap gap-1.5">
                {data.top_keywords.slice(0, 10).map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sources used */}
          <div className="mb-3">
            <div className={`text-xs font-medium mb-1 ${textMuted}`}>Sources used</div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {(data.sources_used || []).map((s) => (
                <span
                  key={s}
                  className="px-1.5 py-0.5 rounded-full bg-gray-700/60 text-gray-200 border border-gray-600"
                >
                  {s.replace('_optional', '')}
                </span>
              ))}
            </div>
          </div>

          {/* Top posts */}
          <div className="mt-auto">
            <div className={`text-xs font-medium mb-1 ${textMuted}`}>Top posts</div>
            <div className="max-h-40 overflow-y-auto pr-1 space-y-2">
              {data.top_posts.slice(0, 6).map((p, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg px-2 py-1.5 border text-xs ${
                    isDark ? 'border-gray-700 bg-gray-900/60' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-[11px] text-indigo-300">
                      {p.source}
                    </span>
                    <span className="text-[10px] text-amber-300">★ {p.likes ?? 0}</span>
                  </div>
                  <div className={`text-[10px] ${textMuted}`}>{p.user}</div>
                  <div className={`${textPrimary} text-[11px] line-clamp-3`}>{p.text}</div>
                </div>
              ))}
              {data.top_posts.length === 0 && (
                <div className={`text-xs ${textMuted}`}>No posts available.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SocialBuzzWidget;
