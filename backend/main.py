# backend/main.py
from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from database import get_db, engine
from models import OptionData, StockData, Base
# MERGED IMPORT: We need both fetch_and_store AND the provider instance
from services.ingestion import fetch_and_store, provider
from services.ai_analyzer import get_market_sentiment_insight
from services.analysis_service import calculate_key_levels
from services.financial_calcs import calculate_max_pain, get_realized_volatility, get_implied_volatility
from services.news_service import fetch_news
from services.social.aggregator import get_social_buzz
from services.alert_engine import AlertEngine, AlertSignal
# NEW IMPORTS: Auth and Cache
from services.api_auth import require_api_key
from services.simple_cache import cache
import logging
import os
from dotenv import load_dotenv
import threading 
import time
import yfinance as yf
from pydantic import BaseModel
from typing import List, Any, Dict, Optional, Literal

load_dotenv()

# Create DB tables if not existing
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
    'HDFCBANK', 'ICICIBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK',
    'INDUSINDBK', 'BAJFINANCE', 'BAJAJFINSV', 'BANDHANBNK', 'IDFCFIRSTB',
    'TCS', 'INFY', 'HCLTECH', 'WIPRO', 'TECHM',
    'RELIANCE', 'BPCL', 'POWERGRID', 'NTPC',
    'ITC', 'HINDUNILVR', 'NESTLEIND', 'BRITANNIA',
    'MARUTI', 'M&M', 'TATAMOTORS',
    'TATASTEEL', 'HINDALCO', 'JSWSTEEL',
    'SUNPHARMA', 'DRREDDY',
    'LT', 'ULTRACEMCO',
    'BHARTIARTL', 'TITAN',
    'SBILIFE', 'HDFCLIFE'
]

TIER_1_STOCKS = [
    'HDFCBANK', 'ICICIBANK', 'RELIANCE', 'TCS', 'INFY',
    'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'AXISBANK',
    'KOTAKBANK', 'BAJFINANCE'
]

TIER_2_STOCKS = [
    'BAJAJFINSV', 'INDUSINDBK', 'HCLTECH', 'WIPRO', 'MARUTI',
    'TATAMOTORS', 'TATASTEEL', 'SUNPHARMA', 'TITAN', 'HINDUNILVR'
]

TIER_3_STOCKS = [s for s in STOCKS_TO_TRACK if s not in TIER_1_STOCKS and s not in TIER_2_STOCKS]

def run_initial_fetch():
    logging.info("=" * 70)
    logging.info("🚀 PHASE 1: Fetching Indices (Priority)")
    logging.info("=" * 70)
    try:
        for symbol in ['NIFTY', 'BANKNIFTY', 'FINNIFTY']:
            logging.info(f"📊 Fetching {symbol}...")
            fetch_and_store(symbol)
        logging.info("✅ Indices loaded! Frontend is now ready.\n")

        logging.info("=" * 70)
        logging.info(f"🚀 PHASE 2: Fetching Tier 1 Stocks ({len(TIER_1_STOCKS)} stocks)")
        logging.info("=" * 70)
        for i, stock in enumerate(TIER_1_STOCKS, 1):
            logging.info(f"📈 [{i}/{len(TIER_1_STOCKS)}] Fetching {stock}...")
            fetch_and_store(stock)
            time.sleep(1)

        logging.info("✅ Tier 1 stocks loaded!\n")
        logging.info("=" * 70)
        logging.info(f"🚀 PHASE 3: Fetching Tier 2 Stocks ({len(TIER_2_STOCKS)} stocks)")
        logging.info("=" * 70)
        for i, stock in enumerate(TIER_2_STOCKS, 1):
            logging.info(f"📊 [{i}/{len(TIER_2_STOCKS)}] Fetching {stock}...")
            fetch_and_store(stock)
            time.sleep(1.5)
        logging.info("✅ Tier 2 stocks loaded!\n")

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

