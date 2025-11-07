# Options Pro - CME Group Project

This project is a real-time, AI-powered market intelligence dashboard for options traders, focusing on the NSE (National Stock Exchange of India).

This repository contains the first two parts of the project:
1.  **`frontend`:** A React + Vite UI that displays all data.
2.  **`backend`:** A FastAPI (Python) "data microservice."

## 🚀 Project Architecture

This is a **microservice project** with three distinct parts:

1.  **`frontend` (React + Vite):** The user interface. This is what the user sees.
2.  **`backend` (FastAPI + Python):** The **Data Pipeline**. This is a powerful, separate service responsible for scraping live data from the NSE, parsing it, storing it in a time-series database (TimescaleDB), and serving it via a clean API.
3.  **(TODO) `backend-auth` (MERN Stack):** This will be a *second* backend responsible for all user-related logic: login, signup, saving user profiles, etc.

---

## 1. How to Run the `frontend` (React App)

1.  `cd frontend`
2.  `npm install`
3.  `npm run dev`
4.  The app will be running at `http://localhost:5173` (or a similar port).

---

## 2. How to Run the `backend` (FastAPI Data Pipeline)

This is a Python project. You must have Python 3.10+ installed.

### One-Time Setup

1.  Navigate into the backend folder:
    `cd backend`

2.  Create and activate a Python virtual environment:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate
    ```

3.  Install all required Python packages:
    `pip install -r requirements.txt`

4.  Install the Playwright browsers (this will download Firefox):
    `python -m playwright install firefox`

### Running the Server

1.  **Set up your keys (CRITICAL):**
    * Rename the `.env.example` file to `.env`.
    * You must get your own **Neon.tech database string** and **Google Gemini API key**.
    * Paste these keys into your new `.env` file.

2.  **Initialize the Database (Run this only ONCE):**
    * (Make sure your `venv` is active)
    * `python init_db.py`
    * This will create all the tables and hypertables in your Neon DB.

3.  **Run the Server!**
    * (Make sure your `venv` is active)
    * `uvicorn main:app --reload`

The server will start at `http://127.0.0.1:8000`. It will immediately start fetching and storing data in the background.

**To test if it's working, open this in your browser:**
`http://127.0.0.1:8000/api/v1/option-chain/NIFTY`

---

## 3. Next Steps (For the MERN Teammate)

Your job is to build the *second* backend for authentication.

* **Stack:** MERN (MongoDB, Express, React, Node)
* **Goal:** Create a new backend server (e.g., in a `backend-auth` folder) that runs on a different port (like `3001`).
* **Features:**
    * User registration (`/api/auth/register`)
    * User login (`/api/auth/login`)
    * A protected `/api/user/me` endpoint.
* The React frontend will then be configured to call **both** APIs:
    * `http://127.0.0.1:8000` for all market data.
    * `http://localhost:3001` (your new server) for all user/auth data.
