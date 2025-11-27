# backend/services/financial_calcs.py
import logging
from sqlalchemy.orm import Session
from models import OptionData
from sqlalchemy import func
import yfinance as yf
import numpy as np


# ---Max Pain---
def calculate_max_pain(db: Session, symbol: str) -> float:
    try:
        options = db.query(OptionData.strike_price, OptionData.oi, OptionData.option_type).filter(
            OptionData.symbol == symbol
        ).all()
        if not options: return 0.0
        strike_prices = sorted(list(set([opt.strike_price for opt in options])))
        total_value_at_strike = []
        for expiry_price in strike_prices:
            current_strike_total_value = 0
            for opt in options:
                if opt.option_type == 'CE':
                    value = max(0, expiry_price - opt.strike_price) * opt.oi
                    current_strike_total_value += value
                elif opt.option_type == 'PE':
                    value = max(0, opt.strike_price - expiry_price) * opt.oi
                    current_strike_total_value += value
            total_value_at_strike.append((expiry_price, current_strike_total_value))
        max_pain_strike, min_value = min(total_value_at_strike, key=lambda x: x[1])
        return max_pain_strike
    except Exception as e:
        logging.error(f"Error calculating Max Pain: {e}")
        return 0.0


# ---REALIZED VOLATILITY ---
def get_realized_volatility(symbol: str) -> float:
    """
    Fetches 35 days of historical data and calculates
    the annualized 30-day realized volatility.
    """
    try:
        
        if symbol == 'NIFTY':
            ticker_str = '^NSEI'
        elif symbol == 'BANKNIFTY':
            ticker_str = '^NSEBANK'
        elif symbol == 'FINNIFTY':
            ticker_str = '^NSEBANK' 
        else:
            return 0.0

        
        ticker = yf.Ticker(ticker_str)
        hist = ticker.history(period="35d")
        
        if hist.empty:
            logging.warning(f"yfinance returned no data for {ticker_str}")
            return 0.0

        #2.Daily kitna change aa rha uska percentage
        hist['log_return'] = np.log(hist['Close'] / hist['Close'].shift(1))
        
        #last 30 days ka standard deviation
        realized_vol = hist['log_return'].tail(30).std() * np.sqrt(252)
        
        return round(realized_vol * 100, 2) # Return as a percentage (e.g., 16.2)

    except Exception as e:
        logging.error(f"Error calculating Realized Volatility: {e}")
        return 0.0


# ---IMPLIED VOLATILITY---
def get_implied_volatility(db: Session, symbol: str) -> float:
    """
    Finds the average Implied Volatility from our database.
    (A simple average of all options for this symbol)
    """
    try:
        # IV col we are fetching and then finding the average
        avg_iv = db.query(func.avg(OptionData.iv)).filter(
            OptionData.symbol == symbol,
            OptionData.iv > 0 # Ignore 0 values
        ).scalar()
        
       
        return round((avg_iv or 0.0), 2) 
    except Exception as e:
        logging.error(f"Error calculating Implied Volatility: {e}")
        return 0.0
