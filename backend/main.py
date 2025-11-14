# backend/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from database import get_db, engine
from models import OptionData, StockData, Base
from services.ingestion import fetch_and_store
from services.ai_analyzer import get_market_sentiment_insight
from services.analysis_service import calculate_key_levels
from services.financial_calcs import calculate_max_pain, get_realized_volatility, get_implied_volatility
import logging
import os
from dotenv import load_dotenv
import threading  # <--- IMPORT THIS
import yfinance as yf
from pydantic import BaseModel
from typing import List

# Load .env variables
load_dotenv()

# --- Database & App Initialization ---
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CMEProject Data Pipeline API")

# --- CORS (Cross-Origin Resource Sharing) ---
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(',')

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper for non-blocking startup fetch ---
def run_initial_fetch():
    """
    This function runs our blocking I/O (Playwright) in a separate thread
    so it doesn't kill the FastAPI startup event.
    """
    logging.info("--- (Thread) Starting Initial Data Ingestion ---")
    try:
        fetch_and_store('NIFTY')
        fetch_and_store('BANKNIFTY')
        fetch_and_store('FINNIFTY')
        logging.info("--- (Thread) Initial Data Ingestion Complete ---")
    except Exception as e:
        logging.error(f"Initial data fetch failed in thread: {e}")

# --- Background Scheduler ---
scheduler = BackgroundScheduler(daemon=True)
scheduler.add_job(fetch_and_store, 'interval', seconds=60, args=['NIFTY'], id='job_nifty')
scheduler.add_job(fetch_and_store, 'interval', seconds=60, args=['BANKNIFTY'], id='job_banknifty')
scheduler.add_job(fetch_and_store, 'interval', seconds=60, args=['FINNIFTY'], id='job_finnifty')


@app.on_event("startup")
def startup_event():
    logging.info("--- Starting Data Ingestion Pipeline (in background thread) ---")
    
    # Run the blocking fetch_and_store calls in a separate thread
    # This "fires and forgets", unblocking the main server
    threading.Thread(target=run_initial_fetch).start()
    
    logging.info("Starting background scheduler...")
    scheduler.start()  # This is non-blocking and fine


@app.on_event("shutdown")
def shutdown_event():
    logging.info("Shutting down scheduler...")
    scheduler.shutdown()


# --- Pydantic Models ---
class ChartData(BaseModel):
    time: str
    price: float


class HistoricalResponse(BaseModel):
    symbol: str
    data: List[ChartData]


class SentimentResponse(BaseModel):
    symbol: str
    pcr: float
    detailed_insight: str


class OpenInterestResponse(BaseModel):
    symbol: str
    total_call_oi: int
    total_put_oi: int


class VolatilitySpreadResponse(BaseModel):
    symbol: str
    implied_volatility: float
    realized_volatility: float
    spread: float


# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"message": "Data Pipeline is running."}


@app.get("/api/v1/option-chain/{symbol}")
def get_option_chain(symbol: str, db: Session = Depends(get_db)):
    """
    This is the main endpoint for the frontend.
    It queries our database, not the NSE.
    """
    try:
        symbol = symbol.upper()
        
        # 1. Get the latest stock data
        stock_data = db.query(StockData).filter(StockData.symbol == symbol).first()
        
        if not stock_data:
            return {"error": f"Symbol not found. Is the initial data fetch complete?"}
        
        # 2. Get all option legs for that symbol
        # This data is fresh because our scheduler is running
        option_legs = db.query(OptionData).filter(OptionData.symbol == symbol).all()
        
        if not option_legs:
            return {"error": f"Stock data found, but no option chain data for {symbol}."}
        
        # 3. Format the data to match the frontend 'types.ts' contract
        return {
            "symbol": stock_data.symbol,
            "underlyingPrice": stock_data.underlying_value,
            "timestamp": stock_data.timestamp.isoformat(),  # Get the data's timestamp
            "expiryDate": option_legs[0].expiry_date.isoformat(),  # Assume all have same expiry for this pull
            "legs": [
                {
                    "oi_change": leg.oi_change,
                    "strike": leg.strike_price,
                    "type": leg.option_type,
                    "lastPrice": leg.last_price,
                    "iv": leg.iv,
                    "oi": leg.oi,
                    "volume": leg.volume,
                    "delta": leg.delta,
                    "gamma": leg.gamma,
                    "theta": leg.theta,
                    "vega": leg.vega,
                } for leg in option_legs
            ]
        }
    except Exception as e:
        logging.error(f"Error in get_option_chain for {symbol}: {e}")
        return {"error": "An internal server error occurred."}


