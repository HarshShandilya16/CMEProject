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
    console.log('📰 NewsPanel: Fetching news for', symbol);
    let mounted = true;
    setLoading(true);
    
    // ✅ FIXED: Pass undefined/null for extra query, then page size
    getNews(symbol, undefined, 6)  // ← Changed this line
      .then((res) => {
        if (!mounted) return;
        setArticles(res.articles || []);
        console.log('📰 Loaded', res.articles?.length || 0, 'articles');
      })
      .catch((err) => {
        console.error('📰 Error loading news:', err);
      })
      .finally(() => mounted && setLoading(false));
    
    return () => {
      mounted = false;
    };
  }, [symbol]);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  return (
    <div className={`rounded-xl shadow-lg border p-6 ${cardClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
          Latest News - {symbol}
        </h3>
        {loading && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
        )}
      </div>

      {/* Content */}
      {loading && articles.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Loading latest news...
            </p>
          </div>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📰</div>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            No recent articles available for {symbol}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article, idx) => (
            <a
              key={idx}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block rounded-lg border p-4 transition-all hover:shadow-md ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 hover:bg-gray-650 hover:border-gray-500' 
                  : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300'
              }`}
            >
              {article.urlToImage ? (
                <img 
                  src={article.urlToImage} 
                  alt={article.title || 'News'} 
                  className="w-full h-32 object-cover rounded mb-3"
                  onError={(e) => { 
                    e.currentTarget.style.display = 'none'; 
                  }}
                />
              ) : (
                <div className={`w-full h-32 rounded mb-3 flex items-center justify-center ${
                  isDark ? 'bg-gray-600' : 'bg-gray-200'
                }`}>
                  <span className="text-3xl">📰</span>
                </div>
              )}

              <h4 className={`font-semibold text-sm mb-2 line-clamp-2 min-h-[2.5rem] ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {article.title || 'Untitled Article'}
              </h4>

              {article.description && (
                <p className={`text-xs mb-3 line-clamp-2 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {article.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs mt-auto pt-2 border-t border-gray-600">
                <span className={`font-medium truncate ${
                  isDark ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  {article.source || 'Unknown Source'}
                </span>
                <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>
                  {article.publishedAt 
                    ? new Date(article.publishedAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })
                    : ''}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}

      {articles.length > 0 && (
        <div className={`mt-4 text-xs text-center ${
          isDark ? 'text-gray-500' : 'text-gray-600'
        }`}>
          Showing {articles.length} latest articles
        </div>
      )}
    </div>
  );
}