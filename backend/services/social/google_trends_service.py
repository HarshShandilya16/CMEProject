import logging
from typing import Any, Dict, List

try:
    from pytrends.request import TrendReq
except Exception:  # noqa: BLE001
    TrendReq = None  # type: ignore[misc]


def _safe_build_trends_payload(pytrends: Any, kw_list: List[str]) -> None:
    try:
        pytrends.build_payload(kw_list=kw_list, timeframe="now 7-d")
    except Exception:
        pytrends.build_payload(kw_list=kw_list)


def fetch_from_google_trends(symbol: str) -> Dict[str, Any]:
    """Fetch Google Trends interest for the given symbol.

    If pytrends or network is unavailable, returns a simulated but
    well-shaped payload so the rest of the system still works.
    """
    keyword = f"{symbol} stock"

    if TrendReq is None:
        logging.warning("pytrends not installed; returning simulated Google Trends data")
        return _fake_trends_payload(symbol, keyword)

    try:
        pytrends = TrendReq(hl="en-US", tz=330)
        _safe_build_trends_payload(pytrends, [keyword])
        df = pytrends.interest_over_time()

        if df.empty:
            return _fake_trends_payload(symbol, keyword)

        timeline = []
        total_interest = 0
        for ts, row in df.iterrows():
            v = int(row[keyword])
            total_interest += v
            timeline.append({"time": ts.isoformat(), "count": v})

        avg_interest = total_interest / max(len(timeline), 1)
        buzz_score = min(100, int(avg_interest))

        return {
            "source": "google_trends",
            "available": True,
            "posts": [],
            "sentiment": {"positive": 0.33, "neutral": 0.34, "negative": 0.33},  # neutral placeholder
            "timeline": timeline,
            "keywords": [keyword],
            "buzz_score": buzz_score,
        }
    except Exception as exc:  # noqa: BLE001
        logging.warning("Google Trends fetch failed: %s", exc)
        return _fake_trends_payload(symbol, keyword)


def _fake_trends_payload(symbol: str, keyword: str) -> Dict[str, Any]:
    # simple simulated weekly curve
    base = 20
    timeline = []
    for i in range(7):
        timeline.append({"time": f"D-{6-i}", "count": base + i * 5})

    return {
        "source": "google_trends",
        "available": False,
        "reason": "pytrends_unavailable_or_empty",
        "posts": [],
        "sentiment": {"positive": 0.33, "neutral": 0.34, "negative": 0.33},
        "timeline": timeline,
        "keywords": [keyword],
        "buzz_score": 40,
    }
