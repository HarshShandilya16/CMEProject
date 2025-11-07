# backend/models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, func, PrimaryKeyConstraint
from database import Base


class OptionData(Base):
    __tablename__ = 'option_data'
    
    # REMOVED the 'id' column
    timestamp = Column(DateTime(timezone=True), nullable=False)
    symbol = Column(String, index=True)
    expiry_date = Column(Date)
    strike_price = Column(Float)
    option_type = Column(String(2))  # 'CE' or 'PE'
    last_price = Column(Float)
    iv = Column(Float, default=0.0)
    oi = Column(Integer, default=0)
    volume = Column(Integer, default=0)
    delta = Column(Float, default=0.0)
    gamma = Column(Float, default=0.0)
    theta = Column(Float, default=0.0)
    vega = Column(Float, default=0.0)
    
    # ADD THIS: A composite primary key that includes timestamp
    __table_args__ = (
        PrimaryKeyConstraint('timestamp', 'symbol', 'strike_price', 'option_type', 'expiry_date'),
    )


class StockData(Base):
    __tablename__ = 'stock_data'
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    symbol = Column(String, unique=True, index=True)
    underlying_value = Column(Float)

