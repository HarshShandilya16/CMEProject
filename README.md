Options Pro - AI-Powered Market Intelligence Dashboard
Options Pro is a professional-grade, fault-tolerant market intelligence platform for retail traders. It aggregates real-time data, performs complex financial calculations, and uses Generative AI to detect anomalies and provide actionable insights for the Indian Stock Market (NSE).

🚀 Key Features
🧠 AI & Intelligence
AI-Driven Alert System: A background monitoring engine that recognizes unusual spikes in Implied Volatility (IV), PCR Ratios, Open Interest, and Social Buzz to trigger smart trading alerts.

Generative Market Sentiment: Uses Google Gemini 1.5 to analyze raw data and generate human-readable summaries of market conditions.

Social Media Buzz: Aggregates and analyzes sentiment from social platforms to quantify "Market Noise" and retail sentiment.

🛡️ Robust Data Infrastructure
Unified Data Provider (Fault Tolerant): Implements a smart fallback logic.

Primary: Fetches ultra-fast data via DhanHQ API.

Fallback: Automatically switches to a custom Playwright Scraper if the API fails or rate limits are hit.

Admin Controls: Switch data sources on-the-fly via API without restarting the server.

Smart Caching: Integrated Redis/In-Memory Caching to reduce latency and API load.

📊 Visualization & Analytics
Customizable Price & Volume Charts: Interactive charts with multiple timeframes:

Intraday: 5-minute interval granularity.

Swing: 10-Day and 30-Day historical views.

Advanced Greeks & Math:

Max Pain: Real-time calculation of the "Max Pain" expiry level.

IV vs RV Spread: Compares Implied vs. Realized Volatility to identify cheap/expensive premiums.

OI Dynamics: In-table bar charts and dynamic OI buildup analysis.

🔐 Security & Access
API Gateway: Fully secured REST API with x-api-key authentication.

Role-Based Access: Distinct roles for DEMO users, ADMIN controls, and LOCAL development.

User Authentication: Full MERN-stack login/signup system with profile management.

🏗️ System Architecture (Microservices)
This project uses a Microservice Architecture comprising three distinct parts:

frontend (React + Vite): The user interface (Port 5173).

backend (FastAPI + Python): The Data Engine.

Handles Data Ingestion (DhanHQ + Scraper).

Runs AI Analysis & Alert Engine.

Manages Caching & TimescaleDB storage.

Exposes a secured API (Port 8000).

backend-auth (Express + Node.js): The Auth Service. Handles user authentication, MongoDB storage, and JWT management (Port 3001).

🛠️ Setup & Installation Guide
You will need 3 separate terminals to run the full application.

Terminal 1: The Data Engine (FastAPI)
This service fetches and serves market data.

Navigate to the folder:

Bash

cd backend
Setup Python Environment:

Bash

python -m venv venv
.\venv\Scripts\activate   # Windows
# source venv/bin/activate # Mac/Linux
Install Dependencies & Browsers:

Bash

pip install -r requirements.txt
python -m playwright install firefox
Configure Environment (.env): Create a .env file with the following keys:

Ini, TOML

# Database
DATABASE_URL=postgresql://user:pass@host/dbname

# AI & News
GEMINI_API_KEY=your_gemini_key
NEWS_API_KEY=your_news_key

# Data Sources (DhanHQ - Optional but Recommended)
DHAN_CLIENT_ID=your_dhan_id
DHAN_ACCESS_TOKEN=your_dhan_token

# API Security
DEMO_API_KEY=demo-key-123
ADMIN_API_KEY=admin-key-456
ALLOW_LOCAL_UNAUTH=1  # Set to 1 for easy local development

# Caching (Optional)
REDIS_URL=redis://localhost:6379/0
Initialize Database (Run once):

Bash

python init_db.py
Start Server:

Bash

uvicorn main:app --reload
Running at: http://127.0.0.1:8000

Terminal 2: The Auth Service (MERN)
This service handles login and signup.

Navigate to the folder:

Bash

cd backend-auth
Install Dependencies:

Bash

npm install
Configure Environment:

Create a .env file.

Add MONGO_URI (MongoDB Connection String).

Add JWT_SECRET (Random secret string).

Start Server:

Bash

npm start
Running at: http://127.0.0.1:3001

Terminal 3: The Frontend (React)
The user interface that connects to both backends.

Navigate to the folder:

Bash

cd frontend
Install Dependencies:

Bash

npm install
Start Frontend:

Bash

npm run dev
Running at: http://localhost:5173

📂 Tech Stack Summary
Frontend: React, TypeScript, Tailwind CSS, Framer Motion, Recharts, Zustand (State Management).

Data Backend: Python, FastAPI, SQLAlchemy, Pydantic, Pandas, NumPy, YFinance.

Data Acquisition: DhanHQ API (Primary), Playwright (Fallback Scraper).

Auth Backend: Node.js, Express.js, Mongoose, JWT.

Databases & Cache:

TimescaleDB (Neon): For high-speed time-series market data.

MongoDB: For user profiles.

Redis (Optional): For API response caching.

AI: Google Gemini 1.5 Flash.

🧪 API Documentation & Remote Access
Local Documentation
Once the Python backend is running, view the interactive Swagger UI at: http://127.0.0.1:8000/docs

Remote Access (Teammates)
To allow teammates to access your local API securely:

Run ngrok (see API_DOCUMENTATION.md for details).

Teammates must include the header x-api-key: demo-key-123 in their requests.

Admin Controls
Admin users can switch data sources dynamically via the API:

Endpoint: POST /api/v1/data-source/set

Payload: {"preference": "SCRAPER"} or {"preference": "DHAN"}
