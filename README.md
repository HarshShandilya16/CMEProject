# Options Pro - AI-Powered Market Intelligence Dashboard

**Options Pro** is a professional-grade, real-time market intelligence platform for retail traders. It aggregates data, performs complex financial calculations, and uses Generative AI to provide actionable insights for the Indian Stock Market (NSE).

## 🚀 Key Features

* **Real-Time Data Pipeline:** Scrapes live option chains via a custom Playwright engine (bypassing bot protection).
* **AI Market Sentiment:** Uses **Google Gemini AI** to analyze Put-Call Ratios (PCR) and Open Interest to generate human-readable market summaries.
* **Advanced Analytics:**
    * **Max Pain:** Real-time calculation of the "Max Pain" strike price.
    * **IV vs RV Spread:** Compares Implied Volatility vs. Realized Volatility to find cheap/expensive premiums.
    * **Open Interest Visualization:** In-table bar charts and dynamic OI buildup analysis.
* **Live Charts:** Interactive TradingView charts and historical data plotting via `yfinance`.
* **News Aggregation:** Real-time news feed filtered by specific stocks/indices.
* **Secure Authentication:** Full user login/signup system with profile management.

---

## 🏗️ System Architecture (Microservices)

This project uses a **Microservice Architecture** comprising three distinct parts:

1.  **`frontend` (React + Vite):** The user interface (Port 5173).
2.  **`backend` (FastAPI + Python):** The **Data Engine**. Handles scraping, TimescaleDB storage, AI analysis, and financial math (Port 8000).
3.  **`backend-auth` (Express + Node.js):** The **Auth Service**. Handles user authentication, MongoDB storage, and profile management (Port 3001).

---

## 🛠️ Setup & Installation Guide

You will need **3 separate terminals** to run the full application.

### Terminal 1: The Data Engine (FastAPI)

This service fetches and serves market data.

1.  Navigate to the folder:
    ```bash
    cd backend
    ```
2.  Setup Python Environment:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate   # Windows
    # source venv/bin/activate # Mac/Linux
    ```
3.  Install Dependencies & Browsers:
    ```bash
    pip install -r requirements.txt
    python -m playwright install firefox
    ```
4.  **Configure Environment:**
    * Create a `.env` file.
    * Add your **Neon (Postgres) URL** as `DATABASE_URL`.
    * Add your **Google Gemini API Key** as `GEMINI_API_KEY`.
    * Add your **NewsAPI Key** as `NEWS_API_KEY`.
5.  Initialize Database (Run once):
    ```bash
    python init_db.py
    ```
6.  **Start Server:**
    ```bash
    uvicorn main:app --reload
    ```
    *Running at: http://127.0.0.1:8000*

---

### Terminal 2: The Auth Service (MERN)

This service handles login and signup.

1.  Navigate to the folder:
    ```bash
    cd backend-auth
    ```
2.  Install Dependencies:
    ```bash
    npm install
    ```
3.  **Configure Environment:**
    * Create a `.env` file.
    * Add your **MongoDB Connection String** as `MONGO_URI`.
    * Add a secret string as `JWT_SECRET`.
4.  **Start Server:**
    ```bash
    npm start
    ```
    *Running at: http://127.0.0.1:3001*

---

### Terminal 3: The Frontend (React)

The user interface that connects to both backends.

1.  Navigate to the folder:
    ```bash
    cd frontend
    ```
2.  Install Dependencies:
    ```bash
    npm install
    ```
3.  **Start Frontend:**
    ```bash
    npm run dev
    ```
    *Running at: http://localhost:5173*

---

## 📂 Tech Stack Summary

* **Frontend:** React, TypeScript, Tailwind CSS, Framer Motion, Recharts, Zustand (State Management).
* **Data Backend:** Python, FastAPI, Playwright (Scraping), SQLAlchemy, Pandas, NumPy, YFinance.
* **Auth Backend:** Node.js, Express.js, Mongoose, JWT.
* **Databases:**
    * **TimescaleDB (Neon):** For high-speed time-series market data.
    * **MongoDB:** For user profiles and authentication data.
* **AI:** Google Gemini 1.5 Flash.

## 🧪 API Documentation

Once the Python backend is running, you can view the full auto-generated documentation at:
`http://127.0.0.1:8000/docs`
