# backend/services/ai_analyzer.py
import logging
import os
import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy import func  # Import func
from models import OptionData

# Configure the Gemini API
try:
    # Make sure you've added GEMINI_API_KEY to your .env file
    GOOGLE_API_KEY = os.getenv('GEMINI_API_KEY')
    if not GOOGLE_API_KEY:
        raise ValueError("GEMINI_API_KEY not found in .env file. Please add it.")
    
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    logging.info("Gemini AI model configured successfully.")
except Exception as e:
    logging.error(f"Failed to configure Gemini API: {e}")
    model = None


def calculate_pcr(db: Session, symbol: str) -> float:
    """Calculates the Put-Call Ratio (PCR) based on Open Interest."""
    try:
        # Query to get total Put OI
        total_puts_oi = db.query(func.sum(OptionData.oi)).filter(
            OptionData.symbol == symbol,
            OptionData.option_type == 'PE'
        ).scalar() or 0
        
        # Query to get total Call OI
        total_calls_oi = db.query(func.sum(OptionData.oi)).filter(
            OptionData.symbol == symbol,
            OptionData.option_type == 'CE'
        ).scalar() or 0

        if total_calls_oi == 0:
            return 0.0
            
        pcr = total_puts_oi / total_calls_oi
        return round(pcr, 2)
    except Exception as e:
        logging.error(f"Error calculating PCR: {e}")
        return 0.0


def get_market_sentiment_insight(symbol: str, pcr: float) -> str:
    """Gets a human-readable insight from the Gemini API."""
    
    prompt = f"""
    You are a concise Indian stock market analyst.
    The current symbol is {symbol}.
    The current Put-Call Ratio (based on Open Interest) is {pcr}.

    Based *only* on this PCR value, provide a one-sentence market sentiment insight.
    - A PCR > 1.0 indicates a bearish sentiment (more puts).
    - A PCR < 0.7 indicates a bullish sentiment (more calls).
    - A PCR between 0.7 and 1.0 is considered neutral.

    Example: "Bearish sentiment detected, as put open interest is significantly higher than call open interest."
    Example: "Bullish sentiment detected, with call open interest dominating puts."
    Example: "Market sentiment appears neutral, with a balanced Put-Call Ratio."
    
    Return only the single sentence of analysis.
    """
    
    # --- Fallback logic in case AI fails ---
    def get_fallback_insight(pcr_val):
        if pcr_val > 1.0:
            return "Bearish sentiment detected based on high Put-Call Ratio."
        elif pcr_val < 0.7:
            return "Bullish sentiment detected based on low Put-Call Ratio."
        else:
            return "Neutral sentiment detected based on Put-Call Ratio."
    # ------------------------------------

    if not model:
        logging.warning("Gemini model not available. Using fallback logic.")
        return get_fallback_insight(pcr)

    try:
        response = model.generate_content(prompt)
        return response.text.strip().replace("\"", "")
    except Exception as e:
        logging.error(f"Gemini API error: {e}. Using fallback logic.")
        return get_fallback_insight(pcr)

