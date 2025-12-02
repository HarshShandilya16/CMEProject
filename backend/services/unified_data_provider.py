import logging
from typing import Dict, Any, Optional
from services.data_provider import DataProvider as NSEDataProvider
from services.data_provider_dhan import DhanDataProvider
from services.dhan_utils import fetch_instrument_list

logger = logging.getLogger(__name__)

class UnifiedDataProvider:
    """
    Manages data fetching with support for multiple sources (DhanHQ API, NSE Scraper)
    and automatic fallback logic.
    """
    
    SOURCE_DHAN = "DHAN"
    SOURCE_SCRAPER = "SCRAPER"
    SOURCE_AUTO = "AUTO"
    
    def __init__(self):
        self.dhan_provider = DhanDataProvider()
        self.nse_provider = NSEDataProvider()
        self.preference = self.SOURCE_AUTO
        self.instrument_map = {}
        
    def set_preference(self, preference: str):
        """
        Set the preferred data source.
        :param preference: "DHAN", "SCRAPER", or "AUTO"
        """
        if preference.upper() in [self.SOURCE_DHAN, self.SOURCE_SCRAPER, self.SOURCE_AUTO]:
            self.preference = preference.upper()
            logger.info(f"Data source preference set to: {self.preference}")
        else:
            logger.warning(f"Invalid preference: {preference}. Keeping current: {self.preference}")

    def get_preference(self) -> str:
        return self.preference

    def _get_dhan_data(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Helper to fetch from Dhan. Handles symbol mapping.
        """
        # Refresh map if empty or symbol not found (simple retry logic could be added)
        if not self.instrument_map:
            self.instrument_map = fetch_instrument_list()
            
        # Dhan needs scrip_id
        scrip_id = self.instrument_map.get(symbol.upper())
        
        if not scrip_id:
            # Try refreshing map once if symbol missing
            logger.info(f"Symbol {symbol} not found in Dhan map. Refreshing list...")
            self.instrument_map = fetch_instrument_list()
            scrip_id = self.instrument_map.get(symbol.upper())
            
        if not scrip_id:
            logger.error(f"Could not find Dhan scrip_id for {symbol}")
            return None
            
        # Determine segment (Indices vs Equities)
        # Dhan uses "IDX_I" for indices, "NSE_FNO" for stock options? 
        # data_provider_dhan.py defaults to "IDX_I".
        # We need to distinguish.
        # Common indices: NIFTY, BANKNIFTY, FINNIFTY
        is_index = symbol.upper() in ["NIFTY", "BANKNIFTY", "FINNIFTY"]
        seg = "IDX_I" if is_index else "NSE_FNO"
        
        return self.dhan_provider.get_option_chain_by_instrument(scrip_id, seg)

    def get_option_chain(self, symbol: str) -> Dict[str, Any]:
        """
        Fetch option chain based on preference and fallback logic.
        """
        symbol = symbol.upper()
        
        # Strategy:
        # 1. If SCRAPER: Try Scraper.
        # 2. If DHAN or AUTO: Try Dhan -> Fallback to Scraper.
        
        if self.preference == self.SOURCE_SCRAPER:
            return self.nse_provider.get_option_chain(symbol)
            
        # Default / Dhan path
        data = self._get_dhan_data(symbol)
        
        # Check if Dhan succeeded
        if data and not data.get("error"):
            return data
            
        logger.warning(f"Dhan fetch failed for {symbol}. Falling back to Scraper...")
        
        # Fallback
        return self.nse_provider.get_option_chain(symbol)