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
from services.news_service import fetch_news
from services.social.aggregator import get_social_buzz
import logging
import os
from dotenv import load_dotenv
import threading 
import time
import yfinance as yf
from pydantic import BaseModel
from typing import List

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CMEProject Data Pipeline API")

# --- CORS ---
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_origin_regex=r"^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION: 35 STOCKS TO TRACK ---
STOCKS_TO_TRACK = [
    # Banks & Finance (10)
    'HDFCBANK', 'ICICIBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK',
    'INDUSINDBK', 'BAJFINANCE', 'BAJAJFINSV', 'BANDHANBNK', 'IDFCFIRSTB',
    
    # IT & Technology (5)
    'TCS', 'INFY', 'HCLTECH', 'WIPRO', 'TECHM',
    
    # Oil, Gas & Power (4)
    'RELIANCE', 'BPCL', 'POWERGRID', 'NTPC',
    
    # FMCG & Consumer (4)
    'ITC', 'HINDUNILVR', 'NESTLEIND', 'BRITANNIA',
    
    # Automobile (3)
    'MARUTI', 'M&M', 'TATAMOTORS',
    
    # Metals & Mining (3)
    'TATASTEEL', 'HINDALCO', 'JSWSTEEL',
    
    # Pharma & Healthcare (2)
    'SUNPHARMA', 'DRREDDY',
    
    # Infrastructure & Cement (2)
    'LT', 'ULTRACEMCO',
    
    # Telecom & Retail (2)
    'BHARTIARTL', 'TITAN',
    
    # Insurance & Financial Services (2)
    'SBILIFE', 'HDFCLIFE'
]

# --- PRIORITY TIERS (For Optimized Loading) ---
# Tier 1: Top 12 High-Impact Stocks (Fetch every 2 minutes)
TIER_1_STOCKS = [
    'HDFCBANK', 'ICICIBANK', 'RELIANCE', 'TCS', 'INFY',
    'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'AXISBANK',
    'KOTAKBANK', 'BAJFINANCE'
]

# Tier 2: Mid-Priority (Fetch every 3 minutes)
TIER_2_STOCKS = [
    'BAJAJFINSV', 'INDUSINDBK', 'HCLTECH', 'WIPRO', 'MARUTI',
    'TATAMOTORS', 'TATASTEEL', 'SUNPHARMA', 'TITAN', 'HINDUNILVR'
]

# Tier 3: Remaining stocks (Fetch every 5 minutes)
TIER_3_STOCKS = [s for s in STOCKS_TO_TRACK if s not in TIER_1_STOCKS and s not in TIER_2_STOCKS]

