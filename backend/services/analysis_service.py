# backend/services/analysis_service.py
import logging
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from models import OptionData


def calculate_key_levels(db: Session, symbol: str) -> dict:
    """
    Calculates PCR, Max OI Call Strike, and Max OI Put Strike.
    """
    try:
        # 1. Calculate PCR
        puts_oi_query = db.query(func.sum(OptionData.oi)).filter(
            OptionData.symbol == symbol,
            OptionData.option_type == 'PE'
        )
        total_puts_oi = puts_oi_query.scalar() or 0
        
        calls_oi_query = db.query(func.sum(OptionData.oi)).filter(
            OptionData.symbol == symbol,
            OptionData.option_type == 'CE'
        )
        total_calls_oi = calls_oi_query.scalar() or 0

        pcr = round(total_puts_oi / total_calls_oi, 2) if total_calls_oi > 0 else 0.0

        # 2. Find Max OI Call Strike 
        max_call = db.query(OptionData.strike_price, func.sum(OptionData.oi).label('total_oi')) \
            .filter(OptionData.symbol == symbol, OptionData.option_type == 'CE') \
            .group_by(OptionData.strike_price) \
            .order_by(desc('total_oi')) \
            .first()
        
        # 3. Find Max OI Put Strike 
        max_put = db.query(OptionData.strike_price, func.sum(OptionData.oi).label('total_oi')) \
            .filter(OptionData.symbol == symbol, OptionData.option_type == 'PE') \
            .group_by(OptionData.strike_price) \
            .order_by(desc('total_oi')) \
            .first()

        return {
            "pcr": pcr,
            "max_oi_call_strike": max_call[0] if max_call else 0.0,
            "max_oi_put_strike": max_put[0] if max_put else 0.0,
            "total_call_oi": int(total_calls_oi), 
            "total_put_oi": int(total_puts_oi)    
        }

    except Exception as e:
        logging.error(f"Error calculating key levels: {e}")
        return {
            "pcr": 0.0, 
            "max_oi_call_strike": 0.0, 
            "max_oi_put_strike": 0.0,
            "total_call_oi": 0, 
            "total_put_oi": 0     
        }

