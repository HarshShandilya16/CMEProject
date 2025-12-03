import os
import time
import logging
from typing import Any, Dict, Optional, List
import requests
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


# -----------------------------
# REALISTIC HIGH-QUALITY MOCK DATA
# -----------------------------

def generate_realistic_mock_chain() -> Dict[str, Any]:
    """
    Generates a realistic option chain with:
    - 3 expiries (weekly, next weekly, monthly)
    - 11 strikes around ATM (19500)
    - Realistic OI, LTP, IV, volume patterns
    """

    underlying = 19500.0
    now = datetime.utcnow()
    current_expiry = now + timedelta(days=(3 - now.weekday()))      # this Thursday
    next_expiry = current_expiry + timedelta(days=7)
    monthly_expiry = (now.replace(day=28) + timedelta(days=4))       # next month end
    monthly_expiry = monthly_expiry - timedelta(days=monthly_expiry.day)  # last day

    expiries = [
        current_expiry.strftime("%d-%b-%Y"),
        next_expiry.strftime("%d-%b-%Y"),
        monthly_expiry.strftime("%d-%b-%Y"),
    ]

    strikes = [underlying + i for i in range(-500, 501, 100)]  # 19000 → 20000

    mock_data_for_expiry: List[Dict[str, Any]] = []

    for expiry in expiries:
        for strike in strikes:

            distance = abs(strike - underlying)

            # --- CE behaviour ---
            ce_iv = 16 + (distance / 200) * 2     # IV rises OTM
            ce_volume = max(80, 500 - distance)   # highest near ATM
            ce_oi = max(800, 4000 - distance * 2)
            ce_ltp = max(5.0, 220 - distance * 0.8)

            # --- PE behaviour ---
            pe_iv = 18 + (distance / 180) * 2.5   # PE skew slightly higher
            pe_volume = max(70, 480 - distance)
            pe_oi = max(900, 3800 - distance * 2.1)
            pe_ltp = max(8.0, 240 - distance * 0.85)

            # Random-like OI change based on ITM/OTM nature
            ce_coi = int(ce_oi * 0.03 * (1 if strike >= underlying else -1))
            pe_coi = int(pe_oi * 0.03 * (1 if strike <= underlying else -1))

            mock_data_for_expiry.append({
                "strikePrice": strike,
                "expiryDate": expiry,
                "CE": {
                    "lastPrice": round(ce_ltp, 2),
                    "openInterest": int(ce_oi),
                    "changeinOpenInterest": ce_coi,
                    "totalTradedVolume": int(ce_volume),
                    "impliedVolatility": round(ce_iv, 2),
                },
                "PE": {
                    "lastPrice": round(pe_ltp, 2),
                    "openInterest": int(pe_oi),
                    "changeinOpenInterest": pe_coi,
                    "totalTradedVolume": int(pe_volume),
                    "impliedVolatility": round(pe_iv, 2),
                }
            })

    return {
        "records": {
            "underlyingValue": underlying,
            "timestamp": now.strftime("%d-%b-%Y %H:%M:%S"),
            "data": mock_data_for_expiry,
        }
    }


MOCK_OPTION_CHAIN = generate_realistic_mock_chain()


# -----------------------------
# DHAN PROVIDER
# -----------------------------

class DhanDataProvider:
    """
    DhanHQ Option Chain provider with DEMO fallback.
    If DHAN_CLIENT_ID or DHAN_ACCESS_TOKEN are missing or start with 'DEMO',
    the provider returns realistic mock data.
    """

    def __init__(self):
        self.api_base = os.getenv("DHAN_API_BASE", "https://api.dhan.co/v2")
        self.client_id = os.getenv("DHAN_CLIENT_ID")
        self.access_token = os.getenv("DHAN_ACCESS_TOKEN")
        self.rate_limit_sec = float(os.getenv("DHAN_RATE_LIMIT_SEC", "3.0"))
        self._last_call_ts = 0.0
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

        self._is_demo = (
            not self.client_id or not self.access_token or
            self.client_id.startswith("DEMO") or
            self.access_token.startswith("DEMO")
        )

        if self._is_demo:
            logger.info("DhanDataProvider running in DEMO mode (mock data). Replace DHAN_* env variables after KYC.")

    def _headers(self) -> Dict[str, str]:
        return {
            "access-token": self.access_token or "",
            "client-id": str(self.client_id or ""),
        }

    def _respect_rate_limit(self):
        elapsed = time.time() - self._last_call_ts
        if elapsed < self.rate_limit_sec:
            time.sleep(self.rate_limit_sec - elapsed)

    def get_option_chain_by_instrument(
        self,
        underlying_scrip_id: int,
        underlying_seg: str = "IDX_I",
        expiry: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        If in DEMO mode → return realistic mock chain.
        Otherwise → call DhanHQ /optionchain endpoint.
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

        self._respect_rate_limit()

        backoff = 0.5
        attempts = 4
        for attempt in range(1, attempts + 1):
            try:
                resp = self.session.post(url, json=payload, headers=self._headers(), timeout=20)
                self._last_call_ts = time.time()
                resp.raise_for_status()
                return resp.json()
            except requests.HTTPError as he:
                status = getattr(he.response, "status_code", None)
                if status and 400 <= status < 500:
                    break
            except Exception:
                pass
            time.sleep(backoff)
            backoff *= 2

        return {"error": True, "message": "Dhan optionchain failed after retries."}