# --- Helper for PRIORITIZED initial fetch ---
def run_initial_fetch():
    """
    Three-phase loading:
    1. Indices (immediate)
    2. Tier 1 stocks (high priority)
    3. Tier 2 & 3 stocks (background)
    """
    logging.info("=" * 70)
    logging.info("🚀 PHASE 1: Fetching Indices (Priority)")
    logging.info("=" * 70)
    
    try:
        # PHASE 1: Indices (Critical - Load First)
        for symbol in ['NIFTY', 'BANKNIFTY', 'FINNIFTY']:
            logging.info(f"📊 Fetching {symbol}...")
            fetch_and_store(symbol)
        
        logging.info("✅ Indices loaded! Frontend is now ready.\n")
        
        # PHASE 2: Tier 1 Stocks (High Priority - Top 12)
        logging.info("=" * 70)
        logging.info(f"🚀 PHASE 2: Fetching Tier 1 Stocks ({len(TIER_1_STOCKS)} stocks)")
        logging.info("=" * 70)
        
        for i, stock in enumerate(TIER_1_STOCKS, 1):
            logging.info(f"📈 [{i}/{len(TIER_1_STOCKS)}] Fetching {stock}...")
            fetch_and_store(stock)
            time.sleep(1)  # Small delay to avoid rate limiting
        
        logging.info("✅ Tier 1 stocks loaded!\n")
        
        # PHASE 3: Tier 2 Stocks (Mid Priority)
        logging.info("=" * 70)
        logging.info(f"🚀 PHASE 3: Fetching Tier 2 Stocks ({len(TIER_2_STOCKS)} stocks)")
        logging.info("=" * 70)
        
        for i, stock in enumerate(TIER_2_STOCKS, 1):
            logging.info(f"📊 [{i}/{len(TIER_2_STOCKS)}] Fetching {stock}...")
            fetch_and_store(stock)
            time.sleep(1.5)
        
        logging.info("✅ Tier 2 stocks loaded!\n")
        
        # PHASE 4: Tier 3 Stocks (Background Fill)
        logging.info("=" * 70)
        logging.info(f"🚀 PHASE 4: Fetching Tier 3 Stocks ({len(TIER_3_STOCKS)} stocks)")
        logging.info("=" * 70)
        
        for i, stock in enumerate(TIER_3_STOCKS, 1):
            logging.info(f"📊 [{i}/{len(TIER_3_STOCKS)}] Fetching {stock}...")
            fetch_and_store(stock)
            time.sleep(2)
        
        logging.info("=" * 70)
        logging.info("✅ ALL DATA INGESTION COMPLETE!")
        logging.info(f"📊 Total: 3 Indices + {len(STOCKS_TO_TRACK)} Stocks")
        logging.info("=" * 70)
        
    except Exception as e:
        logging.error(f"❌ Initial data fetch failed: {e}")

# --- Background Scheduler ---
scheduler = BackgroundScheduler(daemon=True)

# Schedule Indices (Every 1 minute) - Highest Priority
scheduler.add_job(fetch_and_store, 'interval', seconds=60, args=['NIFTY'], id='job_nifty')
scheduler.add_job(fetch_and_store, 'interval', seconds=60, args=['BANKNIFTY'], id='job_banknifty')
scheduler.add_job(fetch_and_store, 'interval', seconds=60, args=['FINNIFTY'], id='job_finnifty')

# Schedule Tier 1 Stocks (Every 2 minutes)
for stock in TIER_1_STOCKS:
    scheduler.add_job(fetch_and_store, 'interval', seconds=120, args=[stock], id=f'job_{stock.lower()}')

# Schedule Tier 2 Stocks (Every 3 minutes)
for stock in TIER_2_STOCKS:
    scheduler.add_job(fetch_and_store, 'interval', seconds=180, args=[stock], id=f'job_{stock.lower()}')

# Schedule Tier 3 Stocks (Every 5 minutes)
for stock in TIER_3_STOCKS:
    scheduler.add_job(fetch_and_store, 'interval', seconds=300, args=[stock], id=f'job_{stock.lower()}')

@app.on_event("startup")
def startup_event():
    logging.info("=" * 70)
    logging.info("🚀 CME PROJECT DATA PIPELINE STARTING")
    logging.info("=" * 70)
    logging.info(f"📊 Total Symbols: {len(STOCKS_TO_TRACK) + 3}")
    logging.info(f"   └─ Indices: 3 (NIFTY, BANKNIFTY, FINNIFTY)")
    logging.info(f"   └─ Tier 1 Stocks: {len(TIER_1_STOCKS)} (Every 2 min)")
    logging.info(f"   └─ Tier 2 Stocks: {len(TIER_2_STOCKS)} (Every 3 min)")
    logging.info(f"   └─ Tier 3 Stocks: {len(TIER_3_STOCKS)} (Every 5 min)")
    logging.info("=" * 70)
    
    # Start initial fetch in background thread
    threading.Thread(target=run_initial_fetch, daemon=True).start()
    
    # Start scheduler
    logging.info("⏰ Starting background scheduler...")
    scheduler.start()

