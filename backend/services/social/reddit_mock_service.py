from typing import Any, Dict, List
import random


MOCK_TITLES = [
    "Retail traders watching {symbol} closely ahead of expiry",
    "Is {symbol} setting up for a breakout?",
    "Anyone else selling covered calls on {symbol}?",
    "{symbol} option chain looks crazy today",
]


def fetch_from_reddit_mock(symbol: str) -> Dict[str, Any]:
    """Return a deterministic-but-random-feeling mock Reddit payload.

    This keeps the UI rich even without real Reddit credentials.
    """
    random.seed(symbol)
    posts: List[Dict[str, Any]] = []

    for title in MOCK_TITLES:
        text = title.format(symbol=symbol.upper())
        posts.append({
            "source": "reddit_mock",
            "user": f"u/user_{random.randint(100, 999)}",
            "text": text,
            "likes": random.randint(0, 250),
        })

    sentiment = {
        "positive": 0.5,
        "neutral": 0.3,
        "negative": 0.2,
    }

    timeline = [
        {"time": "T-3h", "count": random.randint(5, 20)},
        {"time": "T-2h", "count": random.randint(10, 25)},
        {"time": "T-1h", "count": random.randint(15, 35)},
        {"time": "T-0h", "count": random.randint(5, 30)},
    ]

    keywords = [
        f"{symbol} options",
        f"{symbol} breakout",
        f"{symbol} support",
    ]

    buzz_score = min(100, sum(t["count"] for t in timeline))

    return {
        "source": "reddit_mock",
        "available": True,
        "posts": posts,
        "sentiment": sentiment,
        "timeline": timeline,
        "keywords": keywords,
        "buzz_score": buzz_score,
    }
