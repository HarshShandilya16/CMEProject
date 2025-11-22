import logging
from typing import Any, Dict, List

import requests


BASE_URL = "https://api.stocktwits.com/api/2/streams/symbol/{symbol}.json"


def fetch_from_stocktwits(symbol: str) -> Dict[str, Any]:
    """Fetch public messages for a symbol from Stocktwits.

    Stocktwits does not require an API key for basic streams, so this should
    generally always work unless they rate-limit or change the API.
    """
    try:
        url = BASE_URL.format(symbol=symbol.upper())
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        messages: List[Dict[str, Any]] = data.get("messages", [])

        posts = []
        pos = neu = neg = 0
        keywords: Dict[str, int] = {}

        for m in messages[:40]:
            body = m.get("body", "")
            user = m.get("user", {}).get("username", "unknown")
            likes = m.get("likes", {}).get("total", 0)

            lowered = body.lower()
            if any(w in lowered for w in ["bull", "up", "call", "breakout", "accumulate"]):
                pos += 1
            elif any(w in lowered for w in ["bear", "down", "put", "sell", "dump"]):
                neg += 1
            else:
                neu += 1

            for tok in lowered.split():
                tok = tok.strip("$#.,!?:;()[]{}\"'")
                if len(tok) < 4:
                    continue
                if tok.isdigit():
                    continue
                keywords[tok] = keywords.get(tok, 0) + 1

            posts.append({
                "source": "stocktwits",
                "user": user,
                "text": body,
                "likes": likes,
            })

        total = max(pos + neu + neg, 1)
        sentiment = {
            "positive": pos / total,
            "neutral": neu / total,
            "negative": neg / total,
        }

        top_keywords = [k for k, _ in sorted(keywords.items(), key=lambda kv: kv[1], reverse=True)[:15]]

        # simple buzz proxy based on message count
        buzz_score = min(100, len(messages) * 2)

        return {
            "source": "stocktwits",
            "available": True,
            "posts": posts,
            "sentiment": sentiment,
            "timeline": [],  # can be added later by bucketing created_at
            "keywords": top_keywords,
            "buzz_score": buzz_score,
        }
    except Exception as exc:  # noqa: BLE001
        logging.warning("Stocktwits fetch failed: %s", exc)
        return {
            "source": "stocktwits",
            "available": False,
            "reason": "stocktwits_error",
            "posts": [],
            "sentiment": {"positive": 0.0, "neutral": 1.0, "negative": 0.0},
            "timeline": [],
            "keywords": [],
            "buzz_score": 0,
        }
