// src/components/NewsPanel.tsx
import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getNews } from '../services/apiService';

interface Article {
  title?: string;
  description?: string;
  url?: string;
  source?: string;
  publishedAt?: string;
  urlToImage?: string;
}

export default function NewsPanel() {
  const symbol = useAppStore((s) => s.currentSymbol);
  const theme = useAppStore((s) => s.theme);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getNews(symbol)
      .then((res) => {
        if (!mounted) return;
        setArticles(res.articles || []);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [symbol]);

  return (
    <div className={`rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Latest News</h3>
        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{symbol}</span>
      </div>
      {loading ? (
        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading news…</div>
      ) : articles.length === 0 ? (
        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>No recent articles.</div>
      ) : (
        <ul className="space-y-3">
          {articles.map((a, idx) => (
            <li key={idx} className="flex gap-3">
              {a.urlToImage ? (
                <img src={a.urlToImage} alt="" className="w-16 h-16 object-cover rounded" />
              ) : (
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded" />
              )}
              <div className="min-w-0">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`block truncate font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}
                >
                  {a.title}
                </a>
                {a.description && (
                  <p className={`text-sm line-clamp-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {a.description}
                  </p>
                )}
                <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {a.source} • {a.publishedAt ? new Date(a.publishedAt).toLocaleString() : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
