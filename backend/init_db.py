# backend/init_db.py
from database import engine, Base
from models import OptionData, StockData  # Make sure both are imported
from sqlalchemy.exc import OperationalError
from sqlalchemy.sql import text
import time


def initialize_database():
    print("Connecting to database...")
    retries = 5
    while retries > 0:
        try:
            with engine.connect() as conn:
                print("Connection successful.")
                
                # Enable TimescaleDB extension
                print("Enabling TimescaleDB extension...")
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb;"))
                conn.commit()
                
                # Create the tables
                print("Creating tables (if they don't exist)...")
                Base.metadata.create_all(bind=engine)
                
                # Convert option_data to a hypertable
                print("Turning 'option_data' into a hypertable...")
                # We partition by the 'timestamp' column
                conn.execute(text("SELECT create_hypertable('option_data', 'timestamp', if_not_exists => TRUE);"))
                conn.commit()
                
                print("\nDatabase initialization successful!")
                print("Tables 'option_data' and 'stock_data' are ready.")
                break
        except OperationalError as e:
            print(f"Database connection failed. Is the DATABASE_URL in .env correct?")
            print(f"Error: {e}")
            print(f"Retrying... ({retries} left)")
            retries -= 1
            time.sleep(5)
        except Exception as e:
            print(f"An error occurred: {e}")
            break


if __name__ == "__main__":
    initialize_database()