scheduler = BackgroundScheduler(daemon=True)
alert_engine = AlertEngine()

# Schedule ingestion jobs
scheduler.add_job(fetch_and_store, 'interval', seconds=60, args=['NIFTY'], id='job_nifty')
scheduler.add_job(fetch_and_store, 'interval', seconds=60, args=['BANKNIFTY'], id='job_banknifty')
scheduler.add_job(fetch_and_store, 'interval', seconds=60, args=['FINNIFTY'], id='job_finnifty')

for stock in TIER_1_STOCKS:
    scheduler.add_job(fetch_and_store, 'interval', seconds=120, args=[stock], id=f'job_{stock.lower()}')
for stock in TIER_2_STOCKS:
    scheduler.add_job(fetch_and_store, 'interval', seconds=180, args=[stock], id=f'job_{stock.lower()}')
for stock in TIER_3_STOCKS:
    scheduler.add_job(fetch_and_store, 'interval', seconds=300, args=[stock], id=f'job_{stock.lower()}')

@app.on_event("startup")
def startup_event():
    logging.info("=" * 70)
    logging.info("🚀 CME PROJECT DATA PIPELINE STARTING")
    logging.info("=" * 70)
    logging.info(f"📊 Total Symbols: {len(STOCKS_TO_TRACK) + 3}")
    logging.info("=" * 70)
    threading.Thread(target=run_initial_fetch, daemon=True).start()
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
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None

class HistoricalResponse(BaseModel):
    symbol: str
    data: List[ChartData]
    period: str

class SentimentResponse(BaseModel):
    symbol: str
    pcr: float
    detailed_insight: str

class OpenInterestResponse(BaseModel):
    symbol: str
    total_call_oi: int
    total_put_oi: int

class CurrentPriceResponse(BaseModel):
    symbol: str
    currentPrice: float
    dayChange: float
    dayChangePercent: float
    timestamp: str

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

class AlertEventModel(BaseModel):
    symbol: str
    rule_name: str
    severity: str
    message: str
    metadata: Dict[str, Any]

class AlertsResponse(BaseModel):
    symbol: str
    alerts: List[AlertEventModel]

# --- MERGED: Data Source Configuration Model ---
class DataSourceConfig(BaseModel):
    preference: str

class DataSourceStatus(BaseModel):
    preference: str
    current_source_type: str 

# ------------------------
# Utility: build option-chain payload from DB (same shape frontend expects)
# ------------------------
def fetch_option_chain_from_db(symbol: str, db: Session) -> Optional[dict]:
    """
    Build the same payload your frontend used to expect:
    {
      "symbol": "...",
      "underlyingPrice": 123.4,
      "timestamp": "...",
      "expiryDate": "YYYY-MM-DD",
      "legs": [ {oi_change, strike, type, lastPrice, iv, oi, volume, delta, gamma, theta, vega}, ... ]
    }
    """
    try:
        stock_data = db.query(StockData).filter(StockData.symbol == symbol).first()
        if not stock_data:
            return None
        option_legs = db.query(OptionData).filter(OptionData.symbol == symbol).order_by(OptionData.strike_price).all()
        if not option_legs:
            return None
        legs = []
        for leg in option_legs:
            legs.append({
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
                "vega": leg.vega
            })
        return {
            "symbol": stock_data.symbol,
            "underlyingPrice": stock_data.underlying_value,
            "timestamp": stock_data.timestamp.isoformat(),
            "expiryDate": option_legs[0].expiry_date.isoformat(),
            "legs": legs
        }
    except Exception as e:
        logging.error(f"Error assembling chain from DB for {symbol}: {e}")
        return None

# Helper for cache keys
def _cache_key(*parts):
    return "cache:" + ":".join(map(str, parts))

# ------------------------
# API endpoints
# ------------------------