@app.on_event("shutdown")
def shutdown_event():
    logging.info("🛑 Shutting down scheduler...")
    scheduler.shutdown()

# --- Pydantic Models ---
class ChartData(BaseModel):
    time: str
    price: float
    volume: int

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

class NewsArticle(BaseModel):
    title: str | None = None
    description: str | None = None
    url: str | None = None
    source: str | None = None
    publishedAt: str | None = None
    urlToImage: str | None = None

class NewsResponse(BaseModel):
    symbol: str
    articles: List[NewsArticle]

class SocialBuzzSentiment(BaseModel):
    positive: float
    neutral: float
    negative: float

class SocialBuzzTimelinePoint(BaseModel):
    time: str
    count: int

class SocialBuzzPost(BaseModel):
    source: str
    user: str | None = None
    text: str
    likes: int | None = 0

class SocialBuzzResponse(BaseModel):
    symbol: str
    buzz_score: int
    sources_used: List[str]
    sentiment: SocialBuzzSentiment
    timeline: List[SocialBuzzTimelinePoint]
    top_keywords: List[str]
    top_posts: List[SocialBuzzPost]

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {
        "message": "CME Data Pipeline is running.",
        "tracking": {
            "indices": ["NIFTY", "BANKNIFTY", "FINNIFTY"],
            "tier_1_stocks": TIER_1_STOCKS,
            "tier_2_stocks": TIER_2_STOCKS,
            "tier_3_stocks": TIER_3_STOCKS,
            "total_stocks": len(STOCKS_TO_TRACK),
            "total_symbols": len(STOCKS_TO_TRACK) + 3
        },
        "performance": {
            "indices": "Updates every 60s",
            "tier_1": "Updates every 120s",
            "tier_2": "Updates every 180s",
            "tier_3": "Updates every 300s"
        }
    }

