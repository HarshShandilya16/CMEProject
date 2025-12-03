👥 Project Team & Contributions
Options Pro was architected and developed by a two-person engineering team. Below is a detailed breakdown of the individual responsibilities and technical contributions.

👨‍💻 Harsh
🏗️ Architecture & Tech Strategy
Technology Selection: Defined the core technology stack, selecting Zustand for state management and determining the optimal library set for performance and scalability.

Dashboard Layout & UX: Designed the entire application interface, creating the wireframes and determining exactly which widgets, graphs, and data elements populate the dashboard.

Database Architecture: Established the connection with NeonDB (TimescaleDB) and designed the optimized schema to store high-frequency NSE market data.

⚙️ Backend & Data Logic
Financial Mathematics: Implemented the core mathematical engine in Python to calculate complex metrics like Max Pain, Realized Volatility (RV), Implied Volatility (IV), and the IV-RV Spread.

Unified Data Provider: Implemented the set_preference endpoint in the main server, allowing dynamic switching between API mode, Scraper mode, or Auto-Fallback mode.

Server Logic: Engineered the main.py server, integrating all microservices into a single, cohesive FastAPI application.

📊 Advanced Market Analytics
Volatility Analysis: Developed the IV-RV Spread logic to determine if options are "Cheap" or "Expensive" relative to realized movement.

Institutional Tracking: Implemented algorithms to identify "Smart Money" positioning by analyzing strikes with the highest Open Interest concentration.

Momentum & Support: Created the logic for Momentum Signals (comparing Net Call vs. Put OI changes) and automated Support/Resistance detection based on Max OI levels.

Trading Action: Built the logic to identify active intraday trading zones based on volume spikes.

🌐 Infrastructure & API
Remote Tunneling: Configured and deployed ngrok to expose the local API to the public internet.

API Optimization: Refactored all endpoints to utilize Caching and Authentication for high performance.

Scraping Engine: Developed the unified scraping logic to fetch option chain data directly from NSE when APIs are unavailable.

👨‍💻 Thatvik
📈 Market Trends & Insights
Trend Interpretation: Developed the core logic for Volume Analysis (rising vs. low liquidity) and Open Interest Analysis (short-covering vs. fresh positions).

Market Bias: Implemented the fundamental trend detection algorithms that classify the market as Bullish, Bearish, or Neutral based on PCR thresholds.

News Aggregation: Implemented the News Feed service using external APIs.

🔔 Alerts & Social Intelligence
Algorithmic Alert System: Built the rule-based anomaly detection engine that monitors spikes in Volatility, PCR, and Open Interest to trigger automated trading alerts.

Social Media Buzz: Integrated social sentiment analysis to quantify "Market Noise" and track viral stock trends.

News Aggregation: Implemented the News Feed service using external APIs.

📊 Visualization & Frontend Logic
Advanced Visualizations: Developed the "Volume vs. Strike vs. OI" graphs and handled the database queries required to plot these multi-dimensional datasets.

Frontend Widgets: Coded specific React widgets for the Advanced Analytics section based on the provided layout.

🔐 Security & Optimization Services
Authentication Service: Created the api_auth.py module, implementing API Key validation and role-based access control.

Caching Engine: Developed simple_cache.py, a flexible caching layer that supports both Redis and In-Memory storage.

⚙️ System Reliability
Fallback Strategy: Designed the logic flow for the Data Fallback System.

API Service Transformation: Decoupled the frontend and backend to allow independent scaling.

System Integration: Merged Harsh's core calculation engines with Thatvik's helper services to create the final production build.