@app.get("/")
def read_root():
    return {
        "message": "CME Data Pipeline is running.",
        "tracking": {
            "indices": ["NIFTY", "BANKNIFTY", "FINNIFTY"],
            "tier_1_stocks": TIER_1_STOCKS,
            "total_stocks": len(STOCKS_TO_TRACK),
            "data_source": provider.get_preference() # Added for visibility
        },
    }

# --- MERGED: Data Source Switching Endpoints (Admin Only) ---
@app.get("/api/v1/data-source/status", response_model=DataSourceStatus)
def get_data_source_status(auth = Depends(require_api_key)):
    return {
        "preference": provider.get_preference(),
        "current_source_type": provider.preference 
    }

@app.post("/api/v1/data-source/set")
def set_data_source(config: DataSourceConfig, auth = Depends(require_api_key)):
    # Optional: You can enforce role=="admin" here if you want extra security
    # if auth.get("role") != "admin": raise HTTPException(403, "Admin required")
    
    provider.set_preference(config.preference)
    return {
        "status": "success", 
        "message": f"Preference updated to {provider.get_preference()}"
    }

# --- Standard Endpoints (With Cache & Auth) ---

@app.get("/api/v1/option-chain/{symbol}")
def get_option_chain(symbol: str, auth = Depends(require_api_key), db: Session = Depends(get_db)):
    s = symbol.upper()
    key = _cache_key("optionchain", s)
    cached = cache.get(key)
    if cached:
        cached["_cached"] = True
        return cached

    chain = fetch_option_chain_from_db(s, db)
    if not chain:
        raise HTTPException(status_code=404, detail=f"Data for {s} is still loading. Please wait 1-2 minutes and refresh.")
    cache.set(key, chain, ttl=30)
    chain["_cached"] = False
    return chain

@app.get("/api/v1/historical-price/{symbol}", response_model=HistoricalResponse)
def get_historical_price(
    symbol: str,
    period: Literal["intraday", "10d", "30d"] = Query(default="30d", description="Time period for data"),
    auth = Depends(require_api_key)
):
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
        if period == "intraday":
            hist = ticker.history(period="1d", interval="5m")
            time_format = '%H:%M'
        elif period == "10d":
            hist = ticker.history(period="10d", interval="1d")
            time_format = '%b %d'
        else:
            hist = ticker.history(period="30d", interval="1d")
            time_format = '%b %d'

        if hist.empty:
            return HistoricalResponse(symbol=symbol, data=[], period=period)

        hist = hist.reset_index()
        chart_data = []
        for _, row in hist.iterrows():
            try:
                if period == "intraday":
                    time_str = row.get('Datetime', row.get('Datetime')) if 'Datetime' in row else row['Date'].strftime(time_format)
                else:
                    time_str = row['Date'].strftime(time_format)

                if period == "intraday":
                    chart_data.append(ChartData(
                        time=time_str,
                        price=round(row['Close'], 2),
                        volume=int(row['Volume']) if row['Volume'] > 0 else 0,
                        open=round(row['Open'], 2),
                        high=round(row['High'], 2),
                        low=round(row['Low'], 2),
                        close=round(row['Close'], 2)
                    ))
                else:
                    chart_data.append(ChartData(
                        time=time_str,
                        price=round(row['Close'], 2),
                        volume=int(row['Volume']) if row['Volume'] > 0 else 0
                    ))
            except Exception:
                continue

        return HistoricalResponse(symbol=symbol, data=chart_data, period=period)
    except Exception as e:
        logging.error(f"Error fetching historical price: {e}")
        return HistoricalResponse(symbol=symbol, data=[], period=period)

@app.get("/api/v1/sentiment/{symbol}", response_model=SentimentResponse)
def get_market_sentiment(symbol: str, auth = Depends(require_api_key), db: Session = Depends(get_db)):
    s = symbol.upper()
    key = _cache_key("sentiment", s)
    cached = cache.get(key)
    if cached:
        return cached
    try:
        levels = calculate_key_levels(db, s)
        try:
            insight = get_market_sentiment_insight(s, levels.get("pcr", 0), levels.get("max_oi_call_strike"), levels.get("max_oi_put_strike"))
        except Exception:
            insight = ""
        out = {"symbol": s, "pcr": levels.get("pcr", 0.0), "detailed_insight": insight}
        cache.set(key, out, ttl=30)
        return out
    except Exception as e:
        logging.error(f"Error in sentiment: {e}")
        return SentimentResponse(symbol=s, pcr=0.0, detailed_insight="Error calculating sentiment.")

