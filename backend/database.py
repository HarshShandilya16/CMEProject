# backend/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv


loaded = load_dotenv()
if not loaded:
    load_dotenv(".env.local")

DATABASE_URL = os.getenv("DATABASE_URL")

# FastApi uses asyncpg driver, but SQLAlchemy uses psycopg2

db_url = DATABASE_URL
if db_url and db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")

if not db_url:
    raise ValueError(
        "DATABASE_URL is not set. Ensure backend/.env (or .env.local) contains a valid DATABASE_URL."
    )

engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# To make a session with the database
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

