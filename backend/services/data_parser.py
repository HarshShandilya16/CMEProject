# backend/services/data_parser.py
from models import StockData, OptionData
from datetime import datetime
import logging 
import pytz 
import math
from scipy.stats import norm

# --- HELPER FUNCTIONS ---
def safe_float(val, default=0.0):
    if isinstance(val, (int, float)): return float(val)
    if isinstance(val, str):
        val = val.replace(',', '')
        if val not in ['-', 'N/A', '', 'null', 'None']:
            try: return float(val)
            except ValueError: return default
    return default

def safe_int(val, default=0):
    if isinstance(val, (int, float)): return int(val)
    if isinstance(val, str):
        val = val.replace(',', '')
        if val not in ['-', 'N/A', '', 'null', 'None']:
            try: return int(val)
            except ValueError: return default
    return default


# --- BLACK-SCHOLES GREEKS CALCULATION ---
def calculate_greeks(S, K, T, R, IV, option_type):
    """
    Robust Black-Scholes Calculator.
    Returns standard Python floats (no numpy types) to prevent SQL errors.
    """
    try:
        # 1. Validation: We need Spot, Strike, and Volatility to calculate anything
        if S <= 0 or K <= 0 or IV <= 0:
            return {'delta': 0.0, 'gamma': 0.0, 'theta': 0.0, 'vega': 0.0}
        
        # 2. Handle Expiry Day (T=0)
        # If Time is exactly 0, the math will divide by zero. 
        # We set it to a tiny fraction (approx 1 minute) to allow calculation.
        if T <= 0.00001:
            T = 0.00001 
        
        # 3. Standardize IV (Percentage vs Decimal)
        # NSE usually sends IV as 15.5 (percent), we need 0.155 (decimal)
        sigma = IV / 100.0 if IV > 1 else IV
        
        sqrt_T = math.sqrt(T)
        
        # 4. The Math
        d1 = (math.log(S / K) + (R + 0.5 * sigma ** 2) * T) / (sigma * sqrt_T)
        d2 = d1 - sigma * sqrt_T
        
        N_d1 = norm.cdf(d1)
        N_d2 = norm.cdf(d2)
        n_d1 = norm.pdf(d1)
        
        if option_type == 'CE':
            delta_val = N_d1
            theta_val = (
                -(S * n_d1 * sigma) / (2 * sqrt_T) 
                - R * K * math.exp(-R * T) * N_d2
            ) / 365.0
        else:
            delta_val = N_d1 - 1
            theta_val = (
                -(S * n_d1 * sigma) / (2 * sqrt_T) 
                + R * K * math.exp(-R * T) * norm.cdf(-d2)
            ) / 365.0
        
        gamma_val = n_d1 / (S * sigma * sqrt_T)
        vega_val = S * n_d1 * sqrt_T / 100.0
        
        # --- CRITICAL FIX FOR DB ---
        # Explicitly convert numpy.float64 to python float() 
        return {
            'delta': float(round(delta_val, 4)),
            'gamma': float(round(gamma_val, 6)),
            'theta': float(round(theta_val, 2)),
            'vega': float(round(vega_val, 2)),
        }
        
    except Exception as e:
        # Log specific math errors if they happen
        logging.debug(f"Math Error for {option_type} {K}: {e}")
        return {'delta': 0.0, 'gamma': 0.0, 'theta': 0.0, 'vega': 0.0}


# --- MAIN PARSER FUNCTION ---
def parse_option_chain_data(symbol: str, raw_data: dict) -> tuple:
    try:
        records = raw_data.get('records', {})
        data_list = records.get('data', [])
        
        # --- FIX 1: ROBUST SPOT PRICE EXTRACTION ---
        # Try the main header first
        underlying_value = safe_float(records.get('underlyingValue'))
        
        # Fallback: If header is 0/Missing, look inside the first option packet
        if underlying_value <= 0 and data_list:
            first_entry = data_list[0]
            if 'CE' in first_entry and safe_float(first_entry['CE'].get('underlyingValue')) > 0:
                underlying_value = safe_float(first_entry['CE']['underlyingValue'])
            elif 'PE' in first_entry and safe_float(first_entry['PE'].get('underlyingValue')) > 0:
                underlying_value = safe_float(first_entry['PE']['underlyingValue'])
        
        if underlying_value <= 0:
            logging.error(f"Could not find Underlying Value for {symbol}. Greeks will be 0.")
            # We continue anyway to at least return Price/OI data

        # Timestamp logic
        timestamp_str = records.get('timestamp')
        ist_timezone = pytz.timezone("Asia/Kolkata")
        
        if timestamp_str:
            naive_datetime = datetime.strptime(timestamp_str, '%d-%b-%Y %H:%M:%S')
            data_timestamp = ist_timezone.localize(naive_datetime)
        else:
            data_timestamp = datetime.now(ist_timezone)
        
        RISK_FREE_RATE = 0.05  # Standard Risk-free rate
        
        stock_data = StockData(
            symbol=symbol.upper(), 
            underlying_value=underlying_value, 
            timestamp=data_timestamp
        )
        
        options_list = []
        today = data_timestamp.date()
        
        for entry in data_list:
            try:
                expiry_date_str = entry['expiryDate']
                expiry_date = datetime.strptime(expiry_date_str, '%d-%b-%Y').date()
                strike = safe_float(entry['strikePrice'])
                
                # Time Calculation
                delta_days = (expiry_date - today).days
                
                # Skip EXPIRED options (negative days), but keep TODAY (0 days)
                if delta_days < 0:
                    continue
                
                T_years = delta_days / 365.0
                
                # Loop through both Call (CE) and Put (PE)
                for type_key in ['CE', 'PE']:
                    if type_key in entry:
                        opt_data = entry[type_key]
                        
                        iv = safe_float(opt_data.get('impliedVolatility'))
                        last_price = safe_float(opt_data.get('lastPrice'))
                        
                        # --- FIX 2: HANDLE MISSING IV ---
                        # Use actual IV for calculation, but fallback to 15% if IV is 0 
                        # just to ensure the Greeks graph isn't empty for illiquid strikes.
                        calc_iv = iv
                        if calc_iv <= 0:
                            calc_iv = 15.0 # Visual Fallback
                        
                        # Calculate Greeks using valid params
                        if underlying_value > 0:
                            greeks = calculate_greeks(
                                S=underlying_value, 
                                K=strike, 
                                T=T_years, 
                                R=RISK_FREE_RATE, 
                                IV=calc_iv, 
                                option_type=type_key
                            )
                        else:
                            greeks = {'delta': 0, 'gamma': 0, 'theta': 0, 'vega': 0}
                        
                        options_list.append(OptionData(
                            oi_change=safe_int(opt_data.get('changeinOpenInterest')),
                            symbol=symbol.upper(),
                            expiry_date=expiry_date,
                            strike_price=strike,
                            option_type=type_key,
                            last_price=last_price,
                            iv=iv,  # Store REAL IV in DB (even if 0)
                            oi=safe_int(opt_data.get('openInterest')),
                            volume=safe_int(opt_data.get('totalTradedVolume')),
                            delta=greeks['delta'],
                            gamma=greeks['gamma'],
                            theta=greeks['theta'],
                            vega=greeks['vega'],
                            timestamp=data_timestamp
                        ))
                        
            except Exception as e:
                continue
        
        logging.info(f"Parsed {symbol}: {len(options_list)} options processed. Spot: {underlying_value}")
        return (stock_data, options_list)
        
    except Exception as e:
        logging.error(f"Critical error parsing data for {symbol}: {e}", exc_info=True)
        return (None, [])