from __future__ import annotations

from dataclasses import dataclass
from typing import List, Literal, Dict, Any


Severity = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


@dataclass
class AlertSignal:
    """Intermediate signal values used by rules.

    This is intentionally generic and computed from existing services
    (open interest, volume, IV/RV, sentiment, price change, etc.).
    """

    symbol: str
    pcr: float | None = None
    total_call_oi: int | None = None
    total_put_oi: int | None = None
    volume_24h: float | None = None
    price_change_pct: float | None = None
    iv: float | None = None
    rv: float | None = None
    social_buzz_score: int | None = None
    social_sentiment_score: float | None = None  # -1 to 1


@dataclass
class AlertEvent:
    symbol: str
    rule_name: str
    severity: Severity
    message: str
    metadata: Dict[str, Any]


class AlertEngine:
    """Rule-based engine that turns AlertSignal into AlertEvent objects.

    The goal is to keep this lightweight and deterministic so it can be
    called from API endpoints or background jobs.
    """

    def evaluate(self, signal: AlertSignal) -> List[AlertEvent]:  # noqa: C901
        alerts: List[AlertEvent] = []

        # ---- Volume & Open Interest Imbalance ----
        if signal.total_call_oi is not None and signal.total_put_oi is not None:
            total_oi = signal.total_call_oi + signal.total_put_oi
            if total_oi > 0:
                call_share = signal.total_call_oi / total_oi
                put_share = signal.total_put_oi / total_oi

                if call_share >= 0.7:
                    alerts.append(
                        AlertEvent(
                            symbol=signal.symbol,
                            rule_name="CALL_HEAVY_OPEN_INTEREST",
                            severity="HIGH",
                            message="Unusual call-side buildup detected (call OI > 70% of total).",
                            metadata={
                                "call_share": round(call_share, 3),
                                "put_share": round(put_share, 3),
                                "total_call_oi": signal.total_call_oi,
                                "total_put_oi": signal.total_put_oi,
                            },
                        )
                    )
                elif put_share >= 0.7:
                    alerts.append(
                        AlertEvent(
                            symbol=signal.symbol,
                            rule_name="PUT_HEAVY_OPEN_INTEREST",
                            severity="HIGH",
                            message="Unusual put-side buildup detected (put OI > 70% of total).",
                            metadata={
                                "call_share": round(call_share, 3),
                                "put_share": round(put_share, 3),
                                "total_call_oi": signal.total_call_oi,
                                "total_put_oi": signal.total_put_oi,
                            },
                        )
                    )

        # ---- PCR Extremes ----
        if signal.pcr is not None:
            if signal.pcr >= 1.5:
                alerts.append(
                    AlertEvent(
                        symbol=signal.symbol,
                        rule_name="EXTREME_BEARISH_PCR",
                        severity="MEDIUM",
                        message="High Put-Call Ratio suggests bearish positioning.",
                        metadata={"pcr": round(signal.pcr, 2)},
                    )
                )
            elif signal.pcr <= 0.6:
                alerts.append(
                    AlertEvent(
                        symbol=signal.symbol,
                        rule_name="EXTREME_BULLISH_PCR",
                        severity="MEDIUM",
                        message="Low Put-Call Ratio suggests bullish positioning.",
                        metadata={"pcr": round(signal.pcr, 2)},
                    )
                )

        # ---- IV vs RV Spread ----
        if signal.iv is not None and signal.rv is not None:
            spread = signal.iv - signal.rv
            if spread >= 10:
                alerts.append(
                    AlertEvent(
                        symbol=signal.symbol,
                        rule_name="RICH_OPTION_PREMIUMS",
                        severity="MEDIUM",
                        message="Implied volatility significantly above realized volatility.",
                        metadata={
                            "iv": round(signal.iv, 2),
                            "rv": round(signal.rv, 2),
                            "spread": round(spread, 2),
                        },
                    )
                )
            elif spread <= -10:
                alerts.append(
                    AlertEvent(
                        symbol=signal.symbol,
                        rule_name="CHEAP_OPTION_PREMIUMS",
                        severity="MEDIUM",
                        message="Implied volatility significantly below realized volatility.",
                        metadata={
                            "iv": round(signal.iv, 2),
                            "rv": round(signal.rv, 2),
                            "spread": round(spread, 2),
                        },
                    )
                )

        # ---- Social Buzz & Sentiment Spikes ----
        if signal.social_buzz_score is not None:
            if signal.social_buzz_score >= 80:
                alerts.append(
                    AlertEvent(
                        symbol=signal.symbol,
                        rule_name="EXTREME_SOCIAL_BUZZ",
                        severity="HIGH",
                        message="Unusual spike in social buzz detected.",
                        metadata={"buzz_score": signal.social_buzz_score},
                    )
                )

        if signal.social_sentiment_score is not None:
            if signal.social_sentiment_score >= 0.6:
                alerts.append(
                    AlertEvent(
                        symbol=signal.symbol,
                        rule_name="OVERWHELMING_BULLISH_SOCIAL_SENTIMENT",
                        severity="LOW",
                        message="Social sentiment is strongly bullish.",
                        metadata={"sentiment_score": round(signal.social_sentiment_score, 3)},
                    )
                )
            elif signal.social_sentiment_score <= -0.6:
                alerts.append(
                    AlertEvent(
                        symbol=signal.symbol,
                        rule_name="OVERWHELMING_BEARISH_SOCIAL_SENTIMENT",
                        severity="LOW",
                        message="Social sentiment is strongly bearish.",
                        metadata={"sentiment_score": round(signal.social_sentiment_score, 3)},
                    )
                )

        # ---- Price Move Placeholder ----
        # Price change percentage can be plugged in from YFinance or your DB
        # if you decide to compute intraday or 1D moves before calling evaluate().
        if signal.price_change_pct is not None:
            if signal.price_change_pct >= 3:
                alerts.append(
                    AlertEvent(
                        symbol=signal.symbol,
                        rule_name="SHARP_PRICE_MOVE_UP",
                        severity="HIGH",
                        message="Price up-move greater than 3%.",
                        metadata={"price_change_pct": round(signal.price_change_pct, 2)},
                    )
                )
            elif signal.price_change_pct <= -3:
                alerts.append(
                    AlertEvent(
                        symbol=signal.symbol,
                        rule_name="SHARP_PRICE_MOVE_DOWN",
                        severity="HIGH",
                        message="Price down-move greater than 3%.",
                        metadata={"price_change_pct": round(signal.price_change_pct, 2)},
                    )
                )

        return alerts