@app.get("/api/v1/historical-price/{symbol}", response_model=HistoricalResponse)
def get_historical_price(symbol: str):
    """
    Fetches 30 days of historical price data for a symbol.
    """
    symbol = symbol.upper()
    ticker_str = ""
    
    # Map our app symbols to yfinance tickers
    if symbol == 'NIFTY':
        ticker_str = '^NSEI'
    elif symbol == 'BANKNIFTY':
        ticker_str = '^NSEBANK'
    elif symbol == 'FINNIFTY':
        ticker_str = '^NSEBANK'  # yfinance doesn't have FINNIFTY, use BANKNIFTY as a proxy
    else:
        return {"error": "Invalid symbol for historical data"}
    
    try:
        ticker = yf.Ticker(ticker_str)
        hist = ticker.history(period="30d")
        
        if hist.empty:
            return {"error": "No historical data found for symbol"}
        
        # Reset index to make 'Date' a column
        hist = hist.reset_index()
        
        # Format the data to match the frontend chart's expectation
        chart_data = []
        for index, row in hist.iterrows():
            chart_data.append(ChartData(
                time=row['Date'].strftime('%b %d'),  # Formats date as "Nov 07"
                price=round(row['Close'], 2)
            ))
        
        return HistoricalResponse(symbol=symbol, data=chart_data)
    except Exception as e:
        logging.error(f"Error fetching historical data: {e}")
        return {"error": "Failed to fetch historical data"}


@app.get("/api/v1/sentiment/{symbol}", response_model=SentimentResponse)
def get_market_sentiment(symbol: str, db: Session = Depends(get_db)):
    """
    Calculates key metrics and returns an AI-generated sentiment insight.
    """
    try:
        symbol = symbol.upper()

        # 1. Calculate all key levels from our new service
        levels = calculate_key_levels(db, symbol)

        # 2. Get AI insight
        insight = get_market_sentiment_insight(
            symbol, 
            levels["pcr"], 
            levels["max_oi_call_strike"], 
            levels["max_oi_put_strike"]
        )

        return SentimentResponse(
            symbol=symbol,
            pcr=levels["pcr"],
            detailed_insight=insight
        )
    except Exception as e:
        logging.error(f"Error in sentiment endpoint: {e}")
        return SentimentResponse(
            symbol=symbol,
            pcr=0.0,
            detailed_insight="Error: Could not calculate sentiment."
        )


@app.get("/api/v1/max-pain/{symbol}")
def get_max_pain(symbol: str, db: Session = Depends(get_db)):
    """
    Calculates and returns the Max Pain strike price.
    """
    try:
        symbol = symbol.upper()
        max_pain_strike = calculate_max_pain(db, symbol)

        if max_pain_strike == 0.0:
             return {"error": "Could not calculate Max Pain, no data."}

        # Also fetch the current price to send to the frontend
        stock_data = db.query(StockData).filter(StockData.symbol == symbol).first()
        current_price = stock_data.underlying_value if stock_data else 0.0

        return {
            "symbol": symbol, 
            "max_pain_strike": max_pain_strike,
            "current_price": current_price
        }
    except Exception as e:
        logging.error(f"Error in max-pain endpoint: {e}")
        return {"error": "Failed to calculate Max Pain."}


@app.get("/api/v1/open-interest/{symbol}", response_model=OpenInterestResponse)
def get_open_interest_summary(symbol: str, db: Session = Depends(get_db)):
    """
    Calculates and returns the total Open Interest for Calls and Puts.
    """
    try:
        symbol = symbol.upper()
        levels = calculate_key_levels(db, symbol) # We re-use our existing function

        return OpenInterestResponse(
            symbol=symbol,
            total_call_oi=levels["total_call_oi"],
            total_put_oi=levels["total_put_oi"]
        )
    except Exception as e:
        logging.error(f"Error in open-interest endpoint: {e}")
        return OpenInterestResponse(symbol=symbol, total_call_oi=0, total_put_oi=0)


@app.get("/api/v1/volatility-spread/{symbol}", response_model=VolatilitySpreadResponse)
def get_vol_spread(symbol: str, db: Session = Depends(get_db)):
    """
    Calculates and returns the IV/RV spread.
    """
    try:
        symbol = symbol.upper()

        # 1. Get IV from our TimescaleDB
        iv = get_implied_volatility(db, symbol)

        # 2. Get RV from yfinance (this is a live, blocking call)
        rv = get_realized_volatility(symbol)

        spread = iv - rv

        return VolatilitySpreadResponse(
            symbol=symbol,
            implied_volatility=iv,
            realized_volatility=rv,
            spread=round(spread, 2)
        )
    except Exception as e:
        logging.error(f"Error in vol-spread endpoint: {e}")
        return VolatilitySpreadResponse(symbol=symbol, implied_volatility=0, realized_volatility=0, spread=0)


