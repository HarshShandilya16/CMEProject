# backend/services/ingestion.py
from sqlalchemy.orm import Session
from database import SessionLocal
from services.unified_data_provider import UnifiedDataProvider
from services.data_parser import parse_option_chain_data
from models import StockData, OptionData
import logging

# We are setting up the logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# We are creating an instance of the UnifiedDataProvider class
provider = UnifiedDataProvider()


def fetch_and_store(symbol: str):
    db: Session = SessionLocal()
    try:
        logging.info(f"Fetching data for {symbol}...")
        raw_data = provider.get_option_chain(symbol)
        
        if not raw_data or raw_data.get('error'):
            logging.warning(f"No data received for {symbol}.")
            return
        
        logging.info(f"Parsing data for {symbol}...")
        stock_data, options_list = parse_option_chain_data(symbol, raw_data)
        
        if not stock_data or not options_list:
            logging.warning(f"Data parsing failed for {symbol}.")
            return
        
        logging.info(f"Storing {len(options_list)} option records for {symbol}...")
        
        
        existing_stock = db.query(StockData).filter(StockData.symbol == stock_data.symbol).first()
        if existing_stock:
            logging.info(f"Updating existing stock data for {symbol}.")
            existing_stock.underlying_value = stock_data.underlying_value
            existing_stock.timestamp = stock_data.timestamp
        else:
            logging.info(f"Creating new stock data entry for {symbol}.")
            db.add(stock_data)
        
        
        #instead of adding the new data we are deleting the old data
        db.query(OptionData).filter(OptionData.symbol == symbol).delete(synchronize_session=False)
        
        
        db.add_all(options_list)
        #Saving the data to the database
        db.commit()
        logging.info(f"Successfully stored data for {symbol}.")
    except Exception as e:
        logging.error(f"Ingestion failed for {symbol}: {e}")
        db.rollback()
    finally:
        db.close()