@app.get("/api/v1/max-pain/{symbol}")
def get_max_pain_endpoint(symbol: str, auth = Depends(require_api_key), db: Session = Depends(get_db)):
    s = symbol.upper()
    key = _cache_key("maxpain", s)
    cached = cache.get(key)
    if cached:
        return cached
    try:
        mp = calculate_max_pain(db, s)
        stock = db.query(StockData).filter(StockData.symbol == s).first()
        current_price = stock.underlying_value if stock else 0.0
        out = {"symbol": s, "max_pain_strike": mp, "current_price": current_price}
        cache.set(key, out, ttl=60)
        return out
    except Exception as e:
        logging.error(f"Error in max-pain: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate Max Pain.")

@app.get("/api/v1/open-interest/{symbol}", response_model=OpenInterestResponse)
def get_open_interest_summary(symbol: str, auth = Depends(require_api_key), db: Session = Depends(get_db)):
    s = symbol.upper()
    key = _cache_key("openinterest", s)
    cached = cache.get(key)
    if cached:
        return cached
    try:
        levels = calculate_key_levels(db, s)
        out = {
            "symbol": s,
            "total_call_oi": levels.get("total_call_oi", 0),
            "total_put_oi": levels.get("total_put_oi", 0)
        }
        cache.set(key, out, ttl=30)
        return out
    except Exception as e:
        logging.error(f"Error in open-interest: {e}")
        raise HTTPException(status_code=500, detail="Error calculating open interest.")

@app.get("/api/v1/volatility-spread/{symbol}", response_model=VolatilitySpreadResponse)
def get_vol_spread(symbol: str, auth = Depends(require_api_key), db: Session = Depends(get_db)):
    s = symbol.upper()
    key = _cache_key("volspread", s)
    cached = cache.get(key)
    if cached:
        return cached
    try:
        iv = get_implied_volatility(db, s)
        rv = get_realized_volatility(s)
        out = {"symbol": s, "implied_volatility": iv, "realized_volatility": rv, "spread": round(iv - rv, 2)}
        cache.set(key, out, ttl=60)
        return out
    except Exception as e:
        logging.error(f"Error in vol-spread: {e}")
        raise HTTPException(status_code=500, detail="Error calculating volatility spread.")

@app.get("/api/v1/news/{symbol}", response_model=NewsResponse)
def get_symbol_news(symbol: str, q: str | None = None, page_size: int = 5, auth = Depends(require_api_key)):
    s = symbol.upper()
    try:
        articles = fetch_news(s, extra_query=q, page_size=page_size)
        return NewsResponse(symbol=s, articles=articles)
    except Exception as e:
        logging.error(f"Error in news: {e}")
        return NewsResponse(symbol=s, articles=[])

@app.get("/api/v1/social-buzz/{symbol}", response_model=SocialBuzzResponse)
def get_social_buzz_endpoint(symbol: str, auth = Depends(require_api_key)):
    s = symbol.upper()
    try:
        data = get_social_buzz(s)
        return SocialBuzzResponse(**data)
    except Exception as e:
        logging.error(f"Error in social-buzz: {e}")
        return SocialBuzzResponse(
            symbol=s,
            buzz_score=0,
            sources_used=[],
            sentiment=SocialBuzzSentiment(positive=0.0, neutral=1.0, negative=0.0),
            timeline=[],
            top_keywords=[],
            top_posts=[]
        )

