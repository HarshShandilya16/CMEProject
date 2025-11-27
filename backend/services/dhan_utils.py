# backend/services/dhan_utils.py
import os
import logging
import requests
from typing import Dict
from functools import lru_cache

logger = logging.getLogger(__name__)

DHAN_BASE = os.getenv("DHAN_API_BASE", "https://api.dhan.co/v2")
CLIENT_ID = os.getenv("DHAN_CLIENT_ID")
ACCESS_TOKEN = os.getenv("DHAN_ACCESS_TOKEN")


def _headers():
    return {"access-token": ACCESS_TOKEN or "", "client-id": str(CLIENT_ID or "")}


@lru_cache(maxsize=1)
def fetch_instrument_list() -> Dict[str, int]:
    """
    Fetch instrument list from Dhan and return mapping { SYMBOL: instrument_id }.
    If credentials are demo/missing, return a small demo mapping for common symbols.
    """
    demo_mode = (not CLIENT_ID or not ACCESS_TOKEN) or CLIENT_ID.startswith("DEMO")

    if demo_mode:
        logger.info("fetch_instrument_list: DEMO mode, returning demo mapping.")
        # Demo mapping (instrument ids are arbitrary sample ints)
        return {
            "NIFTY": 999990,
            "BANKNIFTY": 999991,
            "FINNIFTY": 999992,
            "RELIANCE": 500101,
            "TCS": 500102
        }

    try:
        url = f"{DHAN_BASE}/instruments"
        resp = requests.get(url, headers=_headers(), timeout=30)
        resp.raise_for_status()
        data = resp.json()

        mapping: Dict[str, int] = {}
        if isinstance(data, dict) and data.get("data"):
            items = data.get("data")
        else:
            items = data

        for item in items:
            sym = (item.get("symbol") or item.get("tradingsymbol") or item.get("instrumentName") or "").upper()
            inst_id = item.get("id") or item.get("instrumentToken") or item.get("instrument_id")
            if sym and inst_id:
                try:
                    mapping[sym] = int(inst_id)
                except Exception:
                    continue

        logger.info("Fetched %d instruments from Dhan (cached)", len(mapping))
        return mapping
    except Exception as e:
        logger.error("Failed to fetch instrument list from Dhan: %s", e)
        return {}
