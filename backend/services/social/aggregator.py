from __future__ import annotations

import logging
from typing import Any, Dict, List

from .twitter_service import fetch_from_twitter
from .stocktwits_service import fetch_from_stocktwits
from .google_trends_service import fetch_from_google_trends
from .reddit_mock_service import fetch_from_reddit_mock


def _merge_sentiment(parts: List[Dict[str, Any]]) -> Dict[str, float]:
    if not parts:
        return {"positive": 0.0, "neutral": 1.0, "negative": 0.0}

    pos = neu = neg = 0.0
    for p in parts:
        s = p.get("sentiment") or {}
        weight = 1.0
        pos += float(s.get("positive", 0.0)) * weight
        neu += float(s.get("neutral", 0.0)) * weight
        neg += float(s.get("negative", 0.0)) * weight

    total = max(pos + neu + neg, 1e-9)
    return {
        "positive": pos / total,
        "neutral": neu / total,
        "negative": neg / total,
    }


def _merge_timeline(parts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    buckets: Dict[str, int] = {}
    for p in parts:
        for t in p.get("timeline", []) or []:
            k = str(t.get("time"))
            buckets[k] = buckets.get(k, 0) + int(t.get("count", 0))
    return [
        {"time": k, "count": v} for k, v in sorted(buckets.items(), key=lambda kv: kv[0])
    ]


def _merge_keywords(parts: List[Dict[str, Any]], top_k: int = 15) -> List[str]:
    counts: Dict[str, int] = {}
    for p in parts:
        for kw in p.get("keywords", []) or []:
            counts[kw] = counts.get(kw, 0) + 1
    return [k for k, _ in sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:top_k]]


def _merge_posts(parts: List[Dict[str, Any]], top_k: int = 20) -> List[Dict[str, Any]]:
    posts: List[Dict[str, Any]] = []
    for p in parts:
        posts.extend(p.get("posts", []) or [])
    # sort by likes descending
    posts.sort(key=lambda x: int(x.get("likes", 0)), reverse=True)
    return posts[:top_k]


def _compute_buzz_score(parts: List[Dict[str, Any]]) -> int:
    if not parts:
        return 0
    raw = sum(int(p.get("buzz_score", 0)) for p in parts)
    return max(0, min(100, raw))


def get_social_buzz(symbol: str) -> Dict[str, Any]:
    """Aggregate social buzz from multiple sources for a symbol.

    All individual source fetches are defensive: if one fails, the
    aggregator still returns a coherent combined payload.
    """
    symbol = symbol.upper()

    sources: List[Dict[str, Any]] = []

    # Always-on sources
    try:
        sources.append(fetch_from_stocktwits(symbol))
    except Exception as exc:  # noqa: BLE001
        logging.warning("stocktwits aggregation error: %s", exc)

    try:
        sources.append(fetch_from_google_trends(symbol))
    except Exception as exc:  # noqa: BLE001
        logging.warning("google_trends aggregation error: %s", exc)

    try:
        sources.append(fetch_from_reddit_mock(symbol))
    except Exception as exc:  # noqa: BLE001
        logging.warning("reddit_mock aggregation error: %s", exc)

    # Optional Twitter
    try:
        sources.append(fetch_from_twitter(symbol))
    except Exception as exc:  # noqa: BLE001
        logging.warning("twitter aggregation error: %s", exc)

    active = [s for s in sources if s.get("available")]
    if not active:
        # If everything failed, still return a skeleton response
        return {
            "symbol": symbol,
            "buzz_score": 0,
            "sources_used": [s.get("source", "unknown") for s in sources],
            "sentiment": {"positive": 0.0, "neutral": 1.0, "negative": 0.0},
            "timeline": [],
            "top_keywords": [],
            "top_posts": [],
        }

    sentiment = _merge_sentiment(active)
    timeline = _merge_timeline(active)
    keywords = _merge_keywords(active)
    posts = _merge_posts(active)
    buzz_score = _compute_buzz_score(active)

    return {
        "symbol": symbol,
        "buzz_score": buzz_score,
        "sources_used": [s.get("source", "unknown") for s in sources],
        "sentiment": sentiment,
        "timeline": timeline,
        "top_keywords": keywords,
        "top_posts": posts,
    }
