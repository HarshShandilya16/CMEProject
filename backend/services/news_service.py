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

# Optional overrides for common individual instruments, especially BANKNIFTY/FINNIFTY constituents.
# You can extend this dict over time as needed.
STOCK_KEYWORDS: dict[str, list[str]] = {
    # Major bank index names
    "HDFCBANK": [
        "HDFC Bank",
        "HDFC Bank stock",
        "HDFCBANK",
        "HDFC Bank share price",
        "HDFC Bank options",
    ],
    "ICICIBANK": [
        "ICICI Bank",
        "ICICI Bank stock",
        "ICICIBANK",
        "ICICI Bank share price",
        "ICICI Bank options",
    ],
    "AXISBANK": [
        "Axis Bank",
        "Axis Bank stock",
        "AXISBANK",
        "Axis Bank share price",
        "Axis Bank options",
    ],
    "KOTAKBANK": [
        "Kotak Mahindra Bank",
        "Kotak Bank",
        "KOTAKBANK",
        "Kotak Mahindra Bank share",
        "Kotak Bank options",
    ],
    "SBIN": [
        "State Bank of India",
        "SBI",
        "SBIN",
        "SBI share price",
        "SBI options",
    ],
    # Other BANKNIFTY names
    "BAJAJFINSV": [
        "Bajaj Finserv",
        "Bajaj Finserv stock",
        "BAJAJFINSV",
        "Bajaj Finserv share price",
    ],
    "BAJFINANCE": [
        "Bajaj Finance",
        "Bajaj Finance stock",
        "BAJFINANCE",
        "Bajaj Finance share price",
        "Bajaj Finance options",
    ],
    "BANDHANBNK": [
        "Bandhan Bank",
        "Bandhan Bank stock",
        "BANDHANBNK",
        "Bandhan Bank share price",
    ],
    "IDFCFIRSTB": [
        "IDFC First Bank",
        "IDFC First Bank stock",
        "IDFCFIRSTB",
        "IDFC First Bank share price",
    ],
    "INDUSINDBK": [
        "IndusInd Bank",
        "IndusInd Bank stock",
        "INDUSINDBK",
        "IndusInd Bank share price",
    ],
    # Example FINNIFTY names (extend as you need)
    "HDFCLIFE": [
        "HDFC Life Insurance",
        "HDFC Life stock",
        "HDFCLIFE",
        "HDFC Life share price",
    ],
    "ICICIPRULI": [
        "ICICI Prudential Life",
        "ICICI Pru Life",
        "ICICIPRULI",
        "ICICI Prudential Life Insurance share",
    ],
    "SBILIFE": [
        "SBI Life Insurance",
        "SBI Life stock",
        "SBILIFE",
        "SBI Life share price",
    ],
    # NIFTY large-cap names
    "BHARTIARTL": [
        "Bharti Airtel",
        "Bharti Airtel stock",
        "BHARTIARTL",
        "Bharti Airtel share price",
    ],
    "HCLTECH": [
        "HCL Technologies",
        "HCL Tech",
        "HCLTECH",
        "HCL Tech share price",
    ],
    "HINDUNILVR": [
        "Hindustan Unilever",
        "Hindustan Unilever stock",
        "HINDUNILVR",
        "HUL share price",
    ],
    "INFY": [
        "Infosys",
        "Infosys stock",
        "INFY",
        "Infosys share price",
    ],
    "ITC": [
        "ITC",
        "ITC stock",
        "ITC share price",
    ],
    "LT": [
        "Larsen & Toubro",
        "L&T",
        "LT",
        "L&T share price",
    ],
    "M&M": [
        "Mahindra & Mahindra",
        "M&M",
        "M&M share price",
    ],
    "MARUTI": [
        "Maruti Suzuki India",
        "Maruti Suzuki",
        "MARUTI",
        "Maruti Suzuki share price",
    ],
    "POWERGRID": [
        "Power Grid Corporation of India",
        "Power Grid",
        "POWERGRID",
        "Power Grid share price",
    ],
    "RELIANCE": [
        "Reliance Industries",
        "Reliance Industries stock",
        "RELIANCE",
        "Reliance share price",
    ],
    "SUNPHARMA": [
        "Sun Pharmaceutical",
        "Sun Pharma",
        "SUNPHARMA",
        "Sun Pharma share price",
    ],
    "TATAMOTORS": [
        "Tata Motors",
        "Tata Motors stock",
        "TATAMOTORS",
        "Tata Motors share price",
    ],
    "TCS": [
        "Tata Consultancy Services",
        "TCS",
        "TCS share price",
    ],
    "TITAN": [
        "Titan Company",
        "Titan Company stock",
        "TITAN",
        "Titan share price",
    ],
    "WIPRO": [
        "Wipro",
        "Wipro stock",
        "WIPRO",
        "Wipro share price",
    ],
}


def _build_query(symbol: str, extra: str | None = None) -> str:
    symbol = symbol.upper()
    # 1) Index-level curated terms
    if symbol in SYMBOL_KEYWORDS:
        base_terms = SYMBOL_KEYWORDS[symbol][:]
    # 2) Per-stock curated overrides (common BANKNIFTY/FINNIFTY names)
    elif symbol in STOCK_KEYWORDS:
        base_terms = STOCK_KEYWORDS[symbol][:]
    else:
        # 3) Generic fallback for any other individual instrument symbol
        base_terms = [
            f"{symbol} stock",
            f"{symbol} share",
            f"{symbol} price",
            f"{symbol} options",
            f"{symbol} option chain",
            f"{symbol} NSE",
        ]

        # Try to derive a more human-readable company name for better matches
        pretty = symbol
        replacements = {
            "BANK": " Bank",
            "FINANCE": " Finance",
            "FIN": " Fin",
            "MOTOR": " Motors",
            "INDIA": " India",
            "LTD": " Ltd",
        }
        for key, val in replacements.items():
            if key in pretty:
                pretty = pretty.replace(key, val)

        if pretty != symbol:
            base_terms.extend([
                pretty,
                f"{pretty} stock",
                f"{pretty} share",
                f"{pretty} options",
            ])

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