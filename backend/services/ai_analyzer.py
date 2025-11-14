# backend/services/ai_analyzer.py
import logging
import os
import google.generativeai as genai


# Configure the Gemini API
try:
    GOOGLE_API_KEY = os.getenv('GEMINI_API_KEY')
    if not GOOGLE_API_KEY:
        raise ValueError("GEMINI_API_KEY not found in .env file.")
    
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    logging.info("Gemini AI model configured successfully.")
except Exception as e:
    logging.error(f"Failed to configure Gemini API: {e}")
    model = None


def get_market_sentiment_insight(symbol: str, pcr: float, max_oi_call: float, max_oi_put: float) -> str:
    """
    Gets a detailed, human-readable insight from the Gemini API
    based on multiple data points.
    """
    
    # --- This is our new, much smarter prompt ---
    prompt = f"""
    You are a senior options analyst for an Indian retail trading platform.
    Your goal is to provide a concise, 2-sentence insight based on the data provided.
    Be clear and confident. Do not use markdown.



    Data:

    - Symbol: {symbol}

    - Put-Call Ratio (OI): {pcr}

    - Max OI Call Strike (Strong Resistance): {max_oi_call}

    - Max OI Put Strike (Strong Support): {max_oi_put}



    Analysis Rules:

    1.  Analyze the PCR: > 1.0 is bearish, < 0.7 is bullish, 0.7-1.0 is neutral.

    2.  Analyze the OI levels: The market is expected to trade *between* the support (Max Put) and resistance (Max Call) levels.

    3.  Synthesize both into a 2-sentence insight.



    Example 1:

    Data: PCR=0.7, Max Call=25000, Max Put=24500

    Insight: Overall sentiment appears bullish, with call writers dominating. The key range to watch is between the 24,500 support level and the 25,000 resistance, where maximum open interest is concentrated.



    Example 2:

    Data: PCR=1.3, Max Call=25000, Max Put=24800

    Insight: Market sentiment is currently bearish, with significant put open interest. Expect the price to face strong resistance at 25,000, with a support base forming around 24,800.



    Now, analyze the following data and provide only the 2-sentence insight:

    """
    
    # --- Fallback logic in case AI fails ---
    def get_fallback_insight():
        pcr_text = "neutral"
        if pcr > 1.0: pcr_text = "bearish"
        if pcr < 0.7: pcr_text = "bullish"
        
        return (
            f"Overall market sentiment appears {pcr_text} (PCR: {pcr}). "
            f"Watch for strong resistance at the {max_oi_call} strike and support at the {max_oi_put} strike."
        )
    # ------------------------------------



    if not model:
        logging.warning("Gemini model not available. Using fallback logic.")
        return get_fallback_insight()


    try:
        response = model.generate_content(prompt)
        return response.text.strip().replace("\"", "").replace("*", "")
    except Exception as e:
        logging.error(f"Gemini API error: {e}. Using fallback logic.")
        return get_fallback_insight()
