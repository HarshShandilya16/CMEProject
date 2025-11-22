import os
import logging
from typing import Any, Dict, List

import requests


def fetch_from_twitter(symbol: str) -> Dict[str, Any]:
    """Fetch tweets for the given symbol if TWITTER_BEARER_TOKEN is configured.

    This function is **optional** – if the token is missing or any error occurs,
    it simply returns an empty, marked-as-unavailable payload so the rest of the
    pipeline continues to work.
    """
    bearer = os.getenv("TWITTER_BEARER_TOKEN")
    if not bearer or bearer == "YOUR_REAL_TWITTER_BEARER_TOKEN":
        return {
            "source": "twitter_optional",
            "available": False,
            "reason": "TWITTER_BEARER_TOKEN not configured",
            "posts": [],
            "sentiment": {"positive": 0.0, "neutral": 1.0, "negative": 0.0},
            "timeline": [],
            "keywords": [],
            "buzz_score": 0,
        }

    try:
        query = f"{symbol} (stock OR shares OR options) lang:en -is:retweet"
        url = "https://api.twitter.com/2/tweets/search/recent"
        params = {
            "query": query,
            "max_results": 20,
            "tweet.fields": "public_metrics,created_at,lang",
        }
        headers = {"Authorization": f"Bearer {bearer}"}
        resp = requests.get(url, params=params, headers=headers, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        tweets: List[Dict[str, Any]] = data.get("data", [])

        posts = []
        pos = neu = neg = 0
        for t in tweets:
            text = t.get("text", "")
            likes = t.get("public_metrics", {}).get("like_count", 0)
            # naive rule-based sentiment bucket
            lowered = text.lower()
            if any(w in lowered for w in ["bull", "upside", "buy", "breakout"]):
                pos += 1
            elif any(w in lowered for w in ["bear", "downside", "sell", "crash"]):
                neg += 1
            else:
                neu += 1

            posts.append({
                "source": "twitter",
                "user": "@unknown",  # username requires extra fields; keep simple
                "text": text,
                "likes": likes,
            })

        total = max(pos + neu + neg, 1)
        sentiment = {
            "positive": pos / total,
            "neutral": neu / total,
            "negative": neg / total,
        }

        # simple buzz proxy based on tweet count
        buzz_score = min(100, len(tweets) * 3)

        return {
            "source": "twitter_optional",
            "available": True,
            "posts": posts,
            "sentiment": sentiment,
            "timeline": [],  # kept simple for v1
            "keywords": [],
            "buzz_score": buzz_score,
        }
    except Exception as exc:  # noqa: BLE001
        logging.warning("Twitter fetch failed: %s", exc)
        return {
            "source": "twitter_optional",
            "available": False,
            "reason": "twitter_error",
            "posts": [],
            "sentiment": {"positive": 0.0, "neutral": 1.0, "negative": 0.0},
            "timeline": [],
            "keywords": [],
            "buzz_score": 0,
        }
