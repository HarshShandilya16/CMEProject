from models import StockData, OptionData
from datetime import datetime
import logging  # <-- This was missing
import pytz 

# --- (Your helper functions are perfect, no changes) ---
def safe_float(val, default=0.0):
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        val = val.replace(',', '')
        if val not in ['-', 'N/A', '']:
            try:
                return float(val)
            except ValueError:
                return default
    return default

def safe_int(val, default=0):
    if isinstance(val, (int, float)):
        return int(val)
    if isinstance(val, str):
        val = val.replace(',', '')
        if val not in ['-', 'N/A', '']:
            try:
                return int(val)
            except ValueError:
                return default
    return default
# --- (End of helper functions) ---


def parse_option_chain_data(symbol: str, raw_data: dict) -> tuple:
    try:
        underlying_value = safe_float(raw_data['records']['underlyingValue'])
        timestamp_str = raw_data['records']['timestamp'] # Example: '06-Nov-2025 15:30:00'
        
        # --- THIS IS THE TIME ZONE FIX ---
        # 1. Define the Indian Standard Time (IST) timezone
        ist_timezone = pytz.timezone("Asia/Kolkata")
        
        # 2. Parse the naive datetime string
        naive_datetime = datetime.strptime(timestamp_str, '%d-%b-%Y %H:%M:%S')
        
        # 3. Localize the naive datetime, telling Python it's an IST time
        data_timestamp = ist_timezone.localize(naive_datetime)
        # --- END OF TIME ZONE FIX ---

        stock_data = StockData(
            symbol=symbol.upper(), 
            underlying_value=underlying_value, 
            timestamp=data_timestamp  # This now has the correct timezone
        )
        
        options_list = []
        raw_option_data = raw_data.get('records', {}).get('data', [])
        
        for entry in raw_option_data:
            try:
                expiry_date_str = entry['expiryDate']
                expiry_date = datetime.strptime(expiry_date_str, '%d-%b-%Y').date()
                strike = safe_float(entry['strikePrice'])
                
                if 'CE' in entry:
                    ce = entry['CE']
                    options_list.append(OptionData(
                        symbol=symbol.upper(),
                        expiry_date=expiry_date,
                        strike_price=strike,
                        option_type='CE',
                        last_price=safe_float(ce.get('lastPrice')),
                        iv=safe_float(ce.get('impliedVolatility')),
                        oi=safe_int(ce.get('openInterest')),
                        volume=safe_int(ce.get('totalTradedVolume')),
                        delta=safe_float(ce.get('delta'), default=0.0),
                        gamma=safe_float(ce.get('gamma'), default=0.0),
                        theta=safe_float(ce.get('theta'), default=0.0),
                        vega=safe_float(ce.get('vega'), default=0.0),
                        timestamp=data_timestamp  # Use the correct, localized timestamp
                    ))
                
                if 'PE' in entry:
                    pe = entry['PE']
                    options_list.append(OptionData(
                        symbol=symbol.upper(),
                        expiry_date=expiry_date,
                        strike_price=strike,
                        option_type='PE',
                        last_price=safe_float(pe.get('lastPrice')),
                        iv=safe_float(pe.get('impliedVolatility')),
                        oi=safe_int(pe.get('openInterest')),
                        volume=safe_int(pe.get('totalTradedVolume')),
                        delta=safe_float(pe.get('delta'), default=0.0),
                        gamma=safe_float(pe.get('gamma'), default=0.0),
                        theta=safe_float(pe.get('theta'), default=0.0),
                        vega=safe_float(pe.get('vega'), default=0.0),
                        timestamp=data_timestamp  # Use the correct, localized timestamp
                    ))
            except Exception as e:
                logging.warning(f"Skipping one entry due to parse error: {e}. Entry: {entry}")
        
        return (stock_data, options_list)
    except Exception as e:
        logging.error(f"Critical error parsing data: {e}. Raw data: {raw_data.get('records', {}).get('timestamp', 'No Timestamp')}")
        return (None, [])