@app.get("/api/v1/option-chain/{symbol}")
def get_option_chain(symbol: str, db: Session = Depends(get_db)):
    try:
        symbol = symbol.upper()
        stock_data = db.query(StockData).filter(StockData.symbol == symbol).first()
        
        if not stock_data:
            return {"error": f"Data for {symbol} is still loading. Please wait 1-2 minutes and refresh."}
        
        option_legs = db.query(OptionData).filter(OptionData.symbol == symbol).all()
        
        if not option_legs:
            return {"error": f"Stock data found, but no option chain for {symbol} yet."}
        
        return {
            "symbol": stock_data.symbol,
            "underlyingPrice": stock_data.underlying_value,
            "timestamp": stock_data.timestamp.isoformat(),
            "expiryDate": option_legs[0].expiry_date.isoformat(),
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
    symbol = symbol.upper()
    ticker_str = ""
    
    if symbol == 'NIFTY':
        ticker_str = '^NSEI'
    elif symbol == 'BANKNIFTY':
        ticker_str = '^NSEBANK'
    elif symbol == 'FINNIFTY':
        ticker_str = '^NSEBANK'
    else:
        ticker_str = f"{symbol}.NS"
    
    try:
        ticker = yf.Ticker(ticker_str)
        hist = ticker.history(period="30d")
        
        if hist.empty:
            logging.warning(f"No historical data found for {symbol} ({ticker_str})")
            return {"symbol": symbol, "data": []}
        
        hist = hist.reset_index()
        chart_data = []
        for index, row in hist.iterrows():
            chart_data.append(ChartData(
                time=row['Date'].strftime('%b %d'),
                price=round(row['Close'], 2),
                volume=int(row['Volume'])
            ))
        
        return HistoricalResponse(symbol=symbol, data=chart_data)
    except Exception as e:
        logging.error(f"Error fetching historical data for {symbol}: {e}")
        return {"symbol": symbol, "data": []}

@app.get("/api/v1/sentiment/{symbol}", response_model=SentimentResponse)
def get_market_sentiment(symbol: str, db: Session = Depends(get_db)):
    try:
        symbol = symbol.upper()
        levels = calculate_key_levels(db, symbol)
        insight = get_market_sentiment_insight(
            symbol, 
            levels["pcr"], 
            levels["max_oi_call_strike"], 
            levels["max_oi_put_strike"]
        )
        return SentimentResponse(symbol=symbol, pcr=levels["pcr"], detailed_insight=insight)
    except Exception as e:
        logging.error(f"Error in sentiment: {e}")
        return SentimentResponse(symbol=symbol, pcr=0.0, detailed_insight="Error calculating sentiment.")

@app.get("/api/v1/max-pain/{symbol}")
def get_max_pain(symbol: str, db: Session = Depends(get_db)):
    try:
        symbol = symbol.upper()
        max_pain_strike = calculate_max_pain(db, symbol)
        stock_data = db.query(StockData).filter(StockData.symbol == symbol).first()
        current_price = stock_data.underlying_value if stock_data else 0.0
        return {
            "symbol": symbol, 
            "max_pain_strike": max_pain_strike,
            "current_price": current_price
        }
    except Exception as e:
        logging.error(f"Error in max-pain: {e}")
        return {"error": "Failed to calculate Max Pain."}

@app.get("/api/v1/open-interest/{symbol}", response_model=OpenInterestResponse)
def get_open_interest_summary(symbol: str, db: Session = Depends(get_db)):
    try:
        symbol = symbol.upper()
        levels = calculate_key_levels(db, symbol)
        return OpenInterestResponse(
            symbol=symbol,
            total_call_oi=levels["total_call_oi"],
            total_put_oi=levels["total_put_oi"]
        )
    except Exception as e:
        logging.error(f"Error in open-interest: {e}")
        return OpenInterestResponse(symbol=symbol, total_call_oi=0, total_put_oi=0)

@app.get("/api/v1/volatility-spread/{symbol}", response_model=VolatilitySpreadResponse)
def get_vol_spread(symbol: str, db: Session = Depends(get_db)):
    try:
        symbol = symbol.upper()
        iv = get_implied_volatility(db, symbol)
        rv = get_realized_volatility(symbol)
        return VolatilitySpreadResponse(
            symbol=symbol,
            implied_volatility=iv,
            realized_volatility=rv,
            spread=round(iv - rv, 2)
        )
    except Exception as e:
        logging.error(f"Error in vol-spread: {e}")
        return VolatilitySpreadResponse(symbol=symbol, implied_volatility=0, realized_volatility=0, spread=0)

@app.get("/api/v1/news/{symbol}", response_model=NewsResponse)
def get_symbol_news(symbol: str, q: str | None = None, page_size: int = 5):
    try:
        symbol = symbol.upper()
        articles = fetch_news(symbol, extra_query=q, page_size=page_size)
        return NewsResponse(symbol=symbol, articles=articles)
    except Exception as e:
        logging.error(f"Error in news: {e}")
        return NewsResponse(symbol=symbol, articles=[])

@app.get("/api/v1/social-buzz/{symbol}", response_model=SocialBuzzResponse)
def get_social_buzz_endpoint(symbol: str):
    """Aggregate social media and trend data into a single buzz payload.

    Twitter (X) data is included only if TWITTER_BEARER_TOKEN is configured;
    other sources like Stocktwits / Google Trends / Reddit mock always run
    with graceful fallbacks.
    """
    try:
        symbol = symbol.upper()
        data = get_social_buzz(symbol)
        return SocialBuzzResponse(**data)
    except Exception as e:  # noqa: BLE001
        logging.error(f"Error in social-buzz: {e}")
        return SocialBuzzResponse(
            symbol=symbol.upper(),
            buzz_score=0,
            sources_used=[],
            sentiment=SocialBuzzSentiment(positive=0.0, neutral=1.0, negative=0.0),
            timeline=[],
            top_keywords=[],
            top_posts=[],
        )