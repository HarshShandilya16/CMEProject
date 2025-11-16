# backend/services/news_service.py
import os
import logging
from typing import List, Dict
from datetime import datetime, timedelta
import requests

NEWS_API_KEY = os.getenv("NEWS_API_KEY") or os.getenv("NEWSAPI_KEY")
NEWS_API_BASE = "https://newsapi.org/v2/everything"

SYMBOL_KEYWORDS = {
    "NIFTY": [
        "NIFTY 50",
        "Nifty 50 index",
        "NSE NIFTY",
        "NIFTY options",
        "NIFTY option chain",
        "NSE NIFTY derivatives",
        "NIFTY volatility",
    ],
    "BANKNIFTY": [
        "Bank Nifty",
        "NSE Bank Nifty",
        "NSE bank index",
        "Bank Nifty options",
        "BANKNIFTY option chain",
        "bank index derivatives",
        "BANKNIFTY volatility",
    ],
    "FINNIFTY": [
        "FINNIFTY",
        "NSE FINNIFTY",
        "NSE financial services index",
        "FINNIFTY options",
        "FINNIFTY option chain",
        "financial services index derivatives",
        "FINNIFTY volatility",
    ],
}


def _build_query(symbol: str, extra: str | None = None) -> str:
    symbol = symbol.upper()
    base_terms = SYMBOL_KEYWORDS.get(
        symbol,
        [
            f"{symbol} options",
            f"{symbol} option chain",
            f"{symbol} derivatives",
            f"{symbol} volatility",
        ],
    )
    if extra:
        base_terms.append(extra)
    # Use OR to broaden results; NewsAPI supports simple query strings
    return " OR ".join(base_terms)


def fetch_news(symbol: str, extra_query: str | None = None, page_size: int = 10) -> List[Dict]:
    """
    Fetch curated news articles for a symbol using NewsAPI.
    Returns a simplified list of article dicts.
    """
    if not NEWS_API_KEY:
        logging.warning("NEWS_API_KEY not configured; returning empty list.")
        return []

    def _call_news(params: Dict) -> List[Dict]:
        """Low-level helper that calls NewsAPI and normalizes the response."""
        try:
            resp = requests.get(NEWS_API_BASE, params=params, timeout=10)
            data = resp.json()

            if resp.status_code != 200 or data.get("status") != "ok":
                logging.error(f"NewsAPI error: status={resp.status_code}, body={data}")
                return []

            articles = data.get("articles", [])
            curated: List[Dict] = []
            for a in articles:
                curated.append({
                    "title": a.get("title"),
                    "description": a.get("description"),
                    "url": a.get("url"),
                    "source": (a.get("source") or {}).get("name"),
                    "publishedAt": a.get("publishedAt"),
                    "urlToImage": a.get("urlToImage"),
                })
            return curated
        except Exception as e:
            logging.error(f"NewsAPI fetch error: {e}")
            return []

    today = datetime.utcnow().date()

    base_params = {
        "q": _build_query(symbol, extra_query),
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": min(max(page_size, 1), 20),
        "searchIn": "title,description,content",
        "apiKey": NEWS_API_KEY,
    }

    # 1) First try: options/index-focused query (no strict date window)
    articles = _call_news(base_params)

    # 2) Fallback: broader symbol-only search over last 3 days if nothing found
    if not articles:
        fallback_params = base_params.copy()
        fallback_params["q"] = symbol.upper()
        fallback_params.pop("searchIn", None)
        fallback_params["from"] = (today - timedelta(days=7)).isoformat()
        logging.info(f"NewsAPI primary query empty for {symbol}, using broader fallback query...")
        articles = _call_news(fallback_params)

    return articles
