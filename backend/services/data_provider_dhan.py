# backend/services/data_provider_dhan.py
import os
import time
import logging
from typing import Any, Dict, Optional
import requests
from datetime import datetime

logger = logging.getLogger(__name__)


# Minimal mock option-chain shaped to work with parse_option_chain_data
MOCK_OPTION_CHAIN = {
    "records": {
        "underlyingValue": 19500.0,
        "timestamp": datetime.utcnow().strftime("%d-%b-%Y %H:%M:%S"),
        "data": [
            {
                "strikePrice": 19400.0,
                "expiryDate": (datetime.utcnow().date()).strftime("%d-%b-%Y"),
                "CE": {
                    "lastPrice": 120.0,
                    "openInterest": 1500,
                    "changeinOpenInterest": 50,
                    "totalTradedVolume": 200,
                    "impliedVolatility": 18.5
                },
                "PE": {
                    "lastPrice": 80.0,
                    "openInterest": 2000,
                    "changeinOpenInterest": -30,
                    "totalTradedVolume": 180,
                    "impliedVolatility": 20.1
                }
            },
            {
                "strikePrice": 19500.0,
                "expiryDate": (datetime.utcnow().date()).strftime("%d-%b-%Y"),
                "CE": {
                    "lastPrice": 90.0,
                    "openInterest": 5000,
                    "changeinOpenInterest": 300,
                    "totalTradedVolume": 420,
                    "impliedVolatility": 17.2
                },
                "PE": {
                    "lastPrice": 110.0,
                    "openInterest": 4800,
                    "changeinOpenInterest": -120,
                    "totalTradedVolume": 390,
                    "impliedVolatility": 19.3
                }
            },
            {
                "strikePrice": 19600.0,
                "expiryDate": (datetime.utcnow().date()).strftime("%d-%b-%Y"),
                "CE": {
                    "lastPrice": 60.0,
                    "openInterest": 900,
                    "changeinOpenInterest": -20,
                    "totalTradedVolume": 100,
                    "impliedVolatility": 16.8
                },
                "PE": {
                    "lastPrice": 140.0,
                    "openInterest": 400,
                    "changeinOpenInterest": 10,
                    "totalTradedVolume": 60,
                    "impliedVolatility": 21.0
                }
            }
        ]
    }
}


class DhanDataProvider:
    """
    DhanHQ Option Chain provider with DEMO fallback.
    If DHAN_CLIENT_ID or DHAN_ACCESS_TOKEN are set to demo placeholders, provider returns mock data.
    """

    def __init__(self):
        self.api_base = os.getenv("DHAN_API_BASE", "https://api.dhan.co/v2")
        self.client_id = os.getenv("DHAN_CLIENT_ID")
        self.access_token = os.getenv("DHAN_ACCESS_TOKEN")
        self.rate_limit_sec = float(os.getenv("DHAN_RATE_LIMIT_SEC", "3.0"))
        self._last_call_ts = 0.0
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

        # Detect demo placeholders
        self._is_demo = (not self.client_id or not self.access_token) or \
                        (self.client_id.startswith("DEMO") or self.access_token.startswith("DEMO"))

        if self._is_demo:
            logger.info("DhanDataProvider running in DEMO mode (mock data). Replace DHAN_* env variables after KYC.")

    def _headers(self) -> Dict[str, str]:
        return {
            "access-token": self.access_token or "",
            "client-id": str(self.client_id or "")
        }

    def _respect_rate_limit(self):
        elapsed = time.time() - self._last_call_ts
        if elapsed < self.rate_limit_sec:
            to_sleep = self.rate_limit_sec - elapsed
            logger.debug("Respecting Dhan rate-limit: sleeping %.2fs", to_sleep)
            time.sleep(to_sleep)

    def get_option_chain_by_instrument(
        self,
        underlying_scrip_id: int,
        underlying_seg: str = "IDX_I",
        expiry: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        If in DEMO mode, return a stable mock shaped like NSE response.
        Otherwise, call Dhan OptionChain endpoint and return JSON.
        """
        if self._is_demo:
            logger.info("Returning DEMO option chain for instrument %s", underlying_scrip_id)
            return MOCK_OPTION_CHAIN

        url = f"{self.api_base}/optionchain"
        payload = {
            "UnderlyingScrip": int(underlying_scrip_id),
            "UnderlyingSeg": underlying_seg
        }
        if expiry:
            payload["Expiry"] = expiry

        # Rate limiting
        self._respect_rate_limit()

        backoff = 0.5
        attempts = 4
        for attempt in range(1, attempts + 1):
            try:
                resp = self.session.post(url, json=payload, headers=self._headers(), timeout=20)
                self._last_call_ts = time.time()
                resp.raise_for_status()
                data = resp.json()
                logger.info("Dhan OptionChain success for instrument %s (attempt %d)", underlying_scrip_id, attempt)
                return data
            except requests.HTTPError as he:
                status = getattr(he.response, "status_code", None)
                logger.error("Dhan HTTP error (attempt %d): status=%s error=%s", attempt, status, he)
                if status and 400 <= status < 500:
                    break
            except Exception as e:
                logger.warning("Dhan request attempt %d failed: %s", attempt, e)
            time.sleep(backoff)
            backoff *= 2

        logger.error("Dhan OptionChain failed after %d attempts for instrument %s", attempts, underlying_scrip_id)
        return {"error": True, "message": "Dhan optionchain failed after retries."}