@app.get("/api/v1/alerts/{symbol}", response_model=AlertsResponse)
def get_symbol_alerts(symbol: str, db: Session = Depends(get_db), auth = Depends(require_api_key)):
    s = symbol.upper()
    try:
        levels = calculate_key_levels(db, s)
        pcr = levels.get("pcr")
        total_call_oi = levels.get("total_call_oi")
        total_put_oi = levels.get("total_put_oi")
        iv = get_implied_volatility(db, s)
        rv = get_realized_volatility(s)
        social_data = get_social_buzz(s)
        buzz_score = social_data.get("buzz_score")
        sentiment_data = social_data.get("sentiment", {}) or {}
        social_sentiment_score = float(sentiment_data.get("positive", 0.0)) - float(sentiment_data.get("negative", 0.0))

        signal = AlertSignal(
            symbol=s,
            pcr=pcr,
            total_call_oi=total_call_oi,
            total_put_oi=total_put_oi,
            iv=iv,
            rv=rv,
            social_buzz_score=buzz_score,
            social_sentiment_score=social_sentiment_score,
        )

        events = alert_engine.evaluate(signal)

        return AlertsResponse(
            symbol=s,
            alerts=[AlertEventModel(symbol=e.symbol, rule_name=e.rule_name, severity=e.severity, message=e.message, metadata=e.metadata) for e in events]
        )
    except Exception as e:
        logging.error(f"Error in alerts endpoint for {s}: {e}")
        return AlertsResponse(symbol=s, alerts=[])

@app.get("/api/v1/current-price/{symbol}", response_model=CurrentPriceResponse)
def get_current_price(symbol: str, auth = Depends(require_api_key)):
    s = symbol.upper()
    ticker_str = ""
    if s == 'NIFTY':
        ticker_str = '^NSEI'
    elif s == 'BANKNIFTY':
        ticker_str = '^NSEBANK'
    elif s == 'FINNIFTY':
        ticker_str = '^NSEBANK'
    else:
        ticker_str = f"{s}.NS"

    try:
        ticker = yf.Ticker(ticker_str)
        info = ticker.info
        current_price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose', 0)
        if not current_price or current_price == 0:
            hist = ticker.history(period="5d", interval="1d")
            if not hist.empty:
                current_price = float(hist['Close'].iloc[-1])
        hist_daily = ticker.history(period="2d", interval="1d")
        if not hist_daily.empty and len(hist_daily) >= 2:
            previous_close = float(hist_daily['Close'].iloc[-2])
            day_change = current_price - previous_close
            day_change_percent = (day_change / previous_close * 100) if previous_close else 0
        else:
            day_change = 0
            day_change_percent = 0
        from datetime import datetime
        return CurrentPriceResponse(symbol=s, currentPrice=round(current_price, 2), dayChange=round(day_change, 2), dayChangePercent=round(day_change_percent, 2), timestamp=datetime.now().isoformat())
    except Exception as e:
        logging.error(f"Error fetching current price for {s}: {e}")
        from datetime import datetime
        return CurrentPriceResponse(symbol=s, currentPrice=0.0, dayChange=0.0, dayChangePercent=0.0, timestamp=datetime.now().isoformat())

# --- ADMIN: trigger ingestion for a symbol (protected) ---
@app.post("/api/v1/admin/refresh/{symbol}")
def admin_refresh(symbol: str, background_tasks: BackgroundTasks, auth = Depends(require_api_key)):
    # only admin role allowed
    if auth.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin API key required")
    sym = symbol.upper()
    background_tasks.add_task(fetch_and_store, sym)
    # also clear relevant caches
    cache.set(_cache_key("optionchain", sym), None, ttl=1)
    cache.set(_cache_key("maxpain", sym), None, ttl=1)
    cache.set(_cache_key("openinterest", sym), None, ttl=1)
    cache.set(_cache_key("sentiment", sym), None, ttl=1)
    cache.set(_cache_key("volspread", sym), None, ttl=1)
    return {"status": "scheduled", "symbol": sym}